import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineEvent {
  time: string;
  event: string;
  severity: "info" | "warning" | "critical";
}

const MOCK_TIMELINE: TimelineEvent[] = [
  { time: "2:30 PM", event: "Heavy rainfall detected — Kedarnath region", severity: "warning" },
  { time: "3:10 PM", event: "Drainage stress rising — Mandakini Basin", severity: "warning" },
  { time: "3:25 PM", event: "Flood risk alert issued — Kedarnath Valley", severity: "critical" },
  { time: "3:40 PM", event: "Evacuation advisory — Gaurikund area", severity: "critical" },
  { time: "4:00 PM", event: "Water level stabilizing — Yamuna River", severity: "info" },
  { time: "4:15 PM", event: "Rescue teams deployed — Kedarnath Temple", severity: "critical" },
];

const severityDot: Record<string, string> = {
  info: "bg-primary",
  warning: "bg-[hsl(var(--risk-moderate))]",
  critical: "bg-destructive",
};

export function AlertTimeline() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Alert Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
          <div className="space-y-4">
            {MOCK_TIMELINE.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 pl-0"
              >
                <div className={`w-4 h-4 rounded-full ${severityDot[event.severity]} mt-0.5 shrink-0 z-10 ring-2 ring-background`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.event}</p>
                  <p className="text-xs text-muted-foreground font-mono">{event.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
