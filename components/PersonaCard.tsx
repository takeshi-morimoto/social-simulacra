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

const STANCE_BADGE: Record<string, { emoji: string; bg: string; border: string; text: string }> = {
  "強く賛成": { emoji: "💪", bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800" },
  "賛成": { emoji: "👍", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  "条件付き賛成": { emoji: "🤔", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  "中立": { emoji: "😐", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" },
  "反対": { emoji: "👎", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  "強く反対": { emoji: "🚫", bg: "bg-red-100", border: "border-red-400", text: "text-red-900" },
};

export default function PersonaCard({ persona, response, isLoading }: Props) {
  const stanceColor =
    response?.stance === "強く賛成" ? "#1A6B50"
    : response?.stance === "賛成" ? "#2B8A6E"
    : response?.stance === "条件付き賛成" ? "#D4850A"
    : response?.stance === "反対" ? "#C0392B"
    : response?.stance === "強く反対" ? "#8B1A1A"
    : "#6B7280";

  const badge = response ? STANCE_BADGE[response.stance] ?? STANCE_BADGE["中立"] : null;

  const borderStyle = response
    ? { borderColor: stanceColor, borderWidth: "2px" }
    : {};

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm min-h-[160px] transition-all${response ? " animate-fade-in" : ""}`}
      style={borderStyle}
    >
      <div className="flex items-start justify-between">
        <CardHeader persona={persona} />
        {badge && (
          <div className={`shrink-0 flex items-center gap-1 rounded-full ${badge.bg} ${badge.border} border px-2.5 py-1`}>
            <span className="text-sm">{badge.emoji}</span>
            <span className={`text-[11px] font-bold ${badge.text}`}>{response!.stance}</span>
          </div>
        )}
      </div>

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
        <div className="space-y-1.5">
          <div className="text-xs text-gray-600 leading-5">{persona.detail}</div>
          <div className="flex flex-wrap gap-1">
            <span className="rounded bg-purple-50 border border-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">{persona.personality}</span>
            <span className="rounded bg-teal-50 border border-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">{persona.concern}</span>
          </div>
        </div>
      )}

      {!isLoading && response && (
        <>
          <div
            className="rounded-md bg-gray-50 p-3 text-[13px] leading-6 text-gray-700"
            style={{ borderLeft: `3px solid ${stanceColor}` }}
          >
            {response.opinion}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {response.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${stanceColor}15`,
                  color: stanceColor,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
