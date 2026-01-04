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
  Droplets 
} from "lucide-react"
import dynamic from "next/dynamic"
import DelhiMapLegend from "./DelhiMapLegend"

const DelhiHotspotMap = dynamic(
  () => import("./DelhiHotspotMap"),
  { ssr: false }
)

export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [cityWeather, setCityWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 🔥 USP: Rainfall Simulation
  const [simulatedRain, setSimulatedRain] = useState(0)
  // 🎬 Time-lapse
  const [playing, setPlaying] = useState(false)

  const fetchDelhiHotspots = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
        setCityWeather(data.city_weather || null)
        // Set initial simulation to actual rain if available
        if (data.city_weather?.rain_1h) setSimulatedRain(data.city_weather.rain_1h)
      }
    } catch {
      console.error("Backend unreachable")
    }
    setLoading(false)
  }

  useEffect(() => { fetchDelhiHotspots() }, [])

  // 🎬 Time-lapse effect
  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setSimulatedRain((prev) => (prev >= 50 ? 0 : prev + 5))
    }, 800)
    return () => clearInterval(interval)
  }, [playing])

  // 🔹 Simulation Logic
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
  // Sort by risk so highest are at top of list
  const sortedZones = [...simulatedZones].sort((a, b) => b.risk_score - a.risk_score)

  const getRiskColor = (status) => {
    if (status === "CRITICAL") return "border-l-4 border-red-500 bg-red-50"
    if (status === "HIGH") return "border-l-4 border-orange-400 bg-orange-50"
    if (status === "MODERATE") return "border-l-4 border-yellow-400 bg-yellow-50"
    return "border-l-4 border-green-400 bg-green-50"
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* 🔹 HEADER & WEATHER STRIP */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <CloudRain className="text-blue-600" /> Delhi Flood Monitor
          </h2>
          <p className="text-sm text-gray-500">Real-time zone vulnerability & simulation</p>
        </div>

        {cityWeather && (
          <div className="flex gap-4 text-sm">
            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2">
                <CloudRain size={16}/> <b>{cityWeather.rain_1h} mm</b>
            </div>
            <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg flex items-center gap-2">
                <Thermometer size={16}/> <b>{cityWeather.temperature}°C</b>
            </div>
            <div className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-lg flex items-center gap-2">
                <Droplets size={16}/> <b>{cityWeather.humidity}%</b>
            </div>
          </div>
        )}
      </div>

      {/* 🔹 MAIN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        
        {/* LEFT COL: MAP & CONTROLS (Takes 2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
            
            {/* Simulation Controls Bar */}
            <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center gap-4">
                <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                        <span>RAINFALL SIMULATION</span>
                        <span className="text-blue-600">{simulatedRain} mm/hr</span>
                    </div>
                    <input 
                        type="range" min="0" max="50" 
                        value={simulatedRain} 
                        onChange={(e) => setSimulatedRain(Number(e.target.value))} 
                        className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <button 
                    onClick={() => setPlaying(!playing)} 
                    className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 px-3 py-2 rounded"
                >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                    {playing ? "Pause" : "Play"}
                </button>
            </div>

            {/* Map Container */}
            <div className="relative flex-1 bg-white rounded-xl shadow-sm border overflow-hidden">
                <DelhiHotspotMap zones={simulatedZones} />
                <div className="absolute bottom-4 left-4 z-[1000]">
                    <DelhiMapLegend />
                </div>
            </div>
        </div>

        {/* RIGHT COL: SCROLLABLE LIST (Takes 1/3 width) */}
        <div className="bg-white rounded-xl shadow-sm border flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={18}/> Priority Zones
                </h3>
                <button onClick={fetchDelhiHotspots} className="text-xs text-blue-600 hover:underline">
                    {loading ? "Updating..." : "Refresh"}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {sortedZones.map((zone, idx) => (
                    <div key={idx} className={`p-3 rounded-lg bg-white shadow-sm border hover:shadow-md transition ${getRiskColor(zone.risk_status)}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1">
                                    {zone.zone_name}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                    Elev: {zone.details.elevation}m • Drain: {zone.details.drainage}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold px-2 py-1 rounded bg-white/60 border border-black/10">
                                    {zone.risk_status}
                                </span>
                                <p className="text-xs font-mono mt-1 text-gray-400">Score: {zone.risk_score}</p>
                            </div>
                        </div>
                        {/* Action Suggestion */}
                        {zone.risk_status === "CRITICAL" && (
                            <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded">
                                🚨 Immediate intervention required
                            </div>
                        )}
                         {zone.risk_status === "HIGH" && (
                            <div className="mt-2 text-xs text-orange-700 bg-orange-50 p-2 rounded">
                                ⚠️ Deploy traffic diversion teams
                            </div>
                        )}
                    </div>
                ))}
                
                {sortedZones.length === 0 && !loading && (
                    <div className="text-center text-gray-400 py-10">No zones data</div>
                )}
            </div>
        </div>

      </div>
    </div>
  )
}