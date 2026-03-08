"use client";

import type { Persona, PersonaResponse } from "@/lib/types";

interface Props {
  persona: Persona;
  response: PersonaResponse | null;
  isLoading: boolean;
}

function CardHeader({ persona }: { persona: Persona }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
        style={{ background: `${persona.color}30`, border: `2px solid ${persona.color}` }}
      >
        {persona.icon}
      </div>
      <div>
        <div className="text-sm font-bold text-[#1a1a2e]">{persona.name}</div>
        <div className="mt-0.5 text-[11px] text-gray-500">
          {persona.age}歳 · {persona.role}
        </div>
      </div>
      <div
        className="ml-auto whitespace-nowrap rounded-[20px] px-2.5 py-0.5 text-[10px] font-semibold"
        style={{
          background: `${persona.color}20`,
          color: persona.color,
          border: `1px solid ${persona.color}60`,
        }}
      >
        市民ペルソナ
      </div>
    </div>
  );
}

export default function PersonaCard({ persona, response, isLoading }: Props) {
  const stanceColor =
    response?.stance === "賛成" ? "#2ECC71"
    : response?.stance === "反対" ? "#E74C3C"
    : response?.stance === "条件付き賛成" ? "#F39C12"
    : "#888";
  const stanceIcon =
    response?.stance === "賛成" ? "✅" : response?.stance === "反対" ? "❌" : "⚠️";

  return (
    <div
      className={`rounded-2xl p-5 min-h-[180px] transition-all duration-300${response ? " animate-fade-in" : ""}`}
      style={{ background: persona.bg, border: `1.5px solid ${persona.color}40` }}
    >
      <CardHeader persona={persona} />

      {isLoading && (
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: persona.color, animationDelay: `${i * 0.2}s` }}
            />
          ))}
          <span>考え中...</span>
        </div>
      )}

      {!isLoading && !response && (
        <div className="text-xs italic text-gray-400">{persona.detail}</div>
      )}

      {!isLoading && response && (
        <>
          <div
            className="rounded-xl bg-white p-3.5 text-[13px] leading-7 text-gray-700"
            style={{ borderLeft: `3px solid ${persona.color}` }}
          >
            {response.opinion}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {response.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[20px] px-2.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: `${persona.color}20`,
                  color: persona.color,
                  border: `1px solid ${persona.color}50`,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">この政策への態度：</span>
            <span className="text-xs font-bold" style={{ color: stanceColor }}>
              {stanceIcon} {response.stance}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
