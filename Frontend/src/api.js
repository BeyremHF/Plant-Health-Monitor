const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

// GET /plant -> { sensors, health, pump: { trigger, duration } }
export function fetchPlantStatus() {
  return request("/plant");
}

// POST /pump -> { success, duration }
export function triggerPumpBackend() {
  return request("/pump", { method: "POST" });
}