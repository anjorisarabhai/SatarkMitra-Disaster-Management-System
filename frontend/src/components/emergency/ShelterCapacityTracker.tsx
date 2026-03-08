import { motion } from "framer-motion";
import { Home, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const SHELTERS = [
  { name: "Shelter A — Community Hall", location: "Sector 12", capacity: 200, occupied: 160 },
  { name: "Shelter B — School Ground", location: "NH-107 KM 5", capacity: 150, occupied: 68 },
  { name: "Shelter C — Temple Complex", location: "Gaurikund", capacity: 100, occupied: 100 },
  { name: "Shelter D — Military Camp", location: "Base Camp", capacity: 300, occupied: 89 },
];

export function ShelterCapacityTracker() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="w-5 h-5 text-primary" />
          Shelter Capacity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {SHELTERS.map((s, i) => {
          const pct = Math.round((s.occupied / s.capacity) * 100);
          const isFull = pct >= 100;
          return (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {s.location}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    isFull
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : pct > 75
                      ? "bg-[hsl(var(--risk-moderate))]/20 text-[hsl(var(--risk-moderate))] border-[hsl(var(--risk-moderate))]/30"
                      : "bg-[hsl(var(--risk-low))]/20 text-[hsl(var(--risk-low))] border-[hsl(var(--risk-low))]/30"
                  }
                >
                  {isFull ? "Full" : `${pct}% full`}
                </Badge>
              </div>
              <Progress value={pct} className="h-2" />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
