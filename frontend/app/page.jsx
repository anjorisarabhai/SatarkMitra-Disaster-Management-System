"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Wifi, MapPin, ArrowLeft, Loader2, AlertTriangle, CloudRain } from "lucide-react"
import KedarnathDashboard from "../src/component/KedarnathDashboard"

// Dynamic import for Delhi to keep initial load fast
const DelhiPanel = dynamic(() => import("../src/component/DelhiPanel"), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center text-white">Loading Map Data...</div>
})

export default function Page() {
  const [region, setRegion] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [loadingText, setLoadingText] = useState("Initializing...")

  // Mock function to simulate "Connecting to Satellite" delay
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

  const handleBack = () => {
    setRegion(null)
  }

  /* ===============================
      LOADING OVERLAY (Hackathon "Wow" Factor)
     =============================== */
  if (isConnecting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
          <h2 className="text-2xl font-bold tracking-widest">{loadingText}</h2>
          <p className="text-sm text-gray-400 font-mono">ESTABLISHING SECURE CONNECTION</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        
        {/* ================= LANDING PAGE ================= */}
        {!region && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full flex flex-col items-center"
          >
            {/* HEADER */}
            <header className="w-full max-w-7xl px-6 py-12 text-center relative">
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
              
              <motion.div 
                initial={{ scale: 0.9 }} 
                animate={{ scale: 1 }} 
                className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-mono"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                SYSTEM ONLINE
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                Disaster Response AI
              </h1>

              <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
                Real-time satellite monitoring and predictive flood analytics for high-risk zones.
              </p>

              {/* STATUS BAR */}
              <div className="flex justify-center gap-8 text-sm text-slate-400 font-medium border-y border-slate-800 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span>Low Latency</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>98% Accuracy</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <span>Multi-Zone Active</span>
                </div>
              </div>
            </header>

            {/* CARDS GRID */}
            <main className="w-full max-w-7xl px-6 pb-20 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* KEDARNATH CARD */}
              <RegionCard 
                title="Kedarnath Valley"
                subtitle="River Flood Monitoring"
                image="/images/kedarnath.jpg"
                color="blue"
                icon={<AlertTriangle className="w-5 h-5" />}
                onClick={() => handleRegionSelect("kedarnath")}
              />

              {/* DELHI CARD */}
              <RegionCard 
                title="Delhi NCR"
                subtitle="Urban Water Logging"
                image="/images/delhi.jpg"
                color="purple"
                icon={<CloudRain className="w-5 h-5" />}
                onClick={() => handleRegionSelect("delhi")}
              />

            </main>
          </motion.div>
        )}

        {/* ================= DASHBOARD VIEW ================= */}
        {region && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen flex flex-col"
          >
            {/* DASHBOARD NAVBAR */}
            <div className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Regions</span>
                </button>
                <div className="h-6 w-px bg-slate-800" />
                <h2 className="font-bold text-lg capitalize flex items-center gap-2">
                  {region === 'kedarnath' ? '🏔️ Kedarnath' : '🏙️ Delhi'} Live Feed
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                 <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-xs font-mono text-red-400">LIVE UPDATES</span>
              </div>
            </div>

            {/* COMPONENT RENDER */}
            <div className="flex-1 relative">
               {region === "delhi" ? <DelhiPanel /> : <KedarnathDashboard />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ===============================
   REUSABLE CARD COMPONENT
   =============================== */
function RegionCard({ title, subtitle, image, color, icon, onClick }) {
  const isBlue = color === "blue"
  
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl cursor-pointer border border-slate-800 bg-slate-900 shadow-2xl transition-all duration-300
        ${isBlue ? 'hover:shadow-blue-500/20 hover:border-blue-500/50' : 'hover:shadow-purple-500/20 hover:border-purple-500/50'}
      `}
    >
      {/* Background Image with Gradient Overlay */}
      <div className="relative h-64 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10 transition-opacity duration-300 group-hover:opacity-80`} />
        <motion.img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Floating Badge */}
        <div className="absolute top-4 left-4 z-20">
          <div className="backdrop-blur-md bg-black/40 border border-white/10 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
            {icon}
            {subtitle}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-20 p-6 -mt-12">
        <div className="flex items-center gap-2 mb-2 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
           <span className={`h-2 w-2 rounded-full ${isBlue ? 'bg-blue-400' : 'bg-purple-400'} animate-pulse`}></span>
           <span className={`text-xs font-bold uppercase tracking-wider ${isBlue ? 'text-blue-400' : 'text-purple-400'}`}>
             Active Monitoring
           </span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-colors">
          {title}
        </h2>
        
        <p className="text-slate-400 text-sm mb-6 line-clamp-2">
          Deploy AI predictive models to analyze sensor data from {title} region. Tap to initialize dashboard.
        </p>

        <button className={`w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2
          ${isBlue 
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'}
        `}>
          Initialize Dashboard <ArrowLeft className="rotate-180 w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}