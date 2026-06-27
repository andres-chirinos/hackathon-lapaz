---
type: DuckDB Table
title: "Indicadores de Sequía por Macroregión"
description: "Niveles de sequía (lev_0 a lev_4) como porcentajes de cobertura por macroregión y mes, emitidos por SENAMHI."
resource: data/sequia/senamhi_sequias.csv
tags: [sequia, senamhi, clima, macroregion, indicadores]
timestamp: 2026-06-27T02:00:00Z
---

# Schema

| Column | Type | Description |
|--------|------|-------------|
| `date` | VARCHAR | Año y mes en formato YYYY-MM. Dimensión temporal principal. Convertir con `CAST(date AS DATE)` o `STRPTIME(date, '%Y-%m')`. |
| `lev_0` | DOUBLE | % de la macroregión con **humedad normal** (sin sequía). **No sumar.** Usar `AVG()`. |
| `lev_1` | DOUBLE | % de la macroregión con **sequía débil**. **No sumar.** |
| `lev_2` | DOUBLE | % de la macroregión con **sequía moderada**. **No sumar.** |
| `lev_3` | DOUBLE | % de la macroregión con **sequía severa**. **No sumar.** |
| `lev_4` | DOUBLE | % de la macroregión con **sequía extrema**. **No sumar.** |
| `region` | VARCHAR | Nombre de la macroregión (ej. "Altiplano", "Valles", "Llanos"). Dimensión espacial categórica. FK a [sequia_dataset](/tables/sequia_dataset.md) via `MACROREG`. |
| `fecha_hora_registro` | TIMESTAMP | Timestamp del registro. Redundante con `date` pero útil para JOINs temporales. |

# Uso Analítico

Este dataset es **espacio-temporal de indicadores**: cada fila es el estado de sequía de una macroregión en un mes dado, expresado como distribución de porcentajes.

- **Análisis temporal**: Agrupar por `date` para ver la evolución mensual de la sequía. Graficar cada `lev_*` como áreas apiladas para visualizar la distribución de severidad en el tiempo.
- **Análisis espacial**: Agrupar por `region` para comparar macroregiones. Cruzar con [sequia_dataset](/tables/sequia_dataset.md) para obtener polígonos geoespaciales.
- **Interpretación**: Los niveles suman ~100% en cada fila (lev_0 + lev_1 + lev_2 + lev_3 + lev_4 ≈ 100%). Un aumento de `lev_3` y `lev_4` indica empeoramiento de la sequía.
- **Dashboard recomendado**: Gráfico de áreas apiladas (x=date, y=lev_*) por región + Mapa de macroregiones coloreado por severidad + Barras comparativas entre regiones.

# Joins

- Con [sequia_dataset](/tables/sequia_dataset.md) usando `region = MACROREG` para obtener los polígonos geoespaciales de cada macroregión.
- Con [hidrostations_senamhi_hidro_stations](/tables/hidrostations_senamhi_hidro_stations.md) por mes y región para correlacionar precipitación con niveles de sequía.

# Examples

```sql
-- Evolución temporal de la sequía extrema en el Altiplano
SELECT date, lev_4 AS sequia_extrema_pct
FROM sequia_senamhi_sequias
WHERE region = 'Altiplano'
ORDER BY date;
```
