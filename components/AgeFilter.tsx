"use client";

import type { AgeGroupFilter } from "@/lib/types";

interface Props {
  value: AgeGroupFilter;
  onChange: (value: AgeGroupFilter) => void;
}

const FILTERS: { label: string; value: AgeGroupFilter }[] = [
  { label: "全体", value: "all" },
  { label: "18〜29歳", value: "18〜29歳" },
  { label: "30〜44歳", value: "30〜44歳" },
  { label: "45〜64歳", value: "45〜64歳" },
  { label: "65歳以上", value: "65歳以上" },
];

export default function AgeFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer border ${
            value === f.value
              ? "bg-[#1B2A4A] text-white border-[#1B2A4A]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
