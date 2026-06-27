---
type: DuckDB Table
title: "Eventos de Transitabilidad y Estado de Carreteras"
description: "Registros históricos y actuales sobre el estado de transitabilidad de carreteras, cortes, bloqueos y mantenimientos."
resource: data/transitability/events.csv
tags: [transitabilidad, carreteras, bloqueos, mantenimiento, transporte]
timestamp: 2026-06-27T00:30:00Z
---

# Schema

| Column | Type | Description |
|---|---|---|
| `fecha_consulta` | DATETIME | Fecha y hora en la que se consultó o registró el dato en el sistema |
| `fecha_reporte` | DATETIME | Fecha y hora en la que se reportó el evento o estado |
| `fecha_fin` | DATETIME | Fecha y hora estimada de finalización del evento o restricción |
| `latitud` | NUMBER | Latitud geográfica del tramo o evento |
| `longitud` | NUMBER | Longitud geográfica del tramo o evento |
| `estado` | STRING | Estado general de transitabilidad (ej. no transitable por conflictos sociales) |
| `sección` | STRING | Nombre del tramo o sección de la carretera (ej. cr. rt. 1265 - pumazani) |
| `evento` | STRING | Tipo de evento que afecta la vía (ej. derrumbe, accidente, ninguno) |
| `clima` | STRING | Condiciones climáticas reportadas en el sector (ej. despejado) |
| `horario_de_corte` | STRING | Horario en el que la vía permanece cortada al tránsito |
| `tipo_de_carretera` | STRING | Tipo de superficie o material de la vía (ej. tierra o ripio) |
| `alternativa_de_circulación_o_desvios` | STRING | Rutas alternas en caso de existir cortes |
| `restricción_vehicular` | STRING | Tipos de vehículos permitidos o restringidos |
| `sector` | STRING | Sector específico dentro del tramo afectado |
| `trabajos_de_conservación_vial` | STRING | Trabajos de mantenimiento que se están realizando (ej. mantenimiento de la vía) |

# Uso Analítico

Este dataset contiene eventos geoespaciales puntuales sobre el estado de la red vial nacional:

- **Análisis espacial**: Visualización de los puntos de bloqueos, mantenimientos o cortes de vía en un mapa para identificar cuellos de botella geográficos.
- **Análisis temporal**: Evaluación de la duración de bloqueos o restricciones utilizando `fecha_reporte` y `fecha_fin`. 
- **Cruce de datos**: Se puede cruzar con datos de accidentes, eventos climáticos o transporte para entender causas y consecuencias de los cortes.
- **Dashboard recomendado**: Mapa en tiempo real con marcadores por tipo de problema (clima, bloqueo, mantenimiento) + panel de alertas activas + tiempos de resolución históricos.
