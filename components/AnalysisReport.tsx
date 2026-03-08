"use client";

import type { AnalysisResponse } from "@/lib/types";

interface Props {
  analysis: AnalysisResponse | null;
  isLoading: boolean;
  visible: boolean;
}

export default function AnalysisReport({ analysis, isLoading, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="animate-fade-in rounded-[20px] border border-indigo-400/40 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 p-7">
      <div className="mb-5 text-base font-extrabold">📊 政策アナリシスレポート</div>

      {isLoading && (
        <div className="text-[13px] text-gray-400">レポート生成中...</div>
      )}

      {!isLoading && analysis && (
        <div className="grid gap-5">
          {/* Approval Rate */}
          <div>
            <div className="mb-2 text-xs text-gray-400">推定支持率</div>
            <div className="h-3 overflow-hidden rounded-lg bg-white/10">
              <div
                className="h-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-1000"
                style={{ width: `${analysis.approval_rate}%` }}
              />
            </div>
            <div className="mt-1.5 font-bold text-emerald-500">{analysis.approval_rate}%</div>
          </div>

          {/* Overall */}
          <div>
            <div className="mb-2 text-xs text-gray-400">総合評価</div>
            <div className="rounded-[10px] bg-white/5 p-3.5 text-sm leading-7 text-white">
              {analysis.overall}
            </div>
          </div>

          {/* Risks & Recommendations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold text-red-500">⚠️ 主なリスク</div>
              {analysis.risks.map((risk, i) => (
                <div
                  key={i}
                  className="mb-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
                >
                  {risk}
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 text-xs font-bold text-emerald-500">💡 改善提言</div>
              {analysis.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="mb-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
                >
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
