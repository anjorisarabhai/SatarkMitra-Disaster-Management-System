import { motion } from "framer-motion";
import { Navigation, X, Home, Truck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROUTES = [
  { from: "Your Location", to: "Shelter A — Sector 12", distance: "2.3 km", time: "8 min", status: "clear" },
  { from: "Your Location", to: "Shelter B — NH-107", distance: "4.1 km", time: "15 min", status: "partial" },
  { from: "Your Location", to: "Shelter D — Base Camp", distance: "6.8 km", time: "25 min", status: "clear" },
];

const BLOCKED_ROADS = [
  "Mandakini Bridge — Flooded",
  "Gaurikund Market Road — Debris",
  "NH-107 KM 8-12 — Landslide",
];

const statusBadge: Record<string, string> = {
  clear: "bg-[hsl(var(--risk-low))]/20 text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low))]/30",
  partial: "bg-[hsl(var(--risk-moderate))]/20 text-[hsl(var(--risk-moderate))] border-[hsl(var(--risk-moderate))]/30",
  blocked: "bg-destructive/20 text-destructive border-destructive/30",
};

export function SafeNavigationPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="w-5 h-5 text-[hsl(var(--risk-low))]" />
          Safe Routes & Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">❌ Flooded road</span>
          <span className="flex items-center gap-1">🏠 Shelter</span>
          <span className="flex items-center gap-1">🚑 Emergency vehicle route</span>
        </div>

        {/* Blocked roads */}
        <div>
          <p className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Blocked Roads
          </p>
          <div className="space-y-1.5">
            {BLOCKED_ROADS.map((road) => (
              <div key={road} className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-sm text-foreground">
                <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                {road}
              </div>
            ))}
          </div>
        </div>

        {/* Safe routes */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
            <Home className="w-4 h-4 text-primary" /> Available Shelter Routes
          </p>
          <div className="space-y-2">
            {ROUTES.map((route, i) => (
              <motion.div
                key={route.to}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{route.to}</p>
                  <p className="text-xs text-muted-foreground">{route.distance} · ~{route.time}</p>
                </div>
                <Badge variant="outline" className={statusBadge[route.status]}>
                  {route.status === "clear" ? "✅ Clear" : "⚠️ Partial"}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
