"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Risk‑based marker color
const getMarkerColor = (risk) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${
      risk === "HIGH" ? "red" : "green"
    }.png`,
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })

export default function KedarnathLeafletMap({ riskData }) {
  const position = [30.735, 79.066] // Kedarnath

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      className="rounded-lg"
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker
        position={position}
        icon={getMarkerColor(riskData?.alert_level)}
      >
        <Popup>
          <b>Kedarnath</b>
          <br />
          Risk Level: <b>{riskData?.alert_level ?? "Unknown"}</b>
          <br />
          Flood Probability: {riskData?.flood_probability ?? "--"}%
        </Popup>
      </Marker>
    </MapContainer>
  )
}