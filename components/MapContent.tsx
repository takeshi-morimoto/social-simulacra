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
  weight: 3,
  fillColor: "#3B5998",
  fillOpacity: 0.25,
  stroke: true,
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
            const props = feature.properties || {};
            const name = props.kuname
              || [props.N03_001, props.N03_003, props.N03_004].filter(Boolean).join(" ")
              || props.name
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
