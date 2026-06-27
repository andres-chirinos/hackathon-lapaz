import { fetchDashboardData, fetchMapPoints } from './api.js';
import { initMap, renderMapPoints, map } from './map.js';

// --- SPA Navigation ---
window.showView = function(viewId, event) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    
    document.querySelectorAll('.main-nav a').forEach(el => el.classList.remove('active'));
    if (event) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.main-nav a[onclick*="${viewId}"]`).classList.add('active');
    }

    if (viewId === 'mapa' && map) {
        setTimeout(() => map.invalidateSize(), 200); // Fix map size issue when initially hidden
    }
}

async function loadDashboard() {
    const data = await fetchDashboardData();
    if (!data) return;

    // AQI
    document.getElementById('dashboard-aqi').innerText = data.aqi;
    const pct = Math.min(data.aqi / 300, 1);
    const offset = 125.6 - (125.6 * pct);
    document.getElementById('gauge-val-path').style.strokeDashoffset = offset;

    // Seismic
    document.getElementById('dashboard-seismic').innerText = data.seismic_mag;
    
    // Blockades
    document.getElementById('dashboard-blockades').innerText = data.blockades;
    if(data.blockades > 0) {
        document.getElementById('blockade-list-details').innerHTML = `<li><i class="ph-fill ph-traffic-signal" style="color: var(--alert-critical);"></i> ${data.blockades} puntos críticos detectados</li>`;
    } else {
        document.getElementById('blockade-list-details').innerHTML = '';
    }
}

async function loadMapPoints() {
    const data = await fetchMapPoints();
    if (data && data.points) {
        renderMapPoints(data.points);
    }
}

// --- Init Logic ---
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadDashboard();
    loadMapPoints();

    // Populate Municipalities
    const municipiosBolivia = {
        "La Paz": ["La Paz", "El Alto", "Viacha", "Copacabana", "Caranavi", "Coroico", "Achacachi", "Mecapaca", "Palca", "Patacamaya"],
        "Santa Cruz": ["Santa Cruz de la Sierra", "Montero", "Warnes", "Cotoca", "Samaipata", "San Ignacio de Velasco", "Yapacaní", "Camiri"]
    };

    const select = document.getElementById('municipio-select');
    for (const [depto, munis] of Object.entries(municipiosBolivia)) {
        const group = document.createElement('optgroup');
        group.label = depto;
        munis.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.toLowerCase().replace(/\s+/g, '-');
            opt.textContent = m;
            group.appendChild(opt);
        });
        select.appendChild(group);
    }

    const alertBanner = document.getElementById('alert-banner');
    const alertText = document.getElementById('alert-text');
    select.addEventListener('change', (e) => {
        alertText.innerHTML = `Viendo datos para <strong>${e.target.options[e.target.selectedIndex].text}</strong>.`;
        alertBanner.style.display = 'flex';
        // In a real app, map.setView() would center on the selected municipality here
    });

    // Theme logic
    document.getElementById('theme-btn').addEventListener('click', (e) => {
        const html = document.documentElement;
        const icon = e.currentTarget.querySelector('i');
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        icon.className = isDark ? 'ph ph-moon' : 'ph ph-sun';
        
        // Adjust map colors for dark mode if needed
        if (isDark) {
            document.querySelector('.leaflet-layer').style.filter = "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)";
        } else {
            document.querySelector('.leaflet-layer').style.filter = "none";
        }
    });
});
