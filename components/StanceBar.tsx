"use client";

import type { StanceCounts } from "@/lib/types";

interface Props {
  counts: StanceCounts;
  visible: boolean;
}

const STANCE_CONFIG = [
  { key: "賛成" as const, color: "#2B8A6E", label: "賛成" },
  { key: "条件付き賛成" as const, color: "#D4850A", label: "条件付き賛成" },
  { key: "反対" as const, color: "#C0392B", label: "反対" },
  { key: "中立" as const, color: "#6B7280", label: "中立" },
];

export default function StanceBar({ counts, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-lg border border-gray-200 bg-white px-5 py-3.5 mb-6 shadow-sm">
      <span className="text-xs font-semibold text-gray-500">市民の反応</span>
      {STANCE_CONFIG.map(({ key, color, label }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className="text-lg font-bold" style={{ color }}>{counts[key]}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
