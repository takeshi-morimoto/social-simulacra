"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { stripElectionSuffix, findPrefForMunicipality } from "@/lib/election-districts";

const MapContent = dynamic(() => import("./MapContent"), { ssr: false });

interface Props {
  municipality: string;
  prefCode?: string | null;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
}

// 選挙区名から選挙区番号を抽出（例: "東京都第10区" → 10）
function extractDistrictNumber(name: string): number | null {
  const match = name.match(/第(\d+)区/);
  return match ? parseInt(match[1]) : null;
}

// 選挙区タイプを判定
function getElectionType(name: string): "shuugiin" | "municipality" | "prefecture" {
  if (/第\d+区/.test(name)) return "shuugiin";
  if (/(議会|区長選|市長選|町長選|村長選)/.test(name)) return "municipality";
  return "prefecture";
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

// 都道府県コードを抽出。入力に都道府県名が含まれていない場合は
// 市区町村名から逆引きする（例: "豊島区長選" → 東京都 "13"）
function getPrefCode(name: string): string | null {
  for (const [pref, code] of Object.entries(PREF_CODE_MAP)) {
    if (name.includes(pref)) return code;
  }
  // 市区町村名のみのケース: 末尾の選挙種別語を取り除いてから逆引き
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

// 2022年区割り改定版の選挙区GeoJSON（自前ホスト）
const SENKYOKU_BASE = "/geojson/senkyoku";
// 市区町村GeoJSON（smartnews-smri）
const MUNICIPALITY_BASE = "https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/geojson/s0010";

export default function ElectionMap({ municipality }: Props) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!municipality) {
      setLocation(null);
      setGeoData(null);
      return;
    }

    // 末尾の選挙種別語のみを除去（"豊島区長選" → "豊島区"）
    const searchQuery = stripElectionSuffix(municipality);

    setLoading(true);
    setGeoData(null);

    const prefCode = getPrefCode(municipality);
    const electionType = getElectionType(municipality);
    const districtNum = extractDistrictNumber(municipality);

    // ジオコーディングとGeoJSON取得を並行実行
    const geocodePromise = fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Japan")}&limit=1`,
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

    // GeoJSON境界データの取得
    let geoPromise: Promise<GeoJSON.FeatureCollection | null> = Promise.resolve(null);

    if (prefCode) {
      if (electionType === "shuugiin") {
        // 衆議院小選挙区: 2022年区割り改定版GeoJSON
        geoPromise = fetch(`${SENKYOKU_BASE}/${prefCode}.json`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data || !districtNum) return data;
            const filtered = {
              ...data,
              features: data.features.filter((f: GeoJSON.Feature) => {
                return f.properties?.ku === districtNum;
              }),
            };
            return filtered.features.length > 0 ? filtered : data;
          })
          .catch(() => null);
      } else {
        // 市区町村・都道府県: 市区町村GeoJSON
        geoPromise = fetch(`${MUNICIPALITY_BASE}/N03-21_${prefCode}_210101.json`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data) return null;
            // 市区町村名でフィルタ
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-800">選挙区マップ</div>
      {loading && <p className="text-xs text-gray-400">地図を読み込み中...</p>}
      {!loading && location && (
        <div className="h-[300px] rounded-md overflow-hidden">
          <MapContent location={location} geoData={geoData} />
        </div>
      )}
      {!loading && !location && (
        <p className="text-xs text-gray-400">この選挙区の地図データが見つかりませんでした</p>
      )}
    </div>
  );
}
