// SatarkMitra FastAPI Backend API Service
// Change this to your deployed backend URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Kedarnath Prediction ──
export interface KedarnathPrediction {
  location: string;
  alert_level: string;
  gru_forecast: number;
  tcn_forecast: number;
}

export function predictKedarnath(river_level: number, rainfall: number) {
  return apiFetch<KedarnathPrediction>("/api/predict", {
    method: "POST",
    body: JSON.stringify({ river_level, rainfall }),
  });
}

// ── Delhi Zones ──
export interface DelhiZone {
  zone_name: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_status: string;
  details: { elevation: number; drainage: string };
}

export function fetchDelhiZones() {
  return apiFetch<DelhiZone[]>("/api/delhi/zones");
}

// ── Weather ──
export interface WeatherData {
  temperature: number;
  humidity: number;
  rain_1h: number;
  description: string;
}

export function fetchWeather(lat: number, lon: number) {
  return apiFetch<WeatherData>(`/api/weather_by_location?lat=${lat}&lon=${lon}`);
}

// ── Citizen Report ──
export interface ReportResponse {
  status: string;
  verification_status: string;
  report_id: string;
}

export function submitReport(data: {
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  source?: string;
}) {
  return apiFetch<ReportResponse>("/api/report", {
    method: "POST",
    body: JSON.stringify({ source: "citizen", ...data }),
  });
}

// ── Health Check ──
export function checkHealth() {
  return apiFetch<{ status: string }>("/health");
}

export function fetchCitizenReports() {
  return apiFetch("/api/reports");
}