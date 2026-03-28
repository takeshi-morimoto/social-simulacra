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
  industry_distribution: ChartSegment[];
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
