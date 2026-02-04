import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  MapPin,
  AlertTriangle,
  Phone,
  ClipboardList,
  Home,
  Shield,
  Check,
  Route,
  X,
  Plus,
  Droplets,
  Waves,
  CheckCircle2,
  Circle,
  Navigation,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import KedarnathLeafletMap from "@/components/maps/KedarnathLeafletMap";

// Mock data
const initialMockAlerts = [
  { id: 1, type: "critical", title: "Flash Flood Warning", location: "Mandakini River", time: "2 min ago", acknowledged: false },
  { id: 2, type: "warning", title: "Rising Water Levels", location: "Gaurikund Station", time: "15 min ago", acknowledged: true },
  { id: 3, type: "info", title: "Evacuation Route Update", location: "Route B - East", time: "1 hour ago", acknowledged: true },
];

const initialEmergencyContacts = [
  { id: 1, name: "NDRF Command Center", role: "Disaster Response", contact: "108" },
  { id: 2, name: "State Disaster Mgmt.", role: "Coordination", contact: "1070" },
  { id: 3, name: "District Control Room", role: "Local Operations", contact: "1077" },
];

const waterStations = [
  { id: "station-a", name: "Mandakini River", location: "Near Temple Bridge", currentLevel: 8.5, status: "critical", capacity: 10.0, lastUpdated: "2 min ago" },
  { id: "station-b", name: "Gaurikund Station", location: "Entry Point", currentLevel: 6.2, status: "warning", capacity: 9.0, lastUpdated: "1 min ago" },
  { id: "station-c", name: "Kedarnath Base", location: "Downstream Checkpoint", currentLevel: 4.1, status: "normal", capacity: 8.5, lastUpdated: "3 min ago" },
];

const initialProtocolsData = {
  normal: [
    { id: 'n1', text: "Monitor water levels every 6 hours.", completed: false },
    { id: 'n2', text: "Weekly check of communication systems.", completed: false },
    { id: 'n3', text: "Verify sensor battery levels.", completed: false }
  ],
  warning: [
    { id: 'w1', text: "Increase monitoring frequency to every hour.", completed: false },
    { id: 'w2', text: "Place emergency response teams on standby.", completed: false },
    { id: 'w3', text: "Broadcast SMS alert to registered locals.", completed: false }
  ],
  critical: [
    { id: 'c1', text: "Activate Emergency Operations Center (EOC).", completed: false },
    { id: 'c2', text: "Issue immediate evacuation orders.", completed: false },
    { id: 'c3', text: "Deploy NDRF teams to low-lying areas.", completed: false }
  ],
};

const nearbyResources = [
  { id: 1, name: "Govt. Primary School Shelter", location: "Rampur Village", dist: "2km", capacity: 150, current_occupancy: 45, status: "Open" },
  { id: 2, name: "Community Hall Shelter", location: "Sitapur", dist: "3km", capacity: 250, current_occupancy: 200, status: "Open" },
  { id: 3, name: "Old Temple Guesthouse", location: "Gaurikund", dist: "1.5km", capacity: 80, current_occupancy: 80, status: "Full" },
];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: MapPin },
  { id: "water-levels", label: "Water Levels", icon: Activity },
  { id: "prediction", label: "AI Prediction", icon: Shield },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "contacts", label: "Contacts", icon: Phone },
  { id: "protocols", label: "Protocols", icon: ClipboardList },
  { id: "resources", label: "Resources", icon: Home },
];

interface Alert {
  id: number;
  type: string;
  title: string;
  location: string;
  time: string;
  acknowledged: boolean;
}

interface Contact {
  id: number;
  name: string;
  role: string;
  contact: string;
}

interface Protocol {
  id: string;
  text: string;
  completed: boolean;
}

export default function KedarnathDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [kedarnathRisk, setKedarnathRisk] = useState<any>(null);

  const [alerts, setAlerts] = useState<Alert[]>(initialMockAlerts);
  const [contacts, setContacts] = useState<Contact[]>(initialEmergencyContacts);
  const [protocols, setProtocols] = useState(initialProtocolsData);

  // Prediction form state
  const [riverLevel, setRiverLevel] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // New States
  const [alertFilter, setAlertFilter] = useState("all");
  const [calculatingRoute, setCalculatingRoute] = useState<number | null>(null);
  const [isAddAlertModalOpen, setIsAddAlertModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({ type: "info", title: "", location: "" });
  const [newContact, setNewContact] = useState({ name: "", role: "", contact: "" });

  const handlePredict = async () => {
  if (!riverLevel || !rainfall) {
    alert("Please enter both values.");
    return;
  }

  setLoading(true);
  setPredictionResult(null);

  try {
    const res = await fetch("http://127.0.0.1:8000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        river_level: parseFloat(riverLevel),
        rainfall: parseFloat(rainfall),
      }),
    });

    if (!res.ok) {
      throw new Error("Prediction API failed");
    }

    const data = await res.json();

    /**
     * Backend returns:
     * {
     *   location: "Kedarnath",
     *   alert_level: "HIGH" | "LOW",
     *   gru_forecast: number,
     *   tcn_forecast: number
     * }
     */

    const floodProbability = Math.min(
      100,
      ((data.gru_forecast + data.tcn_forecast) / 2) * 100
    ).toFixed(1);

    const result = {
      alert_level: data.alert_level,
      flood_probability: floodProbability,
      location: data.location,
    };

    setPredictionResult(result);
    setKedarnathRisk(result);
  } catch (err) {
    console.error(err);
    alert("Failed to fetch prediction from server");
  } finally {
    setLoading(false);
  }
};

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlertObject = { id: Date.now(), ...newAlert, time: "Just now", acknowledged: false };
    setAlerts([newAlertObject, ...alerts]);
    setIsAddAlertModalOpen(false);
    setNewAlert({ type: "info", title: "", location: "" });
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const newContactObject = { id: Date.now(), ...newContact };
    setContacts([...contacts, newContactObject]);
    setIsAddContactModalOpen(false);
    setNewContact({ name: "", role: "", contact: "" });
  };

  const toggleProtocol = (category: keyof typeof protocols, id: string) => {
    setProtocols((prev) => ({
      ...prev,
      [category]: prev[category].map((p: Protocol) =>
        p.id === id ? { ...p, completed: !p.completed } : p
      ),
    }));
  };

  const acknowledgeAlert = (id: number) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const simulateRouteCalculation = (id: number) => {
    setCalculatingRoute(id);
    setTimeout(() => {
      setCalculatingRoute(null);
      alert("Route calculated! Directions sent to map.");
    }, 2000);
  };

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getStatusClass = (status: string) => {
    if (status === "critical") return "progress-critical";
    if (status === "warning") return "progress-high";
    return "progress-low";
  };

  const filteredAlerts = alerts.filter((a) => alertFilter === "all" || a.type === alertFilter);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold text-foreground">Kedarnath Flood Management</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time monitoring and emergency response dashboard
                  {currentTime && (
                    <span className="ml-2 opacity-70">
                      • {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <LiveIndicator />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Alerts</p>
                      <p className="text-3xl font-bold text-foreground">{alerts.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-destructive/10">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Critical Stations</p>
                      <p className="text-3xl font-bold text-foreground">
                        {waterStations.filter((s) => s.status === "critical").length}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-risk-high/10">
                      <Activity className="w-6 h-6 text-risk-high" />
                    </div>
                  </div>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Key Contacts</p>
                      <p className="text-3xl font-bold text-foreground">{contacts.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Open Shelters</p>
                      <p className="text-3xl font-bold text-foreground">
                        {nearbyResources.filter((r) => r.status === "Open").length}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-risk-low/10">
                      <Home className="w-6 h-6 text-risk-low" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h3 className="text-lg font-semibold text-foreground">Kedarnath Flood Risk Map</h3>
                  <p className="text-sm text-muted-foreground">Real‑time AI‑assessed flood risk visualization</p>
                </div>
                <div className="h-[400px]">
                  <KedarnathLeafletMap riskData={kedarnathRisk} />
                </div>
              </div>
            </div>
          )}

          {/* Water Levels Tab */}
          {activeTab === "water-levels" && (
            <div className="grid md:grid-cols-3 gap-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              {waterStations.map((station) => (
                <div key={station.id} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">{station.name}</h3>
                    <RiskBadge level={station.status as any} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{station.location}</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{station.currentLevel}m</span>
                      <span className="text-muted-foreground">/ {station.capacity}m</span>
                    </div>
                    <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusClass(station.status)} transition-all`}
                        style={{ width: `${(station.currentLevel / station.capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Last updated: {station.lastUpdated}</p>
                </div>
              ))}
            </div>
          )}

          {/* AI Prediction Tab */}
          {activeTab === "prediction" && (
            <div className="max-w-2xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="glass-card">
                <div className="p-6 border-b border-border/50">
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    AI Prediction Core
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kedarnath Specific Model (GRU + TCN + XGBoost)
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="riverLevel">River Level (sq km)</Label>
                      <div className="relative">
                        <Waves className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input
                          id="riverLevel"
                          type="number"
                          placeholder="e.g. 1.5"
                          value={riverLevel}
                          onChange={(e) => setRiverLevel(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rainfall">Rainfall (mm)</Label>
                      <div className="relative">
                        <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input
                          id="rainfall"
                          type="number"
                          placeholder="e.g. 12.0"
                          value={rainfall}
                          onChange={(e) => setRainfall(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handlePredict} disabled={loading} className="w-full">
                    {loading ? "Analyzing Real-time Data..." : "Run Risk Analysis"}
                  </Button>

                  {predictionResult && (
                    <div
                      className={`p-4 rounded-xl border-l-4 animate-in fade-in-0 zoom-in-95 duration-300 ${
                        predictionResult.alert_level === "HIGH"
                          ? "zone-card-critical"
                          : "zone-card-low"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {predictionResult.alert_level === "HIGH" ? (
                          <AlertTriangle className="w-8 h-8 text-destructive" />
                        ) : (
                          <Check className="w-8 h-8 text-risk-low" />
                        )}
                        <div>
                          <h4
                            className={`font-bold text-lg ${
                              predictionResult.alert_level === "HIGH" ? "text-destructive" : "text-risk-low"
                            }`}
                          >
                            {predictionResult.alert_level} RISK DETECTED
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Location: <strong>{predictionResult.location}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Alert Center</h2>
                  <p className="text-sm text-muted-foreground">Real-time emergency broadcasts</p>
                </div>
                <div className="flex items-center gap-2">
                  {["all", "critical", "warning", "info"].map((filter) => (
                    <Button
                      key={filter}
                      variant={alertFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAlertFilter(filter)}
                      className="capitalize"
                    >
                      {filter}
                    </Button>
                  ))}
                  <Button onClick={() => setIsAddAlertModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Broadcast Alert
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active alerts in this category.</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`glass-card p-4 ${
                        alert.type === "critical"
                          ? "zone-card-critical"
                          : alert.type === "warning"
                          ? "zone-card-high"
                          : "zone-card-moderate"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3">
                          <AlertTriangle
                            className={`w-5 h-5 mt-1 ${
                              alert.type === "critical"
                                ? "text-destructive"
                                : alert.type === "warning"
                                ? "text-risk-high"
                                : "text-risk-moderate"
                            }`}
                          />
                          <div>
                            <h3 className="font-bold text-foreground">{alert.title}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <MapPin className="w-3 h-3" />
                              {alert.location} • {alert.time}
                            </p>
                          </div>
                        </div>
                        {alert.acknowledged ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="w-3 h-3" /> Acknowledged
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Emergency Contacts</h2>
                <Button onClick={() => setIsAddContactModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="glass-card p-5 text-center">
                    <h3 className="font-semibold text-foreground mb-1">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{contact.role}</p>
                    <p className="text-2xl font-bold text-primary mb-4">{contact.contact}</p>
                    <Button className="w-full">Call Now</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Protocols Tab */}
          {activeTab === "protocols" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Operational Protocols</h2>
                <p className="text-sm text-muted-foreground">Click on tasks to mark them as complete.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {(["normal", "warning", "critical"] as const).map((category) => (
                  <div key={category} className="glass-card overflow-hidden">
                    <div
                      className={`p-4 border-b ${
                        category === "normal"
                          ? "bg-risk-low/10 border-risk-low/20"
                          : category === "warning"
                          ? "bg-risk-moderate/10 border-risk-moderate/20"
                          : "bg-destructive/10 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold capitalize flex items-center gap-2">
                          {category === "normal" ? (
                            <CheckCircle2 className="w-5 h-5 text-risk-low" />
                          ) : category === "warning" ? (
                            <AlertTriangle className="w-5 h-5 text-risk-moderate" />
                          ) : (
                            <Shield className="w-5 h-5 text-destructive" />
                          )}
                          {category} Level
                        </h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-background rounded-full">
                          {protocols[category].filter((p) => p.completed).length}/{protocols[category].length}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {protocols[category].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleProtocol(category, item.id)}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            item.completed ? "opacity-60" : "hover:bg-secondary/50"
                          }`}
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-risk-low flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              item.completed ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === "resources" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Safe Shelters & Resources</h2>
                <p className="text-sm text-muted-foreground">Find nearest relief camps and check occupancy.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {nearbyResources.map((resource) => {
                  const occupancyPct = (resource.current_occupancy / resource.capacity) * 100;
                  const isFull = resource.status === "Full";

                  return (
                    <div key={resource.id} className="glass-card p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground">{resource.name}</h3>
                          <span className="text-xs font-medium bg-secondary px-2 py-1 rounded flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {resource.dist}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                          <MapPin className="w-3 h-3" />
                          {resource.location}
                        </p>

                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                            <span>Occupancy</span>
                            <span>
                              {resource.current_occupancy} / {resource.capacity}
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                isFull ? "progress-critical" : occupancyPct > 80 ? "progress-high" : "progress-low"
                              }`}
                              style={{ width: `${occupancyPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <RiskBadge level={isFull ? "critical" : "low"}>{resource.status}</RiskBadge>
                        <Button
                          size="sm"
                          onClick={() => simulateRouteCalculation(resource.id)}
                          disabled={calculatingRoute === resource.id}
                        >
                          {calculatingRoute === resource.id ? (
                            "Finding Path..."
                          ) : (
                            <>
                              <Route className="w-4 h-4 mr-2" />
                              View Path
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </main>

      {/* Add Alert Modal */}
      <Dialog open={isAddAlertModalOpen} onOpenChange={setIsAddAlertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Alert</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAlert} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-title">Alert Title</Label>
              <Input
                id="alert-title"
                value={newAlert.title}
                onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-location">Location</Label>
              <Input
                id="alert-location"
                value={newAlert.location}
                onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-type">Type</Label>
              <select
                id="alert-type"
                value={newAlert.type}
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddAlertModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Alert</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">Role / Department</Label>
              <Input
                id="contact-role"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-number">Contact Number</Label>
              <Input
                id="contact-number"
                value={newContact.contact}
                onChange={(e) => setNewContact({ ...newContact, contact: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddContactModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Contact</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
