import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { VoterPersona, ElectionDemographicProfile, VoterTurnoutRate } from "@/lib/types";
import { getDemographicsForMunicipality, fetchPrefTurnout } from "@/lib/estat";

const ICONS = ["👵", "👴", "🧑‍💼", "👩", "🧑", "👨‍👩‍👧", "👩‍💻", "🧑‍🔧", "🎓", "👩‍👦", "💼", "🤝", "🚕", "👷", "👩‍🍳"];
const COLORS = ["#E8A87C", "#7EC8A8", "#7BA7D4", "#B07ED4", "#D4A87E", "#E07EA0", "#8B9DC3", "#D4A0C0", "#E0A070", "#5B8FA8", "#C9A0A0", "#A0C4A0", "#C8A8D8", "#7EB8A0", "#D4C87E"];
const BGS = ["#FDF3EA", "#EAF7F1", "#EAF1FA", "#F3EAF9", "#FAF1EA", "#FAE9F1", "#EDF1F7", "#F9EDF5", "#FBF0E4", "#E8F2F7", "#F7EDEC", "#EDF7ED", "#F3EEF8", "#ECF6F1", "#FAF8EA"];

type GeneratedPersona = {
  name: string;
  age: number;
  role: string;
  detail: string;
  personality: string;
  concern: string;
  gender: string;
};

type ApiResponse = {
  demographics: ElectionDemographicProfile;
  personas: GeneratedPersona[];
};

function getAgeGroup(age: number): string {
  if (age <= 29) return "18〜29歳";
  if (age <= 44) return "30〜44歳";
  if (age <= 64) return "45〜64歳";
  return "65歳以上";
}

function getVoterTurnoutWeight(ageGroup: string, gender: string, turnoutRates: VoterTurnoutRate[]): number {
  const rate = turnoutRates.find((r) => r.ageGroup === ageGroup);
  if (!rate) return 0.5;
  const value = gender === "男性" ? rate.male : gender === "女性" ? rate.female : rate.overall;
  return Math.round((value / 100) * 100) / 100;
}

export async function POST(req: NextRequest) {
  const { municipality, candidateProfile } = (await req.json()) as {
    municipality: string;
    candidateProfile?: { name: string; party: string; district: string; platform: string };
  };

  if (!municipality) {
    return NextResponse.json({ error: "Missing municipality" }, { status: 400 });
  }

  // e-Stat APIから実際の人口統計データと投票率を並行取得
  const [estatData, turnoutData] = await Promise.all([
    getDemographicsForMunicipality(municipality),
    fetchPrefTurnout(municipality),
  ]);

  const estatContext = estatData
    ? `\n\n【e-Stat国勢調査データ（2020年）- 必ずこのデータに基づいて生成すること】
地域名: ${estatData.name}
総人口: ${estatData.totalPopulation.toLocaleString()}人
男性: ${estatData.malePopulation.toLocaleString()}人 / 女性: ${estatData.femalePopulation.toLocaleString()}人
高齢化率: ${estatData.agingRate}%
年齢分布:
${estatData.ageDistribution.map((a) => `  ${a.name}: ${a.value}%（${a.count.toLocaleString()}人）`).join("\n")}

※上記は国勢調査の実データです。demographicsのage_distributionやgender_distributionはこのデータを正確に反映してください。
※ペルソナの年齢・性別配分もこの実データの比率に忠実に従ってください。`
    : "";

  const turnoutContext = turnoutData
    ? `\n\n【e-Stat投票率データ（${turnoutData.prefName}・直近実績）】
${turnoutData.shugiinSmall ? `衆議院小選挙区: ${turnoutData.shugiinSmall}%` : ""}
${turnoutData.shugiinProp ? `衆議院比例代表: ${turnoutData.shugiinProp}%` : ""}
${turnoutData.sangiinConst ? `参議院選挙区: ${turnoutData.sangiinConst}%` : ""}
${turnoutData.sangiinProp ? `参議院比例代表: ${turnoutData.sangiinProp}%` : ""}
${turnoutData.prefAssembly ? `都道府県議会: ${turnoutData.prefAssembly}%` : ""}
${turnoutData.governor ? `知事選: ${turnoutData.governor}%` : ""}
${turnoutData.municipalAssembly ? `市区町村議会: ${turnoutData.municipalAssembly}%` : ""}
${turnoutData.mayor ? `市区町村長選: ${turnoutData.mayor}%` : ""}

※上記は実際の都道府県別投票率です。voter_turnout_ratesの全体水準をこのデータに合わせてください。
※年代別の内訳は一般的な傾向に基づいて推定してください。`.replace(/\n{2,}/g, "\n")
    : "";

  const candidateContext = candidateProfile
    ? `\n\n【候補者情報（参考）】\n候補者名: ${candidateProfile.name}\n所属政党: ${candidateProfile.party}\n選挙区: ${candidateProfile.district}\n公約概要: ${candidateProfile.platform}`
    : "";

  const systemPrompt = `あなたは日本の自治体の人口動態・産業構造に詳しい選挙分析の専門家です。指定された自治体について、以下の2つを生成してください。

【ステップ1】その自治体の有権者の人口動態・産業構造の概要を整理する
【ステップ2】その概要に基づいて15人の有権者ペルソナを生成する

重要：ペルソナは全員18歳以上の有権者のみ生成してください。

ペルソナ配分の原則：
- 15人の配分は、その自治体の実際の有権者人口構成比率を忠実に縮小したものにすること
- 年齢：各年齢層（18〜29歳、30〜44歳、45〜64歳、65歳以上）の人数を実際の有権者人口比率に応じて配分
  - 例：高齢化率50%なら65歳以上を7〜8人
  - 比率的に15人中1人に満たない層でも、ランダムに含めることがある
- 性別：男女比も実際の比率に応じて配分し、各ペルソナに必ず「男性」か「女性」を設定する
- 職業：実際の産業別就業者比率に応じて配分する
- 外国人比率に応じて外国人住民を含める（比率が低くても時々1人含める）
- その自治体のシンボル的な産業・文化に関わる住民を必ず含める
- 家族構成・経済状況・地域コミュニティとの関わりも実態に即す

【多様性とランダム性】
- 上記の比率の枠内で、具体的な人物像は毎回異なるものにすること
- 珍しいが実在しうる住民も時々含める

【投票率データ】
- voter_turnout_ratesには、その自治体が属する地域（都道府県）の直近の選挙データに基づく年代別・性別別の推定投票率を設定してください
- 一般的な傾向：若年層(18-29歳)は30-40%、中年層(30-44歳)は45-55%、壮年層(45-64歳)は60-70%、高齢層(65歳以上)は65-75%${estatContext}${turnoutContext}${candidateContext}

必ず以下のJSON形式のみで回答してください：
{
  "demographics": {
    "population": "人口（例：約7,000人）",
    "voter_population": "有権者数（例：約5,800人）",
    "aging_rate": "高齢化率（例：約52%）",
    "main_industries": ["主要産業を3つ以内"],
    "foreign_rate": "外国人比率（例：約1.5%）",
    "household_features": "世帯の特徴（例：単身高齢世帯が多い）",
    "rationale": "このペルソナ配分にした理由を2〜3文で説明",
    "age_distribution": [
      {"name":"0〜14歳","value":数値（%）},
      {"name":"15〜29歳","value":数値},
      {"name":"30〜44歳","value":数値},
      {"name":"45〜64歳","value":数値},
      {"name":"65歳以上","value":数値}
    ],
    "voter_age_distribution": [
      {"name":"18〜29歳","value":数値（%）},
      {"name":"30〜44歳","value":数値},
      {"name":"45〜64歳","value":数値},
      {"name":"65歳以上","value":数値}
    ],
    "gender_distribution": [
      {"name":"男性","value":数値（%）},
      {"name":"女性","value":数値}
    ],
    "industry_distribution": [
      {"name":"産業名","value":数値（%）},
      ...主要な産業を3〜5個、合計100%になるように
    ],
    "voter_turnout_rates": [
      {"ageGroup":"18〜29歳","male":数値,"female":数値,"overall":数値},
      {"ageGroup":"30〜44歳","male":数値,"female":数値,"overall":数値},
      {"ageGroup":"45〜64歳","male":数値,"female":数値,"overall":数値},
      {"ageGroup":"65歳以上","male":数値,"female":数値,"overall":数値}
    ]
  },
  "personas": [
    {"name":"フルネーム","age":数値,"role":"職業・立場（10文字以内）","gender":"男性または女性","detail":"具体的な背景（80文字以内）","personality":"性格・価値観（30文字以内）","concern":"今一番の関心事（30文字以内）"},
    ...15人分
  ]
}`;

  try {
    const result = await callAnthropic<ApiResponse>(
      systemPrompt,
      `自治体：${municipality}`,
      4096,
    );

    const turnoutRates = result.demographics.voter_turnout_rates || [];

    const personas: VoterPersona[] = result.personas.slice(0, 15).map((g, i) => {
      const ageGroup = getAgeGroup(g.age);
      const weight = getVoterTurnoutWeight(ageGroup, g.gender, turnoutRates);
      return {
        id: i + 1,
        name: g.name,
        age: g.age,
        role: g.role,
        icon: ICONS[i % ICONS.length],
        color: COLORS[i % COLORS.length],
        bg: BGS[i % BGS.length],
        detail: g.detail,
        personality: g.personality,
        concern: g.concern,
        gender: g.gender || "不明",
        ageGroup,
        voterTurnoutWeight: weight,
      };
    });

    return NextResponse.json({
      personas,
      demographics: result.demographics,
    });
  } catch (e) {
    console.error("Generate personas error:", e);
    return NextResponse.json({ error: "Failed to generate personas" }, { status: 500 });
  }
}
