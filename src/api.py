import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.db_engine import get_connection, load_datapackages
from src.ai_agent import run_agent
from src.knowledge_loader import build_vector_store
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
import json

app = FastAPI(title="DataLab La Paz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and knowledge store on startup
conn = None
tables_info = {}
db_schema = ""
knowledge_collection = None
n_chunks = 0

@app.on_event("startup")
def startup_event():
    global conn, tables_info, db_schema, knowledge_collection, n_chunks
    # Fix for SSL
    os.environ["OPENSSL_CONF"] = "/dev/null"
    import ssl
    ssl._create_default_https_context = ssl._create_unverified_context
    
    conn = get_connection()
    tables_info, db_schema = load_datapackages(conn)
    knowledge_collection, n_chunks = build_vector_store()

@app.get("/api/status")
def status():
    return {
        "status": "ok",
        "tables_loaded": list(tables_info.keys()),
        "knowledge_chunks": n_chunks
    }

@app.get("/api/dashboard_data")
def get_dashboard_data():
    """
    Returns aggregated data for the main dashboard metrics:
    - Latest AQI
    - Latest Seismic Activity
    - Active Blockades (Transitability)
    """
    try:
        # Latest AQI (average of latest day)
        aqi_res = conn.execute("SELECT AVG(valor_ica) as avg_aqi FROM air_quality_air_quality").fetchone()
        avg_aqi = round(aqi_res[0], 1) if aqi_res and aqi_res[0] else 0

        # Latest Seismic Event
        seismic_res = conn.execute("SELECT magnitud FROM sismology_sismology ORDER BY fecha_hora_registro DESC LIMIT 1").fetchone()
        last_mag = round(seismic_res[0], 1) if seismic_res and seismic_res[0] else 0

        # Active Blockades count (Transitability)
        blockades_res = conn.execute("SELECT COUNT(*) FROM transitability_events WHERE UPPER(estado) LIKE '%TRANSITABLE CON DESVÍOS%' OR UPPER(estado) LIKE '%NO TRANSITABLE%'").fetchone()
        blockades_count = blockades_res[0] if blockades_res else 0

        return {
            "aqi": avg_aqi,
            "seismic_mag": last_mag,
            "temperature": "22°C", # Mock for now or we could pull from a weather dataset
            "blockades": blockades_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/map_points")
def get_map_points():
    """
    Returns data points for the interactive map:
    - Air Quality Stations (tipo: 'aire')
    - Seismic Events (tipo: 'sismo')
    - Blockades (tipo: 'bloqueo')
    """
    points = []
    
    # 1. Air Quality
    try:
        aq_df = conn.execute("SELECT latitude, longitude, valor_ica, fecha_hora_registro FROM air_quality_air_quality WHERE latitude IS NOT NULL AND longitude IS NOT NULL LIMIT 50").df()
        for _, row in aq_df.iterrows():
            points.append({
                "lat": float(row['latitude']),
                "lng": float(row['longitude']),
                "tipo": "aire",
                "titulo": "Calidad del Aire",
                "desc": f"ICA: {row['valor_ica']} (Generado: {row['fecha_hora_registro']})"
            })
    except Exception as e:
        print(f"Error loading air quality: {e}")

    # 2. Sismology
    try:
        sis_df = conn.execute("SELECT latitud, longitud, magnitud, profundidad, fecha_hora_registro FROM sismology_sismology WHERE latitud IS NOT NULL AND longitud IS NOT NULL LIMIT 50").df()
        for _, row in sis_df.iterrows():
            points.append({
                "lat": float(row['latitud']),
                "lng": float(row['longitud']),
                "tipo": "sismo",
                "titulo": f"Sismo Mag {row['magnitud']}",
                "desc": f"Profundidad: {row['profundidad']} km<br>Fecha: {row['fecha_hora_registro']}"
            })
    except Exception as e:
        print(f"Error loading sismology: {e}")

    # 3. Blockades (Transitability)
    try:
        trans_df = conn.execute("SELECT latitud, longitud, estado, evento, sección FROM transitability_events WHERE latitud IS NOT NULL AND longitud IS NOT NULL AND UPPER(estado) NOT LIKE '%TRANSITABLE%'").df()
        for _, row in trans_df.iterrows():
            points.append({
                "lat": float(row['latitud']),
                "lng": float(row['longitud']),
                "tipo": "bloqueo",
                "titulo": str(row['estado']),
                "desc": f"{row['evento']} en {row['sección']}"
            })
    except Exception as e:
        print(f"Error loading transitability: {e}")

    return {"points": points}


class ChatQuery(BaseModel):
    query: str
    lat: float
    lon: float

@app.post("/api/chat")
def chat_with_agent(q: ChatQuery):
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="No GOOGLE_AI_API_KEY provided")

    user_location = f"Lat: {q.lat:.5f}, Lon: {q.lon:.5f}"
    user_context = f"Fecha de hoy: {datetime.now().date()}\nUbicación del usuario: {user_location}"

    try:
        result = run_agent(q.query, db_schema, knowledge_collection, conn, api_key, user_context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount frontend directory for static files
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")

@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")
