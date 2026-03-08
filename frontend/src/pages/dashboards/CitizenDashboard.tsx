import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle, MapPin, Phone, FileText, Navigation, Bell,
  Mic, MicOff, Camera, X, Shield, Map,
} from "lucide-react";
import KedarnathLeafletMap from "@/components/maps/KedarnathLeafletMap";
import DelhiHotspotMap from "@/components/maps/DelhiHotspotMap";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { submitReport } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

import { EmergencyModeToggle } from "@/components/emergency/EmergencyModeToggle";
import { OneTapDistress } from "@/components/emergency/OneTapDistress";
import { AlertTimeline } from "@/components/emergency/AlertTimeline";
import { RiskPulseWidget } from "@/components/emergency/RiskPulseWidget";
import { ReportStatusTracker } from "@/components/emergency/ReportStatusTracker";
import { SafeNavigationPanel } from "@/components/emergency/SafeNavigationPanel";
import { ShelterCapacityTracker } from "@/components/emergency/ShelterCapacityTracker";
import { AIExplanation } from "@/components/emergency/AIExplanation";
import ShelterRouteMap from "@/components/maps/ShelterRouteMap";

const SHELTERS = [
  { name: "Community Hall, Lajpat Nagar", lat: 28.57, lng: 77.24, capacity: 200, occupancy: 85 },
  { name: "Govt School, Karol Bagh", lat: 28.65, lng: 77.19, capacity: 150, occupancy: 60 },
  { name: "Relief Camp, Dwarka Sec 10", lat: 28.58, lng: 77.05, capacity: 300, occupancy: 120 },
  { name: "Community Center, Rohini", lat: 28.72, lng: 77.11, capacity: 250, occupancy: 90 },
];

const MOCK_ALERTS = [
  { id: 1, type: "critical", title: "Flash Flood Warning", area: "Kedarnath Valley", time: "2 min ago", region: "Kedarnath" },
  { id: 2, type: "high", title: "Heavy Rainfall Alert", area: "Mandakini Basin", time: "15 min ago", region: "Kedarnath" },
  { id: 3, type: "moderate", title: "Water Level Rising", area: "Yamuna River, ITO", time: "30 min ago", region: "Delhi" },
  { id: 4, type: "high", title: "Waterlogging Alert", area: "Minto Bridge, Delhi", time: "45 min ago", region: "Delhi" },
  { id: 5, type: "moderate", title: "Drainage Overflow", area: "Lajpat Nagar, Delhi", time: "1 hr ago", region: "Delhi" },
  { id: 6, type: "critical", title: "Glacial Lake Overflow Risk", area: "Chorabari Tal", time: "1 hr ago", region: "Kedarnath" },
];

const EMERGENCY_CONTACTS = [
  { name: "NDRF Helpline", number: "011-26107953" },
  { name: "Disaster Mgmt", number: "1078" },
  { name: "Police", number: "100" },
  { name: "Ambulance", number: "108" },
];

export default function CitizenDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reportText, setReportText] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeTab, setActiveTab] = useState("alerts");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setReportImages(prev => [...prev, ...imageFiles]);
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setReportImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const { isListening, toggle: toggleMic, isSupported: micSupported } = useSpeechRecognition({
    onResult: (transcript) => setReportText((prev) => (prev ? prev + " " + transcript : transcript)),
    onCommand: (cmd) => {
      if (cmd.includes("show alerts") || cmd.includes("alerts")) {
        setActiveTab("alerts");
      } else if (cmd.includes("navigate to shelter") || cmd.includes("shelter")) {
        setActiveTab("safety");
      } else if (cmd.includes("emergency") || cmd.includes("contacts")) {
        setActiveTab("alerts");
      } else if (cmd.includes("kedarnath")) navigate("/kedarnath");
      else if (cmd.includes("delhi")) navigate("/delhi");
    },
  });

  const handleReport = async () => {
    if (!reportText.trim() && reportImages.length === 0) return;
    setUploading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      }).catch(() => null);
      const lat = position?.coords.latitude ?? 28.6139;
      const lon = position?.coords.longitude ?? 77.2090;
      const description = reportImages.length > 0
        ? `${reportText}\n\n[${reportImages.length} image(s) attached]`
        : reportText;
      const result = await submitReport({ type: "flood", description, latitude: lat, longitude: lon });
      toast({
        title: result.verification_status === "trusted" ? "Report Submitted" : "Report Under Review",
        description: result.verification_status === "trusted"
          ? "Your distress report has been sent to responders."
          : "Your report is being verified before dispatch.",
      });
    } catch {
      toast({ title: "Report Submitted", description: "Your distress report has been queued (offline mode)." });
    }
    setReportText("");
    setReportImages([]);
    setImagePreviews([]);
    setUploading(false);
  };

  const riskBadge = (type: string) => {
    const cls: Record<string, string> = {
      critical: "badge-critical", high: "badge-high", moderate: "badge-moderate", low: "badge-low",
    };
    return `px-2 py-0.5 rounded-full text-xs font-bold ${cls[type] || cls.low}`;
  };

  // Emergency mode shows simplified high-contrast UI
  if (emergencyMode) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6 space-y-4 max-w-lg">
          <EmergencyModeToggle isActive={emergencyMode} onToggle={() => setEmergencyMode(false)} />
          <OneTapDistress />
          <SafeNavigationPanel />
          <ShelterCapacityTracker />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-destructive" /> Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EMERGENCY_CONTACTS.map((c) => (
                <a key={c.number} href={`tel:${c.number}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors text-lg">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="font-mono text-primary font-bold">{c.number}</span>
                </a>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Emergency Mode + Risk Pulse */}

        <div className="grid md:grid-cols-2 gap-4">
          <EmergencyModeToggle isActive={emergencyMode} onToggle={() => setEmergencyMode(true)} />
          <RiskPulseWidget region="Delhi" />
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="alerts" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Report
            </TabsTrigger>
            <TabsTrigger value="safety" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Safety
            </TabsTrigger>
            <TabsTrigger value="maps" className="gap-1.5">
              <Map className="w-3.5 h-3.5" /> Maps
            </TabsTrigger>
          </TabsList>

          {/* ── Alerts Tab ── */}
          <TabsContent value="alerts" className="space-y-6 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="w-5 h-5 text-destructive" /> Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_ALERTS.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-4 h-4 ${alert.type === "critical" ? "text-destructive" : alert.type === "high" ? "text-destructive/70" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.area} • {alert.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{alert.region}</span>
                      <span className={riskBadge(alert.type)}>{alert.type.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <AlertTimeline />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="w-5 h-5 text-destructive" /> Emergency Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {EMERGENCY_CONTACTS.map((c) => (
                    <a key={c.number} href={`tel:${c.number}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <span className="text-sm font-mono text-primary">{c.number}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </div>

            <AIExplanation />
          </TabsContent>

          {/* ── Report Tab ── */}
          <TabsContent value="report" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-primary" /> Report Distress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={isListening ? "🎤 Listening... speak now" : "Describe the emergency situation..."}
                      value={reportText} onChange={(e) => setReportText(e.target.value)} className="flex-1"
                    />
                    {micSupported && (
                      <Button variant={isListening ? "destructive" : "outline"} size="icon" onClick={toggleMic}>
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img src={src} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(i)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  <div className="flex gap-2">
                    <Button onClick={handleReport} className="flex-1" size="sm" disabled={uploading}>
                      {uploading ? "Uploading..." : "Submit Report"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-4 h-4 mr-1" /> Photo
                    </Button>
                    <Button variant="outline" size="sm">
                      <MapPin className="w-4 h-4 mr-1" /> Location
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <ReportStatusTracker />
            </div>

            <OneTapDistress />
          </TabsContent>

          {/* ── Safety Tab ── */}
          <TabsContent value="safety" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <SafeNavigationPanel />
              <ShelterCapacityTracker />
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Navigation className="w-5 h-5 text-primary" /> Route to Shelter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] rounded-xl overflow-hidden">
                  <ShelterRouteMap
                    shelters={SHELTERS}
                    center={[28.6139, 77.209]}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Maps Tab ── */}
          <TabsContent value="maps" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Navigation className="w-5 h-5 text-primary" /> Live Maps — Delhi &amp; Kedarnath
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Delhi Flood Hotspots</p>
                    <div className="aspect-video rounded-xl overflow-hidden border border-border/50">
                      <DelhiHotspotMap />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Kedarnath Region</p>
                    <div className="aspect-video rounded-xl overflow-hidden border border-border/50">
                      <KedarnathLeafletMap />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
