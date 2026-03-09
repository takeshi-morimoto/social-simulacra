"use client";

import type { Persona, PersonaResponse } from "@/lib/types";

interface Props {
  personas: Persona[];
  results: Record<number, PersonaResponse | null>;
  visible: boolean;
}

const PRO_STANCES = new Set(["強く賛成", "賛成", "条件付き賛成"]);
const CON_STANCES = new Set(["反対", "強く反対"]);

export default function OpinionSummary({ personas, results, visible }: Props) {
  if (!visible) return null;

  const proOpinions = personas
    .filter((p) => results[p.id] && PRO_STANCES.has(results[p.id]!.stance))
    .map((p) => ({ persona: p, response: results[p.id]! }));

  const conOpinions = personas
    .filter((p) => results[p.id] && CON_STANCES.has(results[p.id]!.stance))
    .map((p) => ({ persona: p, response: results[p.id]! }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
      {/* Pro summary */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">👍</span>
          <span className="text-sm font-bold text-green-800">賛成意見まとめ（{proOpinions.length}人）</span>
        </div>
        {proOpinions.length === 0 ? (
          <div className="text-xs text-green-600 italic">賛成意見はありません</div>
        ) : (
          <div className="space-y-2">
            {proOpinions.map(({ persona, response }) => (
              <div key={persona.id} className="flex gap-2">
                <span className="text-sm shrink-0">{persona.icon}</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-green-900">{persona.name}</span>
                  <span className="text-[10px] text-green-600 ml-1">({response.stance})</span>
                  <div className="text-xs text-green-800 leading-5 mt-0.5">{response.opinion}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Con summary */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">👎</span>
          <span className="text-sm font-bold text-red-800">反対意見まとめ（{conOpinions.length}人）</span>
        </div>
        {conOpinions.length === 0 ? (
          <div className="text-xs text-red-600 italic">反対意見はありません</div>
        ) : (
          <div className="space-y-2">
            {conOpinions.map(({ persona, response }) => (
              <div key={persona.id} className="flex gap-2">
                <span className="text-sm shrink-0">{persona.icon}</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-red-900">{persona.name}</span>
                  <span className="text-[10px] text-red-600 ml-1">({response.stance})</span>
                  <div className="text-xs text-red-800 leading-5 mt-0.5">{response.opinion}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
