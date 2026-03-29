"use client";

import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoLocation } from "./ElectionMap";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapUpdater({ location, geoData }: { location: GeoLocation; geoData: GeoJSON.FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (geoData && geoData.features.length > 0) {
      const geoLayer = L.geoJSON(geoData);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
        return;
      }
    }
    map.setView([location.lat, location.lng], 12);
  }, [map, location, geoData]);
  return null;
}

const BOUNDARY_STYLE: L.PathOptions = {
  color: "#1B2A4A",
  weight: 2.5,
  fillColor: "#1B2A4A",
  fillOpacity: 0.1,
};

interface Props {
  location: GeoLocation;
  geoData: GeoJSON.FeatureCollection | null;
}

export default function MapContent({ location, geoData }: Props) {
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
      {geoData && (
        <GeoJSON
          key={JSON.stringify(geoData).substring(0, 100)}
          data={geoData}
          style={BOUNDARY_STYLE}
          onEachFeature={(feature, layer) => {
            const name = feature.properties?.N03_001
              || feature.properties?.N03_003
              || feature.properties?.N03_004
              || feature.properties?.KUNAME
              || feature.properties?.name
              || "";
            if (name) {
              layer.bindPopup(`<b>${name}</b>`);
            }
          }}
        />
      )}
      <Marker position={[location.lat, location.lng]} icon={icon}>
        <Popup>{location.displayName}</Popup>
      </Marker>
      <MapUpdater location={location} geoData={geoData} />
    </MapContainer>
  );
}
