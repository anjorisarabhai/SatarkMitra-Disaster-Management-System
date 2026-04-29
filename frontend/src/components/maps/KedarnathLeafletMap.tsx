import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function popupHtml(riskData?: RiskData | null) {
  const isHigh = riskData?.alert_level === "HIGH";
  const riskClass = isHigh
    ? "text-destructive font-bold"
    : "text-risk-low font-bold";

  const risk = riskData?.alert_level ?? "Unknown";
  const prob = riskData?.flood_probability ?? "--";

  return `
    <div class="text-sm">
      <b class="text-base">Kedarnath Temple</b><br />
      <span class="font-medium">Risk Level:</span> 
      <span class="${riskClass}">${risk}</span><br />
      <span class="font-medium">Flood Probability:</span> ${prob}%
    </div>
  `.trim();
}

export default function KedarnathLeafletMap({
  riskData,
}: KedarnathLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [shelters, setShelters] = useState<any[]>([]);
  const shelterLayerRef = useRef<L.LayerGroup | null>(null);

  const position = useMemo(
    () => [30.735, 79.066] as [number, number],
    []
  );

  // ✅ Fetch shelters
  useEffect(() => {
    fetch("http://localhost:8000/api/kedarnath/shelters")
      .then((res) => res.json())
      .then((data) => {
        console.log("Shelters data:", data);

        // ⚠️ adjust if API returns { shelters: [...] }
        setShelters(Array.isArray(data) ? data : data.shelters);
      })
      .catch((err) =>
        console.error("Error fetching shelters:", err)
      );
  }, []);

  // ✅ Initialize map
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

    // ✅ Create shelter layer
    const shelterLayer = L.layerGroup().addTo(map);
    shelterLayerRef.current = shelterLayer;

    // ✅ Main Kedarnath marker
    const marker = L.marker(position, {
      icon: getMarkerIcon(riskData?.alert_level || "LOW"),
    }).addTo(map);

    marker.bindPopup(popupHtml(riskData));

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // ✅ Update risk marker
  useEffect(() => {
    if (!markerRef.current) return;

    markerRef.current.setIcon(
      getMarkerIcon(riskData?.alert_level || "LOW")
    );
    markerRef.current.setPopupContent(popupHtml(riskData));
  }, [riskData]);

  // ✅ Render shelters (FIXED)
  useEffect(() => {
    if (!mapRef.current || !shelterLayerRef.current) return;

    const layer = shelterLayerRef.current;
    layer.clearLayers();

    shelters.forEach((s) => {
      if (!s.latitude || !s.longitude) return;

      const marker = L.marker([s.latitude, s.longitude], {
        icon: new L.Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      });

      marker.bindPopup(`
        <div>
          <b>${s.name}</b><br/>
          Capacity: ${s.capacity}
        </div>
      `);

      marker.addTo(layer);
    });
  }, [shelters]); // ✅ runs after data loads

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-xl"
    />
  );
}