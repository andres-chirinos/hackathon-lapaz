.PHONY: build-prod build-dev clean install

PYTHON = .venv/bin/python
UVICORN = .venv/bin/uvicorn

# Install all dependencies
install:
	@echo "Instalando dependencias de Python..."
	@pip install fastapi uvicorn python-dotenv duckdb pandas chromadb google-genai pydantic geopandas
	@echo "Instalando dependencias de Node.js..."
	@cd frontend && npm install

# Desarrollo: API backend + Vite dev server (con hot reload)
build-dev:
	@echo "Iniciando API y React en modo Desarrollo..."
	@trap 'echo "Limpiando..."; pkill -f "uvicorn src.api:app" || true; pkill -f "vite" || true' EXIT; \
	OPENSSL_CONF=/dev/null $(UVICORN) src.api:app --reload --port 8000 & \
	sleep 2; \
	cd frontend && npm run dev

# Producción: Build React + API serve todo
build-prod:
	@echo "Construyendo frontend React..."
	@cd frontend && npm run build
	@echo "Iniciando API con frontend estático..."
	@OPENSSL_CONF=/dev/null $(UVICORN) src.api:app --host 0.0.0.0 --port 8000

# Limpieza
clean:
	@echo "Limpiando procesos..."
	-pkill -f uvicorn
	-pkill -f vite
	-pkill -f streamlit
