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
} from "lucide-react"
import dynamic from "next/dynamic"
import DelhiMapLegend from "./DelhiMapLegend"

const DelhiHotspotMap = dynamic(() => import("./DelhiHotspotMap"), {
  ssr: false,
})

export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [cityWeather, setCityWeather] = useState(null)
  const [loading, setLoading] = useState(false)

  // 🔥 Rainfall Simulation
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

        if (data.city_weather?.rain_1h) {
          setSimulatedRain(data.city_weather.rain_1h)
        }
      }
    } catch {
      console.error("Backend unreachable")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDelhiHotspots()
  }, [])

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

  const sortedZones = [...simulatedZones].sort(
    (a, b) => b.risk_score - a.risk_score
  )

  const getRiskColor = (status) => {
    if (status === "CRITICAL")
      return "border-l-4 border-red-500 bg-red-50/80"
    if (status === "HIGH") return "border-l-4 border-orange-400 bg-orange-50/80"
    if (status === "MODERATE")
      return "border-l-4 border-yellow-400 bg-yellow-50/80"
    return "border-l-4 border-green-400 bg-green-50/80"
  }

  const getRiskBadgeColor = (status) => {
    if (status === "CRITICAL") return "bg-red-100 text-red-700"
    if (status === "HIGH") return "bg-orange-100 text-orange-700"
    if (status === "MODERATE") return "bg-yellow-100 text-yellow-700"
    return "bg-green-100 text-green-700"
  }

  const formatTemp = (t) =>
    t !== null && t !== undefined ? `${t.toFixed(1)}°C` : "N/A"

  const formatRain = (r) =>
    r !== null && r !== undefined ? `${r.toFixed(1)} mm` : "0.0 mm"

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top strip: title + weather + simulation controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Delhi Flood Vulnerability
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time zone vulnerability with rainfall simulation
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* City weather summary */}
          <div className="flex items-center gap-2 rounded-lg border bg-white/60 px-3 py-2 shadow-sm">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <div className="text-xs leading-tight">
              <p className="font-medium text-xs">
                {cityWeather?.city ?? "Delhi"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Temp: {formatTemp(cityWeather?.temp)} • Humidity:{" "}
                {cityWeather?.humidity ?? "N/A"}%
              </p>
            </div>
          </div>

          {/* Rainfall + simulation */}
          <div className="flex items-center gap-2 rounded-lg border bg-white/60 px-3 py-2 shadow-sm">
            <CloudRain className="h-4 w-4 text-blue-500" />
            <div className="text-xs leading-tight">
              <p className="font-medium text-xs">
                Rain (1h): {formatRain(cityWeather?.rain_1h)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Simulation: {simulatedRain.toFixed(1)} mm
              </p>
            </div>

            <button
              onClick={() => setPlaying((p) => !p)}
              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              {playing ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] h-[calc(100vh-220px)]">
        {/* Left: Map + legend */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white/60 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-medium">
                City-wide flood hotspots
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Markers sized by risk level
            </span>
          </div>

          <div className="relative flex-1 min-h-[260px] rounded-lg overflow-hidden border bg-slate-50">
            <DelhiHotspotMap zones={simulatedZones} />
          </div>

          <div className="mt-1">
            <DelhiMapLegend />
          </div>
        </div>

        {/* Right: Hotspot cards */}
        <div className="flex flex-col gap-3 rounded-xl border bg-white/60 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Top vulnerable zones</h3>
            <span className="text-[11px] text-muted-foreground">
              Sorted by simulated risk score
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                Loading Delhi zones…
              </div>
            )}

            {!loading && sortedZones.length === 0 && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                No zones data available.
              </div>
            )}

            {!loading &&
              sortedZones.map((zone) => {
                const riskStatus = zone.risk_status || "LOW"
                const details = zone.details || {}

                return (
                  <div
                    key={zone.zone_name}
                    className={`flex flex-col gap-2 rounded-lg border bg-white/80 px-3 py-2 shadow-xs hover:shadow-sm transition ${getRiskColor(
                      riskStatus
                    )}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {zone.zone_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Elev: {details.elevation ?? "N/A"} m • Drainage:{" "}
                          {details.drainage ?? "Unknown"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-medium ${getRiskBadgeColor(
                            riskStatus
                          )}`}
                        >
                          {riskStatus === "LOW" ? (
                            <Check className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {riskStatus}
                        </span>
                        <span className="text-[11px] text-slate-700">
                          Score:{" "}
                          <span className="font-semibold">
                            {zone.risk_score}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Secondary row */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {zone.rain_intensity && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-[2px] text-[11px] text-blue-700">
                          <Droplets className="h-3 w-3" />
                          {zone.rain_intensity}
                        </span>
                      )}
                      {zone.notes && (
                        <span className="truncate max-w-full">
                          {zone.notes}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
