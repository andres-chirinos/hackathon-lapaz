---
type: Guideline
title: "Guías Analíticas de Agregación de Variables"
description: "Reglas de negocio sobre cómo se deben evaluar, agregar y operar las variables del proyecto."
tags: [reglas, agregacion, buenas-practicas]
timestamp: 2026-06-27T02:00:00Z
---

# Propósito

Este documento define las reglas matemáticas y analíticas para las variables clave del proyecto. Un agente DEBE consultar este documento antes de construir cualquier consulta que involucre funciones de agregación (`SUM`, `AVG`, `MAX`, `MIN`, `COUNT`).

# Regla General

Antes de agregar una variable, determina si es un **índice/ratio** o un **valor acumulativo**. Aplicar `SUM()` a un índice produce resultados sin sentido.

# Variables de Tipo Índice (NO sumar)

Estas variables representan un estado, intensidad o ratio puntual. Sumarlas carece de sentido matemático.

| Variable | Tabla | Operaciones válidas | Operaciones prohibidas | Justificación |
|----------|-------|---------------------|----------------------|---------------|
| `valor_ica` | [air_quality_air_quality](/tables/air_quality_air_quality.md) | `AVG()`, `MAX()`, `MIN()` | `SUM()` | Es un índice estandarizado (0–500). Sumar ICA de varios días o estaciones no tiene interpretación física. |
| `magnitud` | [sismology_sismology](/tables/sismology_sismology.md) | `MAX()`, `MIN()`, `COUNT(*)` | `SUM()`, `AVG()` | Escala logarítmica (Richter). Un promedio de magnitudes es engañoso; usar `MAX()` para el sismo más fuerte o `COUNT(*)` para frecuencia. |
| `profundidad` | [sismology_sismology](/tables/sismology_sismology.md) | `AVG()`, `MAX()`, `MIN()` | `SUM()` | Profundidad focal en km. El promedio indica profundidad típica; la suma no tiene significado geofísico. |
| `lev_0` a `lev_4` | [sequia_senamhi_sequias](/tables/sequia_senamhi_sequias.md) | `AVG()`, `MAX()` | `SUM()` | Son porcentajes de cobertura (0–100%). Sumarlos supera 100% y pierde significado. |
| `Precipitación` | [hidrostations_senamhi_hidro_stations](/tables/hidrostations_senamhi_hidro_stations.md) | `SUM()` (acumular en tiempo), `AVG()` (entre estaciones) | — | La precipitación SÍ se acumula temporalmente (mm/mes), pero entre estaciones distintas se promedia. |
| `Temperatura *` | [hidrostations_senamhi_hidro_stations](/tables/hidrostations_senamhi_hidro_stations.md) | `AVG()`, `MAX()`, `MIN()` | `SUM()` | Las temperaturas son intensivas; se promedian, no se suman. |
| `Humedad Relativa *` | [hidrostations_senamhi_hidro_stations](/tables/hidrostations_senamhi_hidro_stations.md) | `AVG()`, `MAX()`, `MIN()` | `SUM()` | Porcentaje relativo (0–100%). |
| `Presion *` | [hidrostations_senamhi_hidro_stations](/tables/hidrostations_senamhi_hidro_stations.md) | `AVG()`, `MAX()`, `MIN()` | `SUM()` | Presión atmosférica en hPa; es intensiva. |
| `Velocidad de Viento *` | [hidrostations_senamhi_hidro_stations](/tables/hidrostations_senamhi_hidro_stations.md) | `AVG()`, `MAX()` | `SUM()` | Velocidad instantánea; sumarla no tiene sentido. |

# Variables Acumulativas (SÍ sumar)

| Variable | Tabla | Operaciones válidas | Notas |
|----------|-------|---------------------|-------|
| Conteo de eventos | Todas | `COUNT(*)` | Usar para contar sismos, alertas, registros. |
| `Precipitación` (temporal) | [hidrostations](/tables/hidrostations_senamhi_hidro_stations.md) | `SUM()` | Solo para acumular precipitación en el tiempo dentro de una misma estación. |

# Coordenadas y Geometría

| Columna | Tratamiento |
|---------|-------------|
| `latitude`, `longitude`, `latitud`, `longitud` | Usar para `GROUP BY` (agrupar por estación). Nunca promediar ni sumar. Para mapas, incluir directamente en el `SELECT`. |
| `geom` (geometría WKB) | Siempre convertir con `ST_AsText(geom) AS geometry` en el SELECT. En GROUP BY usar `FIRST(geom)`. |
| `X`, `Y` (en sequia_dataset) | Son coordenadas de polígonos. No operar aritméticamente. |

# Dimensiones Clave

| Dimensión | Columnas típicas | Uso recomendado |
|-----------|-----------------|-----------------|
| **Temporal** | `fecha_hora_registro`, `date` | Eje X en gráficos de línea. Agrupar por `DATE_TRUNC('month', ...)` para tendencias. |
| **Espacial** | `lugar_nombre`, `estacion`, `region`, `MACROREG`, `region_base` | Categoría en barras, o referencia para mapa. |
| **Métrica** | `valor_ica`, `magnitud`, `Precipitación`, `lev_*` | Eje Y en gráficos. Respetar reglas de agregación de arriba. |

# Citations

[1] Escala ICA estandarizada EPA — https://www.airnow.gov/aqi/aqi-basics/
[2] Escala Richter (logarítmica) — https://earthquake.usgs.gov/learn/glossary/?term=magnitude
