import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { Persona, DemographicProfile } from "@/lib/types";

const ICONS = ["👵", "👴", "🧑‍💼", "👩", "🧑", "👨‍👩‍👧", "👩‍💻", "🧑‍🔧", "🎓", "👩‍👦", "💼", "🤝", "🚕", "👷", "👩‍🍳"];
const COLORS = ["#E8A87C", "#7EC8A8", "#7BA7D4", "#B07ED4", "#D4A87E", "#E07EA0", "#8B9DC3", "#D4A0C0", "#E0A070", "#5B8FA8", "#C9A0A0", "#A0C4A0", "#C8A8D8", "#7EB8A0", "#D4C87E"];
const BGS = ["#FDF3EA", "#EAF7F1", "#EAF1FA", "#F3EAF9", "#FAF1EA", "#FAE9F1", "#EDF1F7", "#F9EDF5", "#FBF0E4", "#E8F2F7", "#F7EDEC", "#EDF7ED", "#F3EEF8", "#ECF6F1", "#FAF8EA"];

type GeneratedPersona = {
  name: string;
  age: number;
  role: string;
  detail: string;
};

type ApiResponse = {
  demographics: DemographicProfile;
  personas: GeneratedPersona[];
};

export async function POST(req: NextRequest) {
  const { municipality } = (await req.json()) as { municipality: string };

  if (!municipality) {
    return NextResponse.json({ error: "Missing municipality" }, { status: 400 });
  }

  const systemPrompt = `あなたは日本の自治体の人口動態・産業構造に詳しい専門家です。指定された自治体について、以下の2つを生成してください。

【ステップ1】その自治体の人口動態・産業構造の概要を整理する
【ステップ2】その概要に基づいて15人のペルソナを生成する

ペルソナ配分の原則：
- 15人の配分は、その自治体の実際の人口構成比率を忠実に縮小したものにすること
- 年齢：各年齢層（0〜14歳、15〜29歳、30〜44歳、45〜64歳、65歳以上）の人数を実際の人口比率に応じて配分
  - 例：高齢化率50%なら65歳以上を7〜8人、年少人口10%なら子供を1〜2人
  - 比率的に15人中1人に満たない層（7%未満）でも、ランダムに含めることがある（毎回同じ配分にならないように、少数派の層を時々1人入れる）
- 性別：男女比も実際の比率に応じて配分する（ほぼ半々なら7〜8人ずつ、女性が多い自治体なら女性を多めに）
- 職業：実際の産業別就業者比率に応じて配分する（第一次産業30%なら農林漁業を4〜5人、サービス業60%ならサービス業を9人など）
- 外国人比率に応じて外国人住民を含める（比率が低くても時々1人含める）
- その自治体のシンボル的な産業・文化に関わる住民を必ず含める
- 家族構成・経済状況・地域コミュニティとの関わりも実態に即す

【多様性とランダム性】
- 上記の比率の枠内で、具体的な人物像（名前、性格、経歴、趣味など）は毎回異なるものにすること
- 同じ「65歳農業従事者」でも、ある時はメロン農家の3代目、ある時は脱サラして移住した新規就農者など、バリエーションを持たせる
- 珍しいが実在しうる住民（Uターン移住者、二拠点生活者、地域おこし協力隊OBなど）も時々含める

必ず以下のJSON形式のみで回答してください：
{
  "demographics": {
    "population": "人口（例：約7,000人）",
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
    "gender_distribution": [
      {"name":"男性","value":数値（%）},
      {"name":"女性","value":数値}
    ],
    "industry_distribution": [
      {"name":"産業名","value":数値（%）},
      ...主要な産業を3〜5個、合計100%になるように
    ]
  },
  "personas": [
    {"name":"フルネーム","age":数値,"role":"職業・立場（10文字以内）","detail":"背景説明（40文字以内）"},
    ...15人分
  ]
}`;

  try {
    const result = await callAnthropic<ApiResponse>(
      systemPrompt,
      `自治体：${municipality}`,
      4096,
    );

    const personas: Persona[] = result.personas.map((g, i) => ({
      id: i + 1,
      name: g.name,
      age: g.age,
      role: g.role,
      icon: ICONS[i % ICONS.length],
      color: COLORS[i % COLORS.length],
      bg: BGS[i % BGS.length],
      detail: g.detail,
    }));

    return NextResponse.json({
      personas,
      demographics: result.demographics,
    });
  } catch (e) {
    console.error("Generate personas error:", e);
    return NextResponse.json({ error: "Failed to generate personas" }, { status: 500 });
  }
}
