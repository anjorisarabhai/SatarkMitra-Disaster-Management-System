import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, CloudRain, Droplets, Mountain, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RISK_FACTORS = [
  { label: "Rainfall intensity: High", icon: CloudRain, severity: "high" },
  { label: "Drainage capacity exceeded", icon: Droplets, severity: "high" },
  { label: "Low elevation zone", icon: Mountain, severity: "medium" },
  { label: "Nearby river level rising", icon: Waves, severity: "high" },
];

const sevColor: Record<string, string> = {
  high: "text-destructive",
  medium: "text-[hsl(var(--risk-moderate))]",
  low: "text-[hsl(var(--risk-low))]",
};

export function AIExplanation() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
        onClick={() => setOpen(!open)}
      >
        <HelpCircle className="w-4 h-4" />
        Why is this area high risk?
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-3"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-foreground">Flood Risk Factors</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {RISK_FACTORS.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/50"
                  >
                    <f.icon className={`w-4 h-4 ${sevColor[f.severity]}`} />
                    <span className="text-sm text-foreground">{f.label}</span>
                  </motion.div>
                ))}
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Analysis powered by AI models using real-time sensor data, weather forecasts, and topographical mapping.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
