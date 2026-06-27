const API_URL = 'http://localhost:8000/api';

export async function fetchDashboardData(startDate = null, endDate = null) {
    try {
        let url = `${API_URL}/dashboard_data`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return await res.json();
    } catch(e) {
        console.error("Error fetching dashboard data:", e);
        return null;
    }
}

export async function fetchMapPoints(startDate = null, endDate = null) {
    try {
        let url = `${API_URL}/map_points`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        
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

export async function fetchLocationInfo(lat, lon, startDate = null, endDate = null) {
    try {
        let url = `${API_URL}/location_info?lat=${lat}&lon=${lon}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch location info");
        return await res.json();
    } catch(e) {
        console.error("Error fetching location info:", e);
        return { municipio: "Desconocido", alerts: [] };
    }
}

export async function executeSql(query) {
    try {
        const res = await fetch(`${API_URL}/execute_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error ejecutando SQL");
        return data;
    } catch(e) {
        throw e;
    }
}
