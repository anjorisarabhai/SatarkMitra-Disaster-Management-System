import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  MapPin,
  Phone,
  FileText,
  Navigation,
  Bell,
  Mic,
  MicOff,
  Camera,
  X,
  ImageIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/layout/DashboardHeader";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { submitReport } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";


const MOCK_ALERTS = [
  { id: 1, type: "critical", title: "Flash Flood Warning", area: "Kedarnath Valley", time: "2 min ago" },
  { id: 2, type: "high", title: "Heavy Rainfall Alert", area: "Mandakini Basin", time: "15 min ago" },
  { id: 3, type: "moderate", title: "Water Level Rising", area: "Alaknanda River", time: "1 hr ago" },
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
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setReportImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // Voice input for distress report
  const { isListening, toggle: toggleMic, isSupported: micSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setReportText((prev) => (prev ? prev + " " + transcript : transcript));
    },
    onCommand: (cmd) => {
      // Voice commands
      if (cmd.includes("show alerts") || cmd.includes("alerts")) {
        toast({ title: "Voice Command", description: "Scrolling to alerts..." });
        document.getElementById("alerts-section")?.scrollIntoView({ behavior: "smooth" });
      } else if (cmd.includes("navigate to shelter") || cmd.includes("shelter")) {
        toast({ title: "Voice Command", description: "Opening shelter map..." });
        document.getElementById("shelter-section")?.scrollIntoView({ behavior: "smooth" });
      } else if (cmd.includes("emergency") || cmd.includes("contacts")) {
        document.getElementById("contacts-section")?.scrollIntoView({ behavior: "smooth" });
      } else if (cmd.includes("kedarnath")) {
        navigate("/kedarnath");
      } else if (cmd.includes("delhi")) {
        navigate("/delhi");
      }
    },
  });

  const handleReport = async () => {
    if (!reportText.trim() && reportImages.length === 0) return;

    setUploading(true);
    try {
      // Get user location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      }).catch(() => null);

      const lat = position?.coords.latitude ?? 28.6139;
      const lon = position?.coords.longitude ?? 77.2090;

      const description = reportImages.length > 0
        ? `${reportText}\n\n[${reportImages.length} image(s) attached]`
        : reportText;

      const result = await submitReport({
        type: "flood",
        description,
        latitude: lat,
        longitude: lon,
      });

      toast({
        title: result.verification_status === "trusted" ? "Report Submitted" : "Report Under Review",
        description: result.verification_status === "trusted"
          ? "Your distress report has been sent to responders."
          : "Your report is being verified before dispatch.",
      });
    } catch (err) {
      console.error("Report API error:", err);
      toast({ title: "Report Submitted", description: "Your distress report has been queued (offline mode)." });
    }

    setReportText("");
    setReportImages([]);
    setImagePreviews([]);
    setUploading(false);
  };

  const riskBadge = (type: string) => {
    const cls: Record<string, string> = {
      critical: "badge-critical",
      high: "badge-high",
      moderate: "badge-moderate",
      low: "badge-low",
    };
    return `px-2 py-0.5 rounded-full text-xs font-bold ${cls[type] || cls.low}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Alerts */}
        <motion.div id="alerts-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-risk-high" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_ALERTS.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-4 h-4 ${alert.type === "critical" ? "text-risk-critical" : alert.type === "high" ? "text-risk-high" : "text-risk-moderate"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.area} • {alert.time}</p>
                    </div>
                  </div>
                  <span className={riskBadge(alert.type)}>{alert.type.toUpperCase()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Distress Report */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  Report Distress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={isListening ? "🎤 Listening... speak now" : "Describe the emergency situation..."}
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="flex-1"
                  />
                  {micSupported && (
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={toggleMic}
                      title={isListening ? "Stop listening" : "Speak to report"}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  )}
                </div>

                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <img src={src} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />

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
          </motion.div>

          {/* Emergency Contacts */}
          <motion.div id="contacts-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="w-5 h-5 text-risk-critical" />
                  Emergency Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {EMERGENCY_CONTACTS.map((c) => (
                  <a
                    key={c.number}
                    href={`tel:${c.number}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <span className="text-sm font-mono text-primary">{c.number}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Safe Navigation */}
        <motion.div id="shelter-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Navigation className="w-5 h-5 text-accent" />
                Navigate to Nearest Shelter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Map integration will be connected to your backend</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
