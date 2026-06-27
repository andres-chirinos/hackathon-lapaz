# Guía de Arquitectura y Despliegue - DataLab La Paz (Kuntur)

Este documento describe la arquitectura, los requerimientos y el proceso de despliegue para la aplicación SPA y Backend de "Kuntur", el Observatorio Analítico impulsado por IA para la Hackathon La Paz.

## 1. Arquitectura de la Aplicación

La aplicación sigue un patrón de **SPA (Single Page Application)** servido desde un backend de Python. Está compuesta por dos capas principales:

### Frontend (SPA)
*   **Tecnologías:** Vanilla JavaScript (ES6+), HTML5, CSS3.
*   **Librerías Externas:** Leaflet.js (Mapas interactivos), Chart.js (Visualizaciones dinámicas generadas por la IA), Phosphor Icons.
*   **Funcionamiento:** `app.js` gestiona el estado global (como los resultados recientes de la IA), el cambio de vistas (`views/dashboard.html` y `views/map.html`) y las llamadas a la API (`api.js`). 

### Backend (API & Agente)
*   **Tecnologías:** Python 3.10+, FastAPI.
*   **Base de Datos Relacional y Espacial:** DuckDB (Motor OLAP en memoria) con la extensión `spatial` habilitada para geoprocesamiento rápido sobre archivos Parquet/CSV.
*   **Base de Datos Vectorial (RAG):** ChromaDB local. Indexa todos los documentos Markdown en las carpetas `knowledge/` y `data/**/knowledge/` para inyectar reglas de negocio semánticas al LLM.
*   **Agente de IA:** Utiliza Google Gemini (`gemini-2.5-flash`) mediante llamadas a funciones (Function Calling) estructuradas en un pipeline de 3 fases (Exploración, SQL, Visualización).

---

## 2. Requerimientos del Sistema

*   **Sistema Operativo:** Linux (Ubuntu/Debian) o macOS (recomendado para desarrollo).
*   **Python:** Versión 3.10 o superior.
*   **Herramientas del Sistema:** `make` instalado.

---

## 3. Variables de Entorno

La aplicación requiere llaves de acceso para el agente de IA. En la carpeta `src/`, debes crear o configurar un archivo `.env` basado en el `.env.sample`.

Crea el archivo `src/.env` y asegúrate de que contenga tu llave de Google AI Studio:

```env
GOOGLE_AI_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX"
GOOGLE_AI_PROYECT_ID="1058328059501" # (Opcional según el nivel de aislamiento de la API)
```

*(El backend utiliza la librería `python-dotenv` para cargar automáticamente este archivo cuando inicia FastAPI).*

---

## 4. Despliegue Local (Desarrollo)

El proyecto incluye un `Makefile` diseñado para orquestar la instalación y ejecución del entorno.

### 4.1 Instalar e Iniciar
Desde la raíz del proyecto, ejecuta:
```bash
make build-dev
```
**¿Qué hace este comando?**
1.  Verifica si existe el entorno virtual `.venv`. Si no existe, lo crea.
2.  Instala/Actualiza las dependencias desde `src/requirements.txt` (`pip install -r`).
3.  Inicia el servidor backend utilizando `uvicorn` apuntando a `src.api:app`.
4.  Carga y embebe los documentos en la base de datos vectorial local.

Una vez que termine, la aplicación estará disponible en:
👉 **http://127.0.0.1:8000**

### 4.2 Limpiar Entorno
Si necesitas reiniciar el servidor o limpiar procesos huérfanos en los puertos de FastAPI/Streamlit, ejecuta:
```bash
make clean
```
*(Esto ejecutará `pkill` para terminar los procesos de `uvicorn` que hayan quedado en segundo plano).*

---

## 5. Estructura de Directorios

```text
├── Makefile                   # Orquestador de tareas
├── data/                      # Conjuntos de datos (Parquet, CSV)
│   └── frontlines/            # Archivos geoespaciales (ej. municipios.geojson)
├── docs/                      # Documentación del sistema
├── frontend/                  # Carpeta raíz servida de forma estática
│   ├── index.html             # Layout unificado de la SPA
│   ├── css/style.css          # Variables CSS y Modo Oscuro
│   ├── js/                    # Controladores (app.js, map.js, api.js)
│   └── views/                 # Vistas dinámicas (dashboard, map)
├── knowledge/                 # Base de conocimientos global (Markdown) para RAG
└── src/                       # Código fuente del Backend
    ├── .env                   # Variables (debes crearlo)
    ├── api.py                 # Endpoints FastAPI y Servidor Estático
    ├── ai_agent.py            # Orquestador del Agente Gemini (Fases 1, 2, 3)
    ├── database.py            # Conexión a DuckDB y Datapackages
    ├── knowledge_loader.py    # Integración con ChromaDB
    └── requirements.txt       # Dependencias de Python
```

---

## 6. Funcionalidades Clave

*   **Hot-Reloading en UI:** Cambiar entre Mapa y Dashboard retiene el contexto del "Agente IA". El agente no olvida los análisis realizados.
*   **Geoprocesamiento On-The-Fly:** Si pides al Asistente un análisis espacial que arroje Coordenadas (Lat/Lon), el sistema inyectará directamente el resultado usando Leaflet y DuckDB.
*   **Modo Oscuro Exclusivo:** Los mapas vectoriales aplican filtros avanzados de contraste para no cegar al usuario por la noche, sin degradar visualmente las capas de fotografías satelitales (Esri).
*   **Exportación CSV:** Las respuestas tabulares de la IA generan instantáneamente un archivo descargable.
