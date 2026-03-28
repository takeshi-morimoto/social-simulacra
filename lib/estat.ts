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

/**
 * 市区町村名から人口統計を取得するメイン関数
 */
export async function getDemographicsForMunicipality(municipalityName: string): Promise<MunicipalityDemographics | null> {
  const area = await findAreaCode(municipalityName);
  if (!area) return null;

  return fetchDemographics(area.code, area.name);
}
