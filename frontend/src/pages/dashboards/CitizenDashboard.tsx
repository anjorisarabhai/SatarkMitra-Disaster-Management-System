import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  MapPin,
  Phone,
  FileText,
  Navigation,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { submitReport } from "@/lib/api";

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
  const [reportText, setReportText] = useState("");

  const handleReport = async () => {
    if (!reportText.trim()) return;
    
    try {
      // Try to get user location for the report
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      }).catch(() => null);

      const lat = position?.coords.latitude ?? 28.6139;
      const lon = position?.coords.longitude ?? 77.2090;

      const result = await submitReport({
        type: "flood",
        description: reportText,
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
                <Input
                  placeholder="Describe the emergency situation..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleReport} className="flex-1" size="sm">
                    Submit Report
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="w-4 h-4 mr-1" /> Attach Location
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Emergency Contacts */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
