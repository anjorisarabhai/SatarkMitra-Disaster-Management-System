"use client"

export default function DelhiMapLegend() {
  const items = [
    { label: "Critical", color: "bg-red-500" },
    { label: "High", color: "bg-orange-400" },
    { label: "Moderate", color: "bg-yellow-400" },
    { label: "Low", color: "bg-green-500" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white/80 px-3 py-2 text-[11px] shadow-xs">
      <span className="font-medium text-[11px] text-slate-700">
        Risk legend
      </span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className={`h-2.5 w-2.5 rounded-full ${item.color}`}
          />
          <span className="text-[11px] text-slate-700">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
