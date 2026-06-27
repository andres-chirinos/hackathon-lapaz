.PHONY: build-prod build-dev clean

# Define el intérprete y rutas
PYTHON = .venv/bin/python
UVICORN = .venv/bin/uvicorn
STREAMLIT = .venv/bin/streamlit

# Inicia únicamente la API (Producción) con el frontend estático
build-prod:
	@echo "Iniciando API y Frontend en modo Producción..."
	@OPENSSL_CONF=/dev/null $(UVICORN) src.api:app --host 0.0.0.0 --port 8000

# Inicia la API en segundo plano y el frontend de Streamlit en primer plano (Desarrollo)
build-dev:
	@echo "Iniciando API y Streamlit en modo Desarrollo..."
	@trap 'echo "Limpiando procesos..."; pkill -f "uvicorn src.api:app" || true' EXIT; \
	OPENSSL_CONF=/dev/null $(UVICORN) src.api:app --reload --port 8000 & \
	sleep 3; \
	OPENSSL_CONF=/dev/null $(STREAMLIT) run src/app.py --server.port 8501

# Limpieza de procesos huérfanos (por si acaso el background task se queda colgado)
clean:
	@echo "Limpiando procesos..."
	-pkill -f uvicorn
	-pkill -f streamlit
