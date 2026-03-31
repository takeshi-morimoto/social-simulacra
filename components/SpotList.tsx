"use client";

import { useState } from "react";
import type { CampaignSpot, SpotType } from "@/lib/types";

interface Props {
  spots: CampaignSpot[];
  selectedIds: Set<string>;
  onToggle: (spotId: string) => void;
}

const SPOT_COLORS: Record<SpotType, string> = {
  station: "#E74C3C",
  park: "#27AE60",
  shelter: "#3498DB",
  landmark: "#F39C12",
  shopping: "#9B59B6",
  public_hall: "#1ABC9C",
};

const SPOT_LABELS: Record<SpotType, string> = {
  station: "駅",
  park: "公園",
  shelter: "避難施設",
  landmark: "ランドマーク",
  shopping: "商業施設",
  public_hall: "公共施設",
};

const SPOT_ICONS: Record<SpotType, string> = {
  station: "🚉",
  park: "🌳",
  shelter: "🏛️",
  landmark: "📍",
  shopping: "🛒",
  public_hall: "🏢",
};

type FilterType = "all" | SpotType;

export default function SpotList({ spots, selectedIds, onToggle }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? spots : spots.filter((s) => s.type === filter);
  const sorted = [...filtered].sort((a, b) => b.score - a.score);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "全て" },
    { key: "station", label: "駅" },
    { key: "park", label: "公園" },
    { key: "shopping", label: "商業施設" },
    { key: "public_hall", label: "公共施設" },
    { key: "shelter", label: "避難施設" },
    { key: "landmark", label: "ランドマーク" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-800 mb-2">
          スポット一覧
          <span className="text-xs text-gray-400 font-normal ml-2">{spots.length}件</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                filter === f.key
                  ? "bg-[#1B2A4A] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
        {sorted.length === 0 && (
          <div className="p-4 text-xs text-gray-400 text-center">スポットが見つかりません</div>
        )}
        {sorted.map((spot) => (
          <button
            key={spot.id}
            onClick={() => onToggle(spot.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
              selectedIds.has(spot.id) ? "bg-blue-50" : ""
            }`}
          >
            <span className="text-lg flex-shrink-0">{SPOT_ICONS[spot.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 truncate">{spot.name}</div>
              <div className="text-[10px] text-gray-400">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: SPOT_COLORS[spot.type] }}
                />
                {SPOT_LABELS[spot.type]}
                {spot.address && <span className="ml-2">{spot.address}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${spot.score}%`,
                    backgroundColor: SPOT_COLORS[spot.type],
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-500 w-6 text-right">{spot.score}</span>
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedIds.has(spot.id)
                    ? "bg-[#1B2A4A] border-[#1B2A4A]"
                    : "border-gray-300"
                }`}
              >
                {selectedIds.has(spot.id) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
