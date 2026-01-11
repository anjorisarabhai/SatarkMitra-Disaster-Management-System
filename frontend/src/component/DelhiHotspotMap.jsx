"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// 🔧 Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

// 🧭 SAFE SHELTERS (STATIC PROTOTYPE)
const shelters = [
  { name: "Community Hall, Lajpat Nagar", lat: 28.57, lng: 77.24 },
  { name: "Govt School, Karol Bagh", lat: 28.65, lng: 77.19 },
  { name: "Relief Camp, Dwarka Sec 10", lat: 28.58, lng: 77.05 },
]

// 📏 Distance helper
const dist = (a, b) => Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2)

// 🧭 Nearest shelter logic
const getNearestShelter = (zone) => {
  const z = { lat: zone.latitude, lng: zone.longitude }
  let best = shelters[0]
  let bestD = dist(z, shelters[0])

  shelters.forEach((s) => {
    const d = dist(z, s)
    if (d < bestD) {
      best = s
      bestD = d
    }
  })

  return best
}

// 🟣 Citizen report icon
const reportIcon = createIcon("violet")

/**
 * Props:
 * zones       → simulated zones from parent (IMPORTANT)
 * reports     → citizen reports
 * onZoneClick → scroll to card callback
 */
export default function DelhiHotspotMap({ zones = [], reports = [], onZoneClick }) {
  return (
    <MapContainer
      center={[28.6139, 77.209]}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      className="rounded-xl z-0"
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 🔴 HOTSPOT ZONES */}
      {zones.map((zone, idx) => {
        const nearest = getNearestShelter(zone)

        return (
          <Marker
            key={`zone-${zone.zone_name}-${zone.risk_status}-${zone.risk_score}`} // ✅ forces color update
            position={[zone.latitude, zone.longitude]}
            icon={createIcon(getMarkerColor(zone.risk_status))}
            eventHandlers={{
              click: () => onZoneClick && onZoneClick(zone.zone_name),
            }}
          >
            {/* 🟡 HOVER */}
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="text-xs">
                <b>{zone.zone_name}</b>
                <br />
                Risk: {zone.risk_status}
                <br />
                Score: {zone.risk_score}
              </div>
            </Tooltip>

            {/* 🔵 POPUP */}
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
              <hr style={{ margin: "6px 0" }} />
              🧭 <b>Nearest Shelter</b>
              <br />
              {nearest.name}
              {zone.risk_status !== "LOW" && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>
                  ⚠ Avoid this area during heavy rain
                </p>
              )}
            </Popup>
          </Marker>
        )
      })}

      {/* 🔵 SAFE SHELTERS */}
      {shelters.map((s, i) => (
        <Marker key={`shelter-${i}`} position={[s.lat, s.lng]} icon={createIcon("blue")}>
          <Tooltip direction="top" offset={[0, -20]} opacity={1}>
            <div className="text-xs">
              🧭 <b>Safe Shelter</b>
              <br />
              {s.name}
            </div>
          </Tooltip>

          <Popup>
            <b>Emergency Shelter</b>
            <br />
            {s.name}
            <br />
            <span style={{ color: "green" }}>Safe elevated location</span>
          </Popup>
        </Marker>
      ))}

      {/* 🟣 CITIZEN REPORTS */}
      {reports.map((r, i) => (
        <Marker key={`report-${i}`} position={[r.lat, r.lng]} icon={reportIcon}>
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
