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

type LetterGrade = { letter: string; bg: string; border: string };

function getLetterGrade(rate: number): LetterGrade {
  if (rate >= 90) return { letter: "S", bg: "from-amber-400 to-yellow-500", border: "border-amber-400" };
  if (rate >= 75) return { letter: "A", bg: "from-emerald-400 to-green-500", border: "border-emerald-400" };
  if (rate >= 60) return { letter: "B", bg: "from-blue-400 to-sky-500", border: "border-blue-400" };
  if (rate >= 40) return { letter: "C", bg: "from-orange-400 to-amber-500", border: "border-orange-400" };
  if (rate >= 20) return { letter: "D", bg: "from-red-400 to-rose-500", border: "border-red-400" };
  return { letter: "F", bg: "from-red-600 to-red-800", border: "border-red-600" };
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

/* Decorative background SVG illustrations (very faint) */
function BgIllustrations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.04 }}>
      {/* City buildings - bottom right */}
      <svg className="absolute bottom-2 right-4" width="180" height="120" viewBox="0 0 180 120" fill="none">
        <rect x="10" y="40" width="30" height="80" rx="3" fill="currentColor" />
        <rect x="16" y="48" width="8" height="8" rx="1" fill="white" />
        <rect x="16" y="62" width="8" height="8" rx="1" fill="white" />
        <rect x="16" y="76" width="8" height="8" rx="1" fill="white" />
        <rect x="28" y="48" width="8" height="8" rx="1" fill="white" />
        <rect x="28" y="62" width="8" height="8" rx="1" fill="white" />
        <rect x="50" y="20" width="35" height="100" rx="3" fill="currentColor" />
        <rect x="56" y="28" width="8" height="8" rx="1" fill="white" />
        <rect x="56" y="42" width="8" height="8" rx="1" fill="white" />
        <rect x="56" y="56" width="8" height="8" rx="1" fill="white" />
        <rect x="56" y="70" width="8" height="8" rx="1" fill="white" />
        <rect x="70" y="28" width="8" height="8" rx="1" fill="white" />
        <rect x="70" y="42" width="8" height="8" rx="1" fill="white" />
        <rect x="70" y="56" width="8" height="8" rx="1" fill="white" />
        <rect x="95" y="55" width="25" height="65" rx="3" fill="currentColor" />
        <rect x="100" y="62" width="6" height="6" rx="1" fill="white" />
        <rect x="100" y="74" width="6" height="6" rx="1" fill="white" />
        <rect x="110" y="62" width="6" height="6" rx="1" fill="white" />
        <rect x="130" y="35" width="40" height="85" rx="3" fill="currentColor" />
        <rect x="137" y="42" width="8" height="8" rx="1" fill="white" />
        <rect x="137" y="56" width="8" height="8" rx="1" fill="white" />
        <rect x="137" y="70" width="8" height="8" rx="1" fill="white" />
        <rect x="152" y="42" width="8" height="8" rx="1" fill="white" />
        <rect x="152" y="56" width="8" height="8" rx="1" fill="white" />
        {/* Triangle roof on short building */}
        <polygon points="95,55 107,38 120,55" fill="currentColor" />
      </svg>

      {/* Speech bubbles - top left */}
      <svg className="absolute top-6 left-6" width="100" height="80" viewBox="0 0 100 80" fill="none">
        <ellipse cx="40" cy="25" rx="35" ry="22" fill="currentColor" />
        <polygon points="30,44 25,60 42,42" fill="currentColor" />
        <ellipse cx="72" cy="50" rx="24" ry="16" fill="currentColor" />
        <polygon points="75,64 80,76 68,62" fill="currentColor" />
      </svg>

      {/* People silhouettes - bottom left */}
      <svg className="absolute bottom-4 left-8" width="120" height="60" viewBox="0 0 120 60" fill="none">
        <circle cx="20" cy="15" r="8" fill="currentColor" />
        <ellipse cx="20" cy="42" rx="12" ry="18" fill="currentColor" />
        <circle cx="55" cy="18" r="7" fill="currentColor" />
        <ellipse cx="55" cy="43" rx="10" ry="17" fill="currentColor" />
        <circle cx="85" cy="13" r="9" fill="currentColor" />
        <ellipse cx="85" cy="42" rx="13" ry="18" fill="currentColor" />
        <circle cx="110" cy="20" r="6" fill="currentColor" />
        <ellipse cx="110" cy="44" rx="9" ry="16" fill="currentColor" />
      </svg>

      {/* Decorative dots / stars - scattered */}
      <svg className="absolute top-8 right-20" width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle cx="10" cy="10" r="4" fill="currentColor" />
        <circle cx="40" cy="8" r="3" fill="currentColor" />
        <circle cx="25" cy="35" r="5" fill="currentColor" />
        <circle cx="50" cy="45" r="3" fill="currentColor" />
        <circle cx="8" cy="50" r="4" fill="currentColor" />
      </svg>
    </div>
  );
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

        {/* Background illustrations */}
        <BgIllustrations />

        {/* Top: Brand + Policy */}
        <div className="px-6 pt-5 pb-3 relative">
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

        {/* Middle */}
        {mode === "listen" && stanceCounts && total > 0 && analysis && (() => {
          const grade = getLetterGrade(analysis.approval_rate);
          return (
            <div className="flex-1 flex flex-col justify-center px-6 relative">
              <div className="flex items-start gap-4 mb-3">
                {/* Letter grade badge */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grade.bg} border-2 ${grade.border} flex items-center justify-center shadow-md shrink-0`}>
                  <span className="text-3xl font-black text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>{grade.letter}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-3xl font-black text-gray-900">{analysis.approval_rate}%</span>
                    <span className="text-[10px] text-gray-400 font-medium">推定支持率</span>
                  </div>
                </div>
              </div>

              {/* AI share comment */}
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
        <div className="flex items-center justify-between px-6 pb-3 pt-1 relative">
          <span className="text-[10px] text-gray-500 bg-gray-100 rounded-full px-3 py-1">👉 あなたの街でも試してみよう</span>
          <span className="text-[9px] text-gray-400">Produced by KOIKOI, Inc.</span>
        </div>
      </div>
    </div>
  );
}
