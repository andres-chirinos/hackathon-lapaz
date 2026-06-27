"""
visualizer.py — Renders interactive dashboard charts and map views.
Handles bar, line, scatter, area, and map (point + polygon) chart types.
"""
import streamlit as st
import pandas as pd


def _detect_coords(df):
    """Detect coordinate column pairs in the dataframe."""
    cols = [c.lower() for c in df.columns]
    if 'latitude' in cols and 'longitude' in cols:
        return 'latitude', 'longitude'
    if 'lat' in cols and 'lon' in cols:
        return 'lat', 'lon'
    if 'latitud' in cols and 'longitud' in cols:
        return 'latitud', 'longitud'
    return None, None


def _render_map(df):
    """Render a map from coordinates or geometry columns."""
    lat_col, lon_col = _detect_coords(df)
    if lat_col and lon_col:
        st.map(df, latitude=lat_col, longitude=lon_col)
        return

    geom_cols = [c for c in df.columns if 'geom' in c.lower()]
    if geom_cols:
        geom_col = geom_cols[0]
        try:
            import geopandas as gpd
            from shapely import wkt
            if df[geom_col].dtype == object and len(df) > 0 and isinstance(df[geom_col].iloc[0], str):
                gdf = df.copy()
                gdf['geometry'] = gdf[geom_col].apply(wkt.loads)
                gdf = gpd.GeoDataFrame(gdf, geometry='geometry')
                gdf.set_crs(epsg=4326, inplace=True, allow_override=True)
                m = gdf.explore()
                st.components.v1.html(m._repr_html_(), height=500, scrolling=True)
                return
        except Exception as e:
            st.warning(f"Error al renderizar geometría: {e}")
            return

    st.info("No se detectaron coordenadas ni geometría para el mapa.")


def render_filters(df):
    """Render dynamic filters for categorical and temporal columns. Returns filtered df."""
    filtered = df.copy()
    filter_cols = st.columns(3)
    idx = 0

    for col in filtered.columns:
        if any(skip in col.lower() for skip in ['geom', 'enlace', 'referencias', 'observaciones']):
            continue

        # Categorical filter (up to 20 unique values)
        if filtered[col].dtype == object:
            unique = filtered[col].dropna().unique()
            if 0 < len(unique) <= 20:
                with filter_cols[idx % 3]:
                    selected = st.multiselect(f"🏷 {col}", unique, default=list(unique))
                    if selected:
                        filtered = filtered[filtered[col].isin(selected)]
                idx += 1

        # Date filter
        elif pd.api.types.is_datetime64_any_dtype(filtered[col]) or 'fecha' in col.lower() or 'date' in col.lower():
            try:
                temp = pd.to_datetime(filtered[col])
                min_d, max_d = temp.min().date(), temp.max().date()
                if min_d != max_d:
                    with filter_cols[idx % 3]:
                        dr = st.date_input(f"📅 {col}", [min_d, max_d], min_value=min_d, max_value=max_d)
                        if len(dr) == 2:
                            filtered = filtered[(temp.dt.date >= dr[0]) & (temp.dt.date <= dr[1])]
                    idx += 1
            except Exception:
                pass

    return filtered


def render_dashboard(df, dashboard_spec):
    """Render a list of chart specs as a dashboard grid."""
    if not dashboard_spec:
        st.info("No se definieron gráficos para el dashboard.")
        return

    cols = st.columns(2)

    for i, chart in enumerate(dashboard_spec):
        tipo = chart.get("tipo", "bar")
        titulo = chart.get("titulo", "Gráfico")
        vx = chart.get("x")
        vy = chart.get("y")
        color = chart.get("color")

        if vx and vx not in df.columns:
            vx = None
        if vy and vy not in df.columns:
            vy = None
        if color and color not in df.columns:
            color = None

        with cols[i % 2]:
            st.markdown(f"**{titulo}**")
            try:
                if tipo == "bar":
                    st.bar_chart(df, x=vx, y=vy, color=color)
                elif tipo == "line":
                    st.line_chart(df, x=vx, y=vy, color=color)
                elif tipo == "scatter":
                    st.scatter_chart(df, x=vx, y=vy, color=color)
                elif tipo == "area":
                    st.area_chart(df, x=vx, y=vy, color=color)
                elif tipo == "map":
                    _render_map(df)
            except Exception as e:
                st.warning(f"Error en gráfico '{titulo}': {e}")


def render_map_tab(df):
    """Render the standalone geospatial map tab."""
    st.markdown("### 🗺️ Vista Espacial")
    _render_map(df)
