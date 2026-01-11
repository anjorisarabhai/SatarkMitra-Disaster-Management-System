"use client"

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10" style={{ backgroundColor: color }} />
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  )
}

export default function DelhiMapLegend({ className = "" }) {
  return (
    <div className={`bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 ${className}`}>
      <h4 className="text-sm font-semibold text-slate-800 mb-2">Map Legend</h4>

      <div className="flex flex-col gap-1.5">
        <LegendItem color="#22c55e" label="Low Risk Zone" />
        <LegendItem color="#eab308" label="Moderate Risk Zone" />
        <LegendItem color="#f97316" label="High Risk Zone" />
        <LegendItem color="#ef4444" label="Critical Risk Zone" />

        <div className="h-px bg-slate-200 my-1.5" />

        <LegendItem color="#3b82f6" label="Emergency Shelter" />
        <LegendItem color="#a855f7" label="Citizen Report" />
      </div>
    </div>
  )
}
