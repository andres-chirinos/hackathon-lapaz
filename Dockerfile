FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

# Install system dependencies for DuckDB spatial
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY data/ ./data/
COPY knowledge/ ./knowledge/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Environment
ENV OPENSSL_CONF=/dev/null
EXPOSE 8000

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
