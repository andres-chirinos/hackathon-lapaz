---
type: DuckDB Table
title: "Alertas Meteorológicas SENAMHI"
description: "Alertas geoespaciales emitidas por el SENAMHI sobre eventos climáticos adversos (heladas, lluvias intensas, vientos)."
resource: data/alerts/senamhi_alerts.geojson
tags: [alertas, senamhi, clima, riesgo, geoespacial]
timestamp: 2026-06-27T02:00:00Z
---

# Schema

Esta tabla se carga desde un GeoJSON y contiene geometrías (polígonos o multipolígonos) que representan las zonas afectadas por cada alerta.

| Column | Type | Description |
|--------|------|-------------|
| `geom` | GEOMETRY | Polígono de la zona afectada. **Siempre usar `ST_AsText(geom) AS geometry` en SELECT para visualización en mapa.** |
| *(otras columnas)* | VARIOS | Propiedades del GeoJSON que varían según la alerta: tipo de evento, severidad, fecha, departamento, etc. |

# Uso Analítico

Este dataset es **geoespacial de eventos**: cada fila es una alerta con su zona de cobertura como polígono.

- **Análisis espacial**: Visualizar polígonos de alerta en mapa interactivo. Agrupar por atributos categóricos (tipo de alerta, departamento).
- **Análisis temporal**: Si hay columna de fecha, agrupar por mes para ver frecuencia de alertas.
- **Cruce de datos**: Correlacionar con [calidad del aire](/tables/air_quality_air_quality.md) por fecha para estudiar impacto de eventos climáticos en contaminación.
- **Dashboard recomendado**: Mapa de polígonos de alertas + Barras por tipo de alerta + Línea de frecuencia mensual.

# Joins

- Con [air_quality_air_quality](/tables/air_quality_air_quality.md) por proximidad temporal.
- Con [sequia_senamhi_sequias](/tables/sequia_senamhi_sequias.md) por región y fecha si se quiere correlacionar alertas con niveles de sequía.
