"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type {
  VoterPersona, PersonaResponse, ElectionAnalysisResponse,
  StanceCounts, Stance, ElectionDemographicProfile,
  CandidateProfile, AgeGroupFilter,
  CampaignSpot, CampaignDay, RouteStop, TimeSlot,
} from "@/lib/types";

// 地域分析・政策テスト関連
import MunicipalityInput from "@/components/MunicipalityInput";
import AuthButton from "@/components/AuthButton";
import DemographicsPanel from "@/components/DemographicsPanel";
import PersonaList from "@/components/PersonaList";
import ListenMode from "@/components/ListenMode";
import LoadingOverlay from "@/components/LoadingOverlay";
import ElectionMap from "@/components/ElectionMap";

// 遊説プラン関連
import CampaignRouteMap from "@/components/CampaignRouteMap";
import TimeSlider from "@/components/TimeSlider";
import SpotList from "@/components/SpotList";
import DayPlannerBoard from "@/components/DayPlannerBoard";
import PolicyInsightBanner from "@/components/PolicyInsightBanner";
import { scoreSpots } from "@/lib/scoring";
import { optimizeRoute, generateMultiDayPlan, fetchOsrmRoute } from "@/lib/route-optimizer";

const INITIAL_COUNTS: StanceCounts = { "強く賛成": 0, "賛成": 0, "条件付き賛成": 0, "中立": 0, "反対": 0, "強く反対": 0 };
const INITIAL_CANDIDATE: CandidateProfile = { name: "", party: "", district: "", platform: "" };

type Tab = "analysis" | "policy" | "route";
const TABS: { key: Tab; label: string }[] = [
  { key: "analysis", label: "地域分析" },
  { key: "policy", label: "政策テスト" },
  { key: "route", label: "遊説プラン" },
];

export default function Home() {
  const { data: session } = useSession();

  // --- タブ ---
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "analysis";
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param === "policy" || param === "route") return param;
    return "analysis";
  });

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", tab === "analysis" ? "/" : `/?tab=${tab}`);
  }, []);

  // --- 共通: 選挙区 ---
  const [municipality, setMunicipality] = useState("");

  // --- 地域分析 / 政策テスト ---
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

  const [policy, setPolicy] = useState("");
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
  const [spotsMunicipality, setSpotsMunicipality] = useState(""); // どの選挙区のスポットか
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("morning");
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [spotsError, setSpotsError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [days, setDays] = useState<CampaignDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [optimized, setOptimized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numDays, setNumDays] = useState(3);
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null);

  const scoredSpots = useMemo(() => scoreSpots(rawSpots, timeSlot), [rawSpots, timeSlot]);
  const maxDays = useMemo(() => Math.min(Math.floor(rawSpots.length / 5), 14), [rawSpots]);
  const activeDayStops: RouteStop[] | null = useMemo(() => {
    if (days.length > 0 && days[activeDay]) return days[activeDay].stops;
    return null;
  }, [days, activeDay]);

  // --- 候補者プロフィール読み込み ---
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

  // --- ペルソナ生成 ---
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

  // --- 政策シミュレーション ---
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
        body: JSON.stringify({ policy: pol, responseSummary, personas, personaResults: results }),
      });
      if (res.ok) {
        setAnalysis(await res.json());
      }
    } catch { /* Analysis failed silently */ }

    setAnalysisLoading(false);
    setIsRunning(false);
  }, [policy, personas, candidateProfile, customData]);

  // シミュレーション結果をlocalStorageに保存
  useEffect(() => {
    if (analysis && municipality && policy) {
      try {
        const saved = JSON.parse(localStorage.getItem("sanbo_simulations") || "{}");
        saved[municipality] = {
          policy,
          approval_rate: analysis.weighted_approval_rate ?? analysis.approval_rate,
          recommendations: analysis.recommendations,
          risks: analysis.risks,
          overall: analysis.overall,
          age_group_breakdown: analysis.age_group_breakdown,
          timestamp: Date.now(),
        };
        localStorage.setItem("sanbo_simulations", JSON.stringify(saved));
      } catch { /* ignore */ }
    }
  }, [analysis, municipality, policy]);

  // --- スポット取得 ---
  const fetchSpots = useCallback(async () => {
    const target = municipality.trim();
    if (!target) return;
    setSpotsLoading(true);
    setSpotsError("");
    setRawSpots([]);
    setSelectedIds(new Set());
    setDays([]);
    setActiveDay(0);
    setRouteGeometry(null);
    setOptimized(false);

    try {
      const res = await fetch(`/api/plateau-spots?municipality=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (data.spots && data.spots.length > 0) {
        setRawSpots(data.spots);
      } else {
        setSpotsError("この地域のスポットデータが見つかりませんでした。");
      }
    } catch {
      setSpotsError("スポットの取得に失敗しました");
    } finally {
      setSpotsMunicipality(target);
      setSpotsLoading(false);
    }
  }, [municipality]);

  // 遊説プランタブに切り替え時、スポット未取得なら自動取得
  const lastFetchedMuni = useRef("");
  useEffect(() => {
    if (activeTab === "route" && municipality.trim() && lastFetchedMuni.current !== municipality.trim() && !spotsLoading) {
      lastFetchedMuni.current = municipality.trim();
      fetchSpots();
    }
  }, [activeTab, municipality]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleRemove = useCallback((dayIndex: number, spotId: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(spotId); return next; });
    setDays((prev) => prev.map((d, i) =>
      i === dayIndex ? { ...d, stops: d.stops.filter((s) => s.spotId !== spotId) } : d
    ));
    if (dayIndex === activeDay) setRouteGeometry(null);
  }, [activeDay]);

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

  // --- 表示判定 ---
  const hasPersonas = personas.length > 0 && !isGeneratingPersonas;
  const hasMunicipality = municipality.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-black tracking-[0.08em] text-[#1B2A4A]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              参謀AI
            </span>
            <span className="text-xs tracking-[0.15em] text-gray-400 hidden sm:inline">SANBO AI</span>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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

        {/* 選挙区入力 */}
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

        {/* タブバー */}
        {hasMunicipality && (
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const disabled = tab.key === "policy" && !hasPersonas;
              return (
                <button
                  key={tab.key}
                  onClick={() => !disabled && switchTab(tab.key)}
                  disabled={disabled}
                  className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-[#1B2A4A] text-[#1B2A4A]"
                      : disabled
                        ? "border-transparent text-gray-300 cursor-not-allowed"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ===== 地域分析タブ ===== */}
        {hasMunicipality && activeTab === "analysis" && (
          <div className="max-w-[960px] mx-auto">
            {hasPersonas && demographics && (
              <DemographicsPanel demographics={demographics} municipality={municipality} />
            )}
            <ElectionMap municipality={municipality} />
            {hasPersonas && <PersonaList personas={personas} />}
            {!hasPersonas && !isGeneratingPersonas && (
              <div className="text-center py-12 text-gray-400 text-sm">
                上の「有権者ペルソナを生成」ボタンを押すと、地域分析が表示されます
              </div>
            )}
          </div>
        )}

        {/* ===== 政策テストタブ ===== */}
        {hasMunicipality && activeTab === "policy" && hasPersonas && (
          <div className="max-w-[960px] mx-auto">
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
          </div>
        )}

        {/* ===== 遊説プランタブ ===== */}
        {hasMunicipality && activeTab === "route" && (
          <>
            {spotsLoading && (
              <LoadingOverlay message="遊説スポットを取得中..." estimateSeconds={5} />
            )}

            {/* 政策シミュレーション連動バナー */}
            {analysis ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-blue-700">
                    政策テスト結果: 「{policy}」→ 支持率 <span className="font-bold">{analysis.weighted_approval_rate ?? analysis.approval_rate}%</span>
                    {analysis.recommendations[0] && <span className="ml-2 text-blue-500">— {analysis.recommendations[0]}</span>}
                  </div>
                  <button onClick={() => switchTab("policy")} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0 ml-3">
                    詳細を見る
                  </button>
                </div>
              </div>
            ) : (
              <PolicyInsightBanner municipality={municipality} />
            )}

            {/* 自動プラン生成 */}
            {rawSpots.length > 0 && (
              <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2a3d5c] rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-white text-sm font-semibold">遊説プランを自動生成</div>
                    <div className="text-white/60 text-xs mt-1">
                      8:00〜20:00（公選法準拠）・朝の駅立ち → 午前遊説 → 昼演説 → 午後遊説 → 夕方演説 → 夜の駅立ち
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <select
                      value={numDays}
                      onChange={(e) => setNumDays(Number(e.target.value))}
                      className="px-2 py-2 text-sm rounded-lg border-0 bg-white/20 text-white font-bold focus:ring-2 focus:ring-white/50 w-full sm:w-auto"
                    >
                      {Array.from({ length: Math.max(maxDays, 1) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} className="text-gray-800">{n}日間</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAutoGenerate}
                      disabled={generating}
                      className="px-5 py-2.5 bg-white text-[#1B2A4A] text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                      {generating ? "生成中..." : "自動生成"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {spotsError && <div className="mb-4 text-xs text-red-500">{spotsError}</div>}

            {/* 地図+時間帯(左) + スポット一覧(右) ホバー連動 */}
            {rawSpots.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* 左: 地図 + 時間帯 + 凡例 */}
                  <div className="lg:w-2/3 flex flex-col">
                    <div className="flex-1">
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
                    </div>
                    <div className="mt-3">
                      <TimeSlider value={timeSlot} onChange={setTimeSlot} />
                    </div>
                    {scoredSpots.length > 0 && (
                      <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] text-gray-500">
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[#E74C3C] mr-0.5" />駅</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[#27AE60] mr-0.5" />公園</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[#9B59B6] mr-0.5" />商業</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[#1ABC9C] mr-0.5" />公共</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[#3498DB] mr-0.5" />避難</span>
                        <span><span className="inline-block w-2 h-2 rounded-full bg-[#F39C12] mr-0.5" />LM</span>
                      </div>
                    )}
                  </div>
                  {/* 右: スポット一覧（左カラムと高さを揃える） */}
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

            {/* 遊説プラン日程（カンバンボード） */}
            {days.length > 0 && (
              <DayPlannerBoard
                days={days}
                activeDay={activeDay}
                optimized={optimized}
                availableSpots={scoredSpots}
                saving={saving}
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
          </>
        )}
      </main>

      <footer className="mt-10 pb-8 text-center text-xs text-gray-400">
        Produced by KOIKOI, Inc.
      </footer>
    </div>
  );
}
