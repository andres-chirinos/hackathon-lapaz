---
type: DuckDB Table
title: "Calidad del Aire — Mediciones ICA"
description: "Mediciones del Índice de Calidad del Aire (ICA) en estaciones de monitoreo de La Paz, con coordenadas geográficas."
resource: data/air_quality/air_quality.csv
tags: [aire, ica, contaminacion, salud, monitoreo]
timestamp: 2026-06-27T02:00:00Z
---

# Schema

| Column | Type | Description |
|--------|------|-------------|
| `fecha_hora_registro` | TIMESTAMP | Fecha y hora exacta de la medición. Dimensión temporal principal. |
| `lugar_nombre` | VARCHAR | Nombre de la estación de monitoreo (ej. "Cotahuma", "San Antonio"). Dimensión espacial categórica. |
| `latitude` | DOUBLE | Latitud WGS84 de la estación. Usar para mapas de puntos. |
| `longitude` | DOUBLE | Longitud WGS84 de la estación. Usar para mapas de puntos. |
| `valor_ica` | DOUBLE | Índice de Calidad del Aire (escala 0–500). **Es un índice: nunca sumar.** |
| `observaciones` | VARCHAR | Texto libre con observaciones de campo. |
| `fuente` | VARCHAR | Identificador de la fuente de datos (ej. Monica, SwissContact). |

# Uso Analítico

Este dataset es **espacio-temporal puntual**: cada fila es una medición en un lugar y momento específico.

- **Análisis temporal**: Agrupar por `DATE_TRUNC('day', fecha_hora_registro)` o `DATE_TRUNC('month', ...)`. Usar `AVG(valor_ica)` para tendencia diaria/mensual.
- **Análisis espacial**: Agrupar por `lugar_nombre`. Usar `AVG(valor_ica)` para comparar estaciones. Visualizar con mapa de puntos (`latitude`, `longitude`).
- **Dashboard recomendado**: Gráfico de línea temporal (x=fecha, y=AVG(valor_ica)) + Mapa de puntos por estación + Barras comparativas por estación.

# Joins

Puede cruzarse con [alertas SENAMHI](/tables/alerts_senamhi_alerts.md) por proximidad temporal (`fecha_hora_registro`) para correlacionar contaminación con eventos climáticos.

# Citations

[1] Escala ICA EPA — https://www.airnow.gov/aqi/aqi-basics/
