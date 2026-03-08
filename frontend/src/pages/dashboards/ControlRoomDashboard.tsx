import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Radio, MapPin, Users, AlertTriangle, Phone, Clock,
  Navigation, CheckCircle2, XCircle, Siren, Send,
  MessageSquare, ChevronRight
} from "lucide-react";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ResourceAvailability } from "@/components/emergency/ResourceAvailability";
import { ShelterCapacityTracker } from "@/components/emergency/ShelterCapacityTracker";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── mock data ── */
const rescueTeams = [
  { id: "T1", name: "Alpha", status: "deployed", zone: "Kedarnath Temple", members: 8, lat: 30.7346, lng: 79.0669, progress: 65 },
  { id: "T2", name: "Bravo", status: "deployed", zone: "Mandakini Basin", members: 6, lat: 30.7150, lng: 79.0750, progress: 40 },
  { id: "T3", name: "Charlie", status: "standby", zone: "Base Camp", members: 10, lat: 30.7400, lng: 79.0500, progress: 0 },
  { id: "T4", name: "Delta", status: "deployed", zone: "Gaurikund", members: 7, lat: 30.6567, lng: 79.0000, progress: 80 },
  { id: "T5", name: "Echo", status: "returning", zone: "Sonprayag", members: 5, lat: 30.6283, lng: 79.0650, progress: 95 },
  { id: "T6", name: "Foxtrot", status: "standby", zone: "Base Camp", members: 9, lat: 30.7410, lng: 79.0520, progress: 0 },
];

const activeIncidents = [
  { id: "INC-001", type: "Landslide", location: "Kedarnath Route KM-12", severity: "critical", time: "14:32", assigned: "Alpha", casualties: 3, trapped: 8 },
  { id: "INC-002", type: "Flash Flood", location: "Mandakini River Bridge", severity: "critical", time: "14:15", assigned: "Bravo", casualties: 0, trapped: 15 },
  { id: "INC-003", type: "Structure Collapse", location: "Gaurikund Market", severity: "high", time: "13:50", assigned: "Delta", casualties: 1, trapped: 4 },
  { id: "INC-004", type: "Stranded Pilgrims", location: "Bhimbali Trail", severity: "medium", time: "13:22", assigned: "Unassigned", casualties: 0, trapped: 22 },
  { id: "INC-005", type: "Road Blockage", location: "Sonprayag Highway", severity: "low", time: "12:45", assigned: "Echo", casualties: 0, trapped: 0 },
];

const commsLog = [
  { time: "14:35", from: "Alpha Lead", msg: "8 trapped under debris near temple. Need heavy equipment.", priority: "urgent" },
  { time: "14:28", from: "Bravo Lead", msg: "Bridge partially collapsed. 15 civilians on far side. Requesting inflatable boats.", priority: "urgent" },
  { time: "14:20", from: "Control", msg: "Helicopter ETA 25 minutes to Kedarnath. Confirm LZ coordinates.", priority: "normal" },
  { time: "14:12", from: "Delta Lead", msg: "4 trapped in market collapse. 1 casualty confirmed. Medical team on site.", priority: "urgent" },
  { time: "14:05", from: "Echo Lead", msg: "Road cleared at Sonprayag. Returning to base.", priority: "normal" },
  { time: "13:55", from: "Control", msg: "All teams: Weather update — heavy rain expected in 2 hours. Expedite operations.", priority: "alert" },
];

const severityStyle: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const teamStatusStyle: Record<string, string> = {
  deployed: "bg-red-500/20 text-red-400 border-red-500/30",
  standby: "bg-green-500/20 text-green-400 border-green-500/30",
  returning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const priorityStyle: Record<string, string> = {
  urgent: "border-l-red-500",
  alert: "border-l-yellow-500",
  normal: "border-l-primary",
};

export default function ControlRoomDashboard() {
  const [selectedTab, setSelectedTab] = useState("map");
  const [message, setMessage] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedTab !== "map" || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [30.7000, 79.0500],
      zoom: 11,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    // Team markers
    rescueTeams.forEach((team) => {
      const color = team.status === "deployed" ? "#ef4444" : team.status === "returning" ? "#eab308" : "#22c55e";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${team.name[0]}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([team.lat, team.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>Team ${team.name}</b><br/>Status: ${team.status}<br/>Zone: ${team.zone}<br/>Members: ${team.members}`);
    });

    // Incident markers
    activeIncidents.filter((_, i) => i < 3).forEach((inc, i) => {
      const lats = [30.735, 30.715, 30.657];
      const lngs = [79.067, 79.075, 79.000];
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#ef4444;width:24px;height:24px;border-radius:4px;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([lats[i], lngs[i]], { icon })
        .addTo(map)
        .bindPopup(`<b>${inc.type}</b><br/>${inc.location}<br/>Trapped: ${inc.trapped}`);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [selectedTab]);

  // Invalidate map size on tab switch
  useEffect(() => {
    if (selectedTab === "map" && mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    }
  }, [selectedTab]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    toast({ title: "Message sent", description: `Broadcast: "${message}"` });
    setMessage("");
  };

  const stats = [
    { label: "Active Incidents", value: activeIncidents.filter((i) => i.severity === "critical" || i.severity === "high").length.toString(), icon: Siren, accent: "text-destructive" },
    { label: "Teams Deployed", value: rescueTeams.filter((t) => t.status === "deployed").length.toString(), icon: Navigation, accent: "text-primary" },
    { label: "People Trapped", value: activeIncidents.reduce((sum, i) => sum + i.trapped, 0).toString(), icon: AlertTriangle, accent: "text-yellow-400" },
    { label: "Teams on Standby", value: rescueTeams.filter((t) => t.status === "standby").length.toString(), icon: Users, accent: "text-green-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Radio className="w-6 h-6 text-primary" />
              Control Room
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live rescue coordination, team tracking & incident management
            </p>
          </div>
          <LiveIndicator />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.accent}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="map">Live Map</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="comms">Comms</TabsTrigger>
          </TabsList>

          {/* ── Live Map ── */}
          <TabsContent value="map" className="mt-4">
            <Card className="border-border/50 bg-card/80 overflow-hidden">
              <div ref={mapRef} className="h-[500px] w-full" />
            </Card>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Deployed</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Returning</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Standby</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Incident</span>
            </div>
          </TabsContent>

          {/* ── Incidents ── */}
          <TabsContent value="incidents" className="mt-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Active Incidents</CardTitle>
                <CardDescription>{activeIncidents.length} incidents being tracked</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeIncidents.map((inc) => (
                  <div key={inc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className={severityStyle[inc.severity]}>
                        {inc.severity}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground text-sm">{inc.type}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {inc.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{inc.trapped}</p>
                        <p className="text-[10px] text-muted-foreground">Trapped</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{inc.casualties}</p>
                        <p className="text-[10px] text-muted-foreground">Casualties</p>
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {inc.assigned}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {inc.time}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Teams ── */}
          <TabsContent value="teams" className="mt-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rescueTeams.map((team, i) => (
                <motion.div key={team.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border/50 bg-card/80">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {team.name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">Team {team.name}</p>
                            <p className="text-[10px] text-muted-foreground">{team.members} members</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={teamStatusStyle[team.status]}>
                          {team.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {team.zone}
                      </div>
                      {team.status === "deployed" && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Mission Progress</span>
                            <span className="font-medium text-foreground">{team.progress}%</span>
                          </div>
                          <Progress value={team.progress} className="h-1.5" />
                        </div>
                      )}
                      {team.status === "standby" && (
                        <Button size="sm" variant="outline" className="w-full mt-1 text-xs gap-1.5">
                          <Send className="w-3 h-3" /> Deploy Team
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── Communications ── */}
          <TabsContent value="comms" className="mt-4 space-y-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Field Communications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {commsLog.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`p-3 rounded-lg bg-muted/30 border border-border/30 border-l-4 ${priorityStyle[entry.priority]}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{entry.from}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.msg}</p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Broadcast input */}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Broadcast message to all teams..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} className="gap-1.5">
                    <Send className="w-4 h-4" /> Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Resources + Shelter */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ResourceAvailability />
          <ShelterCapacityTracker />
        </div>
      </main>
    </div>
  );
}
