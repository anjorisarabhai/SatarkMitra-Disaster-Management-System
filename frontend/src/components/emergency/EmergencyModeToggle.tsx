import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmergencyModeToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export function EmergencyModeToggle({ isActive, onToggle }: EmergencyModeToggleProps) {
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="w-full"
    >
      <Button
        onClick={onToggle}
        size="lg"
        className={`w-full h-14 text-lg font-bold gap-3 transition-all ${
          isActive
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_0_30px_hsl(var(--destructive)/0.4)] animate-pulse"
            : "bg-destructive/20 hover:bg-destructive/30 text-destructive border-2 border-destructive/50"
        }`}
      >
        {isActive ? (
          <>
            <Shield className="w-6 h-6" />
            🚨 EMERGENCY MODE ACTIVE
          </>
        ) : (
          <>
            <AlertTriangle className="w-6 h-6" />
            🚨 Activate Emergency Mode
          </>
        )}
      </Button>
    </motion.div>
  );
}
