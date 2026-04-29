import { Radio } from "lucide-react";

interface LiveIndicatorProps {
  className?: string;
}

export function LiveIndicator({ className = "" }: LiveIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 ${className}`}>
      <Radio className="w-3 h-3 animate-pulse" />
      <span>Live</span>
    </div>
  );
}
