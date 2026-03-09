"use client";

import type { StanceCounts, AnalysisResponse } from "@/lib/types";

interface Props {
  municipality: string;
  policy?: string;
  mode: "listen" | "propose";
  stanceCounts?: StanceCounts;
  analysis?: AnalysisResponse | null;
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

function getGrade(rate: number): { emoji: string; comment: string; color: string } {
  if (rate >= 80) return { emoji: "🏆", comment: "素晴らしい政策です！市民から圧倒的な支持を得ています", color: "text-amber-700" };
  if (rate >= 60) return { emoji: "🥈", comment: "良い政策です。多くの市民が前向きに評価しています", color: "text-slate-700" };
  if (rate >= 40) return { emoji: "⚖️", comment: "賛否が分かれています。さらなる議論と改善が必要です", color: "text-orange-700" };
  if (rate >= 20) return { emoji: "⚠️", comment: "支持が低い政策です。市民の声を聞いて見直しましょう", color: "text-red-600" };
  return { emoji: "🚨", comment: "市民から強い反発があります。根本的な再検討が必要です", color: "text-red-800" };
}

export default function ShareCard({ municipality, policy, mode, stanceCounts, analysis, visible }: Props) {
  if (!visible) return null;

  const total = stanceCounts ? Object.values(stanceCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div
      className="mb-6"
      style={{ aspectRatio: "1200 / 630" }}
    >
      <div className="h-full rounded-xl border-2 border-gray-900 bg-gradient-to-br from-gray-50 via-white to-slate-100 p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
        {/* Inner border */}
        <div className="absolute inset-[4px] border border-gray-400 rounded-lg pointer-events-none" />

        {/* Top: Brand */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-xl font-black tracking-[0.1em] text-black sm:text-2xl" style={{ fontFamily: "'Noto Serif JP', serif" }}>AI市長</span>
            <span className="text-[10px] tracking-[0.15em] text-gray-400 border-l border-gray-300 pl-3">SOCIAL SIMULACRA</span>
          </div>

          {/* Policy info */}
          <div className="mb-3">
            <div className="text-[11px] text-gray-400 mb-0.5">{municipality}</div>
            {mode === "listen" && policy && (
              <div className="text-sm font-semibold text-gray-900 leading-6 line-clamp-2">「{policy}」</div>
            )}
            {mode === "propose" && (
              <div className="text-sm font-semibold text-gray-900 leading-6">市民ペルソナによる政策立案</div>
            )}
          </div>
        </div>

        {/* Middle: Results */}
        {mode === "listen" && stanceCounts && total > 0 && (
          <div className="flex-1 flex flex-col justify-center">
            {/* Bar */}
            <div className="flex h-4 overflow-hidden rounded-full mb-3">
              {STANCE_CONFIG.map(({ key, color }) =>
                stanceCounts[key] > 0 ? (
                  <div key={key} className="transition-all duration-700" style={{ width: `${(stanceCounts[key] / total) * 100}%`, backgroundColor: color }} />
                ) : null
              )}
            </div>

            {/* Counts */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-3">
              {STANCE_CONFIG.map(({ key, emoji, color }) =>
                stanceCounts[key] > 0 ? (
                  <span key={key} className="font-semibold" style={{ color }}>
                    {emoji} {key} {stanceCounts[key]}
                  </span>
                ) : null
              )}
            </div>

            {/* Approval rate + comment */}
            {analysis && (() => {
              const grade = getGrade(analysis.approval_rate);
              return (
                <div className="flex items-center gap-3 rounded-lg bg-white/60 border border-gray-200 px-4 py-3">
                  <span className="text-4xl">{grade.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-2xl font-black text-gray-900">{analysis.approval_rate}%</span>
                      <span className="text-[10px] text-gray-400">推定支持率</span>
                    </div>
                    <div className={`text-xs font-semibold leading-5 ${grade.color}`}>{grade.comment}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {mode === "propose" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🏛️</div>
              <div className="text-sm text-gray-600">15人の市民ペルソナが政策を提案しました</div>
            </div>
          </div>
        )}

        {/* Bottom: Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-[10px] text-gray-400">Produced by KOIKOI, Inc.</span>
          <div className="flex gap-2 text-lg">
            <span>👵</span><span>🧑‍💼</span><span>👩‍💻</span><span>👨‍👩‍👧</span><span>🎓</span><span>👴</span>
          </div>
        </div>
      </div>
    </div>
  );
}
