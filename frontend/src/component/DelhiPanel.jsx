"use client"

import { useEffect, useState } from "react"
import { 
  CloudRain, 
  AlertTriangle, 
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
  { 
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">Loading Map...</div>
  }
)

export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [cityWeather, setCityWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 🔥 USP: Rainfall Simulation
  const [simulatedRain, setSimulatedRain] = useState(0)
  // 🎬 Time-lapse
  const [playing, setPlaying] = useState(false)

  // 1. Fetch Data
  const fetchDelhiHotspots = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
        setCityWeather(data.city_weather || null)
        // Initialize sim with real rain
        if (data.city_weather?.rain_1h) setSimulatedRain(data.city_weather.rain_1h)
      }
    } catch (err) {
      console.error("Backend error", err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchDelhiHotspots() }, [])

  // 2. Time-lapse
  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setSimulatedRain((prev) => (prev >= 50 ? 0 : prev + 5))
    }, 800)
    return () => clearInterval(interval)
  }, [playing])

  // 3. Risk Logic
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

  const simulatedZones = zones.map(applyRainSimulation)
  const topHotspots = [...simulatedZones].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5)

  // Helpers
  const getActionSuggestion = (risk) => {
    switch (risk) {
      case "CRITICAL": return "🚨 Immediate intervention required"
      case "HIGH": return "⚠️ Deploy traffic diversion teams"
      case "MODERATE": return "🛠️ Clear drains & monitor"
      default: return "✅ Normal monitoring"
    }
  }

  const getRiskColor = (status) => {
    if (status === "CRITICAL") return "border-red-500 bg-red-50 text-red-900"
    if (status === "HIGH") return "border-orange-500 bg-orange-50 text-orange-900"
    if (status === "MODERATE") return "border-yellow-500 bg-yellow-50 text-yellow-900"
    return "border-green-500 bg-green-50 text-green-900"
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      
      {/* 🔹 HEADER & WEATHER STRIP */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <CloudRain className="text-blue-600 h-8 w-8" /> Delhi Flood Monitor
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">Real-time Zone Vulnerability & Simulation</p>
        </div>

        {cityWeather && (
          <div className="flex gap-4 text-sm overflow-x-auto">
            <div className="px-4 py-2 bg-blue-50 text-blue-800 rounded-lg flex items-center gap-2 border border-blue-100 whitespace-nowrap">
                <CloudRain size={18}/> <div><p className="text-[10px] font-bold text-blue-400">RAIN (1H)</p><b>{cityWeather.rain_1h} mm</b></div>
            </div>
            <div className="px-4 py-2 bg-orange-50 text-orange-800 rounded-lg flex items-center gap-2 border border-orange-100 whitespace-nowrap">
                <Thermometer size={18}/> <div><p className="text-[10px] font-bold text-orange-400">TEMP</p><b>{cityWeather.temperature}°C</b></div>
            </div>
            <div className="px-4 py-2 bg-cyan-50 text-cyan-800 rounded-lg flex items-center gap-2 border border-cyan-100 whitespace-nowrap">
                <Droplets size={18}/> <div><p className="text-[10px] font-bold text-cyan-400">HUMIDITY</p><b>{cityWeather.humidity}%</b></div>
            </div>
          </div>
        )}
      </div>

      {/* 🔹 MAIN SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[650px]">
        
        {/* LEFT: MAP & CONTROLS (2/3 Width) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
            {/* Simulation Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                        <span>SIMULATED RAINFALL SCENARIO</span>
                        <span className="text-blue-600 bg-blue-50 px-2 rounded">{simulatedRain} mm/hr</span>
                    </div>
                    <input 
                        type="range" min="0" max="50" 
                        value={simulatedRain} 
                        onChange={(e) => setSimulatedRain(Number(e.target.value))} 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                <button 
                    onClick={() => setPlaying(!playing)} 
                    className={`btn btn-sm flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${playing ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}
                >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                    {playing ? "Stop" : "Simulate"}
                </button>
            </div>

            {/* Map Container */}
            <div className="relative flex-1 bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">
                <DelhiHotspotMap zones={simulatedZones} />
                <div className="absolute bottom-6 left-6 z-[1000]">
                    <DelhiMapLegend />
                </div>
            </div>
        </div>

        {/* RIGHT: PRIORITY LIST (1/3 Width) */}
        <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[500px] lg:h-full overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={18}/> Top Risks
                </h3>
                <button onClick={fetchDelhiHotspots} className="text-xs font-bold text-blue-600 hover:underline">
                    {loading ? "..." : "REFRESH"}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {topHotspots.map((zone, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border-l-4 bg-white border shadow-sm transition hover:shadow-md ${getRiskColor(zone.risk_status)}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                    {zone.zone_name}
                                </h4>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                                    Elev: {zone.details.elevation}m • Drain: {zone.details.drainage}
                                </p>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded bg-white/50 border">
                                {zone.risk_score}
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                            <p className="text-xs font-medium text-slate-600 flex items-start gap-1">
                                <span>👉</span> {getActionSuggestion(zone.risk_status)}
                            </p>
                        </div>
                    </div>
                ))}
                
                {topHotspots.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">No critical zones detected.</div>
                )}
            </div>
        </div>

      </div>
    </div>
  )
}