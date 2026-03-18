import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const markerIcon = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const initial = useRef(true);
  useEffect(() => {
    if (initial.current) {
      map.setView([lat, lng], 16);
      initial.current = false;
    }
  }, [lat, lng, map]);
  return null;
}

interface Props {
  location: { lat: number; lng: number } | null;
  locating: boolean;
  onMarkerDrag: (lat: number, lng: number) => void;
}

export default function ReportMiniMap({ location, locating, onMarkerDrag }: Props) {
  const center: [number, number] = location
    ? [location.lat, location.lng]
    : [6.1956, 6.7314];

  if (locating && !location) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <span className="text-xs text-muted-foreground animate-pulse">Detecting location…</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={16}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      {location && (
        <>
          <RecenterMap lat={location.lat} lng={location.lng} />
          <Marker
            position={[location.lat, location.lng]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onMarkerDrag(pos.lat, pos.lng);
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
