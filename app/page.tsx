"use client";

import { useState, useCallback } from "react";
import { PERSONAS } from "@/lib/constants";
import type { PersonaResponse, AnalysisResponse, StanceCounts, Stance } from "@/lib/types";
import PolicyInput from "@/components/PolicyInput";
import StanceBar from "@/components/StanceBar";
import PersonaCard from "@/components/PersonaCard";
import AnalysisReport from "@/components/AnalysisReport";

const INITIAL_COUNTS: StanceCounts = { "賛成": 0, "条件付き賛成": 0, "反対": 0, "中立": 0 };

export default function Home() {
  const [policy, setPolicy] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [personaResults, setPersonaResults] = useState<Record<number, PersonaResponse | null>>({});
  const [loadingPersonas, setLoadingPersonas] = useState<Set<number>>(new Set());
  const [stanceCounts, setStanceCounts] = useState<StanceCounts>({ ...INITIAL_COUNTS });
  const [showStanceBar, setShowStanceBar] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const runSimulation = useCallback(async () => {
    const pol = policy.trim();
    if (!pol) { alert("政策を入力してください"); return; }

    // Reset
    setIsRunning(true);
    setPersonaResults({});
    setStanceCounts({ ...INITIAL_COUNTS });
    setShowStanceBar(false);
    setAnalysis(null);
    setShowAnalysis(false);
    setLoadingPersonas(new Set(PERSONAS.map((p) => p.id)));

    // Fetch all personas in parallel
    const results: Record<number, PersonaResponse> = {};

    await Promise.all(
      PERSONAS.map(async (persona) => {
        try {
          const res = await fetch("/api/persona", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ persona, policy: pol }),
          });
          const data: PersonaResponse = await res.json();
          results[persona.id] = data;

          setPersonaResults((prev) => ({ ...prev, [persona.id]: data }));
          setLoadingPersonas((prev) => {
            const next = new Set(prev);
            next.delete(persona.id);
            return next;
          });
          setStanceCounts((prev) => ({
            ...prev,
            [data.stance]: prev[data.stance as Stance] + 1,
          }));
          setShowStanceBar(true);
        } catch {
          const fallback: PersonaResponse = {
            opinion: "（通信エラーのため回答を取得できませんでした）",
            stance: "中立",
            tags: ["エラー"],
          };
          results[persona.id] = fallback;
          setPersonaResults((prev) => ({ ...prev, [persona.id]: fallback }));
          setLoadingPersonas((prev) => {
            const next = new Set(prev);
            next.delete(persona.id);
            return next;
          });
        }
      }),
    );

    // Fetch summary
    setShowAnalysis(true);
    setAnalysisLoading(true);

    const responseSummary = PERSONAS.map((p) => {
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
  }, [policy]);

  return (
    <div className="mx-auto max-w-[960px]">
      {/* Header */}
      <div className="mb-10 text-center">
        <span className="mb-4 inline-block rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 px-4 py-1.5 text-[11px] font-bold tracking-widest">
          SOCIAL SIMULACRA × 行政DX
        </span>
        <h1 className="mb-3 text-[clamp(24px,4vw,38px)] font-black tracking-tight">
          市民シミュレーター
        </h1>
        <p className="text-sm text-gray-400">
          政策を入力すると、6種類の市民ペルソナがAIとして反応します
        </p>
      </div>

      <PolicyInput policy={policy} onPolicyChange={setPolicy} onRun={runSimulation} isRunning={isRunning} />
      <StanceBar counts={stanceCounts} visible={showStanceBar} />

      {/* Persona Grid */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            response={personaResults[persona.id] ?? null}
            isLoading={loadingPersonas.has(persona.id)}
          />
        ))}
      </div>

      <AnalysisReport analysis={analysis} isLoading={analysisLoading} visible={showAnalysis} />

      <div className="mt-8 text-center text-[11px] text-gray-600">
        Social Simulacra × 行政DX デモ — Powered by Claude API
      </div>
    </div>
  );
}
