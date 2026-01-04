"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import KedarnathDashboard from "../src/component/KedarnathDashboard"

// Lazy load Delhi panel
const DelhiPanel = dynamic(() => import("../src/component/DelhiPanel"), {
  ssr: false,
  loading: () => <p className="text-center">Loading Delhi Mode...</p>
})

export default function Page() {
  const [region, setRegion] = useState(null)

  /* ===============================
     🌍 FULL‑SCREEN REGION SELECT
     =============================== */
  if (!region) {
    return (
      <div className="h-screen w-screen flex">
        
        {/* 🏔 KEDARNATH */}
        <div
          className="relative w-1/2 h-full cursor-pointer group"
          onClick={() => setRegion("kedarnath")}
        >
          <img
            src="/images/kedarnath.jpg"
            alt="Kedarnath Floods"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition" />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Kedarnath Floods
            </h1>
            <p className="text-lg md:text-xl mb-6 max-w-md">
              AI‑driven river flood prediction, early warnings, and emergency response
            </p>
            <span className="px-6 py-3 border border-white rounded-full text-lg">
              Enter Dashboard →
            </span>
          </div>
        </div>

        {/* 🌧 DELHI */}
        <div
          className="relative w-1/2 h-full cursor-pointer group"
          onClick={() => setRegion("delhi")}
        >
          <img
            src="/images/delhi.jpg"
            alt="Delhi Water Logging"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition" />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Delhi Water‑Logging
            </h1>
            <p className="text-lg md:text-xl mb-6 max-w-md">
              Zone‑wise hotspot mapping with live & simulated rainfall scenarios
            </p>
            <span className="px-6 py-3 border border-white rounded-full text-lg">
              Enter Dashboard →
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ===============================
     🌧 DELHI DASHBOARD
     =============================== */
  if (region === "delhi") {
    return (
      <div className="container">
        <button
          className="btn btn-secondary mb-4"
          onClick={() => setRegion(null)}
        >
          ← Change Region
        </button>

        <DelhiPanel />
      </div>
    )
  }

  /* ===============================
     🏔 KEDARNATH DASHBOARD
     =============================== */
  return (
    <div className="container">
      <button
        className="btn btn-secondary mb-4"
        onClick={() => setRegion(null)}
      >
        ← Change Region
      </button>

      <KedarnathDashboard />
    </div>
  )
}
