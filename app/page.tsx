"use client";

import { useState, useCallback } from "react";
import type { Persona, PersonaResponse, AnalysisResponse, StanceCounts, Stance } from "@/lib/types";
import MunicipalityInput from "@/components/MunicipalityInput";
import PolicyInput from "@/components/PolicyInput";
import StanceBar from "@/components/StanceBar";
import PersonaCard from "@/components/PersonaCard";
import AnalysisReport from "@/components/AnalysisReport";

const INITIAL_COUNTS: StanceCounts = { "賛成": 0, "条件付き賛成": 0, "反対": 0, "中立": 0 };

export default function Home() {
  const [municipality, setMunicipality] = useState("");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [policy, setPolicy] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [personaResults, setPersonaResults] = useState<Record<number, PersonaResponse | null>>({});
  const [loadingPersonas, setLoadingPersonas] = useState<Set<number>>(new Set());
  const [stanceCounts, setStanceCounts] = useState<StanceCounts>({ ...INITIAL_COUNTS });
  const [showStanceBar, setShowStanceBar] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const generatePersonas = useCallback(async () => {
    const muni = municipality.trim();
    if (!muni) return;

    setIsGeneratingPersonas(true);
    setPersonas([]);
    setPersonaResults({});
    setStanceCounts({ ...INITIAL_COUNTS });
    setShowStanceBar(false);
    setAnalysis(null);
    setShowAnalysis(false);

    try {
      const res = await fetch("/api/generate-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality: muni }),
      });
      if (res.ok) {
        const data: Persona[] = await res.json();
        setPersonas(data);
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
    if (!personas.length) { alert("先に自治体を選択してペルソナを生成してください"); return; }

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
        const r = data[String(persona.id)];
        if (r) {
          results[persona.id] = r;
          setPersonaResults((prev) => ({ ...prev, [persona.id]: r }));
          setStanceCounts((prev) => ({
            ...prev,
            [r.stance]: prev[r.stance as Stance] + 1,
          }));
        }
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

  return (
    <div className="mx-auto max-w-[960px] px-5 py-8">
      {/* Header */}
      <header className="mb-8 border-b border-gray-200 pb-6">
        <div className="block w-full border-2 border-gray-900 rounded-sm relative px-8 py-5">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-[0.12em] text-black" style={{ fontFamily: "'Noto Serif JP', serif" }}>政策市民シミュレーター</span>
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

      {personas.length > 0 && (
        <>
          <div className="mb-4 text-xs text-gray-500">
            {municipality} の市民ペルソナ（{personas.length}人）が生成されました
          </div>

          <PolicyInput policy={policy} onPolicyChange={setPolicy} onRun={runSimulation} isRunning={isRunning} />
          <StanceBar counts={stanceCounts} visible={showStanceBar} />

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

          <AnalysisReport analysis={analysis} isLoading={analysisLoading} visible={showAnalysis} />
        </>
      )}

      <footer className="mt-10 text-center text-xs text-gray-400">
        Produced by KOIKOI, Inc.
      </footer>
    </div>
  );
}
