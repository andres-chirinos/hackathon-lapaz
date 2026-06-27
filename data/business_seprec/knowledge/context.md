---
type: DuckDB Table
title: "Directorio de Empresas (SEPREC)"
description: "Base de datos del registro de comercio con información de empresas, sociedades y establecimientos económicos."
resource: data/business_seprec/business.parquet
tags: [empresas, seprec, comercio, negocios, economía]
timestamp: 2026-06-27T00:50:00Z
---

# Schema

| Column | Type | Description |
|---|---|---|
| `empresa_id` | INTEGER | ID interno identificador de la empresa |
| `establecimiento_id` | INTEGER | ID del establecimiento comercial |
| `estado` | STRING | Estado operativo de la empresa (ej. ACTIVO, CANCELADO) |
| `id` | INTEGER | ID del registro |
| `nit` | INTEGER | Número de Identificación Tributaria (NIT) |
| `matricula` | INTEGER | Número de Matrícula de Comercio |
| `matriculaAnterior` | INTEGER | Número de matrícula anterior (si aplica) |
| `razonSocial` | STRING | Nombre o razón social de la empresa |
| `codTipoUnidadEconomica_id` | INTEGER | ID del tipo societario o unidad económica |
| `codTipoUnidadEconomica_nombre` | STRING | Tipo de organización (ej. EMPRESA UNIPERSONAL, SOCIEDAD ANONIMA) |
| `mesCierreGestion` | INTEGER | Mes de cierre de gestión fiscal de la empresa |
| `ultimoAnioActualizacion` | INTEGER | Último año en el que la empresa actualizó su matrícula |
| `objetos_sociales` | JSON/STRING | Detalle de las actividades económicas y objeto social de la empresa |
| `codEstadoActualizacion_id` | INTEGER | ID del estado de la actualización |
| `codEstadoActualizacion_nombre` | STRING | Estado de la matrícula (ej. MATRICULA RENOVADA) |
| `direccion_id` | INTEGER | ID de la dirección registrada |
| `direccion_nombreVia` | STRING | Nombre de la calle o avenida de la empresa |
| `direccion_numeroDomicilio` | STRING | Número de puerta del domicilio |
| `direccion_edificio` | STRING | Nombre del edificio (si aplica) |
| `direccion_piso` | STRING | Número o nivel de piso (si aplica) |
| `direccion_latitud` | NUMBER | Latitud geográfica de la dirección de la empresa |
| `direccion_longitud` | NUMBER | Longitud geográfica de la dirección de la empresa |
| `direccion_codDepartamento_id` | NUMBER | ID del departamento |
| `direccion_codDepartamento_nombre` | STRING | Nombre del departamento (ej. LA PAZ, SANTA CRUZ) |
| `direccion_codProvincia_id` | NUMBER | ID de la provincia |
| `direccion_codProvincia_nombre` | STRING | Nombre de la provincia (ej. MURILLO) |
| `direccion_codMunicipio_id` | NUMBER | ID del municipio |
| `direccion_codMunicipio_nombre` | STRING | Nombre del municipio |
| `direccion_codTipoVia_nombre` | STRING | Tipo de vía (ej. Avenida, Calle, Pasaje) |
| `contactos` | JSON/STRING | Arreglo JSON con medios de contacto como correo electrónico y teléfonos |
| `direccion_codDepartamento` | NUMBER | Código auxiliar del departamento |
| `direccion_codProvincia` | NUMBER | Código auxiliar de la provincia |
| `direccion_codMunicipio` | NUMBER | Código auxiliar del municipio |
| `direccion_codTipoVia` | NUMBER | Código auxiliar del tipo de vía |

# Uso Analítico

Este dataset ofrece una radiografía del ecosistema empresarial y comercial:

- **Análisis espacial**: Mapeo de la distribución de empresas activas en base a `direccion_latitud` y `direccion_longitud` o agregando por municipio/departamento.
- **Análisis descriptivo**: Segmentación por tipo de empresa (`codTipoUnidadEconomica_nombre`), análisis de supervivencia (según `estado` y `ultimoAnioActualizacion`), e identificación de rubros populares analizando `objetos_sociales`.
- **Cruce de datos**: Se puede integrar con datos censales, información financiera o zonas de transporte.
- **Dashboard recomendado**: Mapa de calor empresarial por municipio + Gráficos de barra por tipo societario + Filtros de estado de matrícula.
