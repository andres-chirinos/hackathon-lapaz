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
import pandas as pd

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
def get_dashboard_data(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Returns aggregated data for the main dashboard metrics:
    - Latest AQI
    - Latest Seismic Activity
    - Active Blockades (Transitability)
    """
    try:
        # Build date filters
        aqi_where = f"WHERE CAST(fecha_hora_registro AS DATE) BETWEEN CAST('{start_date}' AS DATE) AND CAST('{end_date}' AS DATE)" if start_date and end_date else ""
        sis_where = f"WHERE CAST(fecha_hora_registro AS DATE) BETWEEN CAST('{start_date}' AS DATE) AND CAST('{end_date}' AS DATE)" if start_date and end_date else ""
        trans_where = f"AND CAST(fecha_reporte AS DATE) BETWEEN CAST('{start_date}' AS DATE) AND CAST('{end_date}' AS DATE)" if start_date and end_date else "AND fecha_consulta = (SELECT MAX(fecha_consulta) FROM transitability_events)"

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
def get_map_points(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Returns data points for the interactive map:
    - Air Quality Stations (tipo: 'aire')
    - Seismic Events (tipo: 'sismo')
    - Blockades (tipo: 'bloqueo')
    """
    points = []
    
    # Date Filters
    aqi_date_filter = f"AND CAST(fecha_hora_registro AS DATE) BETWEEN CAST('{start_date}' AS DATE) AND CAST('{end_date}' AS DATE)" if start_date and end_date else ""
    sis_date_filter = f"AND CAST(fecha_hora_registro AS DATE) BETWEEN CAST('{start_date}' AS DATE) AND CAST('{end_date}' AS DATE)" if start_date and end_date else ""
    trans_date_filter = f"AND CAST(fecha_reporte AS DATE) BETWEEN CAST('{start_date}' AS DATE) AND CAST('{end_date}' AS DATE)" if start_date and end_date else f"AND fecha_consulta = (SELECT MAX(fecha_consulta) FROM transitability_events)"

    # 1. Air Quality
    try:
        aq_df = conn.execute(f"SELECT latitude, longitude, valor_ica, fecha_hora_registro FROM air_quality_air_quality WHERE latitude IS NOT NULL AND longitude IS NOT NULL {aqi_date_filter}").df()
        for _, row in aq_df.iterrows():
            points.append({
                "lat": float(row['latitude']),
                "lng": float(row['longitude']),
                "tipo": "aire",
                "titulo": "Calidad del Aire",
                "valor_ica": int(row['valor_ica']) if pd.notna(row['valor_ica']) else 0,
                "desc": f"ICA: {row['valor_ica']} (Generado: {row['fecha_hora_registro']})"
            })
    except Exception as e:
        print(f"Error loading air quality: {e}")

    # 2. Sismology
    try:
        sis_df = conn.execute(f"SELECT latitud, longitud, magnitud, profundidad, fecha_hora_registro FROM sismology_sismology WHERE latitud IS NOT NULL AND longitud IS NOT NULL {sis_date_filter}").df()
        for _, row in sis_df.iterrows():
            points.append({
                "lat": float(row['latitud']),
                "lng": float(row['longitud']),
                "tipo": "sismo",
                "titulo": f"Sismo Mag {row['magnitud']}",
                "magnitud": float(row['magnitud']) if pd.notna(row['magnitud']) else 0,
                "profundidad": float(row['profundidad']) if pd.notna(row['profundidad']) else 0,
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
                "evento": str(row['evento']),
                "desc": f"{row['evento']} en {row['sección']}"
            })
    except Exception as e:
        print(f"Error loading transitability: {e}")

    return {"points": points}

@app.get("/api/location_info")
def get_location_info(lat: float, lon: float, start_date: Optional[str] = None, end_date: Optional[str] = None):
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
        date_filter = f"AND (CAST('{start_date}' AS DATE) <= CAST(fecha_fin AS DATE) AND CAST('{end_date}' AS DATE) >= CAST(fecha_inicio AS DATE))" if start_date and end_date else ""
        alerts_res = conn.execute(f"SELECT tipo_evento, descripcion, ST_AsGeoJSON(geom) FROM alerts_senamhi_alerts WHERE ST_Contains(geom, ST_Point({lon}, {lat})) {date_filter}").fetchall()
        alerts = [{"tipo": a[0], "descripcion": a[1], "geojson": json.loads(a[2]) if a[2] else None} for a in alerts_res]

        return {
            "municipio": municipio,
            "alerts": alerts
        }
    except Exception as e:
        print(f"Error fetching location info: {e}")
        return {"municipio": "Desconocido", "alerts": []}

@app.get("/api/catalogo")
def get_catalogo():
    """
    Returns available datasets (layers) and 5 random sample rows for each.
    """
    catalogo = []
    for table_name, schema in tables_info.items():
        try:
            # Get total count
            count_res = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
            total = count_res[0] if count_res else 0
            
            # Get 5 random rows using USING SAMPLE (DuckDB feature) or limit
            df = conn.execute(f"SELECT * FROM {table_name} USING SAMPLE 5").df()
            
            samples_json = df.to_json(orient="records", force_ascii=False, date_format="iso")
            samples = json.loads(samples_json)
            
            catalogo.append({
                "table_name": table_name,
                "columns": list(df.columns),
                "samples": samples,
                "total_rows": total
            })
        except Exception as e:
            print(f"Error loading catalog for {table_name}: {e}")
            
    return {"catalogo": catalogo}




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

    # Reemplazar comodines en el prompt si el usuario o la IA los usó explícitamente
    final_query = q.query.replace("{latitud_usuario}", str(q.lat)).replace("{longitud_usuario}", str(q.lon))

    try:
        result = run_agent(final_query, db_schema, knowledge_collection, conn, api_key, user_context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SqlQuery(BaseModel):
    query: str

@app.post("/api/execute_sql")
def execute_sql(q: SqlQuery):
    try:
        df = conn.execute(q.query).df()
        
        # Format similar to catalog samples
        samples_json = df.to_json(orient="records", force_ascii=False, date_format="iso")
        samples = json.loads(samples_json)
        
        return {
            "columns": list(df.columns),
            "rows": samples,
            "total_rows": len(samples)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mount directories for static files
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/data", StaticFiles(directory="data"), name="data")
app.mount("/views", StaticFiles(directory="frontend/views"), name="views")

@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")
