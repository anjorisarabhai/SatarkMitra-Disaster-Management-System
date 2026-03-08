import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41] as L.PointTuple,
    iconAnchor: [12, 41] as L.PointTuple,
    popupAnchor: [1, -34] as L.PointTuple,
    shadowSize: [41, 41] as L.PointTuple,
  });

export interface Shelter {
  name: string;
  lat: number;
  lng: number;
  capacity?: number;
  occupancy?: number;
  status?: string;
}

interface ShelterRouteMapProps {
  shelters: Shelter[];
  center: [number, number];
  zoom?: number;
  className?: string;
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function fetchRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM request failed");
  const data = await res.json();
  if (!data.routes?.[0]) throw new Error("No route found");
  const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
    (c: [number, number]) => [c[1], c[0]] as [number, number]
  );
  const duration = Math.round(data.routes[0].duration / 60);
  const distance = (data.routes[0].distance / 1000).toFixed(1);
  return coords;
}

async function fetchRouteWithMeta(from: [number, number], to: [number, number]) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM request failed");
  const data = await res.json();
  if (!data.routes?.[0]) throw new Error("No route found");
  const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
    (c: [number, number]) => [c[1], c[0]] as [number, number]
  );
  return {
    coords,
    duration: Math.round(data.routes[0].duration / 60),
    distance: (data.routes[0].distance / 1000).toFixed(1),
  };
}

export default function ShelterRouteMap({ shelters, center, zoom = 12, className = "" }: ShelterRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ name: string; duration: number; distance: string } | null>(null);
  const [locating, setLocating] = useState(false);

  // Get user location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        // Fallback to center
        setUserLocation(center);
        setLocating(false);
      },
      { timeout: 5000 }
    );
  }, [center]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    // Multiple invalidateSize calls to handle containers that render late (tabs, cards)
    const t1 = window.setTimeout(() => map.invalidateSize(), 100);
    const t2 = window.setTimeout(() => map.invalidateSize(), 300);
    const t3 = window.setTimeout(() => map.invalidateSize(), 800);

    // Also observe resize to handle tab switches
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw shelters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    shelters.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], { icon: createIcon("blue") }).addTo(map);
      const occupancyHtml = s.capacity
        ? `<br /><b>Capacity:</b> ${s.occupancy ?? 0}/${s.capacity} ${s.status === "Full" ? '<span style="color:red">(Full)</span>' : ""}`
        : "";
      marker.bindPopup(
        `<div class="text-sm"><b>🧭 Safe Shelter</b><br />${s.name}${occupancyHtml}<br /><em>Click "Navigate" to get route</em></div>`
      );
      marker.on("click", () => routeToShelter(s));
      markersRef.current.push(marker);
    });
  }, [shelters]);

  // Draw user location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const userIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:hsl(var(--primary));border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
    const marker = L.marker(userLocation, { icon: userIcon }).addTo(map);
    marker.bindTooltip("You are here", { direction: "top", offset: [0, -10] });
    userMarkerRef.current = marker;
  }, [userLocation]);

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    setRouteInfo(null);
  }, []);

  const routeToShelter = useCallback(
    async (shelter: Shelter) => {
      const map = mapRef.current;
      if (!map) return;

      let from = userLocation;
      if (!from) {
        // Try to get location first
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          from = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(from);
        } catch {
          from = center;
          setUserLocation(from);
        }
      }

      setRouting(true);
      clearRoute();

      try {
        const { coords, duration, distance } = await fetchRouteWithMeta(from, [shelter.lat, shelter.lng]);
        // If OSRM returns 0 distance (no roads found), fall through to fallback
        if (parseFloat(distance) === 0 || coords.length < 2) {
          throw new Error("No valid route found");
        }
        const polyline = L.polyline(coords, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.8,
          dashArray: "10, 6",
        }).addTo(map);
        routeLayerRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        setRouteInfo({ name: shelter.name, duration, distance });
      } catch (err) {
        console.error("Routing failed:", err);
        // Fallback: draw straight line with estimated walking distance
        const polyline = L.polyline([from, [shelter.lat, shelter.lng]], {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.7,
          dashArray: "8, 8",
        }).addTo(map);
        routeLayerRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        const dist = haversine({ lat: from[0], lng: from[1] }, { lat: shelter.lat, lng: shelter.lng });
        setRouteInfo({ name: shelter.name, duration: Math.round(dist * 12), distance: dist.toFixed(1) });
      } finally {
        setRouting(false);
      }
    },
    [userLocation, center, clearRoute]
  );

  const navigateToNearest = useCallback(async () => {
    let from = userLocation;
    if (!from) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        from = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(from);
      } catch {
        from = center;
        setUserLocation(from);
      }
    }

    let nearest = shelters[0];
    let minDist = Infinity;
    shelters.forEach((s) => {
      const d = haversine({ lat: from![0], lng: from![1] }, { lat: s.lat, lng: s.lng });
      if (d < minDist) {
        nearest = s;
        minDist = d;
      }
    });

    routeToShelter(nearest);
  }, [userLocation, center, shelters, routeToShelter]);

  // Auto-locate on mount
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  return (
    <div className={`relative ${className || ""}`}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <Button
          size="sm"
          onClick={navigateToNearest}
          disabled={routing || shelters.length === 0}
          className="shadow-lg bg-primary text-primary-foreground"
        >
          {routing ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Routing...</>
          ) : (
            <><Navigation className="w-3.5 h-3.5 mr-1.5" /> Nearest Shelter</>
          )}
        </Button>
        {routeInfo && (
          <Button size="sm" variant="outline" onClick={clearRoute} className="shadow-lg bg-background">
            <X className="w-3.5 h-3.5 mr-1.5" /> Clear Route
          </Button>
        )}
      </div>

      {/* Route Info Banner */}
      {routeInfo && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{routeInfo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {routeInfo.distance} km · ~{routeInfo.duration} min drive
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locating indicator */}
      {locating && (
        <div className="absolute top-3 left-3 z-[1000] bg-background/90 border border-border rounded-lg px-3 py-1.5 shadow text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Detecting location...
        </div>
      )}

      {/* Map */}
      <div ref={containerRef} className="h-full w-full rounded-xl" style={{ minHeight: "350px" }} />
    </div>
  );
}
