"use client";

import { useRef } from "react";
import type { Persona, PolicyProposal } from "@/lib/types";
import ProposalCard from "@/components/ProposalCard";
import LoadingOverlay from "@/components/LoadingOverlay";
import ShareButtons from "@/components/ShareButtons";

interface Props {
  municipality: string;
  personas: Persona[];
  proposals: Record<number, PolicyProposal | null>;
  isProposing: boolean;
  hasProposed: boolean;
  onRunProposals: () => void;
}

export default function ProposeMode({
  municipality, personas, proposals,
  isProposing, hasProposed, onRunProposals,
}: Props) {
  const resultsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-gray-800">
          {municipality}の市民ペルソナが自ら政策を提案します
        </div>
        <p className="text-xs text-gray-500 mb-4">
          各ペルソナが自分の立場・生活状況から、この自治体に必要だと思う政策を1つ提案します。
        </p>
        <button
          onClick={onRunProposals}
          disabled={isProposing}
          className="w-full rounded-md bg-[#1A73B5] py-2.5 text-sm font-semibold text-white transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-[#155A8A] cursor-pointer border-none"
        >
          {isProposing ? "立案中..." : hasProposed ? "もう一度立案する" : "政策を立案する"}
        </button>
      </div>

      {isProposing && (
        <LoadingOverlay message="市民ペルソナが政策を考えています..." estimateSeconds={15} />
      )}

      {hasProposed && !isProposing && (
        <>
          <div ref={resultsRef}>
            <div className="rounded-xl border-2 border-gray-900 bg-gradient-to-br from-gray-50 to-slate-100 p-6 mb-4 shadow-sm relative overflow-hidden">
              <div className="absolute inset-[4px] border border-gray-400 rounded-lg pointer-events-none" />
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-xl font-black tracking-[0.1em] text-black" style={{ fontFamily: "'Noto Serif JP', serif" }}>政策市民シミュレーター</span>
                <span className="text-[10px] tracking-[0.15em] text-gray-400 border-l border-gray-300 pl-3">SOCIAL SIMULACRA</span>
              </div>
              <div className="text-[11px] text-gray-400 mb-1">{municipality}</div>
              <div className="text-sm font-semibold text-gray-900 leading-6">市民ペルソナによる政策立案</div>
            </div>
          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <ProposalCard
                key={persona.id}
                persona={persona}
                proposal={proposals[persona.id] ?? null}
                isLoading={false}
              />
            ))}
          </div>
          </div>
          <ShareButtons
            captureRef={resultsRef}
            shareText={`【${municipality}】市民ペルソナが自ら政策を立案しました\n#政策市民シミュレーター #SocialSimulacra`}
          />
        </>
      )}
    </>
  );
}
