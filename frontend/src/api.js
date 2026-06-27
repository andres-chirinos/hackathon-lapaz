const API_URL = '/api';

export async function fetchDashboardData(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const url = params.toString() ? `${API_URL}/dashboard_data?${params}` : `${API_URL}/dashboard_data`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    return res.json();
}

export async function fetchMapPoints(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const url = params.toString() ? `${API_URL}/map_points?${params}` : `${API_URL}/map_points`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch map points");
    return res.json();
}

export async function chatWithAgent(query, lat, lon) {
    const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lat, lon })
    });
    if (!res.ok) throw new Error("Failed to chat with agent");
    return res.json();
}

export async function fetchLocationInfo(lat, lon, startDate, endDate) {
    let url = `${API_URL}/location_info?lat=${lat}&lon=${lon}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch location info");
    return res.json();
}

export async function executeSql(query) {
    const res = await fetch(`${API_URL}/execute_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error ejecutando SQL");
    return data;
}

export async function fetchCatalogo() {
    const res = await fetch(`${API_URL}/catalogo`);
    if (!res.ok) throw new Error("Error fetching catalog");
    return res.json();
}
