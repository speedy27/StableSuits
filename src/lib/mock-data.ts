import type { Coin, ReserveSlice, SeriesPoint } from "./types";
import usdcHistory from "@/data/usdc-history-48.json";
import usdcAttestation from "@/data/usdc-attestation.json";

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeriesConfig {
  seed: number;
  baseRatio: number;
  ratioDrift: number;
  basePrice: number;
  priceWobble: number;
  redemptionBase: number;
  redemptionSpike?: number;
  stressLate?: boolean;
}

function buildSeries(cfg: SeriesConfig): SeriesPoint[] {
  const rnd = mulberry32(cfg.seed);
  const points: SeriesPoint[] = [];
  const N = 48;
  for (let i = 0; i < N; i++) {
    const phase = i / (N - 1);
    const noise = (rnd() - 0.5) * 2;
    let reserveRatio = cfg.baseRatio + noise * cfg.ratioDrift;
    if (cfg.stressLate && phase > 0.7) {
      reserveRatio -= (phase - 0.7) * 0.22;
    }
    const projectedRatio =
      reserveRatio - (0.06 + rnd() * 0.03) - (cfg.stressLate ? phase * 0.05 : 0);
    const price =
      cfg.basePrice + Math.sin(i * 0.6) * cfg.priceWobble + (rnd() - 0.5) * cfg.priceWobble;
    let redemptions = cfg.redemptionBase * (0.6 + rnd() * 0.8);
    if (cfg.redemptionSpike && phase > 0.78) {
      redemptions += cfg.redemptionSpike * (phase - 0.78) * 5;
    }
    const hour = i - (N - 1);
    points.push({
      t: `${hour}h`,
      reserveRatio: +reserveRatio.toFixed(4),
      projectedRatio: +Math.max(projectedRatio, 0.7).toFixed(4),
      price: +price.toFixed(4),
      redemptions: Math.round(redemptions),
    });
  }
  return points;
}

const HQLA = "var(--color-pass)";
const HQLA2 = "var(--color-chart-2)";
const NONHQLA = "var(--color-warn)";

function comp(slices: [string, number, boolean][]): ReserveSlice[] {
  const palette = [HQLA, HQLA2, "var(--color-chart-3)", NONHQLA];
  return slices.map(([label, value, hqla], i) => ({
    label,
    value,
    hqla,
    color: hqla ? palette[i % 3] : NONHQLA,
  }));
}

const USDC_HISTORY: SeriesPoint[] = usdcHistory.points as SeriesPoint[];

const USDC_RESERVE_COMP: ReserveSlice[] = usdcAttestation.composition.map(
  (s, i) => ({
    label: s.label,
    value: s.pct,
    hqla: s.hqla,
    color: s.hqla
      ? ["var(--color-pass)", "var(--color-chart-2)", "var(--color-chart-3)"][i % 3]
      : "var(--color-warn)",
  }),
);

export const COINS: Coin[] = [
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    issuer: "Circle Internet Financial",
    peg: "US Dollar",
    pegSymbol: "US$",
    chain: "Ethereum",
    contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    supply: usdcAttestation.supplyUsd,
    reserves: usdcAttestation.reserveUsd,
    price: USDC_HISTORY[USDC_HISTORY.length - 1].price,
    redemptionP95h: 0.25,
    amlFlags: 0,
    amlScreened: 12_480_000,
    attestedAt: usdcAttestation.attestedAt,
    attestationAgeSeconds: 0,
    paidUpCapitalHkd: 0,
    liquidCapitalHkd: 0,
    opexBufferMonths: 36,
    accent: "var(--color-chart-2)",
    reserveComposition: USDC_RESERVE_COMP,
    history: USDC_HISTORY,
  },
  {
    id: "anchor-hkd",
    symbol: "aHKD",
    name: "Anchorpoint HKD",
    issuer: "Anchorpoint Financial",
    peg: "Hong Kong Dollar",
    pegSymbol: "HK$",
    chain: "Ethereum",
    contract: "0x7a25aF1b4e09Cc2bD3F6e21d4A1c0b8E2f9D6a31",
    supply: 1_842_300_000,
    reserves: 1_851_900_000,
    price: 1.0003,
    redemptionP95h: 6.2,
    amlFlags: 0,
    amlScreened: 184_220,
    attestationAgeSeconds: 1_320,
    paidUpCapitalHkd: 320_000_000,
    liquidCapitalHkd: 41_000_000,
    opexBufferMonths: 19,
    accent: "var(--color-pass)",
    reserveComposition: comp([
      ["Cash @ HKMA AIs", 41, true],
      ["≤3M T-bills (HKSAR)", 38, true],
      ["≤3M bank deposits", 18, true],
      ["Overnight repo", 3, true],
    ]),
    history: buildSeries({
      seed: 11,
      baseRatio: 1.004,
      ratioDrift: 0.0016,
      basePrice: 1.0002,
      priceWobble: 0.0006,
      redemptionBase: 1200,
    }),
  },
  {
    id: "hsbc-hkd",
    symbol: "hkdR",
    name: "HSBC Reserve HKD",
    issuer: "HSBC (HK) Ltd",
    peg: "Hong Kong Dollar",
    pegSymbol: "HK$",
    chain: "Polygon",
    contract: "0x4Bd9C81e0fA77b2E1a3C5d8e9F0a2B4c6D7e8F90",
    supply: 3_410_000_000,
    reserves: 3_447_000_000,
    price: 1.0001,
    redemptionP95h: 4.1,
    amlFlags: 0,
    amlScreened: 421_880,
    attestationAgeSeconds: 640,
    paidUpCapitalHkd: 980_000_000,
    liquidCapitalHkd: 120_000_000,
    opexBufferMonths: 28,
    accent: "var(--color-chart-2)",
    reserveComposition: comp([
      ["Cash @ HKMA AIs", 52, true],
      ["≤1y HKSAR notes", 33, true],
      ["≤3M bank deposits", 15, true],
    ]),
    history: buildSeries({
      seed: 7,
      baseRatio: 1.0085,
      ratioDrift: 0.0011,
      basePrice: 1.0001,
      priceWobble: 0.0004,
      redemptionBase: 900,
    }),
  },
  {
    id: "ehkd-pilot",
    symbol: "eHKD",
    name: "Ensemble eHKD",
    issuer: "Ensemble Pilot Co",
    peg: "Hong Kong Dollar",
    pegSymbol: "HK$",
    chain: "Arbitrum",
    contract: "0x9F2a6C7b8D1e0F3a4B5c6D7e8F901a2B3c4D5e6F",
    supply: 612_400_000,
    reserves: 614_900_000,
    price: 0.9971,
    redemptionP95h: 17.4,
    amlFlags: 1,
    amlScreened: 73_540,
    attestationAgeSeconds: 29_400,
    paidUpCapitalHkd: 110_000_000,
    liquidCapitalHkd: 9_400_000,
    opexBufferMonths: 14,
    accent: "var(--color-warn)",
    reserveComposition: comp([
      ["Cash @ HKMA AIs", 33, true],
      ["≤3M T-bills", 36, true],
      ["≤3M deposits", 23, true],
      ["Money-market fund", 8, false],
    ]),
    history: buildSeries({
      seed: 23,
      baseRatio: 1.0042,
      ratioDrift: 0.0018,
      basePrice: 0.9985,
      priceWobble: 0.0019,
      redemptionBase: 700,
      redemptionSpike: 480,
    }),
  },
  {
    id: "redstone-usd",
    symbol: "rUSD",
    name: "Redstone USD",
    issuer: "Redstone Digital",
    peg: "US Dollar",
    pegSymbol: "US$",
    chain: "Base",
    contract: "0x2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d",
    supply: 248_900_000,
    reserves: 233_600_000,
    price: 0.9612,
    redemptionP95h: 41.8,
    amlFlags: 4,
    amlScreened: 51_120,
    attestationAgeSeconds: 96_400,
    paidUpCapitalHkd: 21_000_000,
    liquidCapitalHkd: 2_100_000,
    opexBufferMonths: 7,
    accent: "var(--color-fail)",
    reserveComposition: comp([
      ["Cash", 22, true],
      ["≤3M T-bills", 27, true],
      ["Corporate paper", 29, false],
      ["Crypto collateral", 22, false],
    ]),
    history: buildSeries({
      seed: 41,
      baseRatio: 1.001,
      ratioDrift: 0.002,
      basePrice: 0.992,
      priceWobble: 0.004,
      redemptionBase: 600,
      redemptionSpike: 900,
      stressLate: true,
    }),
  },
];

export const DEFAULT_COIN_ID = COINS[0].id;

export function getCoin(id: string): Coin {
  return COINS.find((c) => c.id === id) ?? COINS[0];
}
