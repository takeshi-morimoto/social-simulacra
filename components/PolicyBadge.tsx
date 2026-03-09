"use client";

import type { StanceCounts } from "@/lib/types";

interface Props {
  counts: StanceCounts;
  approvalRate?: number;
  visible: boolean;
}

type Grade = {
  label: string;
  sublabel: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
};

function getGrade(approvalRate: number): Grade {
  if (approvalRate >= 80) return { label: "極めて高い支持", sublabel: "Excellent", emoji: "🏆", bg: "bg-gradient-to-br from-yellow-50 to-amber-100", border: "border-amber-400", text: "text-amber-800", glow: "shadow-amber-200" };
  if (approvalRate >= 60) return { label: "高い支持", sublabel: "Good", emoji: "🥈", bg: "bg-gradient-to-br from-gray-50 to-slate-100", border: "border-slate-400", text: "text-slate-700", glow: "shadow-slate-200" };
  if (approvalRate >= 40) return { label: "賛否両論", sublabel: "Mixed", emoji: "⚖️", bg: "bg-gradient-to-br from-orange-50 to-amber-50", border: "border-orange-300", text: "text-orange-800", glow: "shadow-orange-100" };
  if (approvalRate >= 20) return { label: "支持が低い", sublabel: "Low", emoji: "⚠️", bg: "bg-gradient-to-br from-red-50 to-orange-50", border: "border-red-300", text: "text-red-700", glow: "shadow-red-100" };
  return { label: "強い反発", sublabel: "Critical", emoji: "🚨", bg: "bg-gradient-to-br from-red-100 to-red-50", border: "border-red-500", text: "text-red-800", glow: "shadow-red-200" };
}

function getStanceGrade(counts: StanceCounts): Grade {
  const total = counts["賛成"] + counts["条件付き賛成"] + counts["反対"] + counts["中立"];
  if (total === 0) return getGrade(50);
  const rate = ((counts["賛成"] + counts["条件付き賛成"] * 0.5) / total) * 100;
  return getGrade(rate);
}

export default function PolicyBadge({ counts, approvalRate, visible }: Props) {
  if (!visible) return null;

  const grade = approvalRate != null ? getGrade(approvalRate) : getStanceGrade(counts);
  const total = counts["賛成"] + counts["条件付き賛成"] + counts["反対"] + counts["中立"];

  return (
    <div className={`animate-fade-in rounded-xl border-2 ${grade.border} ${grade.bg} p-5 mb-6 shadow-lg ${grade.glow}`}>
      <div className="flex items-center gap-4">
        {/* Badge icon */}
        <div className="text-5xl">{grade.emoji}</div>

        <div className="flex-1 min-w-0">
          {/* Grade label */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-lg font-bold ${grade.text}`}>{grade.label}</span>
            <span className="text-xs text-gray-400 font-medium">{grade.sublabel}</span>
          </div>

          {/* Visual bar */}
          {total > 0 && (
            <div className="flex h-3 overflow-hidden rounded-full mb-2">
              {counts["賛成"] > 0 && (
                <div className="bg-[#2B8A6E] transition-all duration-700" style={{ width: `${(counts["賛成"] / total) * 100}%` }} />
              )}
              {counts["条件付き賛成"] > 0 && (
                <div className="bg-[#D4850A] transition-all duration-700" style={{ width: `${(counts["条件付き賛成"] / total) * 100}%` }} />
              )}
              {counts["反対"] > 0 && (
                <div className="bg-[#C0392B] transition-all duration-700" style={{ width: `${(counts["反対"] / total) * 100}%` }} />
              )}
              {counts["中立"] > 0 && (
                <div className="bg-[#9CA3AF] transition-all duration-700" style={{ width: `${(counts["中立"] / total) * 100}%` }} />
              )}
            </div>
          )}

          {/* Counts */}
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="font-semibold text-[#2B8A6E]">賛成 {counts["賛成"]}</span>
            <span className="font-semibold text-[#D4850A]">条件付き {counts["条件付き賛成"]}</span>
            <span className="font-semibold text-[#C0392B]">反対 {counts["反対"]}</span>
            <span className="font-semibold text-gray-400">中立 {counts["中立"]}</span>
            {approvalRate != null && (
              <span className={`font-bold ${grade.text} ml-auto`}>支持率 {approvalRate}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
