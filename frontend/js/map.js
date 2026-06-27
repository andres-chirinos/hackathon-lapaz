export let map;
export let categorias;

export function initMap() {
    map = L.map('map').setView([-16.5000, -68.1193], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

    categorias = {
        fuego: { color: '#FF0000', icon: 'fa-fire', nombre: 'Incendio', capa: L.layerGroup().addTo(map) },
        sismo: { color: '#8B4513', icon: 'fa-house-crack', nombre: 'Sismo', capa: L.layerGroup().addTo(map) },
        aire: { color: '#800080', icon: 'fa-wind', nombre: 'Calidad del Aire', capa: L.layerGroup().addTo(map) },
        bloqueo: { color: '#000000', icon: 'fa-person-through-window', nombre: 'Bloqueo', capa: L.layerGroup().addTo(map) }
    };

    const filterPanel = L.control({position: 'topright'});
    filterPanel.onAdd = function() {
        const div = L.DomUtil.create('div', 'filter-panel');
        div.innerHTML = '<strong>Filtros:</strong><br>';
        Object.keys(categorias).forEach(key => {
            const cat = categorias[key];
            const label = L.DomUtil.create('label', 'filter-item', div);
            const check = L.DomUtil.create('input', '', label);
            check.type = 'checkbox'; check.checked = true;
            check.onclick = function() { this.checked ? map.addLayer(cat.capa) : map.removeLayer(cat.capa); };
            label.innerHTML += `<i class="fa-solid ${cat.icon}" style="color:${cat.color}; margin: 0 10px;"></i> ${cat.nombre}`;
        });
        return div;
    };
    filterPanel.addTo(map);
}

export function renderMapPoints(points) {
    if (!points) return;
    
    // Clear existing points first (if we are re-rendering)
    Object.values(categorias).forEach(cat => cat.capa.clearLayers());

    points.forEach(p => {
        const cat = categorias[p.tipo] || categorias['aire']; // default
        const esBloqueo = p.tipo === 'bloqueo';
        const icono = L.divIcon({
            className: `custom-icon ${esBloqueo ? 'icon-bloqueo' : ''}`,
            html: `<i class="fa-solid ${cat.icon}"></i>`,
            iconSize: [30, 30],
            style: `background-color: ${cat.color};`
        });
        L.marker([p.lat, p.lng], {icon: icono}).bindPopup(`<b>${p.titulo}</b><br>${p.desc}`).addTo(cat.capa);
    });
}
