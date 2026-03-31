const ESTAT_BASE = "https://api.e-stat.go.jp/rest/3.0/app/json";
const APP_ID = process.env.ESTAT_API_KEY!;

// 2020年国勢調査: 男女，年齢（各歳），国籍総数か日本人別人口（市区町村別）
const CENSUS_STATS_ID = "0003445139";

interface EStatValue {
  "@tab": string;
  "@cat01": string;
  "@cat02": string;
  "@cat03": string;
  "@area": string;
  "@time": string;
  "@unit": string;
  $: string;
}

interface EStatClass {
  "@code": string;
  "@name": string;
  "@level"?: string;
}

export interface MunicipalityDemographics {
  code: string;
  name: string;
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  ageDistribution: { name: string; value: number; count: number }[];
  agingRate: number;
  foreignRate: number;
}

export interface PrefectureTurnout {
  prefCode: string;
  prefName: string;
  shugiinSmall: number | null;
  shugiinProp: number | null;
  sangiinProp: number | null;
  sangiinConst: number | null;
  prefAssembly: number | null;
  governor: number | null;
  municipalAssembly: number | null;
  mayor: number | null;
}

// 都道府県コードマッピング
const PREF_MAP: Record<string, string> = {
  "北海道": "01000", "青森": "02000", "岩手": "03000", "宮城": "04000", "秋田": "05000",
  "山形": "06000", "福島": "07000", "茨城": "08000", "栃木": "09000", "群馬": "10000",
  "埼玉": "11000", "千葉": "12000", "東京": "13000", "神奈川": "14000", "新潟": "15000",
  "富山": "16000", "石川": "17000", "福井": "18000", "山梨": "19000", "長野": "20000",
  "岐阜": "21000", "静岡": "22000", "愛知": "23000", "三重": "24000", "滋賀": "25000",
  "京都": "26000", "大阪": "27000", "兵庫": "28000", "奈良": "29000", "和歌山": "30000",
  "鳥取": "31000", "島根": "32000", "岡山": "33000", "広島": "34000", "山口": "35000",
  "徳島": "36000", "香川": "37000", "愛媛": "38000", "高知": "39000", "福岡": "40000",
  "佐賀": "41000", "長崎": "42000", "熊本": "43000", "大分": "44000", "宮崎": "45000",
  "鹿児島": "46000", "沖縄": "47000",
};

/**
 * 市区町村名からe-Statの地域コードを検索する
 */
export async function findAreaCode(municipalityName: string): Promise<{ code: string; name: string } | null> {
  // 選挙区名から地域名を抽出（例: "東京都第10区" → "東京都", "豊島区議会" → "豊島区"）
  const cleaned = municipalityName
    .replace(/第\d+区$/, "")
    .replace(/(議会|知事選|市長選|区長選|町長選|村長選|選挙区).*$/, "")
    .replace(/\s+/g, "")
    .trim();

  const url = `${ESTAT_BASE}/getStatsList?appId=${APP_ID}&statsDataId=${CENSUS_STATS_ID}&searchWord=${encodeURIComponent(cleaned)}&limit=1`;

  // 地域コード一覧から検索する別アプローチ: getStatsDataのメタ情報を利用
  // まず都道府県・市区町村の全リストを取得して名前でマッチ
  const metaUrl = `${ESTAT_BASE}/getMetaInfo?appId=${APP_ID}&statsDataId=${CENSUS_STATS_ID}`;

  try {
    const res = await fetch(metaUrl);
    const data = await res.json();
    const areaClass = data.GET_META_INFO?.METADATA_INF?.CLASS_INF?.CLASS_OBJ
      ?.find((c: { "@id": string }) => c["@id"] === "area");

    if (!areaClass) return null;

    const classes: EStatClass[] = Array.isArray(areaClass.CLASS) ? areaClass.CLASS : [areaClass.CLASS];

    // 完全一致 → 部分一致の順で検索
    const exact = classes.find((c) => c["@name"] === cleaned);
    if (exact) return { code: exact["@code"], name: exact["@name"] };

    const partial = classes.find((c) => c["@name"].includes(cleaned) || cleaned.includes(c["@name"]));
    if (partial) return { code: partial["@code"], name: partial["@name"] };

    // 都道府県名を除いて検索（例: "東京都豊島区" → "豊島区"）
    const withoutPref = cleaned.replace(/^(北海道|東京都|大阪府|京都府|.{2,3}県)/, "");
    if (withoutPref !== cleaned) {
      const match = classes.find((c) => c["@name"] === withoutPref);
      if (match) return { code: match["@code"], name: match["@name"] };

      const partialMatch = classes.find((c) => c["@name"].includes(withoutPref));
      if (partialMatch) return { code: partialMatch["@code"], name: partialMatch["@name"] };
    }

    return null;
  } catch (e) {
    console.error("findAreaCode error:", e);
    return null;
  }
}

/**
 * 市区町村コードから人口統計データを取得
 */
export async function fetchDemographics(areaCode: string, areaName: string): Promise<MunicipalityDemographics | null> {
  // cat01=0(国籍総数), cat02=0,1,2(総数,男,女), cat03は年齢
  // 5歳階級で集計するため全年齢を取得
  const url = `${ESTAT_BASE}/getStatsData?appId=${APP_ID}&statsDataId=${CENSUS_STATS_ID}&cdArea=${areaCode}&cdCat01=0&limit=1000`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const values: EStatValue[] = data.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
    if (!values?.length) return null;

    // 総人口（cat02=0総数, cat03=000総数）
    const totalPop = values.find((v) => v["@cat02"] === "0" && v["@cat03"] === "000");
    const malePop = values.find((v) => v["@cat02"] === "1" && v["@cat03"] === "000");
    const femalePop = values.find((v) => v["@cat02"] === "2" && v["@cat03"] === "000");

    if (!totalPop) return null;

    const totalPopulation = parseInt(totalPop.$) || 0;
    const malePopulation = parseInt(malePop?.$  || "0") || 0;
    const femalePopulation = parseInt(femalePop?.$ || "0") || 0;

    // 年齢階級別に集計（cat02=0総数のみ、cat03=001〜100が各歳）
    const ageData = values.filter((v) => v["@cat02"] === "0" && v["@cat03"] !== "000" && !v["@cat03"].startsWith("1"));

    // 年齢コード: "001"=0歳, "002"=1歳, ..., "101"=100歳以上 (一部データでは"0XX"形式)
    const ageCounts: Record<string, number> = {
      "0〜14歳": 0,
      "15〜29歳": 0,
      "30〜44歳": 0,
      "45〜64歳": 0,
      "65歳以上": 0,
    };

    for (const v of ageData) {
      const ageCode = parseInt(v["@cat03"]);
      const age = ageCode - 1; // "001" = 0歳, "002" = 1歳, etc.
      const count = parseInt(v.$) || 0;

      if (age < 0 || isNaN(age)) continue;

      if (age <= 14) ageCounts["0〜14歳"] += count;
      else if (age <= 29) ageCounts["15〜29歳"] += count;
      else if (age <= 44) ageCounts["30〜44歳"] += count;
      else if (age <= 64) ageCounts["45〜64歳"] += count;
      else ageCounts["65歳以上"] += count;
    }

    const sumAge = Object.values(ageCounts).reduce((a, b) => a + b, 0) || totalPopulation;

    const ageDistribution = Object.entries(ageCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / sumAge) * 1000) / 10,
      count,
    }));

    const agingRate = Math.round((ageCounts["65歳以上"] / sumAge) * 1000) / 10;

    return {
      code: areaCode,
      name: areaName,
      totalPopulation,
      malePopulation,
      femalePopulation,
      ageDistribution,
      agingRate,
      foreignRate: 0, // 国籍別データは別途取得が必要
    };
  } catch (e) {
    console.error("fetchDemographics error:", e);
    return null;
  }
}

// 事前生成された選挙区→構成市区町村マッピング（turf.jsでポリゴン判定済み）
import districtMap from "./district-map.json";

export interface DistrictMunicipality {
  code: string;
  name: string;
  overlapRatio: number; // この選挙区に含まれる割合（%）
  partial: boolean; // 分割されている場合true
}

interface DistrictEntry {
  kucode: number;
  kuname: string;
  prefCode: string;
  prefName: string;
  ku: number;
  municipalities: DistrictMunicipality[];
}

/**
 * 衆議院小選挙区の構成市区町村を取得する
 * 事前生成済みのマッピングJSONを参照（turf.js面積重なり判定で生成）
 */
export function findDistrictMunicipalities(municipalityName: string): DistrictMunicipality[] {
  // "栃木県第4区" のような入力を正規化してマッピングキーに変換
  const prefName = extractPrefName(municipalityName);
  const districtNum = municipalityName.match(/第(\d+)区/)?.[1];
  if (!prefName || !districtNum) return [];

  // "栃木" → "栃木県" に正規化
  const fullPrefName = prefName + (prefName.match(/(都|道|府|県)$/) ? "" :
    prefName === "北海道" ? "" :
    prefName === "東京" ? "都" :
    prefName === "大阪" || prefName === "京都" ? "府" : "県");

  const key = `${fullPrefName}第${districtNum}区`;
  const entry = (districtMap as Record<string, DistrictEntry>)[key];

  return entry?.municipalities || [];
}

/**
 * 複数市区町村の人口データを集約（重なり率で按分）
 */
async function fetchAggregatedDemographics(
  areaCodes: DistrictMunicipality[],
  districtName: string,
): Promise<MunicipalityDemographics | null> {
  if (areaCodes.length === 0) return null;

  const codes = areaCodes.map((a) => a.code).join(",");
  const url = `${ESTAT_BASE}/getStatsData?appId=${APP_ID}&statsDataId=${CENSUS_STATS_ID}&cdArea=${codes}&cdCat01=0&limit=10000`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const values: EStatValue[] = data.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
    if (!values?.length) return null;

    // 重なり率のマップを作成
    const ratioMap = new Map<string, number>();
    for (const a of areaCodes) {
      ratioMap.set(a.code, (a.overlapRatio || 100) / 100);
    }

    let totalPopulation = 0, malePopulation = 0, femalePopulation = 0;
    const ageCounts: Record<string, number> = {
      "0〜14歳": 0, "15〜29歳": 0, "30〜44歳": 0, "45〜64歳": 0, "65歳以上": 0,
    };

    // 各市区町村の人口を重なり率で按分して合算
    for (const area of areaCodes) {
      const ratio = ratioMap.get(area.code) || 1;
      const areaValues = values.filter((v) => v["@area"] === area.code);

      const total = areaValues.find((v) => v["@cat02"] === "0" && v["@cat03"] === "000");
      const male = areaValues.find((v) => v["@cat02"] === "1" && v["@cat03"] === "000");
      const female = areaValues.find((v) => v["@cat02"] === "2" && v["@cat03"] === "000");

      totalPopulation += Math.round((parseInt(total?.$ || "0") || 0) * ratio);
      malePopulation += Math.round((parseInt(male?.$ || "0") || 0) * ratio);
      femalePopulation += Math.round((parseInt(female?.$ || "0") || 0) * ratio);

      // 年齢別集計（按分）
      const ageData = areaValues.filter((v) => v["@cat02"] === "0" && v["@cat03"] !== "000");
      for (const v of ageData) {
        const ageCode = parseInt(v["@cat03"]);
        const age = ageCode - 1;
        const count = Math.round((parseInt(v.$) || 0) * ratio);
        if (age < 0 || isNaN(age)) continue;
        if (age <= 14) ageCounts["0〜14歳"] += count;
        else if (age <= 29) ageCounts["15〜29歳"] += count;
        else if (age <= 44) ageCounts["30〜44歳"] += count;
        else if (age <= 64) ageCounts["45〜64歳"] += count;
        else ageCounts["65歳以上"] += count;
      }
    }

    const sumAge = Object.values(ageCounts).reduce((a, b) => a + b, 0) || totalPopulation;
    const ageDistribution = Object.entries(ageCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / sumAge) * 1000) / 10,
      count,
    }));
    const agingRate = Math.round((ageCounts["65歳以上"] / sumAge) * 1000) / 10;

    const fullMunis = areaCodes.filter((a) => !a.partial).map((a) => a.name);
    const partialMunis = areaCodes.filter((a) => a.partial).map((a) => `${a.name}(${a.overlapRatio}%)`);
    const municipalityNames = [...fullMunis, ...partialMunis].join("・");

    return {
      code: areaCodes[0].code,
      name: `${districtName}（${municipalityNames}）`,
      totalPopulation,
      malePopulation,
      femalePopulation,
      ageDistribution,
      agingRate,
      foreignRate: 0,
    };
  } catch (e) {
    console.error("fetchAggregatedDemographics error:", e);
    return null;
  }
}

/**
 * 市区町村名から人口統計を取得するメイン関数
 * 衆議院小選挙区の場合は構成市区町村の人口を集約
 */
export async function getDemographicsForMunicipality(municipalityName: string): Promise<MunicipalityDemographics | null> {
  // 衆議院小選挙区の場合
  if (/第\d+区/.test(municipalityName)) {
    const municipalities = await findDistrictMunicipalities(municipalityName);
    if (municipalities.length > 0) {
      return fetchAggregatedDemographics(municipalities, municipalityName);
    }
  }

  // 通常の市区町村
  const area = await findAreaCode(municipalityName);
  if (!area) return null;

  return fetchDemographics(area.code, area.name);
}

/**
 * 選挙区名から都道府県コードを抽出
 */
function extractPrefCode(municipalityName: string): string | null {
  for (const [name, code] of Object.entries(PREF_MAP)) {
    if (municipalityName.includes(name)) return code;
  }
  return null;
}

/**
 * 都道府県名を抽出
 */
export function extractPrefName(municipalityName: string): string | null {
  for (const name of Object.keys(PREF_MAP)) {
    if (municipalityName.includes(name)) return name;
  }
  return null;
}

/**
 * 都道府県コードの2桁番号を取得（地図GeoJSON用）
 */
export function extractPrefCodeShort(municipalityName: string): string | null {
  const code = extractPrefCode(municipalityName);
  if (!code) return null;
  return code.substring(0, 2);
}

// 社会・人口統計体系 都道府県データ（投票率含む）
const TURNOUT_STATS_ID = "0000010107";

// 投票率カテゴリコード
const TURNOUT_CATS: Record<string, keyof Omit<PrefectureTurnout, "prefCode" | "prefName">> = {
  "G6301": "shugiinSmall",
  "G6302": "shugiinProp",
  "G6303": "sangiinProp",
  "G6304": "sangiinConst",
  "G6305": "prefAssembly",
  "G6306": "governor",
  "G6307": "municipalAssembly",
  "G6308": "mayor",
};

/**
 * 都道府県の選挙投票率を取得（直近のデータ）
 */
export async function fetchPrefTurnout(municipalityName: string): Promise<PrefectureTurnout | null> {
  const prefCode = extractPrefCode(municipalityName);
  if (!prefCode) return null;

  const prefName = extractPrefName(municipalityName) || "";

  const catCodes = Object.keys(TURNOUT_CATS).join(",");
  const url = `${ESTAT_BASE}/getStatsData?appId=${APP_ID}&statsDataId=${TURNOUT_STATS_ID}&cdCat01=${catCodes}&cdArea=${prefCode}&limit=200`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const values = data.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
    if (!values?.length) return null;

    const result: PrefectureTurnout = {
      prefCode,
      prefName,
      shugiinSmall: null, shugiinProp: null,
      sangiinProp: null, sangiinConst: null,
      prefAssembly: null, governor: null,
      municipalAssembly: null, mayor: null,
    };

    // 各カテゴリの最新データ（最大の年）を取得
    for (const [catCode, field] of Object.entries(TURNOUT_CATS)) {
      const catValues = values
        .filter((v: { "@cat01": string; $: string }) => v["@cat01"] === catCode && v.$ !== "-")
        .sort((a: { "@time": string }, b: { "@time": string }) => b["@time"].localeCompare(a["@time"]));

      if (catValues.length > 0) {
        result[field] = parseFloat(catValues[0].$) || null;
      }
    }

    return result;
  } catch (e) {
    console.error("fetchPrefTurnout error:", e);
    return null;
  }
}
