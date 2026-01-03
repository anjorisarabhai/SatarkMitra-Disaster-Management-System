"use client"

import { useEffect, useState } from "react"
import {
  CloudRain,
  AlertTriangle,
  Check,
  MapPin
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

  // 🔥 USP: Rainfall Simulation Slider
  const [simulatedRain, setSimulatedRain] = useState(0)

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

  // 🔮 Apply rainfall simulation on frontend
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

  const getRiskIcon = (status) => {
    if (status === "CRITICAL") return <AlertTriangle className="text-red-600" />
    if (status === "HIGH") return <AlertTriangle className="text-orange-500" />
    if (status === "MODERATE") return <AlertTriangle className="text-yellow-500" />
    return <Check className="text-green-600" />
  }

  const getRiskColor = (status) => {
    if (status === "CRITICAL") return "border-red-500 bg-red-50"
    if (status === "HIGH") return "border-orange-400 bg-orange-50"
    if (status === "MODERATE") return "border-yellow-400 bg-yellow-50"
    return "border-green-400 bg-green-50"
  }

  return (
    <div className="card max-w-5xl mx-auto p-4">
      <h3 className="card-title flex gap-2 items-center mb-1">
        <CloudRain /> Delhi Water‑Logging Hotspot Monitor
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Zone‑wise risk assessment with rainfall scenario simulation
      </p>

      {/* 🌧️ WHAT‑IF RAINFALL SLIDER (USP) */}
      <div className="mb-4 p-4 rounded border bg-blue-50">
        <p className="font-semibold mb-2">
          🌧️ Simulate Rainfall: <b>{simulatedRain} mm/hr</b>
        </p>
        <input
          type="range"
          min="0"
          max="50"
          value={simulatedRain}
          onChange={(e) => setSimulatedRain(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-600 mt-1">
          See how hotspot risks escalate during heavy rainfall
        </p>
      </div>

      {/* 🗺️ MAP + LEGEND */}
      <div className="relative mb-6">
        <DelhiHotspotMap zones={simulatedZones} />

        <div className="absolute bottom-4 left-4 z-[1000]">
          <DelhiMapLegend />
        </div>
      </div>

      {/* 🔄 REFRESH */}
      <button
        onClick={fetchDelhiHotspots}
        disabled={loading}
        className="btn btn-primary mb-4"
      >
        {loading ? "Updating..." : "Refresh Live Data"}
      </button>

      {/* 📍 ZONE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulatedZones.map((zone, index) => (
          <div
            key={index}
            className={`p-4 rounded border-l-4 ${getRiskColor(zone.risk_status)}`}
          >
            <h4 className="flex items-center gap-2 font-semibold mb-1">
              <MapPin size={16} />
              {zone.zone_name}
            </h4>

            <p className="flex items-center gap-2">
              {getRiskIcon(zone.risk_status)}
              <b>{zone.risk_status} RISK</b>
            </p>

            <p>Risk Score: <b>{zone.risk_score}</b></p>

            <p className="text-sm text-gray-600 mt-1">
              Elevation: {zone.details.elevation} m<br />
              Drainage: {zone.details.drainage}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
