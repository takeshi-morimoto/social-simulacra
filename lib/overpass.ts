import type { CampaignSpot, SpotType } from "./types";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

function generateSpotId(name: string, lat: number, lng: number): string {
  const raw = `osm_${name}_${lat.toFixed(6)}_${lng.toFixed(6)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
}

/**
 * バウンディングボックスからおおよその面積(m²)を算出
 */
function estimateAreaM2(bounds: { minlat: number; minlon: number; maxlat: number; maxlon: number }): number {
  const latMid = (bounds.minlat + bounds.maxlat) / 2;
  const dLatM = (bounds.maxlat - bounds.minlat) * 111_000;
  const dLonM = (bounds.maxlon - bounds.minlon) * 111_000 * Math.cos((latMid * Math.PI) / 180);
  // バウンディングボックスの約65%が実際の面積と仮定（矩形→多角形の補正）
  return dLatM * dLonM * 0.65;
}

/**
 * bboxからOverpass APIでPOIを取得
 * bbox: [south, west, north, east] (Overpass形式)
 */
export async function fetchOverpassSpots(bbox: [number, number, number, number]): Promise<CampaignSpot[]> {
  const [south, west, north, east] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  // bbox面積で軽量クエリに切り替え（大きい選挙区対策）
  const bboxArea = (north - south) * (east - west);
  const useLight = bboxArea > 0.5; // 約50km四方以上

  const query = useLight
    ? `
[out:json][timeout:60];
(
  node["railway"="station"](${bboxStr});
  node["shop"="supermarket"]["name"](${bboxStr});
  node["shop"="mall"]["name"](${bboxStr});
  node["amenity"="community_centre"]["name"](${bboxStr});
  node["amenity"="townhall"]["name"](${bboxStr});
);
out;
`
    : `
[out:json][timeout:60];
(
  nwr["railway"="station"](${bboxStr});
  nwr["railway"="halt"](${bboxStr});
  nwr["leisure"="park"]["name"](${bboxStr});
  nwr["shop"="supermarket"](${bboxStr});
  nwr["shop"="mall"](${bboxStr});
  nwr["shop"="department_store"](${bboxStr});
  nwr["amenity"="community_centre"](${bboxStr});
  nwr["amenity"="townhall"](${bboxStr});
);
out center bb;
`;

  try {
    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.error("Overpass API error:", res.status);
      return [];
    }

    const data = await res.json();
    const elements: OverpassElement[] = data.elements || [];

    return elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (!lat || !lon) return null;

        const tags = el.tags || {};
        const name = tags.name || tags["name:ja"] || "";
        if (!name) return null;

        const type = classifyOsmElement(tags);

        // バウンディングボックスがあれば面積を推定
        const props: Record<string, unknown> = { ...tags };
        if (el.bounds) {
          props._areaM2 = estimateAreaM2(el.bounds);
        }

        return {
          id: generateSpotId(name, lat, lon),
          name,
          type,
          lat,
          lng: lon,
          address: tags["addr:full"] || tags["addr:city"] || undefined,
          properties: props,
          score: 0,
        } as CampaignSpot;
      })
      .filter((s): s is CampaignSpot => s !== null);
  } catch (e) {
    console.error("Overpass fetch error:", e);
    return [];
  }
}

function classifyOsmElement(tags: Record<string, string>): SpotType {
  if (tags.railway === "station" || tags.railway === "halt") return "station";
  if (tags.leisure === "park") return "park";
  if (tags.shop === "supermarket" || tags.shop === "mall" || tags.shop === "department_store") return "shopping";
  if (tags.amenity === "community_centre" || tags.amenity === "townhall") return "public_hall";
  return "landmark";
}
