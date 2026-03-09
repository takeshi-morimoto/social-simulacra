"use client";

import type { Persona, PolicyProposal } from "@/lib/types";

interface Props {
  persona: Persona;
  proposal: PolicyProposal | null;
  isLoading: boolean;
}

export default function ProposalCard({ persona, proposal, isLoading }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm min-h-[160px]">
      {/* Header */}
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

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          <span>政策を考え中...</span>
        </div>
      )}

      {!isLoading && !proposal && (
        <div className="space-y-1.5">
          <div className="text-xs text-gray-600 leading-5">{persona.detail}</div>
          <div className="flex flex-wrap gap-1">
            <span className="rounded bg-purple-50 border border-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">{persona.personality}</span>
            <span className="rounded bg-teal-50 border border-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">{persona.concern}</span>
          </div>
        </div>
      )}

      {!isLoading && proposal && (
        <div className="animate-fade-in">
          <div
            className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 mb-2"
            style={{ background: `${persona.color}15`, borderLeft: `3px solid ${persona.color}` }}
          >
            {proposal.title}
          </div>
          <div className="text-[13px] leading-6 text-gray-700 mb-2">
            {proposal.description}
          </div>
          <div className="text-[11px] text-gray-500 italic">
            「{proposal.reason}」
          </div>
        </div>
      )}
    </div>
  );
}
