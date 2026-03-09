"use client";

import { useState, useCallback } from "react";
import type { Persona, PersonaResponse, AnalysisResponse, StanceCounts, Stance, PolicyProposal, DemographicProfile } from "@/lib/types";
import MunicipalityInput from "@/components/MunicipalityInput";
import DemographicsPanel from "@/components/DemographicsPanel";
import PersonaList from "@/components/PersonaList";
import ListenMode from "@/components/ListenMode";
import ProposeMode from "@/components/ProposeMode";
import LoadingOverlay from "@/components/LoadingOverlay";

type Mode = "listen" | "propose";

const INITIAL_COUNTS: StanceCounts = { "強く賛成": 0, "賛成": 0, "条件付き賛成": 0, "中立": 0, "反対": 0, "強く反対": 0 };

export default function Home() {
  const [municipality, setMunicipality] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [demographics, setDemographics] = useState<DemographicProfile | null>(null);
  const [mode, setMode] = useState<Mode>("listen");

  // Listen mode state
  const [policy, setPolicy] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [personaResults, setPersonaResults] = useState<Record<number, PersonaResponse | null>>({});
  const [loadingPersonas, setLoadingPersonas] = useState<Set<number>>(new Set());
  const [stanceCounts, setStanceCounts] = useState<StanceCounts>({ ...INITIAL_COUNTS });
  const [showStanceBar, setShowStanceBar] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Propose mode state
  const [isProposing, setIsProposing] = useState(false);
  const [proposals, setProposals] = useState<Record<number, PolicyProposal | null>>({});
  const [hasProposed, setHasProposed] = useState(false);

  const generatePersonas = useCallback(async () => {
    const muni = municipality.trim();
    if (!muni) return;

    setIsGeneratingPersonas(true);
    setPersonas([]);
    setDemographics(null);
    setPersonaResults({});
    setStanceCounts({ ...INITIAL_COUNTS });
    setShowStanceBar(false);
    setAnalysis(null);
    setShowAnalysis(false);
    setProposals({});
    setHasProposed(false);

    try {
      const res = await fetch("/api/generate-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality: muni }),
      });
      if (res.ok) {
        const data = await res.json();
        setPersonas(data.personas);
        setDemographics(data.demographics);
      } else {
        alert("ペルソナの生成に失敗しました");
      }
    } catch {
      alert("ペルソナの生成に失敗しました");
    }

    setIsGeneratingPersonas(false);
  }, [municipality]);

  const runSimulation = useCallback(async () => {
    const pol = policy.trim();
    if (!pol) { alert("政策を入力してください"); return; }
    if (!personas.length) return;

    setIsRunning(true);
    setPersonaResults({});
    setStanceCounts({ ...INITIAL_COUNTS });
    setShowStanceBar(false);
    setAnalysis(null);
    setShowAnalysis(false);
    setLoadingPersonas(new Set(personas.map((p) => p.id)));

    const results: Record<number, PersonaResponse> = {};

    try {
      const res = await fetch("/api/personas-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy: pol, personas }),
      });
      const data: Record<string, PersonaResponse> = await res.json();

      for (const persona of personas) {
        const r = data[String(persona.id)] ?? {
          opinion: "（回答を取得できませんでした）",
          stance: "中立" as Stance,
          tags: ["未回答"],
        };
        results[persona.id] = r;
        setPersonaResults((prev) => ({ ...prev, [persona.id]: r }));
        setStanceCounts((prev) => ({
          ...prev,
          [r.stance]: prev[r.stance as Stance] + 1,
        }));
      }
    } catch {
      for (const persona of personas) {
        const fallback: PersonaResponse = {
          opinion: "（通信エラーのため回答を取得できませんでした）",
          stance: "中立",
          tags: ["エラー"],
        };
        results[persona.id] = fallback;
        setPersonaResults((prev) => ({ ...prev, [persona.id]: fallback }));
      }
    }

    setLoadingPersonas(new Set());
    setShowStanceBar(true);
    setShowAnalysis(true);
    setAnalysisLoading(true);

    const responseSummary = personas.map((p) => {
      const r = results[p.id];
      return `${p.name}(${p.role}): ${r?.stance} - ${r?.opinion}`;
    }).join("\n");

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy: pol, responseSummary }),
      });
      if (res.ok) {
        setAnalysis(await res.json());
      }
    } catch {
      // Analysis failed silently
    }

    setAnalysisLoading(false);
    setIsRunning(false);
  }, [policy, personas]);

  const runProposals = useCallback(async () => {
    if (!personas.length) return;

    setIsProposing(true);
    setProposals({});

    try {
      const res = await fetch("/api/propose-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personas, municipality }),
      });
      if (res.ok) {
        const data: Record<string, PolicyProposal> = await res.json();
        const mapped: Record<number, PolicyProposal> = {};
        for (const persona of personas) {
          const p = data[String(persona.id)];
          if (p) mapped[persona.id] = p;
        }
        setProposals(mapped);
        setHasProposed(true);
      }
    } catch {
      alert("政策立案に失敗しました");
    }

    setIsProposing(false);
  }, [personas, municipality]);

  return (
    <div className="mx-auto max-w-[960px] px-5 py-8">
      <header className="mb-8 border-b border-gray-200 pb-6">
        <div className="inline-block w-full border-2 border-gray-900 rounded-sm relative px-8 py-5">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-[0.12em] text-black" style={{ fontFamily: "'Noto Serif JP', serif" }}>AI市長</span>
            <span className="text-xs tracking-[0.2em] text-gray-500 border-l border-gray-300 pl-5">SOCIAL SIMULACRA</span>
          </div>
          <div className="absolute inset-[3px] border border-gray-400 rounded-sm pointer-events-none" />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          自治体を選び、政策を入力すると、AIが生成した市民ペルソナが反応します
        </p>
      </header>

      <MunicipalityInput
        value={municipality}
        onChange={setMunicipality}
        isGenerating={isGeneratingPersonas}
        onGenerate={generatePersonas}
        hasPersonas={personas.length > 0}
      />

      {isGeneratingPersonas && (
        <LoadingOverlay message="ペルソナを生成しています..." estimateSeconds={25} />
      )}

      {personas.length > 0 && !isGeneratingPersonas && (
        <>
          {demographics && (
            <DemographicsPanel demographics={demographics} municipality={municipality} />
          )}

          <PersonaList personas={personas} />

          {/* Mode Tabs */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              onClick={() => setMode("listen")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                mode === "listen"
                  ? "border-[#1A73B5] text-[#1A73B5]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              政策を聴く
            </button>
            <button
              onClick={() => setMode("propose")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                mode === "propose"
                  ? "border-[#1A73B5] text-[#1A73B5]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              政策を立案する
            </button>
          </div>

          {mode === "listen" && (
            <ListenMode
              municipality={municipality}
              policy={policy}
              onPolicyChange={setPolicy}
              onRun={runSimulation}
              isRunning={isRunning}
              personas={personas}
              personaResults={personaResults}
              loadingPersonas={loadingPersonas}
              stanceCounts={stanceCounts}
              showStanceBar={showStanceBar}
              analysis={analysis}
              analysisLoading={analysisLoading}
              showAnalysis={showAnalysis}
            />
          )}

          {mode === "propose" && (
            <ProposeMode
              municipality={municipality}
              personas={personas}
              proposals={proposals}
              isProposing={isProposing}
              hasProposed={hasProposed}
              onRunProposals={runProposals}
            />
          )}
        </>
      )}

      <footer className="mt-10 text-center text-xs text-gray-400">
        Produced by KOIKOI, Inc.
      </footer>
    </div>
  );
}
