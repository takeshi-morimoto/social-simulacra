import type { CampaignSpot, SpotType } from "./types";

const GRAPHQL_ENDPOINT = "https://api.plateau.reearth.io/datacatalog/graphql";

interface DatasetItem {
  url: string;
  format: string;
  name: string;
}

interface DatasetNode {
  name: string;
  type: { code: string };
  items: DatasetItem[];
}

function generateSpotId(name: string, lat: number, lng: number): string {
  const raw = `${name}_${lat.toFixed(6)}_${lng.toFixed(6)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * PLATEAUで利用可能なエリアコードを取得
 */
async function fetchAvailableAreas(prefCode: string): Promise<Set<string>> {
  const query = `{ areas(input: { parentCode: "${prefCode}", searchTokens: [] }) { code } }`;
  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return new Set();
    const json = await res.json();
    const areas: { code: string }[] = json.data?.areas || [];
    return new Set(areas.map((a) => a.code));
  } catch {
    return new Set();
  }
}

/**
 * PLATEAU GraphQL APIからデータセットURLを取得
 */
async function fetchPlateauDatasets(areaCodes: string[]): Promise<DatasetNode[]> {
  // PLATEAUに存在するエリアのみ使う
  const prefCodes = [...new Set(areaCodes.map((c) => c.substring(0, 2)))];
  const availableSets = await Promise.all(prefCodes.map((p) => fetchAvailableAreas(p)));
  const available = new Set<string>();
  for (const s of availableSets) s.forEach((c) => available.add(c));

  const validCodes = areaCodes.filter((c) => available.has(c));
  if (validCodes.length === 0) return [];

  const query = `{
    datasets(input: {
      areaCodes: ${JSON.stringify(validCodes)},
      includeTypes: ["shelter", "park", "station", "landmark"]
    }) {
      name
      type { code }
      items { url format name }
    }
  }`;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    console.error("PLATEAU API error:", res.status);
    return [];
  }

  const json = await res.json();
  return json.data?.datasets || [];
}

/**
 * GeoJSON (shelter/park) をCampaignSpot[]にパース
 */
async function fetchGeoJSONSpots(url: string, type: SpotType): Promise<CampaignSpot[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const features = data.features || [];
    return features
      .filter((f: GeoJSON.Feature) => f.geometry?.type === "Point")
      .map((f: GeoJSON.Feature) => {
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        const props = f.properties || {};
        const name = props["名称"] || props["公園名"] || props["name"] || "不明";
        const lat = coords[1];
        const lng = coords[0];
        return {
          id: generateSpotId(name, lat, lng),
          name,
          type,
          lat,
          lng,
          address: props["住所"] || props["所在地"] || undefined,
          properties: props,
          score: 0,
        } as CampaignSpot;
      });
  } catch (e) {
    console.error(`Failed to fetch GeoJSON (${type}):`, e);
    return [];
  }
}

/**
 * CZML (station/landmark) をCampaignSpot[]にパース
 */
async function parseCZMLSpots(url: string, type: SpotType): Promise<CampaignSpot[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const packets = await res.json();

    if (!Array.isArray(packets)) return [];

    const spots: CampaignSpot[] = [];
    // 先頭のdocument packetをスキップ
    for (let i = 1; i < packets.length; i++) {
      const packet = packets[i];
      const name = packet.name || `${type}_${i}`;
      const pos = packet.position?.cartographicDegrees;
      if (!pos || !Array.isArray(pos)) continue;

      // [lng, lat, height] or [time, lng, lat, height, ...]
      let lng: number, lat: number;
      if (pos.length === 3) {
        [lng, lat] = pos;
      } else if (pos.length >= 4) {
        // time-tagged の場合: [time, lng, lat, height] のパターンが多い
        // 数値でない先頭要素 = time -> skip
        if (typeof pos[0] === "string" || pos.length > 4) {
          lng = pos[1];
          lat = pos[2];
        } else {
          [lng, lat] = pos;
        }
      } else {
        continue;
      }

      if (typeof lat !== "number" || typeof lng !== "number") continue;
      // 日本の緯度経度範囲チェック
      if (lat < 20 || lat > 50 || lng < 120 || lng > 155) continue;

      spots.push({
        id: generateSpotId(name, lat, lng),
        name,
        type,
        lat,
        lng,
        properties: {},
        score: 0,
      });
    }
    return spots;
  } catch (e) {
    console.error(`Failed to parse CZML (${type}):`, e);
    return [];
  }
}

/**
 * 指定エリアコードのPLATEAU全スポットを取得
 */
export async function getAllSpotsForArea(areaCodes: string[]): Promise<CampaignSpot[]> {
  if (areaCodes.length === 0) return [];

  const datasets = await fetchPlateauDatasets(areaCodes);
  const fetchPromises: Promise<CampaignSpot[]>[] = [];

  for (const ds of datasets) {
    const typeCode = ds.type.code as SpotType;
    for (const item of ds.items) {
      const fmt = item.format.toUpperCase();
      if (fmt === "GEOJSON") {
        fetchPromises.push(fetchGeoJSONSpots(item.url, typeCode));
      } else if (fmt === "CZML") {
        fetchPromises.push(parseCZMLSpots(item.url, typeCode));
      }
    }
  }

  const results = await Promise.all(fetchPromises);
  const allSpots = results.flat();

  // 重複除去（同名・近接スポット）
  const seen = new Set<string>();
  return allSpots.filter((spot) => {
    if (seen.has(spot.id)) return false;
    seen.add(spot.id);
    return true;
  });
}

/**
 * PLATEAUで利用可能なエリアかどうかを確認
 */
export async function checkPlateauAvailability(areaCodes: string[]): Promise<boolean> {
  const datasets = await fetchPlateauDatasets(areaCodes);
  return datasets.length > 0;
}
