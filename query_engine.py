import streamlit as st

st.set_page_config(page_title="Deprecated", page_icon="⚠️")

st.error("⚠️ **ESTE ARCHIVO ESTÁ DEPRECADO Y YA NO FUNCIONA**")
st.warning(
    "Por favor, ejecuta la nueva versión modular y estable con el comando:\n\n"
    "`streamlit run src/app.py --server.port 8501`"
)
st.info("La nueva versión incluye ChromaDB y el SDK moderno de Google Gemini, resolviendo todos los errores de conexión y de importación.")
