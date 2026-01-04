"use client"

import { useEffect, useState } from "react"
import { 
  CloudRain, 
  AlertTriangle, 
  Check, 
  MapPin, 
  Play, 
  Pause, 
  Thermometer, 
  Droplets,
  Wind
} from "lucide-react"
import dynamic from "next/dynamic"
import DelhiMapLegend from "./DelhiMapLegend"

// Lazy load map to prevent SSR issues
const DelhiHotspotMap = dynamic(
  () => import("./DelhiHotspotMap"),
  { ssr: false }
)

export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [cityWeather, setCityWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simulatedRain, setSimulatedRain] = useState(0)
  const [playing, setPlaying] = useState(false)

  // --- 1. FETCH DATA ---
  const fetchDelhiHotspots = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
        setCityWeather(data.city_weather || null)
        // Initialize simulation with actual rain
        if (data.city_weather?.rain_1h) setSimulatedRain(data.city_weather.rain_1h)
      }
    } catch {
      console.error("Backend unreachable")
    }
    setLoading(false)
  }

  useEffect(() => { fetchDelhiHotspots() }, [])

  // --- 2. TIME-LAPSE LOGIC ---
  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setSimulatedRain((prev) => (prev >= 50 ? 0 : prev + 5))
    }, 800)
    return () => clearInterval(interval)
  }, [playing])

  // --- 3. RISK CALCULATION ---
  const applyRainSimulation = (zone) => {
    let score = zone.risk_score
    if (simulatedRain > 40) score += 40
    else if (simulatedRain > 25) score += 25
    else if (simulatedRain > 10) score += 10

    let status = "LOW"
    if (score >= 70) status = "CRITICAL"
    else if (score >= 40) status = "HIGH"
    else if (score >= 20) status = "MODERATE"

    return { ...zone, risk_score: score, risk_status: status }
  }

  // Sort: Critical/High first
  const simulatedZones = zones.map(applyRainSimulation).sort((a, b) => b.risk_score - a.risk_score)

  // --- 4. UI HELPERS ---
  const getRiskColor = (status) => {
    if (status === "CRITICAL") return "border-red-500 bg-red-50"
    if (status === "HIGH") return "border-orange-500 bg-orange-50"
    if (status === "MODERATE") return "border-yellow-500 bg-yellow-50"
    return "border-green-500 bg-green-50"
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      
      {/* 🔹 HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CloudRain className="text-blue-600 h-8 w-8" /> 
            Delhi Flood Monitor
          </h1>
          <p className="text-gray-500 mt-1">Real-time zone vulnerability assessment & predictive simulation</p>
        </div>
        
        <button 
            onClick={fetchDelhiHotspots} 
            disabled={loading}
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-full shadow-sm hover:bg-gray-50 transition"
        >
            {loading ? "Refreshing..." : "↻ Refresh Live Data"}
        </button>
      </div>

      {/* 🔹 WEATHER STATS (Clean Cards) */}
      {cityWeather && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<CloudRain size={20} />} label="Rainfall (1h)" value={`${cityWeather.rain_1h} mm`} color="blue" />
            <StatCard icon={<Thermometer size={20} />} label="Temperature" value={`${cityWeather.temperature}°C`} color="orange" />
            <StatCard icon={<Droplets size={20} />} label="Humidity" value={`${cityWeather.humidity}%`} color="cyan" />
            <StatCard icon={<Wind size={20} />} label="Condition" value={cityWeather.description} color="gray" capitalize />
        </div>
      )}

      {/* 🔹 MAP SECTION (The Hero) */}
      <div className="relative w-full h-[550px] bg-gray-100 rounded-2xl overflow-hidden shadow-lg border border-gray-200 group">
        <DelhiHotspotMap zones={simulatedZones} />
        
        {/* Floating Legend */}
        <div className="absolute bottom-6 left-6 z-[1000]">
            <DelhiMapLegend />
        </div>

        {/* Floating Simulation Control Panel */}
        <div className="absolute top-6 right-6 z-[1000] w-80 bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 tracking-wider">SIMULATION MODE</span>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{simulatedRain} mm/hr</span>
            </div>
            
            <input 
                type="range" min="0" max="50" step="5"
                value={simulatedRain} 
                onChange={(e) => setSimulatedRain(Number(e.target.value))} 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
            />
            
            <button 
                onClick={() => setPlaying(!playing)} 
                className={`w-full py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition ${playing ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
                {playing ? <Pause size={16} /> : <Play size={16} />}
                {playing ? "Stop Simulation" : "Start Time-Lapse"}
            </button>
        </div>
      </div>

      {/* 🔹 HOTSPOTS GRID (Cards Layout) */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-gray-600" /> Priority Hotspots
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulatedZones.map((zone, idx) => (
                <div key={idx} className={`relative p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition duration-200 ${getRiskColor(zone.risk_status)}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-white/80 p-2 rounded-lg">
                            <MapPin className="text-gray-700 h-6 w-6" />
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-white rounded-full border shadow-sm">
                            {zone.risk_status}
                        </span>
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 mb-1">{zone.zone_name}</h4>
                    <p className="text-sm text-gray-500 mb-4">Risk Score: <span className="font-mono font-bold text-gray-700">{zone.risk_score}</span></p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-white/50 p-3 rounded-lg">
                        <div>
                            <span className="block text-gray-400">Elevation</span>
                            <span className="font-semibold">{zone.details.elevation}m</span>
                        </div>
                        <div>
                            <span className="block text-gray-400">Drainage</span>
                            <span className="font-semibold">{zone.details.drainage}</span>
                        </div>
                    </div>

                    {/* Action Hint */}
                    {zone.risk_status === "CRITICAL" && (
                        <div className="mt-3 text-xs font-medium text-red-700 bg-red-100/50 p-2 rounded flex items-center gap-2">
                            <AlertTriangle size={14}/> Immediate Attention Needed
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

    </div>
  )
}

// Simple Stat Component
function StatCard({ icon, label, value, color, capitalize = false }) {
    const bgColors = {
        blue: "bg-blue-50 text-blue-600",
        orange: "bg-orange-50 text-orange-600",
        cyan: "bg-cyan-50 text-cyan-600",
        gray: "bg-gray-50 text-gray-600"
    }
    
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-full ${bgColors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`text-lg font-bold text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
            </div>
        </div>
    )
}