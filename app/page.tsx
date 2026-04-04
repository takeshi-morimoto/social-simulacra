"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type {
  VoterPersona, PersonaResponse, ElectionAnalysisResponse,
  StanceCounts, Stance, ElectionDemographicProfile,
  CandidateProfile, AgeGroupFilter,
  CampaignSpot, CampaignDay, RouteStop, TimeSlot,
} from "@/lib/types";

import MunicipalityInput from "@/components/MunicipalityInput";
import AuthButton from "@/components/AuthButton";
import DemographicsPanel from "@/components/DemographicsPanel";
import PersonaList from "@/components/PersonaList";
import ListenMode from "@/components/ListenMode";
import LoadingOverlay from "@/components/LoadingOverlay";
import ElectionMap from "@/components/ElectionMap";
import CampaignRouteMap from "@/components/CampaignRouteMap";
import TimeSlider from "@/components/TimeSlider";
import SpotList from "@/components/SpotList";
import DayPlannerBoard from "@/components/DayPlannerBoard";
import { scoreSpots } from "@/lib/scoring";
import { optimizeRoute, generateMultiDayPlan, fetchOsrmRoute } from "@/lib/route-optimizer";
import { cacheGet, cacheSet, policyKey } from "@/lib/cache";

const INITIAL_COUNTS: StanceCounts = { "強く賛成": 0, "賛成": 0, "条件付き賛成": 0, "中立": 0, "反対": 0, "強く反対": 0 };
const INITIAL_CANDIDATE: CandidateProfile = { name: "", party: "", district: "", platform: "" };

// --- セクション折りたたみ ---
function Section({ title, step, done, open, onToggle, children }: {
  title: string; step: number; done: boolean; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 hover:bg-gray-50 transition-colors text-left">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          done ? "bg-[#1B2A4A] text-white" : "bg-gray-200 text-gray-500"
        }`}>
          {done ? "✓" : step}
        </div>
        <span className={`text-sm font-semibold flex-1 ${done ? "text-[#1B2A4A]" : "text-gray-800"}`}>{title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-3 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();

  // --- セクション開閉 ---
  const [openSections, setOpenSections] = useState({ analysis: true, policy: false, route: false });
  const toggleSection = useCallback((key: "analysis" | "policy" | "route") => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // --- 共通: 選挙区 ---
  const [municipality, setMunicipality] = useState("");

  // --- 地域分析 ---
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

  // --- 政策テスト ---
  const [policy, setPolicy] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("sanbo_policy") || "";
  });
  const [isRunning, setIsRunning] = useState(false);
  const [personaResults, setPersonaResults] = useState<Record<number, PersonaResponse | null>>({});
  const [loadingPersonas, setLoadingPersonas] = useState<Set<number>>(new Set());
  const [stanceCounts, setStanceCounts] = useState<StanceCounts>({ ...INITIAL_COUNTS });
  const [showStanceBar, setShowStanceBar] = useState(false);
  const [analysis, setAnalysis] = useState<ElectionAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // --- 遊説プラン ---
  const [rawSpots, setRawSpots] = useState<CampaignSpot[]>([]);
  const [spotsMunicipality, setSpotsMunicipality] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("morning");
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [spotsError, setSpotsError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [days, setDays] = useState<CampaignDay[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("sanbo_days") || "[]"); } catch { return []; }
  });
  const [activeDay, setActiveDay] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [optimized, setOptimized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numDays, setNumDays] = useState(3);
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);
  const [spotAdvice, setSpotAdvice] = useState<Record<string, { talkPoints: string[]; avoidTopics: string[] }>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("sanbo_spotAdvice") || "{}"); } catch { return {}; }
  });
  const [adviceLoading, setAdviceLoading] = useState(false);

  const scoredSpots = useMemo(() => scoreSpots(rawSpots, timeSlot), [rawSpots, timeSlot]);
  const maxDays = useMemo(() => Math.min(Math.floor(rawSpots.length / 5), 14), [rawSpots]);
  const activeDayStops: RouteStop[] | null = useMemo(() => {
    if (days.length > 0 && days[activeDay]) return days[activeDay].stops;
    return null;
  }, [days, activeDay]);

  // --- 完了判定 ---
  const hasPersonas = personas.length > 0 && !isGeneratingPersonas;
  const hasAnalysis = !!analysis;
  const hasRoute = days.length > 0;

  // --- 候補者プロフィール読み込み ---
  useEffect(() => {
    if (session?.user) {
      fetch("/api/candidate-profile")
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            setCandidateProfile({ name: data.name, party: data.party, district: data.district, platform: data.platform });
            if (data.customData) setCustomData(data.customData);
            // 選挙区が登録済みで、まだ未入力ならデフォルトセット
            if (data.district && !municipality) setMunicipality(data.district);
          }
        });
    }
  }, [session]);

  // --- ペルソナ生成（キャッシュ優先） ---
  const policySectionRef = useRef<HTMLDivElement>(null);
  const [usedCache, setUsedCache] = useState(false);

  const generatePersonas = useCallback(async (forceRefresh = false) => {
    const muni = municipality.trim();
    if (!muni) return;

    // キャッシュ確認
    if (!forceRefresh) {
      const cached = cacheGet<{ personas: VoterPersona[]; demographics: ElectionDemographicProfile }>("analysis", muni);
      if (cached) {
        setPersonas(cached.personas);
        setDemographics(cached.demographics);
        setUsedCache(true);
        setPersonaResults({});
        setStanceCounts({ ...INITIAL_COUNTS });
        setShowStanceBar(false);
        setAnalysis(null);
        setShowAnalysis(false);
        setAgeFilter("all");
        setOpenSections((prev) => ({ ...prev, policy: true }));
        return;
      }
    }

    setUsedCache(false);
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
        cacheSet("analysis", muni, { personas: data.personas, demographics: data.demographics });
        setOpenSections((prev) => ({ ...prev, policy: true }));
      } else {
        alert("地域分析に失敗しました");
      }
    } catch {
      alert("地域分析に失敗しました");
    }

    setIsGeneratingPersonas(false);
  }, [municipality, candidateProfile]);

  // --- 政策シミュレーション（キャッシュ対応） ---
  const routeSectionRef = useRef<HTMLDivElement>(null);

  // キャッシュから結果を復元するヘルパー
  const restoreSimulation = useCallback((cached: {
    personaResults: Record<number, PersonaResponse>;
    analysis: ElectionAnalysisResponse;
  }) => {
    const counts = { ...INITIAL_COUNTS };
    for (const r of Object.values(cached.personaResults)) {
      if (r) counts[r.stance as Stance] = (counts[r.stance as Stance] || 0) + 1;
    }
    setPersonaResults(cached.personaResults);
    setStanceCounts(counts);
    setLoadingPersonas(new Set());
    setShowStanceBar(true);
    setShowAnalysis(true);
    setAnalysis(cached.analysis);
    setAnalysisLoading(false);
    setOpenSections((prev) => ({ ...prev, route: true }));
  }, []);

  const runSimulation = useCallback(async () => {
    const pol = policy.trim();
    if (!pol) { alert("公約・政策を入力してください"); return; }
    if (!personas.length) return;

    const cacheKey = `${municipality}:${policyKey(pol)}`;

    // キャッシュ確認
    const cached = cacheGet<{
      personaResults: Record<number, PersonaResponse>;
      analysis: ElectionAnalysisResponse;
    }>("simulation", cacheKey);

    if (cached) {
      restoreSimulation(cached);
      return;
    }

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
          policy: pol, personas, candidateProfile,
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
        setStanceCounts((prev) => ({ ...prev, [r.stance]: prev[r.stance as Stance] + 1 }));
      }
    } catch {
      for (const persona of personas) {
        const fallback: PersonaResponse = { opinion: "（通信エラーのため回答を取得できませんでした）", stance: "中立", tags: ["エラー"] };
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
        body: JSON.stringify({ policy: pol, responseSummary, personas, personaResults: results }),
      });
      if (res.ok) {
        const analysisData = await res.json();
        setAnalysis(analysisData);
        // キャッシュ保存（シミュレーション結果+レポートを一体で）
        cacheSet("simulation", cacheKey, { personaResults: results, analysis: analysisData }, 3);
        setOpenSections((prev) => ({ ...prev, route: true }));
      }
    } catch { /* Analysis failed silently */ }

    setAnalysisLoading(false);
    setIsRunning(false);
  }, [policy, personas, candidateProfile, customData, municipality, restoreSimulation]);

  // 政策テキストをlocalStorageに保存
  useEffect(() => {
    if (policy) localStorage.setItem("sanbo_policy", policy);
  }, [policy]);

  // 訴求ポイント・日程をlocalStorageに保存
  useEffect(() => {
    if (Object.keys(spotAdvice).length > 0) {
      localStorage.setItem("sanbo_spotAdvice", JSON.stringify(spotAdvice));
    }
  }, [spotAdvice]);

  useEffect(() => {
    if (days.length > 0) {
      localStorage.setItem("sanbo_days", JSON.stringify(days));
      const ids = new Set(days.flatMap((d) => d.stops.map((s) => s.spotId)));
      setSelectedIds(ids);
    }
  }, [days]);

  // （シミュレーション結果は上のcacheSetで保存済み）

  // --- スポット取得（キャッシュ対応・リトライあり） ---
  const fetchSpots = useCallback(async () => {
    const target = municipality.trim();
    if (!target) return;

    // エラー状態をクリア
    setSpotsError("");

    // キャッシュ確認
    const cached = cacheGet<CampaignSpot[]>("spots", target);
    if (cached && cached.length > 0) {
      console.log("[fetchSpots] cache hit:", cached.length, "spots for", target);
      setRawSpots(cached);
      setSelectedIds(new Set());
      setDays([]);
      setActiveDay(0);
      setRouteGeometry(null);
      setOptimized(false);
      setSpotsMunicipality(target);
      setSpotsLoading(false);
      return;
    }

    setSpotsLoading(true);
    setRawSpots([]);
    setSelectedIds(new Set());
    setDays([]);
    setActiveDay(0);
    setRouteGeometry(null);
    setOptimized(false);

    const attemptFetch = async (): Promise<CampaignSpot[] | null> => {
      const res = await fetch(`/api/plateau-spots?municipality=${encodeURIComponent(target)}`);
      const data = await res.json();
      console.log("[fetchSpots] API response:", data.spots?.length ?? 0, "spots for", target);
      if (data.spots && data.spots.length > 0) return data.spots;
      return null;
    };

    try {
      let spots = await attemptFetch();
      // リトライ: 空の場合は2秒後に1回だけ再試行
      if (!spots) {
        console.log("[fetchSpots] empty result, retrying in 2s...");
        await new Promise((r) => setTimeout(r, 2000));
        spots = await attemptFetch();
      }
      if (spots) {
        setRawSpots(spots);
        cacheSet("spots", target, spots, 7);
      } else {
        setSpotsError("この地域のスポットデータが見つかりませんでした。");
      }
    } catch {
      setSpotsError("スポットの取得に失敗しました");
    } finally {
      setSpotsLoading(false);
    }
    setSpotsMunicipality(target);
  }, [municipality]);

  // セクション開閉をオーバーライド: 遊説プランを開くときにスポット取得
  const originalToggleSection = toggleSection;
  const handleToggleSection = useCallback((key: "analysis" | "policy" | "route") => {
    originalToggleSection(key);
    if (key === "route" && !openSections.route && municipality.trim() && rawSpots.length === 0 && !spotsLoading) {
      fetchSpots();
    }
  }, [originalToggleSection, openSections.route, municipality, rawSpots.length, spotsLoading, fetchSpots]);

  // 遊説プランセクションが開いているのにスポットがない場合に取得
  useEffect(() => {
    if (openSections.route && municipality.trim() && rawSpots.length === 0 && !spotsLoading) {
      fetchSpots();
    }
  }, [openSections.route, municipality, rawSpots.length, spotsLoading, fetchSpots]);

  const toggleSpot = useCallback((spotId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) next.delete(spotId);
      else next.add(spotId);
      return next;
    });
    setDays([]);
    setRouteGeometry(null);
    setOptimized(false);
  }, []);

  const fetchRouteForDay = useCallback(async (stops: RouteStop[]) => {
    if (stops.length < 2) { setRouteGeometry(null); return; }
    const osrm = await fetchOsrmRoute(stops);
    if (osrm) setRouteGeometry(osrm.geometry);
  }, []);

  const handleOptimize = useCallback(async (dayIndex: number) => {
    const day = days[dayIndex];
    if (!day) return;
    const optimizedStops = optimizeRoute(day.stops, 8);
    setDays((prev) => prev.map((d, i) => i === dayIndex ? { ...d, stops: optimizedStops } : d));
    setOptimized(true);
    if (dayIndex === activeDay) await fetchRouteForDay(optimizedStops);
  }, [days, activeDay, fetchRouteForDay]);

  const handleAutoGenerate = useCallback(async () => {
    if (rawSpots.length === 0) return;
    setGenerating(true);
    try {
      const plan = generateMultiDayPlan(rawSpots, numDays);
      const ids = new Set(plan.flatMap((d: CampaignDay) => d.stops.map((s: RouteStop) => s.spotId)));
      setSelectedIds(ids);
      setDays(plan);
      setActiveDay(0);
      setOptimized(true);
      if (plan.length > 0) await fetchRouteForDay(plan[0].stops);
    } finally {
      setGenerating(false);
    }
  }, [rawSpots, numDays, fetchRouteForDay]);

  // 訴求ポイント生成（ボタン押下時に実行）
  const generateAdvice = useCallback(async () => {
    if (!analysis || !policy || days.length === 0) return;

    const daysStopIds = days.flatMap((d) => d.stops.map((s) => s.spotId)).sort().join(",");
    const key = `${policyKey(policy)}:${daysStopIds}`;

    // キャッシュ確認
    const cached = cacheGet<Record<string, { talkPoints: string[]; avoidTopics: string[] }>>("advice", key);
    if (cached && Object.keys(cached).length > 0) {
      setSpotAdvice(cached);
      return;
    }

    setAdviceLoading(true);
    setSpotAdvice({});
    const allStops = days.flatMap((d) => d.stops);
    try {
      const res = await fetch("/api/spot-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy,
          analysisRecommendations: analysis.recommendations,
          analysisRisks: analysis.risks,
          stops: allStops,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const advice = data.advice || {};
      setSpotAdvice(advice);
      if (Object.keys(advice).length > 0) cacheSet("advice", key, advice, 3);
    } catch (e) {
      console.error("spot-advice error:", e);
    } finally {
      setAdviceLoading(false);
    }
  }, [analysis, policy, days]);

  const handleDayClick = useCallback(async (dayIndex: number) => {
    setActiveDay(dayIndex);
    const day = days[dayIndex];
    if (day && day.stops.length >= 2) await fetchRouteForDay(day.stops);
    else setRouteGeometry(null);
  }, [days, fetchRouteForDay]);

  const handleSave = useCallback(async () => {
    if (!session?.user) { alert("保存するにはログインが必要です"); return; }
    if (days.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/campaign-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipality,
          name: `${municipality} 遊説コース（${days.length}日間）`,
          routeData: days,
        }),
      });
      alert("遊説コースを保存しました");
    } catch { alert("保存に失敗しました"); }
    finally { setSaving(false); }
  }, [session, municipality, days]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-black tracking-[0.08em] text-[#1B2A4A]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              参謀AI
            </span>
            <span className="text-xs tracking-[0.15em] text-gray-400 hidden sm:inline">SANBO AI</span>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* プロフィール未登録バナー */}
        {session && !candidateProfile.name && !candidateProfile.platform && !profileBannerDismissed && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="flex-1 text-sm text-amber-800">
              候補者プロフィールを登録すると、より精度の高いシミュレーションが可能になります。
              <a href="/mypage" className="ml-1 font-semibold text-[#1B2A4A] underline hover:no-underline">マイページで登録する</a>
            </p>
            <button onClick={() => { setProfileBannerDismissed(true); localStorage.setItem("profileBannerDismissed", "true"); }}
              className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors" aria-label="閉じる">✕</button>
          </div>
        )}

        {/* ステップインジケーター */}
        <div className="flex items-center gap-0 mb-6 px-2">
          {[
            { label: "地域分析", done: hasPersonas },
            { label: "政策テスト", done: hasAnalysis },
            { label: "遊説プラン", done: hasRoute },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  s.done ? "bg-[#1B2A4A] text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {s.done ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${s.done ? "text-[#1B2A4A]" : "text-gray-400"}`}>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${s.done ? "bg-[#1B2A4A]" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ===== ① 地域分析 ===== */}
        <Section title="地域分析" step={1} done={hasPersonas} open={openSections.analysis} onToggle={() => handleToggleSection("analysis")}>
          <MunicipalityInput
            value={municipality}
            onChange={setMunicipality}
            isGenerating={isGeneratingPersonas}
            onGenerate={generatePersonas}
            hasPersonas={personas.length > 0}
            usedCache={usedCache}
          />

          {isGeneratingPersonas && (
            <LoadingOverlay message="地域を分析しています..." estimateSeconds={30} />
          )}

          {hasPersonas && (
            <>
              {demographics && (
                <DemographicsPanel demographics={demographics} municipality={municipality} />
              )}
              <ElectionMap municipality={municipality} />
              <PersonaList personas={personas} />
            </>
          )}
        </Section>

        {/* ===== ② 政策テスト ===== */}
        <div ref={policySectionRef}>
          <Section title="政策テスト" step={2} done={hasAnalysis}
            open={openSections.policy} onToggle={() => handleToggleSection("policy")}>
            {!hasPersonas ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                先に地域分析でペルソナを生成してください
              </div>
            ) : (
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
                demographics={demographics}
                ageFilter={ageFilter}
                onAgeFilterChange={setAgeFilter}
              />
            )}
          </Section>
        </div>

        {/* ===== ③ 遊説プラン ===== */}
        <div ref={routeSectionRef}>
          <Section title="遊説プラン" step={3} done={hasRoute}
            open={openSections.route} onToggle={() => handleToggleSection("route")}>

            {spotsLoading && (
              <LoadingOverlay message="遊説スポットを取得中..." estimateSeconds={5} />
            )}

            {/* 政策テスト結果サマリー */}
            {hasAnalysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="text-xs text-blue-700">
                  テスト政策: 「{policy}」→ 支持率 <span className="font-bold">{analysis!.weighted_approval_rate ?? analysis!.approval_rate}%</span>
                  {analysis!.recommendations[0] && <span className="ml-2 text-blue-500">— {analysis!.recommendations[0]}</span>}
                </div>
              </div>
            )}

            {/* 自動プラン生成 */}
            {rawSpots.length > 0 && (
              <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2a3d5c] rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-white text-sm font-semibold">遊説プランを自動生成</div>
                    <div className="text-white/60 text-xs mt-1">
                      8:00〜20:00（公選法準拠）
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <select value={numDays} onChange={(e) => setNumDays(Number(e.target.value))}
                      className="px-2 py-2 text-sm rounded-lg border-0 bg-white/20 text-white font-bold focus:ring-2 focus:ring-white/50 w-full sm:w-auto">
                      {Array.from({ length: Math.max(maxDays, 1) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} className="text-gray-800">{n}日間</option>
                      ))}
                    </select>
                    <button onClick={handleAutoGenerate} disabled={generating}
                      className="px-5 py-2.5 bg-white text-[#1B2A4A] text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 w-full sm:w-auto">
                      {generating ? "生成中..." : "自動生成"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {spotsError && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs text-red-500">{spotsError}</span>
                <button
                  onClick={() => { setSpotsError(""); fetchSpots(); }}
                  disabled={spotsLoading}
                  className="px-3 py-1 text-xs font-semibold bg-[#1B2A4A] text-white rounded hover:bg-[#2a3d6a] transition-colors disabled:opacity-50"
                >
                  {spotsLoading ? "取得中..." : "再取得"}
                </button>
              </div>
            )}

            {/* 地図 + スポット一覧 */}
            {rawSpots.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="lg:w-2/3 flex flex-col">
                    <CampaignRouteMap
                      municipality={municipality}
                      spots={scoredSpots}
                      selectedSpotIds={selectedIds}
                      routeStops={optimized ? activeDayStops : null}
                      routeGeometry={routeGeometry}
                      onSpotClick={(spot) => toggleSpot(spot.id)}
                      hoveredSpotId={hoveredSpotId}
                      onSpotHover={setHoveredSpotId}
                    />
                    <div className="mt-3">
                      <TimeSlider value={timeSlot} onChange={setTimeSlot} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] text-gray-500">
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#E74C3C] mr-0.5" />駅</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#27AE60] mr-0.5" />公園</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#9B59B6] mr-0.5" />商業</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#1ABC9C] mr-0.5" />公共</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#3498DB] mr-0.5" />避難</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-[#F39C12] mr-0.5" />LM</span>
                    </div>
                  </div>
                  <div className="lg:w-1/3 relative">
                    <SpotList
                      spots={scoredSpots}
                      selectedIds={selectedIds}
                      onToggle={toggleSpot}
                      hoveredSpotId={hoveredSpotId}
                      onHover={setHoveredSpotId}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* カンバンボード */}
            {days.length > 0 && (
              <DayPlannerBoard
                days={days}
                activeDay={activeDay}
                optimized={optimized}
                availableSpots={scoredSpots}
                saving={saving}
                spotAdvice={spotAdvice}
                adviceLoading={adviceLoading}
                hasAnalysis={hasAnalysis}
                municipality={municipality}
                onGenerateAdvice={generateAdvice}
                onDaysChange={(newDays) => {
                  setDays(newDays);
                  const ids = new Set(newDays.flatMap((d) => d.stops.map((s) => s.spotId)));
                  setSelectedIds(ids);
                  setRouteGeometry(null);
                }}
                onActiveDayChange={handleDayClick}
                onOptimize={handleOptimize}
                onSave={handleSave}
              />
            )}
          </Section>
        </div>
      </main>

      <footer className="mt-10 pb-8 text-center text-xs text-gray-400">
        Produced by KOIKOI, Inc.
      </footer>
    </div>
  );
}
