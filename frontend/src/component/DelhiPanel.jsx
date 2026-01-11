"use client"

import { useEffect, useRef, useState } from "react"
import {
  CloudRain,
  AlertTriangle,
  Check,
  MapPin,
  Play,
  Pause,
  Send,
  Map,
  Gauge,
  MessageSquarePlus,
  LayoutGrid,
  TrendingUp,
  Shield,
  Droplets,
  Building2,
  Users,
  Radio,
} from "lucide-react"
import dynamic from "next/dynamic"
import DelhiMapLegend from "./DelhiMapLegend"

const DelhiHotspotMap = dynamic(() => import("./DelhiHotspotMap"), { ssr: false })

export default function DelhiPanel() {
  const [zones, setZones] = useState([])
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [simulatedRain, setSimulatedRain] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [viewMode, setViewMode] = useState("citizen")
  const [reports, setReports] = useState([])
  const [reportText, setReportText] = useState("")
  const [reportLoading, setReportLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const cardRefs = useRef({})

  const forecast = [
    { hour: "Now", value: 5 },
    { hour: "+1h", value: 12 },
    { hour: "+2h", value: 20 },
    { hour: "+3h", value: 35 },
    { hour: "+4h", value: 30 },
  ]

  const tabs = [
    { id: "map", label: "Map View", icon: Map },
    { id: "simulation", label: "Simulation", icon: Gauge },
    { id: "report", label: "Report", icon: MessageSquarePlus },
    { id: "zones", label: "All Zones", icon: LayoutGrid },
  ]

  const fetchDelhiHotspots = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict_delhi")
      if (!res.ok) throw new Error("Server error")
      const data = await res.json()
      if (data.status === "success") {
        setZones(data.zones_data || [])
        setWeather(data.city_weather || null) 
      }
    } catch {
      setZones([
        {
          zone_name: "Rohini Sector 15",
          latitude: 28.7341,
          longitude: 77.1025,
          risk_score: 75,
          risk_status: "CRITICAL",
          details: { elevation: 215, drainage: "Poor" },
        },
        {
          zone_name: "Dwarka Sector 21",
          latitude: 28.5535,
          longitude: 77.0588,
          risk_score: 55,
          risk_status: "HIGH",
          details: { elevation: 220, drainage: "Moderate" },
        },
        {
          zone_name: "Connaught Place",
          latitude: 28.6315,
          longitude: 77.2167,
          risk_score: 35,
          risk_status: "MODERATE",
          details: { elevation: 216, drainage: "Good" },
        },
        {
          zone_name: "Lajpat Nagar",
          latitude: 28.5677,
          longitude: 77.2433,
          risk_score: 45,
          risk_status: "HIGH",
          details: { elevation: 214, drainage: "Moderate" },
        },
        {
          zone_name: "Karol Bagh",
          latitude: 28.6514,
          longitude: 77.1906,
          risk_score: 25,
          risk_status: "MODERATE",
          details: { elevation: 218, drainage: "Good" },
        },
        {
          zone_name: "Saket",
          latitude: 28.5244,
          longitude: 77.2066,
          risk_score: 15,
          risk_status: "LOW",
          details: { elevation: 222, drainage: "Good" },
        },
        {
          zone_name: "Janakpuri",
          latitude: 28.6219,
          longitude: 77.0878,
          risk_score: 65,
          risk_status: "HIGH",
          details: { elevation: 212, drainage: "Poor" },
        },
        {
          zone_name: "Pitampura",
          latitude: 28.6969,
          longitude: 77.1315,
          risk_score: 40,
          risk_status: "MODERATE",
          details: { elevation: 217, drainage: "Moderate" },
        },
      ])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDelhiHotspots()
  }, [])

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setSimulatedRain((prev) => (prev >= 50 ? 0 : prev + 5))
    }, 800)
    return () => clearInterval(interval)
  }, [playing])

  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords

        try {
          const res = await fetch(
            `http://127.0.0.1:8000/api/weather_by_location?lat=${latitude}&lon=${longitude}`
          )
          const data = await res.json()
          if (data.status === "success") {
            setWeather(data.weather)
          }
        } catch (err) {
          console.error("Weather fetch failed", err)
        }
      },
      () => {
        console.warn("Location permission denied")
      }
    )
  }, [])


  const applyRainSimulation = (zone) => {
    let score = zone.risk_score
    if (simulatedRain > 40) score += 40
    else if (simulatedRain > 25) score += 25
    else if (simulatedRain > 10) score += 10

    let status = "LOW"
    if (score >= 70) status = "CRITICAL"
    else if (score >= 40) status = "HIGH"
    else if (score >= 20) status = "MODERATE"

    return { ...zone, risk_score: Math.min(score, 100), risk_status: status }
  }

  const simulatedZones = zones.map(applyRainSimulation)
  const topHotspots = [...simulatedZones].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5)

  const getActionText = (risk) => {
    if (risk === "CRITICAL") return "Emergency response required"
    if (risk === "HIGH") return "Deploy pumps & drain cleanup"
    if (risk === "MODERATE") return "Inspect drainage systems"
    return "Monitoring only"
  }
  const getTravelCaution = (risk) => {
  if (risk === "CRITICAL") return "🚫 Avoid travel. Severe water-logging expected."
  if (risk === "HIGH") return "⚠️ Travel only if necessary. Expect disruptions."
  if (risk === "MODERATE") return "🟡 Delays possible. Drive with caution."
  return "✅ Safe for travel."
  }


  const getBadgeStyles = (status) => {
    const styles = {
      CRITICAL: "bg-red-100 text-red-700 border border-red-200",
      HIGH: "bg-orange-100 text-orange-700 border border-orange-200",
      MODERATE: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      LOW: "bg-green-100 text-green-700 border border-green-200",
    }
    return styles[status] || styles.LOW
  }

  const getRiskIcon = (status) => {
    if (status === "CRITICAL") return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (status === "HIGH") return <AlertTriangle className="w-4 h-4 text-orange-500" />
    if (status === "MODERATE") return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <Check className="w-4 h-4 text-green-500" />
  }

  const getZoneCardStyles = (status) => {
    const styles = {
      CRITICAL: "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white",
      HIGH: "border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white",
      MODERATE: "border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white",
      LOW: "border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white",
    }
    return styles[status] || styles.LOW
  }

  const getProgressBarColor = (status) => {
    const colors = {
      CRITICAL: "bg-red-500",
      HIGH: "bg-orange-500",
      MODERATE: "bg-yellow-500",
      LOW: "bg-green-500",
    }
    return colors[status] || colors.LOW
  }

  const submitCitizenReport = () => {
    if (!reportText) return
    if (!navigator.geolocation) {
      alert("Location not supported on this device")
      return
    }
    setReportLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setReports((prev) => [...prev, { lat: latitude, lng: longitude, note: reportText }])
        setReportText("")
        setReportLoading(false)
      },
      () => {
        alert("Location permission denied. Please allow location access.")
        setReportLoading(false)
      },
    )
  }

  const criticalCount = simulatedZones.filter((z) => z.risk_status === "CRITICAL").length
  const highCount = simulatedZones.filter((z) => z.risk_status === "HIGH").length
  const moderateCount = simulatedZones.filter((z) => z.risk_status === "MODERATE").length
  const lowCount = simulatedZones.filter((z) => z.risk_status === "LOW").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Delhi Water-Logging Dashboard</h1>
              <p className="text-sm text-slate-500">Real-time flood risk monitoring & decision support</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setViewMode("citizen")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === "citizen" ? "bg-white text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              Citizen
            </button>
            <button
              onClick={() => setViewMode("authority")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === "authority" ? "bg-white text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Authority
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Critical</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">High Risk</p>
                <p className="text-3xl font-bold text-orange-600">{highCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Moderate</p>
                <p className="text-3xl font-bold text-yellow-600">{moderateCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Gauge className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Low Risk</p>
                <p className="text-3xl font-bold text-green-600">{lowCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Weather Info */}
        {weather && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Weather</p>
              <p className="text-lg font-semibold text-slate-800 capitalize">
                {weather.description}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Rain (last 1h)</p>
              <p className="text-2xl font-bold text-blue-600">
                {weather.rain_1h} mm
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Temperature</p>
              <p className="text-2xl font-bold text-orange-600">
                {weather.temperature} °C
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <p className="text-xs font-medium text-slate-500">Humidity</p>
              <p className="text-2xl font-bold text-purple-600">
                {weather.humidity} %
              </p>
            </div>
          </div>
        )}


        {/* Tabs Navigation */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-2xl p-2 shadow-md border border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-7 py-3 rounded-xl text-base font-semibold
                  transition-all duration-300 ease-out
                  ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg scale-105"
                      : "text-slate-700 hover:bg-slate-100 hover:scale-[1.02]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>


        {/* Tab Content */}
        <div className="animate-in fade-in duration-300">
          {/* MAP TAB */}
          {activeTab === "map" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Map className="w-5 h-5 text-blue-500" />
                        Live Hotspot Map
                      </h2>
                      <p className="text-sm text-slate-500">Click on markers for details</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                      <Radio className="w-3.5 h-3.5 text-green-600 animate-pulse" />
                      <span className="text-xs font-medium text-green-700">Live</span>
                    </div>
                  </div>
                  <div className="relative h-[500px]">
                    <DelhiHotspotMap
                      zones={simulatedZones}
                      reports={reports}
                      onZoneClick={(name) => {
                        cardRefs.current[name]?.scrollIntoView({ behavior: "smooth" })
                      }}
                    />
                    <div className="absolute bottom-4 left-4 z-[1000]">
                      <DelhiMapLegend />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
                    <h3 className="font-semibold text-red-800 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Highest Risk Areas
                    </h3>
                  </div>
                  <div className="p-3 space-y-2">
                    {topHotspots.map((z, i) => (
                      <div
                        key={i}
                        onClick={() => cardRefs.current[z.zone_name]?.scrollIntoView({ behavior: "smooth" })}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{z.zone_name}</p>
                            <p className="text-xs text-slate-500">Score: {z.risk_score}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeStyles(z.risk_status)}`}>
                          {z.risk_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Rainfall Trend
                    </h3>
                    <p className="text-sm text-slate-500">Next 4 hours forecast</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-end justify-between gap-2 h-32">
                      {forecast.map((f, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-xs font-medium text-slate-600">{f.value}mm</span>
                          <div
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all"
                            style={{ height: `${f.value * 2.5}px` }}
                          />
                          <span className="text-xs text-slate-500">{f.hour}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATION TAB */}
          {activeTab === "simulation" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <CloudRain className="w-5 h-5 text-blue-500" />
                    Rainfall Simulation
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Simulate different rainfall scenarios to see how risk levels change
                  </p>
                </div>
                <div className="p-5 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Simulated Rainfall</span>
                    <span className="text-2xl font-bold text-blue-600">{simulatedRain} mm/hr</span>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={simulatedRain}
                      onChange={(e) => setSimulatedRain(Number.parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0 mm</span>
                      <span>Light (10mm)</span>
                      <span>Heavy (25mm)</span>
                      <span>Extreme (50mm)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setPlaying(!playing)}
                    className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      playing
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                    }`}
                  >
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {playing ? "Pause Time-lapse" : "Play Time-lapse"}
                  </button>
                  <p className="text-center text-xs text-slate-500">Watch how risk levels change over time</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">Simulated Risk Map</h3>
                  <p className="text-sm text-slate-500">Current simulation: {simulatedRain} mm/hr rainfall</p>
                </div>
                <div className="h-[350px]">
                  <DelhiHotspotMap
                    zones={simulatedZones}
                    reports={reports}
                    onZoneClick={(name) => {
                      cardRefs.current[name]?.scrollIntoView({ behavior: "smooth" })
                    }}
                  />
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">Simulation Impact Analysis</h3>
                  <p className="text-sm text-slate-500">How the current rainfall scenario affects each zone</p>
                </div>
                <div className="p-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {simulatedZones.slice(0, 8).map((zone, i) => (
                      <div key={i} className={`rounded-xl p-4 ${getZoneCardStyles(zone.risk_status)}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-800 text-sm">{zone.zone_name}</span>
                          {getRiskIcon(zone.risk_status)}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Risk Score</span>
                            <span className="font-bold text-slate-800">{zone.risk_score}</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressBarColor(zone.risk_status)} transition-all`}
                              style={{ width: `${zone.risk_score}%` }}
                            />
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeStyles(zone.risk_status)}`}
                          >
                            {zone.risk_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT TAB */}
          {activeTab === "report" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquarePlus className="w-5 h-5 text-purple-500" />
                    Report Water-Logging
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Help us by reporting flooded areas in your vicinity. Your location will be automatically detected.
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <input
                      type="text"
                      placeholder="Describe the location (near metro, market, road name...)"
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 
                      text-slate-900 bg-white 
                      placeholder:text-slate-400
                      focus:border-purple-500 focus:ring-2 focus:ring-purple-200 
                      outline-none transition-all"
                    />
                  </div>
                  <button
                    disabled={reportLoading || !reportText}
                    onClick={submitCitizenReport}
                    className="w-full py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {reportLoading ? (
                      "Detecting location..."
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Report
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-500">Your browser will ask for location permission</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Your Reports
                  </h3>
                  <p className="text-sm text-slate-500">{reports.length} reports submitted</p>
                </div>
                <div className="p-4 max-h-[350px] overflow-y-auto">
                  {reports.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No reports yet. Be the first to report!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports.map((r, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100"
                        >
                          <p className="font-medium text-slate-800">{r.note}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            Location: {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ZONES TAB */}
          {activeTab === "zones" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-blue-500" />
                    All Monitored Zones
                  </h2>
                  <p className="text-sm text-slate-500">Detailed information for all {simulatedZones.length} zones</p>
                </div>
                <div className="p-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {simulatedZones.map((zone, i) => (
                      <div
                        key={i}
                        ref={(el) => (cardRefs.current[zone.zone_name] = el)}
                        className={`rounded-xl p-5 hover:shadow-md transition-all ${getZoneCardStyles(zone.risk_status)}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-800">{zone.zone_name}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                            </p>
                          </div>
                          {getRiskIcon(zone.risk_status)}
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Risk Score</span>
                            <span className="text-xl font-bold text-slate-800">{zone.risk_score}</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getProgressBarColor(zone.risk_status)} transition-all`}
                              style={{ width: `${zone.risk_score}%` }}
                            />
                          </div>
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getBadgeStyles(zone.risk_status)}`}
                          >
                            {zone.risk_status}
                          </span>

                          {zone.details && (
                            <div className="pt-3 mt-3 border-t border-slate-200 space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Elevation</span>
                                <span className="font-medium text-slate-700">{zone.details.elevation}m</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Drainage</span>
                                <span className="font-medium text-slate-700">{zone.details.drainage}</span>
                              </div>
                            </div>
                          )}

                          {viewMode === "authority" && (
                            <div className="pt-3 mt-3 border-t border-slate-200">
                              <p className="text-xs font-medium text-slate-500 mb-1">Recommended Action</p>
                              <p className="text-sm font-semibold text-blue-700">{getActionText(zone.risk_status)}</p>
                            </div>
                          )}
                          {viewMode === "citizen" && (
                            <div className="pt-3 mt-3 border-t border-slate-200">
                              <p className="text-xs font-medium text-slate-500 mb-1">
                                Travel Advisory
                              </p>
                              <p className="text-sm font-semibold text-red-600">
                                {getTravelCaution(zone.risk_status)}
                              </p>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
