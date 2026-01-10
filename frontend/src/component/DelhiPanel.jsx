"use client"

import { useEffect, useRef, useState } from "react"
import {
  CloudRain,
  AlertTriangle,
  Check,
  MapPin,
  Play,
  Pause,
} from "lucide-react"
import dynamic from "next/dynamic"
import DelhiMapLegend from "./DelhiMapLegend"

const DelhiHotspotMap = dynamic(() => import("./DelhiHotspotMap"), { ssr: false })

export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(false)

  // 🌧️ Rainfall Simulation
  const [simulatedRain, setSimulatedRain] = useState(0)

  // 🎬 Time‑lapse
  const [playing, setPlaying] = useState(false)

  // 👤 / 🏛 View Mode
  const [viewMode, setViewMode] = useState("citizen")

  // 🗣 Citizen Reports
  const [reports, setReports] = useState([])
  const [reportText, setReportText] = useState("")
  const [reportLoading, setReportLoading] = useState(false)

  // 📍 Card scroll refs
  const cardRefs = useRef({})

  // 📅 Fake rainfall forecast (prototype)
  const forecast = [5, 12, 20, 35, 30]

  const fetchDelhiHotspots = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      if (!res.ok) throw new Error("Server error")
      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
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

  // 🔥 TOP‑5 HOTSPOTS
  const topHotspots = [...simulatedZones]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5)

  // 🏛 Authority Actions
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

  // ✅ Citizen report using GPS location
  const submitCitizenReport = () => {
    if (!reportText) return

    if (!navigator.geolocation) {
      alert("Location not supported on this device")
      return
    }

    setReportLoading(true)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords

        setReports((prev) => [
          ...prev,
          { lat: latitude, lng: longitude, note: reportText },
        ])

        setReportText("")
        setReportLoading(false)
      },
      () => {
        alert("Location permission denied. Please allow location access.")
        setReportLoading(false)
      }
    )
  }

  return (
    <div className="card max-w-6xl mx-auto p-4">

      {/* TITLE */}
      <h3 className="card-title flex gap-2 items-center mb-1">
        <CloudRain /> Delhi Water‑Logging Decision Dashboard
      </h3>

      {/* 👤 / 🏛 VIEW MODE */}
      <div className="mb-3 flex gap-2 text-xs">
        <span
          className={`px-3 py-1 rounded-full cursor-pointer ${
            viewMode === "citizen" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setViewMode("citizen")}
        >
          👤 Citizen View
        </span>

        <span
          className={`px-3 py-1 rounded-full cursor-pointer ${
            viewMode === "authority" ? "bg-red-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setViewMode("authority")}
        >
          🏛 Authority View
        </span>
      </div>

      {/* 📅 FORECAST MINI GRAPH */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">📅 Rainfall Trend (Next Hours)</h4>
        <div className="flex items-end gap-2 h-20">
          {forecast.map((v, i) => (
            <div
              key={i}
              style={{ height: `${v * 2}px` }}
              className="w-6 bg-blue-500 rounded"
              title={`${v} mm`}
            />
          ))}
        </div>
      </div>

      {/* 🗣 CITIZEN REPORT */}
      <div className="mb-6 p-3 border rounded bg-gray-50">
        <h4 className="font-semibold mb-2">🗣 Report Water‑Logging</h4>
        <input
          className="border p-2 text-sm w-full mb-2"
          placeholder="Describe location (near metro, market, road name...)"
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
        />
        <button
          className="btn btn-sm"
          disabled={reportLoading}
          onClick={submitCitizenReport}
        >
          {reportLoading ? "Detecting location..." : "Submit Report"}
        </button>
      </div>

      {/* 🌧️ RAIN SIMULATION */}
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
        <DelhiHotspotMap
          zones={simulatedZones}
          reports={reports}
          onZoneClick={(name) => {
            cardRefs.current[name]?.scrollIntoView({ behavior: "smooth" })
          }}
        />
        <div className="absolute bottom-4 left-4 z-[1000]">
          <DelhiMapLegend />
        </div>
      </div>

      {/* 🔥 TOP‑5 */}
      <div className="mb-6 p-3 bg-red-50 border rounded">
        <h4 className="font-semibold mb-2">🚨 Highest Risk Right Now</h4>
        {topHotspots.map((z, i) => (
          <p key={i} className="text-sm">
            {i + 1}. <b>{z.zone_name}</b> — {z.risk_status} ({z.risk_score})
          </p>
        ))}
      </div>

      {/* 🚨 ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulatedZones.map((zone, i) => {
          const preparedness = Math.max(0, 100 - zone.risk_score)

          return (
            <div
              key={i}
              ref={(el) => (cardRefs.current[zone.zone_name] = el)}
              className="p-3 rounded border"
            >
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin size={14} /> {zone.zone_name}
              </h4>

              <p className="flex items-center gap-2">
                {getRiskIcon(zone.risk_status)}
                <b>{zone.risk_status}</b>
              </p>

              {/* 🚗 Travel Advisory */}
              {zone.risk_status !== "LOW" && (
                <p className="text-xs mt-1 text-red-600">
                  ⚠ Possible traffic disruption in this area
                </p>
              )}

              {/* 🏛 Authority Action */}
              {viewMode === "authority" && (
                <p className="text-xs mt-2 font-medium">
                  {getActionText(zone.risk_status)}
                </p>
              )}

              {/* 🧠 Preparedness */}
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
