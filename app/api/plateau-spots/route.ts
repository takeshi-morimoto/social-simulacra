import { NextResponse } from "next/server";
import { getAllSpotsForArea } from "@/lib/plateau";
import { fetchOverpassSpots } from "@/lib/overpass";
import { findDistrictMunicipalities, findAreaCode } from "@/lib/estat";
import * as turf from "@turf/turf";
import { readFile } from "fs/promises";
import path from "path";
import type { CampaignSpot } from "@/lib/types";
import districtMap from "@/lib/district-map.json";

interface DistrictEntry {
  prefCode: string;
  ku: number;
  kuname: string;
  municipalities: { code: string; name: string }[];
}

async function loadDistrictPolygon(prefCode: string, ku: number): Promise<GeoJSON.Feature | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "geojson", "senkyoku", `${prefCode}.json`);
    const raw = await readFile(filePath, "utf-8");
    const fc: GeoJSON.FeatureCollection = JSON.parse(raw);
    return fc.features.find((f) => f.properties?.ku === ku) || null;
  } catch {
    return null;
  }
}

function filterSpotsInDistrict(spots: CampaignSpot[], districtFeature: GeoJSON.Feature): CampaignSpot[] {
  const geom = districtFeature.geometry;
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return spots;

  return spots.filter((spot) => {
    const pt = turf.point([spot.lng, spot.lat]);
    try {
      if (geom.type === "Polygon") {
        return turf.booleanPointInPolygon(pt, turf.polygon(geom.coordinates));
      } else {
        return turf.booleanPointInPolygon(pt, turf.multiPolygon(geom.coordinates));
      }
    } catch {
      return false;
    }
  });
}

/**
 * GeoJSON FeatureからOverpass用bbox [south, west, north, east] を取得
 */
function getBbox(feature: GeoJSON.Feature): [number, number, number, number] {
  const [west, south, east, north] = turf.bbox(feature);
  return [south, west, north, east];
}

/**
 * 名前を正規化（「岡本駅」と「岡本」を同一視するため）
 */
function normalizeName(name: string): string {
  return name
    .replace(/[（(].*?[）)]/g, "") // 括弧内を除去
    .replace(/\s+/g, "")
    .replace(/駅$/, ""); // 末尾の「駅」を除去
}

/**
 * 重複スポットを除去（同名・近接地点）
 */
function deduplicateSpots(spots: CampaignSpot[]): CampaignSpot[] {
  const result: CampaignSpot[] = [];
  const seenPositions: { lat: number; lng: number; name: string }[] = [];

  for (const spot of spots) {
    const norm = normalizeName(spot.name);

    // 近接地点（約100m以内）で正規化名が一致する場合は重複
    const isDup = seenPositions.some((s) => {
      const dist = Math.abs(s.lat - spot.lat) + Math.abs(s.lng - spot.lng);
      if (dist > 0.002) return false; // ~200m以上離れていれば別物
      const normSeen = normalizeName(s.name);
      return norm === normSeen || norm.includes(normSeen) || normSeen.includes(norm);
    });

    if (!isDup) {
      result.push(spot);
      seenPositions.push({ lat: spot.lat, lng: spot.lng, name: spot.name });
    }
  }

  return result;
}

/**
 * 種別ごとの上限と全体上限でスポットを絞り込む
 * 駅は全件残し、他は種別上限で切る
 */
function limitSpots(spots: CampaignSpot[], maxPerType: number, maxTotal: number): CampaignSpot[] {
  const byType: Record<string, CampaignSpot[]> = {};
  for (const s of spots) {
    (byType[s.type] ??= []).push(s);
  }

  const result: CampaignSpot[] = [];
  for (const [type, typeSpots] of Object.entries(byType)) {
    const limit = maxPerType;
    result.push(...typeSpots.slice(0, limit));
  }

  return result.slice(0, maxTotal);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const municipality = searchParams.get("municipality");

  if (!municipality) {
    return NextResponse.json({ error: "municipality is required" }, { status: 400 });
  }

  try {
    let areaCodes: string[] = [];
    let districtFeature: GeoJSON.Feature | null = null;

    // 衆議院小選挙区の場合
    if (/第\d+区/.test(municipality)) {
      const municipalities = findDistrictMunicipalities(municipality);
      areaCodes = municipalities.map((m) => m.code);

      const entry = (districtMap as Record<string, DistrictEntry>)[municipality];
      if (entry) {
        districtFeature = await loadDistrictPolygon(entry.prefCode, entry.ku);
      }
    }

    // それ以外
    if (areaCodes.length === 0) {
      const area = await findAreaCode(municipality);
      if (area) {
        areaCodes = [area.code];
      }
    }

    if (areaCodes.length === 0) {
      return NextResponse.json({ spots: [], message: "地域コードが見つかりませんでした" });
    }

    // 1. PLATEAUからスポット取得を試みる
    let plateauSpots = await getAllSpotsForArea(areaCodes);

    // 選挙区ポリゴンがあれば境界内に絞り込む
    if (districtFeature && plateauSpots.length > 0) {
      plateauSpots = filterSpotsInDistrict(plateauSpots, districtFeature);
    }

    // 2. OSM Overpass APIで補完
    //    PLATEAUの有無に関わらず、商業施設・公共施設はOverpassから取得
    let osmSpots: CampaignSpot[] = [];
    if (districtFeature) {
      const bbox = getBbox(districtFeature);
      const rawOsmSpots = await fetchOverpassSpots(bbox);
      osmSpots = filterSpotsInDistrict(rawOsmSpots, districtFeature);
    }

    // 3. マージ: PLATEAU優先、OSMで補完
    const allSpots = deduplicateSpots([...plateauSpots, ...osmSpots]);

    // 4. 件数が多すぎる場合、種別ごとに上限を設けてバランスよく絞る
    const MAX_PER_TYPE = 30;
    const MAX_TOTAL = 200;
    const limited = limitSpots(allSpots, MAX_PER_TYPE, MAX_TOTAL);

    return NextResponse.json(
      { spots: limited, source: plateauSpots.length > 0 ? "plateau+osm" : "osm" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("plateau-spots error:", e);
    return NextResponse.json({ error: "スポットの取得に失敗しました" }, { status: 500 });
  }
}
