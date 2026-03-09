"use client";

import type { Persona, PersonaResponse, StanceCounts, AnalysisResponse } from "@/lib/types";

interface Props {
  municipality: string;
  policy?: string;
  mode: "listen" | "propose";
  stanceCounts?: StanceCounts;
  analysis?: AnalysisResponse | null;
  personas?: Persona[];
  personaResults?: Record<number, PersonaResponse | null>;
  visible: boolean;
}

const STANCE_CONFIG = [
  { key: "強く賛成" as const, emoji: "💪", color: "#1A6B50" },
  { key: "賛成" as const, emoji: "👍", color: "#2B8A6E" },
  { key: "条件付き賛成" as const, emoji: "🤔", color: "#D4850A" },
  { key: "中立" as const, emoji: "😐", color: "#9CA3AF" },
  { key: "反対" as const, emoji: "👎", color: "#C0392B" },
  { key: "強く反対" as const, emoji: "🚫", color: "#8B1A1A" },
];

const PRO_STANCES = new Set(["強く賛成", "賛成", "条件付き賛成"]);
const CON_STANCES = new Set(["反対", "強く反対"]);

function getGradeEmoji(rate: number): string {
  if (rate >= 80) return "🏆";
  if (rate >= 60) return "🥈";
  if (rate >= 40) return "⚖️";
  if (rate >= 20) return "⚠️";
  return "🚨";
}

function getRepresentativeOpinion(
  personas: Persona[],
  results: Record<number, PersonaResponse | null>,
  stanceSet: Set<string>,
): { persona: Persona; opinion: string } | null {
  for (const p of personas) {
    const r = results[p.id];
    if (r && stanceSet.has(r.stance)) {
      return { persona: p, opinion: r.opinion };
    }
  }
  return null;
}

export default function ShareCard({ municipality, policy, mode, stanceCounts, analysis, personas, personaResults, visible }: Props) {
  if (!visible) return null;

  const total = stanceCounts ? Object.values(stanceCounts).reduce((a, b) => a + b, 0) : 0;
  const proOpinion = personas && personaResults ? getRepresentativeOpinion(personas, personaResults, PRO_STANCES) : null;
  const conOpinion = personas && personaResults ? getRepresentativeOpinion(personas, personaResults, CON_STANCES) : null;

  return (
    <div className="mb-6" style={{ aspectRatio: "1200 / 630" }}>
      <div className="h-full rounded-xl border-2 border-gray-900 bg-gradient-to-br from-slate-50 via-white to-gray-100 shadow-lg relative overflow-hidden flex flex-col">
        {/* Inner border */}
        <div className="absolute inset-[4px] border border-gray-300 rounded-lg pointer-events-none" />

        {/* Top: Brand + Policy */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-black tracking-[0.1em] text-black" style={{ fontFamily: "'Noto Serif JP', serif" }}>AI市長</span>
            <span className="text-[9px] tracking-[0.15em] text-gray-400 border-l border-gray-300 pl-3">SOCIAL SIMULACRA</span>
          </div>
          <div className="text-base font-bold text-gray-800 mb-0.5">{municipality}</div>
          {mode === "listen" && policy && (
            <div className="text-lg font-black text-gray-900 leading-7 line-clamp-2">「{policy}」</div>
          )}
          {mode === "propose" && (
            <div className="text-lg font-black text-gray-900 leading-7">市民ペルソナによる政策立案</div>
          )}
        </div>

        {/* Middle: Approval rate + bar (centered) */}
        {mode === "listen" && stanceCounts && total > 0 && analysis && (() => {
          const emoji = getGradeEmoji(analysis.approval_rate);
          return (
            <div className="flex-1 flex flex-col justify-center px-6">
              {/* Approval rate + AI comment */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-3xl font-black text-gray-900">{analysis.approval_rate}%</span>
                    <span className="text-[10px] text-gray-400 font-medium">推定支持率</span>
                  </div>
                </div>
              </div>

              {/* AI share comment - prominent display */}
              {analysis.share_comment && (
                <div className="rounded-lg bg-gray-900 px-4 py-2.5 mb-3">
                  <div className="text-sm font-bold text-white leading-6">💬 {analysis.share_comment}</div>
                </div>
              )}

              {/* Stance bar */}
              <div className="flex h-3 overflow-hidden rounded-full mb-2">
                {STANCE_CONFIG.map(({ key, color }) =>
                  stanceCounts[key] > 0 ? (
                    <div key={key} style={{ width: `${(stanceCounts[key] / total) * 100}%`, backgroundColor: color }} />
                  ) : null
                )}
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] mb-3">
                {STANCE_CONFIG.map(({ key, emoji, color }) =>
                  stanceCounts[key] > 0 ? (
                    <span key={key} className="font-semibold" style={{ color }}>{emoji}{key} {stanceCounts[key]}</span>
                  ) : null
                )}
              </div>

              {/* Representative opinions */}
              <div className="grid grid-cols-2 gap-2">
                {proOpinion && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm">👍</span>
                      <span className="text-[10px] font-bold text-green-800">賛成の声</span>
                    </div>
                    <div className="text-[10px] text-green-900 leading-4 line-clamp-2">「{proOpinion.opinion}」</div>
                    <div className="text-[9px] text-green-600 mt-0.5">— {proOpinion.persona.icon} {proOpinion.persona.name}（{proOpinion.persona.role}）</div>
                  </div>
                )}
                {conOpinion && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-sm">👎</span>
                      <span className="text-[10px] font-bold text-red-800">反対の声</span>
                    </div>
                    <div className="text-[10px] text-red-900 leading-4 line-clamp-2">「{conOpinion.opinion}」</div>
                    <div className="text-[9px] text-red-600 mt-0.5">— {conOpinion.persona.icon} {conOpinion.persona.name}（{conOpinion.persona.role}）</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {mode === "propose" && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🏛️</div>
              <div className="text-sm text-gray-600">15人の市民ペルソナが政策を提案しました</div>
            </div>
          </div>
        )}

        {/* Bottom: CTA + Footer */}
        <div className="flex items-center justify-between px-6 pb-3 pt-1">
          <span className="text-[10px] text-gray-500 bg-gray-100 rounded-full px-3 py-1">👉 あなたの街でも試してみよう</span>
          <span className="text-[9px] text-gray-400">Produced by KOIKOI, Inc.</span>
        </div>
      </div>
    </div>
  );
}
