# Honesty statement — StableSuite

> StableSuite = "Compliance-as-a-service" for regulated stablecoins.
> Continuous, machine-checkable verification that a stablecoin meets the
> HKMA regime (Stablecoins Ordinance, Cap. 656).

This document states plainly who built what, what genuinely runs end-to-end,
and every shortcut we took. No inflation, no hand-waving.

---

## 1. Team — who did what
Judges compare this against `git shortlog -sn`, so keep it honest.

| Member | GitHub handle | Main contributions |
|---|---|---|
|  |  |  |
|  |  |  |
|  |  |  |

---

## 2. What is fully working
Features that run end-to-end on the live app, with real data and real logic.

- **On-chain USDC ingestion** ([src/lib/eth-rpc.ts](src/lib/eth-rpc.ts), [src/app/api/usdc/onchain/route.ts](src/app/api/usdc/onchain/route.ts)) — raw JSON-RPC against Ethereum mainnet, zero deps. **Input:** USDC contract address. **Output:** live `totalSupply()`, recent mint/burn from Transfer logs, Uniswap V3 DEX price from `slot0()`, and Chainlink `latestRoundData()` price.
- **Live market price** ([src/app/api/usdc/price/route.ts](src/app/api/usdc/price/route.ts)) — server-side proxy to Binance. **Input:** `USDCUSDT` symbol. **Output:** current price + fetch timestamp (avoids browser CORS).
- **Compliance / verdict engine** ([src/lib/verdict-engine.ts](src/lib/verdict-engine.ts), [src/lib/hkma-rules.ts](src/lib/hkma-rules.ts)) — deterministic evaluation of the HKMA Cap. 656 rule pack. **Input:** a coin's data + stress inputs. **Output:** PASS/WARN/FAIL status, rating (AAA→D), confidence, reserve ratio, depeg in bps, `clean`/`solvent` flags.
- **Predictive stress-test** ([src/components/dashboard/stress-lab.tsx](src/components/dashboard/stress-lab.tsx), engine `projectRatio`) — the one user-input surface. **Input:** run / haircut / FX-shock sliders. **Output:** projected reserve ratio fed back into the live verdict and rating.
- **Signed verdict + live recompute** ([src/components/app/store.tsx](src/components/app/store.tsx)) — FNV-1a `hashVerdict`. **Input:** live coin state. **Output:** a hashed, signed verdict recomputed every 60 s with the real attestation age.
- **Multi-page dashboard** ([src/app/(app)](src/app/(app))) — Overview · Reserves · Stress · Compliance · AML · Oracle, rendering all of the above with charts and an HKMA-format report view.

---

## 3. What is mocked, stubbed, or hardcoded
Every shortcut. Sources marked _(prod: X)_ run on an accessible stand-in in the demo and swap to the production feed without touching the engine.

| What is faked | Where (file:line or folder) | Why we mocked it | What the real version would do |
|---|---|---|---|
| Market price source | [src/app/api/usdc/price/route.ts](src/app/api/usdc/price/route.ts) | | _(prod: Kaiko)_ — the most robust reference, able to cover even private stablecoins not normally queryable |
| Reserve composition & ratio | [src/data/usdc-attestation.json](src/data/usdc-attestation.json) | No live custodian API access; Circle attests monthly via Deloitte, `attestedAt` updated by hand | _(prod: read-only custodian API)_ + Chainlink PoR when a feed exists |
| AML / sanctions screening | [src/data/ofac-sdn.json](src/data/ofac-sdn.json) | Static OFAC SDN snapshot (real Lazarus / Tornado Cash / Suex addresses) | _(prod: live sanctions oracle)_ or Chainalysis `/isSanctioned` |
| 4 demo coins (aHKD, hkdR, eHKD, rUSD) | [src/lib/mock-data.ts](src/lib/mock-data.ts) | Need healthy / watch / default states to show the engine's range | Real on-chain + custodian data per coin |
| GENIUS & MiCA rule packs | [src/lib/hkma-rules.ts](src/lib/hkma-rules.ts) | Out of scope for the window; only HKMA is wired | `active: true` rule packs with their own clauses |
| Historical price series | [src/data/usdc-price-history.json](src/data/usdc-price-history.json), [src/data/usdc-history-48.json](src/data/usdc-history-48.json) | Static Binance klines snapshot (since the SVB depeg) | Streamed historical feed |
| On-chain verdict broadcast | engine output only | No contract deployed in the window | Oracle publishes the signed verdict so a smart contract applies it automatically |
| Operational-risk (code safety) input | folded into the verdict as a parameter | No live audit pipeline yet | Dowsers formal-verification audit feeding the score inside our licenses |

---

## 4. External APIs, services & data sources
Everything the project calls or pretends to call.

| Service / API / dataset | Used for | Real call or mocked? | Auth (sandbox / test key / none) |
|---|---|---|---|
| `ethereum.publicnode.com` JSON-RPC | Supply, mint/burn, DEX & Chainlink price | **Real** | None |
| Chainlink USDC/USD aggregator | On-chain reference price | **Real** (read via RPC) | None |
| Uniswap V3 USDC/USDT pool | DEX depeg signal (`slot0()`) | **Real** (read via RPC) | None |
| Circle / Deloitte attestation | Reserve composition & ratio | **Mocked** (static JSON) | None |
| OFAC SDN list | AML sanctions screening | **Mocked** (static snapshot, real addresses) | None |
| Kaiko | Market price (prod target) | **Mocked** (Binance used instead) | Would need API key |
| Custodian reserves API | Reserves (prod target) | **Mocked** (attestation JSON used) | Would need credentials |
| Chainlink Proof-of-Reserve | Trustless reserve proof | **Not integrated** (`porFeedAddress: null`) | None |

---

## 5. Pre-existing code
Anything written *before* kickoff that we brought into this project.

**Nothing was built before 8:56 AM on Saturday, June 6.** _Rien n'a été construit avant 8H56 du matin le 6 juin, samedi._ All application code (`src/lib`, `src/data`, `src/app`, the API routes, the engine and every dashboard component) was written during the hackathon window. The only non-authored material is standard scaffolding and third-party UI primitives:|

---

## 6. Known limitations & next steps
What we'd build next, and the weak spots we already know about.

- **Swap demo stand-ins for production feeds** — Kaiko for price, custodian API for reserves, a live sanctions oracle for AML. The engine is source-agnostic, so this is wiring, not redesign.
- **Wire the on-chain oracle broadcast** so a smart contract can consume the signed verdict directly, not just the dashboard.
- **Trustless reserves** — integrate Chainlink Proof-of-Reserve once a USDC feed exists, instead of the manually-updated monthly attestation or validate personnal data customer upload on the dashboard
- **Real operational-risk input** — connect the Dowsers formal-verification audit feeding the code-safety component of the verdict with NDA because its private
- **Activate the GENIUS & MiCA rule packs** to prove the multi-regime, currency-agnostic claim beyond HKMA.
- **Known weak spots:** `attestedAt` is hand-updated; the 4 non-USDC coins are fully synthetic; historical price is a static snapshot; the verdict signature is a fast FNV-1a hash, not yet a cryptographic signing key.

