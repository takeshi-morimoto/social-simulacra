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
    <div className="animate-fade-in rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-gray-800">政策アナリシスレポート</div>

      {isLoading && (
        <div className="text-sm text-gray-400">レポート生成中...</div>
      )}

      {!isLoading && analysis && (
        <div className="grid gap-5">
          {/* Approval Rate */}
          <div>
            <div className="mb-1.5 text-xs text-gray-500">推定支持率</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#2B8A6E] transition-[width] duration-1000"
                style={{ width: `${analysis.approval_rate}%` }}
              />
            </div>
            <div className="mt-1 text-sm font-bold text-[#2B8A6E]">{analysis.approval_rate}%</div>
          </div>

          {/* Overall */}
          <div>
            <div className="mb-1.5 text-xs text-gray-500">総合評価</div>
            <div className="rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-700">
              {analysis.overall}
            </div>
          </div>

          {/* Risks & Recommendations */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-[#C0392B]">主なリスク</div>
              {analysis.risks.map((risk, i) => (
                <div
                  key={i}
                  className="mb-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                >
                  {risk}
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-[#2B8A6E]">改善提言</div>
              {analysis.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="mb-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800"
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
