"use client"

import { useEffect, useState } from "react"
import {
  CloudRain,
  AlertTriangle,
  Check,
  MapPin
} from "lucide-react"
import dynamic from "next/dynamic"

const DelhiHotspotMap = dynamic(
  () => import("./DelhiHotspotMap"),
  { ssr: false }
)



export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [cityWeather, setCityWeather] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchDelhiHotspots = async () => {
    setLoading(true)

    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      if (!res.ok) throw new Error("Server error")

      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
        setCityWeather(data.city_weather || null)
      } else {
        alert(data.message)
      }
    } catch (err) {
      alert("Backend not reachable")
    }

    setLoading(false)
  }

  // Auto‑fetch on component load
  useEffect(() => {
    fetchDelhiHotspots()
  }, [])

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
    <div className="card max-w-4xl mx-auto p-4">
      <h3 className="card-title flex gap-2 items-center mb-2">
        <CloudRain /> Delhi Water‑Logging Hotspot Monitor
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Zone‑wise flood risk based on live rainfall and infrastructure vulnerability
      </p>

      {/* 🔹 CITY WEATHER SUMMARY */}
      {cityWeather && (
        <div className="mb-4 p-3 rounded border bg-gray-50">
          <p>
            <b>Current Weather:</b> {cityWeather.description}
          </p>
          <p>
            <b>Rain (last 1h):</b> {cityWeather.rain_1h} mm
          </p>
          <p>
            <b>Temperature:</b> {cityWeather.temperature} °C &nbsp;|&nbsp;
            <b>Humidity:</b> {cityWeather.humidity} %
          </p>
        </div>
      )}

      {/* 🔹 GIS HOTSPOT MAP */}
      {zones.length > 0 && (
        <div className="my-6">
          <h4 className="font-semibold mb-2">
            🗺️ Delhi Water‑Logging Hotspot Map
          </h4>
          <DelhiHotspotMap zones={zones} />
        </div>
      )}



      {/* 🔹 REFRESH BUTTON */}
      <button
        onClick={fetchDelhiHotspots}
        disabled={loading}
        className="btn btn-primary mb-4"
      >
        {loading ? "Updating..." : "Refresh Hotspot Risk"}
      </button>

      {/* 🔹 ZONE LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map((zone, index) => (
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

      {zones.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-4">
          No hotspot data available.
        </p>
      )}
    </div>
  )
}
