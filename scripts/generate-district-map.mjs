/**
 * 衆議院小選挙区 → 構成市区町村の対応マッピングを生成するスクリプト
 * 選挙区GeoJSONと市区町村GeoJSONのポリゴン重なりで正確に判定
 *
 * Usage: node scripts/generate-district-map.mjs
 */
import { writeFileSync } from "fs";
import * as turf from "@turf/turf";

const GEOJSON_BASE = "https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data";
const PREF_CODES = [
  "01","02","03","04","05","06","07","08","09","10",
  "11","12","13","14","15","16","17","18","19","20",
  "21","22","23","24","25","26","27","28","29","30",
  "31","32","33","34","35","36","37","38","39","40",
  "41","42","43","44","45","46","47",
];

const PREF_NAMES = {
  "01":"北海道","02":"青森県","03":"岩手県","04":"宮城県","05":"秋田県",
  "06":"山形県","07":"福島県","08":"茨城県","09":"栃木県","10":"群馬県",
  "11":"埼玉県","12":"千葉県","13":"東京都","14":"神奈川県","15":"新潟県",
  "16":"富山県","17":"石川県","18":"福井県","19":"山梨県","20":"長野県",
  "21":"岐阜県","22":"静岡県","23":"愛知県","24":"三重県","25":"滋賀県",
  "26":"京都府","27":"大阪府","28":"兵庫県","29":"奈良県","30":"和歌山県",
  "31":"鳥取県","32":"島根県","33":"岡山県","34":"広島県","35":"山口県",
  "36":"徳島県","37":"香川県","38":"愛媛県","39":"高知県","40":"福岡県",
  "41":"佐賀県","42":"長崎県","43":"熊本県","44":"大分県","45":"宮崎県",
  "46":"鹿児島県","47":"沖縄県",
};

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.json();
}

// ポリゴンの重心を計算
function getCenter(feature) {
  try {
    const centroid = turf.centroid(feature);
    return centroid.geometry.coordinates;
  } catch {
    return null;
  }
}

// 点がポリゴン内にあるか判定
function isPointInFeature(point, feature) {
  try {
    const pt = turf.point(point);
    return turf.booleanPointInPolygon(pt, feature);
  } catch {
    return false;
  }
}

async function processPrefecture(prefCode) {
  const prefName = PREF_NAMES[prefCode];
  console.log(`Processing ${prefName} (${prefCode})...`);

  let districtData, muniData;
  try {
    [districtData, muniData] = await Promise.all([
      fetchJSON(`${GEOJSON_BASE}/constituency/geojson/s0010/senkyoku289polygon_${prefCode}.json`),
      fetchJSON(`${GEOJSON_BASE}/municipality/geojson/s0010/N03-21_${prefCode}_210101.json`),
    ]);
  } catch (e) {
    console.warn(`  Skipping ${prefName}: ${e.message}`);
    return {};
  }

  const result = {};

  for (const district of districtData.features) {
    const ku = district.properties.ku;
    const kuname = district.properties.kuname;
    const key = `${prefName}第${ku}区`;

    const municipalities = [];
    const seen = new Set();

    for (const muni of muniData.features) {
      const code = muni.properties?.N03_007;
      const name = muni.properties?.N03_004 || muni.properties?.N03_003 || "";
      if (!code || !name || seen.has(code)) continue;

      // 市区町村の重心が選挙区ポリゴン内にあるか判定
      const center = getCenter(muni);
      if (center && isPointInFeature(center, district)) {
        municipalities.push({ code, name });
        seen.add(code);
      }
    }

    if (municipalities.length > 0) {
      result[key] = {
        kucode: district.properties.kucode,
        kuname,
        prefCode,
        prefName,
        ku,
        municipalities,
      };
      console.log(`  ${key}: ${municipalities.map(m => m.name).join(", ")}`);
    }
  }

  return result;
}

async function main() {
  console.log("Generating election district → municipality mapping...\n");

  const allData = {};

  for (const prefCode of PREF_CODES) {
    const data = await processPrefecture(prefCode);
    Object.assign(allData, data);
    // Rate limit to be nice to GitHub
    await new Promise(r => setTimeout(r, 500));
  }

  const outputPath = "lib/district-map.json";
  writeFileSync(outputPath, JSON.stringify(allData, null, 2), "utf-8");
  console.log(`\nDone! Wrote ${Object.keys(allData).length} districts to ${outputPath}`);
}

main().catch(console.error);
