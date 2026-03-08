import { motion } from "framer-motion";
import { Activity, CloudRain, Droplets, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskIndicator {
  label: string;
  value: string;
  level: "low" | "medium" | "high";
  icon: React.ElementType;
}

interface RiskPulseWidgetProps {
  region?: "Delhi" | "Kedarnath";
}

const RISK_DATA: Record<string, { indicators: RiskIndicator[]; overall: "LOW" | "MEDIUM" | "HIGH" }> = {
  Delhi: {
    indicators: [
      { label: "Rainfall intensity", value: "High", level: "high", icon: CloudRain },
      { label: "Drainage stress", value: "Medium", level: "medium", icon: Droplets },
      { label: "River level", value: "Elevated", level: "medium", icon: Activity },
    ],
    overall: "HIGH",
  },
  Kedarnath: {
    indicators: [
      { label: "Rainfall intensity", value: "Very High", level: "high", icon: CloudRain },
      { label: "Glacial melt rate", value: "High", level: "high", icon: Droplets },
      { label: "Seismic activity", value: "Low", level: "low", icon: Activity },
    ],
    overall: "HIGH",
  },
};

const levelColor: Record<string, string> = {
  low: "text-[hsl(var(--risk-low))]",
  medium: "text-[hsl(var(--risk-moderate))]",
  high: "text-destructive",
};

const overallBg: Record<string, string> = {
  LOW: "bg-[hsl(var(--risk-low))]/20 text-[hsl(var(--risk-low))]",
  MEDIUM: "bg-[hsl(var(--risk-moderate))]/20 text-[hsl(var(--risk-moderate))]",
  HIGH: "bg-destructive/20 text-destructive",
};

export function RiskPulseWidget({ region = "Delhi" }: RiskPulseWidgetProps) {
  const data = RISK_DATA[region];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5 text-destructive" />
          {region} Risk Pulse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.indicators.map((ind, i) => (
          <motion.div
            key={ind.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
          >
            <div className="flex items-center gap-2">
              <ind.icon className={`w-4 h-4 ${levelColor[ind.level]}`} />
              <span className="text-sm text-foreground">{ind.label}</span>
            </div>
            <span className={`text-sm font-bold ${levelColor[ind.level]}`}>{ind.value}</span>
          </motion.div>
        ))}

        <div className={`flex items-center justify-between p-3 rounded-lg font-bold ${overallBg[data.overall]}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Overall Risk</span>
          </div>
          <span className="text-lg">{data.overall}</span>
        </div>
      </CardContent>
    </Card>
  );
}
