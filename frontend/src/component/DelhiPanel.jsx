"use client"
import { useState } from "react"
import { CloudRain, AlertTriangle, Check } from "lucide-react"

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

      const data = await res.json()
      if (data.status === "success") setResult(data)
      else alert(data.message)

    } catch (e) {
      alert("Backend not reachable")
    }

    setLoading(false)
  }

  return (
    <div className="card max-w-xl mx-auto">
      <h3 className="card-title flex gap-2">
        <CloudRain /> Delhi Water‑Logging Risk
      </h3>

      <input
        type="number"
        placeholder="Drainage Capacity"
        value={drainage}
        onChange={e => setDrainage(e.target.value)}
      />

      <input
        type="number"
        placeholder="Elevation (m)"
        value={elevation}
        onChange={e => setElevation(e.target.value)}
      />

      <button onClick={runDelhiPrediction} disabled={loading}>
        {loading ? "Analyzing..." : "Check Risk"}
      </button>

      {result && (
        <div className="mt-4">
          <h4>
            {result.water_logging_risk === "CRITICAL"
              ? <AlertTriangle className="text-red-500" />
              : <Check className="text-green-500" />
            }
            {result.water_logging_risk} RISK
          </h4>

          <p>Risk Score: {result.risk_score}</p>
          <p>Rain (last 1h): {result.details.live_rain_1h} mm</p>
          <p>Weather: {result.details.weather}</p>
        </div>
      )}
    </div>
  )
}