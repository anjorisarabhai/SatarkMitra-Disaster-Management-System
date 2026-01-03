"use client"

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2 mb-1">
    <span
      style={{
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        backgroundColor: color,
        display: "inline-block",
        border: "1px solid #555",
      }}
    />
    <span>{label}</span>
  </div>
)

export default function DelhiMapLegend() {
  return (
    <div
      style={{
        background: "white",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "13px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        border: "1px solid #ddd",
      }}
    >
      <h4 style={{ fontWeight: 600, marginBottom: "6px" }}>
        Flood Risk Legend
      </h4>

      <LegendItem color="green" label="Low Risk" />
      <LegendItem color="gold" label="Moderate Risk" />
      <LegendItem color="orange" label="High Risk" />
      <LegendItem color="red" label="Critical Risk" />
    </div>
  )
}
