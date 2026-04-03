import type { SpotType } from "./types";

/**
 * スポット種別 × 時間帯 → 推定来訪者層
 */
interface AudienceProfile {
  demographics: string;  // 「30-50代の通勤者が中心」
  traits: string;        // 「時間がない、実利的な情報を求める」
}

const AUDIENCE_MAP: Record<SpotType, Record<string, AudienceProfile>> = {
  station: {
    morning: {
      demographics: "30〜50代の通勤者が中心。会社員・公務員が多い",
      traits: "急いでいる。短く具体的なメッセージが有効。生活コスト・通勤・雇用に関心",
    },
    midday: {
      demographics: "高齢者・主婦・学生が混在。買い物客も",
      traits: "比較的時間に余裕がある。地域の話題に関心",
    },
    afternoon: {
      demographics: "高齢者・学生・パート帰りの主婦層",
      traits: "地域生活に密着した話題に反応しやすい",
    },
    evening: {
      demographics: "帰宅途中の30〜50代通勤者。学生も",
      traits: "疲れている。ネガティブな話題より前向きなビジョンが響く",
    },
  },
  park: {
    morning: {
      demographics: "高齢者の散歩・体操グループ。犬の散歩をする住民",
      traits: "健康・福祉・地域の安全に関心が高い",
    },
    midday: {
      demographics: "子連れの親（20〜40代）、高齢者、昼休みの会社員",
      traits: "子育て支援・公園整備・高齢者福祉に関心",
    },
    afternoon: {
      demographics: "子連れの親、放課後の子ども、高齢者",
      traits: "教育・子育て・地域の安全に関心",
    },
    evening: {
      demographics: "ジョギングする30〜40代、犬の散歩をする住民",
      traits: "健康・環境・生活の質に関心",
    },
  },
  shopping: {
    morning: {
      demographics: "開店直後の高齢者、主婦層",
      traits: "物価・年金・生活コストに敏感",
    },
    midday: {
      demographics: "主婦層・高齢者・昼休みの会社員",
      traits: "物価対策・生活支援に最も反応する時間帯",
    },
    afternoon: {
      demographics: "主婦層・ファミリー・学校帰りの学生",
      traits: "子育て・教育・物価に関心",
    },
    evening: {
      demographics: "仕事帰りの会社員・ファミリー",
      traits: "忙しい。家計・働き方改革に関心",
    },
  },
  public_hall: {
    morning: {
      demographics: "行政手続きに来た住民。高齢者が多い",
      traits: "行政サービス・福祉に直接的な関心",
    },
    midday: {
      demographics: "多様な年齢層。イベント参加者も",
      traits: "地域活動・コミュニティに関心のある層",
    },
    afternoon: {
      demographics: "高齢者の集まり・子育てサークルなど",
      traits: "福祉・子育て・地域コミュニティに関心",
    },
    evening: {
      demographics: "仕事後の住民。地域活動参加者",
      traits: "地域課題に意識が高い層",
    },
  },
  shelter: {
    morning: {
      demographics: "周辺住民。高齢者が多い",
      traits: "防災・安全に関心",
    },
    midday: {
      demographics: "周辺住民、通行人",
      traits: "防災・インフラに関心",
    },
    afternoon: {
      demographics: "周辺住民、通行人",
      traits: "防災・安全・地域インフラに関心",
    },
    evening: {
      demographics: "帰宅途中の住民",
      traits: "安全・防犯に関心",
    },
  },
  landmark: {
    morning: {
      demographics: "観光客・地元住民が混在",
      traits: "地域の魅力・観光振興に関心",
    },
    midday: {
      demographics: "観光客が増える。多様な年齢層",
      traits: "地域振興・観光・文化に関心",
    },
    afternoon: {
      demographics: "観光客・買い物客",
      traits: "地域の魅力発信に好反応",
    },
    evening: {
      demographics: "帰路の住民・観光客",
      traits: "地域愛に訴えるメッセージが有効",
    },
  },
};

/**
 * 時間文字列("HH:MM")から時間帯キーを返す
 */
function getTimeCategory(startTime: string): string {
  const hour = parseInt(startTime.split(":")[0]) || 12;
  if (hour < 10) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * スポット種別と時間帯から推定来訪者プロファイルを取得
 */
export function getAudienceProfile(spotType: SpotType, startTime: string): AudienceProfile {
  const timeKey = getTimeCategory(startTime);
  return AUDIENCE_MAP[spotType]?.[timeKey] ?? {
    demographics: "多様な年齢層の住民",
    traits: "地域の課題に関心がある",
  };
}
