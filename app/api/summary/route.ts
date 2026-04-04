import { NextRequest, NextResponse } from "next/server";
import { callAnthropic } from "@/lib/anthropic";
import type { ElectionAnalysisResponse, VoterPersona, PersonaResponse, Stance, AgeGroupResult, StanceCounts } from "@/lib/types";

const INITIAL_COUNTS: StanceCounts = { "強く賛成": 0, "賛成": 0, "条件付き賛成": 0, "中立": 0, "反対": 0, "強く反対": 0 };

function computeWeightedApproval(
  personas: VoterPersona[],
  results: Record<string, PersonaResponse>,
): { raw: number; weighted: number; ageBreakdown: AgeGroupResult[] } {
  const ageGroups = ["18〜29歳", "30〜44歳", "45〜64歳", "65歳以上"];

  let rawPro = 0;
  let rawTotal = 0;
  let weightedPro = 0;
  let weightedTotal = 0;

  const ageMap: Record<string, { personas: VoterPersona[]; results: PersonaResponse[] }> = {};
  for (const ag of ageGroups) {
    ageMap[ag] = { personas: [], results: [] };
  }

  for (const p of personas) {
    const r = results[String(p.id)];
    if (!r) continue;

    const w = p.voterTurnoutWeight || 0.5;
    const stance = r.stance as Stance;

    // Raw calculation
    if (stance === "強く賛成" || stance === "賛成") {
      rawPro += 1;
    } else if (stance === "条件付き賛成") {
      rawPro += 0.5;
    }
    rawTotal += 1;

    // Weighted calculation
    if (stance === "強く賛成" || stance === "賛成") {
      weightedPro += w;
    } else if (stance === "条件付き賛成") {
      weightedPro += w * 0.5;
    }
    weightedTotal += w;

    // Age group accumulation
    const ag = p.ageGroup || "45〜64歳";
    if (ageMap[ag]) {
      ageMap[ag].personas.push(p);
      ageMap[ag].results.push(r);
    }
  }

  const rawRate = rawTotal > 0 ? Math.round((rawPro / rawTotal) * 100) : 0;
  const weightedRate = weightedTotal > 0 ? Math.round((weightedPro / weightedTotal) * 100) : 0;

  const ageBreakdown: AgeGroupResult[] = ageGroups.map((ag) => {
    const group = ageMap[ag];
    const counts: StanceCounts = { ...INITIAL_COUNTS };
    let agRawPro = 0;
    let agWeightedPro = 0;
    let agWeightedTotal = 0;

    for (let i = 0; i < group.personas.length; i++) {
      const r = group.results[i];
      const w = group.personas[i].voterTurnoutWeight || 0.5;
      counts[r.stance as Stance]++;

      if (r.stance === "強く賛成" || r.stance === "賛成") {
        agRawPro += 1;
        agWeightedPro += w;
      } else if (r.stance === "条件付き賛成") {
        agRawPro += 0.5;
        agWeightedPro += w * 0.5;
      }
      agWeightedTotal += w;
    }

    return {
      ageGroup: ag,
      count: group.personas.length,
      approval_rate: group.personas.length > 0 ? Math.round((agRawPro / group.personas.length) * 100) : 0,
      weighted_approval_rate: agWeightedTotal > 0 ? Math.round((agWeightedPro / agWeightedTotal) * 100) : 0,
      stanceCounts: counts,
    };
  });

  return { raw: rawRate, weighted: weightedRate, ageBreakdown };
}

export async function POST(req: NextRequest) {
  const { policy, responseSummary, personas, personaResults } = (await req.json()) as {
    policy: string;
    responseSummary: string;
    personas?: VoterPersona[];
    personaResults?: Record<string, PersonaResponse>;
  };

  if (!policy || !responseSummary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Compute weighted approval rates server-side
  let rawApprovalRate = 0;
  let weightedApprovalRate = 0;
  let ageGroupBreakdown: AgeGroupResult[] = [];

  if (personas && personaResults) {
    const computed = computeWeightedApproval(personas, personaResults);
    rawApprovalRate = computed.raw;
    weightedApprovalRate = computed.weighted;
    ageGroupBreakdown = computed.ageBreakdown;
  }

  // 複数政策を認識
  const policies = policy.split("\n---\n").filter((p: string) => p.trim());
  const policyNote = policies.length > 1
    ? `\n\n注意：候補者は${policies.length}つの政策を掲げています。各政策への反応と全体的なパッケージとしての評価を含めてください。`
    : "";

  const systemPrompt = `あなたは選挙戦略アナリストであり、同時にSNSで話題になるようなキャッチーな一言コメントを作るのが得意です。複数の有権者の意見を分析して、選挙候補者向けの戦略レポートをJSON形式のみで出力してください。${policyNote}

注意：approval_rateは投票率加重済みの値 ${weightedApprovalRate}% を使ってください。

{"overall":"全体的な有権者の反応の要約（2文。選挙戦略の観点から）","risks":["選挙戦略上の主なリスク・懸念事項3つ（各20文字以内）"],"recommendations":["公約改善・選挙戦略への提言2つ（各30文字以内）"],"approval_rate":${weightedApprovalRate},"share_comment":"SNSでシェアしたくなるような、この公約への有権者の反応を面白おかしくまとめた一言コメント（30〜50文字。皮肉やユーモアを交えて。例：『全員一致で大反対。有権者の団結力だけは証明された』『おばあちゃんも大学生もIT社長も珍しく意見が一致した神公約』）"}`;

  try {
    const result = await callAnthropic<ElectionAnalysisResponse>(
      systemPrompt,
      `公約・政策：${policy}\n\n有権者の反応：\n${responseSummary}`,
      500,
    );

    // Override with server-computed values
    result.raw_approval_rate = rawApprovalRate;
    result.weighted_approval_rate = weightedApprovalRate;
    result.approval_rate = weightedApprovalRate;
    result.age_group_breakdown = ageGroupBreakdown;

    return NextResponse.json(result);
  } catch (e) {
    console.error("Summary API error:", e);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
