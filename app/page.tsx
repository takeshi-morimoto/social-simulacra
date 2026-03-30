"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import type {
  VoterPersona, PersonaResponse, ElectionAnalysisResponse,
  StanceCounts, Stance, ElectionDemographicProfile,
  CandidateProfile, AgeGroupFilter,
} from "@/lib/types";
import MunicipalityInput from "@/components/MunicipalityInput";
import AuthButton from "@/components/AuthButton";
import DemographicsPanel from "@/components/DemographicsPanel";
import PersonaList from "@/components/PersonaList";
import ListenMode from "@/components/ListenMode";
import LoadingOverlay from "@/components/LoadingOverlay";
import ElectionMap from "@/components/ElectionMap";

const INITIAL_COUNTS: StanceCounts = { "強く賛成": 0, "賛成": 0, "条件付き賛成": 0, "中立": 0, "反対": 0, "強く反対": 0 };
const INITIAL_CANDIDATE: CandidateProfile = { name: "", party: "", district: "", platform: "" };

export default function Home() {
  const [municipality, setMunicipality] = useState("");
  const [personas, setPersonas] = useState<VoterPersona[]>([]);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [demographics, setDemographics] = useState<ElectionDemographicProfile | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>({ ...INITIAL_CANDIDATE });
  const [customData, setCustomData] = useState("");
  const [ageFilter, setAgeFilter] = useState<AgeGroupFilter>("all");
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("profileBannerDismissed") === "true";
    return false;
  });

  const { data: session } = useSession();

  // Load saved candidate profile on login
  useEffect(() => {
    if (session?.user) {
      fetch("/api/candidate-profile")
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            setCandidateProfile({ name: data.name, party: data.party, district: data.district, platform: data.platform });
            if (data.customData) setCustomData(data.customData);
          }
        });
    }
  }, [session]);

  // Listen mode state
  const [policy, setPolicy] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [personaResults, setPersonaResults] = useState<Record<number, PersonaResponse | null>>({});
  const [loadingPersonas, setLoadingPersonas] = useState<Set<number>>(new Set());
  const [stanceCounts, setStanceCounts] = useState<StanceCounts>({ ...INITIAL_COUNTS });
  const [showStanceBar, setShowStanceBar] = useState(false);
  const [analysis, setAnalysis] = useState<ElectionAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

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
    setAgeFilter("all");

    try {
      const res = await fetch("/api/generate-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality: muni, candidateProfile }),
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
  }, [municipality, candidateProfile]);

  const runSimulation = useCallback(async () => {
    const pol = policy.trim();
    if (!pol) { alert("公約・政策を入力してください"); return; }
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
        body: JSON.stringify({
          policy: pol,
          personas,
          candidateProfile,
          customData: customData.trim() ? { text: customData.trim() } : undefined,
        }),
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
      return `${p.name}(${p.role}, ${p.gender}, ${p.ageGroup}): ${r?.stance} - ${r?.opinion}`;
    }).join("\n");

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: pol,
          responseSummary,
          personas,
          personaResults: results,
        }),
      });
      if (res.ok) {
        setAnalysis(await res.json());
      }
    } catch {
      // Analysis failed silently
    }

    setAnalysisLoading(false);
    setIsRunning(false);
  }, [policy, personas, candidateProfile, customData]);

  return (
    <div className="mx-auto max-w-[960px] px-5 py-8">
      <header className="mb-8 border-b border-gray-200 pb-6">
        <div className="inline-block w-full border-2 border-[#1B2A4A] rounded-sm relative px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-5">
              <span className="text-3xl font-black tracking-[0.12em] text-[#1B2A4A]" style={{ fontFamily: "'Noto Serif JP', serif" }}>参謀AI</span>
              <span className="text-xs tracking-[0.2em] text-gray-500 border-l border-gray-300 pl-5">SANBO AI</span>
            </div>
            <AuthButton />
          </div>
          <div className="absolute inset-[3px] border border-[#C4A000] rounded-sm pointer-events-none" />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          選挙区を選び、公約を入力すると、AIが生成した有権者ペルソナが反応します
        </p>
      </header>

      {session && !candidateProfile.name && !candidateProfile.platform && !profileBannerDismissed && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex-1 text-sm text-amber-800">
            候補者プロフィールを登録すると、より精度の高いシミュレーションが可能になります。
            <a href="/mypage" className="ml-1 font-semibold text-[#1B2A4A] underline hover:no-underline">
              マイページで登録する
            </a>
          </p>
          <button
            onClick={() => {
              setProfileBannerDismissed(true);
              localStorage.setItem("profileBannerDismissed", "true");
            }}
            className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}

      <MunicipalityInput
        value={municipality}
        onChange={setMunicipality}
        isGenerating={isGeneratingPersonas}
        onGenerate={generatePersonas}
        hasPersonas={personas.length > 0}
      />

      {isGeneratingPersonas && (
        <LoadingOverlay message="有権者ペルソナを生成しています..." estimateSeconds={25} />
      )}

      {personas.length > 0 && !isGeneratingPersonas && (
        <>
          {demographics && (
            <DemographicsPanel demographics={demographics} municipality={municipality} />
          )}

          <ElectionMap municipality={municipality} />

          <PersonaList personas={personas} />

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
            candidateProfile={candidateProfile}
            ageFilter={ageFilter}
            onAgeFilterChange={setAgeFilter}
          />
        </>
      )}

      <footer className="mt-10 text-center text-xs text-gray-400">
        Produced by KOIKOI, Inc.
      </footer>
    </div>
  );
}
