---
type: DuckDB Table
title: "Macroregiones de Sequía — Polígonos Geoespaciales"
description: "Polígonos geoespaciales (GeoJSON) de las macroregiones de sequía de Bolivia, para visualización en mapas."
resource: data/sequia/dataset.geojson
tags: [sequia, geoespacial, macroregion, poligonos, mapa]
timestamp: 2026-06-27T02:00:00Z
---

# Schema

| Column | Type | Description |
|--------|------|-------------|
| `MACROREG` | VARCHAR | Nombre de la macroregión (ej. "Altiplano", "Valles", "Llanos"). Clave de unión con [sequia_senamhi_sequias](/tables/sequia_senamhi_sequias.md) via `region`. |
| `X` | DOUBLE | Coordenada X del centroide del polígono. No operar aritméticamente. |
| `Y` | DOUBLE | Coordenada Y del centroide del polígono. No operar aritméticamente. |
| `geom` | GEOMETRY | Polígono/Multipolígono de la macroregión. **Siempre usar `ST_AsText(geom) AS geometry` para visualización en mapa.** |

# Uso Analítico

Este dataset es **geoespacial de referencia estática**: contiene los contornos geográficos de las macroregiones. No tiene dimensión temporal por sí mismo.

- **Visualización**: Usar directamente para pintar un mapa base de macroregiones con Folium/GeoPandas.
- **Cruce principal**: Hacer JOIN con [sequia_senamhi_sequias](/tables/sequia_senamhi_sequias.md) para colorear cada polígono según el nivel de sequía de un mes específico.
- **Dashboard recomendado**: Mapa coroplético donde cada macroregión se colorea por `lev_4` (sequía extrema) de un mes dado.

# Joins

- Con [sequia_senamhi_sequias](/tables/sequia_senamhi_sequias.md) usando `MACROREG = region`.

# Examples

```sql
-- Mapa de sequía extrema por macroregión para un mes específico
SELECT d.MACROREG, s.lev_4 AS sequia_extrema, ST_AsText(d.geom) AS geometry
FROM sequia_dataset d
JOIN sequia_senamhi_sequias s ON d.MACROREG = s.region
WHERE s.date = '2024-06';
```
