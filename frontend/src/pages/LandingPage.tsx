import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  MapPin, 
  Activity, 
  AlertTriangle,
  ArrowRight,
  Waves,
  Building2,
  Mountain
} from "lucide-react";
import kedarnathHero from "@/assets/kedarnath-hero.jpg";
import delhiHero from "@/assets/delhi-hero.jpg";
import USSDAlert from "@/components/ui/USSDAlert";

const locations = [
  {
    id: "kedarnath",
    name: "Kedarnath",
    subtitle: "Uttarakhand Flood Monitoring",
    description: "Real-time river level monitoring, AI-powered flood prediction, and emergency response coordination for the sacred Kedarnath valley.",
    image: kedarnathHero,
    icon: Mountain,
    stats: { alerts: 3, stations: 5, risk: "HIGH" },
    path: "/kedarnath",
    gradient: "from-emerald-600 to-cyan-600",
  },
  {
    id: "delhi",
    name: "Delhi NCR",
    subtitle: "Urban Water-Logging Dashboard",
    description: "Comprehensive water-logging risk assessment, zone-wise monitoring, and citizen reporting system for Delhi's urban infrastructure.",
    image: delhiHero,
    icon: Building2,
    stats: { zones: 8, critical: 2, risk: "MODERATE" },
    path: "/delhi",
    gradient: "from-orange-600 to-rose-600",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <USSDAlert />

      {/* Hero Section */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 pt-12 pb-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">
                SatarkMitra
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-Powered Flood Monitoring & Early Warning System
            </p>
            
            {/* Live indicator */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-green-400">
                System Active • Real-time Data Feed
              </span>
            </motion.div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 mb-12 max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-bold text-foreground">2</span>
                </div>
                <p className="text-xs text-muted-foreground">Active Regions</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-2xl font-bold text-foreground">13</span>
                </div>
                <p className="text-xs text-muted-foreground">Monitored Zones</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-risk-high" />
                  <span className="text-2xl font-bold text-foreground">5</span>
                </div>
                <p className="text-xs text-muted-foreground">Active Alerts</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Waves className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-bold text-foreground">24/7</span>
                </div>
                <p className="text-xs text-muted-foreground">AI Monitoring</p>
              </div>
            </div>
          </motion.div>

          {/* Location Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {locations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                onMouseEnter={() => setHoveredCard(location.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => navigate(location.path)}
                className="group relative cursor-pointer"
              >
                <div className="glass-card overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={location.image}
                      alt={location.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                    
                    {/* Floating icon */}
                    <motion.div 
                      className={`absolute top-4 right-4 p-3 rounded-xl bg-gradient-to-br ${location.gradient} shadow-lg`}
                      animate={hoveredCard === location.id ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                    >
                      <location.icon className="w-6 h-6 text-white" />
                    </motion.div>

                    {/* Risk indicator */}
                    <div className="absolute bottom-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        location.stats.risk === "HIGH" 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      }`}>
                        {location.stats.risk} RISK
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {location.name}
                    </h2>
                    <p className="text-sm text-primary font-medium mb-3">
                      {location.subtitle}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {location.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4">
                      {Object.entries(location.stats)
                        .filter(([key]) => key !== "risk")
                        .map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className="text-lg font-bold text-foreground">{value}</p>
                            <p className="text-xs text-muted-foreground capitalize">{key}</p>
                          </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <motion.div 
                      className={`flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${location.gradient} bg-clip-text text-transparent`}
                      animate={hoveredCard === location.id ? { x: 5 } : { x: 0 }}
                    >
                      Open Dashboard
                      <ArrowRight className={`w-4 h-4 ${
                        location.id === "kedarnath" ? "text-cyan-500" : "text-orange-500"
                      }`} />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12 text-sm text-muted-foreground"
          >
            <p>
              Powered by Hybrid Deep Learning Models (GRU + TCN + XGBoost) • 
              Data from IMD, NDRF & Real-time Sensors
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
