"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoLocation } from "./ElectionMap";

// Leafletのデフォルトアイコン問題を修正
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapUpdater({ location }: { location: GeoLocation }) {
  const map = useMap();
  useEffect(() => {
    map.setView([location.lat, location.lng], 12);
  }, [map, location]);
  return null;
}

export default function MapContent({ location }: { location: GeoLocation }) {
  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[location.lat, location.lng]} icon={icon}>
        <Popup>{location.displayName}</Popup>
      </Marker>
      <MapUpdater location={location} />
    </MapContainer>
  );
}
