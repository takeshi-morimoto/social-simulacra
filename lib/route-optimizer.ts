import * as turf from "@turf/turf";
import type { CampaignSpot, CampaignDay, RouteStop, SpotType } from "./types";
import { getSpotScore } from "./scoring";

const DEFAULT_DWELL_MINUTES = 30;
const STATION_DWELL_MINUTES = 45; // 駅前は長めに

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function distanceKmSpots(a: CampaignSpot, b: CampaignSpot): number {
  return turf.distance(
    turf.point([a.lng, a.lat]),
    turf.point([b.lng, b.lat]),
    { units: "kilometers" },
  );
}

function distanceKm(a: RouteStop, b: RouteStop): number {
  return distanceKmSpots(a.spot, b.spot);
}

// --- OSRM連携 ---

interface OsrmLeg {
  duration: number; // seconds
  distance: number; // meters
}

interface OsrmRoute {
  legs: OsrmLeg[];
  geometry: { coordinates: [number, number][] }; // GeoJSON LineString
  duration: number;
  distance: number;
}

/**
 * OSRM APIで実道路の移動時間・経路を取得
 */
export async function fetchOsrmRoute(
  stops: RouteStop[],
): Promise<{ durations: number[]; geometry: [number, number][] } | null> {
  if (stops.length < 2) return null;

  const coords = stops.map((s) => `${s.spot.lng},${s.spot.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route: OsrmRoute = data.routes[0];
    const durations = route.legs.map((leg: OsrmLeg) => Math.round(leg.duration / 60)); // seconds → minutes
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]], // [lng,lat] → [lat,lng] for Leaflet
    );

    return { durations, geometry };
  } catch (e) {
    console.error("OSRM error:", e);
    return null;
  }
}

// --- 1日テンプレート自動生成 ---

interface TimeBlock {
  label: string;
  startMinute: number; // 0-based minutes from midnight
  endMinute: number;
  preferredTypes: SpotType[];
  count: number; // 何箇所選ぶか
  dwell: number; // 滞在時間（分）
}

// 公職選挙法: 選挙運動は8:00〜20:00
const DAY_TEMPLATE: TimeBlock[] = [
  { label: "朝の駅立ち", startMinute: 8 * 60, endMinute: 9 * 60, preferredTypes: ["station"], count: 1, dwell: STATION_DWELL_MINUTES },
  { label: "午前の遊説", startMinute: 9.5 * 60, endMinute: 11.5 * 60, preferredTypes: ["public_hall", "shelter", "shopping"], count: 2, dwell: DEFAULT_DWELL_MINUTES },
  { label: "昼の街頭演説", startMinute: 12 * 60, endMinute: 13.5 * 60, preferredTypes: ["shopping", "landmark", "park"], count: 1, dwell: DEFAULT_DWELL_MINUTES },
  { label: "午後の遊説", startMinute: 14 * 60, endMinute: 16.5 * 60, preferredTypes: ["park", "public_hall", "shelter", "shopping"], count: 2, dwell: DEFAULT_DWELL_MINUTES },
  { label: "夕方の遊説", startMinute: 16.5 * 60, endMinute: 18 * 60, preferredTypes: ["shopping", "landmark", "park"], count: 2, dwell: DEFAULT_DWELL_MINUTES },
  { label: "夜の駅立ち", startMinute: 18.5 * 60, endMinute: 19.5 * 60, preferredTypes: ["station"], count: 1, dwell: STATION_DWELL_MINUTES },
  { label: "最終の街頭演説", startMinute: 19 * 60, endMinute: 20 * 60, preferredTypes: ["station", "shopping"], count: 1, dwell: DEFAULT_DWELL_MINUTES },
];

/**
 * 時間帯ごとのスコアと距離を考慮してスポットを選択
 * まず優先種別から選び、なければ他の種別にフォールバック
 * usageCounts: 過去の日で各スポットが使われた回数（回数に応じてペナルティ累積）
 */
function pickBestSpot(
  candidates: CampaignSpot[],
  preferredTypes: SpotType[],
  lastSpot: CampaignSpot | null,
  dayUsedIds: Set<string>,
  usageCounts?: Map<string, number>,
): CampaignSpot | null {
  // 同じ日の中では重複しない
  const available = candidates.filter((s) => !dayUsedIds.has(s.id));
  if (available.length === 0) return null;

  // まず優先種別のスポットだけで候補を作る
  const preferred = available.filter((s) => preferredTypes.includes(s.type));
  const pool = preferred.length > 0 ? preferred : available;

  const scored = pool.map((s) => {
    const distPenalty = lastSpot ? distanceKmSpots(s, lastSpot) * 3 : 0;
    // 使用回数に応じてペナルティ累積（駅は軽め、それ以外は重め）
    const count = usageCounts?.get(s.id) || 0;
    const perUsePenalty = s.type === "station" ? 20 : 35;
    const reusePenalty = count * perUsePenalty;
    return { spot: s, score: s.score - distPenalty - reusePenalty };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.spot || null;
}

/**
 * 1日分の遊説プランを自動生成
 * usageCounts: 各スポットの過去使用回数（回数に応じてペナルティ累積）
 */
export function generateDayPlan(spots: CampaignSpot[], usageCounts?: Map<string, number>): RouteStop[] {
  const dayUsed = new Set<string>(); // この日の中での重複防止
  const result: RouteStop[] = [];
  let lastSpot: CampaignSpot | null = null;
  let order = 0;

  for (const block of DAY_TEMPLATE) {
    const timeSlot = block.startMinute < 7 * 60 ? "early_morning"
      : block.startMinute < 10 * 60 ? "morning"
      : block.startMinute < 14 * 60 ? "midday"
      : block.startMinute < 17 * 60 ? "afternoon"
      : block.startMinute < 20 * 60 ? "evening" : "night";

    const scored = spots.map((s) => ({ ...s, score: getSpotScore(s.type, timeSlot) }));

    // ブロック内の開始時刻を計算
    let blockMinutes = block.startMinute;

    for (let i = 0; i < block.count; i++) {
      const picked = pickBestSpot(scored, block.preferredTypes, lastSpot, dayUsed, usageCounts);
      if (!picked) break;

      // 前のスポットからの移動時間
      if (lastSpot) {
        const travel = Math.round((distanceKmSpots(picked, lastSpot) / 20) * 60);
        blockMinutes = Math.max(blockMinutes, blockMinutes + travel);
      }

      dayUsed.add(picked.id);
      result.push({
        spotId: picked.id,
        spot: picked,
        order: order++,
        startTime: formatTime(blockMinutes),
        duration: block.dwell,
      });
      blockMinutes += block.dwell;
      lastSpot = picked;
    }
  }

  return result;
}

/**
 * 複数日分の遊説プランを自動生成
 * - 1日の中ではスポット重複なし
 * - 日をまたいだ重複は使用回数に応じたペナルティで抑制
 * - 駅: 1回使用で-20（2日に1回は別の駅に）
 * - 駅以外: 1回使用で-35（基本的に毎日違う場所に）
 */
export function generateMultiDayPlan(spots: CampaignSpot[], numDays: number): CampaignDay[] {
  const usageCounts = new Map<string, number>();
  const days: CampaignDay[] = [];

  for (let d = 0; d < numDays; d++) {
    const stops = generateDayPlan(spots, usageCounts);
    if (stops.length === 0) break;
    days.push({ dayNumber: d + 1, stops });

    // 使用回数を更新
    for (const stop of stops) {
      usageCounts.set(stop.spotId, (usageCounts.get(stop.spotId) || 0) + 1);
    }
  }

  return days;
}

// --- 既存のルート最適化 ---

/**
 * startTime文字列("HH:MM")を分に変換
 */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * 時間ブロック単位で最近傍法を適用してルートを最適化
 * テンプレートの時間枠を保持しつつ、各ブロック内でスポット順を最適化する
 */
export function optimizeRoute(stops: RouteStop[], startHour: number = 8): RouteStop[] {
  if (stops.length <= 1) {
    return stops.map((s, i) => ({
      ...s,
      order: i,
      startTime: s.startTime || formatTime(startHour * 60),
    }));
  }

  // テンプレート由来の時間枠があるか判定（startTimeが設定済み）
  const hasSchedule = stops.some((s) => s.startTime && s.startTime !== "");

  if (!hasSchedule) {
    // 手動選択のスポット: 従来通り全体を最近傍法で並べる
    const remaining = [...stops];
    const result: RouteStop[] = [];
    let current = remaining.splice(0, 1)[0];
    result.push(current);

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = distanceKm(current, remaining[i]);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      current = remaining.splice(nearestIdx, 1)[0];
      result.push(current);
    }

    let currentMinutes = startHour * 60;
    return result.map((stop, i) => {
      if (i > 0) {
        const travel = Math.round((distanceKm(result[i - 1], stop) / 20) * 60);
        currentMinutes += travel;
      }
      const startTime = formatTime(currentMinutes);
      currentMinutes += stop.duration || DEFAULT_DWELL_MINUTES;
      return { ...stop, order: i, startTime };
    });
  }

  // テンプレート由来: 時間ブロック別にグループ化して各ブロック内で最適化
  const blocks: RouteStop[][] = [];
  let currentBlock: RouteStop[] = [];
  let blockStart = -1;

  for (const stop of stops) {
    const mins = parseTimeToMinutes(stop.startTime);
    // 90分以上の間隔があれば別ブロックとみなす
    if (blockStart >= 0 && mins - blockStart > 90) {
      blocks.push(currentBlock);
      currentBlock = [];
    }
    if (currentBlock.length === 0) blockStart = mins;
    currentBlock.push(stop);
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  // 各ブロック内で最近傍法を適用
  const result: RouteStop[] = [];
  let lastStop: RouteStop | null = null;
  let order = 0;

  for (const block of blocks) {
    if (block.length <= 1) {
      // 1スポットのブロックはそのまま
      const stop = { ...block[0], order: order++ };
      // 前ブロックの最終スポットからの移動時間を考慮
      if (lastStop) {
        const travel = Math.round((distanceKm(lastStop, stop) / 20) * 60);
        const earliest = parseTimeToMinutes(block[0].startTime);
        const arrival = parseTimeToMinutes(lastStop.startTime) + (lastStop.duration || DEFAULT_DWELL_MINUTES) + travel;
        stop.startTime = formatTime(Math.max(earliest, arrival));
      }
      result.push(stop);
      lastStop = stop;
      continue;
    }

    // ブロック内を最近傍法で並べ替え
    const remaining = [...block];
    const sorted: RouteStop[] = [];

    // 前ブロックからの接続を考慮して開始点を選ぶ
    if (lastStop) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = distanceKm(lastStop, remaining[i]);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      sorted.push(remaining.splice(nearestIdx, 1)[0]);
    } else {
      sorted.push(remaining.splice(0, 1)[0]);
    }

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      const prev = sorted[sorted.length - 1];
      for (let i = 0; i < remaining.length; i++) {
        const d = distanceKm(prev, remaining[i]);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      }
      sorted.push(remaining.splice(nearestIdx, 1)[0]);
    }

    // ブロックの元の開始時刻を下限として時刻を再計算
    const blockBaseMinutes = parseTimeToMinutes(block[0].startTime);
    let currentMinutes = blockBaseMinutes;

    if (lastStop) {
      const travel = Math.round((distanceKm(lastStop, sorted[0]) / 20) * 60);
      const arrival = parseTimeToMinutes(lastStop.startTime) + (lastStop.duration || DEFAULT_DWELL_MINUTES) + travel;
      currentMinutes = Math.max(blockBaseMinutes, arrival);
    }

    for (const stop of sorted) {
      const optimized = { ...stop, order: order++, startTime: formatTime(currentMinutes) };
      result.push(optimized);
      lastStop = optimized;
      const travel = sorted.indexOf(stop) < sorted.length - 1
        ? Math.round((distanceKmSpots(stop.spot, sorted[sorted.indexOf(stop) + 1].spot) / 20) * 60)
        : 0;
      currentMinutes += (stop.duration || DEFAULT_DWELL_MINUTES) + travel;
    }
  }

  return result;
}

/**
 * ルートの総距離を計算 (km)
 */
export function calculateTotalDistance(stops: RouteStop[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += distanceKm(stops[i - 1], stops[i]);
  }
  return Math.round(total * 10) / 10;
}

/**
 * ルートの推定総移動時間を計算 (分)
 */
export function calculateTotalTravelTime(stops: RouteStop[]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += Math.round((distanceKm(stops[i - 1], stops[i]) / 20) * 60);
  }
  return total;
}
