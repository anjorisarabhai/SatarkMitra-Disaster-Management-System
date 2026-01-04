"use client"

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2 mb-1">
    <span
      style={{
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: color,
        display: "inline-block",
        border: "1px solid #ccc",
      }}
    />
    <span className="text-slate-700">{label}</span>
  </div>
)

export default function DelhiMapLegend() {
  return (
    <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-md border border-slate-200 text-xs w-32">
      <h4 className="font-bold text-slate-800 mb-2 border-b pb-1">Risk Levels</h4>
      <LegendItem color="green" label="Low" />
      <LegendItem color="gold" label="Moderate" />
      <LegendItem color="orange" label="High" />
      <LegendItem color="red" label="Critical" />
    </div>
  )
}