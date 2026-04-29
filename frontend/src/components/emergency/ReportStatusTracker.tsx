import { motion } from "framer-motion";
import { CheckCircle2, Search, Truck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportStatus {
  step: string;
  status: "done" | "active" | "pending";
  icon: React.ElementType;
  time?: string;
}

const MOCK_STATUSES: ReportStatus[] = [
  { step: "Report Received", status: "done", icon: CheckCircle2, time: "3:25 PM" },
  { step: "Verified by AI", status: "done", icon: Search, time: "3:26 PM" },
  { step: "Response team dispatched", status: "active", icon: Truck, time: "3:30 PM" },
  { step: "Resolution", status: "pending", icon: Clock },
];

const statusStyle: Record<string, { dot: string; text: string }> = {
  done: { dot: "bg-[hsl(var(--risk-low))]", text: "text-[hsl(var(--risk-low))]" },
  active: { dot: "bg-primary animate-pulse", text: "text-primary" },
  pending: { dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

export function ReportStatusTracker() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your Report Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
          <div className="space-y-4">
            {MOCK_STATUSES.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`w-6 h-6 rounded-full ${statusStyle[s.status].dot} flex items-center justify-center z-10 ring-2 ring-background`}>
                  <s.icon className="w-3.5 h-3.5 text-background" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${statusStyle[s.status].text}`}>{s.step}</p>
                  {s.time && <p className="text-xs text-muted-foreground">{s.time}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
