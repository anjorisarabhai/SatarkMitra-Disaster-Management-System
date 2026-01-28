import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface RiskData {
  alert_level?: string;
  flood_probability?: number;
  location?: string;
}

interface KedarnathLeafletMapProps {
  riskData?: RiskData | null;
}

function getMarkerIcon(risk: string) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${
      risk === "HIGH" ? "red" : "green"
    }.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41] as L.PointTuple,
    iconAnchor: [12, 41] as L.PointTuple,
    popupAnchor: [1, -34] as L.PointTuple,
    shadowSize: [41, 41] as L.PointTuple,
  });
}

function popupHtml(riskData?: RiskData | null) {
  const isHigh = riskData?.alert_level === "HIGH";
  const riskClass = isHigh ? "text-destructive font-bold" : "text-risk-low font-bold";
  const risk = riskData?.alert_level ?? "Unknown";
  const prob = riskData?.flood_probability ?? "--";
  return `
    <div class="text-sm">
      <b class="text-base">Kedarnath Temple</b><br />
      <span class="font-medium">Risk Level:</span> <span class="${riskClass}">${risk}</span><br />
      <span class="font-medium">Flood Probability:</span> ${prob}%
    </div>
  `.trim();
}

export default function KedarnathLeafletMap({ riskData }: KedarnathLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const position = useMemo(() => [30.735, 79.066] as [number, number], []); // Kedarnath

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(position, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker(position, {
      icon: getMarkerIcon(riskData?.alert_level || "LOW"),
    }).addTo(map);

    marker.bindPopup(popupHtml(riskData), { closeButton: true });

    mapRef.current = map;
    markerRef.current = marker;

    // Fix initial size/layout when mounted inside cards/tabs
    const t = window.setTimeout(() => map.invalidateSize(), 100);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(getMarkerIcon(riskData?.alert_level || "LOW"));
    marker.setPopupContent(popupHtml(riskData));
  }, [riskData?.alert_level, riskData?.flood_probability, riskData?.location]);

  return <div ref={containerRef} className="h-full w-full rounded-xl" />;
}