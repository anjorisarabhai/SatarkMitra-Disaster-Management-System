"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// 🔧 Fix Leaflet marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// 🎨 Risk → Marker Color
const getMarkerColor = (risk) => {
  switch (risk) {
    case "CRITICAL":
      return "red"
    case "HIGH":
      return "orange"
    case "MODERATE":
      return "gold"
    default:
      return "green"
  }
}

// 🧭 Create colored marker icon
const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

/**
 * Props:
 * zones → array of hotspot objects from backend
 * simulatedRain (optional) → for future rainfall slider (OPTION A)
 */
export default function DelhiHotspotMap({ zones = [], simulatedRain = null }) {
  return (
    <MapContainer
      center={[28.6139, 77.2090]}
      zoom={11}
      style={{ height: "450px", width: "100%" }}
      className="rounded-lg"
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
            {/* 🟡 HOVER INFO */}
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="text-xs leading-tight">
                <b>{zone.zone_name}</b>
                <br />
                Risk: {risk}
                <br />
                Elevation: {details.elevation ?? "N/A"} m
              </div>
            </Tooltip>

            {/* 🔵 CLICK DETAILS */}
            <Popup>
              <b>{zone.zone_name}</b>
              <br />
              <b>Risk:</b> {risk}
              <br />
              <b>Score:</b> {zone.risk_score}
              <br />
              <b>Elevation:</b> {details.elevation ?? "N/A"} m
              <br />
              <b>Drainage:</b> {details.drainage ?? "Unknown"}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
