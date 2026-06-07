# HONESTY.md
> Mandatory disclosure for the hackathon. This file lives at the root of your repository. Judges cross-check it against your code and your technical video.
>
> **The deal:** disclosed shortcuts are **not** penalized — that is the entire point of this file. Hidden ones are. Undisclosed pre-built code is heavily penalized, each undisclosed mock carries a small penalty, and a faked demo is heavily penalized. Telling the truth here costs you nothing.

---

## Honesty statement — StableSuits

StableSuits = "Compliance-as-a-service" for regulated stablecoins. Continuous, machine-checkable verification that a stablecoin meets the HKMA regime (Stablecoins Ordinance, Cap. 656).
This document states plainly who built what, what genuinely runs end-to-end, and every shortcut we took. No inflation, no hand-waving.

---

## 1. Team — who did what
Judges compare this against `git shortlog -sn`, so keep it honest.

| Member | GitHub handle | Main contributions |
|---|---|---|
| Mark-Killian | *[Insert Handle]* | Built the Quant compliance/verdict engine, live Liquidity Stress Ratio, and pricing logic. |
| Adrien | *[Insert Handle]* | Dashboard UI, full-stack integration, API routing, and system security architecture. |
| Armand | *[Insert Handle]* | On-chain USDC ingestion, smart contract logic preparation, and formal verification modeling. |

---

## 2. What is fully working
Features that run end-to-end on the live app, with real data and real logic. Be specific: name the feature, what input it takes, what output it produces.

*   **On-chain USDC ingestion** (`src/lib/eth-rpc.ts`, `src/app/api/usdc/onchain/route.ts`): Raw JSON-RPC against Ethereum mainnet, zero dependencies. 
    *   *Input:* USDC contract address. 
    *   *Output:* Live `totalSupply()`, recent mint/burn from Transfer logs, Uniswap V3 DEX price from `slot0()`, and Chainlink `latestRoundData()` price.
*   **Live market price proxy** (`src/app/api/usdc/price/route.ts`): Server-side proxy fetching live market data. 
    *   *Input:* USDCUSDT symbol. 
    *   *Output:* Current price + fetch timestamp (avoids browser CORS issues).
*   **Compliance / Verdict Engine** (`src/lib/verdict-engine.ts`, `src/lib/hkma-rules.ts`): Deterministic evaluation of the HKMA Cap. 656 rule pack. 
    *   *Input:* A coin's live data + stress inputs. 
    *   *Output:* PASS/WARN/FAIL status, rating (AAA→D), confidence score, reserve ratio, depeg in bps, clean/solvent flags.
*   **Predictive Stress-Test** (`src/components/dashboard/stress-lab.tsx`, engine `projectRatio`): The interactive user-input surface. 
    *   *Input:* Sliders for bank run / haircut / FX-shock. 
    *   *Output:* Projected reserve ratio fed dynamically back into the live verdict and rating.
*   **Signed verdict + live recompute** (`src/components/app/store.tsx`): FNV-1a `hashVerdict`. 
    *   *Input:* Live coin state. 
    *   *Output:* A hashed, signed verdict recomputed every 60s with the real attestation age.
*   **Multi-page Dashboard UI** (`src/app/(app)`): Rendering Overview, Reserves, Stress, Compliance, AML, and Oracle tabs with live charts and an HKMA-format report view.

---

## 3. What is mocked, stubbed, or hardcoded
Every shortcut. Sources marked (prod: X) run on an accessible stand-in in the demo and swap to the production feed without touching the engine.

| What is faked | Where (file:line or folder) | Why we mocked it | What the real version would do |
|---|---|---|---|
| **Market price source** | `src/app/api/usdc/price/route.ts` | No live Kaiko API key available in browser/hackathon scope. | **(Prod: Kaiko)** API for robust institutional reference price. |
| **Reserve composition** | `src/data/usdc-attestation.json` | No live custodian API access; Circle attests monthly via Deloitte. | **(Prod: Read-only custodian API)** + Chainlink PoR when a feed exists. |
| **AML / sanctions screening** | `src/data/ofac-sdn.json` | Requires paid API. Used a static OFAC SDN snapshot (real addresses used). | **(Prod: Live sanctions oracle)** like Chainalysis to dynamically flag addresses. |
| **4 synthetic demo coins** | `src/lib/mock-data.ts` | Needed healthy/watch/default states (aHKD, hkdR, eHKD, rUSD) to demonstrate engine range. | Real on-chain + custodian data parsing per coin. |
| **GENIUS & MiCA rules** | `src/lib/hkma-rules.ts` | Out of scope for the 48h window; only HKMA is wired. | Provide `active: true` rule packs for global regimes. |
| **Historical price series** | `src/data/usdc-price-history.json` | Static Binance klines snapshot (since SVB depeg) to avoid API rate limits. | Streamed historical WebSocket feed. |
| **On-chain verdict broadcast** | Engine output only | No contract deployed in the hackathon window. | Oracle publishes the signed verdict so a smart contract applies it automatically. |
| **Operational-risk** | Folded into verdict params | No live code audit pipeline exists publicly. | Directly integrate Dowsers' formal-verification audits into our engine. |

---

## 4. External APIs, services & data sources
Everything the project calls or pretends to call. Mark each as real or mocked.

| Service / API / dataset | Used for | Real call or mocked? | Auth (sandbox / test key / none) |
|---|---|---|---|
| **ethereum.publicnode.com** | Supply, mint/burn, DEX & Chainlink price | Real (JSON-RPC) | None |
| **Chainlink USDC/USD** | On-chain reference price | Real (read via RPC) | None |
| **Uniswap V3 USDC/USDT** | DEX depeg signal (`slot0()`) | Real (read via RPC) | None |
| **Binance API Proxy** | Stand-in for market price | Real | None |
| **Kaiko API** | Market price (Prod target) | Mocked (Using Binance proxy) | Would need API key |
| **Custodian API** | Reserves (Prod target) | Mocked (Circle JSON used) | Would need credentials |
| **OFAC SDN list** | AML sanctions screening | Mocked (Static snapshot) | None |
| **Chainlink PoR** | Trustless reserve proof | Mocked (`porFeedAddress: null`) | None |

---

## 5. Pre-existing code
Anything written **before** kickoff that we brought into this project: prior personal projects, forked open-source code, templates, boilerplate, internal libraries.

*All application code (`src/lib`, `src/data`, `src/app`, API routes, the Quant engine, and dashboard components) was written during the hackathon window (after 8:56 AM on Saturday, June 6, 2026).* 

The only non-authored material used is standard Next.js scaffolding and third-party UI primitives (shadcn/ui).

---

## 6. Known limitations & next steps
What we would build next, and the weak spots we already know about. Naming these honestly is a strength, not a flaw.

*   **Production Feed Swapping:** Swap our demo stand-ins for production feeds (Kaiko for pricing, Custodian API for reserves, and a live sanctions oracle for AML). The engine is source-agnostic, meaning this is a wiring update, not a redesign.
*   **On-Chain Execution:** Wire the on-chain oracle broadcast so a smart contract can consume the signed verdict directly, triggering automated liquidations or collateral freezes, rather than just displaying it on the dashboard.
*   **Trustless Reserves:** Integrate Chainlink Proof-of-Reserve (once a proper USDC fiat feed exists) to replace the manually updated monthly attestation data.
*   **Formal Verification Integration:** Connect the Dowsers formal-verification pipeline to feed the code-safety parameter of the verdict (currently restricted due to NDA and privacy constraints).
*   **Global Expansion:** Activate the GENIUS & MiCA rule packs to prove our multi-regime, currency-agnostic claim beyond the HKMA framework.
*   **Cryptographic Security:** Our current verdict signature is a fast FNV-1a hash; the next step is implementing a true cryptographic signing key for the oracle payload.
