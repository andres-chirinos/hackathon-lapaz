import streamlit as st
import duckdb
import pandas as pd
import pygwalker as pyg
import os
import yaml
import glob
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load env variables for GOOGLE_AI_API_KEY
load_dotenv()

st.set_page_config(
    layout="wide", page_title="Motor de Consultas Visual con IA")
st.title("Motor de Consultas de Datos - Hackathon La Paz")
st.markdown("Este motor permite **cruzar información** de múltiples fuentes de datos (DataPackages) usando **DuckDB**, visualizarlas con **PyGWalker**, y realizar consultas en **Lenguaje Natural** impulsadas por **Google Gemini**.")

# Configure Gemini
api_key = os.getenv("GOOGLE_AI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# Initialize duckdb connection


@st.cache_resource
def get_db_connection():
    conn = duckdb.connect(':memory:')
    conn.execute("INSTALL spatial;")
    conn.execute("LOAD spatial;")
    return conn


conn = get_db_connection()

# Load Datapackages and register tables


@st.cache_data
def load_data():
    tables_info = {}
    schema_str_list = []

    datapackage_files = glob.glob('data/**/datapackage*.yml', recursive=True) + \
        glob.glob('data/**/datapackage*.json', recursive=True)

    for dp_file in datapackage_files:
        try:
            with open(dp_file, 'r', encoding='utf-8') as f:
                if dp_file.endswith('.yml') or dp_file.endswith('.yaml'):
                    dp = yaml.safe_load(f)
                else:
                    dp = json.load(f)

            resources = dp.get('resources', [])
            for res in resources:
                path = res.get('path', '')
                if path and os.path.exists(path):
                    base_name = os.path.basename(path).split('.')[0]
                    table_name = f"{os.path.basename(os.path.dirname(dp_file))}_{base_name}".replace(
                        '-', '_')

                    if path.endswith('.csv'):
                        conn.execute(
                            f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_csv_auto('{path}')")
                    elif path.endswith('.geojson'):
                        conn.execute(
                            f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM st_read('{path}')")
                    else:
                        continue

                    schema = conn.execute(f"DESCRIBE {table_name}").df()
                    tables_info[table_name] = schema

                    schema_str = f"Table: {table_name}\nColumns:\n"
                    for _, row in schema.iterrows():
                        schema_str += f" - {row['column_name']} ({row['column_type']})\n"
                    schema_str_list.append(schema_str)

        except Exception as e:
            print(f"Error loading {dp_file}: {e}")

    return tables_info, "\n".join(schema_str_list)


tables_info, db_schema_context = load_data()

st.sidebar.header("Fuentes de Datos (DataPackages)")
for table_name, schema in tables_info.items():
    with st.sidebar.expander(f"🗃️ {table_name}"):
        st.dataframe(schema[['column_name', 'column_type']], hide_index=True)

# Load context from all OKF markdown files in knowledge/
context_knowledge = ""
if os.path.exists("knowledge"):
    for md_file in glob.glob("knowledge/**/*.md", recursive=True):
        try:
            with open(md_file, "r", encoding="utf-8") as f:
                context_knowledge += f"\n\n--- Archivo: {md_file} ---\n" + f.read()
        except Exception:
            pass

st.subheader("🤖 Consultar con IA (Lenguaje Natural)")
nl_query = st.text_input("Hazle una pregunta a tus datos en Lenguaje Natural:")
if st.button("Generar SQL con Gemini", type="secondary") and nl_query:
    if not api_key:
        st.error("No se encontró GOOGLE_AI_API_KEY en el archivo .env")
    else:
        with st.status("Agente IA procesando consulta...", expanded=True) as status:
            system_prompt = f"""
            Eres un agente experto en datos usando DuckDB. Tu tarea es responder a preguntas complejas del usuario.
            Tienes acceso a herramientas (Function Calling) que DEBES usar activamente:
            1. `search_knowledge_base`: OBLIGATORIO usar esto ANTES de tocar u operar con cualquier variable. Asegúrate de leer la guía 'analytical_guidelines' o el contexto de la tabla para entender qué significa la métrica y cómo debe ser tratada.
            2. `query_database`: Para explorar la data real ejecutando SQL y ver resultados de prueba.
            
            Para resolver problemas complejos, PUEDES usar CTEs (WITH paso1 AS (...)) o sentencias múltiples separadas por punto y coma (CREATE TEMP VIEW paso1 AS ...; SELECT * FROM paso1) para construir la respuesta paso a paso y ser ordenado.
            
            Esquemas de DuckDB:
            {db_schema_context}
            
            Debes devolver ÚNICAMENTE un objeto JSON con:
            {{
                "sql": "Tu código SQL completo. Si creas vistas temporales, termina con SELECT. Usa ST_AsText(geom) AS geometry para mapas.",
                "explicacion": "Explica tu plan lógico paso a paso y cómo abordaste la pregunta.",
                "dashboard": [
                    {{
                        "tipo": "bar" o "line" o "scatter" o "map",
                        "titulo": "Título sugerido para el gráfico",
                        "x": "columna_x (para tiempo o categorías)",
                        "y": "columna_y (para valores numéricos)"
                    }}
                ]
            }}
            NOTA: Configura siempre al menos un gráfico en 'dashboard'. Presta PRINCIPAL ATENCIÓN a las dimensiones espacial (tipo: map) y temporal (tipo: line, donde x es fecha) si los datos lo permiten.
            IMPORTANTE: Ten cuidado extremo con las funciones de agregación. NUNCA sumes (SUM) métricas que son índices (como ICA, magnitudes sísmicas). Usa promedios (AVG) o máximos (MAX). Asegúrate de que las agrupaciones tengan sentido lógico en el mundo real.
            """
            
            def query_database(sql: str) -> str:
                '''Ejecuta una consulta SQL en DuckDB y devuelve las primeras 3 filas para explorar la estructura real de los datos.'''
                try:
                    df = conn.execute(sql).df()
                    return df.head(3).to_json(orient='records')
                except Exception as e:
                    return f"Error SQL: {e}"

            def search_knowledge_base(query: str) -> str:
                '''Busca en el catálogo de conocimiento OKF información sobre una tabla, columna o métrica (ej. 'sequia', 'ICA').'''
                # Para simplificar, devolvemos todo el contexto, pero en producción se puede indexar o buscar
                return context_knowledge

            try:
                # We use the requested Gemini 3.1 Flash Lite model with tools
                model = genai.GenerativeModel(
                    "models/gemini-3.1-flash-lite",
                    tools=[query_database, search_knowledge_base]
                )
                chat = model.start_chat(history=[], enable_automatic_function_calling=True)
                
                max_retries = 3
                success = False
                
                user_msg = f"Pregunta del usuario: {nl_query}"
                
                for attempt in range(max_retries):
                    st.write(f"Intento {attempt+1}/{max_retries}...")
                    response = chat.send_message(system_prompt + "\n\n" + user_msg if attempt == 0 else user_msg)
                    
                    raw_text = response.text.strip()
                    start_idx = raw_text.find('{')
                    end_idx = raw_text.rfind('}')
                    
                    try:
                        if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                            json_str = raw_text[start_idx:end_idx+1]
                            ai_response = json.loads(json_str)
                        else:
                            raise ValueError("No se encontraron llaves {} en tu respuesta.")
                    except Exception as json_err:
                        st.write(f"Error de formato JSON: {json_err}. Solicitando corrección...")
                        user_msg = f"Tu respuesta falló al ser interpretada como JSON. Error: {json_err}. Recuerda que las propiedades deben estar entre comillas dobles. Responde ESTRICTAMENTE con un único objeto JSON válido."
                        continue
                        
                    sql_query = ai_response.get("sql", "")
                    
                    # Agente de Verificación: Intentamos ejecutar el SQL
                    st.write("Verificando y validando la consulta generada...")
                    try:
                        test_conn = conn.cursor()
                        # Intentamos ejecutar, si es válido no lanzará excepción
                        # Si tiene multiples statements terminados en select, devolverá un df
                        test_df = test_conn.execute(sql_query).df()
                        
                        st.session_state["generated_sql"] = sql_query
                        st.session_state["ai_explicacion"] = ai_response.get("explicacion", "")
                        st.session_state["ai_dashboard"] = ai_response.get("dashboard", [])
                        
                        success = True
                        status.update(label=f"¡Agente finalizó con éxito en {attempt+1} intento(s)!", state="complete", expanded=False)
                        break
                    except Exception as db_err:
                        st.write(f"Error en SQL detectado: `{db_err}`. Enviando a corrección...")
                        user_msg = f"Tu consulta generó este error en DuckDB: {db_err}. Analiza tu error y devuelve el JSON corregido."
                
                if success:
                    st.session_state["auto_execute"] = True
                    st.rerun()
                else:
                    status.update(label="El agente no pudo resolver la consulta.", state="error")
                    st.error("Se agotaron los intentos del agente.")
                    
            except Exception as e:
                status.update(label="Fallo general de la IA", state="error")
                st.error(f"Error crítico con la API: {e}")

st.divider()
st.write("Escribe o edita tu consulta SQL para cruzar información.")

# Fallback query if no tables or state exists
default_query = "SELECT * FROM air_quality_air_quality LIMIT 100"
if tables_info:
    first_table = list(tables_info.keys())[0]
    default_query = f"SELECT * FROM {first_table} LIMIT 100"

current_sql = st.session_state.get("generated_sql", default_query)
query = st.text_area("Consulta SQL:", value=current_sql, height=150)

if st.button("Ejecutar Consulta", type="primary") or st.session_state.get("auto_execute", False):
    st.session_state["auto_execute"] = False
    try:
        with st.spinner("Ejecutando consulta en DuckDB..."):
            result_df = conn.execute(query).df()

        st.success(
            f"Consulta ejecutada exitosamente. Se obtuvieron {len(result_df)} filas.")
            
        if st.session_state.get("ai_explicacion"):
            st.info(f"**Análisis de la IA:** {st.session_state.get('ai_explicacion')}")

        tab_names = ["📊 Explorador Visual (Dimensiones)", "📝 Datos y Exportación", "🗺️ Mapa (Geoespacial)"]
        if st.session_state.get("ai_dashboard"):
            tab_names.insert(0, "📈 Dashboard Automático (IA)")
            
        tabs = st.tabs(tab_names)
        tab_idx = 0
        
        if st.session_state.get("ai_dashboard"):
            with tabs[tab_idx]:
                st.markdown("### Dashboard Generado por la IA")
                
                st.markdown("#### Controles de Filtro")
                filtered_df = result_df.copy()
                filter_cols = st.columns(3)
                col_idx = 0
                for col in filtered_df.columns:
                    if 'geom' in col.lower() or 'lat' in col.lower() or 'lon' in col.lower():
                        continue
                    if filtered_df[col].dtype == object:
                        unique_vals = filtered_df[col].dropna().unique()
                        if 0 < len(unique_vals) <= 20:
                            with filter_cols[col_idx % 3]:
                                selected = st.multiselect(f"{col}", unique_vals, default=unique_vals)
                                if selected:
                                    filtered_df = filtered_df[filtered_df[col].isin(selected)]
                            col_idx += 1
                    elif pd.api.types.is_datetime64_any_dtype(filtered_df[col]) or 'fecha' in col.lower() or 'date' in col.lower():
                        try:
                            temp_date = pd.to_datetime(filtered_df[col])
                            min_d, max_d = temp_date.min().date(), temp_date.max().date()
                            if min_d != max_d:
                                with filter_cols[col_idx % 3]:
                                    date_range = st.date_input(f"{col}", [min_d, max_d], min_value=min_d, max_value=max_d)
                                    if len(date_range) == 2:
                                        filtered_df = filtered_df[(temp_date.dt.date >= date_range[0]) & (temp_date.dt.date <= date_range[1])]
                                col_idx += 1
                        except:
                            pass
                            
                st.divider()

                dashboard_items = st.session_state.get("ai_dashboard", [])
                cols = st.columns(2)
                for i, chart in enumerate(dashboard_items):
                    v_type = chart.get("tipo", "none")
                    title = chart.get("titulo", "")
                    vx = chart.get("x")
                    vy = chart.get("y")
                    
                    if vx not in filtered_df.columns: vx = None
                    if vy not in filtered_df.columns: vy = None
                    
                    with cols[i % 2]:
                        if title: st.markdown(f"**{title}**")
                        try:
                            if v_type == "bar": st.bar_chart(filtered_df, x=vx, y=vy)
                            elif v_type == "line": st.line_chart(filtered_df, x=vx, y=vy)
                            elif v_type == "scatter": st.scatter_chart(filtered_df, x=vx, y=vy)
                            elif v_type == "map":
                                # Re-use map logic
                                if 'latitude' in filtered_df.columns and 'longitude' in filtered_df.columns:
                                    st.map(filtered_df, latitude='latitude', longitude='longitude')
                                elif 'lat' in filtered_df.columns and 'lon' in filtered_df.columns:
                                    st.map(filtered_df, latitude='lat', longitude='lon')
                                elif 'latitud' in filtered_df.columns and 'longitud' in filtered_df.columns:
                                    st.map(filtered_df, latitude='latitud', longitude='longitud')
                                elif any('geom' in c.lower() for c in filtered_df.columns):
                                    geom_col = next(c for c in filtered_df.columns if 'geom' in c.lower())
                                    import geopandas as gpd
                                    from shapely import wkt
                                    if filtered_df[geom_col].dtype == object and isinstance(filtered_df[geom_col].iloc[0], str):
                                        gdf_plot = filtered_df.copy()
                                        gdf_plot['geometry'] = gdf_plot[geom_col].apply(wkt.loads)
                                        gdf = gpd.GeoDataFrame(gdf_plot, geometry='geometry')
                                        gdf.set_crs(epsg=4326, inplace=True, allow_override=True)
                                        m = gdf.explore()
                                        st.components.v1.html(m._repr_html_(), height=400, scrolling=True)
                                    else:
                                        st.info("Geometría no está en formato texto (WKT).")
                                else:
                                    st.info("No se detectaron coordenadas (latitude/longitude) ni geometría.")
                        except Exception as chart_err:
                            st.warning(f"No se pudo generar el gráfico automático: {chart_err}")
            tab_idx += 1

        with tabs[tab_idx]:
            st.markdown("### Visualizador Interactivo")
            st.markdown("Cruza dimensiones libremente arrastrando variables.")
            try:
                html = pyg.to_html(result_df)
                st.components.v1.html(html, height=800, scrolling=True)
            except Exception as viz_err:
                st.error(f"No se pudo cargar el visualizador: {viz_err}")
        tab_idx += 1

        with tabs[tab_idx]:
            st.markdown("### Exportar Información (CSV)")
            csv_data = result_df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Descargar Datos en CSV",
                data=csv_data,
                file_name='dataset_exportado.csv',
                mime='text/csv',
            )
            st.dataframe(result_df)
        tab_idx += 1

        with tabs[tab_idx]:
            st.markdown("### Vista Espacial (Estilo Wikidata Query)")
            if 'latitude' in result_df.columns and 'longitude' in result_df.columns:
                st.map(result_df, latitude='latitude', longitude='longitude')
            elif 'lat' in result_df.columns and 'lon' in result_df.columns:
                st.map(result_df, latitude='lat', longitude='lon')
            elif 'latitud' in result_df.columns and 'longitud' in result_df.columns:
                st.map(result_df, latitude='latitud', longitude='longitud')
            elif any('geom' in c.lower() for c in result_df.columns):
                # Usar geopandas y folium
                geom_col = next(
                    c for c in result_df.columns if 'geom' in c.lower())
                try:
                    import geopandas as gpd
                    from shapely import wkt
                    import folium

                    if result_df[geom_col].dtype == object and isinstance(result_df[geom_col].iloc[0], str):
                        # Asumimos que viene como WKT gracias al prompt ST_AsText
                        gdf_plot = result_df.copy()
                        gdf_plot['geometry'] = gdf_plot[geom_col].apply(
                            wkt.loads)
                        gdf = gpd.GeoDataFrame(gdf_plot, geometry='geometry')
                        gdf.set_crs(epsg=4326, inplace=True,
                                    allow_override=True)
                        m = gdf.explore()
                        st.components.v1.html(
                            m._repr_html_(), height=600, scrolling=True)
                    else:
                        st.info(
                            "La columna de geometría no está en formato texto (WKT). Por favor asegúrate de usar `ST_AsText(columna)` en tu consulta SQL.")
                except Exception as e:
                    st.error(f"Error al generar mapa con Geopandas: {e}")
            else:
                st.info(
                    "No se detectaron coordenadas (latitude/longitude) ni geometría en los resultados para generar el mapa.")

    except Exception as e:
        st.error(f"Error al ejecutar la consulta: {e}")
