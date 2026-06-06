import type { RuleCategory } from "./types";

// ============================================================
// HKMA Stablecoin Regime — Stablecoins Ordinance (Cap. 656)
// Effective 1 August 2025. Encoded as a machine-checkable rule pack.
// ============================================================

export interface RulePackMeta {
  id: string;
  name: string;
  shortName: string;
  basis: string;
  regulator: string;
  jurisdiction: string;
  effective: string;
  philosophy: string;
  active: boolean;
}

export const RULE_PACKS: RulePackMeta[] = [
  {
    id: "hkma",
    name: "HKMA Stablecoin Regime",
    shortName: "HKMA",
    basis: "Stablecoins Ordinance, Cap. 656",
    regulator: "Hong Kong Monetary Authority",
    jurisdiction: "Hong Kong SAR",
    effective: "1 Aug 2025",
    philosophy: "Same activity, same risks, same regulation.",
    active: true,
  },
  {
    id: "genius",
    name: "GENIUS Act",
    shortName: "GENIUS",
    basis: "US Federal stablecoin framework",
    regulator: "US Treasury / OCC",
    jurisdiction: "United States",
    effective: "2025",
    philosophy: "1:1 HQLA, monthly attestation.",
    active: false,
  },
  {
    id: "mica",
    name: "MiCA — EMT / ART",
    shortName: "MiCA",
    basis: "Regulation (EU) 2023/1114",
    regulator: "EBA / ESMA",
    jurisdiction: "European Union",
    effective: "2024",
    philosophy: "E-money & asset-referenced tokens.",
    active: false,
  },
];

export interface HkmaClause {
  id: string;
  clause: string;
  title: string;
  category: RuleCategory;
  requirement: string;
  check: string;
  citation: string;
}

export const HKMA_CLAUSES: HkmaClause[] = [
  {
    id: "reserve-backing",
    clause: "§ Reserve backing",
    title: "100% reserve backing at all times",
    category: "reserve",
    requirement:
      "Stablecoins must be backed at least 100% by reserve assets at all times.",
    check: "reserveRatio >= 1.00",
    citation: "Stablecoins Ordinance — Reserve backing",
  },
  {
    id: "overcollateral",
    clause: "§ Overcollateralization",
    title: "Buffer above par",
    category: "reserve",
    requirement:
      "Issuers are expected to maintain overcollateralization as a buffer against volatility, operating costs and liquidity stress.",
    check: "reserveRatio >= 1.005",
    citation: "Stablecoins Ordinance — Overcollateralization expectation",
  },
  {
    id: "reserve-quality",
    clause: "§ Reserve asset quality",
    title: "High-quality, highly liquid assets",
    category: "reserve",
    requirement:
      "Reserves must consist of cash, ≤3-month bank deposits, and government / central-bank securities with ≤1y residual maturity.",
    check: "hqlaShare >= 0.95",
    citation: "Stablecoins Ordinance — Eligible reserve assets",
  },
  {
    id: "currency-match",
    clause: "§ Currency matching",
    title: "Reserve currency matches the peg",
    category: "reserve",
    requirement:
      "Reserve assets must match the reference currency of the stablecoin.",
    check: "currencyMatched == true",
    citation: "Stablecoins Ordinance — Currency matching",
  },
  {
    id: "segregation",
    clause: "§ Reserve segregation",
    title: "Segregated & insolvency-remote",
    category: "governance",
    requirement:
      "Reserve assets must be segregated from the issuer's own assets and shielded from creditor claims on insolvency.",
    check: "segregated == true && insolvencyRemote == true",
    citation: "Stablecoins Ordinance — Segregation & insolvency protection",
  },
  {
    id: "redemption-speed",
    clause: "§ Redemption speed",
    title: "Redeem at par within 1 business day",
    category: "redemption",
    requirement:
      "Holders may redeem at par; redemption must generally be processed within one business day.",
    check: "redemptionP95h <= 24",
    citation: "Stablecoins Ordinance — Redemption right & speed",
  },
  {
    id: "redemption-fees",
    clause: "§ Redemption fees",
    title: "No unreasonable redemption friction",
    category: "redemption",
    requirement:
      "Issuers cannot impose unreasonable fees or burdensome redemption conditions.",
    check: "redemptionFeeBps <= 10",
    citation: "Stablecoins Ordinance — Redemption conditions",
  },
  {
    id: "capital-paidup",
    clause: "§ Capital — paid-up",
    title: "≥ HK$25M paid-up share capital",
    category: "capital",
    requirement:
      "Licensed issuers must maintain at least HK$25 million paid-up share capital.",
    check: "paidUpCapitalHkd >= 25_000_000",
    citation: "Stablecoins Ordinance — Capital requirements",
  },
  {
    id: "capital-liquid",
    clause: "§ Capital — liquid",
    title: "≥ HK$3M liquid + 12-month opex",
    category: "capital",
    requirement:
      "At least HK$3 million liquid capital plus a 12-month operating-expense buffer.",
    check: "liquidCapitalHkd >= 3_000_000 && opexBufferMonths >= 12",
    citation: "Stablecoins Ordinance — Liquid capital & opex buffer",
  },
  {
    id: "no-yield",
    clause: "§ Yield / interest",
    title: "No interest to holders",
    category: "governance",
    requirement:
      "Issuers are prohibited from paying interest or interest-like incentives to holders.",
    check: "paysYield == false",
    citation: "Stablecoins Ordinance — Yield prohibition",
  },
  {
    id: "aml-cft",
    clause: "§ AML / CFT",
    title: "Zero sanctioned exposure",
    category: "aml",
    requirement:
      "Licensed issuers must comply with HKMA AML/CFT guidelines aligned with FATF and FSB standards.",
    check: "amlFlags == 0",
    citation: "Stablecoins Ordinance — AML/CFT treatment",
  },
  {
    id: "attestation-fresh",
    clause: "§ Disclosure",
    title: "Fresh reserve attestation",
    category: "governance",
    requirement:
      "Reserve-vs-supply position must be disclosed on a timely basis to maintain confidence.",
    check: "attestationAgeHours <= 24",
    citation: "Stablecoins Ordinance — Disclosure & risk management",
  },
];
