import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  MapPin,
  Users,
  Clock,
  Flame,
  HeartPulse,
  Radio,
  CheckCircle2,
  ArrowUpDown,
  Siren,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ResourceAvailability } from "@/components/emergency/ResourceAvailability";
import { ShelterCapacityTracker } from "@/components/emergency/ShelterCapacityTracker";
import { AlertTimeline } from "@/components/emergency/AlertTimeline";


/* ── Mock distress reports with AI-assigned priority ── */
interface DistressReport {
  id: string;
  message: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  sentiment: "panic" | "urgent" | "moderate" | "calm";
  aiPriority: number; // 0–100
  status: "new" | "acknowledged" | "dispatched" | "resolved";
  peopleAffected: number;
}

const MOCK_REPORTS: DistressReport[] = [
  {
    id: "DR-001",
    message: "Water rising rapidly, children trapped on the first floor! Please send help immediately!",
    location: "Sector 7, Mandakini Colony",
    lat: 30.735,
    lng: 79.067,
    timestamp: "2 min ago",
    sentiment: "panic",
    aiPriority: 97,
    status: "new",
    peopleAffected: 12,
  },
  {
    id: "DR-002",
    message: "Elderly couple stranded on rooftop, need medical assistance. Man has heart condition.",
    location: "Gauri Kund Road",
    lat: 30.656,
    lng: 79.091,
    timestamp: "8 min ago",
    sentiment: "urgent",
    aiPriority: 89,
    status: "new",
    peopleAffected: 2,
  },
  {
    id: "DR-003",
    message: "Road washed away near bridge, 3 vehicles stuck. No injuries yet but water is rising.",
    location: "NH-107, KM 42",
    lat: 30.72,
    lng: 79.05,
    timestamp: "15 min ago",
    sentiment: "urgent",
    aiPriority: 74,
    status: "acknowledged",
    peopleAffected: 8,
  },
  {
    id: "DR-004",
    message: "Landslide blocked the evacuation route. We need an alternate path.",
    location: "Triyuginarayan Bypass",
    lat: 30.68,
    lng: 79.02,
    timestamp: "22 min ago",
    sentiment: "moderate",
    aiPriority: 65,
    status: "dispatched",
    peopleAffected: 30,
  },
  {
    id: "DR-005",
    message: "Power lines down in our area. No flooding yet, but concerned about safety.",
    location: "Sonprayag Market",
    lat: 30.63,
    lng: 79.07,
    timestamp: "35 min ago",
    sentiment: "calm",
    aiPriority: 38,
    status: "acknowledged",
    peopleAffected: 50,
  },
  {
    id: "DR-006",
    message: "Temple premises flooded, pilgrims unable to leave. Food supplies running low.",
    location: "Kedarnath Temple Area",
    lat: 30.7346,
    lng: 79.0669,
    timestamp: "5 min ago",
    sentiment: "panic",
    aiPriority: 93,
    status: "new",
    peopleAffected: 45,
  },
];

/* ── Mock teams ── */
interface Team {
  id: string;
  name: string;
  status: "available" | "deployed" | "returning";
  members: number;
  assignedTo?: string;
}

const MOCK_TEAMS: Team[] = [
  { id: "T1", name: "Alpha Squad", status: "deployed", members: 6, assignedTo: "DR-001" },
  { id: "T2", name: "Bravo Unit", status: "deployed", members: 8, assignedTo: "DR-004" },
  { id: "T3", name: "Charlie Medics", status: "available", members: 4 },
  { id: "T4", name: "Delta Divers", status: "returning", members: 5 },
  { id: "T5", name: "Echo Rescue", status: "available", members: 7 },
];

/* ── Heatmap grid (simplified) ── */
interface HeatCell {
  row: number;
  col: number;
  intensity: number; // 0-1
  label: string;
}

const GRID_ROWS = 6;
const GRID_COLS = 8;

function generateHeatmap(reports: DistressReport[]): HeatCell[] {
  const cells: HeatCell[] = [];
  const labels = [
    "Kedarnath Temple", "Mandakini Basin", "Gauri Kund", "Sonprayag",
    "Triyuginarayan", "Rambara", "Jungle Chatti", "Lincholi",
    "Gaurikund Rd", "NH-107 South", "Phata", "Guptkashi",
    "Ukhimath", "Chopta", "Kalimath", "Agastyamuni",
    "Rudraprayag", "Srinagar", "Devprayag", "Tilwara",
    "NH-107 North", "Sitapur", "Ransi", "Chandrapuri",
    "Kund", "Banswara", "Mayali", "Narayankoti",
    "Jakholi", "Okhimath Rd", "Mansuna", "Byung",
    "Madhyamaheshwar", "Deoria Tal", "Tungnath", "Chandrashila",
    "Bisurital", "Panch Kedar", "Kalpeshwar", "Mandal",
    "Gopeshwar", "Chamoli", "Joshimath", "Pipalkoti",
    "Helang", "Urgam Valley", "Niti Valley", "Malari",
  ];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const idx = r * GRID_COLS + c;
      // weight intensity around known report locations
      let intensity = Math.random() * 0.25;
      if (idx <= 3) intensity += 0.4 + Math.random() * 0.35; // near Kedarnath
      else if (idx <= 7) intensity += 0.15 + Math.random() * 0.25;
      cells.push({ row: r, col: c, intensity: Math.min(intensity, 1), label: labels[idx] || `Zone ${idx}` });
    }
  }
  return cells;
}

/* ── Helpers ── */
const sentimentColor: Record<string, string> = {
  panic: "bg-[hsl(var(--risk-critical))] text-white",
  urgent: "bg-[hsl(var(--risk-high))] text-white",
  moderate: "bg-[hsl(var(--risk-moderate))] text-black",
  calm: "bg-[hsl(var(--risk-low))] text-white",
};

const statusColor: Record<string, string> = {
  new: "border-[hsl(var(--risk-critical))]/60 bg-[hsl(var(--risk-critical))]/10",
  acknowledged: "border-[hsl(var(--risk-high))]/40 bg-[hsl(var(--risk-high))]/5",
  dispatched: "border-primary/40 bg-primary/5",
  resolved: "border-[hsl(var(--risk-low))]/40 bg-[hsl(var(--risk-low))]/5",
};

function priorityBar(score: number) {
  if (score >= 80) return "bg-[hsl(var(--risk-critical))]";
  if (score >= 60) return "bg-[hsl(var(--risk-high))]";
  if (score >= 40) return "bg-[hsl(var(--risk-moderate))]";
  return "bg-[hsl(var(--risk-low))]";
}

function heatColor(intensity: number) {
  if (intensity > 0.7) return "bg-[hsl(var(--risk-critical))]/80";
  if (intensity > 0.5) return "bg-[hsl(var(--risk-high))]/70";
  if (intensity > 0.3) return "bg-[hsl(var(--risk-moderate))]/50";
  if (intensity > 0.1) return "bg-[hsl(var(--risk-low))]/30";
  return "bg-secondary/40";
}

export default function FirstResponderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [sortBy, setSortBy] = useState<"priority" | "time">("priority");
  const heatmap = useMemo(() => generateHeatmap(reports), []);

  const sortedReports = useMemo(() => {
    const copy = [...reports];
    if (sortBy === "priority") copy.sort((a, b) => b.aiPriority - a.aiPriority);
    return copy;
  }, [reports, sortBy]);

  const stats = useMemo(() => ({
    total: reports.length,
    critical: reports.filter((r) => r.aiPriority >= 80).length,
    pending: reports.filter((r) => r.status === "new").length,
    deployed: MOCK_TEAMS.filter((t) => t.status === "deployed").length,
    available: MOCK_TEAMS.filter((t) => t.status === "available").length,
  }), [reports]);

  const handleAcknowledge = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id && r.status === "new" ? { ...r, status: "acknowledged" as const } : r))
    );
    toast({ title: "Report Acknowledged", description: `${id} marked as acknowledged.` });
  };

  const handleDispatch = (id: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id && (r.status === "new" || r.status === "acknowledged")
          ? { ...r, status: "dispatched" as const }
          : r
      )
    );
    toast({ title: "Team Dispatched", description: `Rescue team dispatched to ${id}.` });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Reports", value: stats.total, icon: AlertTriangle, cls: "text-foreground" },
            { label: "Critical", value: stats.critical, icon: Flame, cls: "text-[hsl(var(--risk-critical))]" },
            { label: "Pending", value: stats.pending, icon: Clock, cls: "text-[hsl(var(--risk-high))]" },
            { label: "Teams Deployed", value: stats.deployed, icon: Siren, cls: "text-primary" },
            { label: "Teams Available", value: stats.available, icon: Users, cls: "text-[hsl(var(--risk-low))]" },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="relative overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`w-8 h-8 shrink-0 ${s.cls}`} />
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Distress Reports (2 cols) ── */}
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="h-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HeartPulse className="w-5 h-5 text-[hsl(var(--risk-critical))]" />
                  AI-Prioritized Distress Reports
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortBy(sortBy === "priority" ? "time" : "priority")}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                  {sortBy === "priority" ? "By Priority" : "By Time"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
                {sortedReports.map((report, i) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`p-4 rounded-xl border ${statusColor[report.status]} transition-all`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{report.id}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${sentimentColor[report.sentiment]}`}>
                          {report.sentiment.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {report.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{report.timestamp}</span>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-foreground leading-relaxed mb-2">{report.message}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {report.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {report.peopleAffected} affected
                      </span>
                    </div>

                    {/* AI Priority bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold text-muted-foreground w-20">AI Priority</span>
                      <div className="flex-1 relative">
                        <Progress value={report.aiPriority} className="h-2" />
                        <div
                          className={`absolute inset-0 h-2 rounded-full ${priorityBar(report.aiPriority)}`}
                          style={{ width: `${report.aiPriority}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-foreground w-8 text-right">{report.aiPriority}</span>
                    </div>

                    {/* Actions */}
                    {report.status !== "resolved" && (
                      <div className="flex gap-2">
                        {report.status === "new" && (
                          <Button size="sm" variant="outline" onClick={() => handleAcknowledge(report.id)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Acknowledge
                          </Button>
                        )}
                        {(report.status === "new" || report.status === "acknowledged") && (
                          <Button size="sm" onClick={() => handleDispatch(report.id)}>
                            <Siren className="w-3.5 h-3.5 mr-1" /> Dispatch Team
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Right sidebar ── */}
          <div className="space-y-6">
            {/* Incident Heatmap */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="w-5 h-5 text-[hsl(var(--risk-high))]" />
                    Incident Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
                    {heatmap.map((cell, i) => (
                      <div
                        key={i}
                        title={`${cell.label} — ${Math.round(cell.intensity * 100)}% risk`}
                        className={`aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110 ${heatColor(cell.intensity)}`}
                      />
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                    <span>Low</span>
                    <div className="flex gap-0.5">
                      {["bg-secondary/40", "bg-[hsl(var(--risk-low))]/30", "bg-[hsl(var(--risk-moderate))]/50", "bg-[hsl(var(--risk-high))]/70", "bg-[hsl(var(--risk-critical))]/80"].map((c) => (
                        <div key={c} className={`w-4 h-2 rounded-sm ${c}`} />
                      ))}
                    </div>
                    <span>Critical</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Resource Availability */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <ResourceAvailability />
            </motion.div>

            {/* Response Teams */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Radio className="w-5 h-5 text-primary" />
                    Response Teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {MOCK_TEAMS.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {team.members} members
                          {team.assignedTo && ` · ${team.assignedTo}`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          team.status === "available"
                            ? "border-[hsl(var(--risk-low))] text-[hsl(var(--risk-low))]"
                            : team.status === "deployed"
                            ? "border-primary text-primary"
                            : "border-[hsl(var(--risk-moderate))] text-[hsl(var(--risk-moderate))]"
                        }
                      >
                        {team.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Shelter Capacity + Alert Timeline */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ShelterCapacityTracker />
          <AlertTimeline />
        </div>
      </main>
    </div>
  );
}
