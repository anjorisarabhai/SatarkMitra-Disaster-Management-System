import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  Users,
  Building2,
  Radio,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import type { Zone, Report } from "@/components/maps/DelhiHotspotMap";

// Lazy load the maps
const DelhiHotspotMap = lazy(() => import("@/components/maps/DelhiHotspotMap"));
const DelhiMapLegend = lazy(() => import("@/components/maps/DelhiMapLegend"));

const mockZones: Zone[] = [
  { zone_name: "Rohini Sector 15", latitude: 28.7341, longitude: 77.1025, risk_score: 75, risk_status: "CRITICAL", details: { elevation: 215, drainage: "Poor" } },
  { zone_name: "Dwarka Sector 21", latitude: 28.5535, longitude: 77.0588, risk_score: 55, risk_status: "HIGH", details: { elevation: 220, drainage: "Moderate" } },
  { zone_name: "Connaught Place", latitude: 28.6315, longitude: 77.2167, risk_score: 35, risk_status: "MODERATE", details: { elevation: 216, drainage: "Good" } },
  { zone_name: "Lajpat Nagar", latitude: 28.5677, longitude: 77.2433, risk_score: 45, risk_status: "HIGH", details: { elevation: 214, drainage: "Moderate" } },
  { zone_name: "Karol Bagh", latitude: 28.6514, longitude: 77.1906, risk_score: 25, risk_status: "MODERATE", details: { elevation: 218, drainage: "Good" } },
  { zone_name: "Saket", latitude: 28.5244, longitude: 77.2066, risk_score: 15, risk_status: "LOW", details: { elevation: 222, drainage: "Good" } },
  { zone_name: "Janakpuri", latitude: 28.6219, longitude: 77.0878, risk_score: 65, risk_status: "HIGH", details: { elevation: 212, drainage: "Poor" } },
  { zone_name: "Pitampura", latitude: 28.6969, longitude: 77.1315, risk_score: 40, risk_status: "MODERATE", details: { elevation: 217, drainage: "Moderate" } },
];

const forecast = [
  { hour: "Now", value: 5 },
  { hour: "+1h", value: 12 },
  { hour: "+2h", value: 20 },
  { hour: "+3h", value: 35 },
  { hour: "+4h", value: 30 },
];

const translations = {
  en: {
    title: "Delhi Water-Logging Dashboard",
    subtitle: "Real-time flood risk monitoring & decision support",
    citizen: "Citizen",
    authority: "Authority",
    critical: "Critical",
    high: "High Risk",
    moderate: "Moderate",
    low: "Low Risk",
    tabs: { map: "Map View", sim: "Simulation", report: "Report", zones: "All Zones" },
    liveMap: "Live Hotspot Map",
    clickDetails: "Click on markers for details",
    highestRisk: "Highest Risk Areas",
    rainTrend: "Rainfall Trend",
    forecast: "Next 4 hours forecast",
    simTitle: "Rainfall Simulation",
    simDesc: "Simulate different rainfall scenarios to see how risk levels change",
    simLabel: "Simulated Rainfall",
    play: "Play Time-lapse",
    pause: "Pause Time-lapse",
    impact: "Simulation Impact Analysis",
    reportTitle: "Report Water-Logging",
    reportDesc: "Help us by reporting flooded areas. Your location is auto-detected.",
    descLabel: "Description",
    placeholder: "Describe location (e.g., near metro, market...)",
    submit: "Submit Report",
    detecting: "Detecting location...",
    yourReports: "Your Reports",
    noReports: "No reports yet. Be the first to report!",
    allZones: "All Monitored Zones",
    zoneDesc: "Detailed information for all zones",
    riskScore: "Risk Score",
    elevation: "Elevation",
    drainage: "Drainage",
    recAction: "Recommended Action",
    advisory: "Travel Advisory",
    safety: {
      critical: "🚫 Avoid travel. Severe water-logging expected.",
      high: "⚠️ Travel only if necessary. Expect disruptions.",
      moderate: "🟡 Delays possible. Drive with caution.",
      low: "✅ Safe for travel.",
    },
    actions: {
      critical: "Emergency response required",
      high: "Deploy pumps & drain cleanup",
      moderate: "Inspect drainage systems",
      low: "Monitoring only",
    },
  },
  hi: {
    title: "दिल्ली जलभराव डैशबोर्ड",
    subtitle: "रीयल-टाइम बाढ़ जोखिम और निर्णय सहायता प्रणाली",
    citizen: "नागरिक",
    authority: "प्राधिकरण",
    critical: "गंभीर",
    high: "उच्च जोखिम",
    moderate: "मध्यम",
    low: "कम जोखिम",
    tabs: { map: "मानचित्र", sim: "सिमुलेशन", report: "रिपोर्ट करें", zones: "सभी क्षेत्र" },
    liveMap: "लाइव जोखिम मानचित्र",
    clickDetails: "विवरण के लिए मार्कर्स पर क्लिक करें",
    highestRisk: "सर्वाधिक जोखिम वाले क्षेत्र",
    rainTrend: "वर्षा का रुझान",
    forecast: "अगले 4 घंटे का पूर्वानुमान",
    simTitle: "वर्षा सिमुलेशन",
    simDesc: "विभिन्न वर्षा स्थितियों का अनुकरण करें और जोखिम देखें",
    simLabel: "सिमुलेटेड वर्षा",
    play: "टाइम-लैप्स चलाएं",
    pause: "टाइम-लैप्स रोकें",
    impact: "सिमुलेशन प्रभाव विश्लेषण",
    reportTitle: "जलभराव की रिपोर्ट करें",
    reportDesc: "बाढ़ वाले क्षेत्रों की रिपोर्ट करें। आपका स्थान स्वतः पता लगाया जाएगा।",
    descLabel: "विवरण",
    placeholder: "स्थान का वर्णन करें (जैसे: मेट्रो के पास, बाजार...)",
    submit: "रिपोर्ट भेजें",
    detecting: "स्थान खोज रहा है...",
    yourReports: "आपकी रिपोर्ट्स",
    noReports: "अभी तक कोई रिपोर्ट नहीं। सबसे पहले रिपोर्ट करें!",
    allZones: "सभी निगरानी क्षेत्र",
    zoneDesc: "सभी क्षेत्रों के लिए विस्तृत जानकारी",
    riskScore: "जोखिम स्कोर",
    elevation: "ऊंचाई",
    drainage: "ड्रेनेज",
    recAction: "अनुशंसित कार्रवाई",
    advisory: "यात्रा सलाह",
    safety: {
      critical: "🚫 यात्रा से बचें। गंभीर जलभराव की संभावना।",
      high: "⚠️ केवल आवश्यक होने पर यात्रा करें।",
      moderate: "🟡 देरी संभव है। सावधानी से वाहन चलाएं।",
      low: "✅ यात्रा के लिए सुरक्षित।",
    },
    actions: {
      critical: "आपातकालीन प्रतिक्रिया आवश्यक",
      high: "पंप तैनात करें और नाली की सफाई करें",
      moderate: "जल निकासी प्रणाली का निरीक्षण करें",
      low: "केवल निगरानी",
    },
  },
};

export default function DelhiDashboard() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [zones] = useState<Zone[]>(mockZones);
  const [simulatedRain, setSimulatedRain] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<"citizen" | "authority">("citizen");
  const [reports, setReports] = useState<Report[]>([]);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("map");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const text = translations[lang];

  const tabs = [
    { id: "map", label: text.tabs.map, icon: Map },
    { id: "simulation", label: text.tabs.sim, icon: Gauge },
    { id: "report", label: text.tabs.report, icon: MessageSquarePlus },
    { id: "zones", label: text.tabs.zones, icon: LayoutGrid },
  ];

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setSimulatedRain((prev) => (prev >= 50 ? 0 : prev + 5));
    }, 800);
    return () => clearInterval(interval);
  }, [playing]);

  const applyRainSimulation = (zone: Zone): Zone => {
    let score = zone.risk_score;
    if (simulatedRain > 40) score += 40;
    else if (simulatedRain > 25) score += 25;
    else if (simulatedRain > 10) score += 10;

    let status = "LOW";
    if (score >= 70) status = "CRITICAL";
    else if (score >= 40) status = "HIGH";
    else if (score >= 20) status = "MODERATE";

    return { ...zone, risk_score: Math.min(score, 100), risk_status: status };
  };

  const simulatedZones = zones.map(applyRainSimulation);
  const topHotspots = [...simulatedZones].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  const getActionText = (risk: string) => {
    if (risk === "CRITICAL") return text.actions.critical;
    if (risk === "HIGH") return text.actions.high;
    if (risk === "MODERATE") return text.actions.moderate;
    return text.actions.low;
  };

  const getTravelCaution = (risk: string) => {
    if (risk === "CRITICAL") return text.safety.critical;
    if (risk === "HIGH") return text.safety.high;
    if (risk === "MODERATE") return text.safety.moderate;
    return text.safety.low;
  };

  const getZoneCardStyles = (status: string) => {
    const styles: Record<string, string> = {
      CRITICAL: "zone-card-critical",
      HIGH: "zone-card-high",
      MODERATE: "zone-card-moderate",
      LOW: "zone-card-low",
    };
    return styles[status] || styles.LOW;
  };

  const getProgressBarColor = (status: string) => {
    const colors: Record<string, string> = {
      CRITICAL: "progress-critical",
      HIGH: "progress-high",
      MODERATE: "progress-moderate",
      LOW: "progress-low",
    };
    return colors[status] || colors.LOW;
  };

  const submitCitizenReport = () => {
    if (!reportText) return;
    if (!navigator.geolocation) {
      alert("Location not supported on this device");
      return;
    }
    setReportLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setReports((prev) => [...prev, { lat: latitude, lng: longitude, note: reportText }]);
        setReportText("");
        setReportLoading(false);
      },
      () => {
        alert("Location permission denied. Please allow location access.");
        setReportLoading(false);
      }
    );
  };

  const criticalCount = simulatedZones.filter((z) => z.risk_status === "CRITICAL").length;
  const highCount = simulatedZones.filter((z) => z.risk_status === "HIGH").length;
  const moderateCount = simulatedZones.filter((z) => z.risk_status === "MODERATE").length;
  const lowCount = simulatedZones.filter((z) => z.risk_status === "LOW").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">{text.title}</h1>
                <p className="text-sm text-muted-foreground">{text.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <div className="flex bg-secondary rounded-full p-1">
                <button
                  onClick={() => setLang("en")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    lang === "en" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"
                  }`}
                >
                  ENG
                </button>
                <button
                  onClick={() => setLang("hi")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    lang === "hi" ? "bg-risk-low text-primary-foreground shadow-md" : "text-muted-foreground"
                  }`}
                >
                  हिंदी
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-secondary rounded-full p-1">
                <button
                  onClick={() => setViewMode("citizen")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === "citizen" ? "bg-card text-primary shadow-md" : "text-muted-foreground"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {text.citizen}
                </button>
                <button
                  onClick={() => setViewMode("authority")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === "authority" ? "bg-card text-primary shadow-md" : "text-muted-foreground"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  {text.authority}
                </button>
              </div>

              <LiveIndicator className="hidden md:flex" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text.critical}</p>
                <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text.high}</p>
                <p className="text-3xl font-bold text-risk-high">{highCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-risk-high/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-risk-high" />
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text.moderate}</p>
                <p className="text-3xl font-bold text-risk-moderate">{moderateCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-risk-moderate/10 flex items-center justify-center">
                <Gauge className="w-6 h-6 text-risk-moderate" />
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{text.low}</p>
                <p className="text-3xl font-bold text-risk-low">{lowCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-risk-low/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-risk-low" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 glass-card p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {/* MAP TAB */}
        {activeTab === "map" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2">
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Map className="w-5 h-5 text-primary" />
                      {text.liveMap}
                    </h2>
                    <p className="text-sm text-muted-foreground">{text.clickDetails}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-risk-low/10 rounded-full">
                    <Radio className="w-3.5 h-3.5 text-risk-low animate-pulse" />
                    <span className="text-xs font-medium text-risk-low">Live</span>
                  </div>
                </div>
                <div className="relative h-[500px]">
                  <Suspense
                    fallback={
                      <div className="h-full w-full bg-secondary/20 animate-pulse flex items-center justify-center text-muted-foreground">
                        Loading Map...
                      </div>
                    }
                  >
                    <DelhiHotspotMap
                      zones={simulatedZones}
                      reports={reports}
                      lang={lang}
                      onZoneClick={(name) => {
                        cardRefs.current[name]?.scrollIntoView({ behavior: "smooth" });
                      }}
                    />
                  </Suspense>
                  <div className="absolute bottom-4 left-4 z-[1000]">
                    <Suspense fallback={null}>
                      <DelhiMapLegend lang={lang} />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Highest Risk */}
              <div className="glass-card overflow-hidden border-destructive/20">
                <div className="p-4 bg-gradient-to-r from-destructive/10 to-risk-high/10 border-b border-destructive/20">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {text.highestRisk}
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  {topHotspots.map((z, i) => (
                    <div
                      key={i}
                      onClick={() => cardRefs.current[z.zone_name]?.scrollIntoView({ behavior: "smooth" })}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-foreground text-sm">{z.zone_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {text.riskScore}: {z.risk_score}
                          </p>
                        </div>
                      </div>
                      <RiskBadge level={z.risk_status as any} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rainfall Trend */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {text.rainTrend}
                  </h3>
                  <p className="text-sm text-muted-foreground">{text.forecast}</p>
                </div>
                <div className="p-4">
                  <div className="flex items-end justify-between gap-2 h-32">
                    {forecast.map((f, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs font-medium text-muted-foreground">{f.value}mm</span>
                        <div
                          className="w-full bg-gradient-to-t from-primary to-accent rounded-t-md transition-all"
                          style={{ height: `${f.value * 2.5}px` }}
                        />
                        <span className="text-xs text-muted-foreground">{f.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SIMULATION TAB */}
        {activeTab === "simulation" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-primary" />
                  {text.simTitle}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{text.simDesc}</p>
              </div>
              <div className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{text.simLabel}</span>
                  <span className="text-2xl font-bold text-primary">{simulatedRain} mm/hr</span>
                </div>

                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={simulatedRain}
                    onChange={(e) => setSimulatedRain(Number.parseInt(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 mm</span>
                    <span>10mm</span>
                    <span>25mm</span>
                    <span>50mm</span>
                  </div>
                </div>

                <Button
                  onClick={() => setPlaying(!playing)}
                  className={`w-full ${playing ? "bg-destructive hover:bg-destructive/90" : ""}`}
                >
                  {playing ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {playing ? text.pause : text.play}
                </Button>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h3 className="font-semibold text-foreground">{text.liveMap} (Sim)</h3>
                <p className="text-sm text-muted-foreground">Current: {simulatedRain} mm/hr rainfall</p>
              </div>
              <div className="h-[350px]">
                <Suspense
                  fallback={
                    <div className="h-full w-full bg-secondary/20 animate-pulse flex items-center justify-center text-muted-foreground">
                      Loading Map...
                    </div>
                  }
                >
                  <DelhiHotspotMap zones={simulatedZones} reports={reports} lang={lang} />
                </Suspense>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h3 className="font-semibold text-foreground">{text.impact}</h3>
              </div>
              <div className="p-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {simulatedZones.slice(0, 8).map((zone, i) => (
                    <div key={i} className={`rounded-xl p-4 glass-card ${getZoneCardStyles(zone.risk_status)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-foreground text-sm">{zone.zone_name}</span>
                        {zone.risk_status === "CRITICAL" && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        {zone.risk_status === "HIGH" && <AlertTriangle className="w-4 h-4 text-risk-high" />}
                        {zone.risk_status === "MODERATE" && <AlertTriangle className="w-4 h-4 text-risk-moderate" />}
                        {zone.risk_status === "LOW" && <Check className="w-4 h-4 text-risk-low" />}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{text.riskScore}</span>
                          <span className="font-bold text-foreground">{zone.risk_score}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor(zone.risk_status)} transition-all`}
                            style={{ width: `${zone.risk_score}%` }}
                          />
                        </div>
                        <RiskBadge level={zone.risk_status as any} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* REPORT TAB */}
        {activeTab === "report" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            <div className="glass-card overflow-hidden">
              <div className="p-5 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-accent" />
                  {text.reportTitle}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{text.reportDesc}</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{text.descLabel}</label>
                  <Input
                    placeholder={text.placeholder}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                  />
                </div>
                <Button
                  disabled={reportLoading || !reportText}
                  onClick={submitCitizenReport}
                  className="w-full bg-gradient-to-r from-accent to-primary"
                >
                  {reportLoading ? (
                    text.detecting
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {text.submit}
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Your browser will ask for location permission
                </p>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {text.yourReports}
                </h3>
                <p className="text-sm text-muted-foreground">{reports.length} reports submitted</p>
              </div>
              <div className="p-4 max-h-[350px] overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquarePlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{text.noReports}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((r, i) => (
                      <div key={i} className="p-4 rounded-xl glass-card border border-accent/20">
                        <p className="font-medium text-foreground">{r.note}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Location: {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ZONES TAB */}
        {activeTab === "zones" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                  {text.allZones}
                </h2>
                <p className="text-sm text-muted-foreground">{text.zoneDesc}</p>
              </div>
              <div className="p-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {simulatedZones.map((zone, i) => (
                    <div
                      key={i}
                      ref={(el) => (cardRefs.current[zone.zone_name] = el)}
                      className={`rounded-xl p-5 glass-card hover:shadow-lg transition-all ${getZoneCardStyles(
                        zone.risk_status
                      )}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{zone.zone_name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                          </p>
                        </div>
                        {zone.risk_status === "CRITICAL" && <AlertTriangle className="w-5 h-5 text-destructive" />}
                        {zone.risk_status === "HIGH" && <AlertTriangle className="w-5 h-5 text-risk-high" />}
                        {zone.risk_status === "MODERATE" && <AlertTriangle className="w-5 h-5 text-risk-moderate" />}
                        {zone.risk_status === "LOW" && <Check className="w-5 h-5 text-risk-low" />}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{text.riskScore}</span>
                          <span className="text-xl font-bold text-foreground">{zone.risk_score}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor(zone.risk_status)} transition-all`}
                            style={{ width: `${zone.risk_score}%` }}
                          />
                        </div>
                        <RiskBadge level={zone.risk_status as any} />

                        {zone.details && (
                          <div className="pt-3 mt-3 border-t border-border/50 space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{text.elevation}</span>
                              <span className="font-medium text-foreground">{zone.details.elevation}m</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{text.drainage}</span>
                              <span className="font-medium text-foreground">{zone.details.drainage}</span>
                            </div>
                          </div>
                        )}

                        {viewMode === "authority" && (
                          <div className="pt-3 mt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{text.recAction}</p>
                            <p className="text-sm font-semibold text-primary">{getActionText(zone.risk_status)}</p>
                          </div>
                        )}
                        {viewMode === "citizen" && (
                          <div className="pt-3 mt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{text.advisory}</p>
                            <p className="text-sm font-semibold text-destructive">{getTravelCaution(zone.risk_status)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
