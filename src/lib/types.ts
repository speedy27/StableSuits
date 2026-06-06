// ============================================================
// StableSuite — domain types
// Compliance-as-a-service for regulated stablecoins
// ============================================================

export type VerdictStatus = "PASS" | "WARN" | "FAIL";

export type Rating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";

export type Provenance = "onchain" | "attested" | "oracle" | "config";

export type RuleCategory =
  | "reserve"
  | "redemption"
  | "capital"
  | "aml"
  | "market"
  | "governance";

export interface DataSource {
  id: string;
  label: string;
  provenance: Provenance;
  ageSeconds: number;
  trusted: boolean;
  detail: string;
}

export interface RuleResult {
  id: string;
  clause: string;
  label: string;
  category: RuleCategory;
  status: VerdictStatus;
  value: string;
  threshold: string;
  ratio: number;
  citation: string;
}

export interface SeriesPoint {
  t: string;
  reserveRatio: number;
  projectedRatio: number;
  price: number;
  redemptions: number;
}

export interface ReserveSlice {
  label: string;
  value: number;
  hqla: boolean;
  color: string;
}

export interface StressInputs {
  run: number;
  haircut: number;
  fxShockBps: number;
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  issuer: string;
  peg: string;
  pegSymbol: string;
  chain: string;
  contract: string;
  supply: number;
  reserves: number;
  price: number;
  redemptionP95h: number;
  amlFlags: number;
  amlScreened: number;
  attestationAgeSeconds: number;
  paidUpCapitalHkd: number;
  liquidCapitalHkd: number;
  opexBufferMonths: number;
  reserveComposition: ReserveSlice[];
  history: SeriesPoint[];
  accent: string;
}

export interface Verdict {
  coinId: string;
  status: VerdictStatus;
  clean: boolean;
  solvent: boolean;
  reserveRatio: number;
  projectedRatio: number;
  depegBps: number;
  amlFlags: number;
  redemptionP95h: number;
  confidence: number;
  rating: Rating;
  rules: RuleResult[];
  hash: string;
  timestamp: string;
}
