import * as turf from "@turf/turf";
import type { RouteStop } from "./types";

const AVG_SPEED_KMH = 20; // 市街地平均速度
const DEFAULT_DWELL_MINUTES = 30; // デフォルト滞在時間

/**
 * 2点間の距離をkm単位で計算
 */
function distanceKm(a: RouteStop, b: RouteStop): number {
  return turf.distance(
    turf.point([a.spot.lng, a.spot.lat]),
    turf.point([b.spot.lng, b.spot.lat]),
    { units: "kilometers" },
  );
}

/**
 * 2点間の移動時間を分単位で推定
 */
function travelMinutes(a: RouteStop, b: RouteStop): number {
  const km = distanceKm(a, b);
  return Math.round((km / AVG_SPEED_KMH) * 60);
}

/**
 * 時刻を "HH:MM" 形式にフォーマット
 */
function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

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

  // 最初のスポットを選択（入力順の先頭）
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

  // 時刻を割り当て
  let currentMinutes = startHour * 60;
  return result.map((stop, i) => {
    if (i > 0) {
      currentMinutes += travelMinutes(result[i - 1], stop);
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
    total += travelMinutes(stops[i - 1], stops[i]);
  }
  return total;
}
