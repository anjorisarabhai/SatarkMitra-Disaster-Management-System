"use client"

import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// 🔧 Fix default marker icon issue in Next.js
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })
}

// 🎨 Risk Colors
const getMarkerColor = (risk) => {
  switch(risk) {
    case "CRITICAL": return "red"
    case "HIGH": return "orange"
    case "MODERATE": return "gold"
    default: return "green"
  }
}

const createIcon = (color) => {
  // Ensure this runs only on client
  if (typeof window === 'undefined') return null
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

export default function DelhiHotspotMap({ zones = [] }) {
  return (
    <MapContainer 
      center={[28.6139, 77.2090]} 
      zoom={11} 
      style={{ height: "100%", width: "100%", minHeight: "100%" }}
      className="z-0 bg-slate-100"
    >
      <TileLayer 
        attribution="© OpenStreetMap" 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
      />
      
      {zones.map((zone, idx) => (
        <Marker 
          key={idx} 
          position={[zone.latitude, zone.longitude]} 
          icon={createIcon(getMarkerColor(zone.risk_status))}
        >
          <Tooltip direction="top" offset={[0, -20]} opacity={1}>
            <div className="text-xs font-bold">
              {zone.zone_name}<br/>
              <span className={zone.risk_status === "CRITICAL" ? "text-red-600" : "text-slate-600"}>
                {zone.risk_status} ({zone.risk_score})
              </span>
            </div>
          </Tooltip>
          
          <Popup>
            <div className="p-1 min-w-[150px]">
              <h4 className="font-bold text-sm mb-2 border-b pb-1">{zone.zone_name}</h4>
              <div className="text-xs space-y-1">
                <p><b>Risk:</b> {zone.risk_status}</p>
                <p><b>Score:</b> {zone.risk_score}</p>
                <p><b>Elevation:</b> {zone.details?.elevation} m</p>
                <p><b>Drainage:</b> {zone.details?.drainage}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}