"use client"
import { useState } from "react"
import {
  CloudRain,
  AlertTriangle,
  Check,
  Thermometer,
  Droplets
} from "lucide-react"

export default function DelhiPanel() {
  const [drainage, setDrainage] = useState(50)
  const [elevation, setElevation] = useState(210)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDelhiPrediction = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drainage_capacity: drainage,
          elevation: elevation
        })
      })

      if (!res.ok) throw new Error("Server error")

      const data = await res.json()
      if (data.status === "success") setResult(data)
      else alert(data.message)
    } catch {
      alert("Backend not reachable")
    }

    setLoading(false)
  }

  return (
    <div className="card max-w-xl mx-auto p-4">
      <h3 className="card-title flex gap-2 items-center mb-4">
        <CloudRain /> Delhi Water‑Logging Risk
      </h3>

      {/* 🔹 INPUT SECTION */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Drainage Capacity
          </label>
          <input
            type="number"
            value={drainage}
            onChange={e => setDrainage(Number(e.target.value))}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Elevation (meters)
          </label>
          <input
            type="number"
            value={elevation}
            onChange={e => setElevation(Number(e.target.value))}
            className="input w-full"
          />
        </div>
      </div>

      <button
        onClick={runDelhiPrediction}
        disabled={loading}
        className="btn btn-primary mt-4 w-full"
      >
        {loading ? "Analyzing..." : "Check Risk"}
      </button>

      {result && (
        <div className="mt-4 space-y-2">
          <h4 className="flex items-center gap-2 font-semibold">
            {result.water_logging_risk === "CRITICAL"
              ? <AlertTriangle className="text-red-500" />
              : <Check className="text-green-500" />
            }
            {result.water_logging_risk} RISK
          </h4>

          <p>Risk Score: <b>{result.risk_score}</b></p>

          <p>
            Rain (last 1h): <b>{result.details?.live_rain_1h ?? 0} mm</b>
          </p>

          <p>
            Weather: <b>{result.details?.weather ?? "Unavailable"}</b>
          </p>

          <hr />

          <p className="flex items-center gap-2">
            <Thermometer size={16} />
            Temperature:{" "}
            <b>
              {result.live_weather?.temperature != null
                ? `${result.live_weather.temperature} °C`
                : "N/A"}
            </b>
          </p>

          <p className="flex items-center gap-2">
            <Droplets size={16} />
            Humidity:{" "}
            <b>
              {result.live_weather?.humidity != null
                ? `${result.live_weather.humidity} %`
                : "N/A"}
            </b>
          </p>
        </div>
      )}
    </div>
  )
}
