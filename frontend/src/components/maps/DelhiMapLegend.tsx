interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface DelhiMapLegendProps {
  className?: string;
  lang?: "en" | "hi";
}

export default function DelhiMapLegend({ className = "", lang = "en" }: DelhiMapLegendProps) {
  const t = {
    en: {
      title: "Map Legend",
      // Risk zones
      low: "Low Risk Zone",
      moderate: "Moderate Risk Zone",
      high: "High Risk Zone",
      critical: "Critical Risk Zone",
      // Sentiment categories
      panic: "Panic (Immediate Rescue)",
      urgent: "Urgent (High Priority)",
      normal: "Normal Report",
      // Other
      shelter: "Emergency Shelter",
    },
    hi: {
      title: "मानचित्र संकेत",
      low: "कम जोखिम क्षेत्र",
      moderate: "मध्यम जोखिम क्षेत्र",
      high: "उच्च जोखिम क्षेत्र",
      critical: "गंभीर जोखिम क्षेत्र",
      panic: "घबराहट (तत्काल बचाव)",
      urgent: "अत्यावश्यक (उच्च प्राथमिकता)",
      normal: "सामान्य रिपोर्ट",
      shelter: "आपातकालीन आश्रय",
    },
  };

  const text = t[lang] || t.en;

  return (
    <div className={`glass-card p-3 ${className}`}>
      <h4 className="text-sm font-semibold text-foreground mb-2">{text.title}</h4>

      <div className="flex flex-col gap-1.5">
        {/* Risk Zone Colors */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Zones</p>
        <LegendItem color="#22c55e" label={text.low} />
        <LegendItem color="#eab308" label={text.moderate} />
        <LegendItem color="#f97316" label={text.high} />
        <LegendItem color="#ef4444" label={text.critical} />

        <div className="h-px bg-border my-1.5" />

        {/* Sentiment Report Colors */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citizen Reports</p>
        <LegendItem color="#dc2626" label={text.panic} />
        <LegendItem color="#f97316" label={text.urgent} />
        <LegendItem color="#a855f7" label={text.normal} />

        <div className="h-px bg-border my-1.5" />

        <LegendItem color="#3b82f6" label={text.shelter} />
      </div>
    </div>
  );
}