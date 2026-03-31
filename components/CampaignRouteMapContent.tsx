"use client";

import { MapContainer, TileLayer, GeoJSON, CircleMarker, Polyline, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CampaignSpot, RouteStop, SpotType } from "@/lib/types";

interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
}

interface Props {
  location: GeoLocation;
  geoData: GeoJSON.FeatureCollection | null;
  spots: CampaignSpot[];
  selectedSpotIds: Set<string>;
  routeStops: RouteStop[] | null;
  onSpotClick: (spot: CampaignSpot) => void;
}

const SPOT_COLORS: Record<SpotType, string> = {
  station: "#E74C3C",
  park: "#27AE60",
  shelter: "#3498DB",
  landmark: "#F39C12",
  shopping: "#9B59B6",
  public_hall: "#1ABC9C",
};

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

function createMaskGeoJSON(geoData: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const world: [number, number][] = [
    [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90],
  ];
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
      geometry: { type: "Polygon", coordinates: [world, ...holes] },
    }],
  };
}

const MASK_STYLE: L.PathOptions = { color: "transparent", weight: 0, fillColor: "#ffffff", fillOpacity: 0.55 };
const BOUNDARY_STYLE: L.PathOptions = { color: "#1B2A4A", weight: 2.5, fill: false };

export default function CampaignRouteMapContent({ location, geoData, spots, selectedSpotIds, routeStops, onSpotClick }: Props) {
  const maskData = geoData ? createMaskGeoJSON(geoData) : null;

  const routePositions = routeStops
    ? routeStops.map((s) => [s.spot.lat, s.spot.lng] as [number, number])
    : [];

  return (
    <MapContainer
      center={[location.lat, location.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      preferCanvas={true}
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
        />
      )}

      {/* スポットマーカー */}
      {spots.map((spot) => {
        const isSelected = selectedSpotIds.has(spot.id);
        const color = SPOT_COLORS[spot.type];
        const radius = 4 + (spot.score / 100) * 10;
        const opacity = 0.3 + (spot.score / 100) * 0.7;

        return (
          <CircleMarker
            key={spot.id}
            center={[spot.lat, spot.lng]}
            radius={radius}
            pathOptions={{
              color: isSelected ? "#1B2A4A" : color,
              weight: isSelected ? 3 : 1.5,
              fillColor: color,
              fillOpacity: opacity,
            }}
            eventHandlers={{ click: () => onSpotClick(spot) }}
          >
            <Tooltip direction="top" offset={[0, -radius]}>
              <span className="text-xs font-medium">{spot.name}</span>
              <br />
              <span className="text-[10px] text-gray-500">スコア: {spot.score}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* ルート線 */}
      {routePositions.length >= 2 && (
        <Polyline
          positions={routePositions}
          pathOptions={{ color: "#1B2A4A", weight: 3, opacity: 0.7, dashArray: "8, 6" }}
        />
      )}

      {/* ルート番号マーカー */}
      {routeStops?.map((stop, i) => (
        <CircleMarker
          key={`route-${stop.spotId}`}
          center={[stop.spot.lat, stop.spot.lng]}
          radius={12}
          pathOptions={{
            color: "#1B2A4A",
            weight: 2,
            fillColor: "#1B2A4A",
            fillOpacity: 0.9,
          }}
        >
          <Tooltip direction="center" permanent className="route-number-tooltip">
            <span style={{ color: "white", fontWeight: "bold", fontSize: "11px" }}>{i + 1}</span>
          </Tooltip>
        </CircleMarker>
      ))}

      <MapUpdater location={location} geoData={geoData} />
    </MapContainer>
  );
}
