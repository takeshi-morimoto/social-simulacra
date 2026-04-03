"use client";

import type { RouteStop } from "@/lib/types";
import { calculateTotalDistance, calculateTotalTravelTime } from "@/lib/route-optimizer";

interface Props {
  stops: RouteStop[];
  dayLabel?: string;
  active?: boolean;
  onActivate?: () => void;
  onOptimize: () => void;
  onRemove: (spotId: string) => void;
  optimized: boolean;
}

const SPOT_ICONS: Record<string, string> = {
  station: "🚉",
  park: "🌳",
  shelter: "🏛️",
  landmark: "📍",
  shopping: "🛒",
  public_hall: "🏢",
};

export default function DayPlanner({ stops, dayLabel, active, onActivate, onOptimize, onRemove, optimized }: Props) {
  const totalDistance = calculateTotalDistance(stops);
  const totalTravel = calculateTotalTravelTime(stops);

  return (
    <div
      className={`bg-white rounded-lg border-2 shadow-sm cursor-pointer transition-colors ${active ? "border-[#1B2A4A] ring-1 ring-[#1B2A4A]/20" : "border-gray-200 hover:border-gray-300"}`}
      onClick={onActivate}
    >
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {dayLabel && (
            <span className="px-2 py-0.5 bg-[#1B2A4A] text-white text-[10px] font-bold rounded">
              {dayLabel}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-800">
            遊説プラン
          </span>
          <span className="text-xs text-gray-400 font-normal">{stops.length}箇所</span>
        </div>
        {stops.length >= 2 && (
          <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
            <span>総距離: {totalDistance}km</span>
            <span>移動時間: 約{totalTravel}分</span>
          </div>
        )}
      </div>

      {stops.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400">
          マップまたはスポット一覧から<br />訪問先を選択してください
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {stops.map((stop, i) => (
            <div key={stop.spotId} className="flex items-start gap-3 px-3 py-2.5">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-[#1B2A4A] text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                {i < stops.length - 1 && (
                  <div className="w-px h-6 bg-gray-200 mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span>{SPOT_ICONS[stop.spot.type]}</span>
                  <span className="text-sm text-gray-800 truncate">{stop.spot.name}</span>
                </div>
                {optimized && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {stop.startTime} ・ 滞在{stop.duration}分
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(stop.spotId); }}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {stops.length >= 2 && (
        <div className="p-3 border-t border-gray-100 space-y-2">
          <button
            onClick={(e) => { e.stopPropagation(); onOptimize(); }}
            className="w-full py-2 text-sm font-medium rounded-lg border border-[#1B2A4A] text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white transition-colors"
          >
            ルートを最適化
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const origin = `${stops[0].spot.lat},${stops[0].spot.lng}`;
              const destination = `${stops[stops.length - 1].spot.lat},${stops[stops.length - 1].spot.lng}`;
              const waypoints = stops.slice(1, -1).map((s) => `${s.spot.lat},${s.spot.lng}`).join("|");
              let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
              if (waypoints) url += `&waypoints=${waypoints}`;
              window.open(url, "_blank");
            }}
            className="w-full py-2 text-sm font-medium rounded-lg border border-[#27AE60] text-[#27AE60] hover:bg-[#27AE60] hover:text-white transition-colors"
          >
            Google Mapsで開く
          </button>
        </div>
      )}
    </div>
  );
}
