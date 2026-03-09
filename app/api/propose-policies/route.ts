import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { Persona, PolicyProposal } from "@/lib/types";

type ProposalResponse = Record<number, PolicyProposal>;

export async function POST(req: NextRequest) {
  const { personas, municipality } = (await req.json()) as {
    personas: Persona[];
    municipality: string;
  };

  if (!personas?.length || !municipality) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const personaList = personas.map(
    (p) => `- ID:${p.id} / ${p.name} / ${p.age}歳 / ${p.role} / ${p.detail} / 性格:${p.personality} / 関心事:${p.concern}`
  ).join("\n");

  const systemPrompt = `あなたは市民シミュレーターです。以下の${personas.length}人の市民ペルソナそれぞれが、${municipality}をより良くするために自分の立場から政策を1つ提案します。

【重要な指示】
- 各ペルソナの年齢、職業、生活状況、地域との関わりに基づいた、リアルで具体的な政策を提案させること
- その地域の実際の課題（人口減少、高齢化、産業衰退、インフラ老朽化など）を踏まえること
- 自分の生活に直結する切実な提案にすること（抽象的な理想論ではなく）

ペルソナ一覧：
${personaList}

必ず以下のJSON形式のみで回答してください。余計なテキスト・マークダウン不要：
{
  ${personas.map((p) => `"${p.id}": {"title":"政策タイトル（15文字以内）","description":"政策の内容（1〜2文）","reason":"提案理由（1文、そのペルソナらしい言葉で）"}`).join(",\n  ")}
}`;

  try {
    const result = await callAnthropic<ProposalResponse>(systemPrompt, `自治体：${municipality}`, 4096);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Propose policies error:", e);
    return NextResponse.json({ error: "Failed to generate proposals" }, { status: 500 });
  }
}
