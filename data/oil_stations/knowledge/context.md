---
type: DuckDB Table
title: "Estaciones de Gasolina"
description: "Registros de estaciones de gasolina en el Perú."
resource: data/oil_stations/stations.csv
tags: [petroleo, gasolina, estaciones]
timestamp: 2026-06-27T02:00:00Z
---

# Schema

| Column            | Type    | Description                             |
| ----------------- | ------- | --------------------------------------- |
| `id_eess_saldo`   | INTEGER | ID de la estación de combustible        |
| `id_entidad`      | INTEGER | ID de la entidad                        |
| `latitud`         | FLOAT   | Latitud de la estación de combustible   |
| `longitud`        | FLOAT   | Longitud de la estación de combustible  |
| `nombreEstacion`  | STRING  | Nombre de la estación de combustible    |
| `direccion`       | STRING  | Dirección de la estación de combustible |
| `id_departamento` | INTEGER | ID del departamento                     |

# Uso Analítico

Este dataset es geoespacial de eventos: cada fila es una alerta con su zona de cobertura como polígono.

- **Análisis espacial**: Visualizar polígonos de alerta en mapa interactivo. Agrupar por atributos categóricos (tipo de alerta, departamento).
- **Análisis temporal**: Si hay columna de fecha, agrupar por mes para ver frecuencia de alertas.
- **Cruce de datos**: Correlacionar con [calidad del aire](/tables/air_quality_air_quality.md) por fecha para estudiar impacto de eventos climáticos en contaminación.
- **Dashboard recomendado**: Mapa de polígonos de alertas + Barras por tipo de alerta + Línea de frecuencia mensual.
