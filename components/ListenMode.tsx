"use client";

import { useRef } from "react";
import type { Persona, PersonaResponse, AnalysisResponse, StanceCounts } from "@/lib/types";
import PolicyInput from "@/components/PolicyInput";
import PolicyBadge from "@/components/PolicyBadge";
import PersonaCard from "@/components/PersonaCard";
import AnalysisReport from "@/components/AnalysisReport";
import LoadingOverlay from "@/components/LoadingOverlay";
import ShareButtons from "@/components/ShareButtons";

interface Props {
  municipality: string;
  policy: string;
  onPolicyChange: (v: string) => void;
  onRun: () => void;
  isRunning: boolean;
  personas: Persona[];
  personaResults: Record<number, PersonaResponse | null>;
  loadingPersonas: Set<number>;
  stanceCounts: StanceCounts;
  showStanceBar: boolean;
  analysis: AnalysisResponse | null;
  analysisLoading: boolean;
  showAnalysis: boolean;
}

export default function ListenMode({
  municipality, policy, onPolicyChange, onRun, isRunning,
  personas, personaResults, loadingPersonas,
  stanceCounts, showStanceBar,
  analysis, analysisLoading, showAnalysis,
}: Props) {
  const resultsRef = useRef<HTMLDivElement>(null);

  const shareText = `【${municipality}】「${policy}」を市民シミュレーション\n💪強く賛成${stanceCounts["強く賛成"]} 👍賛成${stanceCounts["賛成"]} 🤔条件付き${stanceCounts["条件付き賛成"]} 😐中立${stanceCounts["中立"]} 👎反対${stanceCounts["反対"]} 🚫強く反対${stanceCounts["強く反対"]}\n${analysis ? `支持率: ${analysis.approval_rate}% ${analysis.approval_rate >= 80 ? "🏆" : analysis.approval_rate >= 60 ? "🥈" : analysis.approval_rate >= 40 ? "⚖️" : "⚠️"}` : ""}\n#AI市長 #AI市長`;

  return (
    <>
      <PolicyInput policy={policy} onPolicyChange={onPolicyChange} onRun={onRun} isRunning={isRunning} />

      {isRunning && !showStanceBar && (
        <LoadingOverlay message="市民の反応をシミュレーション中..." estimateSeconds={15} />
      )}

      <div ref={resultsRef}>
        {showStanceBar && (
          <div className="rounded-xl border-2 border-gray-900 bg-gradient-to-br from-gray-50 to-slate-100 p-6 mb-4 shadow-sm relative overflow-hidden">
            <div className="absolute inset-[4px] border border-gray-400 rounded-lg pointer-events-none" />
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xl font-black tracking-[0.1em] text-black" style={{ fontFamily: "'Noto Serif JP', serif" }}>AI市長</span>
              <span className="text-[10px] tracking-[0.15em] text-gray-400 border-l border-gray-300 pl-3">SOCIAL SIMULACRA</span>
            </div>
            <div className="text-[11px] text-gray-400 mb-1">{municipality}</div>
            <div className="text-sm font-semibold text-gray-900 leading-6">「{policy}」</div>
          </div>
        )}
        <PolicyBadge
          counts={stanceCounts}
          approvalRate={analysis?.approval_rate}
          visible={showStanceBar}
        />

        {(showStanceBar || loadingPersonas.size > 0) && (
          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                response={personaResults[persona.id] ?? null}
                isLoading={loadingPersonas.has(persona.id)}
              />
            ))}
          </div>
        )}

        {analysisLoading && (
          <LoadingOverlay message="アナリシスレポートを生成中..." estimateSeconds={8} />
        )}

        <AnalysisReport analysis={analysis} isLoading={false} visible={showAnalysis && !analysisLoading} />
      </div>

      {showAnalysis && !analysisLoading && analysis && (
        <ShareButtons captureRef={resultsRef} shareText={shareText} />
      )}
    </>
  );
}
