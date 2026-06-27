#!/bin/bash
export OPENSSL_CONF=/dev/null
echo "Iniciando DataLab La Paz (resolviendo error de OpenSSL)..."
.venv/bin/streamlit run src/app.py --server.port 8501
