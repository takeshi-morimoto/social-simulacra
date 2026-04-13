"use client";

import type { ElectionAnalysisResponse, ElectionDemographicProfile, AgeGroupResult } from "@/lib/types";
import { estimateWinRate } from "@/lib/election-stats";

interface Props {
  analysis: ElectionAnalysisResponse | null;
  demographics?: ElectionDemographicProfile | null;
  municipality?: string;
  sampleSize?: number;
  isLoading: boolean;
  visible: boolean;
}

/**
 * 「約250,000人」のような文字列から数値を抽出
 */
function parseVoterPopulation(s: string): number {
  const cleaned = s.replace(/[約人,\s]/g, "");
  const num = parseInt(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * 推定得票数を計算
 */
function estimateVotes(demographics: ElectionDemographicProfile | null | undefined, approvalRate: number): number | null {
  if (!demographics?.voter_population || !demographics?.voter_turnout_rates) return null;
  const voterPop = parseVoterPopulation(demographics.voter_population);
  if (voterPop === 0) return null;

  // 全体の平均投票率を算出
  const rates = demographics.voter_turnout_rates;
  const avgTurnout = rates.length > 0
    ? rates.reduce((sum, r) => sum + r.overall, 0) / rates.length / 100
    : 0.55;

  return Math.round(voterPop * avgTurnout * (approvalRate / 100));
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

export default function AnalysisReport({ analysis, demographics, municipality, sampleSize, isLoading, visible }: Props) {
  if (!visible) return null;

  const approvalRate = analysis?.weighted_approval_rate ?? analysis?.approval_rate ?? 0;
  const votes = analysis ? estimateVotes(demographics, approvalRate) : null;
  const winRate = analysis ? estimateWinRate(approvalRate, sampleSize ?? 15, municipality) : null;

  return (
    <div className="animate-fade-in rounded-lg border border-gray-200 bg-white p-5 shadow-sm mb-6">
      <div className="mb-4 text-sm font-semibold text-gray-800">選挙戦略レポート</div>

      {isLoading && (
        <div className="text-sm text-gray-400">レポート生成中...</div>
      )}

      {!isLoading && analysis && (
        <div className="grid gap-5">
          {/* 当選率 + 支持率 + 推定得票数 */}
          <div>
            <div className="flex items-end gap-6 mb-3 flex-wrap">
              {winRate !== null && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">推定当選率</div>
                  <div className={`text-3xl font-black ${
                    winRate >= 60 ? "text-green-600" : winRate >= 40 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {winRate}<span className="text-lg">%</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500 mb-1">推定支持率</div>
                <div className="text-2xl font-black text-[#1B2A4A]">{approvalRate}%</div>
              </div>
              {votes !== null && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">推定得票数</div>
                  <div className="text-2xl font-black text-[#1B2A4A]">
                    {votes.toLocaleString()}<span className="text-sm font-medium text-gray-500 ml-1">票</span>
                  </div>
                </div>
              )}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ${
                  winRate && winRate >= 60 ? "bg-green-500" : winRate && winRate >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${winRate ?? approvalRate}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-gray-400">
              {winRate !== null && winRate >= 60 ? "当選圏内 — この勢いを維持しましょう" :
               winRate !== null && winRate >= 40 ? "接戦 — 戦略的な遊説が鍵です" :
               winRate !== null && winRate >= 20 ? "厳しい戦い — 政策の見直しを検討してください" :
               "苦戦 — 抜本的な戦略転換が必要です"}
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
