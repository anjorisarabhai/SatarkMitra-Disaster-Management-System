"use client"

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet"
import L from "leaflet"
import wardData from "../data/delhi_wards.geojson"

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
})

/* ---------- POLYGON STYLING ---------- */
const getWardStyle = (feature) => {
  const risk = feature.properties.risk_status

  let color = "green"
  if (risk === "CRITICAL") color = "red"
  else if (risk === "HIGH") color = "orange"
  else if (risk === "MODERATE") color = "gold"

  return {
    fillColor: color,
    weight: 2,
    opacity: 1,
    color: "#333",
    fillOpacity: 0.5
  }
}

/* ---------- TOOLTIP ---------- */
const onEachWard = (feature, layer) => {
  layer.bindTooltip(
    `
    <b>${feature.properties.name}</b><br/>
    Risk: ${feature.properties.risk_status}<br/>
    Score: ${feature.properties.risk_score}
    `,
    { sticky: true }
  )
}

export default function DelhiHotspotMap({ zones }) {
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

      {/* 🔹 WARD POLYGONS */}
      <GeoJSON
        data={wardData}
        style={getWardStyle}
        onEachFeature={onEachWard}
      />

      {/* 🔹 EXISTING HOTSPOT MARKERS (UNCHANGED) */}
      {zones.map((zone, idx) => (
        <Marker key={idx} position={[zone.latitude, zone.longitude]}>
          <Popup>
            <b>{zone.zone_name}</b><br />
            Risk: {zone.risk_status}<br />
            Score: {zone.risk_score}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
