"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import KedarnathDashboard from "../src/component/KedarnathDashboard"

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
        
        {/* 🔥 HEADING */}
        <div className="h-[12vh] flex items-center justify-center border-b">
          <h1 className="text-4xl font-bold">
            Disaster Management System
          </h1>
        </div>

        {/* 🔥 SPLIT SECTIONS */}
        <div className="h-[88vh] flex">

          {/* 🏔 KEDARNATH */}
          <div
            onClick={() => setRegion("kedarnath")}
            className="relative w-1/2 h-full cursor-pointer group overflow-hidden"
          >
            <img
              src="/images/kedarnath.jpg"
              alt="Kedarnath Floods"
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6">
              <h2 className="text-4xl font-bold mb-3">
                Kedarnath Floods
              </h2>
              <p className="text-lg max-w-md mb-6">
                AI‑driven river flood prediction, early warnings & emergency response
              </p>
              <span className="px-6 py-3 border border-white rounded-full">
                Enter Dashboard →
              </span>
            </div>
          </div>

          {/* 🌧 DELHI */}
          <div
            onClick={() => setRegion("delhi")}
            className="relative w-1/2 h-full cursor-pointer group overflow-hidden"
          >
            <img
              src="/images/delhi.jpg"
              alt="Delhi Water Logging"
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-6">
              <h2 className="text-4xl font-bold mb-3">
                Delhi Water‑Logging
              </h2>
              <p className="text-lg max-w-md mb-6">
                Zone‑wise hotspot mapping with live & simulated rainfall scenarios
              </p>
              <span className="px-6 py-3 border border-white rounded-full">
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
        <button className="btn btn-secondary mb-4" onClick={() => setRegion(null)}>
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
      <button className="btn btn-secondary mb-4" onClick={() => setRegion(null)}>
        ← Change Region
      </button>
      <KedarnathDashboard />
    </div>
  )
}
