"use client";

import { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import CampaignRouteMap from "@/components/CampaignRouteMap";
import TimeSlider from "@/components/TimeSlider";
import SpotList from "@/components/SpotList";
import DayPlanner from "@/components/DayPlanner";
import DistrictCombobox from "@/components/DistrictCombobox";
import { scoreSpots } from "@/lib/scoring";
import { optimizeRoute } from "@/lib/route-optimizer";
import type { CampaignSpot, RouteStop, TimeSlot } from "@/lib/types";
import Link from "next/link";

const DEFAULT_DWELL = 30;

export default function CampaignRoutePage() {
  const { data: session } = useSession();

  // 入力
  const [municipality, setMunicipality] = useState("");
  const [inputValue, setInputValue] = useState("");

  // スポットデータ
  const [rawSpots, setRawSpots] = useState<CampaignSpot[]>([]);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("morning");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 選択・ルート
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [routeStops, setRouteStops] = useState<RouteStop[] | null>(null);
  const [optimized, setOptimized] = useState(false);
  const [saving, setSaving] = useState(false);

  // スコアリング
  const scoredSpots = useMemo(() => scoreSpots(rawSpots, timeSlot), [rawSpots, timeSlot]);

  // スポット取得
  const fetchSpots = useCallback(async (district?: string) => {
    const target = district || inputValue.trim();
    if (!target) return;
    setLoading(true);
    setError("");
    setRawSpots([]);
    setSelectedIds(new Set());
    setRouteStops(null);
    setOptimized(false);
    setMunicipality(target);

    try {
      const res = await fetch(`/api/plateau-spots?municipality=${encodeURIComponent(target)}`);
      const data = await res.json();

      if (data.spots && data.spots.length > 0) {
        setRawSpots(data.spots);
      } else {
        setError("この地域のPLATEAUデータが見つかりませんでした。対応地域をお試しください。");
      }
    } catch {
      setError("スポットの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [inputValue]);

  // スポット選択トグル
  const toggleSpot = useCallback((spotId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) {
        next.delete(spotId);
      } else {
        next.add(spotId);
      }
      return next;
    });
    setRouteStops(null);
    setOptimized(false);
  }, []);

  // ルート最適化
  const handleOptimize = useCallback(() => {
    const stops: RouteStop[] = scoredSpots
      .filter((s) => selectedIds.has(s.id))
      .map((spot, i) => ({
        spotId: spot.id,
        spot,
        order: i,
        startTime: "",
        duration: DEFAULT_DWELL,
      }));

    const optimizedStops = optimizeRoute(stops, 8);
    setRouteStops(optimizedStops);
    setOptimized(true);
  }, [scoredSpots, selectedIds]);

  // スポット削除
  const handleRemove = useCallback((spotId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(spotId);
      return next;
    });
    setRouteStops((prev) => prev ? prev.filter((s) => s.spotId !== spotId) : null);
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    if (!session?.user) {
      alert("保存するにはログインが必要です");
      return;
    }
    if (!routeStops || routeStops.length === 0) return;

    setSaving(true);
    try {
      await fetch("/api/campaign-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipality,
          name: `${municipality} 遊説コース`,
          routeData: [{ dayNumber: 1, stops: routeStops }],
        }),
      });
      alert("遊説コースを保存しました");
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [session, municipality, routeStops]);

  // 選択中のスポットからRouteStop配列（未最適化時の表示用）
  const displayStops: RouteStop[] = useMemo(() => {
    if (routeStops) return routeStops;
    return scoredSpots
      .filter((s) => selectedIds.has(s.id))
      .map((spot, i) => ({
        spotId: spot.id,
        spot,
        order: i,
        startTime: "",
        duration: DEFAULT_DWELL,
      }));
  }, [routeStops, scoredSpots, selectedIds]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-[#1B2A4A]" style={{ fontFamily: "'Noto Serif JP', serif" }}>
              参謀AI
            </Link>
            <span className="text-sm text-gray-500">遊説コース作成</span>
          </div>
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            シミュレーターに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 選挙区入力 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          <div className="text-sm font-semibold text-gray-800 mb-2">選挙区を選択</div>
          <div className="flex gap-2">
            <DistrictCombobox
              value={inputValue}
              onChange={setInputValue}
              onSubmit={(district) => fetchSpots(district)}
              loading={loading}
            />
            <button
              onClick={() => fetchSpots()}
              disabled={loading || !inputValue.trim()}
              className="px-4 py-2 bg-[#1B2A4A] text-white text-sm font-medium rounded-lg hover:bg-[#2a3d5c] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {loading ? "取得中..." : "スポット取得"}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            選挙区名の一部を入力すると候補が表示されます（例: 栃木2、東京10、大阪1）
          </div>
          {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
        </div>

        {/* メインコンテンツ: 2カラム */}
        {municipality && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 左: 地図 (3/5) */}
            <div className="lg:col-span-3">
              <CampaignRouteMap
                municipality={municipality}
                spots={scoredSpots}
                selectedSpotIds={selectedIds}
                routeStops={optimized ? routeStops : null}
                onSpotClick={(spot) => toggleSpot(spot.id)}
              />
              {/* 凡例 */}
              {scoredSpots.length > 0 && (
                <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-center gap-4 text-[10px] text-gray-500">
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E74C3C] mr-1" />駅</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#27AE60] mr-1" />公園</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3498DB] mr-1" />避難施設</span>
                    <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F39C12] mr-1" />ランドマーク</span>
                    <span className="ml-2 text-gray-400">マーカーの大きさ = 人流スコア</span>
                  </div>
                </div>
              )}
            </div>

            {/* 右: 操作パネル (2/5) */}
            <div className="lg:col-span-2 space-y-4">
              <TimeSlider value={timeSlot} onChange={setTimeSlot} />
              <SpotList
                spots={scoredSpots}
                selectedIds={selectedIds}
                onToggle={toggleSpot}
              />
              <DayPlanner
                stops={displayStops}
                onOptimize={handleOptimize}
                onRemove={handleRemove}
                onSave={handleSave}
                saving={saving}
                optimized={optimized}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
