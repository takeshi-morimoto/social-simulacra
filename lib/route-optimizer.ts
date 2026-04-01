import * as turf from "@turf/turf";
import type { CampaignSpot, RouteStop, SpotType } from "./types";
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

const DAY_TEMPLATE: TimeBlock[] = [
  { label: "朝の駅立ち", startMinute: 7 * 60, endMinute: 9 * 60, preferredTypes: ["station"], count: 1, dwell: STATION_DWELL_MINUTES },
  { label: "午前の遊説", startMinute: 9.5 * 60, endMinute: 11.5 * 60, preferredTypes: ["public_hall", "shelter", "shopping"], count: 2, dwell: DEFAULT_DWELL_MINUTES },
  { label: "昼の街頭演説", startMinute: 12 * 60, endMinute: 13.5 * 60, preferredTypes: ["shopping", "landmark", "park"], count: 1, dwell: DEFAULT_DWELL_MINUTES },
  { label: "午後の遊説", startMinute: 14 * 60, endMinute: 16 * 60, preferredTypes: ["park", "public_hall", "shelter", "shopping"], count: 2, dwell: DEFAULT_DWELL_MINUTES },
  { label: "夕方の駅立ち", startMinute: 17 * 60, endMinute: 18.5 * 60, preferredTypes: ["station"], count: 1, dwell: STATION_DWELL_MINUTES },
];

/**
 * 時間帯ごとのスコアと距離を考慮してスポットを選択
 */
function pickBestSpot(
  candidates: CampaignSpot[],
  preferredTypes: SpotType[],
  lastSpot: CampaignSpot | null,
  usedIds: Set<string>,
): CampaignSpot | null {
  const available = candidates.filter((s) => !usedIds.has(s.id));
  if (available.length === 0) return null;

  // スコア = 種別優先度 + スコア値 - 距離ペナルティ
  const scored = available.map((s) => {
    const typePriority = preferredTypes.includes(s.type) ? 50 : 0;
    const distPenalty = lastSpot ? distanceKmSpots(s, lastSpot) * 5 : 0;
    return { spot: s, score: typePriority + s.score - distPenalty };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.spot || null;
}

/**
 * 1日分の遊説プランを自動生成
 */
export function generateDayPlan(spots: CampaignSpot[]): RouteStop[] {
  const usedIds = new Set<string>();
  const result: RouteStop[] = [];
  let lastSpot: CampaignSpot | null = null;

  for (const block of DAY_TEMPLATE) {
    // このブロックに適したスコアで再計算
    const timeSlot = block.startMinute < 7 * 60 ? "early_morning"
      : block.startMinute < 10 * 60 ? "morning"
      : block.startMinute < 14 * 60 ? "midday"
      : block.startMinute < 17 * 60 ? "afternoon"
      : block.startMinute < 20 * 60 ? "evening" : "night";

    const scored = spots.map((s) => ({ ...s, score: getSpotScore(s.type, timeSlot) }));

    for (let i = 0; i < block.count; i++) {
      const picked = pickBestSpot(scored, block.preferredTypes, lastSpot, usedIds);
      if (!picked) break;

      usedIds.add(picked.id);
      result.push({
        spotId: picked.id,
        spot: picked,
        order: result.length,
        startTime: "",
        duration: block.dwell,
      });
      lastSpot = picked;
    }
  }

  // 時刻割り当て（テンプレートの開始時刻を基準に）
  let currentMinutes = DAY_TEMPLATE[0].startMinute;
  let blockIdx = 0;
  let blockSlotUsed = 0;

  return result.map((stop, i) => {
    // ブロック切り替え判定
    while (blockIdx < DAY_TEMPLATE.length - 1) {
      const block = DAY_TEMPLATE[blockIdx];
      if (blockSlotUsed >= block.count) {
        blockIdx++;
        blockSlotUsed = 0;
        // 次のブロックの開始時刻にジャンプ（移動時間を考慮）
        const nextStart = DAY_TEMPLATE[blockIdx].startMinute;
        if (currentMinutes < nextStart) {
          currentMinutes = nextStart;
        }
      } else {
        break;
      }
    }

    if (i > 0) {
      const travel = Math.round(
        (distanceKmSpots(result[i - 1].spot, stop.spot) / 20) * 60,
      );
      currentMinutes += travel;
    }

    const startTime = formatTime(currentMinutes);
    currentMinutes += stop.duration;
    blockSlotUsed++;

    return { ...stop, order: i, startTime };
  });
}

// --- 既存のルート最適化 ---

/**
 * 最近傍法でルートを最適化
 */
export function optimizeRoute(stops: RouteStop[], startHour: number = 8): RouteStop[] {
  if (stops.length <= 1) {
    return stops.map((s, i) => ({
      ...s,
      order: i,
      startTime: formatTime(startHour * 60),
    }));
  }

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
