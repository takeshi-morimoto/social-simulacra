"use client";

import type { StanceCounts } from "@/lib/types";

interface Props {
  counts: StanceCounts;
  visible: boolean;
}

const STANCE_CONFIG = [
  { key: "賛成" as const, icon: "✅", color: "#2ECC71", label: "賛成" },
  { key: "条件付き賛成" as const, icon: "⚠️", color: "#F39C12", label: "条件付き賛成" },
  { key: "反対" as const, icon: "❌", color: "#E74C3C", label: "反対" },
  { key: "中立" as const, icon: "➖", color: "#888", label: "中立" },
];

export default function StanceBar({ counts, visible }: Props) {
  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/12 bg-white/6 px-5 py-4 mb-6">
      <span className="text-xs font-bold text-gray-400">市民の反応：</span>
      {STANCE_CONFIG.map(({ key, icon, color, label }) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xl font-bold" style={{ color }}>{counts[key]}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
