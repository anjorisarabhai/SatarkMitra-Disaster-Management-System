import { cn } from "@/lib/utils";

type RiskLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "critical" | "high" | "moderate" | "low" | "warning" | "info" | "normal";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  children?: React.ReactNode;
}

const badgeStyles: Record<string, string> = {
  critical: "badge-critical",
  CRITICAL: "badge-critical",
  high: "badge-high",
  HIGH: "badge-high",
  warning: "badge-high",
  moderate: "badge-moderate",
  MODERATE: "badge-moderate",
  info: "badge-moderate",
  low: "badge-low",
  LOW: "badge-low",
  normal: "badge-low",
};

export function RiskBadge({ level, className, children }: RiskBadgeProps) {
  const style = badgeStyles[level] || "badge-low";
  
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1",
      style,
      className
    )}>
      {children || level.toUpperCase()}
    </span>
  );
}
