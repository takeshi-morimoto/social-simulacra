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

type LetterGrade = { letter: string; color: string; bg: string; border: string; glow: string };

function getLetterGrade(rate: number): LetterGrade {
  if (rate >= 90) return { letter: "S", color: "text-amber-500", bg: "bg-gradient-to-br from-amber-400 to-yellow-500", border: "border-amber-400", glow: "shadow-amber-300/50" };
  if (rate >= 75) return { letter: "A", color: "text-emerald-500", bg: "bg-gradient-to-br from-emerald-400 to-green-500", border: "border-emerald-400", glow: "shadow-emerald-300/50" };
  if (rate >= 60) return { letter: "B", color: "text-blue-500", bg: "bg-gradient-to-br from-blue-400 to-sky-500", border: "border-blue-400", glow: "shadow-blue-300/50" };
  if (rate >= 40) return { letter: "C", color: "text-orange-500", bg: "bg-gradient-to-br from-orange-400 to-amber-500", border: "border-orange-400", glow: "shadow-orange-300/50" };
  if (rate >= 20) return { letter: "D", color: "text-red-500", bg: "bg-gradient-to-br from-red-400 to-rose-500", border: "border-red-400", glow: "shadow-red-300/50" };
  return { letter: "F", color: "text-red-700", bg: "bg-gradient-to-br from-red-600 to-red-800", border: "border-red-600", glow: "shadow-red-500/50" };
}

function getDivisionLevel(counts: StanceCounts): { label: string; emoji: string; value: number } {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return { label: "—", emoji: "😐", value: 0 };
  const pro = (counts["強く賛成"] + counts["賛成"] + counts["条件付き賛成"]) / total;
  const con = (counts["反対"] + counts["強く反対"]) / total;
  const balance = 1 - Math.abs(pro - con);
  if (balance > 0.8) return { label: "真っ二つ", emoji: "⚔️", value: balance * 100 };
  if (balance > 0.5) return { label: "意見割れ", emoji: "💥", value: balance * 100 };
  if (pro > con) return { label: "概ね賛成", emoji: "✨", value: balance * 100 };
  return { label: "ほぼ反対", emoji: "🌊", value: balance * 100 };
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
      <div className="h-full rounded-xl bg-[#0f172a] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Top: Brand + Policy */}
        <div className="px-6 pt-5 pb-2 relative">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm font-black tracking-[0.1em] text-white/90" style={{ fontFamily: "'Noto Serif JP', serif" }}>AI市長</span>
            <span className="text-[9px] tracking-[0.15em] text-white/30 border-l border-white/20 pl-3">SOCIAL SIMULACRA</span>
          </div>
          <div className="text-xs text-white/40 mb-0.5">{municipality}</div>
          {mode === "listen" && policy && (
            <div className="text-lg font-black text-white leading-7 line-clamp-2">「{policy}」</div>
          )}
          {mode === "propose" && (
            <div className="text-lg font-black text-white leading-7">市民ペルソナによる政策立案</div>
          )}
        </div>

        {/* Middle */}
        {mode === "listen" && stanceCounts && total > 0 && analysis && (() => {
          const letterGrade = getLetterGrade(analysis.approval_rate);
          const division = getDivisionLevel(stanceCounts);
          return (
            <div className="flex-1 flex flex-col justify-center px-6 relative">
              <div className="flex gap-4 mb-3">
                {/* Letter grade */}
                <div className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-2xl ${letterGrade.bg} flex items-center justify-center shadow-lg ${letterGrade.glow}`}>
                    <span className="text-5xl font-black text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{letterGrade.letter}</span>
                  </div>
                  <span className="text-[10px] text-white/40 mt-1">政策評価</span>
                </div>

                {/* Stats */}
                <div className="flex-1 min-w-0">
                  {/* Approval rate */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-black text-white">{analysis.approval_rate}%</span>
                    <span className="text-[10px] text-white/40">推定支持率</span>
                  </div>

                  {/* AI comment */}
                  <div className="text-xs text-white/70 leading-5 mb-2 line-clamp-2">
                    {analysis.share_comment || ""}
                  </div>

                  {/* Division meter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{division.emoji}</span>
                    <span className="text-[10px] font-bold text-white/60">{division.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-red-400" style={{ width: `${division.value}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stance bar */}
              <div className="flex h-2.5 overflow-hidden rounded-full mb-2">
                {STANCE_CONFIG.map(({ key, color }) =>
                  stanceCounts[key] > 0 ? (
                    <div key={key} style={{ width: `${(stanceCounts[key] / total) * 100}%`, backgroundColor: color }} />
                  ) : null
                )}
              </div>

              {/* Persona icons by stance */}
              {personas && personaResults && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center">
                    <span className="text-[9px] text-green-400 mr-1">賛成</span>
                    <div className="flex -space-x-1">
                      {personas.filter(p => personaResults[p.id] && PRO_STANCES.has(personaResults[p.id]!.stance)).slice(0, 8).map(p => (
                        <span key={p.id} className="text-sm" title={p.name}>{p.icon}</span>
                      ))}
                    </div>
                  </div>
                  <div className="w-px h-3 bg-white/20" />
                  <div className="flex items-center">
                    <span className="text-[9px] text-red-400 mr-1">反対</span>
                    <div className="flex -space-x-1">
                      {personas.filter(p => personaResults[p.id] && CON_STANCES.has(personaResults[p.id]!.stance)).slice(0, 8).map(p => (
                        <span key={p.id} className="text-sm" title={p.name}>{p.icon}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Representative opinions */}
              <div className="grid grid-cols-2 gap-2">
                {proOpinion && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1.5">
                    <div className="text-[10px] text-green-300 leading-4 line-clamp-2">「{proOpinion.opinion}」</div>
                    <div className="text-[9px] text-green-500/60 mt-0.5">— {proOpinion.persona.icon} {proOpinion.persona.name}</div>
                  </div>
                )}
                {conOpinion && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5">
                    <div className="text-[10px] text-red-300 leading-4 line-clamp-2">「{conOpinion.opinion}」</div>
                    <div className="text-[9px] text-red-500/60 mt-0.5">— {conOpinion.persona.icon} {conOpinion.persona.name}</div>
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
              <div className="text-sm text-white/60">15人の市民ペルソナが政策を提案しました</div>
            </div>
          </div>
        )}

        {/* Bottom: CTA + Footer */}
        <div className="px-6 pb-4 pt-1 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/60 bg-white/10 rounded-full px-3 py-1">👉 あなたの街でも試してみよう</span>
            </div>
            <span className="text-[9px] text-white/30">Produced by KOIKOI, Inc.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
