import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Droplets, HeartPulse, LogOut, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const DISTRESS_OPTIONS = [
  { id: "trapped", label: "Trapped in Water", icon: Droplets, color: "text-primary" },
  { id: "medical", label: "Medical Emergency", icon: HeartPulse, color: "text-destructive" },
  { id: "evacuate", label: "Need Evacuation", icon: LogOut, color: "text-[hsl(var(--risk-high))]" },
  { id: "damage", label: "Infrastructure Damage", icon: Building2, color: "text-[hsl(var(--risk-moderate))]" },
];

export function OneTapDistress() {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleQuickReport = async (type: string) => {
    setSubmitting(type);
    // Simulate getting location and sending report
    setTimeout(() => {
      toast({
        title: "🚨 Distress Reported",
        description: `Your "${DISTRESS_OPTIONS.find(o => o.id === type)?.label}" report has been sent with your location.`,
      });
      setSubmitting(null);
      setExpanded(false);
    }, 1000);
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={() => setExpanded(!expanded)}
        size="lg"
        className="w-full h-16 text-xl font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg gap-3"
      >
        <AlertTriangle className="w-7 h-7" />
        🆘 I Need Help
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {DISTRESS_OPTIONS.map((option) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: DISTRESS_OPTIONS.indexOf(option) * 0.08 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-14 text-base font-semibold justify-start gap-3 border-2 hover:bg-accent"
                  onClick={() => handleQuickReport(option.id)}
                  disabled={submitting !== null}
                >
                  <option.icon className={`w-6 h-6 ${option.color}`} />
                  {submitting === option.id ? "Sending..." : option.label}
                </Button>
              </motion.div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setExpanded(false)}
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
