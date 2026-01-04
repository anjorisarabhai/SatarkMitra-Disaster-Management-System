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
      <div className="h-screen w-screen flex flex-col">
        
        {/* 🔰 TOP HEADING */}
        <div className="h-[15vh] flex items-center justify-center bg-black text-white">
          <h1 className="text-4xl md:text-5xl font-bold tracking-wide">
            Disaster Management System
          </h1>
        </div>

        {/* 🔲 IMAGE SECTIONS (50% / 50%) */}
        <div className="flex flex-1">

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

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-all duration-300" />

            {/* Text */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6">
              <h2 className="text-4xl font-bold mb-3">
                Kedarnath Floods
              </h2>
              <p className="text-lg mb-6 max-w-md">
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

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-all duration-300" />

            {/* Text */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6">
              <h2 className="text-4xl font-bold mb-3">
                Delhi Water‑Logging
              </h2>
              <p className="text-lg mb-6 max-w-md">
                Zone‑wise hotspot mapping with live & simulated rainfall scenarios
              </p>
              <span className="px-6 py-3 border border-white rounded-full text-lg">
                Enter Dashboard →
              </span>
            </div>
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
