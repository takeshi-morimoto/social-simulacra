"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SimulationData {
  policy: string;
  approval_rate: number;
  recommendations: string[];
  risks: string[];
  overall: string;
  timestamp: number;
}

interface Props {
  municipality: string;
}

export default function PolicyInsightBanner({ municipality }: Props) {
  const [data, setData] = useState<SimulationData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sanbo_simulations") || "{}");
      const match = saved[municipality];
      // 7日以内のデータのみ表示
      if (match && Date.now() - match.timestamp < 7 * 24 * 60 * 60 * 1000) {
        setData(match);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    }
  }, [municipality]);

  if (!data) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-xs text-amber-700">
            この選挙区の政策シミュレーションを先に実行すると、遊説スポットごとの推奨トークテーマが表示されます
          </div>
          <Link
            href={"/"}
            className="text-xs text-[#1B2A4A] font-semibold border border-[#1B2A4A] px-3 py-1 rounded hover:bg-[#1B2A4A] hover:text-white transition-colors flex-shrink-0 ml-3"
          >
            シミュレーターへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-800">政策シミュレーション結果</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              data.approval_rate >= 60 ? "bg-green-100 text-green-700" :
              data.approval_rate >= 40 ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              支持率 {data.approval_rate}%
            </span>
          </div>
          <div className="text-xs text-blue-700 truncate">
            テスト政策: 「{data.policy}」
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
        >
          {expanded ? "閉じる" : "詳細"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-blue-200 space-y-3">
          {/* 戦略提言 → 遊説での訴求ポイント */}
          {data.recommendations.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-blue-800 mb-1">遊説での訴求ポイント</div>
              <div className="space-y-1">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs text-blue-700 bg-white/60 rounded px-2 py-1.5">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* リスク → 避けるべきトピック */}
          {data.risks.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-red-700 mb-1">注意すべきポイント</div>
              <div className="space-y-1">
                {data.risks.map((risk, i) => (
                  <div key={i} className="text-xs text-red-700 bg-red-50 rounded px-2 py-1.5">
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-blue-400">
            シミュレーション実施: {new Date(data.timestamp).toLocaleDateString("ja-JP")}
          </div>
        </div>
      )}
    </div>
  );
}
