"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// 🔧 Fix default marker issue in Next.js
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// 🎨 Risk marker colors
const getMarkerColor = (risk) => {
  if (risk === "CRITICAL") return "red"
  if (risk === "HIGH") return "orange"
  if (risk === "MODERATE") return "gold"
  return "green"
}

const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

export default function DelhiHotspotMap({ zones = [] }) {
  return (
    <MapContainer
      center={[28.6139, 77.2090]}
      zoom={11}
      // ✅ CHANGED: Height is now 100% to fill the parent flex container
      style={{ height: "100%", width: "100%", minHeight: "400px" }}
      className="rounded-lg bg-gray-100"
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {zones.map((zone, idx) => {
        const risk = zone?.risk_status ?? "LOW"
        const details = zone?.details ?? {}

        return (
          <Marker
            key={idx}
            position={[zone.latitude, zone.longitude]}
            icon={createIcon(getMarkerColor(risk))}
          >
            {/* 🟡 HOVER TOOLTIP */}
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="text-xs leading-tight">
                <b>{zone.zone_name}</b><br />
                Risk: {risk}<br />
                Score: {zone.risk_score}
              </div>
            </Tooltip>

            {/* 🔵 CLICK POPUP */}
            <Popup>
              <b>{zone.zone_name}</b><br />
              <b>Risk:</b> {risk}<br />
              <b>Score:</b> {zone.risk_score}<br />
              <b>Elevation:</b> {details.elevation ?? "N/A"} m<br />
              <b>Drainage:</b> {details.drainage ?? "Unknown"}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}