---
type: DuckDB Table
title: "Estaciones Hidrometeorológicas SENAMHI"
description: "Datos meteorológicos de estaciones SENAMHI con precipitación, temperatura, humedad, presión y viento."
resource: data/hidrostations/senamhi_hidro_stations.csv
tags: [meteorologia, senamhi, estaciones, precipitacion, temperatura, viento, humedad]
timestamp: 2026-06-27T02:00:00Z
---

# Schema

| Column | Type | Description |
|--------|------|-------------|
| `estacion` | VARCHAR | Nombre de la estación meteorológica. Dimensión espacial categórica. |
| `longitud` | DOUBLE | Longitud WGS84. Para mapas de puntos. |
| `latitud` | DOUBLE | Latitud WGS84. Para mapas de puntos. |
| `altura` | DOUBLE | Altitud de la estación en msnm. |
| `fecha_hora_registro` | TIMESTAMP | Fecha y hora de la observación. Dimensión temporal principal. |
| `Precipitación` | DOUBLE | Precipitación en mm. **Acumulable en tiempo** (`SUM` para total mensual de una estación), pero **promediar entre estaciones** (`AVG`). |
| `Temperatura Máxima` | DOUBLE | Temperatura máxima del día en °C. **No sumar.** Usar `AVG()` o `MAX()`. |
| `Temperatura Mínima` | DOUBLE | Temperatura mínima del día en °C. **No sumar.** Usar `AVG()` o `MIN()`. |
| `Temperatura Media` | VARCHAR/DOUBLE | Temperatura media. Puede venir como texto. Convertir con `TRY_CAST(... AS DOUBLE)`. |
| `Nubosidad Diaria` | VARCHAR/DOUBLE | Cobertura nubosa. Puede venir como texto. |
| `Nubosidad` | VARCHAR/DOUBLE | Nubosidad general. |
| `Humedad Relativa Máxima` | VARCHAR/DOUBLE | Humedad relativa máxima (%). **No sumar.** Usar `AVG()`. |
| `Humedad Relativa Mínima` | VARCHAR/DOUBLE | Humedad relativa mínima (%). |
| `Humedad Relativa Media` | VARCHAR/DOUBLE | Humedad relativa promedio (%). |
| `Presion Media` | VARCHAR/DOUBLE | Presión atmosférica promedio en hPa. **No sumar.** |
| `Presion Máxima` | VARCHAR/DOUBLE | Presión máxima en hPa. |
| `Presion Mínima` | VARCHAR/DOUBLE | Presión mínima en hPa. |
| `Velocidad de Viento Media` | VARCHAR/DOUBLE | Velocidad media del viento. **No sumar.** Usar `AVG()`. |
| `Velocidad de Viento Máxima` | VARCHAR/DOUBLE | Ráfaga máxima. Usar `MAX()`. |
| `Velocidad de Viento Mínima` | VARCHAR/DOUBLE | Velocidad mínima. |
| `Direccion de Viento Media` | VARCHAR | Dirección predominante del viento. Categórica, no operar aritméticamente. |
| `Direccion de Viento Máxima` | VARCHAR | Dirección en ráfaga máxima. |
| `Direccion de Viento Mínima` | VARCHAR | Dirección en calma. |
| `Direccion y Velocidad de Viento Predominante` | VARCHAR | Texto combinado de dirección y velocidad. |

# Uso Analítico

Este dataset es **espacio-temporal de series**: cada fila es una observación meteorológica de una estación en un momento dado.

- **Análisis temporal**: Agrupar por `DATE_TRUNC('month', fecha_hora_registro)` y `estacion`. Graficar `AVG("Temperatura Máxima")` como línea temporal.
- **Análisis espacial**: Agrupar por `estacion` para comparar climáticamente las estaciones. Usar `latitud`, `longitud` para mapa de puntos.
- **Atención especial**: Muchas columnas pueden venir como `VARCHAR` porque el CSV tiene valores mixtos. Usar `TRY_CAST(columna AS DOUBLE)` para convertir antes de agregar.
- **Dashboard recomendado**: Línea de temperatura media mensual + Barras de precipitación acumulada mensual + Mapa de estaciones.

# Joins

- Con [air_quality_air_quality](/tables/air_quality_air_quality.md) por proximidad temporal y espacial para correlacionar clima con calidad del aire.
- Con [sequia_senamhi_sequias](/tables/sequia_senamhi_sequias.md) por mes y región para correlacionar precipitación con niveles de sequía.
