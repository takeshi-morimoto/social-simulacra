export type Stance = "賛成" | "条件付き賛成" | "反対" | "中立";

export interface Persona {
  id: number;
  name: string;
  age: number;
  role: string;
  icon: string;
  color: string;
  bg: string;
  detail: string;
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
}

export type StanceCounts = Record<Stance, number>;
