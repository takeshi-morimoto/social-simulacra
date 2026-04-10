export type Stance = "強く賛成" | "賛成" | "条件付き賛成" | "中立" | "反対" | "強く反対";

export interface Persona {
  id: number;
  name: string;
  age: number;
  role: string;
  icon: string;
  color: string;
  bg: string;
  detail: string;
  personality: string;
  concern: string;
}

export interface VoterPersona extends Persona {
  gender: string;
  voterTurnoutWeight: number;
  ageGroup: string;
  desiredPolicy?: string;
}

export interface PersonaResponse {
  opinion: string;
  stance: Stance;
  tags: string[];
}

export interface AnalysisResponse {
  overall: string;
  risks: string[];
  recommendations: string[];
  approval_rate: number;
  share_comment: string;
}

export interface ElectionAnalysisResponse extends AnalysisResponse {
  raw_approval_rate: number;
  weighted_approval_rate: number;
  age_group_breakdown: AgeGroupResult[];
}

export interface AgeGroupResult {
  ageGroup: string;
  count: number;
  approval_rate: number;
  weighted_approval_rate: number;
  stanceCounts: StanceCounts;
}

export type StanceCounts = Record<Stance, number>;

export interface ChartSegment {
  name: string;
  value: number;
}

export interface DemographicProfile {
  population: string;
  aging_rate: string;
  main_industries: string[];
  foreign_rate: string;
  household_features: string;
  rationale: string;
  age_distribution: ChartSegment[];
  gender_distribution: ChartSegment[];
  /** 産業構成（就業者比率ベース） */
  industry_distribution: ChartSegment[];
  /** 産業構成（売上ベース・経済規模の観点） */
  industry_sales_distribution?: ChartSegment[];
  /** 将来有権者（数年先に有権者となる15〜17歳）の人数。 */
  future_voter_population?: string;
}

export interface VoterTurnoutRate {
  ageGroup: string;
  male: number;
  female: number;
  overall: number;
}

export interface ElectionDemographicProfile extends DemographicProfile {
  voter_population: string;
  voter_turnout_rates: VoterTurnoutRate[];
  voter_age_distribution: ChartSegment[];
}

export interface CandidateProfile {
  name: string;
  party: string;
  district: string;
  platform: string;
}

export interface CustomData {
  text: string;
}

export type AgeGroupFilter = "all" | "18〜29歳" | "30〜44歳" | "45〜64歳" | "65歳以上";

// --- 遊説コース作成 ---

export type SpotType = "station" | "park" | "shelter" | "landmark" | "shopping" | "public_hall";
export type TimeSlot = "early_morning" | "morning" | "midday" | "afternoon" | "evening" | "night";

export interface CampaignSpot {
  id: string;
  name: string;
  type: SpotType;
  lat: number;
  lng: number;
  address?: string;
  properties: Record<string, unknown>;
  score: number;
}

export interface RouteStop {
  spotId: string;
  spot: CampaignSpot;
  order: number;
  startTime: string;
  duration: number;
}

export interface CampaignDay {
  dayNumber: number;
  stops: RouteStop[];
}

export const TIME_SLOTS = [
  { key: "early_morning" as const, label: "早朝 (5-7時)", hours: [5, 7] as const },
  { key: "morning" as const, label: "朝 (7-10時)", hours: [7, 10] as const },
  { key: "midday" as const, label: "昼 (10-14時)", hours: [10, 14] as const },
  { key: "afternoon" as const, label: "午後 (14-17時)", hours: [14, 17] as const },
  { key: "evening" as const, label: "夕方 (17-20時)", hours: [17, 20] as const },
  { key: "night" as const, label: "夜 (20-22時)", hours: [20, 22] as const },
] as const;
