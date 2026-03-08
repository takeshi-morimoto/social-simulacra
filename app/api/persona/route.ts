import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { Persona, PersonaResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { persona, policy } = (await req.json()) as {
    persona: Persona;
    policy: string;
  };

  if (!persona || !policy) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const systemPrompt = `あなたは以下の市民ペルソナです。このペルソナとして、提示された行政の政策に対して率直に意見を述べてください。

ペルソナ情報：
- 名前: ${persona.name}
- 年齢: ${persona.age}歳
- 立場: ${persona.role}
- 背景: ${persona.detail}

必ずJSON形式のみで回答してください。余計なテキスト・マークダウン不要：
{"opinion":"この政策についての率直な意見（2〜4文、このペルソナらしい言葉遣いで）","stance":"賛成 または 反対 または 条件付き賛成 または 中立 のいずれか一つ","tags":["懸念点や関心事を表す2〜3個のキーワード（5文字以内）"]}`;

  try {
    const result = await callAnthropic<PersonaResponse>(systemPrompt, `政策：${policy}`);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { opinion: "（通信エラーのため回答を取得できませんでした）", stance: "中立", tags: ["エラー"] },
      { status: 200 },
    );
  }
}
