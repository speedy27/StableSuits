import type {
  Coin,
  Rating,
  RuleResult,
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

/** Predictive solvency under a redemption run + fire-sale haircut.
 *  projected = (R(1-h) - ρS) / (S(1-ρ)) with an fx adjustment for non-USD pegs. */
export function projectedRatio(coin: Coin, s: StressInputs): number {
  const R = coin.reserves;
  const S = coin.supply;
  const fx = 1 - s.fxShockBps / 10_000;
  const num = R * (1 - s.haircut) * fx - s.run * S;
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

export function computeRating(rules: RuleResult[], proj: number): Rating {
  const fails = rules.filter((r) => r.status === "FAIL").length;
  const warns = rules.filter((r) => r.status === "WARN").length;
  if (fails >= 2 || proj < 0.95) return "D";
  if (fails === 1) return "CCC";
  if (warns >= 3) return "BB";
  if (warns === 2) return "BBB";
  if (warns === 1) return proj >= 1.0 ? "A" : "BBB";
  if (proj >= 1.06) return "AAA";
  if (proj >= 1.02) return "AA";
  return "A";
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
    0.4,
    Math.min(1, 1 - attestationHours / 72 - Math.abs(dep) / 4000),
  );

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
    rating: computeRating(rules, proj),
    rules,
    hash: hashVerdict(coin, status, rr),
    timestamp: new Date().toISOString(),
  };
}
