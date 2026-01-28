import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Risk → Marker Color
const getMarkerColor = (risk: string) => {
  if (risk === "CRITICAL") return "red";
  if (risk === "HIGH") return "orange";
  if (risk === "MODERATE") return "gold";
  return "green";
};

// Create colored marker icon
const createIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41] as L.PointTuple,
    iconAnchor: [12, 41] as L.PointTuple,
    popupAnchor: [1, -34] as L.PointTuple,
    shadowSize: [41, 41] as L.PointTuple,
  });

// Safe shelters
const shelters = [
  { name: "Community Hall, Lajpat Nagar", lat: 28.57, lng: 77.24 },
  { name: "Govt School, Karol Bagh", lat: 28.65, lng: 77.19 },
  { name: "Relief Camp, Dwarka Sec 10", lat: 28.58, lng: 77.05 },
];

// Distance helper
const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);

// Nearest shelter logic
const getNearestShelter = (zone: Zone) => {
  const z = { lat: zone.latitude, lng: zone.longitude };
  let best = shelters[0];
  let bestD = dist(z, shelters[0]);

  shelters.forEach((s) => {
    const d = dist(z, s);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  });

  return best;
};

export interface Zone {
  zone_name: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_status: string;
  details?: {
    elevation?: number;
    drainage?: string;
  };
}

export interface Report {
  lat: number;
  lng: number;
  note: string;
}

interface DelhiHotspotMapProps {
  zones?: Zone[];
  reports?: Report[];
  onZoneClick?: (name: string) => void;
  lang?: "en" | "hi";
}

const translations = {
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
};

export default function DelhiHotspotMap({
  zones = [],
  reports = [],
  onZoneClick,
  lang = "en",
}: DelhiHotspotMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const text = useMemo(() => translations[lang] || translations.en, [lang]);
  const centerPosition = useMemo(() => [28.6139, 77.209] as [number, number], []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(centerPosition, 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    const t = window.setTimeout(() => map.invalidateSize(), 100);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when zones/reports/lang change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add zone markers
    zones.forEach((zone) => {
      const nearest = getNearestShelter(zone);
      const marker = L.marker([zone.latitude, zone.longitude], {
        icon: createIcon(getMarkerColor(zone.risk_status)),
      }).addTo(map);

      // Tooltip
      marker.bindTooltip(
        `<div class="text-xs"><b>${zone.zone_name}</b><br />${text.risk}: ${zone.risk_status}<br />${text.score}: ${zone.risk_score}</div>`,
        { direction: "top", offset: [0, -20] }
      );

      // Popup
      const avoidHtml =
        zone.risk_status !== "LOW"
          ? `<p class="text-destructive text-xs mt-2 font-medium">${text.avoidWarning}</p>`
          : "";
      marker.bindPopup(
        `<div class="text-sm">
          <b class="text-base">${zone.zone_name}</b><br />
          <b>${text.risk}:</b> ${zone.risk_status}<br />
          <b>${text.score}:</b> ${zone.risk_score}<br />
          <b>${text.elevation}:</b> ${zone.details?.elevation ?? "N/A"} m<br />
          <b>${text.drainage}:</b> ${zone.details?.drainage ?? text.unknown}
          <hr class="my-2" />
          🧭 <b>${text.nearestShelter}</b><br />
          ${nearest.name}
          ${avoidHtml}
        </div>`
      );

      marker.on("click", () => onZoneClick?.(zone.zone_name));

      markersRef.current.push(marker);
    });

    // Add shelter markers
    shelters.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], {
        icon: createIcon("blue"),
      }).addTo(map);

      marker.bindTooltip(
        `<div class="text-xs">🧭 <b>${text.safeShelter}</b><br />${s.name}</div>`,
        { direction: "top", offset: [0, -20] }
      );

      marker.bindPopup(
        `<div class="text-sm">
          <b>${text.emergencyShelter}</b><br />
          ${s.name}<br />
          <span class="text-risk-low font-medium">${text.safeLocation}</span>
        </div>`
      );

      markersRef.current.push(marker);
    });

    // Add citizen report markers
    reports.forEach((r) => {
      const marker = L.marker([r.lat, r.lng], {
        icon: createIcon("violet"),
      }).addTo(map);

      marker.bindPopup(
        `<div class="text-sm">
          <b>${text.citizenReport}</b><br />
          ${r.note || text.floodingReported}
        </div>`
      );

      markersRef.current.push(marker);
    });
  }, [zones, reports, text, onZoneClick]);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}
