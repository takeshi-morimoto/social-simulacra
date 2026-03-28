import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { VoterPersona, PersonaResponse, CandidateProfile, CustomData } from "@/lib/types";

type BatchResponse = Record<number, PersonaResponse>;

export async function POST(req: NextRequest) {
  const { policy, personas, candidateProfile, customData } = (await req.json()) as {
    policy: string;
    personas: VoterPersona[];
    candidateProfile?: CandidateProfile;
    customData?: CustomData;
  };

  if (!policy || !personas?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const personaList = personas.map(
    (p) => `- ID:${p.id} / ${p.name} / ${p.age}歳 / ${p.gender} / ${p.role} / ${p.detail} / 性格:${p.personality} / 関心事:${p.concern}`
  ).join("\n");

  const candidateSection = candidateProfile && (candidateProfile.name || candidateProfile.platform)
    ? `\n\n【候補者情報】\n候補者名: ${candidateProfile.name || "未設定"}\n所属政党: ${candidateProfile.party || "未設定"}\n選挙区: ${candidateProfile.district || "未設定"}\n公約概要: ${candidateProfile.platform || "未設定"}`
    : "";

  const customDataSection = customData?.text?.trim()
    ? `\n\n【追加情報（ユーザー提供）】\n${customData.text.trim()}`
    : "";

  const systemPrompt = `あなたは有権者シミュレーターです。以下の${personas.length}人の有権者ペルソナそれぞれの立場から、提示された選挙公約・政策に対する意見を生成してください。

【重要な指示】
- 各ペルソナの年齢、性別、職業、背景、地域との関わりを深く考慮して意見を生成すること
- その地域の歴史・文化・伝統産業への愛着や誇りを踏まえること
- 生活への直接的な影響（収入、雇用、暮らし）を具体的に考慮すること
- AIの同調バイアスを排除し、現実的に反対しそうな人は明確に反対させること
- 特に、既存の産業や生活様式を変える政策に対しては、当事者からの強い反発を現実的に表現すること
- 選挙公約として実現可能性や財源の裏付けも評価の観点に含めること${candidateSection}${customDataSection}

有権者ペルソナ一覧：
${personaList}

必ず以下のJSON形式のみで回答してください。余計なテキスト・マークダウン不要。各ペルソナのopinionは1〜2文に簡潔にしてください：
{
  ${personas.map((p) => `"${p.id}": {"opinion":"意見（1〜2文）","stance":"強く賛成/賛成/条件付き賛成/中立/反対/強く反対","tags":["2個のキーワード"]}`).join(",\n  ")}
}`;

  try {
    const result = await callAnthropic<BatchResponse>(systemPrompt, `公約・政策：${policy}`, 4096);
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
