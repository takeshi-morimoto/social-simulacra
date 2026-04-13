"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CampaignSpot, RouteStop } from "@/lib/types";
import { stripElectionSuffix, findPrefForMunicipality } from "@/lib/election-districts";

const CampaignRouteMapContent = dynamic(() => import("./CampaignRouteMapContent"), { ssr: false });

interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
}

interface Props {
  municipality: string;
  spots: CampaignSpot[];
  selectedSpotIds: Set<string>;
  routeStops: RouteStop[] | null;
  routeGeometry?: [number, number][] | null;
  onSpotClick: (spot: CampaignSpot) => void;
  hoveredSpotId?: string | null;
  onSpotHover?: (spotId: string | null) => void;
}

const PREF_CODE_MAP: Record<string, string> = {
  "北海道": "01", "青森": "02", "岩手": "03", "宮城": "04", "秋田": "05",
  "山形": "06", "福島": "07", "茨城": "08", "栃木": "09", "群馬": "10",
  "埼玉": "11", "千葉": "12", "東京": "13", "神奈川": "14", "新潟": "15",
  "富山": "16", "石川": "17", "福井": "18", "山梨": "19", "長野": "20",
  "岐阜": "21", "静岡": "22", "愛知": "23", "三重": "24", "滋賀": "25",
  "京都": "26", "大阪": "27", "兵庫": "28", "奈良": "29", "和歌山": "30",
  "鳥取": "31", "島根": "32", "岡山": "33", "広島": "34", "山口": "35",
  "徳島": "36", "香川": "37", "愛媛": "38", "高知": "39", "福岡": "40",
  "佐賀": "41", "長崎": "42", "熊本": "43", "大分": "44", "宮崎": "45",
  "鹿児島": "46", "沖縄": "47",
};

// 都道府県コードを抽出。入力に都道府県名が無い場合（"豊島区長選" など）は
// 市区町村名から逆引きする
function getPrefCode(name: string): string | null {
  for (const [pref, code] of Object.entries(PREF_CODE_MAP)) {
    if (name.includes(pref)) return code;
  }
  const stripped = stripElectionSuffix(name);
  if (stripped) {
    const prefName = findPrefForMunicipality(stripped);
    if (prefName) {
      for (const [pref, code] of Object.entries(PREF_CODE_MAP)) {
        if (prefName.includes(pref)) return code;
      }
    }
  }
  return null;
}

function extractDistrictNumber(name: string): number | null {
  const match = name.match(/第(\d+)区/);
  return match ? parseInt(match[1]) : null;
}

const SENKYOKU_BASE = "/geojson/senkyoku";
const MUNICIPALITY_BASE = "https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010";

export default function CampaignRouteMap({ municipality, spots, selectedSpotIds, routeStops, routeGeometry, onSpotClick, hoveredSpotId, onSpotHover }: Props) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!municipality) {
      setLocation(null);
      setGeoData(null);
      return;
    }

    // 末尾の選挙種別語のみ除去（"豊島区長選" → "豊島区"。"区"を残すのが重要）
    const searchQuery = stripElectionSuffix(municipality);

    setLoading(true);
    setGeoData(null);

    const prefCode = getPrefCode(municipality);
    const districtNum = extractDistrictNumber(municipality);
    const isShuugiin = /第\d+区/.test(municipality);

    // 同名地名（例: 豊島区 vs 香川県の豊島）の取り違えを防ぐため、
    // 都道府県名がわかれば必ずクエリに含める
    const prefName = findPrefForMunicipality(searchQuery);
    const geocodeQuery = prefName && !searchQuery.startsWith(prefName)
      ? `${prefName}${searchQuery} Japan`
      : `${searchQuery} Japan`;

    const geocodePromise = fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geocodeQuery)}&limit=1`,
      { headers: { "Accept-Language": "ja" } },
    )
      .then((r) => r.json())
      .then((results) => {
        if (results.length > 0) {
          return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
            displayName: results[0].display_name,
          } as GeoLocation;
        }
        return null;
      })
      .catch(() => null);

    let geoPromise: Promise<GeoJSON.FeatureCollection | null> = Promise.resolve(null);

    if (prefCode) {
      if (isShuugiin) {
        geoPromise = fetch(`${SENKYOKU_BASE}/${prefCode}.json`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data || !districtNum) return data;
            const filtered = {
              ...data,
              features: data.features.filter((f: GeoJSON.Feature) => f.properties?.ku === districtNum),
            };
            return filtered.features.length > 0 ? filtered : data;
          })
          .catch(() => null);
      } else {
        geoPromise = fetch(`${MUNICIPALITY_BASE}/N03-21_${prefCode}_210101.json`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data) return null;
            const targetName = searchQuery
              .replace(/^(北海道|東京都|大阪府|京都府|.{2,3}県)/, "")
              .replace(/(都|府|県)$/, "");
            if (!targetName) return data;
            const filtered = {
              ...data,
              features: data.features.filter((f: GeoJSON.Feature) => {
                const props = f.properties || {};
                const names = [props.N03_003, props.N03_004, props.N03_001].filter(Boolean).join("");
                return names.includes(targetName);
              }),
            };
            return filtered.features.length > 0 ? filtered : null;
          })
          .catch(() => null);
      }
    }

    Promise.all([geocodePromise, geoPromise])
      .then(([loc, geo]) => {
        setLocation(loc);
        setGeoData(geo);
      })
      .finally(() => setLoading(false));
  }, [municipality]);

  if (!municipality) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {loading && <div className="p-4 text-xs text-gray-400">地図を読み込み中...</div>}
      {!loading && location && (
        <div className="h-[550px]">
          <CampaignRouteMapContent
            location={location}
            geoData={geoData}
            spots={spots}
            selectedSpotIds={selectedSpotIds}
            routeStops={routeStops}
            routeGeometry={routeGeometry}
            onSpotClick={onSpotClick}
            hoveredSpotId={hoveredSpotId}
            onSpotHover={onSpotHover}
          />
        </div>
      )}
      {!loading && !location && (
        <div className="p-4 text-xs text-gray-400">地図データが見つかりませんでした</div>
      )}
    </div>
  );
}
