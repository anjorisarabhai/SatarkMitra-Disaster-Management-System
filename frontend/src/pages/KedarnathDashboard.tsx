import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  MapPin,
  AlertTriangle,
  Phone,
  ClipboardList,
  FileText,
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
  Mic,
  MicOff,
  Accessibility,
  Type,
  Volume2,
  Languages,
} from "lucide-react";
import USSDAlert from "@/components/ui/USSDAlert";
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
import CitizenReportTab from "@/components/kedarnath/CitizenReportTab";
import { predictKedarnath } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import ShelterRouteMap from "@/components/maps/ShelterRouteMap";

const KEDARNATH_SHELTERS = [
  { name: "सरकारी प्राथमिक विद्यालय आश्रय", lat: 30.72, lng: 79.05, capacity: 150, occupancy: 45, status: "Open" },
  { name: "सामुदायिक भवन आश्रय", lat: 30.68, lng: 79.07, capacity: 250, occupancy: 200, status: "Open" },
  { name: "पुराना मंदिर गेस्टहाउस", lat: 30.656, lng: 79.091, capacity: 80, occupancy: 80, status: "Full" },
];

// Mock data
const initialMockAlerts = [
  { id: 1, type: "critical", title: "बाढ़ की चेतावनी", location: "मंदाकिनी नदी", time: "2 मिनट पहले", acknowledged: false },
  { id: 2, type: "warning", title: "बढ़ता जल स्तर", location: "गौरीकुंड स्टेशन", time: "15 मिनट पहले", acknowledged: true },
  { id: 3, type: "info", title: "निकासी मार्ग अपडेट", location: "मार्ग बी - पूर्व", time: "1 घंटा पहले", acknowledged: true },
];

const initialEmergencyContacts = [
  { id: 1, name: "एनडीआरएफ कमांड सेंटर", role: "आपदा प्रतिक्रिया", contact: "108" },
  { id: 2, name: "राज्य आपदा प्रबंधन", role: "समन्वय", contact: "1070" },
  { id: 3, name: "जिला नियंत्रण कक्ष", role: "स्थानीय संचालन", contact: "1077" },
];

const waterStations = [
  { id: "station-a", name: "मंदाकिनी नदी", location: "मंदिर पुल के पास", currentLevel: 8.5, status: "critical", capacity: 10.0, lastUpdated: "2 मिनट पहले" },
  { id: "station-b", name: "गौरीकुंड स्टेशन", location: "प्रवेश बिंदु", currentLevel: 6.2, status: "warning", capacity: 9.0, lastUpdated: "1 मिनट पहले" },
  { id: "station-c", name: "केदारनाथ बेस", location: "डाउनस्ट्रीम चौकी", currentLevel: 4.1, status: "normal", capacity: 8.5, lastUpdated: "3 मिनट पहले" },
];

const initialProtocolsData = {
  normal: [
    { id: 'n1', text: "हर 6 घंटे में जल स्तर की निगरानी करें।", completed: false },
    { id: 'n2', text: "संचार प्रणालियों की साप्ताहिक जांच करें।", completed: false },
    { id: 'n3', text: "सेंसर बैटरी स्तर सत्यापित करें।", completed: false }
  ],
  warning: [
    { id: 'w1', text: "निगरानी आवृत्ति हर घंटे बढ़ाएं।", completed: false },
    { id: 'w2', text: "आपातकालीन प्रतिक्रिया टीमों को स्टैंडबाय पर रखें।", completed: false },
    { id: 'w3', text: "पंजीकृत स्थानीय लोगों को एसएमएस अलर्ट भेजें।", completed: false }
  ],
  critical: [
    { id: 'c1', text: "आपातकालीन संचालन केंद्र (ईओसी) सक्रिय करें।", completed: false },
    { id: 'c2', text: "तत्काल निकासी आदेश जारी करें।", completed: false },
    { id: 'c3', text: "एनडीआरएफ टीमों को निचले इलाकों में तैनात करें।", completed: false }
  ],
};

const nearbyResources = [
  { id: 1, name: "सरकारी प्राथमिक विद्यालय आश्रय", location: "रामपुर गांव", dist: "2 किमी", capacity: 150, current_occupancy: 45, status: "Open" },
  { id: 2, name: "सामुदायिक भवन आश्रय", location: "सीतापुर", dist: "3 किमी", capacity: 250, current_occupancy: 200, status: "Open" },
  { id: 3, name: "पुराना मंदिर गेस्टहाउस", location: "गौरीकुंड", dist: "1.5 किमी", capacity: 80, current_occupancy: 80, status: "Full" },
];

const translations = {
  en: {
    title: "Kedarnath Flood Management",
    subtitle: "Real-time monitoring and emergency response dashboard",

    tabs: {
      dashboard: "Dashboard",
      waterLevels: "Water Levels",
      prediction: "AI Prediction",
      report: "Report",
      alerts: "Alerts",
      contacts: "Contacts",
      protocols: "Protocols",
      resources: "Resources",
    },

    stats: {
      activeAlerts: "Active Alerts",
      criticalStations: "Critical Stations",
      keyContacts: "Key Contacts",
      openShelters: "Open Shelters",
    },

    filters: {
      all: "All",
      critical: "Critical",
      warning: "Warning",
      info: "Info",
    },

    mapTitle: "Kedarnath Flood Risk Map",
    mapDesc: "Real-time AI-assessed flood risk visualization",

    predictBtn: "Run Risk Analysis",
    loading: "Analyzing Real-time Data...",
    aiPredictionCore: "AI Prediction Core",
    aiModelDesc: "Kedarnath Specific Model (GRU + TCN + XGBoost)",
    riverLevel: "River Level (sq km)",
    rainfall: "Rainfall (mm)",
    speakValues: "Speak Values (e.g. '1.5 and 12')",
    stopListening: "Stop Listening",
    riskDetected: "RISK DETECTED",
    location: "Location",
    floodProbability: "Flood Probability",
    callNow: "Call Now",
    broadcastAlert: "Broadcast Alert",
    acknowledged: "Acknowledged",
    cancel: "Cancel",
    saveAlert: "Save Alert",
    saveContact: "Save Contact",
    addNewAlert: "Add New Alert",
    addNewContact: "Add New Contact",
    alertTitle: "Alert Title",
    type: "Type",
    name: "Name",
    role: "Role / Department",
    contactNumber: "Contact Number",
    normalLevel: "Normal Level",
    warningLevel: "Warning Level",
    criticalLevel: "Critical Level",
    occupancy: "Occupancy",
    navigateToShelter: "Navigate to Shelter",
    mapInstructions: "Click a shelter or use 'Nearest Shelter' for directions",
    navigate: "Navigate to Nearest Shelter",
    accessibility: "Accessibility",
    largeText: "Large Text",
    voiceAlerts: "Voice Alerts",
    simpleLanguage: "Simple Language",
    criticalStationsLabel: "Critical Stations",
    keyContactsLabel: "Key Contacts",
    openSheltersLabel: "Open Shelters",
    lastUpdated: "Last updated",
    shelters: "Shelters",
    resourcesDesc: "Find and navigate to nearby shelters",
    alertCenter: "Alert Center",
    alertsDesc: "Monitor and acknowledge active alerts",
    noAlerts: "No active alerts",
    emergencyContacts: "Emergency Contacts",
    addContact: "Add Contact",
    protocolsTitle: "Emergency Protocols",
    protocolsDesc: "Follow standard operating procedures based on risk levels",
  },

  hi: {
    title: "केदारनाथ बाढ़ प्रबंधन",
    subtitle: "वास्तविक समय निगरानी और आपातकालीन प्रतिक्रिया डैशबोर्ड",

    tabs: {
      dashboard: "डैशबोर्ड",
      waterLevels: "जल स्तर",
      prediction: "एआई पूर्वानुमान",
      report: "रिपोर्ट करें",
      alerts: "अलर्ट",
      contacts: "संपर्क",
      protocols: "प्रोटोकॉल",
      resources: "संसाधन",
    },

    stats: {
      activeAlerts: "सक्रिय अलर्ट",
      criticalStations: "गंभीर स्टेशन",
      keyContacts: "मुख्य संपर्क",
      openShelters: "खुले आश्रय",
    },

    filters: {
      all: "सभी",
      critical: "गंभीर",
      warning: "चेतावनी",
      info: "सूचना",
    },

    mapTitle: "केदारनाथ बाढ़ जोखिम मानचित्र",
    mapDesc: "एआई-आधारित वास्तविक समय बाढ़ जोखिम दृश्य",

    predictBtn: "जोखिम विश्लेषण शुरू करें",
    loading: "वास्तविक समय डेटा का विश्लेषण...",
    aiPredictionCore: "एआई पूर्वानुमान कोर",
    aiModelDesc: "केदारनाथ विशिष्ट मॉडल (GRU + TCN + XGBoost)",
    riverLevel: "नदी स्तर (वर्ग किमी)",
    rainfall: "वर्षा (मिमी)",
    speakValues: "मान बोलें (जैसे '1.5 और 12')",
    stopListening: "सुनना बंद करें",
    riskDetected: "जोखिम का पता चला",
    location: "स्थान",
    floodProbability: "बाढ़ की संभावना",
    callNow: "अभी कॉल करें",
    broadcastAlert: "अलर्ट प्रसारित करें",
    acknowledged: "स्वीकृत",
    cancel: "रद्द करें",
    saveAlert: "अलर्ट सहेजें",
    saveContact: "संपर्क सहेजें",
    addNewAlert: "नया अलर्ट जोड़ें",
    addNewContact: "नया संपर्क जोड़ें",
    alertTitle: "अलर्ट शीर्षक",
    type: "प्रकार",
    name: "नाम",
    role: "भूमिका / विभाग",
    contactNumber: "संपर्क नंबर",
    normalLevel: "सामान्य स्तर",
    warningLevel: "चेतावनी स्तर",
    criticalLevel: "गंभीर स्तर",
    occupancy: "अधिभोग",
    navigateToShelter: "आश्रय के लिए नेविगेट करें",
    mapInstructions: "दिशा-निर्देशों के लिए किसी आश्रय पर क्लिक करें या 'निकटतम आश्रय' का उपयोग करें",
    navigate: "निकटतम आश्रय के लिए नेविगेट करें",
    accessibility: "पहुंचनीयता",
    largeText: "बड़ा टेक्स्ट",
    voiceAlerts: "वॉयस अलर्ट",
    simpleLanguage: "सरल भाषा",
    criticalStationsLabel: "गंभीर स्टेशन",
    keyContactsLabel: "मुख्य संपर्क",
    openSheltersLabel: "खुले आश्रय",
    lastUpdated: "अंतिम अपडेट",
    shelters: "आश्रय",
    resourcesDesc: "निकटवर्ती आश्रय खोजें और नेविगेट करें",
    alertCenter: "अलर्ट केंद्र",
    alertsDesc: "सक्रिय अलर्ट की निगरानी और स्वीकृति करें",
    noAlerts: "कोई सक्रिय अलर्ट नहीं",
    emergencyContacts: "आपातकालीन संपर्क",
    addContact: "संपर्क जोड़ें",
    protocolsTitle: "आपातकालीन प्रोटोकॉल",
    protocolsDesc: "जोखिम स्तर के आधार पर मानक संचालन प्रक्रियाओं का पालन करें",
  },
};

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

  const [lang, setLang] = useState<"en" | "hi">("en");
  const text = translations[lang];

  const tabs = [
    { id: "dashboard", label: text.tabs.dashboard, icon: MapPin },
    { id: "water-levels", label: text.tabs.waterLevels, icon: Activity },
    { id: "prediction", label: text.tabs.prediction, icon: Shield },
    { id: "report", label: text.tabs.report, icon: FileText },
    { id: "alerts", label: text.tabs.alerts, icon: AlertTriangle },
    { id: "contacts", label: text.tabs.contacts, icon: Phone },
    { id: "protocols", label: text.tabs.protocols, icon: ClipboardList },
    { id: "resources", label: text.tabs.resources, icon: Home },
  ];
  const navigate = useNavigate();
  const { largeText, voiceAlerts, simpleLanguage, setLargeText, setVoiceAlerts, setSimpleLanguage } = useAccessibility();
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

  // Voice input for prediction fields
  const { isListening, toggle: toggleMic, isSupported: micSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      // Parse spoken numbers for river level / rainfall
      const nums = transcript.match(/[\d.]+/g);
      if (nums && nums.length >= 2) {
        setRiverLevel(nums[0]);
        setRainfall(nums[1]);
      } else if (nums && nums.length === 1) {
        if (!riverLevel) setRiverLevel(nums[0]);
        else setRainfall(nums[0]);
      }
    },
  });

  const handlePredict = async () => {
    if (!riverLevel || !rainfall) {
      alert(lang === "hi" ? "कृपया दोनों मान दर्ज करें" : "Please enter both values.");
      return;
    }
    setLoading(true);
    setPredictionResult(null);

    try {
      const result = await predictKedarnath(parseFloat(riverLevel), parseFloat(rainfall));
      const enriched = {
        ...result,
        flood_probability: (Math.max(result.gru_forecast, result.tcn_forecast) * 100).toFixed(1),
      };
      setPredictionResult(enriched);
      setKedarnathRisk(enriched);
    } catch (err: any) {
      console.error("Prediction API error:", err);
      // Fallback to local simulation if backend is unavailable
      const simulatedResult = {
        alert_level: parseFloat(riverLevel) > 7 || parseFloat(rainfall) > 20 ? "HIGH" : "LOW",
        flood_probability: Math.min(100, (parseFloat(riverLevel) * 8 + parseFloat(rainfall) * 2)).toFixed(1),
        location: lang === "hi" ? "केदारनाथ घाटी" : "Kedarnath Valley",
      };
      setPredictionResult(simulatedResult);
      setKedarnathRisk(simulatedResult);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlertObject = { 
      id: Date.now(), 
      ...newAlert, 
      time: lang === "hi" ? "अभी" : "Just now", 
      acknowledged: false 
    };
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
      alert(lang === "hi" ? "मार्ग की गणना हो गई! दिशा-निर्देश मानचित्र पर भेज दिए गए हैं।" : "Route calculated! Directions sent to map.");
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
      <div className="flex items-center justify-between">

        {/* ✅ LEFT SIDE */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{text.title}</h1>
            <p className="text-sm text-muted-foreground">
              {text.subtitle}
            </p>
          </div>
        </div>

        {/* ✅ RIGHT SIDE (THIS IS WHAT YOU WANT) */}
        <div className="flex items-center gap-3">

          {/* Accessibility */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Accessibility className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              {/* content */}
            </PopoverContent>
          </Popover>

          {/* Live */}
          <LiveIndicator />

          {/* Language Toggle */}
          <div className="flex bg-secondary rounded-full p-1">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                lang === "en" ? "bg-primary text-white" : "text-muted-foreground"
              }`}
            >
              ENG
            </button>

            <button
              onClick={() => setLang("hi")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                lang === "hi" ? "bg-green-500 text-white" : "text-muted-foreground"
              }`}
            >
              हिंदी
            </button>
          </div>

        </div>

      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">

        {/* ✅ TABS NOW HERE */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

  {/* Dashboard Tab */}
  {activeTab === "dashboard" && (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{text.stats.activeAlerts}</p>
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
                      <p className="text-sm text-muted-foreground">{text.criticalStationsLabel}</p>
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
                      <p className="text-sm text-muted-foreground">{text.keyContactsLabel}</p>
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
                      <p className="text-sm text-muted-foreground">{text.openSheltersLabel}</p>
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
                  <h3>{text.mapTitle}</h3>
                  <p>{text.mapDesc}</p>
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
                  <p className="text-xs text-muted-foreground">{text.lastUpdated}: {station.lastUpdated}</p>
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
                    {text.aiPredictionCore}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {text.aiModelDesc}
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="riverLevel">{text.riverLevel}</Label>
                      <div className="relative">
                        <Waves className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input
                          id="riverLevel"
                          type="number"
                          placeholder={lang === "hi" ? "उदा. 1.5" : "e.g. 1.5"}
                          value={riverLevel}
                          onChange={(e) => setRiverLevel(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rainfall">{text.rainfall}</Label>
                      <div className="relative">
                        <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input
                          id="rainfall"
                          type="number"
                          placeholder={lang === "hi" ? "उदा. 12.0" : "e.g. 12.0"}
                          value={rainfall}
                          onChange={(e) => setRainfall(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handlePredict} disabled={loading} className="w-full">
                    {loading ? text.loading : text.predictBtn}
                  </Button>

                  {micSupported && (
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      onClick={toggleMic}
                      className="w-full"
                    >
                      {isListening ? (
                        <><MicOff className="w-4 h-4 mr-2" /> {text.stopListening}</>
                      ) : (
                        <><Mic className="w-4 h-4 mr-2" /> {text.speakValues}</>
                      )}
                    </Button>
                  )}

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
                            {predictionResult.alert_level === "HIGH" 
                              ? (lang === "hi" ? "उच्च जोखिम का पता चला" : "HIGH RISK DETECTED")
                              : (lang === "hi" ? "कम जोखिम का पता चला" : "LOW RISK DETECTED")}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {text.location}: <strong>{predictionResult.location}</strong>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {text.floodProbability}: <strong>{predictionResult.flood_probability}%</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report Tab */}
          {activeTab === "report" && <CitizenReportTab />}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2>{text.alertCenter}</h2>
                  <p>{text.alertsDesc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setIsAddAlertModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {text.broadcastAlert}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{text.noAlerts}</p>
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
                            <Check className="w-3 h-3" /> {text.acknowledged}
                          </span>
                        ) : (
                          <Button onClick={() => acknowledgeAlert(alert.id)}>{text.acknowledged}</Button>
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
              <h2 className="text-xl font-bold text-foreground">{text.emergencyContacts}</h2>
              <Button onClick={() => setIsAddContactModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {text.addContact}
              </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="glass-card p-5 text-center">
                    <h3 className="font-semibold text-foreground mb-1">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{contact.role}</p>
                    <p className="text-2xl font-bold text-primary mb-4">{contact.contact}</p>
                    <Button className="w-full">{text.callNow}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Protocols Tab */}
          {activeTab === "protocols" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <h2>{text.protocolsTitle}</h2>
                <p>{text.protocolsDesc}</p>
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
                          {category === "normal" ? text.normalLevel : category === "warning" ? text.warningLevel : text.criticalLevel}
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

            {/* Shelter Navigation */}
            {activeTab === "resources" && (
            <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{text.shelters}</h2>
              <p className="text-sm text-muted-foreground">{text.resourcesDesc}</p>
              <h3 className="text-lg font-semibold text-foreground mt-4">{text.navigate}</h3>
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
                    <span>{text.occupancy}</span>
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
                  <RiskBadge level={isFull ? "critical" : "low"}>
                    {resource.status === "Open" ? (lang === "hi" ? "खुला" : "Open") : (lang === "hi" ? "भरा हुआ" : "Full")}
                  </RiskBadge>
                  </div>
                </div>
                );
              })}
              </div>

              {/* Shelter Route Map */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Route className="w-5 h-5 text-primary" /> {text.navigateToShelter}
                  </h3>
                  <p className="text-sm text-muted-foreground">{text.mapInstructions}</p>
                </div>
                <div className="h-[400px]">
                  <ShelterRouteMap shelters={KEDARNATH_SHELTERS} center={[30.735, 79.066]} zoom={13} />
                </div>
              </div>
            </div>
          )}
      </main>

      {/* Add Alert Modal */}
      <Dialog open={isAddAlertModalOpen} onOpenChange={setIsAddAlertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.addNewAlert}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAlert} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-title">{text.alertTitle}</Label>
              <Input
                id="alert-title"
                value={newAlert.title}
                onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-location">{text.location}</Label>
              <Input
                id="alert-location"
                value={newAlert.location}
                onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-type">{text.type}</Label>
              <select
                id="alert-type"
                value={newAlert.type}
                onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="info">{lang === "hi" ? "सूचना" : "Info"}</option>
                <option value="warning">{lang === "hi" ? "चेतावनी" : "Warning"}</option>
                <option value="critical">{lang === "hi" ? "गंभीर" : "Critical"}</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddAlertModalOpen(false)}>
                {text.cancel}
              </Button>
              <Button type="submit">{text.saveAlert}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.addNewContact}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">{text.name}</Label>
              <Input
                id="contact-name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">{text.role}</Label>
              <Input
                id="contact-role"
                value={newContact.role}
                onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-number">{text.contactNumber}</Label>
              <Input
                id="contact-number"
                value={newContact.contact}
                onChange={(e) => setNewContact({ ...newContact, contact: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddContactModalOpen(false)}>
                {text.cancel}
              </Button>
              <Button type="submit">{text.saveContact}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}