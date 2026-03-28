"use client";

import type { ElectionAnalysisResponse, AgeGroupResult } from "@/lib/types";

interface Props {
  analysis: ElectionAnalysisResponse | null;
  isLoading: boolean;
  visible: boolean;
}

const STANCE_COLORS: Record<string, string> = {
  "強く賛成": "#1A6B50",
  "賛成": "#2B8A6E",
  "条件付き賛成": "#D4850A",
  "中立": "#9CA3AF",
  "反対": "#C0392B",
  "強く反対": "#8B1A1A",
};

function AgeGroupRow({ group }: { group: AgeGroupResult }) {
  const total = Object.values(group.stanceCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">{group.ageGroup}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{group.count}人</span>
          <span className="text-xs font-bold text-[#1B2A4A]">{group.weighted_approval_rate}%</span>
          {group.approval_rate !== group.weighted_approval_rate && (
            <span className="text-[10px] text-gray-400">（生 {group.approval_rate}%）</span>
          )}
        </div>
      </div>
      {total > 0 && (
        <div className="flex h-2 overflow-hidden rounded-full">
          {Object.entries(group.stanceCounts).map(([stance, count]) =>
            count > 0 ? (
              <div
                key={stance}
                style={{
                  width: `${(count / total) * 100}%`,
                  backgroundColor: STANCE_COLORS[stance] || "#9CA3AF",
                }}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalysisReport({ analysis, isLoading, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="animate-fade-in rounded-lg border border-gray-200 bg-white p-5 shadow-sm mb-6">
      <div className="mb-4 text-sm font-semibold text-gray-800">選挙戦略レポート</div>

      {isLoading && (
        <div className="text-sm text-gray-400">レポート生成中...</div>
      )}

      {!isLoading && analysis && (
        <div className="grid gap-5">
          {/* Dual Approval Rate */}
          <div>
            <div className="mb-1.5 text-xs text-gray-500">推定支持率（投票率加重）</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#1B2A4A] transition-[width] duration-1000"
                style={{ width: `${analysis.weighted_approval_rate ?? analysis.approval_rate}%` }}
              />
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm font-bold text-[#1B2A4A]">{analysis.weighted_approval_rate ?? analysis.approval_rate}%</span>
              {analysis.raw_approval_rate != null && analysis.raw_approval_rate !== (analysis.weighted_approval_rate ?? analysis.approval_rate) && (
                <span className="text-xs text-gray-400">（生の支持率 {analysis.raw_approval_rate}%）</span>
              )}
            </div>
          </div>

          {/* Age Group Breakdown */}
          {analysis.age_group_breakdown && analysis.age_group_breakdown.length > 0 && (
            <div>
              <div className="mb-2 text-xs text-gray-500">年代別内訳</div>
              <div className="grid gap-2">
                {analysis.age_group_breakdown.map((group) => (
                  <AgeGroupRow key={group.ageGroup} group={group} />
                ))}
              </div>
            </div>
          )}

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
              <div className="mb-2 text-xs font-semibold text-[#C0392B]">選挙戦略上のリスク</div>
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
              <div className="mb-2 text-xs font-semibold text-[#1B2A4A]">戦略提言</div>
              {analysis.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="mb-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
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
