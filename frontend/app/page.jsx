"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  Wifi,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CloudRain,
} from "lucide-react"
import KedarnathDashboard from "../src/component/KedarnathDashboard"

// Dynamic import for Delhi
const DelhiPanel = dynamic(() => import("../src/component/DelhiPanel"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center text-white">
      Loading Map Data...
    </div>
  ),
})

export default function Page() {
  const [region, setRegion] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [loadingText, setLoadingText] = useState("Initializing...")

  const handleRegionSelect = (selectedRegion) => {
    setIsConnecting(true)
    setLoadingText("Connecting to Satellite Feed...")

    setTimeout(() => setLoadingText("Syncing Sensor Data..."), 800)
    setTimeout(() => setLoadingText("Calibrating AI Models..."), 1600)

    setTimeout(() => {
      setRegion(selectedRegion)
      setIsConnecting(false)
    }, 2200)
  }

  const handleBack = () => setRegion(null)

  /* ================= LOADING OVERLAY ================= */
  if (isConnecting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          <h2 className="text-2xl font-bold">{loadingText}</h2>
          <p className="text-xs text-gray-400 font-mono">
            ESTABLISHING SECURE CONNECTION
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sky-100 text-slate-100">
      <AnimatePresence mode="wait">
        {/* ================= LANDING PAGE ================= */}
        {!region && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full min-h-screen"
          >
            <div className="max-w-7xl mx-auto px-6">
              {/* HEADER */}
              <header className="py-12 text-center relative">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-500/20 blur-[100px]" />

                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-mono">
                  <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  SYSTEM ONLINE
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-slate-900">
                  SatarkMitra Disaster Management
                </h1>

                <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                  Real-time satellite monitoring and predictive flood analytics
                  for high-risk zones.
                </p>

                <div className="flex justify-center gap-8 text-sm text-slate-400 border-y border-slate-800 py-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-green-500" />
                    Low Latency
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    98% Accuracy
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    Multi-Zone Active
                  </div>
                </div>
              </header>

              {/* REGION SELECTION */}
              <h2 className="text-3xl font-bold text-center mb-10">
                Select Monitoring Region
              </h2>

              {/* 🔥 SIDE-BY-SIDE GRID */}
              <main className="grid grid-cols-2 gap-8 pb-20">
                <RegionCard
                  title="Kedarnath Valley"
                  subtitle="River Flood Monitoring"
                  image="/images/kedarnath.jpg"
                  color="blue"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  onClick={() => handleRegionSelect("kedarnath")}
                />

                <RegionCard
                  title="Delhi NCR"
                  subtitle="Urban Water Logging"
                  image="/images/delhi.jpg"
                  color="purple"
                  icon={<CloudRain className="w-4 h-4" />}
                  onClick={() => handleRegionSelect("delhi")}
                />
              </main>
            </div>
          </motion.div>
        )}

        {/* ================= DASHBOARD ================= */}
        {region && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col"
          >
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                Regions
              </button>

              <span className="text-xs font-mono text-red-400">
                LIVE UPDATES
              </span>
            </div>

            <div className="flex-1">
              {region === "delhi" ? <DelhiPanel /> : <KedarnathDashboard />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================= REGION CARD ================= */
function RegionCard({ title, subtitle, image, color, icon, onClick }) {
  const isBlue = color === "blue"

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full h-full cursor-pointer overflow-hidden rounded-2xl border bg-slate-900 shadow-xl
        ${
          isBlue
            ? "border-blue-500/30 hover:border-blue-500"
            : "border-purple-500/30 hover:border-purple-500"
        }`}
    >
      <div className="relative h-56">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-sm mb-2 text-slate-400">
          {icon}
          {subtitle}
        </div>

        <h2 className="text-2xl font-bold mb-2">{title}</h2>

        <p className="text-slate-400 text-sm mb-4">
          AI-powered real-time monitoring and predictive flood analytics.
        </p>

        <button
          className={`w-full py-2.5 rounded-lg font-semibold text-white
            ${
              isBlue
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-purple-600 hover:bg-purple-500"
            }`}
        >
          Activate Monitoring
        </button>
      </div>
    </motion.div>
  )
}
