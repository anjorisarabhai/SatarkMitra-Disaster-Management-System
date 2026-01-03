"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"
import "leaflet/dist/leaflet.css"

// Risk → color mapping
const getWardColor = (risk) => {
  if (risk === "CRITICAL") return "#dc2626"   // red
  if (risk === "HIGH") return "#f97316"       // orange
  if (risk === "MODERATE") return "#facc15"   // yellow
  return "#22c55e"                            // green
}

export default function DelhiHotspotMap({ zones }) {
  const [wardsGeoJSON, setWardsGeoJSON] = useState(null)

  // 🔹 Load GeoJSON from public folder
  useEffect(() => {
    fetch("/data/delhi_wards.geojson")
      .then((res) => res.json())
      .then((data) => setWardsGeoJSON(data))
      .catch((err) => console.error("Failed to load GeoJSON", err))
  }, [])

  // 🔹 Attach hover tooltip to each ward
  const onEachWard = (feature, layer) => {
    const wardName = feature.properties?.ward_name || "Unknown Ward"

    // Match backend zone risk (basic name match for prototype)
    const matchedZone = zones.find(z =>
      wardName.toLowerCase().includes(z.zone_name.toLowerCase().split(" ")[0])
    )

    const risk = matchedZone?.risk_status || "LOW"

    layer.bindTooltip(
      `
      <strong>${wardName}</strong><br/>
      Risk: ${risk}
      `,
      { sticky: true }
    )
  }

  return (
    <MapContainer
      center={[28.6139, 77.2090]}
      zoom={11}
      style={{ height: "500px", width: "100%" }}
      className="rounded-lg"
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {wardsGeoJSON && (
        <GeoJSON
          data={wardsGeoJSON}
          style={(feature) => {
            const wardName = feature.properties?.ward_name || ""
            const matchedZone = zones.find(z =>
              wardName.toLowerCase().includes(z.zone_name.toLowerCase().split(" ")[0])
            )

            const risk = matchedZone?.risk_status || "LOW"

            return {
              fillColor: getWardColor(risk),
              weight: 1,
              color: "#1f2937",
              fillOpacity: 0.6,
            }
          }}
          onEachFeature={onEachWard}
        />
      )}
    </MapContainer>
  )
}
