import { fetchDashboardData, fetchMapPoints, chatWithAgent, fetchLocationInfo, executeSql } from './api.js';
import { initMap, renderMapPoints, map, categorias } from './map.js';

let currentLat = -16.5000;
let currentLon = -68.1193;
let lastAiResult = null;

function applyAiResult() {
    if (!lastAiResult) return;
    const result = lastAiResult;
    
    // Render Charts on Dashboard if active
    const currentView = document.querySelector('.main-nav a.active').getAttribute('onclick').includes('dashboard') ? 'dashboard' : 'map';
    if (currentView === 'dashboard') {
        let chartContainer = document.getElementById('ai-charts-container');
        if (!chartContainer) {
            chartContainer = document.createElement('div');
            chartContainer.id = 'ai-charts-container';
            chartContainer.style.display = 'grid';
            chartContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(400px, 1fr))';
            chartContainer.style.gap = '1.5rem';
            chartContainer.style.marginTop = '2rem';
            const mainContent = document.getElementById('main-content');
            if(mainContent) mainContent.appendChild(chartContainer);
        }
        if(!chartContainer) return;
        
        chartContainer.innerHTML = ''; // Clear previous

        // 1. Mostrar resumen estructurado como tarjeta
        if (result.resumen) {
            const summaryCard = document.createElement('div');
            summaryCard.className = 'card';
            summaryCard.style.gridColumn = '1 / -1';
            summaryCard.style.borderLeft = '4px solid var(--brand-blue)';
            summaryCard.innerHTML = `<div class="card-header">Conclusión de la IA <i class="ph-fill ph-robot" style="color: var(--brand-blue);"></i></div>
            <div style="padding: 15px; color: var(--text-primary); line-height: 1.6;">${result.resumen}</div>`;
            chartContainer.appendChild(summaryCard);
        }

        // 2. Render charts
        if (result.dashboard && result.dashboard.length > 0) {
            result.dashboard.forEach((chartSpec, i) => {
                if (chartSpec.tipo === 'map') return;
                
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<div class="card-header">${chartSpec.titulo}</div><canvas id="ai-chart-${i}"></canvas>`;
                chartContainer.appendChild(card);
                
                const ctx = document.getElementById(`ai-chart-${i}`).getContext('2d');
                const labels = result.data.map(d => d[chartSpec.x]);
                const dataPoints = result.data.map(d => d[chartSpec.y]);
                
                new Chart(ctx, {
                    type: chartSpec.tipo === 'area' ? 'line' : (chartSpec.tipo || 'bar'),
                    data: {
                        labels: labels,
                        datasets: [{
                            label: chartSpec.y,
                            data: dataPoints,
                            backgroundColor: 'rgba(0, 229, 255, 0.5)',
                            borderColor: 'rgba(0, 229, 255, 1)',
                            borderWidth: 2,
                            fill: chartSpec.tipo === 'area'
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: { y: { beginAtZero: true } }
                    }
                });
            });
        }
    } else if (currentView === 'map' && result.data && result.data.length > 0) {
         // Automatically plot points if AI returned tabular data with coordinates
         const points = result.data.map(d => {
             const lat = d.latitud || d.latitude || d.lat || currentLat;
             const lng = d.longitud || d.longitude || d.lon || d.lng || currentLon;
             
             // Try to guess a good title and build a description
             let titleStr = "Resultado IA";
             let descStr = "";
             Object.keys(d).forEach(k => {
                 const keyLower = k.toLowerCase();
                 if (!['latitud', 'latitude', 'lat', 'longitud', 'longitude', 'lon', 'lng'].includes(keyLower)) {
                     descStr += `<b>${k}:</b> ${d[k]}<br>`;
                     if (typeof d[k] === 'string' && d[k].length > 3 && titleStr === "Resultado IA") {
                         titleStr = d[k];
                     }
                 }
             });
             
             return {
                 lat: parseFloat(lat),
                 lng: parseFloat(lng),
                 tipo: d.tipo || d.capa || 'ia_custom', 
                 titulo: titleStr,
                 desc: descStr,
                 color: d.color,
                 icon: d.icon
             };
         }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
         
         if (points.length > 0) {
             renderMapPoints(points);
             if (map) {
                 const group = new L.featureGroup(Object.values(categorias).map(c => c.capa));
                 if (group.getBounds().isValid()) map.fitBounds(group.getBounds());
             }
         }
    }
}

// Catalogo view logic
async function loadCatalogo() {
    try {
        const container = document.getElementById('catalogo-container');
        if (!container) return;
        
        const res = await fetch('/api/catalogo');
        if (!res.ok) throw new Error("Error fetching catalog");
        const data = await res.json();
        
        container.innerHTML = ''; // Clear loading
        
        data.catalogo.forEach(ds => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.overflow = 'hidden';

            let thead = ds.columns.map(c => `<th style="text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--border-color);">${c}</th>`).join('');
            
            let tbody = ds.samples.map(row => {
                return '<tr>' + ds.columns.map(c => `<td style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">${row[c]}</td>`).join('') + '</tr>';
            }).join('');

            card.innerHTML = `
                <div class="card-header" style="font-size: 1.1rem; color: var(--brand-blue);">
                    <span><i class="ph-fill ph-table"></i> Dataset: ${ds.table_name.replace(/_/g, ' ').toUpperCase()}</span>
                    <span style="background: var(--brand-cyan); color: #000; padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">${ds.total_rows} Registros Totales</span>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                        <thead><tr>${thead}</tr></thead>
                        <tbody>${tbody}</tbody>
                    </table>
                </div>
            `;
            container.appendChild(card);
        });
        
        if(data.catalogo.length === 0) {
             container.innerHTML = '<p>No hay datos disponibles en el catálogo.</p>';
        }
    } catch (e) {
        console.error(e);
        const container = document.getElementById('catalogo-container');
        if (container) container.innerHTML = '<p style="color: red;">Error al cargar el catálogo de datos.</p>';
    }
}

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

        const startDate = document.getElementById('start-date')?.value || new Date().toISOString().split('T')[0];
        const endDate = document.getElementById('end-date')?.value || new Date().toISOString().split('T')[0];

        if (viewId === 'dashboard') {
            main.style.padding = '2rem';
            main.style.maxWidth = '1400px';
            await loadDashboard(startDate, endDate);
        } else if (viewId === 'map') {
            main.style.padding = '0';
            main.style.maxWidth = '100%';
            initMap();
            await loadMapPoints(startDate, endDate);
        } else if (viewId === 'catalogo') {
            main.style.padding = '2rem';
            main.style.maxWidth = '1400px';
            await loadCatalogo();
        }
        
        // Restore AI state if exists
        applyAiResult();
    } catch(e) {
        main.innerHTML = `<div style="color:var(--alert-critical); text-align:center;">Error cargando la vista: ${e.message}</div>`;
    }
}

async function loadDashboard(startDate = null, endDate = null) {
    const data = await fetchDashboardData(startDate, endDate);
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

async function loadMapPoints(startDate = null, endDate = null) {
    const data = await fetchMapPoints(startDate, endDate);
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

        // We use the global currentLat and currentLon which are updated via GPS or Municipio search.
        
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
            
            const sqlBlock = document.getElementById('chat-sql');
            if (sqlBlock) sqlBlock.innerText = result.sql || "-- No se generó SQL";
            
            chatResults.style.display = 'block';

            // CSV Download
            const dlBtn = document.getElementById('chat-download-btn');
            if (dlBtn && result.data && result.data.length > 0) {
                dlBtn.style.display = 'flex';
                dlBtn.onclick = () => {
                    const keys = Object.keys(result.data[0]);
                    const csvContent = "data:text/csv;charset=utf-8," 
                        + keys.join(",") + "\n"
                        + result.data.map(row => keys.map(k => JSON.stringify(row[k] || "")).join(",")).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "kuntur_data.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                };
            } else if (dlBtn) {
                dlBtn.style.display = 'none';
            }

            lastAiResult = result;
            applyAiResult();

        } else {
            alert("Hubo un error al procesar tu consulta con la IA. Asegúrate de tener configurado el GOOGLE_AI_API_KEY.");
        }
    });

    // SQL Terminal logic
    const toggleSqlBtn = document.getElementById('toggle-sql-btn');
    const closeSqlBtn = document.getElementById('close-sql-btn');
    const sqlPanel = document.getElementById('sql-panel');
    const sqlInput = document.getElementById('sql-input');
    const runSqlBtn = document.getElementById('run-sql-btn');

    if (toggleSqlBtn && sqlPanel) {
        toggleSqlBtn.addEventListener('click', () => {
            const currentSql = document.getElementById('chat-sql') ? document.getElementById('chat-sql').innerText : '';
            if (currentSql && currentSql !== "-- No se generó SQL") {
                sqlInput.value = currentSql;
            }
            sqlPanel.style.display = 'flex';
        });
    }

    if (closeSqlBtn && sqlPanel) {
        closeSqlBtn.addEventListener('click', () => {
            sqlPanel.style.display = 'none';
        });
    }

    if (runSqlBtn && sqlInput) {
        runSqlBtn.addEventListener('click', async () => {
            const query = sqlInput.value.trim();
            if (!query) return;
            
            runSqlBtn.disabled = true;
            runSqlBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Ejecutando...';
            
            try {
                const data = await executeSql(query);
                
                // Show result in a popup or under the textarea
                let resultHtml = `<div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; color: var(--text-primary);">
                    <div style="font-weight: bold; margin-bottom: 0.5rem; color: var(--brand-cyan);">Resultado (${data.total_rows} filas):</div>
                    <div style="overflow-x: auto; max-height: 200px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr>${data.columns.map(c => `<th style="text-align: left; padding: 0.3rem; border-bottom: 1px solid var(--border-color);">${c}</th>`).join('')}</tr>
                            </thead>
                            <tbody>
                                ${data.rows.map(row => `<tr>${data.columns.map(c => `<td style="padding: 0.3rem; border-bottom: 1px solid var(--border-color);">${row[c]}</td>`).join('')}</tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
                
                // Remove previous result if any
                const prevResult = document.getElementById('sql-result-container');
                if (prevResult) prevResult.remove();
                
                const resultDiv = document.createElement('div');
                resultDiv.id = 'sql-result-container';
                resultDiv.innerHTML = resultHtml;
                sqlInput.parentElement.appendChild(resultDiv);
                
            } catch (e) {
                alert("Error SQL:\n" + e.message);
            } finally {
                runSqlBtn.disabled = false;
                runSqlBtn.innerHTML = '<i class="ph-fill ph-play"></i> Ejecutar SQL';
            }
        });
    }
}

// --- Init Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // Set default date to today for end-date, and 7 days ago for start-date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];

    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput) startDateInput.value = lastWeekStr;
    if (endDateInput) endDateInput.value = todayStr;

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
                    currentLat = center.lat;
                    currentLon = center.lng;
                } else if (f.geojson) {
                    // Even if map is not initialized, we can compute center using Leaflet headless
                    const tempLayer = L.geoJSON(f.geojson);
                    const center = tempLayer.getBounds().getCenter();
                    currentLat = center.lat;
                    currentLon = center.lng;
                }

                const startDate = document.getElementById('start-date') ? document.getElementById('start-date').value : new Date().toISOString().split('T')[0];
                const endDate = document.getElementById('end-date') ? document.getElementById('end-date').value : new Date().toISOString().split('T')[0];
                const locInfo = await fetchLocationInfo(currentLat, currentLon, startDate, endDate);
                
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
    document.addEventListener('change', (e) => {
        if (e.target.id === 'start-date' || e.target.id === 'end-date') {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const currentView = document.querySelector('.main-nav a.active').getAttribute('onclick').includes('dashboard') ? 'dashboard' : 'map';
            if (currentView === 'dashboard') loadDashboard(startDate, endDate);
            else if (currentView === 'map') loadMapPoints(startDate, endDate);
        }
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
                
                const startDate = document.getElementById('start-date') ? document.getElementById('start-date').value : new Date().toISOString().split('T')[0];
                const endDate = document.getElementById('end-date') ? document.getElementById('end-date').value : new Date().toISOString().split('T')[0];
                const locInfo = await fetchLocationInfo(currentLat, currentLon, startDate, endDate);
                
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
