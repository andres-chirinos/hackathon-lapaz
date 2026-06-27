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
from typing import Optional
import json
from dotenv import load_dotenv

load_dotenv("src/.env")

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
def get_dashboard_data(date: Optional[str] = None):
    """
    Returns aggregated data for the main dashboard metrics:
    - Latest AQI
    - Latest Seismic Activity
    - Active Blockades (Transitability)
    """
    try:
        # Build date filters
        aqi_where = f"WHERE CAST(fecha_hora_registro AS DATE) = CAST('{date}' AS DATE)" if date else ""
        sis_where = f"WHERE CAST(fecha_hora_registro AS DATE) = CAST('{date}' AS DATE)" if date else ""
        trans_where = f"AND CAST(fecha_reporte AS DATE) = CAST('{date}' AS DATE)" if date else "AND fecha_consulta = (SELECT MAX(fecha_consulta) FROM transitability_events)"

        # Latest AQI (average of day or specific date)
        aqi_res = conn.execute(f"SELECT AVG(valor_ica) as avg_aqi FROM air_quality_air_quality {aqi_where}").fetchone()
        avg_aqi = round(aqi_res[0], 1) if aqi_res and aqi_res[0] else 0

        # Latest Seismic Event
        seismic_res = conn.execute(f"SELECT magnitud FROM sismology_sismology {sis_where} ORDER BY fecha_hora_registro DESC LIMIT 1").fetchone()
        last_mag = round(seismic_res[0], 1) if seismic_res and seismic_res[0] else 0

        # Active Blockades count (Transitability)
        blockades_res = conn.execute(f"SELECT COUNT(*) FROM transitability_events WHERE (UPPER(estado) LIKE '%TRANSITABLE CON DESVÍOS%' OR UPPER(estado) LIKE '%NO TRANSITABLE%') {trans_where}").fetchone()
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
def get_map_points(date: Optional[str] = None):
    """
    Returns data points for the interactive map:
    - Air Quality Stations (tipo: 'aire')
    - Seismic Events (tipo: 'sismo')
    - Blockades (tipo: 'bloqueo')
    """
    points = []
    
    # Date Filters
    aqi_date_filter = f"AND CAST(fecha_hora_registro AS DATE) = CAST('{date}' AS DATE)" if date else ""
    sis_date_filter = f"AND CAST(fecha_hora_registro AS DATE) = CAST('{date}' AS DATE)" if date else ""
    trans_date_filter = f"AND CAST(fecha_reporte AS DATE) = CAST('{date}' AS DATE)" if date else f"AND fecha_consulta = (SELECT MAX(fecha_consulta) FROM transitability_events)"

    # 1. Air Quality
    try:
        aq_df = conn.execute(f"SELECT latitude, longitude, valor_ica, fecha_hora_registro FROM air_quality_air_quality WHERE latitude IS NOT NULL AND longitude IS NOT NULL {aqi_date_filter} LIMIT 50").df()
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
        sis_df = conn.execute(f"SELECT latitud, longitud, magnitud, profundidad, fecha_hora_registro FROM sismology_sismology WHERE latitud IS NOT NULL AND longitud IS NOT NULL {sis_date_filter} LIMIT 50").df()
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
        trans_df = conn.execute(f"SELECT latitud, longitud, estado, evento, sección FROM transitability_events WHERE latitud IS NOT NULL AND longitud IS NOT NULL AND UPPER(estado) NOT LIKE '%TRANSITABLE%' {trans_date_filter}").df()
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

@app.get("/api/location_info")
def get_location_info(lat: float, lon: float, date: Optional[str] = None):
    """
    Returns location context based on GPS coordinates:
    - Municipio
    - Active Alerts in the area
    """
    try:
        # Check Municipio
        muni_res = conn.execute(f"SELECT nombre FROM frontlines_municipios WHERE ST_Contains(geom, ST_Point({lon}, {lat})) LIMIT 1").fetchone()
        municipio = muni_res[0] if muni_res else "Desconocido"

        # Check Alerts (Senamhi)
        date_filter = f"AND CAST('{date}' AS DATE) BETWEEN CAST(fecha_inicio AS DATE) AND CAST(fecha_fin AS DATE)" if date else ""
        alerts_res = conn.execute(f"SELECT tipo_evento, descripcion, ST_AsGeoJSON(geom) FROM alerts_senamhi_alerts WHERE ST_Contains(geom, ST_Point({lon}, {lat})) {date_filter}").fetchall()
        alerts = [{"tipo": a[0], "descripcion": a[1], "geojson": json.loads(a[2]) if a[2] else None} for a in alerts_res]

        return {
            "municipio": municipio,
            "alerts": alerts
        }
    except Exception as e:
        print(f"Error fetching location info: {e}")
        return {"municipio": "Desconocido", "alerts": []}



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

# Mount directories for static files
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/data", StaticFiles(directory="data"), name="data")
app.mount("/views", StaticFiles(directory="frontend/views"), name="views")

@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")
