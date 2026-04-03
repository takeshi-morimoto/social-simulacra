import type { CampaignSpot, SpotType, TimeSlot } from "./types";

// 時間帯×スポット種別のベーススコアマトリクス (0-100)
const SCORE_MATRIX: Record<SpotType, Record<TimeSlot, number>> = {
  station:     { early_morning: 40, morning: 95, midday: 30, afternoon: 30, evening: 90, night: 25 },
  park:        { early_morning: 15, morning: 40, midday: 85, afternoon: 75, evening: 50, night: 10 },
  shelter:     { early_morning: 10, morning: 50, midday: 70, afternoon: 65, evening: 45, night: 10 },
  landmark:    { early_morning: 10, morning: 35, midday: 80, afternoon: 70, evening: 45, night: 15 },
  shopping:    { early_morning: 5,  morning: 50, midday: 90, afternoon: 85, evening: 70, night: 20 },
  public_hall: { early_morning: 5,  morning: 45, midday: 75, afternoon: 70, evening: 40, night: 10 },
};

export function getSpotScore(type: SpotType, timeSlot: TimeSlot): number {
  return SCORE_MATRIX[type]?.[timeSlot] ?? 0;
}

/**
 * 駅の規模を推定してスコア倍率を返す (0.4〜1.3)
 * OSMタグには情報が少ないため、利用可能な全手がかりを使う
 */
function estimateStationScale(properties: Record<string, unknown>): number {
  const tags = properties as Record<string, string>;
  const name = tags.name || "";

  // 信号場・停留所は最低
  if (tags.railway === "halt") return 0.4;

  let scale = 0.55; // ベース: 一般的なローカル駅

  // --- 新幹線駅 ---
  if (tags.highspeed === "yes") scale += 0.35;

  // --- 複数事業者 → 乗換駅 ---
  const operator = tags.operator || "";
  if (operator.includes(";")) scale += 0.25;

  // --- 地下鉄 ---
  if (tags.station === "subway" || tags.subway === "yes") scale += 0.2;

  // --- 路線情報（あれば） ---
  const lines = tags["railway:line"] || tags.line || "";
  const lineCount = lines.split(";").filter(Boolean).length;
  if (lineCount >= 2) scale += lineCount * 0.08;

  // --- 駅名ヒューリスティック ---
  // 県庁所在地・主要都市と同名 → 中心駅の可能性が高い
  const MAJOR_CITY_STATIONS = [
    "東京", "新宿", "渋谷", "池袋", "品川", "上野", "横浜", "大宮", "千葉", "大阪", "梅田",
    "名古屋", "京都", "神戸", "三ノ宮", "博多", "天神", "札幌", "仙台", "広島",
    "金沢", "新潟", "岡山", "熊本", "鹿児島中央", "長崎", "宇都宮", "高崎", "水戸",
    "甲府", "長野", "静岡", "浜松", "岐阜", "津", "大津", "奈良", "和歌山",
    "鳥取", "松江", "山口", "徳島", "高松", "松山", "高知", "佐賀", "大分", "宮崎",
    "那覇", "盛岡", "秋田", "山形", "福島", "前橋", "富山", "福井",
    // 主要都市（県庁所在地以外）
    "小山", "古河", "栃木", "足利", "佐野", "川越", "所沢", "春日部", "越谷",
    "船橋", "柏", "松戸", "町田", "八王子", "立川", "吉祥寺", "藤沢", "平塚",
    "堺", "姫路", "西宮", "尼崎", "豊中", "枚方", "高槻",
    "北九州", "久留米", "長岡", "上越", "郡山", "いわき",
  ];
  if (MAJOR_CITY_STATIONS.includes(name)) scale += 0.3;

  // 「中央」「本」がつく駅名 → ターミナル
  if (/中央/.test(name)) scale += 0.2;
  // 「新○○」→ 新幹線駅の可能性
  if (/^新/.test(name) && name.length >= 3) scale += 0.1;

  // --- 無人駅のタグ ---
  if (tags.staffed === "no" || tags.unstaffed === "yes") scale -= 0.15;

  return Math.min(Math.max(scale, 0.4), 1.3);
}

/**
 * 面積(m²)からスコア倍率を算出
 * 面積が大きいほど人が集まりやすい
 */
function areaScale(areaM2: number, thresholds: { small: number; medium: number; large: number }): number {
  if (areaM2 >= thresholds.large) return 1.2;   // 大規模
  if (areaM2 >= thresholds.medium) return 1.0;   // 中規模
  if (areaM2 >= thresholds.small) return 0.75;   // 小規模
  return 0.55;                                    // 極小
}

/**
 * 公園の規模を推定してスコア倍率を返す (0.4〜1.3)
 * 面積データがあればそれを優先、なければ名前ベース
 */
function estimateParkScale(properties: Record<string, unknown>): number {
  const tags = properties as Record<string, string>;
  const name = tags.name || "";
  const area = properties._areaM2 as number | undefined;

  // 面積データがあればそれをベースに
  if (area && area > 0) {
    // 公園: 500m²以下=極小, ~3000m²=小, ~20000m²=中, 20000m²~=大
    let scale = areaScale(area, { small: 500, medium: 3_000, large: 20_000 });

    // 名前でさらに補正
    if (/総合|中央|運動|都立|県立|国営/.test(name)) scale = Math.max(scale, 1.1);
    if (/児童|ちびっこ|ポケット/.test(name)) scale = Math.min(scale, 0.6);

    return Math.min(scale, 1.3);
  }

  // 面積データなし → 名前ベースのフォールバック
  if (/総合|中央|運動|都立|県立|市立|国営/.test(name)) return 1.1;
  if (/児童|ちびっこ|ポケット|ミニ/.test(name)) return 0.5;
  if (tags.leisure === "garden") return 0.5;
  return 0.7;
}

/**
 * 商業施設の規模を推定してスコア倍率を返す (0.5〜1.3)
 * 面積データがあればそれを優先、なければ名前/shopタグベース
 */
function estimateShoppingScale(properties: Record<string, unknown>): number {
  const tags = properties as Record<string, string>;
  const name = tags.name || "";
  const shop = tags.shop || "";
  const area = properties._areaM2 as number | undefined;

  if (area && area > 0) {
    // 商業施設: 200m²以下=極小, ~1000m²=小, ~5000m²=中, 5000m²~=大
    let scale = areaScale(area, { small: 200, medium: 1_000, large: 5_000 });

    // 名前・タイプで補正
    if (shop === "mall" || shop === "department_store") scale = Math.max(scale, 1.1);
    if (/イオン|イトーヨーカドー|ららぽーと|アリオ|アトレ|ルミネ|マルイ|パルコ/.test(name)) {
      scale = Math.max(scale, 1.05);
    }

    return Math.min(scale, 1.3);
  }

  // 面積データなし → タグ・名前ベースのフォールバック
  if (shop === "mall" || shop === "department_store") return 1.2;
  if (/イオン|イトーヨーカドー|西友|ダイエー|アリオ|ららぽーと|アトレ|ルミネ|マルイ|パルコ|ドン・キホーテ/.test(name)) {
    return 1.1;
  }
  if (shop === "supermarket") return 0.8;
  return 0.7;
}

/**
 * 2点間の直線距離をkm単位で概算（簡易計算、turf不要）
 */
function quickDistKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * 最寄り駅との距離に基づく立地ボーナスを算出 (0.0〜0.35)
 * 大きな駅に近いほどボーナスが大きい
 */
function locationBonus(
  spot: CampaignSpot,
  stations: { lat: number; lng: number; scale: number }[],
): number {
  if (stations.length === 0) return 0;

  let bestBonus = 0;
  for (const st of stations) {
    const dist = quickDistKm(spot.lat, spot.lng, st.lat, st.lng);
    if (dist > 2) continue; // 2km以上離れた駅は無視

    // 距離減衰: 0m→1.0, 500m→0.6, 1km→0.35, 2km→0.1
    const proximity = Math.max(0, 1 - dist / 2.2);
    // 駅の規模(scale)と距離を掛け合わせる
    const bonus = proximity * st.scale * 0.35;
    bestBonus = Math.max(bestBonus, bonus);
  }

  return bestBonus;
}

export function scoreSpots(spots: CampaignSpot[], timeSlot: TimeSlot): CampaignSpot[] {
  // 先に駅のスケールを計算しておく
  const stationInfo = spots
    .filter((s) => s.type === "station")
    .map((s) => ({
      lat: s.lat,
      lng: s.lng,
      scale: estimateStationScale(s.properties),
    }));

  return spots.map((spot) => {
    let base = getSpotScore(spot.type, timeSlot);

    if (spot.type === "station") {
      // 駅: 自身の規模で倍率
      base = Math.round(base * estimateStationScale(spot.properties));
    } else {
      // 駅以外: 名前ベースの規模推定 + 駅近ボーナス
      let typeScale = 1.0;
      if (spot.type === "park") typeScale = estimateParkScale(spot.properties);
      else if (spot.type === "shopping") typeScale = estimateShoppingScale(spot.properties);

      const bonus = locationBonus(spot, stationInfo);
      // 規模倍率(0.5〜1.2) と 立地ボーナス(0〜0.35) を合算
      base = Math.round(base * (typeScale + bonus));
    }

    return { ...spot, score: base };
  });
}

export function getTimeSlotForHour(hour: number): TimeSlot {
  if (hour < 7) return "early_morning";
  if (hour < 10) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}
