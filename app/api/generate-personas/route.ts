import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { Persona } from "@/lib/types";

const ICONS = ["👵", "👴", "🧑‍💼", "👩", "🧑", "👨‍👩‍👧", "👩‍💻", "🧑‍🔧", "🎓", "👩‍👦", "💼", "🤝", "🚕", "👷", "👩‍🍳"];
const COLORS = ["#E8A87C", "#7EC8A8", "#7BA7D4", "#B07ED4", "#D4A87E", "#E07EA0", "#8B9DC3", "#D4A0C0", "#E0A070", "#5B8FA8", "#C9A0A0", "#A0C4A0", "#C8A8D8", "#7EB8A0", "#D4C87E"];
const BGS = ["#FDF3EA", "#EAF7F1", "#EAF1FA", "#F3EAF9", "#FAF1EA", "#FAE9F1", "#EDF1F7", "#F9EDF5", "#FBF0E4", "#E8F2F7", "#F7EDEC", "#EDF7ED", "#F3EEF8", "#ECF6F1", "#FAF8EA"];

type GeneratedPersona = {
  name: string;
  age: number;
  role: string;
  detail: string;
};

export async function POST(req: NextRequest) {
  const { municipality } = (await req.json()) as { municipality: string };

  if (!municipality) {
    return NextResponse.json({ error: "Missing municipality" }, { status: 400 });
  }

  const systemPrompt = `あなたは日本の自治体の人口動態に詳しい専門家です。指定された自治体の人口構成（年齢分布、産業構造、外国人比率、世帯構成など）を考慮し、その自治体に住んでいそうな典型的な市民ペルソナを15人生成してください。

多様性を重視し、以下の観点をカバーしてください：
- 年齢層（若者〜高齢者）
- 職業（会社員、自営業、パート、無職、学生など）
- 家族構成（独身、子育て、高齢独居など）
- その自治体特有の住民層（産業、地理的特徴に基づく）

必ずJSON配列のみで回答してください：
[{"name":"日本人らしいフルネーム","age":数値,"role":"職業・立場（10文字以内）","detail":"背景説明（30文字以内）"},...]`;

  try {
    const generated = await callAnthropic<GeneratedPersona[]>(
      systemPrompt,
      `自治体：${municipality}`,
      2000,
    );

    const personas: Persona[] = generated.map((g, i) => ({
      id: i + 1,
      name: g.name,
      age: g.age,
      role: g.role,
      icon: ICONS[i % ICONS.length],
      color: COLORS[i % COLORS.length],
      bg: BGS[i % BGS.length],
      detail: g.detail,
    }));

    return NextResponse.json(personas);
  } catch (e) {
    console.error("Generate personas error:", e);
    return NextResponse.json({ error: "Failed to generate personas" }, { status: 500 });
  }
}
