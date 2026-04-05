"use client";

import { useRef, useMemo } from "react";
import type { VoterPersona, PersonaResponse, ElectionAnalysisResponse, ElectionDemographicProfile, StanceCounts, AgeGroupFilter, CandidateProfile } from "@/lib/types";
import PolicyInput from "@/components/PolicyInput";
import AgeFilter from "@/components/AgeFilter";
import PersonaCard from "@/components/PersonaCard";
import AnalysisReport from "@/components/AnalysisReport";
import LoadingOverlay from "@/components/LoadingOverlay";
import ShareCard from "@/components/ShareCard";
import ShareButtons from "@/components/ShareButtons";

interface Props {
  municipality: string;
  policy: string;
  onPolicyChange: (v: string) => void;
  onRun: () => void;
  isRunning: boolean;
  personas: VoterPersona[];
  personaResults: Record<number, PersonaResponse | null>;
  loadingPersonas: Set<number>;
  stanceCounts: StanceCounts;
  showStanceBar: boolean;
  analysis: ElectionAnalysisResponse | null;
  analysisLoading: boolean;
  showAnalysis: boolean;
  candidateProfile: CandidateProfile;
  demographics?: ElectionDemographicProfile | null;
  ageFilter: AgeGroupFilter;
  onAgeFilterChange: (v: AgeGroupFilter) => void;
}

const INITIAL_COUNTS: StanceCounts = { "強く賛成": 0, "賛成": 0, "条件付き賛成": 0, "中立": 0, "反対": 0, "強く反対": 0 };

export default function ListenMode({
  municipality, policy, onPolicyChange, onRun, isRunning,
  personas, personaResults, loadingPersonas,
  stanceCounts, showStanceBar,
  analysis, analysisLoading, showAnalysis,
  demographics,
  ageFilter, onAgeFilterChange,
}: Props) {
  const shareCardRef = useRef<HTMLDivElement>(null);

  const displayRate = analysis?.weighted_approval_rate ?? analysis?.approval_rate ?? 0;
  const shareText = `【${municipality}】「${policy}」\n${analysis?.share_comment ?? ""}\n加重支持率: ${displayRate}%\n#参謀AI #SanboAI`;

  // Client-side age filtering
  const filteredPersonas = useMemo(() => {
    if (ageFilter === "all") return personas;
    return personas.filter((p) => p.ageGroup === ageFilter);
  }, [personas, ageFilter]);

  const filteredStanceCounts = useMemo(() => {
    if (ageFilter === "all") return stanceCounts;
    const counts = { ...INITIAL_COUNTS };
    for (const p of filteredPersonas) {
      const r = personaResults[p.id];
      if (r) {
        counts[r.stance] = (counts[r.stance] || 0) + 1;
      }
    }
    return counts;
  }, [ageFilter, filteredPersonas, personaResults, stanceCounts]);

  return (
    <>
      <PolicyInput policy={policy} onPolicyChange={onPolicyChange} onRun={onRun} isRunning={isRunning} />

      {isRunning && !showStanceBar && (
        <LoadingOverlay message="有権者の反応をシミュレーション中..." estimateSeconds={10} />
      )}

      {(showStanceBar || loadingPersonas.size > 0) && (
        <>
          <AgeFilter value={ageFilter} onChange={onAgeFilterChange} />

          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPersonas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                response={personaResults[persona.id] ?? null}
                isLoading={loadingPersonas.has(persona.id)}
              />
            ))}
          </div>
        </>
      )}

      {analysisLoading && (
        <LoadingOverlay message="選挙戦略レポートを生成中..." estimateSeconds={8} />
      )}

      <AnalysisReport analysis={analysis} demographics={demographics} municipality={municipality} isLoading={false} visible={showAnalysis && !analysisLoading} />

      {/* コンパクトなシェアボタン（フルサイズカードは一番下に移動） */}
      {showAnalysis && !analysisLoading && analysis && (
        <div className="mb-6 text-center">
          <button
            onClick={() => {
              const text = shareText;
              if (navigator.share) {
                navigator.share({ text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text).then(() => alert("シェアテキストをコピーしました"));
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#1B2A4A] text-[#1B2A4A] text-sm font-medium hover:bg-[#1B2A4A] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            結果をシェア
          </button>
        </div>
      )}
    </>
  );
}
