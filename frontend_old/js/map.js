export let map;
export let categorias;

export function initMap() {
    if (map !== undefined && map !== null) {
        map.remove();
    }
    
    const cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB', className: 'map-invertible' });
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', className: 'map-invertible' });
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' });

    const boundsBolivia = [
        [-23.0, -70.0], // Suroeste
        [-9.0, -57.0]   // Noreste
    ];

    map = L.map('map', {
        center: [-16.5000, -68.1193],
        zoom: 14,
        layers: [cartoPositron],
        maxBounds: boundsBolivia,
        maxBoundsViscosity: 1.0,
        minZoom: 5
    });

    const baseMaps = {
        "Carto (Claro)": cartoPositron,
        "OpenStreetMap": osm,
        "Satélite": sat
    };
    
    L.control.layers(baseMaps, null, {position: 'topleft'}).addTo(map);

    categorias = {
        fuego: { color: '#FF0000', icon: 'fa-fire', nombre: 'Incendio', capa: L.layerGroup().addTo(map) },
        sismo: { color: '#8B4513', icon: 'fa-house-crack', nombre: 'Sismo', capa: L.layerGroup().addTo(map) },
        aire: { color: '#800080', icon: 'fa-wind', nombre: 'Calidad del Aire', capa: L.layerGroup().addTo(map) },
        bloqueo: { color: '#000000', icon: 'fa-person-through-window', nombre: 'Bloqueo', capa: L.layerGroup().addTo(map) }
    };

    // Bind toggles to layers
    const bindToggle = (id, key) => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = map.hasLayer(categorias[key].capa);
            el.addEventListener('change', function() {
                if(this.checked) map.addLayer(categorias[key].capa);
                else map.removeLayer(categorias[key].capa);
            });
        }
    };

    bindToggle('layer-fuego', 'fuego');
    bindToggle('layer-aire', 'aire');
    bindToggle('layer-sismo', 'sismo');
    bindToggle('layer-bloqueo', 'bloqueo');
}

export function renderMapPoints(points) {
    if (!points) return;
    
    // Clear existing points first
    Object.values(categorias).forEach(cat => cat.capa.clearLayers());

    points.forEach(p => {
        let cat = categorias[p.tipo];
        if (!cat) {
            // Dynamic Layer Creation by AI
            cat = {
                color: p.color || '#9C27B0',
                icon: p.icon || 'fa-robot',
                nombre: p.tipo.toUpperCase(),
                capa: L.layerGroup().addTo(map)
            };
            categorias[p.tipo] = cat;
        }

        let htmlContent = '';
        let customStyle = '';
        let iconClassName = 'custom-icon';
        let size = 30;

        if (p.tipo === 'aire') {
            const ica = p.valor_ica || 0;
            // AQI Color logic
            let color = '#00E400'; // Good
            if (ica > 50) color = '#FFFF00'; // Moderate
            if (ica > 100) color = '#FF7E00'; // Unhealthy SG
            if (ica > 150) color = '#FF0000'; // Unhealthy
            if (ica > 200) color = '#8F3F97'; // Very Unhealthy
            if (ica > 300) color = '#7E0023'; // Hazardous
            
            htmlContent = `<div style="font-weight:bold; font-size: 11px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${ica}</div>`;
            customStyle = `background-color: ${color}; color: white; border: 2px solid white; border-radius: 50%; display:flex; align-items:center; justify-content:center; width: 100%; height: 100%;`;
            
        } else if (p.tipo === 'sismo') {
            const mag = p.magnitud || 3;
            const prof = p.profundidad || 50;
            
            // Size based on magnitude
            if (mag >= 5) size = 45;
            else if (mag >= 4) size = 35;
            else size = 25;

            // Color based on depth (shallow = red, deep = blue)
            let color = '#EF4444'; // Red < 30km
            if (prof > 30 && prof <= 70) color = '#F59E0B'; // Orange
            if (prof > 70 && prof <= 150) color = '#EAB308'; // Yellow
            if (prof > 150) color = '#3B82F6'; // Blue

            htmlContent = `<i class="fa-solid fa-house-crack"></i>`;
            customStyle = `background-color: ${color}; border: 2px solid white; border-radius: 50%; color: white; display:flex; align-items:center; justify-content:center; width: 100%; height: 100%; box-shadow: 0 0 ${mag*2}px ${color};`;
            
        } else if (p.tipo === 'bloqueo') {
            const evento = p.evento ? p.evento.toUpperCase() : '';
            const isConflict = evento.includes('BLOQUEO') || evento.includes('MARCHA') || evento.includes('CONFLICTO') || evento.includes('SOCIAL');
            
            if (isConflict) {
                htmlContent = `<i class="fa-solid fa-hand-fist"></i>`;
                customStyle = `background-color: #EF4444; border: 2px dashed #000; border-radius: 4px; color: white; display:flex; align-items:center; justify-content:center; width: 100%; height: 100%;`;
            } else {
                htmlContent = `<i class="fa-solid fa-person-digging"></i>`;
                customStyle = `background-color: #F97316; border: 2px solid #000; border-radius: 4px; color: white; display:flex; align-items:center; justify-content:center; width: 100%; height: 100%;`;
            }
        } else {
            // Default
            htmlContent = `<i class="fa-solid ${cat.icon}"></i>`;
            customStyle = `background-color: ${cat.color}; border-radius: 50%; color: white; display:flex; align-items:center; justify-content:center; width: 100%; height: 100%;`;
        }

        const icono = L.divIcon({
            className: iconClassName,
            html: `<div style="${customStyle}">${htmlContent}</div>`,
            iconSize: [size, size]
        });
        L.marker([p.lat, p.lng], {icon: icono}).bindPopup(`<b>${p.titulo}</b><br>${p.desc}`).addTo(cat.capa);
    });

    // Auto fit bounds to show all markers
    const allLayers = [];
    Object.values(categorias).forEach(cat => {
        cat.capa.eachLayer(layer => allLayers.push(layer));
    });
    
    if (allLayers.length > 0) {
        const group = new L.featureGroup(allLayers);
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
    }
}
