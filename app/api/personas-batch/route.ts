import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { Persona, PersonaResponse } from "@/lib/types";

type BatchResponse = Record<number, PersonaResponse>;

export async function POST(req: NextRequest) {
  const { policy, personas } = (await req.json()) as {
    policy: string;
    personas: Persona[];
  };

  if (!policy || !personas?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const personaList = personas.map(
    (p) => `- ID:${p.id} / ${p.name} / ${p.age}歳 / ${p.role} / ${p.detail}`
  ).join("\n");

  const systemPrompt = `あなたは市民シミュレーターです。以下の${personas.length}人の市民ペルソナそれぞれの立場から、提示された行政政策に対する意見を生成してください。

ペルソナ一覧：
${personaList}

必ず以下のJSON形式のみで回答してください。余計なテキスト・マークダウン不要。各ペルソナのopinionは1〜2文に簡潔にしてください：
{
  ${personas.map((p) => `"${p.id}": {"opinion":"意見（1〜2文）","stance":"賛成/反対/条件付き賛成/中立","tags":["2個のキーワード"]}`).join(",\n  ")}
}`;

  try {
    const result = await callAnthropic<BatchResponse>(systemPrompt, `政策：${policy}`, 4096);
    return NextResponse.json(result);
  } catch {
    const fallback: BatchResponse = {};
    for (const p of personas) {
      fallback[p.id] = {
        opinion: "（通信エラーのため回答を取得できませんでした）",
        stance: "中立",
        tags: ["エラー"],
      };
    }
    return NextResponse.json(fallback);
  }
}
