"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker issue
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
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
  const center = [28.6139, 77.209] // Delhi approximate

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ minHeight: "260px" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {zones.map((zone, idx) => {
        const risk = zone?.risk_status ?? "LOW"
        const details = zone?.details ?? {}
        const lat = zone?.lat ?? zone?.latitude
        const lng = zone?.lon ?? zone?.longitude

        if (lat == null || lng == null) return null

        const color = getMarkerColor(risk)

        return (
          <Marker
            key={`${zone.zone_name || "zone"}-${idx}`}
            position={[lat, lng]}
            icon={createIcon(color)}
          >
            {/* Hover tooltip */}
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold">
                  {zone.zone_name || "Zone"}
                </div>
                <div>Risk: {risk}</div>
                <div>Score: {zone.risk_score}</div>
              </div>
            </Tooltip>

            {/* Click popup */}
            <Popup>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-sm mb-1">
                  {zone.zone_name || "Zone"}
                </div>
                <div>Risk: {risk}</div>
                <div>Score: {zone.risk_score}</div>
                <div>
                  Elevation: {details.elevation ?? "N/A"} m
                </div>
                <div>
                  Drainage: {details.drainage ?? "Unknown"}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
