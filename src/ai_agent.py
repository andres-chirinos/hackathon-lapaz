"""
ai_agent.py — Three-phase agentic pipeline with vector-based knowledge retrieval:
  Phase 1: Exploratory Analysis (semantic search knowledge + explore data)
  Phase 2: Query Development  (generate + validate SQL)
  Phase 3: Visualization Plan (design dashboard from results)

Uses Gemini with function calling for tool use.
"""
from google import genai
from google.genai import types
import json


class MockST:
    def write(self, *args, **kwargs): pass
    def status(self, *args, **kwargs): return self
    def __enter__(self): return self
    def __exit__(self, exc_type, exc_val, exc_tb): pass
    def update(self, *args, **kwargs): pass
    def code(self, *args, **kwargs): pass


st = MockST()

try:
    from src.knowledge_loader import search_knowledge
except ImportError:
    from knowledge_loader import search_knowledge


def _parse_json(text: str) -> dict:
    """Extract the first JSON object from a raw LLM response."""
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end >= start:
        return json.loads(text[start:end + 1])
    raise ValueError(f"No JSON object found in: {text[:120]}...")


def run_agent(nl_query: str, db_schema: str, knowledge_collection, conn, api_key: str, user_context: str = ""):
    """
    Execute the 3-phase agent pipeline.

    Args:
        nl_query: User's natural language question
        db_schema: DuckDB schema text
        knowledge_collection: ChromaDB collection for semantic search
        conn: DuckDB connection

    Returns a dict with keys:
      - phases: list of dicts with phase name, thinking, and result
      - sql: final SQL query
      - dashboard: list of chart specs
    """

    # ── Tool definitions ──────────────────────────────────────────
    def query_database(sql: str) -> str:
        """Ejecuta una consulta SQL exploratoria en DuckDB y devuelve las primeras 5 filas como JSON."""
        try:
            df = conn.execute(sql).df()
            return df.head(5).to_json(orient='records', force_ascii=False)
        except Exception as e:
            return f"Error SQL: {e}"

    def search_knowledge_base(query: str) -> str:
        """Busca semánticamente en la base de conocimiento vectorial (ChromaDB) información sobre tablas, columnas, métricas o guías analíticas. Devuelve los fragmentos más relevantes."""
        return search_knowledge(knowledge_collection, query, n_results=6)

    # ── Model init ────────────────────────────────────────────────
    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        tools=[query_database, search_knowledge_base]
    )

    phases = []

    # ═══════════════════════════════════════════════════════════════
    # PHASE 1 — Exploratory Analysis
    # ═══════════════════════════════════════════════════════════════
    with st.status("🔍 Fase 1: Análisis Exploratorio", expanded=True) as s1:
        st.write("Identificando qué datos y contexto se necesitan...")

        phase1_prompt = f"""
        Eres un agente analista de datos experto. Esta es la FASE 1 de 3: Análisis Exploratorio.
        
        Tu objetivo es ENTENDER la pregunta del usuario y EXPLORAR qué datos necesitas.
        
        Tienes acceso a estas herramientas:
        1. `search_knowledge_base`: OBLIGATORIO usarla primero. Busca semánticamente en la base de conocimiento vectorial para encontrar guías de agregación, contexto de tablas y definiciones de variables. Haz varias búsquedas con términos distintos si es necesario.
        2. `query_database`: Para explorar la estructura real de los datos (ej. SELECT * FROM tabla LIMIT 3).
        
        Esquemas de DuckDB disponibles:
        {db_schema}
        
        Pregunta del usuario: {nl_query}
        
        Contexto espacial y temporal del usuario (Úsalo para entender referencias como "aquí", "hoy", "esta semana"):
        {user_context}
        
        PROCESO OBLIGATORIO:
        1. Llama a search_knowledge_base con la temática de la pregunta (ej. "ICA calidad aire", "sequía", "sismos magnitud").
        2. Llama a search_knowledge_base con "guías analíticas agregación" para entender las reglas.
        3. Haz al menos una consulta exploratoria con query_database.
        4. Responde con un JSON:
        {{
            "info_suficiente": true | false, // Pon false si la pregunta es sobre datos que no existen en el esquema.
            "razon_insuficiente": "Explicación de por qué no puedes responder (solo si info_suficiente es false)",
            "tablas_necesarias": ["lista de tablas que necesitas"],
            "variables_clave": ["lista de columnas importantes"],
            "reglas_agregacion": "resumen de las reglas de agregación que aplican según el knowledge base",
            "plan": "tu plan de análisis paso a paso",
            "dimension_temporal": "columna de fecha si aplica, o null",
            "dimension_espacial": "columna de ubicación/coordenadas si aplica, o null"
        }}
        """

        chat1 = client.chats.create(
            model="gemini-2.5-flash", config=config)
        resp1 = chat1.send_message(phase1_prompt)

        try:
            phase1_result = _parse_json(resp1.text)
        except Exception:
            phase1_result = {"plan": resp1.text,
                             "tablas_necesarias": [], "variables_clave": []}

        phases.append({
            "name": "🔍 Análisis Exploratorio",
            "thinking": phase1_result.get("plan", ""),
            "detail": phase1_result
        })

        st.write(f"**Plan:** {phase1_result.get('plan', 'N/A')}")
        st.write(
            f"**Tablas:** {', '.join(phase1_result.get('tablas_necesarias', []))}")
        st.write(
            f"**Reglas:** {phase1_result.get('reglas_agregacion', 'N/A')}")
        s1.update(label="🔍 Fase 1: Completada", state="complete")

    if not phase1_result.get("info_suficiente", True):
        return {
            "phases": phases,
            "sql": "--",
            "dashboard": [],
            "resumen": phase1_result.get("razon_insuficiente", "No cuento con suficiente información en la base de datos para responder a esta pregunta."),
            "explicacion": "Se activó el guardarraíl del sistema porque no hay datos relevantes para la solicitud.",
            "data": [],
            "column_mapping": {}
        }

    # ═══════════════════════════════════════════════════════════════
    # PHASE 2 — Query Development
    # ═══════════════════════════════════════════════════════════════
    with st.status("⚙️ Fase 2: Desarrollo de Consultas", expanded=True) as s2:
        st.write("Construyendo y validando las consultas SQL...")

        phase2_prompt = f"""
        FASE 2 de 3: Desarrollo de Consultas SQL.
        
        Contexto de la Fase 1 (tu análisis previo):
        {json.dumps(phase1_result, ensure_ascii=False)}
        
        Contexto del usuario (Fecha y Ubicación):
        {user_context}
        
        Esquemas de DuckDB:
        {db_schema}
        
        Pregunta del usuario: {nl_query}
        
        Ahora DEBES generar el SQL final. Puedes usar CTEs o CREATE TEMP VIEW para pasos intermedios, pero SIEMPRE termina con un SELECT.
        Si hay columnas de geometría, usa ST_AsText(geom) AS geometry.
        RESPETA las reglas de agregación de la Fase 1.
        
        INSTRUCCIÓN CRÍTICA (TIEMPO Y ESPACIO):
        Siempre que las tablas de origen contengan información de tiempo (ej. fecha) o ubicación (latitud, longitud, geometría), DEBES incluir esas columnas en tu SELECT final.
        Manejo de Gran Volumen y Agrupación Espacial: Si agrupas (GROUP BY) por una dimensión espacial (como el nombre del municipio, departamento o macroregión) para no saturar el mapa, intenta hacer un JOIN con las tablas espaciales correspondientes (ej. `frontlines_municipios`, `frontlines_departamentos`, etc.) si es necesario, para extraer y retornar su geometría (`ST_AsText(geom) AS geometry`). De esta manera, el mapa renderizará los polígonos exactos. Si no es posible hacer el JOIN, DEBES incluir al menos el promedio de las coordenadas (ej. `AVG(latitud) AS latitud`, `AVG(longitud) AS longitud`) de los puntos agrupados. Si no haces ninguna de las dos cosas, el mapa fallará.
        
        RESTRICCIONES IMPORTANTES DE DUCKDB Y ENTORNO:
        1. DuckDB NO tiene la función `ST_Haversine`. Para calcular distancias usa matemática trigonométrica estándar o `ST_Distance(geom1, geom2) * 111000`.
        2. UTILIZA SIEMPRE las variables globales de la aplicación proporcionadas en "Contexto del usuario". Inyecta literalmente las coordenadas y fecha exactas si es necesario.
        3. En el caso de polígonos o líneas, la columna geometry debe estar en formato WKT.
        

        Tienes acceso a `query_database` para probar fragmentos de SQL antes de armar la consulta final.
        
        Responde con un JSON:
        {{
            "sql": "tu consulta SQL completa",
            "explicacion_tecnica": "explica qué hace cada parte de la consulta"
        }}
        """

        chat2 = client.chats.create(
            model="gemini-2.5-flash", config=config)

        max_retries = 3
        final_sql = ""
        explanation = ""

        for attempt in range(max_retries):
            st.write(f"Intento {attempt + 1}/{max_retries}...")

            if attempt == 0:
                resp2 = chat2.send_message(phase2_prompt)
            else:
                resp2 = chat2.send_message(retry_msg)

            try:
                p2 = _parse_json(resp2.text)
            except Exception as json_err:
                retry_msg = f"Error de JSON: {json_err}. Responde SOLO con un JSON válido con las propiedades entre comillas dobles."
                continue

            candidate_sql = p2.get("sql", "")

            # Validate by executing
            try:
                test_df = conn.cursor().execute(candidate_sql).df()
                final_sql = candidate_sql
                explanation = p2.get("explicacion_tecnica", "")
                st.write(f"✅ SQL validado exitosamente ({len(test_df)} filas)")
                break
            except Exception as db_err:
                st.write(f"❌ Error SQL: `{db_err}`. Corrigiendo...")
                retry_msg = f"Tu consulta generó este error en DuckDB: {db_err}. Devuelve el JSON corregido."

        if not final_sql:
            s2.update(label="⚙️ Fase 2: Fallida", state="error")
            return None

        phases.append({
            "name": "⚙️ Desarrollo de Consultas",
            "thinking": explanation,
            "sql": final_sql
        })

        st.code(final_sql, language="sql")
        s2.update(label="⚙️ Fase 2: Completada", state="complete")

    # ═══════════════════════════════════════════════════════════════
    # PHASE 3 — Visualization Plan
    # ═══════════════════════════════════════════════════════════════
    with st.status("📊 Fase 3: Diseño del Dashboard", expanded=True) as s3:
        st.write("Analizando resultados para diseñar las visualizaciones...")

        # Get actual column names and sample data
        result_df = conn.execute(final_sql).df()
        sample = result_df.head(3).to_json(orient='records', force_ascii=False)
        columns = list(result_df.columns)

        phase3_prompt = f"""
        FASE 3 de 3: Diseño del Dashboard.
        
        Ya tienes los resultados de la consulta. Ahora debes diseñar el dashboard más útil e interactivo posible.
        
        Columnas disponibles en el resultado: {columns}
        Muestra de datos: {sample}
        
        Análisis previo (Fase 1): {json.dumps(phase1_result, ensure_ascii=False)}
        
        REGLAS:
        - Prioriza siempre la dimensión TEMPORAL (tipo: line, x=columna de fecha) y ESPACIAL (tipo: map).
        - Genera al menos 2 gráficos complementarios.
        - Cada gráfico debe tener un título descriptivo y claro.
        - NO sumes índices (ICA, magnitud). Usa AVG o MAX.
        
        Responde con un JSON:
        {{
            "dashboard": [
                {{
                    "tipo": "bar" | "line" | "scatter" | "map" | "area",
                    "titulo": "Título descriptivo del gráfico",
                    "x": "columna_x",
                    "y": "columna_y",
                    "color": "columna_color (opcional, null si no aplica)"
                }}
            ],
            "column_mapping": {{
                "lat": "nombre_columna_latitud_o_null",
                "lon": "nombre_columna_longitud_o_null",
                "geometry": "nombre_columna_geometria_wkt_o_null",
                "label": "nombre_columna_titulo_marcador_o_null",
                "value": "nombre_columna_valor_principal_o_null",
                "category": "nombre_columna_categoria_o_null",
                "types": {{
                    "nombre_columna_1": "temporal | metrica | dimension_categorica | geo_lat | geo_lon | geometry_wkt",
                    "nombre_columna_2": "..."
                }},
                "render_instructions": "Indicaciones breves sobre cómo interpretar o renderizar estos datos visualmente (ej. 'La variable X es temporal, ideal para un gráfico de líneas')."
            }},
            "resumen_ejecutivo": "Un párrafo corto explicando qué revelan los datos al usuario."
        }}
        """

        chat3 = client.chats.create(
            model="gemini-2.5-flash", config=config)
        resp3 = chat3.send_message(phase3_prompt)

        try:
            p3 = _parse_json(resp3.text)
        except Exception:
            p3 = {"dashboard": [], "resumen_ejecutivo": resp3.text}

        phases.append({
            "name": "📊 Diseño del Dashboard",
            "thinking": p3.get("resumen_ejecutivo", ""),
            "dashboard": p3.get("dashboard", [])
        })

        st.write(f"**Resumen:** {p3.get('resumen_ejecutivo', '')}")
        st.write(f"**Gráficos diseñados:** {len(p3.get('dashboard', []))}")
        s3.update(label="📊 Fase 3: Completada", state="complete")

    return {
        "phases": phases,
        "sql": final_sql,
        "dashboard": p3.get("dashboard", []),
        "column_mapping": p3.get("column_mapping", {}),
        "resumen": p3.get("resumen_ejecutivo", ""),
        "explicacion": explanation,
        "data": json.loads(result_df.to_json(orient='records', date_format='iso'))
    }
