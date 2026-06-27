const API_URL = 'http://localhost:8000/api';

export async function fetchDashboardData() {
    try {
        const res = await fetch(`${API_URL}/dashboard_data`);
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        return await res.json();
    } catch(e) {
        console.error("Error fetching dashboard data:", e);
        return null;
    }
}

export async function fetchMapPoints() {
    try {
        const res = await fetch(`${API_URL}/map_points`);
        if (!res.ok) throw new Error("Failed to fetch map points");
        return await res.json();
    } catch(e) {
        console.error("Error fetching map points:", e);
        return null;
    }
}
