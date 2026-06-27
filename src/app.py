import os
# WORKAROUND: El sistema tiene una configuración OpenSSL rota (module initialization error _ssl.c:3187).
# Forzamos ignorarla antes de importar cualquier librería que use sockets o red.
os.environ["OPENSSL_CONF"] = "/dev/null"

import streamlit as st
import pandas as pd
import pygwalker as pyg
import ssl
from dotenv import load_dotenv

# Fix for Streamlit/Altair SSL certificate verification errors in some environments
ssl._create_default_https_context = ssl._create_unverified_context

from db_engine import get_connection, load_datapackages
from knowledge_loader import build_vector_store
from ai_agent import run_agent
from visualizer import render_filters, render_dashboard, render_map_tab

# ── Config ────────────────────────────────────────────────────────
load_dotenv()

st.set_page_config(
    layout="wide",
    page_title="DataLab La Paz — Motor de Consultas con IA",
    page_icon="🔬"
)

api_key = os.getenv("GOOGLE_AI_API_KEY")

# ── Data Layer ────────────────────────────────────────────────────
conn = get_connection()
tables_info, db_schema = load_datapackages(conn)

# ── Knowledge Layer (Vector Store) ────────────────────────────────
knowledge_collection, n_chunks = build_vector_store()

# ── UI: Header ────────────────────────────────────────────────────
st.title("🔬 DataLab La Paz")
st.markdown(
    "Motor de consultas inteligente que cruza **datos ambientales, climáticos y sísmicos** "
    "de Bolivia usando **DuckDB** + **IA Generativa** (Gemini)."
)

# ── UI: Sidebar — Data Catalog ────────────────────────────────────
st.sidebar.header("📚 Catálogo de Datos")
for tname, schema in tables_info.items():
    with st.sidebar.expander(f"🗃️ {tname}"):
        st.dataframe(schema[['column_name', 'column_type']], hide_index=True)

st.sidebar.divider()
st.sidebar.caption(f"📦 Knowledge Base: {n_chunks} fragmentos indexados en ChromaDB.")

# ── UI: AI Query ──────────────────────────────────────────────────
st.subheader("🤖 Consultar con Inteligencia Artificial")
nl_query = st.text_area(
    "Escribe tu pregunta en lenguaje natural:",
    placeholder="Ej: ¿Cuál es la tendencia del ICA por estación en los últimos meses?",
    height=80
)

if st.button("🚀 Analizar con IA", type="primary") and nl_query:
    if not api_key:
        st.error("No se encontró `GOOGLE_AI_API_KEY` en el archivo `.env`.")
    else:
        result = run_agent(nl_query, db_schema, knowledge_collection, conn, api_key)

        if result:
            st.session_state["generated_sql"] = result["sql"]
            st.session_state["ai_dashboard"] = result["dashboard"]
            st.session_state["ai_phases"] = result["phases"]
            st.session_state["ai_resumen"] = result.get("resumen", "")
            st.session_state["ai_explicacion"] = result.get("explicacion", "")
            st.session_state["auto_execute"] = True
            st.rerun()

# ── UI: Chain of Thought ──────────────────────────────────────────
if st.session_state.get("ai_phases"):
    with st.expander("🧠 Cadena de Pensamiento del Agente", expanded=False):
        for phase in st.session_state["ai_phases"]:
            st.markdown(f"### {phase['name']}")
            st.markdown(phase.get("thinking", ""))
            if "sql" in phase:
                st.code(phase["sql"], language="sql")
            if "detail" in phase:
                st.json(phase["detail"])

# ── UI: SQL Editor ────────────────────────────────────────────────
st.divider()

default_query = "SELECT * FROM air_quality_air_quality LIMIT 100"
if tables_info:
    first_table = list(tables_info.keys())[0]
    default_query = f"SELECT * FROM {first_table} LIMIT 100"

current_sql = st.session_state.get("generated_sql", default_query)
query = st.text_area("📝 Consulta SQL (editable):", value=current_sql, height=120)

# ── UI: Execute & Render ──────────────────────────────────────────
if st.button("▶️ Ejecutar Consulta", type="primary") or st.session_state.get("auto_execute", False):
    st.session_state["auto_execute"] = False

    try:
        with st.spinner("Ejecutando consulta en DuckDB..."):
            result_df = conn.execute(query).df()

        st.success(f"✅ {len(result_df)} filas obtenidas.")

        # Show AI summary if available
        if st.session_state.get("ai_resumen"):
            st.info(f"**📋 Resumen Ejecutivo:** {st.session_state['ai_resumen']}")

        if st.session_state.get("ai_explicacion"):
            with st.expander("💡 Explicación Técnica"):
                st.markdown(st.session_state["ai_explicacion"])

        # Build tabs
        tab_names = ["📊 Explorador Visual", "📝 Datos y Exportación", "🗺️ Mapa"]
        if st.session_state.get("ai_dashboard"):
            tab_names.insert(0, "📈 Dashboard IA")

        tabs = st.tabs(tab_names)
        ti = 0

        # Tab: AI Dashboard
        if st.session_state.get("ai_dashboard"):
            with tabs[ti]:
                st.markdown("### Dashboard Generado por la IA")
                filtered_df = render_filters(result_df)
                st.divider()
                render_dashboard(filtered_df, st.session_state["ai_dashboard"])
            ti += 1

        # Tab: PyGWalker Explorer
        with tabs[ti]:
            st.markdown("### Explorador Interactivo de Dimensiones")
            st.markdown("Arrastra columnas a los ejes para explorar libremente.")
            try:
                html = pyg.to_html(result_df)
                st.components.v1.html(html, height=800, scrolling=True)
            except Exception as e:
                st.error(f"Error en PyGWalker: {e}")
        ti += 1

        # Tab: Data + Export
        with tabs[ti]:
            st.markdown("### Exportar Información")
            csv = result_df.to_csv(index=False).encode('utf-8')
            st.download_button("📥 Descargar CSV", csv, "dataset_exportado.csv", "text/csv")
            st.dataframe(result_df, use_container_width=True)
        ti += 1

        # Tab: Map
        with tabs[ti]:
            render_map_tab(result_df)

    except Exception as e:
        st.error(f"Error al ejecutar la consulta: {e}")
