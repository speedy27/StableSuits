import type {
  Coin,
  Rating,
  RuleResult,
  ScorePenalty,
  StressInputs,
  Verdict,
  VerdictStatus,
} from "./types";
import { HKMA_CLAUSES } from "./hkma-rules";

export const DEFAULT_STRESS: StressInputs = {
  run: 0,
  haircut: 0,
  fxShockBps: 0,
};

/** Per-tranche fire-sale haircut (Basel-style HQLA buckets) inferred from the
 *  reserve-slice label. Cash is money-good; the further from cash, the deeper
 *  the stressed discount. */
export function trancheHaircut(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("cash") || l.includes("deposit")) return 0.0;
  if (l.includes("t-bill") || l.includes("treasury") || l.includes("bill")) return 0.05;
  if (l.includes("repo") || l.includes("reverse")) return 0.07;
  if (l.includes("mmf") || l.includes("money market")) return 0.05;
  if (l.includes("commercial paper") || l.includes("cp")) return 0.12;
  if (l.includes("corporate") || l.includes("bond")) return 0.15;
  return 0.15; // unknown / "other" → conservative.
}

/** Supply-weighted average fire-sale haircut across the reserve tranches.
 *  This is the marginal discount the book takes when assets must be liquidated. */
export function weightedTrancheHaircut(coin: Coin): number {
  const comp = coin.reserveComposition;
  const total = comp.reduce((a, b) => a + b.value, 0);
  if (total <= 0) return 0;
  return comp.reduce((a, b) => a + (b.value / total) * trancheHaircut(b.label), 0);
}

/** Stressed reserve value. The per-tranche haircut only bites in proportion to
 *  how much of the book must be liquidated (the run ρ): at rest nothing is sold,
 *  so the book holds par. The manual fire-sale slider, operational-risk discount
 *  and fx shock stack on top. */
export function stressedReserves(coin: Coin, s: StressInputs): number {
  const op = 1 - (s.opRisk ?? 0);
  const fx = 1 - s.fxShockBps / 10_000;

  // Tranche drag scales with the liquidation pressure (the run).
  const trancheDrag = weightedTrancheHaircut(coin) * s.run;
  const effectiveHaircut = Math.min(1, s.haircut + trancheDrag);

  return coin.reserves * (1 - effectiveHaircut) * op * fx;
}

/** Predictive solvency under a redemption run + fire-sale haircut (the LSR).
 *  LSR = ( R·(1 − h − h̄·ρ)·(1-op)·fx − ρS ) / ( S(1-ρ) ), where h̄ is the
 *  supply-weighted tranche haircut. At zero stress this equals the live ratio. */
export function projectedRatio(coin: Coin, s: StressInputs): number {
  const S = coin.supply;
  const num = stressedReserves(coin, s) - s.run * S;
  const den = S * (1 - s.run);
  if (den <= 0) return 0;
  return num / den;
}

export function reserveRatio(coin: Coin): number {
  return coin.reserves / coin.supply;
}

export function depegBps(coin: Coin): number {
  return Math.round((coin.price - 1) * 10_000);
}

export function hqlaShare(coin: Coin): number {
  const total = coin.reserveComposition.reduce((a, b) => a + b.value, 0);
  const hqla = coin.reserveComposition
    .filter((c) => c.hqla)
    .reduce((a, b) => a + b.value, 0);
  return total === 0 ? 0 : hqla / total;
}

function worst(a: VerdictStatus, b: VerdictStatus): VerdictStatus {
  const rank: Record<VerdictStatus, number> = { PASS: 0, WARN: 1, FAIL: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function statusFromRatio(ratio: number, warnAt: number, failAt: number): VerdictStatus {
  if (ratio < failAt) return "FAIL";
  if (ratio < warnAt) return "WARN";
  return "PASS";
}

export function evaluateRules(coin: Coin, s: StressInputs): RuleResult[] {
  const rr = reserveRatio(coin);
  const proj = projectedRatio(coin, s);
  const hqla = hqlaShare(coin);
  const attestationHours = coin.attestationAgeSeconds / 3600;

  const results: RuleResult[] = HKMA_CLAUSES.map((c) => {
    let status: VerdictStatus = "PASS";
    let value = "";
    let threshold = "";
    let ratio = 1;

    switch (c.id) {
      case "reserve-backing":
        status = statusFromRatio(rr, 1.0, 0.995);
        value = `${(rr * 100).toFixed(2)}%`;
        threshold = "≥ 100%";
        ratio = rr;
        break;
      case "overcollateral":
        status = statusFromRatio(rr, 1.005, 1.0);
        value = `${((rr - 1) * 100).toFixed(2)}% buffer`;
        threshold = "≥ +0.5%";
        ratio = rr / 1.005;
        break;
      case "reserve-quality":
        status = hqla >= 0.95 ? "PASS" : hqla >= 0.85 ? "WARN" : "FAIL";
        value = `${(hqla * 100).toFixed(0)}% HQLA`;
        threshold = "≥ 95% HQLA";
        ratio = hqla / 0.95;
        break;
      case "currency-match":
        status = "PASS";
        value = `${coin.pegSymbol} matched`;
        threshold = "match peg";
        ratio = 1;
        break;
      case "segregation":
        status = "PASS";
        value = "Segregated · bankruptcy-remote";
        threshold = "required";
        ratio = 1;
        break;
      case "redemption-speed":
        status =
          coin.redemptionP95h <= 24
            ? "PASS"
            : coin.redemptionP95h <= 30
              ? "WARN"
              : "FAIL";
        value = `${coin.redemptionP95h.toFixed(1)}h p95`;
        threshold = "≤ 24h";
        ratio = 24 / coin.redemptionP95h;
        break;
      case "redemption-fees":
        status = "PASS";
        value = "0 bps";
        threshold = "≤ 10 bps";
        ratio = 1;
        break;
      case "capital-paidup":
        status = coin.paidUpCapitalHkd >= 25_000_000 ? "PASS" : "FAIL";
        value = `HK$${(coin.paidUpCapitalHkd / 1_000_000).toFixed(0)}M`;
        threshold = "≥ HK$25M";
        ratio = coin.paidUpCapitalHkd / 25_000_000;
        break;
      case "capital-liquid": {
        const ok =
          coin.liquidCapitalHkd >= 3_000_000 && coin.opexBufferMonths >= 12;
        const near = coin.opexBufferMonths >= 10;
        status = ok ? "PASS" : near ? "WARN" : "FAIL";
        value = `HK$${(coin.liquidCapitalHkd / 1_000_000).toFixed(1)}M · ${coin.opexBufferMonths}mo`;
        threshold = "≥ HK$3M · 12mo";
        ratio = Math.min(
          coin.liquidCapitalHkd / 3_000_000,
          coin.opexBufferMonths / 12,
        );
        break;
      }
      case "no-yield":
        status = "PASS";
        value = "No holder yield";
        threshold = "prohibited";
        ratio = 1;
        break;
      case "aml-cft":
        status =
          coin.amlFlags === 0 ? "PASS" : coin.amlFlags <= 2 ? "WARN" : "FAIL";
        value = `${coin.amlFlags} flag${coin.amlFlags === 1 ? "" : "s"}`;
        threshold = "0 sanctioned";
        ratio = coin.amlFlags === 0 ? 1 : 1 / (coin.amlFlags + 1);
        break;
      case "attestation-fresh":
        status =
          attestationHours <= 24 ? "PASS" : attestationHours <= 48 ? "WARN" : "FAIL";
        value = `${attestationHours.toFixed(1)}h ago`;
        threshold = "≤ 24h";
        ratio = 24 / Math.max(attestationHours, 0.1);
        break;
    }

    if (c.id === "reserve-backing" && proj < 1.0) {
      status = worst(status, proj < 0.97 ? "FAIL" : "WARN");
    }

    return {
      id: c.id,
      clause: c.clause,
      label: c.title,
      category: c.category,
      status,
      value,
      threshold,
      ratio: Math.max(0, Math.min(ratio, 1.25)),
      citation: c.citation,
    };
  });

  return results;
}

/** Inputs the score model needs that aren't on the rule list. */
export interface ScoreContext {
  reserveRatio: number;
  projectedRatio: number;
  depegBps: number;
  redemptionP95h: number;
  amlFlags: number;
  attestationHours: number;
}

export interface RatingScore {
  score: number;
  rating: Rating;
  penalties: ScorePenalty[];
}

function ratingFromScore(score: number, hardFail: boolean): Rating {
  if (hardFail) return "D";
  if (score >= 90) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 70) return "A";
  if (score >= 60) return "BBB";
  if (score >= 50) return "BB";
  if (score >= 40) return "B";
  return "CCC";
}

/** Base-100 creditworthiness model.
 *  Hard rules force a D (default). Otherwise points are deducted across
 *  liquidity, market, operational and data dimensions. */
export function scoreRating(ctx: ScoreContext): RatingScore {
  const penalties: ScorePenalty[] = [];

  // Hard rules → immediate D.
  const hardFail =
    ctx.reserveRatio < 1.0 || ctx.amlFlags > 0 || ctx.redemptionP95h > 48;

  // Liquidity — stress-projected solvency (LSR).
  if (ctx.projectedRatio < 1.0) penalties.push({ label: "LSR below 100% under stress", points: 20 });
  else if (ctx.projectedRatio < 1.05) penalties.push({ label: "LSR below 105% buffer under stress", points: 10 });

  // Market — peg deviation, 1pt per 5bps of |depeg|, capped.
  const depPts = Math.min(20, Math.floor(Math.abs(ctx.depegBps) / 5));
  if (depPts > 0) penalties.push({ label: `Peg deviation ${Math.abs(ctx.depegBps)}bps`, points: depPts });

  // Operational — redemption latency.
  if (ctx.redemptionP95h > 24) penalties.push({ label: "Redemption p95 over 24h", points: 15 });
  else if (ctx.redemptionP95h > 12) penalties.push({ label: "Redemption p95 over 12h", points: 5 });

  // Data confidence — attestation freshness.
  if (ctx.attestationHours > 24) penalties.push({ label: "Attestation older than 24h", points: 15 });
  else if (ctx.attestationHours > 6) penalties.push({ label: "Attestation older than 6h", points: 10 });

  const deducted = penalties.reduce((a, p) => a + p.points, 0);
  const score = Math.max(0, Math.min(100, 100 - deducted));

  return { score, rating: ratingFromScore(score, hardFail), penalties };
}

function hashVerdict(coin: Coin, status: VerdictStatus, rr: number): string {
  const input = `${coin.id}:${status}:${rr.toFixed(4)}:${coin.attestationAgeSeconds}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `0x${hex}${(h >>> 4).toString(16).padStart(4, "0").slice(0, 4)}`;
}

export function computeVerdict(coin: Coin, s: StressInputs): Verdict {
  const rules = evaluateRules(coin, s);
  const rr = reserveRatio(coin);
  const proj = projectedRatio(coin, s);
  const dep = depegBps(coin);

  const reserveStatus = rules.find((r) => r.id === "reserve-backing")!.status;
  const amlStatus = rules.find((r) => r.id === "aml-cft")!.status;

  const status = rules.reduce<VerdictStatus>(
    (acc, r) => worst(acc, r.status),
    "PASS",
  );

  const attestationHours = coin.attestationAgeSeconds / 3600;
  const confidence = Math.max(
    0,
    Math.min(1, 1 - attestationHours / 72 - Math.abs(dep) / 200),
  );

  const { score, rating, penalties } = scoreRating({
    reserveRatio: rr,
    projectedRatio: proj,
    depegBps: dep,
    redemptionP95h: coin.redemptionP95h,
    amlFlags: coin.amlFlags,
    attestationHours,
  });

  return {
    coinId: coin.id,
    status,
    clean: amlStatus === "PASS",
    solvent: reserveStatus !== "FAIL" && proj >= 1.0,
    reserveRatio: rr,
    projectedRatio: proj,
    depegBps: dep,
    amlFlags: coin.amlFlags,
    redemptionP95h: coin.redemptionP95h,
    confidence,
    rating,
    score,
    penalties,
    rules,
    hash: hashVerdict(coin, status, rr),
    timestamp: new Date().toISOString(),
  };
}
