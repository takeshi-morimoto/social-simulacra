"use client";

import type { VoterPersona } from "@/lib/types";

interface Props {
  personas: VoterPersona[];
}

export default function PersonaList({ personas }: Props) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold text-gray-500">生成された有権者ペルソナ（{personas.length}人）</div>
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
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-gray-800 truncate">{p.name}</div>
                <div className="text-[10px] text-gray-500">{p.age}歳 · {p.gender} · {p.role}</div>
              </div>
              <div className="shrink-0 flex flex-col items-center justify-center h-9 rounded-full bg-slate-100 border border-slate-200 px-2">
                <span className="text-[7px] text-slate-400 leading-none">投票確率</span>
                <span className="text-[10px] text-slate-600 font-bold leading-none">{Math.round((p.voterTurnoutWeight ?? 0.5) * 100)}%</span>
              </div>
            </div>
            <div className="text-[11px] text-gray-600 leading-[1.6] mb-1.5">{p.detail}</div>
            <div className="flex flex-wrap gap-1">
              <span className="rounded bg-purple-50 border border-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">{p.personality}</span>
              <span className="rounded bg-teal-50 border border-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">{p.concern}</span>
            </div>
            {p.desiredPolicy && (
              <div className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-1">
                💬 {p.desiredPolicy}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
