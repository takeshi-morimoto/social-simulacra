"use client";

import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoLocation } from "./ElectionMap";

function MapUpdater({ location, geoData }: { location: GeoLocation; geoData: GeoJSON.FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (geoData && geoData.features.length > 0) {
      const geoLayer = L.geoJSON(geoData);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
        return;
      }
    }
    map.setView([location.lat, location.lng], 12);
  }, [map, location, geoData]);
  return null;
}

// 選挙区の外側を半透明の白でマスクするGeoJSONを生成
function createMaskGeoJSON(geoData: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  // 世界全体を覆う大きな矩形（外側ポリゴン）
  const world: [number, number][] = [
    [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90],
  ];

  // 選挙区のポリゴンを穴として使う
  const holes: [number, number][][] = [];
  for (const feature of geoData.features) {
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      holes.push(geom.coordinates[0] as [number, number][]);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        holes.push(poly[0] as [number, number][]);
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [world, ...holes],
      },
    }],
  };
}

const MASK_STYLE: L.PathOptions = {
  color: "transparent",
  weight: 0,
  fillColor: "#ffffff",
  fillOpacity: 0.55,
};

const BOUNDARY_STYLE: L.PathOptions = {
  color: "#1B2A4A",
  weight: 2.5,
  fill: false,
};

interface Props {
  location: GeoLocation;
  geoData: GeoJSON.FeatureCollection | null;
}

export default function MapContent({ location, geoData }: Props) {
  const maskData = geoData ? createMaskGeoJSON(geoData) : null;

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
      {maskData && (
        <GeoJSON
          key={"mask-" + JSON.stringify(geoData).substring(0, 50)}
          data={maskData}
          style={MASK_STYLE}
        />
      )}
      {geoData && (
        <GeoJSON
          key={"boundary-" + JSON.stringify(geoData).substring(0, 50)}
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
      <MapUpdater location={location} geoData={geoData} />
    </MapContainer>
  );
}
