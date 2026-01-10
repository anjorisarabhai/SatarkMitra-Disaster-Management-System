"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// 🔧 Fix Leaflet marker icons
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
  if (risk === "CRITICAL") return "red"
  if (risk === "HIGH") return "orange"
  if (risk === "MODERATE") return "gold"
  return "green"
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

// 🔵 Shelter icon
const shelterIcon = createIcon("blue")

// 🧭 STATIC SAFE SHELTERS (prototype data)
const shelters = [
  { name: "Community Hall, Lajpat Nagar", lat: 28.57, lng: 77.24 },
  { name: "Govt School, Karol Bagh", lat: 28.65, lng: 77.19 },
  { name: "Relief Camp, Dwarka Sec 10", lat: 28.58, lng: 77.05 },
]

// 🟣 Citizen report icon
const reportIcon = createIcon("violet")

/**
 * Props:
 * zones   → hotspot data from backend
 * reports → optional citizen reports [{ lat, lng, note }]
 */
export default function DelhiHotspotMap({ zones = [], reports = [] }) {
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

      {/* 🔴 HOTSPOT ZONES */}
      {zones.map((zone, idx) => (
        <Marker
          key={`zone-${idx}`}
          position={[zone.latitude, zone.longitude]}
          icon={createIcon(getMarkerColor(zone.risk_status))}
        >
          {/* 🟡 HOVER INFO */}
          <Tooltip direction="top" offset={[0, -20]} opacity={1}>
            <div className="text-xs">
              <b>{zone.zone_name}</b>
              <br />
              Risk: {zone.risk_status}
              <br />
              Score: {zone.risk_score}
            </div>
          </Tooltip>

          {/* 🔵 CLICK DETAILS */}
          <Popup>
            <b>{zone.zone_name}</b>
            <br />
            <b>Risk:</b> {zone.risk_status}
            <br />
            <b>Score:</b> {zone.risk_score}
            <br />
            <b>Elevation:</b> {zone.details?.elevation ?? "N/A"} m
            <br />
            <b>Drainage:</b> {zone.details?.drainage ?? "Unknown"}
            <br />

            {zone.risk_status !== "LOW" && (
              <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>
                ⚠ Avoid this area during heavy rain
              </p>
            )}
          </Popup>
        </Marker>
      ))}

      {/* 🧭 SAFE SHELTERS (BLUE) */}
      {shelters.map((s, i) => (
        <Marker
          key={`shelter-${i}`}
          position={[s.lat, s.lng]}
          icon={shelterIcon}
        >
          {/* 🟡 HOVER */}
          <Tooltip direction="top" offset={[0, -20]} opacity={1}>
            <div className="text-xs">
              🧭 <b>Safe Shelter</b>
              <br />
              {s.name}
            </div>
          </Tooltip>

          {/* 🔵 CLICK */}
          <Popup>
            <b>🧭 Emergency Shelter</b>
            <br />
            {s.name}
            <br />
            <span style={{ color: "green" }}>
              Safe elevated location
            </span>
          </Popup>
        </Marker>
      ))}

      {/* 🗣 CITIZEN REPORTS (OPTIONAL) */}
      {reports.map((r, i) => (
        <Marker
          key={`report-${i}`}
          position={[r.lat, r.lng]}
          icon={reportIcon}
        >
          <Tooltip direction="top" offset={[0, -20]} opacity={1}>
            <div className="text-xs">
              🗣 <b>Citizen Report</b>
            </div>
          </Tooltip>

          <Popup>
            <b>🗣 Citizen Report</b>
            <br />
            {r.note || "Flooding reported here"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
