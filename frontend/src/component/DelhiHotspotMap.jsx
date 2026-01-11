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
 * zones     → simulated zones from parent (IMPORTANT)
 * reports   → citizen reports
 * onZoneClick → scroll to card callback
 * lang      → "en" or "hi" for translation
 */
export default function DelhiHotspotMap({ zones = [], reports = [], onZoneClick, lang = "en" }) {
  
  // 🇮🇳 Translation Dictionary for Map Popups
  const t = {
    en: {
      risk: "Risk",
      score: "Score",
      elevation: "Elevation",
      drainage: "Drainage",
      nearestShelter: "Nearest Shelter",
      avoidWarning: "⚠ Avoid this area during heavy rain",
      safeShelter: "Safe Shelter",
      emergencyShelter: "Emergency Shelter",
      safeLocation: "Safe elevated location",
      citizenReport: "🗣 Citizen Report",
      floodingReported: "Flooding reported here",
      unknown: "Unknown",
    },
    hi: {
      risk: "जोखिम",
      score: "स्कोर",
      elevation: "ऊंचाई",
      drainage: "ड्रेनेज",
      nearestShelter: "निकटतम आश्रय",
      avoidWarning: "⚠ भारी बारिश में इस क्षेत्र से बचें",
      safeShelter: "सुरक्षित आश्रय",
      emergencyShelter: "आपातकालीन आश्रय",
      safeLocation: "सुरक्षित ऊँचा स्थान",
      citizenReport: "🗣 नागरिक रिपोर्ट",
      floodingReported: "यहाँ जलभराव की सूचना मिली",
      unknown: "अज्ञात",
    },
  }

  const text = t[lang] || t.en

  // 🇮🇳 Zone Name Translations
  const trZone = (name) => {
    if (lang === "en") return name;
    const zoneMap = {
        "Minto Bridge (Connaught Place)": "मिंटो ब्रिज (कनॉट प्लेस)",
        "ITO Junction": "आईटीओ जंक्शन",
        "Okhla Underpass": "ओखला अंडरपास",
        "Civil Lines": "सिविल लाइन्स",
        "Dwarka Sector 12": "द्वारका सेक्टर 12",
        "Sangam Vihar": "संगम विहार",
        "Rohini Sector 15": "रोहिणी सेक्टर 15",
        "Dwarka Sector 21": "द्वारका सेक्टर 21",
        "Connaught Place": "कनॉट प्लेस",
        "Lajpat Nagar": "लाजपत नगर",
        "Karol Bagh": "करोल बाग",
        "Saket": "साकेत",
        "Janakpuri": "जनकपुरी",
        "Pitampura": "पीतमपुरा"
    };
    return zoneMap[name] || name;
  }
  
  const trStatus = (status) => {
    if (lang === "en") return status;
    const map = {
        "CRITICAL": "गंभीर",
        "HIGH": "उच्च",
        "MODERATE": "मध्यम",
        "LOW": "कम",
    };
    return map[status] || status;
  }
  
  const trDrainage = (val) => {
      if (lang === "en") return val;
      const map = {
          "Poor": "खराब", "POOR": "खराब",
          "Moderate": "संतोषजनक", "MODERATE": "संतोषजनक",
          "Good": "अच्छा", "GOOD": "अच्छा"
      };
      return map[val] || val;
  }


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
                <b>{trZone(zone.zone_name)}</b>
                <br />
                {text.risk}: {trStatus(zone.risk_status)}
                <br />
                {text.score}: {zone.risk_score}
              </div>
            </Tooltip>

            {/* 🔵 POPUP */}
            <Popup>
              <b>{trZone(zone.zone_name)}</b>
              <br />
              <b>{text.risk}:</b> {trStatus(zone.risk_status)}
              <br />
              <b>{text.score}:</b> {zone.risk_score}
              <br />
              <b>{text.elevation}:</b> {zone.details?.elevation ?? "N/A"} m
              <br />
              <b>{text.drainage}:</b> {trDrainage(zone.details?.drainage) ?? text.unknown}
              <hr style={{ margin: "6px 0" }} />
              🧭 <b>{text.nearestShelter}</b>
              <br />
              {nearest.name}
              {zone.risk_status !== "LOW" && (
                <p style={{ color: "red", fontSize: "12px", marginTop: "6px" }}>
                  {text.avoidWarning}
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
              🧭 <b>{text.safeShelter}</b>
              <br />
              {s.name}
            </div>
          </Tooltip>

          <Popup>
            <b>{text.emergencyShelter}</b>
            <br />
            {s.name}
            <br />
            <span style={{ color: "green" }}>{text.safeLocation}</span>
          </Popup>
        </Marker>
      ))}

      {/* 🟣 CITIZEN REPORTS */}
      {reports.map((r, i) => (
        <Marker key={`report-${i}`} position={[r.lat, r.lng]} icon={reportIcon}>
          <Popup>
            <b>{text.citizenReport}</b>
            <br />
            {r.note || text.floodingReported}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}