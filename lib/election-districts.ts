import districtMap from "./district-map.json";
import municipalities from "./municipalities.json";

export type ElectionType = "shugi" | "sangi" | "chiji" | "shicho" | "gikai";

export interface ElectionTypeInfo {
  key: ElectionType;
  label: string;
  description: string;
}

export const ELECTION_TYPES: ElectionTypeInfo[] = [
  { key: "shugi", label: "衆議院小選挙区", description: "衆議院議員選挙" },
  { key: "sangi", label: "参議院選挙区", description: "参議院議員選挙" },
  { key: "chiji", label: "知事選", description: "都道府県知事選挙" },
  { key: "shicho", label: "首長選", description: "市区町村長選挙" },
  { key: "gikai", label: "議会選", description: "市区町村議会選挙" },
];

const PREFS = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

// 参議院の合区
const SANGIIN_MERGED = [
  { name: "鳥取県・島根県選挙区", prefs: ["鳥取県", "島根県"] },
  { name: "徳島県・高知県選挙区", prefs: ["徳島県", "高知県"] },
];
const SANGIIN_MERGED_PREFS = SANGIIN_MERGED.flatMap((m) => m.prefs);

const muniData = municipalities as Record<string, string[]>;

/**
 * 選挙種別に応じた候補リストを返す
 */
export function getDistrictsForType(type: ElectionType, query?: string): string[] {
  const q = (query || "").trim();

  switch (type) {
    case "shugi": {
      const all = Object.keys(districtMap as Record<string, unknown>).sort((a, b) => {
        const prefA = a.replace(/第\d+区$/, "");
        const prefB = b.replace(/第\d+区$/, "");
        if (prefA !== prefB) {
          const idxA = PREFS.findIndex((p) => prefA.startsWith(p.replace(/県|都|府/, "")));
          const idxB = PREFS.findIndex((p) => prefB.startsWith(p.replace(/県|都|府/, "")));
          return idxA - idxB;
        }
        return parseInt(a.match(/(\d+)/)?.[1] || "0") - parseInt(b.match(/(\d+)/)?.[1] || "0");
      });
      return q ? all.filter((d) => fuzzyMatch(d, q)) : all;
    }

    case "sangi": {
      const all: string[] = [];
      for (const pref of PREFS) {
        if (SANGIIN_MERGED_PREFS.includes(pref)) continue;
        all.push(`${pref}選挙区`);
      }
      for (const m of SANGIIN_MERGED) {
        all.push(m.name);
      }
      return q ? all.filter((d) => fuzzyMatch(d, q)) : all;
    }

    case "chiji": {
      const all = PREFS.map((p) => `${p}知事選`);
      return q ? all.filter((d) => fuzzyMatch(d, q)) : all;
    }

    case "shicho": {
      const all: string[] = [];
      for (const pref of PREFS) {
        const cities = muniData[pref] || [];
        for (const city of cities) {
          all.push(`${city}長選`);
        }
      }
      return q ? all.filter((d) => fuzzyMatch(d, q)) : all;
    }

    case "gikai": {
      const all: string[] = [];
      for (const pref of PREFS) {
        const cities = muniData[pref] || [];
        for (const city of cities) {
          all.push(`${city}議会`);
        }
      }
      return q ? all.filter((d) => fuzzyMatch(d, q)) : all;
    }

    default:
      return [];
  }
}

function fuzzyMatch(target: string, query: string): boolean {
  const nt = normalize(target);
  const nq = normalize(query);
  let pos = 0;
  for (const ch of nq) {
    const idx = nt.indexOf(ch, pos);
    if (idx === -1) return false;
    pos = idx + 1;
  }
  return true;
}

function normalize(s: string): string {
  return s
    .replace(/\s+/g, "")
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFFF0 + 0x30))
    .replace(/県|都|府|道|第|区|選挙|長選|議会|知事/g, "");
}

/**
 * 選挙区入力文字列から末尾の選挙種別語を取り除き、地名部分のみを返す。
 * 例: "豊島区長選" → "豊島区"、"横浜市長選" → "横浜市"、"栃木県知事選" → "栃木県"、
 *     "東京都第10区" → "東京都"、"豊島区議会" → "豊島区"
 */
export function stripElectionSuffix(name: string): string {
  return name
    .replace(/第\d+区$/, "")
    .replace(/(知事選|長選|議会|選挙区)$/, "")
    .trim();
}

// 市区町村名 → 都道府県名 の逆引きインデックス（遅延構築）
let _cityToPref: Map<string, string> | null = null;
function getCityToPrefIndex(): Map<string, string> {
  if (_cityToPref) return _cityToPref;
  const idx = new Map<string, string>();
  for (const [pref, cities] of Object.entries(muniData)) {
    for (const city of cities) {
      // 同名市町村は最初に出てきた都道府県を採用（実害ほぼなし）
      if (!idx.has(city)) idx.set(city, pref);
    }
  }
  _cityToPref = idx;
  return idx;
}

/**
 * 市区町村名から所属都道府県名を返す。見つからない場合 null。
 */
export function findPrefForMunicipality(municipalityName: string): string | null {
  return getCityToPrefIndex().get(municipalityName) || null;
}
