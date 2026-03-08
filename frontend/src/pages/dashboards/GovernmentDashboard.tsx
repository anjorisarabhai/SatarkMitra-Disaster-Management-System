import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Droplets, TrendingUp, AlertTriangle, MapPin,
  Activity, ThermometerSun, Wind, CloudRain, Gauge
} from "lucide-react";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from "recharts";

/* ── mock data ── */
const waterLevelData = [
  { time: "00:00", mandakini: 2.1, alaknanda: 3.4, yamuna: 4.2 },
  { time: "04:00", mandakini: 2.3, alaknanda: 3.6, yamuna: 4.0 },
  { time: "08:00", mandakini: 2.8, alaknanda: 4.1, yamuna: 4.5 },
  { time: "12:00", mandakini: 3.5, alaknanda: 4.8, yamuna: 5.1 },
  { time: "16:00", mandakini: 4.2, alaknanda: 5.3, yamuna: 5.8 },
  { time: "20:00", mandakini: 3.8, alaknanda: 4.9, yamuna: 5.4 },
  { time: "Now", mandakini: 3.6, alaknanda: 4.7, yamuna: 5.2 },
];

const floodProbability = [
  { day: "Today", kedarnath: 72, delhi: 35, haridwar: 48 },
  { day: "Tomorrow", kedarnath: 85, delhi: 42, haridwar: 56 },
  { day: "Day 3", kedarnath: 68, delhi: 38, haridwar: 44 },
  { day: "Day 4", kedarnath: 55, delhi: 30, haridwar: 38 },
  { day: "Day 5", kedarnath: 40, delhi: 25, haridwar: 30 },
  { day: "Day 6", kedarnath: 32, delhi: 20, haridwar: 24 },
  { day: "Day 7", kedarnath: 28, delhi: 18, haridwar: 20 },
];

const rainfallForecast = [
  { day: "Mon", actual: 45, predicted: 42 },
  { day: "Tue", actual: 62, predicted: 58 },
  { day: "Wed", actual: 78, predicted: 80 },
  { day: "Thu", actual: 55, predicted: 60 },
  { day: "Fri", actual: null, predicted: 72 },
  { day: "Sat", actual: null, predicted: 85 },
  { day: "Sun", actual: null, predicted: 65 },
];

const iotSensors = [
  { id: "S-101", location: "Mandakini Bridge", waterLevel: 3.6, status: "warning", battery: 78, flow: 12.4 },
  { id: "S-102", location: "Alaknanda Gauge", waterLevel: 4.7, status: "critical", battery: 65, flow: 18.2 },
  { id: "S-103", location: "Yamuna Barrage", waterLevel: 5.2, status: "critical", battery: 82, flow: 22.1 },
  { id: "S-104", location: "Rishikesh Station", waterLevel: 2.8, status: "normal", battery: 91, flow: 8.7 },
  { id: "S-105", location: "Haridwar Canal", waterLevel: 3.1, status: "warning", battery: 54, flow: 10.3 },
  { id: "S-106", location: "Tehri Dam Outlet", waterLevel: 2.4, status: "normal", battery: 88, flow: 6.9 },
];

const regionAlerts = [
  { region: "Kedarnath Valley", risk: "high", probability: 85, population: "12,400", evacuated: 3200 },
  { region: "Mandakini Basin", risk: "high", probability: 72, population: "28,600", evacuated: 8100 },
  { region: "Delhi NCR (Yamuna)", risk: "medium", probability: 42, population: "2.1M", evacuated: 0 },
  { region: "Haridwar District", risk: "medium", probability: 56, population: "1.9M", evacuated: 1500 },
  { region: "Rishikesh Zone", risk: "low", probability: 22, population: "1.1M", evacuated: 0 },
];

const chartConfig = {
  mandakini: { label: "Mandakini", color: "hsl(var(--primary))" },
  alaknanda: { label: "Alaknanda", color: "hsl(var(--destructive))" },
  yamuna: { label: "Yamuna", color: "hsl(var(--accent-foreground))" },
  kedarnath: { label: "Kedarnath", color: "hsl(var(--destructive))" },
  delhi: { label: "Delhi", color: "hsl(var(--primary))" },
  haridwar: { label: "Haridwar", color: "hsl(var(--muted-foreground))" },
  actual: { label: "Actual", color: "hsl(var(--primary))" },
  predicted: { label: "AI Predicted", color: "hsl(var(--destructive))" },
};

const statusColor: Record<string, string> = {
  normal: "bg-green-500/20 text-green-400 border-green-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const riskBadge: Record<string, string> = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function GovernmentDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const stats = [
    { label: "Flood Probability (Peak)", value: "85%", icon: TrendingUp, accent: "text-destructive" },
    { label: "Active IoT Sensors", value: "6 / 6", icon: Activity, accent: "text-primary" },
    { label: "Regions at Risk", value: "4", icon: AlertTriangle, accent: "text-yellow-400" },
    { label: "Population Exposed", value: "4.1M", icon: MapPin, accent: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Government Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered flood predictions, IoT monitoring & regional risk assessment
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="iot">IoT Sensors</TabsTrigger>
            <TabsTrigger value="regions">Regional Risk</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Water Level Chart */}
              <Card className="border-border/50 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-primary" /> Water Level Monitoring
                  </CardTitle>
                  <CardDescription>Real-time IoT sensor readings (meters)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <LineChart data={waterLevelData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="mandakini" stroke="var(--color-mandakini)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="alaknanda" stroke="var(--color-alaknanda)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="yamuna" stroke="var(--color-yamuna)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Flood Probability Forecast */}
              <Card className="border-border/50 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-destructive" /> Flood Probability Forecast
                  </CardTitle>
                  <CardDescription>AI-predicted 7-day flood probability (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <AreaChart data={floodProbability}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="kedarnath" stroke="var(--color-kedarnath)" fill="var(--color-kedarnath)" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="delhi" stroke="var(--color-delhi)" fill="var(--color-delhi)" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="haridwar" stroke="var(--color-haridwar)" fill="var(--color-haridwar)" fillOpacity={0.08} strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Rainfall Actual vs AI Predicted */}
              <Card className="border-border/50 bg-card/80 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-primary" /> Rainfall: Actual vs AI Predicted
                  </CardTitle>
                  <CardDescription>Weekly comparison (mm) — future days show prediction only</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[240px] w-full">
                    <BarChart data={rainfallForecast}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="predicted" fill="var(--color-predicted)" radius={[4, 4, 0, 0]} opacity={0.6} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── IoT Sensors Tab ── */}
          <TabsContent value="iot" className="mt-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {iotSensors.map((sensor, i) => (
                <motion.div key={sensor.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{sensor.location}</CardTitle>
                        <Badge variant="outline" className={statusColor[sensor.status]}>
                          {sensor.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">Sensor {sensor.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-lg font-bold text-foreground">{sensor.waterLevel}m</p>
                            <p className="text-[10px] text-muted-foreground">Water Level</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-bold text-foreground">{sensor.flow} m³/s</p>
                            <p className="text-[10px] text-muted-foreground">Flow Rate</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Battery</span>
                          <span>{sensor.battery}%</span>
                        </div>
                        <Progress value={sensor.battery} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── Regional Risk Tab ── */}
          <TabsContent value="regions" className="mt-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Regional Risk Assessment</CardTitle>
                <CardDescription>AI-computed flood probability & evacuation status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {regionAlerts.map((r) => (
                    <div key={r.region} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={riskBadge[r.risk]}>
                          {r.risk}
                        </Badge>
                        <div>
                          <p className="font-medium text-foreground text-sm">{r.region}</p>
                          <p className="text-xs text-muted-foreground">Pop: {r.population}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{r.probability}%</p>
                          <p className="text-[10px] text-muted-foreground">Flood Prob.</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{r.evacuated.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Evacuated</p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs">
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
