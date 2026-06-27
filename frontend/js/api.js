const API_URL = 'http://localhost:8000/api';

export async function fetchDashboardData(date = null) {
    try {
        const url = date ? `${API_URL}/dashboard_data?date=${date}` : `${API_URL}/dashboard_data`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return await res.json();
    } catch(e) {
        console.error("Error fetching dashboard data:", e);
        return null;
    }
}

export async function fetchMapPoints(date = null) {
    try {
        const url = date ? `${API_URL}/map_points?date=${date}` : `${API_URL}/map_points`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch map points");
        return await res.json();
    } catch(e) {
        console.error("Error fetching map points:", e);
        return null;
    }
}

export async function chatWithAgent(query, lat, lon) {
    try {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, lat, lon })
        });
        if (!res.ok) throw new Error("Failed to chat with agent");
        return await res.json();
    } catch(e) {
        console.error("Error chatting with agent:", e);
        return null;
    }
}

export async function fetchLocationInfo(lat, lon, date = null) {
    try {
        const url = date ? `${API_URL}/location_info?lat=${lat}&lon=${lon}&date=${date}` : `${API_URL}/location_info?lat=${lat}&lon=${lon}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch location info");
        return await res.json();
    } catch(e) {
        console.error("Error fetching location info:", e);
        return { municipio: "Desconocido", alerts: [] };
    }
}
