import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Settings, Users, ShieldCheck, Activity, Server,
  Database, Cpu, HardDrive, RefreshCw, Search,
  ChevronDown, MoreHorizontal, CheckCircle2, XCircle, Clock,
  UserPlus
} from "lucide-react";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ROLE_OPTIONS, type UserRole } from "@/lib/roles";

/* ── mock data ── */
const systemServices = [
  { name: "API Gateway", status: "healthy", uptime: "99.97%", latency: "42ms", icon: Server },
  { name: "Database", status: "healthy", uptime: "99.99%", latency: "8ms", icon: Database },
  { name: "AI Inference", status: "degraded", uptime: "98.2%", latency: "320ms", icon: Cpu },
  { name: "IoT Ingestion", status: "healthy", uptime: "99.91%", latency: "15ms", icon: HardDrive },
  { name: "Auth Service", status: "healthy", uptime: "100%", latency: "12ms", icon: ShieldCheck },
  { name: "Notification Hub", status: "down", uptime: "94.5%", latency: "—", icon: Activity },
];

const mockUsers = [
  { id: "u1", name: "Aarav Sharma", email: "aarav@example.com", role: "citizen" as UserRole, lastActive: "2 min ago", status: "online" },
  { id: "u2", name: "Priya Verma", email: "priya@example.com", role: "first_responder" as UserRole, lastActive: "15 min ago", status: "online" },
  { id: "u3", name: "Ravi Kumar", email: "ravi@example.com", role: "govt_official" as UserRole, lastActive: "1 hr ago", status: "offline" },
  { id: "u4", name: "Sneha Patel", email: "sneha@example.com", role: "control_room" as UserRole, lastActive: "5 min ago", status: "online" },
  { id: "u5", name: "Amit Gupta", email: "amit@example.com", role: "admin" as UserRole, lastActive: "Just now", status: "online" },
  { id: "u6", name: "Neha Singh", email: "neha@example.com", role: "citizen" as UserRole, lastActive: "3 hrs ago", status: "offline" },
  { id: "u7", name: "Karan Joshi", email: "karan@example.com", role: "first_responder" as UserRole, lastActive: "30 min ago", status: "online" },
  { id: "u8", name: "Divya Rao", email: "divya@example.com", role: "citizen" as UserRole, lastActive: "1 day ago", status: "offline" },
];

const auditLog = [
  { time: "14:32", user: "Amit Gupta", action: "Changed role of Ravi Kumar to government", type: "role_change" },
  { time: "14:15", user: "System", action: "Notification Hub service went down", type: "system" },
  { time: "13:58", user: "Priya Verma", action: "Acknowledged 3 distress reports", type: "action" },
  { time: "13:40", user: "Amit Gupta", action: "Restarted AI Inference service", type: "system" },
  { time: "12:22", user: "System", action: "AI Inference latency exceeded threshold (>500ms)", type: "alert" },
  { time: "11:05", user: "Sneha Patel", action: "Dispatched Team Bravo to Zone C", type: "action" },
];

const serviceStatusStyle: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-400 border-green-500/30",
  degraded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  down: "bg-red-500/20 text-red-400 border-red-500/30",
};

const auditTypeIcon: Record<string, typeof Settings> = {
  role_change: ShieldCheck,
  system: Server,
  action: CheckCircle2,
  alert: XCircle,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("health");
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { toast } = useToast();

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    const user = users.find((u) => u.id === userId);
    toast({
      title: "Role updated",
      description: `${user?.name}'s role changed to ${ROLE_OPTIONS.find((r) => r.value === newRole)?.label}`,
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = [
    { label: "Total Users", value: users.length.toString(), icon: Users, accent: "text-primary" },
    { label: "Online Now", value: users.filter((u) => u.status === "online").length.toString(), icon: Activity, accent: "text-green-400" },
    { label: "Services Healthy", value: `${systemServices.filter((s) => s.status === "healthy").length}/${systemServices.length}`, icon: Server, accent: "text-primary" },
    { label: "Incidents Today", value: "2", icon: XCircle, accent: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              System health, user management & audit trail
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate("/admin/create-user")}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
            <LiveIndicator />
          </div>
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
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* ── System Health ── */}
          <TabsContent value="health" className="mt-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {systemServices.map((svc, i) => (
                <motion.div key={svc.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border/50 bg-card/80">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svc.icon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-semibold text-foreground text-sm">{svc.name}</span>
                        </div>
                        <Badge variant="outline" className={serviceStatusStyle[svc.status]}>
                          {svc.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Uptime</p>
                          <p className="font-bold text-foreground">{svc.uptime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Latency</p>
                          <p className="font-bold text-foreground">{svc.latency}</p>
                        </div>
                      </div>
                      {svc.status !== "healthy" && (
                        <Button size="sm" variant="outline" className="w-full mt-3 text-xs gap-1.5">
                          <RefreshCw className="w-3 h-3" /> Restart Service
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Resource usage */}
            <Card className="border-border/50 bg-card/80 mt-6">
              <CardHeader>
                <CardTitle className="text-base">Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "CPU", value: 62 },
                  { label: "Memory", value: 74 },
                  { label: "Storage", value: 41 },
                  { label: "Network I/O", value: 38 },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-medium text-foreground">{r.value}%</span>
                    </div>
                    <Progress value={r.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── User Management ── */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => navigate("/admin/create-user")}
                  variant="outline"
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  New User
                </Button>
              </div>
            </div>

            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${user.status === "online" ? "bg-green-400" : "bg-muted-foreground/40"}`} />
                        <div>
                          <p className="font-medium text-foreground text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {user.lastActive}
                        </span>
                        <Select
                          value={user.role}
                          onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">No users found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audit Log ── */}
          <TabsContent value="audit" className="mt-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Today's Activity</CardTitle>
                <CardDescription>Recent system and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditLog.map((entry, i) => {
                    const Icon = auditTypeIcon[entry.type] || Activity;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{entry.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.user} · {entry.time}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}