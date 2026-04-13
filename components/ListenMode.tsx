"use client";

import { useMemo } from "react";
import type { VoterPersona, PersonaResponse, ElectionAnalysisResponse, ElectionDemographicProfile, StanceCounts, AgeGroupFilter, CandidateProfile } from "@/lib/types";
import PolicyInput from "@/components/PolicyInput";
import AgeFilter from "@/components/AgeFilter";
import PersonaCard from "@/components/PersonaCard";
import AnalysisReport from "@/components/AnalysisReport";
import LoadingOverlay from "@/components/LoadingOverlay";

interface Props {
  municipality: string;
  policy: string;
  onPolicyChange: (v: string) => void;
  onRun: () => void;
  isRunning: boolean;
  personas: VoterPersona[];
  personaResults: Record<number, PersonaResponse | null>;
  loadingPersonas: Set<number>;
  showStanceBar: boolean;
  analysis: ElectionAnalysisResponse | null;
  analysisLoading: boolean;
  showAnalysis: boolean;
  candidateProfile: CandidateProfile;
  demographics?: ElectionDemographicProfile | null;
  ageFilter: AgeGroupFilter;
  onAgeFilterChange: (v: AgeGroupFilter) => void;
}

export default function ListenMode({
  municipality, policy, onPolicyChange, onRun, isRunning,
  personas, personaResults, loadingPersonas,
  showStanceBar,
  analysis, analysisLoading, showAnalysis,
  demographics,
  ageFilter, onAgeFilterChange,
}: Props) {
  // Client-side age filtering
  const filteredPersonas = useMemo(() => {
    if (ageFilter === "all") return personas;
    return personas.filter((p) => p.ageGroup === ageFilter);
  }, [personas, ageFilter]);

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

      <AnalysisReport
        analysis={analysis}
        demographics={demographics}
        municipality={municipality}
        sampleSize={personas.length}
        isLoading={false}
        visible={showAnalysis && !analysisLoading}
      />
    </>
  );
}
