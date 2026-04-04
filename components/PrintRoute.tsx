"use client";

import type { CampaignDay, RouteStop } from "@/lib/types";

const SPOT_ICONS: Record<string, string> = {
  station: "🚉", park: "🌳", shelter: "🏛️", landmark: "📍", shopping: "🛒", public_hall: "🏢",
};

interface SpotAdviceData {
  talkPoints: string[];
  avoidTopics: string[];
}

interface PrintRouteProps {
  days: CampaignDay[];
  spotAdvice: Record<string, SpotAdviceData>;
  municipality: string;
  optimized: boolean;
}

export default function PrintRoute({ days, spotAdvice, municipality, optimized }: PrintRouteProps) {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <style jsx global>{`
        @media print {
          body > *:not(#print-route-root) {
            display: none !important;
          }
          #print-route-root {
            display: block !important;
          }
        }
      `}</style>

      <div id="print-route-root" className="hidden print:block">
        <style jsx>{`
          @media print {
            .print-page {
              page-break-after: always;
              padding: 0;
              margin: 0;
              font-size: 12px;
              font-family: sans-serif;
              color: #000;
            }
            .print-page:last-child {
              page-break-after: auto;
            }
          }
        `}</style>

        {days.map((day) => (
          <div key={day.dayNumber} className="print-page" style={{ padding: "20px 24px", fontSize: "12px", color: "#000" }}>
            {/* Header */}
            <div style={{ borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "16px" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {municipality} 遊説プラン - {day.dayNumber}日目
              </div>
              <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>
                作成日: {today} / 全{days.length}日間計画のうち{day.dayNumber}日目 / {day.stops.length}箇所
              </div>
            </div>

            {/* Schedule */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid #999", paddingBottom: "4px" }}>
                スケジュール
              </div>
              {day.stops.length === 0 && (
                <div style={{ color: "#999", fontSize: "11px" }}>スポットが配置されていません</div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #ccc", fontSize: "11px", color: "#555" }}>#</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #ccc", fontSize: "11px", color: "#555" }}>種別</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #ccc", fontSize: "11px", color: "#555" }}>スポット名</th>
                    {optimized && (
                      <>
                        <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #ccc", fontSize: "11px", color: "#555" }}>開始時刻</th>
                        <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #ccc", fontSize: "11px", color: "#555" }}>滞在時間</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {day.stops.map((stop, i) => (
                    <tr key={stop.spotId}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", fontWeight: "bold" }}>{i + 1}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{SPOT_ICONS[stop.spot.type] || "📍"}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{stop.spot.name}</td>
                      {optimized && (
                        <>
                          <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{stop.startTime || "—"}</td>
                          <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>{stop.duration}分</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Talk Advice */}
            {spotAdvice && Object.keys(spotAdvice).length > 0 && (
              <div>
                <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "1px solid #999", paddingBottom: "4px" }}>
                  訴求ポイント
                </div>
                {day.stops.map((stop, i) => {
                  const advice = spotAdvice[stop.spotId];
                  if (!advice) return null;
                  return (
                    <div key={stop.spotId} style={{ marginBottom: "12px", paddingLeft: "8px", borderLeft: "2px solid #333" }}>
                      <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
                        {i + 1}. {SPOT_ICONS[stop.spot.type] || "📍"} {stop.spot.name}
                      </div>
                      {advice.talkPoints.length > 0 && (
                        <div style={{ marginBottom: "4px" }}>
                          {advice.talkPoints.map((point, j) => (
                            <div key={j} style={{ fontSize: "11px", paddingLeft: "12px", marginBottom: "2px" }}>
                              ・ {point}
                            </div>
                          ))}
                        </div>
                      )}
                      {advice.avoidTopics.length > 0 && (
                        <div style={{ fontSize: "11px", paddingLeft: "12px", color: "#555" }}>
                          [注意] {advice.avoidTopics.join("、")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
