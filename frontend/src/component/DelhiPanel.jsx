"use client"

import { useEffect, useState } from "react"
import {
  CloudRain,
  AlertTriangle,
  Check,
  MapPin,
  Play,
  Pause
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

  // 🌧️ Rainfall Simulation
  const [simulatedRain, setSimulatedRain] = useState(0)

  // 🎬 Time‑lapse
  const [playing, setPlaying] = useState(false)

  const fetchDelhiHotspots = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      if (!res.ok) throw new Error("Server error")

      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
        setCityWeather(data.city_weather || null)
      }
    } catch {
      alert("Backend not reachable")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDelhiHotspots()
  }, [])

  // 🎬 Time‑lapse effect
  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setSimulatedRain((prev) => (prev >= 50 ? 0 : prev + 5))
    }, 800)
    return () => clearInterval(interval)
  }, [playing])

  // 🔹 Risk simulation logic
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

  // 🔥 TOP‑5 DANGEROUS HOTSPOTS
  const topHotspots = [...simulatedZones]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5)

  // 🚨 Authority Action Suggestions
  const getActionText = (risk) => {
    if (risk === "CRITICAL") return "🚨 Emergency response required"
    if (risk === "HIGH") return "🧹 Deploy pumps & drain cleanup"
    if (risk === "MODERATE") return "🔍 Inspect drainage systems"
    return "✅ Monitoring only"
  }

  const getRiskIcon = (status) => {
    if (status === "CRITICAL") return <AlertTriangle className="text-red-600" />
    if (status === "HIGH") return <AlertTriangle className="text-orange-500" />
    if (status === "MODERATE") return <AlertTriangle className="text-yellow-500" />
    return <Check className="text-green-600" />
  }

  return (
    <div className="card max-w-6xl mx-auto p-4">
      <h3 className="card-title flex gap-2 items-center mb-2">
        <CloudRain /> Delhi Water‑Logging Decision Dashboard
      </h3>

      <p className="text-sm text-gray-600 mb-3">
        Zone‑wise flood risk with predictive rainfall simulation
      </p>

      {/* 🧭 SHELTER INFO NOTE */}
      <div className="mb-4 p-3 bg-green-50 border rounded text-sm">
        🧭 Nearest emergency shelters are marked on the map for quick evacuation guidance.
      </div>

      {/* 🌧️ WHAT‑IF + 🎬 TIMELAPSE */}
      <div className="mb-4 p-4 rounded border bg-blue-50">
        <p className="font-semibold mb-2">
          🌧️ Rainfall Simulation: <b>{simulatedRain} mm/hr</b>
        </p>

        <input
          type="range"
          min="0"
          max="50"
          value={simulatedRain}
          onChange={(e) => setSimulatedRain(Number(e.target.value))}
          className="w-full"
        />

        <button
          onClick={() => setPlaying(!playing)}
          className="btn btn-sm mt-3"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? " Pause Replay" : " Play Time‑lapse"}
        </button>
      </div>

      {/* 🗺️ MAP */}
      <div className="relative mb-6">
        <DelhiHotspotMap zones={simulatedZones} />
        <div className="absolute bottom-4 left-4 z-[1000]">
          <DelhiMapLegend />
        </div>
      </div>

      {/* 🔥 TOP‑5 HOTSPOTS */}
      <div className="mb-6 p-3 bg-red-50 border rounded">
        <h4 className="font-semibold mb-2">🚨 Highest Risk Right Now</h4>
        {topHotspots.map((z, i) => (
          <p key={i} className="text-sm">
            {i + 1}. <b>{z.zone_name}</b> — {z.risk_status} ({z.risk_score})
          </p>
        ))}
      </div>

      {/* 🚨 ZONE ACTION + ADVISORY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulatedZones.map((zone, i) => {
          const preparedness = Math.max(0, 100 - zone.risk_score)

          return (
            <div key={i} className="p-3 rounded border">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin size={14} /> {zone.zone_name}
              </h4>

              <p className="flex items-center gap-2">
                {getRiskIcon(zone.risk_status)}
                <b>{zone.risk_status}</b>
              </p>

              {/* 🚨 Travel Advisory */}
              {zone.risk_status !== "LOW" && (
                <p className="text-xs mt-1 text-red-600">
                  ⚠ Possible traffic disruption in this area
                </p>
              )}

              {/* 🧹 Authority Action */}
              <p className="text-xs mt-2 font-medium">
                {getActionText(zone.risk_status)}
              </p>

              {/* 🧠 Preparedness Score */}
              <p className="text-xs mt-1 text-gray-600">
                🧠 Preparedness: {preparedness}%
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
