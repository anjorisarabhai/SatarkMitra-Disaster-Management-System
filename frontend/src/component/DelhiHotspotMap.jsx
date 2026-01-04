"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix Default Icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

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
      // ✅ CHANGED: 100% Height to fill the new parent container
      style={{ height: "100%", width: "100%", minHeight: "100%" }}
      className="z-0" // Ensure it stays behind floating controls
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
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <div className="text-xs font-bold">
                {zone.zone_name}<br/>
                <span className={risk === "CRITICAL" ? "text-red-600" : "text-gray-600"}>
                    {risk} ({zone.risk_score})
                </span>
              </div>
            </Tooltip>

            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-sm mb-2">{zone.zone_name}</h4>
                <div className="text-xs space-y-1">
                    <p>Risk: <b>{risk}</b></p>
                    <p>Score: {zone.risk_score}</p>
                    <hr className="my-1"/>
                    <p>Elevation: {details.elevation}m</p>
                    <p>Drainage: {details.drainage}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}