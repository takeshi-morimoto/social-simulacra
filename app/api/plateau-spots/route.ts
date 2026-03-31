import { NextResponse } from "next/server";
import { getAllSpotsForArea } from "@/lib/plateau";
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

/**
 * 選挙区GeoJSONを読み込んで該当区のポリゴンを返す
 */
async function loadDistrictPolygon(prefCode: string, ku: number): Promise<GeoJSON.Feature | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "geojson", "senkyoku", `${prefCode}.json`);
    const raw = await readFile(filePath, "utf-8");
    const fc: GeoJSON.FeatureCollection = JSON.parse(raw);
    const feature = fc.features.find((f) => f.properties?.ku === ku);
    return feature || null;
  } catch {
    return null;
  }
}

/**
 * スポットが選挙区ポリゴン内にあるかチェック
 */
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

      // 選挙区ポリゴンを読み込み（空間フィルタ用）
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

    let spots = await getAllSpotsForArea(areaCodes);

    // 選挙区ポリゴンがあれば境界内のスポットだけに絞り込む
    if (districtFeature && spots.length > 0) {
      spots = filterSpotsInDistrict(spots, districtFeature);
    }

    return NextResponse.json(
      { spots },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("plateau-spots error:", e);
    return NextResponse.json({ error: "スポットの取得に失敗しました" }, { status: 500 });
  }
}
