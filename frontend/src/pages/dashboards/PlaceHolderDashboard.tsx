import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { getRoleLabel } from "@/lib/roles";

export default function PlaceholderDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="flex items-center justify-center min-h-[70vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Construction className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {getRoleLabel(user?.role || "citizen")} Dashboard
          </h1>
          <p className="text-muted-foreground">Coming soon — this dashboard will be built next.</p>
        </motion.div>
      </main>
    </div>
  );
}
