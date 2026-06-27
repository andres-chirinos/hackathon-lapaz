import { fetchDashboardData, fetchMapPoints, chatWithAgent, fetchLocationInfo } from './api.js';
import { initMap, renderMapPoints, map } from './map.js';

let currentLat = -16.5000;
let currentLon = -68.1193;

// --- SPA Navigation ---
window.showView = async function(viewId, event) {
    document.querySelectorAll('.main-nav a').forEach(el => el.classList.remove('active'));
    if (event) {
        event.target.classList.add('active');
    } else {
        const link = document.querySelector(`.main-nav a[onclick*="${viewId}"]`);
        if (link) link.classList.add('active');
    }

    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="ph ph-spinner ph-spin" style="font-size:2rem; color:var(--brand-blue);"></i></div>';

    try {
        const res = await fetch(`views/${viewId}.html`);
        if (!res.ok) throw new Error("View not found");
        main.innerHTML = await res.text();

        const date = document.getElementById('date-select').value;

        if (viewId === 'dashboard') {
            loadDashboard(date);
        } else if (viewId === 'map') {
            initMap();
            loadMapPoints(date);
        }
    } catch(e) {
        main.innerHTML = `<div style="color:var(--alert-critical); text-align:center;">Error cargando la vista: ${e.message}</div>`;
    }
}

async function loadDashboard(date = null) {
    const data = await fetchDashboardData(date);
    if (!data) return;

    const elAqi = document.getElementById('dashboard-aqi');
    if (elAqi) {
        elAqi.innerText = data.aqi;
        const pct = Math.min(data.aqi / 300, 1);
        const offset = 125.6 - (125.6 * pct);
        document.getElementById('gauge-val-path').style.strokeDashoffset = offset;
    }

    const elSeismic = document.getElementById('dashboard-seismic');
    if (elSeismic) elSeismic.innerText = data.seismic_mag;
    
    const elBlockades = document.getElementById('dashboard-blockades');
    const elBlockadesDetails = document.getElementById('blockade-list-details');
    if (elBlockades) {
        elBlockades.innerText = data.blockades;
        if(data.blockades > 0 && elBlockadesDetails) {
            elBlockadesDetails.innerHTML = `<li><i class="ph-fill ph-traffic-signal" style="color: var(--alert-critical);"></i> ${data.blockades} puntos críticos detectados (estado activo)</li>`;
        } else if (elBlockadesDetails) {
            elBlockadesDetails.innerHTML = '';
        }
    }
}

async function loadMapPoints(date = null) {
    const data = await fetchMapPoints(date);
    if (data && data.points) {
        renderMapPoints(data.points);
    }
}

function initChat() {
    const chatBtn = document.getElementById('chat-btn');
    const chatInput = document.getElementById('chat-input');
    const chatLoading = document.getElementById('chat-loading');
    const chatResults = document.getElementById('chat-results');
    
    if(!chatBtn) return;

    chatBtn.addEventListener('click', async () => {
        const query = chatInput.value.trim();
        if (!query) {
            alert("Por favor ingresa una consulta.");
            return;
        }

        if (map) {
            const center = map.getCenter();
            currentLat = center.lat;
            currentLon = center.lng;
        }

        chatLoading.style.display = 'block';
        chatResults.style.display = 'none';
        chatBtn.disabled = true;
        chatBtn.style.opacity = '0.7';

        const result = await chatWithAgent(query, currentLat, currentLon);

        chatLoading.style.display = 'none';
        chatBtn.disabled = false;
        chatBtn.style.opacity = '1';

        if (result) {
            document.getElementById('chat-resumen').innerHTML = result.resumen || "Análisis completado (sin resumen específico).";
            document.getElementById('chat-explicacion').innerText = result.explicacion || "No hay explicación técnica disponible.";
            document.getElementById('chat-sql').innerText = result.sql || "-- No se generó SQL";
            chatResults.style.display = 'block';
        } else {
            alert("Hubo un error al procesar tu consulta con la IA. Asegúrate de tener configurado el GOOGLE_AI_API_KEY.");
        }
    });
}

// --- Init Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date-select');
    if (dateInput) dateInput.value = today;

    // Initial Load
    window.showView('dashboard');
    
    // Initialize Chat Sidebar
    initChat();

    // Fetch and Populate Municipalities from GeoJSON
    let municipiosLayer = null;
    let municipiosData = null;
    let allMunicipios = [];
    let filteredMunicipios = [];
    let muniCurrentPage = 1;
    const ITEMS_PER_PAGE = 10;

    const muniInput = document.getElementById('muni-search-input');
    const muniListContainer = document.getElementById('muni-list-container');
    const muniList = document.getElementById('muni-list');
    const muniPrev = document.getElementById('muni-prev');
    const muniNext = document.getElementById('muni-next');
    const muniPage = document.getElementById('muni-page');
    
    const alertBanner = document.getElementById('alert-banner');
    const alertText = document.getElementById('alert-text');
    const alertsDetails = document.getElementById('alerts-details');

    function renderMuniPage() {
        muniList.innerHTML = '';
        const totalPages = Math.max(1, Math.ceil(filteredMunicipios.length / ITEMS_PER_PAGE));
        
        if (filteredMunicipios.length === 0) {
            muniList.innerHTML = '<li style="padding: 0.8rem; text-align: center; color: var(--text-secondary);">No se encontraron resultados</li>';
            muniPage.textContent = `0 / 0`;
            return;
        }

        const start = (muniCurrentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageItems = filteredMunicipios.slice(start, end);

        pageItems.forEach(f => {
            const li = document.createElement('li');
            li.style.padding = '0.5rem 0.8rem';
            li.style.cursor = 'pointer';
            li.style.borderBottom = '1px solid var(--border-color)';
            li.textContent = f.properties.nombre;
            
            li.onmouseover = () => li.style.backgroundColor = 'var(--bg-base)';
            li.onmouseout = () => li.style.backgroundColor = 'transparent';
            
            li.addEventListener('click', async () => {
                const selectedVal = f.properties.id || f.properties.nombre;
                const selectedText = f.properties.nombre;
                muniInput.value = selectedText;
                muniListContainer.style.display = 'none';
                
                alertText.innerHTML = `Analizando alertas en <strong>${selectedText}</strong>...`;
                alertBanner.style.display = 'flex';
                alertsDetails.innerHTML = "";
                
                let centerLat = currentLat;
                let centerLon = currentLon;

                if (map) {
                    if (municipiosLayer) map.removeLayer(municipiosLayer);
                    municipiosLayer = L.geoJSON(f, {
                        style: { color: 'var(--brand-cyan)', weight: 3, opacity: 0.7, fillOpacity: 0.1 }
                    }).addTo(map);
                    map.fitBounds(municipiosLayer.getBounds());
                    
                    const center = municipiosLayer.getBounds().getCenter();
                    centerLat = center.lat;
                    centerLon = center.lng;
                }

                const currentDate = document.getElementById('date-select').value;
                const locInfo = await fetchLocationInfo(centerLat, centerLon, currentDate);
                
                alertText.innerHTML = `Viendo datos para <strong>${locInfo.municipio || selectedText}</strong>.`;
                renderAlerts(locInfo);
            });
            muniList.appendChild(li);
        });

        muniPage.textContent = `${muniCurrentPage} / ${totalPages}`;
        muniPrev.disabled = muniCurrentPage === 1;
        muniNext.disabled = muniCurrentPage === totalPages;
    }

    fetch('/data/frontlines/municipios.geojson')
        .then(res => res.json())
        .then(data => {
            municipiosData = data;
            allMunicipios = data.features.sort((a,b) => (a.properties.nombre > b.properties.nombre) ? 1 : -1);
            filteredMunicipios = [...allMunicipios];
            renderMuniPage();
        })
        .catch(e => {
            console.error("Error loading municipios:", e);
            muniList.innerHTML = '<li style="padding: 0.8rem; text-align: center; color: var(--alert-critical);">Error al cargar</li>';
        });

    muniInput.addEventListener('focus', () => {
        muniListContainer.style.display = 'block';
    });

    muniInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filteredMunicipios = allMunicipios.filter(f => f.properties.nombre.toLowerCase().includes(term));
        muniCurrentPage = 1;
        renderMuniPage();
        muniListContainer.style.display = 'block';
    });

    muniPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (muniCurrentPage > 1) {
            muniCurrentPage--;
            renderMuniPage();
        }
    });

    muniNext.addEventListener('click', (e) => {
        e.preventDefault();
        const totalPages = Math.ceil(filteredMunicipios.length / ITEMS_PER_PAGE);
        if (muniCurrentPage < totalPages) {
            muniCurrentPage++;
            renderMuniPage();
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#muni-dropdown-container')) {
            muniListContainer.style.display = 'none';
        }
    });

    // Date Selector Logic
    document.getElementById('date-select').addEventListener('change', (e) => {
        const date = e.target.value;
        const currentView = document.querySelector('.main-nav a.active').getAttribute('onclick').includes('dashboard') ? 'dashboard' : 'map';
        if (currentView === 'dashboard') loadDashboard(date);
        else if (currentView === 'map') loadMapPoints(date);
    });

    // Helper to render alerts
    function renderAlerts(locInfo) {
        if (locInfo.alerts && locInfo.alerts.length > 0) {
            alertsDetails.innerHTML = `Detectamos <strong>${locInfo.alerts.length}</strong> alerta(s) en su zona.`;
            
            const btnDetails = document.getElementById('btn-main-details');
            btnDetails.style.display = 'block';
            btnDetails.onclick = () => {
                const modal = document.getElementById('alert-modal');
                const modalContent = document.getElementById('modal-content');
                
                let html = '';
                locInfo.alerts.forEach((a, idx) => {
                    html += `
                    <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                        <h3 style="color: var(--alert-critical); margin-bottom: 0.5rem;">🔥 ${a.tipo}</h3>
                        <p>${a.descripcion}</p>
                    </div>`;
                });
                modalContent.innerHTML = html;
                modal.style.display = 'flex';

                document.getElementById('modal-view-map').onclick = () => {
                    modal.style.display = 'none';
                    window.showView('map');
                    setTimeout(() => {
                        if (map) {
                            const layers = [];
                            locInfo.alerts.forEach(a => {
                                if (a.geojson) {
                                    const layer = L.geoJSON(a.geojson, {
                                        style: { color: 'red', weight: 3, opacity: 0.8, fillOpacity: 0.3 }
                                    }).addTo(map);
                                    layer.bindPopup(`<strong>Alerta: ${a.tipo}</strong><br>${a.descripcion}`);
                                    layers.push(layer);
                                }
                            });
                            if (layers.length > 0) {
                                const group = new L.featureGroup(layers);
                                map.fitBounds(group.getBounds());
                            }
                        }
                    }, 500);
                };
                
                document.getElementById('modal-close').onclick = () => {
                    modal.style.display = 'none';
                };
            };

        } else {
            alertsDetails.innerHTML = "<span style='color: var(--text-primary); font-weight: normal;'>No hay alertas meteorológicas activas en tu zona para esta fecha.</span>";
            document.getElementById('btn-main-details').style.display = 'none';
        }
    }

    // GPS Logic + Location Info
    document.getElementById('gps-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                currentLat = position.coords.latitude;
                currentLon = position.coords.longitude;
                
                if (map) {
                    map.setView([currentLat, currentLon], 14);
                    L.marker([currentLat, currentLon]).addTo(map).bindPopup("Estás aquí").openPopup();
                }

                alertBanner.style.display = 'flex';
                alertText.innerHTML = `Analizando tu ubicación...`;
                
                const currentDate = document.getElementById('date-select').value;
                const locInfo = await fetchLocationInfo(currentLat, currentLon, currentDate);
                
                alertText.innerHTML = `Ubicación detectada: <strong>${locInfo.municipio}</strong>.`;
                renderAlerts(locInfo);

            }, (error) => {
                console.error("Error getting GPS:", error);
                alert("No se pudo obtener la ubicación GPS.");
            });
        } else {
            alert("Geolocalización no soportada por su navegador.");
        }
    });

    // Theme logic
    document.getElementById('theme-btn').addEventListener('click', (e) => {
        const html = document.documentElement;
        const icon = e.currentTarget.querySelector('i');
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        icon.className = isDark ? 'ph ph-moon' : 'ph ph-sun';
    });
});
