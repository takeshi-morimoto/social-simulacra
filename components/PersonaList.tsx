"use client";

import type { Persona } from "@/lib/types";

interface Props {
  personas: Persona[];
}

export default function PersonaList({ personas }: Props) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold text-gray-500">生成されたペルソナ（{personas.length}人）</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                style={{ background: `${p.color}25`, border: `1.5px solid ${p.color}` }}
              >
                {p.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-gray-800 truncate">{p.name}</div>
                <div className="text-[10px] text-gray-500">{p.age}歳 · {p.role}</div>
              </div>
            </div>
            <div className="text-[11px] text-gray-600 leading-[1.6] mb-1.5">{p.detail}</div>
            <div className="flex flex-wrap gap-1">
              <span className="rounded bg-purple-50 border border-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">{p.personality}</span>
              <span className="rounded bg-teal-50 border border-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">{p.concern}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
