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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ background: `${persona.color}25`, border: `1.5px solid ${persona.color}` }}
      >
        {persona.icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{persona.name}</div>
        <div className="text-[11px] text-gray-500">
          {persona.age}歳 · {persona.role}
        </div>
      </div>
    </div>
  );
}

export default function PersonaCard({ persona, response, isLoading }: Props) {
  const stanceColor =
    response?.stance === "賛成" ? "#2B8A6E"
    : response?.stance === "反対" ? "#C0392B"
    : response?.stance === "条件付き賛成" ? "#D4850A"
    : "#6B7280";

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm min-h-[160px] transition-all${response ? " animate-fade-in" : ""}`}
    >
      <CardHeader persona={persona} />

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
          <span>考え中...</span>
        </div>
      )}

      {!isLoading && !response && (
        <div className="text-xs text-gray-400 italic">{persona.detail}</div>
      )}

      {!isLoading && response && (
        <>
          <div
            className="rounded-md bg-gray-50 p-3 text-[13px] leading-6 text-gray-700"
            style={{ borderLeft: `3px solid ${persona.color}` }}
          >
            {response.opinion}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {response.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${persona.color}15`,
                  color: persona.color,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">態度：</span>
            <span className="text-xs font-semibold" style={{ color: stanceColor }}>
              {response.stance}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
