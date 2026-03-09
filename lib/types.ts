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

export interface PolicyProposal {
  title: string;
  description: string;
  reason: string;
}

export type ProposalResults = Record<number, PolicyProposal>;
