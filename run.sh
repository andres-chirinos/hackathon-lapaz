#!/bin/bash
export OPENSSL_CONF=/dev/null
echo "Iniciando DataLab La Paz (resolviendo error de OpenSSL)..."
.venv/bin/uvicorn src.api:app --reload --port 8000 &
sleep 2
echo "Servidor API iniciado en http://localhost:8000"
echo "Abre index.html en tu navegador."
