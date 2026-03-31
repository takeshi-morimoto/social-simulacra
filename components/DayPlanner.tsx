"use client";

import type { RouteStop } from "@/lib/types";
import { calculateTotalDistance, calculateTotalTravelTime } from "@/lib/route-optimizer";

interface Props {
  stops: RouteStop[];
  onOptimize: () => void;
  onRemove: (spotId: string) => void;
  onSave: () => void;
  saving: boolean;
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

export default function DayPlanner({ stops, onOptimize, onRemove, onSave, saving, optimized }: Props) {
  const totalDistance = calculateTotalDistance(stops);
  const totalTravel = calculateTotalTravelTime(stops);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-800">
          遊説プラン
          <span className="text-xs text-gray-400 font-normal ml-2">{stops.length}箇所</span>
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
                onClick={() => onRemove(stop.spotId)}
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
            onClick={onOptimize}
            className="w-full py-2 text-sm font-medium rounded-lg border border-[#1B2A4A] text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white transition-colors"
          >
            ルートを最適化
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-2 text-sm font-medium rounded-lg bg-[#1B2A4A] text-white hover:bg-[#2a3d5c] transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      )}
    </div>
  );
}
