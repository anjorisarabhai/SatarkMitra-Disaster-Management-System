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
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        
        {/* HEADING */}
        <div className="flex-shrink-0 h-[15vh] flex items-center justify-center border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
              Disaster Management System
            </h1>
            <p className="text-slate-300 text-lg">Real-time monitoring & AI-powered predictions</p>
          </div>
        </div>

        {/* SPLIT SECTIONS */}
        <div className="flex-1 flex min-h-0">

          {/* 🏔 KEDARNATH */}
          <div
            onClick={() => setRegion("kedarnath")}
            className="relative flex-1 cursor-pointer group overflow-hidden transition-all duration-500 hover:flex-[1.05]"
            style={{ minWidth: 0 }}
          >
            <img
              src="/images/kedarnath.jpg"
              alt="Kedarnath Floods"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 group-hover:from-black/70 group-hover:via-black/40 group-hover:to-black/20 transition-all duration-500" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-8">
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-blue-400/30">
                <span className="text-blue-300 text-sm font-semibold">RIVER FLOOD MONITORING</span>
              </div>
              
              <h2 className="text-5xl font-bold mb-4 tracking-tight drop-shadow-lg flex items-center gap-3">
                Kedarnath Floods
                <svg className="w-10 h-10 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </h2>
              
              <p className="text-xl max-w-md text-slate-200 leading-relaxed">
                AI-driven river flood prediction, early warnings & emergency response
              </p>
            </div>
          </div>

          {/* 🌧 DELHI */}
          <div
            onClick={() => setRegion("delhi")}
            className="relative flex-1 cursor-pointer group overflow-hidden border-l-2 border-slate-700/50 transition-all duration-500 hover:flex-[1.05]"
            style={{ minWidth: 0 }}
          >
            <img
              src="/images/delhi.jpg"
              alt="Delhi Water Logging"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 group-hover:from-black/70 group-hover:via-black/40 group-hover:to-black/20 transition-all duration-500" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white text-center px-8">
              <div className="bg-purple-500/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4 border border-purple-400/30">
                <span className="text-purple-300 text-sm font-semibold">URBAN FLOOD TRACKING</span>
              </div>
              
              <h2 className="text-5xl font-bold mb-4 tracking-tight drop-shadow-lg flex items-center gap-3">
                Delhi Water-Logging
                <svg className="w-10 h-10 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </h2>
              
              <p className="text-xl max-w-md text-slate-200 leading-relaxed">
                Zone-wise hotspot mapping with live & simulated rainfall scenarios
              </p>
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