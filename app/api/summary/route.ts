import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { AnalysisResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { policy, responseSummary } = (await req.json()) as {
    policy: string;
    responseSummary: string;
  };

  if (!policy || !responseSummary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const systemPrompt = `あなたは行政政策のアナリストであり、同時にSNSで話題になるようなキャッチーな一言コメントを作るのが得意です。複数の市民の意見を分析して、政策立案者向けのレポートをJSON形式のみで出力してください：
{"overall":"全体的な市民の反応の要約（2文）","risks":["主なリスク・懸念事項3つ（各20文字以内）"],"recommendations":["政策改善への提言2つ（各30文字以内）"],"approval_rate":賛成・条件付き賛成の割合（0〜100の整数）,"share_comment":"SNSでシェアしたくなるような、この政策への市民の反応を面白おかしくまとめた一言コメント（30〜50文字。皮肉やユーモアを交えて。例：『全員一致で大反対。市民の団結力だけは証明された』『おばあちゃんも大学生もIT社長も珍しく意見が一致した神政策』）"}`;


  try {
    const result = await callAnthropic<AnalysisResponse>(
      systemPrompt,
      `政策：${policy}\n\n市民の反応：\n${responseSummary}`,
      500,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error("Summary API error:", e);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
