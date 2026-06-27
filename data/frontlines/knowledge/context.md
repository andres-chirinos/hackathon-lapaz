---
type: DuckDB Table (Spatial)
title: "Fronteras y Límites Políticos (Municipios)"
description: "Dataset transversal de fronteras municipales. Sirve como capa base geoespacial (basemap) para integrar y cruzar todos los demás conjuntos de datos."
resource: data/frontlines/municipios.geojson
tags: [fronteras, municipios, geoespacial, transversal, polígonos, mapa]
timestamp: 2026-06-27T01:30:00Z
---

# Schema

Esta tabla se lee desde un archivo GeoJSON y contiene las geometrías (polígonos y multi-polígonos) que representan los límites territoriales de cada municipio.

| Column | Type | Description |
|--------|------|-------------|
| `id` | STRING | Identificador único o código oficial del municipio |
| `nombre` | STRING | Nombre del municipio (ej. La Paz, Santa Cruz de la Sierra) |
| `geom` | GEOMETRY | Objeto espacial con los límites. Al consultar usar funciones espaciales (ej. `ST_AsText(geom)` o funciones de intersección). |

# Uso Analítico (Enfoque Transversal)

Este dataset es el **eje transversal** del repositorio de datos, actuando como la base geográfica unificadora. A diferencia de otros datasets que contienen eventos o puntos (como incidentes de transitabilidad, sismos, empresas o estaciones de aire), este contiene **superficies geográficas**.

- **Capa Base (Basemap)**: Utilizado primariamente para dibujar el mapa interactivo de fondo sobre el cual se superponen las otras capas (puntos de calor, marcadores, polígonos de alerta).
- **Spatial Joins (Cruces Espaciales)**: Permite relacionar eventos puntuales con su jurisdicción municipal. Por ejemplo, mediante un `ST_Contains(municipios.geom, ST_Point(empresas.longitud, empresas.latitud))` se puede determinar de manera dinámica cuántas empresas hay por municipio, incluso si el dataset original de empresas no especifica el municipio de manera normalizada.
- **Coropletas**: Ideal para crear mapas de coropletas (choropleth maps) coloreando cada municipio según estadísticas agregadas (ej. cantidad de empresas, severidad promedio de sismos, calidad de aire, etc.).
- **Unificación de dimensiones**: Agrega valor al permitir que métricas aisladas de diferentes dominios se evalúen bajo un mismo nivel de agregación territorial (el municipio).
