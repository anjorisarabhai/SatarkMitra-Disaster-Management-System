import { motion } from "framer-motion";
import { Truck, Flame, Users, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const RESOURCES = [
  { name: "Ambulances", count: 6, total: 10, icon: Truck, emoji: "🚑" },
  { name: "Fire Trucks", count: 4, total: 6, icon: Flame, emoji: "🚒" },
  { name: "Rescue Teams", count: 3, total: 8, icon: Users, emoji: "⛑" },
  { name: "Shelter Capacity", count: 120, total: 500, icon: Home, emoji: "🏠" },
];

export function ResourceAvailability() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Available Resources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {RESOURCES.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <span>{r.emoji}</span> {r.name}
              </span>
              <span className="text-sm font-bold text-foreground">
                {r.count} <span className="text-muted-foreground font-normal">/ {r.total}</span>
              </span>
            </div>
            <Progress value={(r.count / r.total) * 100} className="h-2" />
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
