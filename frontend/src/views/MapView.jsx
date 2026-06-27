import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchMapPoints } from '../api';

const BOLIVIA_BOUNDS = [[-23.0, -70.0], [-9.0, -57.0]];

function getAqiColor(ica) {
  if (ica > 300) return '#7E0023';
  if (ica > 200) return '#8F3F97';
  if (ica > 150) return '#FF0000';
  if (ica > 100) return '#FF7E00';
  if (ica > 50) return '#FFFF00';
  return '#00E400';
}

function getSeismicColor(prof) {
  if (prof > 150) return '#3B82F6';
  if (prof > 70) return '#EAB308';
  if (prof > 30) return '#F59E0B';
  return '#EF4444';
}

function getSeismicSize(mag) {
  if (mag >= 5) return 45;
  if (mag >= 4) return 35;
  return 25;
}

function createIcon(p) {
  let html = '', style = '', size = 30;

  if (p.tipo === 'aire') {
    const ica = p.valor_ica || 0;
    const color = getAqiColor(ica);
    html = `<div style="font-weight:bold;font-size:11px;text-shadow:1px 1px 2px rgba(0,0,0,0.5);">${ica}</div>`;
    style = `background-color:${color};color:white;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;width:100%;height:100%;`;
  } else if (p.tipo === 'sismo') {
    const mag = p.magnitud || 3;
    const prof = p.profundidad || 50;
    size = getSeismicSize(mag);
    const color = getSeismicColor(prof);
    html = `<i class="fa-solid fa-house-crack"></i>`;
    style = `background-color:${color};border:2px solid white;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-shadow:0 0 ${mag*2}px ${color};`;
  } else if (p.tipo === 'bloqueo') {
    const evento = (p.evento || '').toUpperCase();
    const isConflict = evento.includes('BLOQUEO') || evento.includes('MARCHA') || evento.includes('CONFLICTO');
    if (isConflict) {
      html = `<i class="fa-solid fa-hand-fist"></i>`;
      style = `background-color:#EF4444;border:2px dashed #000;border-radius:4px;color:white;display:flex;align-items:center;justify-content:center;width:100%;height:100%;`;
    } else {
      html = `<i class="fa-solid fa-person-digging"></i>`;
      style = `background-color:#F97316;border:2px solid #000;border-radius:4px;color:white;display:flex;align-items:center;justify-content:center;width:100%;height:100%;`;
    }
  } else {
    // Dynamic AI layer
    const color = p.color || '#9C27B0';
    html = `<i class="fa-solid ${p.icon || 'fa-robot'}"></i>`;
    style = `background-color:${color};border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;width:100%;height:100%;`;
  }

  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="${style}">${html}</div>`,
    iconSize: [size, size],
  });
}

function LayerToggles({ layers, toggleLayer }) {
  return (
    <div className="floating-panel" style={{ top: 20, left: 20, width: 280 }}>
      <div className="panel-title">Capas de Datos</div>
      {Object.entries(layers).map(([key, layer]) => (
        <label className="toggle-row" key={key}>
          <span><i className={`fa-solid ${layer.icon}`} style={{ color: layer.color }} /> {layer.nombre}</span>
          <div className="switch">
            <input type="checkbox" checked={layer.visible} onChange={() => toggleLayer(key)} />
            <span className="slider" />
          </div>
        </label>
      ))}
    </div>
  );
}

function AqiLegend() {
  return (
    <div className="floating-panel" style={{ top: 20, right: 20, padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>AQI (ica)</div>
      <div style={{ width: 120, height: 10, borderRadius: 5, background: 'linear-gradient(to right, #00E400, #FFFF00, #FF7E00, #FF0000, #8F3F97, #7E0023)' }} />
    </div>
  );
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [points, map]);
  return null;
}

function MunicipioOverlay({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (geojson) {
      const layer = L.geoJSON(geojson, { style: { color: '#00E5FF', weight: 3, opacity: 0.7, fillOpacity: 0.1 } });
      layer.addTo(map);
      map.fitBounds(layer.getBounds());
      return () => map.removeLayer(layer);
    }
  }, [geojson, map]);
  return null;
}

const DEFAULT_LAYERS = {
  fuego: { color: '#FF0000', icon: 'fa-fire', nombre: 'Focos de Calor', visible: true },
  sismo: { color: '#8B4513', icon: 'fa-house-crack', nombre: 'Sismos', visible: true },
  aire: { color: '#800080', icon: 'fa-wind', nombre: 'Calidad del Aire', visible: true },
  bloqueo: { color: '#000000', icon: 'fa-road-barrier', nombre: 'Bloqueos de Tráfico', visible: true },
};

export default function MapView({ dates, location, aiResult, municipioGeojson }) {
  const [points, setPoints] = useState([]);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);

  useEffect(() => {
    fetchMapPoints(dates.startDate, dates.endDate)
      .then(data => {
        if (data?.points) {
          setPoints(data.points);
          // Register dynamic AI layers
          const newLayers = { ...DEFAULT_LAYERS };
          data.points.forEach(p => {
            if (!newLayers[p.tipo]) {
              newLayers[p.tipo] = { color: p.color || '#9C27B0', icon: p.icon || 'fa-robot', nombre: p.tipo.toUpperCase(), visible: true };
            }
          });
          setLayers(newLayers);
        }
      })
      .catch(e => console.error("Error loading map points:", e));
  }, [dates]);

  // Merge AI result points
  useEffect(() => {
    if (aiResult?.data?.length > 0) {
      const aiPoints = aiResult.data.map(d => {
        const lat = d.latitud || d.latitude || d.lat;
        const lng = d.longitud || d.longitude || d.lon || d.lng;
        if (!lat || !lng) return null;
        let desc = '';
        Object.keys(d).forEach(k => {
          if (!['latitud','latitude','lat','longitud','longitude','lon','lng'].includes(k.toLowerCase())) {
            desc += `<b>${k}:</b> ${d[k]}<br>`;
          }
        });
        return {
          lat: parseFloat(lat), lng: parseFloat(lng),
          tipo: d.tipo || 'ia_custom', titulo: 'Resultado IA', desc,
          color: d.color, icon: d.icon
        };
      }).filter(Boolean);
      if (aiPoints.length > 0) {
        setPoints(prev => [...prev, ...aiPoints]);
        setLayers(prev => {
          const next = { ...prev };
          aiPoints.forEach(p => {
            if (!next[p.tipo]) next[p.tipo] = { color: p.color || '#9C27B0', icon: 'fa-robot', nombre: p.tipo.toUpperCase(), visible: true };
          });
          return next;
        });
      }
    }
  }, [aiResult]);

  const toggleLayer = (key) => {
    setLayers(prev => ({ ...prev, [key]: { ...prev[key], visible: !prev[key].visible } }));
  };

  const visiblePoints = points.filter(p => layers[p.tipo]?.visible !== false);

  return (
    <div className="map-container-wrapper">
      <MapContainer center={[location.lat, location.lon]} zoom={14} maxBounds={BOLIVIA_BOUNDS} maxBoundsViscosity={1.0} minZoom={5} style={{ flex: 1, height: '100%', width: '100%', zIndex: 1 }}>
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="Carto (Claro)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB" className="map-invertible" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" className="map-invertible" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri" />
          </LayersControl.BaseLayer>
        </LayersControl>

        {visiblePoints.map((p, i) => (
          <Marker key={`${p.tipo}-${i}`} position={[p.lat, p.lng]} icon={createIcon(p)}>
            <Popup><b>{p.titulo}</b><br /><span dangerouslySetInnerHTML={{ __html: p.desc }} /></Popup>
          </Marker>
        ))}

        <FitBounds points={visiblePoints} />
        {municipioGeojson && <MunicipioOverlay geojson={municipioGeojson} />}
      </MapContainer>

      <LayerToggles layers={layers} toggleLayer={toggleLayer} />
      <AqiLegend />
    </div>
  );
}
