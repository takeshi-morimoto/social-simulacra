import type { CampaignSpot, SpotType, TimeSlot } from "./types";

// 時間帯×スポット種別のスコアマトリクス (0-100)
const SCORE_MATRIX: Record<SpotType, Record<TimeSlot, number>> = {
  station:  { early_morning: 40, morning: 95, midday: 30, afternoon: 30, evening: 90, night: 25 },
  park:     { early_morning: 15, morning: 40, midday: 85, afternoon: 75, evening: 50, night: 10 },
  shelter:  { early_morning: 10, morning: 50, midday: 70, afternoon: 65, evening: 45, night: 10 },
  landmark: { early_morning: 10, morning: 35, midday: 80, afternoon: 70, evening: 45, night: 15 },
};

export function getSpotScore(type: SpotType, timeSlot: TimeSlot): number {
  return SCORE_MATRIX[type]?.[timeSlot] ?? 0;
}

export function scoreSpots(spots: CampaignSpot[], timeSlot: TimeSlot): CampaignSpot[] {
  return spots.map((spot) => ({
    ...spot,
    score: getSpotScore(spot.type, timeSlot),
  }));
}

export function getTimeSlotForHour(hour: number): TimeSlot {
  if (hour < 7) return "early_morning";
  if (hour < 10) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}
