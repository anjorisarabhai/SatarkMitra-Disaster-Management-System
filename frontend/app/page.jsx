"use client"

import { useState } from "react"
import dynamic from "next/dynamic"

// lazy load delhi
const DelhiPanel = dynamic(() => import("../src/component/DelhiPanel"), {
  ssr: false,
  loading: () => <p className="text-center">Loading Delhi Mode...</p>
})

// import original kedarnath dashboard
import KedarnathDashboard from "../src/component/KedarnathDashboard"

export default function Page() {
  const [region, setRegion] = useState(null)

  /* ---------- REGION SELECT ---------- */
  if (!region) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Select Disaster Region</h1>

        <div className="flex gap-6">
          <button
            className="btn btn-primary px-8 py-4"
            onClick={() => setRegion("kedarnath")}
          >
            🏔 Kedarnath (Floods)
          </button>

          <button
            className="btn btn-primary px-8 py-4"
            onClick={() => setRegion("delhi")}
          >
            🌧 Delhi (Water‑Logging)
          </button>
        </div>
      </div>
    )
  }

  /* ---------- DELHI ---------- */
  if (region === "delhi") {
    return (
      <div className="container">
        <button className="btn btn-secondary mb-4" onClick={() => setRegion(null)}>
          ← Change Region
        </button>

        <DelhiPanel />
      </div>
    )
  }

  /* ---------- KEDARNATH (FULL ORIGINAL CODE) ---------- */
  return (
    <div className="container">
      <button className="btn btn-secondary mb-4" onClick={() => setRegion(null)}>
        ← Change Region
      </button>

      <KedarnathDashboard />
    </div>
  )
}
