# StableSuite — Guide d'explication (`explain.md`)

> **StableSuite** = « Compliance-as-a-service » pour stablecoins régulés.
> L'app vérifie, en continu et de façon *machine-checkable*, qu'un stablecoin
> respecte le régime de la **HKMA** (Stablecoins Ordinance, Cap. 656).

---

## 0. Comment lire ce document

- L'app est un **tableau de bord à page unique** (Next.js App Router). Les
  « pages » décrites ci-dessous sont les **panneaux / vues (onglets)**.
- Chaque vue suit la structure :
  **Résumé** → **Détail** (Ce qu'on y voit · Où l'on saisit la donnée ·
  Formules · Base réglementaire & scientifique).

### Données : d'où elles viennent

Le type `DataSource.provenance` (`src/lib/types.ts`) distingue 4 origines :

| Provenance | Sens | Saisie utilisateur ? |
|------------|------|----------------------|
| `onchain`  | Lue directement sur la blockchain (supply, contrat, DEX price) | Non |
| `attested` | Attestation d'un auditeur/issuer (réserves, composition) | Non |
| `oracle`   | Flux de prix marché (Binance, Uniswap) | Non |
| `config`   | Paramètres du *rule pack* | Non |

➡️ **Le seul endroit où l'utilisateur saisit réellement de la donnée** est le
panneau **Stress-test** (sliders `run`, `haircut`, `fxShockBps`). Tout le reste
est *observé* (onchain / attesté / oracle), pas tapé à la main.

### Légende des verdicts
`VerdictStatus = "PASS" | "WARN" | "FAIL"` — agrégés par la fonction `worst()`
(le pire statut l'emporte). `Rating` : échelle `AAA → AA → A → BBB → BB → B → CCC → D`.

---

## 0bis. Couche données réelles (USDC)

Pour le coin **USDC**, toutes les données sont réelles — aucune n'est synthétique.

### Prix marché — trois sources indépendantes

| Source | Provenance | Rôle | Endpoint |
|--------|-----------|------|---------|
| **Binance USDC/USDT** klines journaliers | oracle CEX | Historique depuis le dépeg SVB du **11 mars 2023** (low à 0.882) — 1 184 chandeliers | `src/data/usdc-price-history.json` |
| **Binance** ticker live | oracle CEX | Prix courant, proxy Next.js (évite CORS) | `GET /api/usdc/price` |
| **Uniswap V3** USDC/USDT pool 0.01 % (`0x3416…`) | onchain trustless | Signal dépeg DEX via `slot0()` → sqrtPriceX96 | `GET /api/usdc/onchain` |
| **Chainlink USDC/USD** (`0x8fFf…8f6`) | oracle on-chain | Prix agrégé par réseau de nœuds décentralisé — 8 décimales, `updatedAt` + `roundId` on-chain | `GET /api/usdc/onchain` |

Trois sources indépendantes = trois angles pour détecter un dépeg avant qu'il soit visible sur une seule plateforme.

### Données on-chain Ethereum (nœud public `ethereum.publicnode.com`)

Implémentées en JSON-RPC brut, sans dépendance externe (`src/lib/eth-rpc.ts`) :

| Donnée | Appel RPC | Valeur type |
|--------|-----------|-------------|
| **Supply totale** | `eth_call` → `totalSupply()` selector `0x18160ddd` sur `0xA0b8…eB48` (6 décimales) | $51.70B |
| **Mint** | `eth_getLogs` Transfer `from = 0x0` sur les 500 derniers blocs (~100 min) | ~100 events |
| **Burn** | `eth_getLogs` Transfer `to = 0x0` sur les 500 derniers blocs | ~90 events |
| **Prix DEX** | `eth_call` → `slot0()` Uniswap V3 pool, décodage sqrtPriceX96 | 1.000159 |
| **Prix Chainlink** | `eth_call` → `latestRoundData()` selector `0xfeaf968c` — `answer` (8 dec) + `updatedAt` + `roundId` | 0.999657 |

Route API : `GET /api/usdc/onchain` — cache 60 s. Retourne `{ supply, dexPrice, chainlink: { price, updatedAt, roundId }, recentMints, recentBurns, net500BlockMint }`.

### Attestation des réserves (Circle / Deloitte) et Chainlink PoR

**Situation Chainlink Proof of Reserve pour USDC :**
Circle n'a pas de feed Chainlink PoR public sur Ethereum mainnet pour ses réserves natives. Circle utilise exclusivement Deloitte pour ses rapports mensuels. Le champ `porFeedAddress: null` dans l'API le signale explicitement — l'architecture est prête pour l'intégrer si un feed est créé.

Fichier `src/data/usdc-attestation.json` — **données attestées, non vérifiables trustless** :
- Composition (73 % T-bills ≤3M, 11 % cash, 16 % notes ≤1Y)
- Ratio ($52.1B réserves / $51.69B supply = 1.0079)
- `attestedAt` : date du dernier rapport mensuel Circle (mis à jour manuellement ~le 15 du mois)
- `reportLabel` : libellé humain du rapport (ex. `"May 2026 Monthly Attestation"`)

Route API : `GET /api/usdc/attestation` — cache 1 h. Retourne l'attestation + `ageSeconds` calculé server-side + `porFeedAddress: null`.

Le champ `attestedAt` alimente le badge de fraîcheur et la règle `attestation-fresh`.
L'âge est calculé **dynamiquement en live** côté client via un tick 60 s dans `StoreProvider`
(voir §0ter) — aucune valeur hardcodée.

### Liste OFAC SDN (`src/data/ofac-sdn.json`)

8 adresses crypto réelles issues de la liste SDN de l'OFAC (US Treasury) :
Lazarus Group (DPRK), Tornado Cash, Suex OTC. Alimente la règle `aml-cft`.
En production : query OFAC API ou Chainalysis `/isSanctioned`.

---

## 0ter. Architecture live — `StoreProvider` et tick d'attestation

`src/components/app/store.tsx` gère l'état global et le calcul live :

```
useState(now = 0)
  useEffect → setNow(Date.now()) immédiatement, puis setInterval 60s
  
coin.attestedAt présent ?
  → withLiveAttestationAge(coin, now)
    → coin.attestationAgeSeconds = Math.floor((now - attestedAt) / 1000)
  sinon → coin inchangé (coins mock avec valeur statique)

liveCoin → computeVerdict(liveCoin, stress)
```

- **SSR** : `now = 0`, `attestationAgeSeconds` reste à 0 (valeur placeholder USDC) —
  pas de `Date.now()` côté serveur, zéro hydration mismatch.
- **Client au mount** : `useEffect` set `now` immédiatement, le verdict recalcule avec
  l'âge réel. `suppressHydrationWarning` sur le span `verdict.hash` dans la topbar
  couvre le seul tick de transition.
- **Toutes les 60 s** : `now` progresse, l'âge de l'attestation progresse, le hash tourne.

---

## 1. Vue « Sélecteur » (shell global)

### Résumé
Barre de navigation : on choisit **quel stablecoin** auditer et **quel cadre
réglementaire** (*rule pack*) appliquer.

### Détail

**Ce qu'on y voit**
- La liste des 5 coins (`src/lib/mock-data.ts`) :
  - `USDC` — USD Coin (Ethereum, Circle) — **données réelles** (Binance + RPC + attestation)
  - `aHKD` — Anchorpoint HKD (Ethereum) — sain, données synthétiques
  - `hkdR` — HSBC Reserve HKD (Polygon) — sain, données synthétiques
  - `eHKD` — Ensemble eHKD (Arbitrum) — sous surveillance (1 flag AML, dépeg léger)
  - `rUSD` — Redstone USD (Base) — en défaut (sous-collatéralisé, 4 flags AML)
- Le *rule pack* actif : **HKMA** (les packs **GENIUS** et **MiCA** existent mais
  sont `active: false`, cf. `RULE_PACKS`).

**Remarque sur USDC / HKMA** : USDC est régulé US (NYDFS / GENIUS Act). Il échoue
les clauses HKMA `capital-paidup` et `capital-liquid` car Circle n'est pas un émetteur
agréé HKMA (`paidUpCapitalHkd: 0`). C'est correct et voulu — le dashboard montre
qu'un coin US-conforme n'est pas automatiquement HKMA-conforme.

**Où l'on saisit la donnée**
- Sélection du coin (clic) ; sélection du rule pack (toggle). Aucune saisie libre.

**Formules** — aucune (navigation).

**Base réglementaire & scientifique**
- Métadonnées des cadres (`RULE_PACKS`, `src/lib/hkma-rules.ts`) :
  - **HKMA** — Stablecoins Ordinance, **Cap. 656**, effectif **1 août 2025**.
  - **GENIUS Act** — cadre fédéral US (US Treasury / OCC).
  - **MiCA** — **Regulation (EU) 2023/1114** (EMT / ART, EBA / ESMA).
    Pour USDC sous MiCA : classé EMT, Circle détient une licence EMI ACPR (France),
    mais l'Article 23 impose des caps de volume (€200M/j) sur les EMT non-euro.

---

## 2. Vue « Verdict » (synthèse / overview)

### Résumé
Le verdict global du coin : statut PASS/WARN/FAIL, *rating* (AAA→D), niveau de
confiance, badges « clean » (AML) et « solvent », empreinte signée et horodatage.

### Détail

**Ce qu'on y voit** — objet `Verdict` (`computeVerdict`, `src/lib/verdict-engine.ts`) :
- `status` : pire statut parmi les 12 règles.
- `rating` : note synthétique (`computeRating`).
- `confidence` : 0–1, dégradée par l'ancienneté de l'attestation et le dépeg.
- `clean` : `true` si la règle AML passe.
- `solvent` : `true` si la réserve ne FAIL pas **et** ratio projeté ≥ 1.
- KPI d'en-tête : `reserveRatio`, `projectedRatio`, `depegBps`, `amlFlags`,
  `redemptionP95h`.
- `hash` + `timestamp` : empreinte vérifiable du verdict.

**Où l'on saisit la donnée** — aucune (tout est calculé / dérivé).

**Formules** (`src/lib/verdict-engine.ts`)

- Ratio de réserve :
  $$\text{reserveRatio} = \frac{R}{S} = \frac{\text{reserves}}{\text{supply}}$$
- Écart au *peg* (en points de base) :
  $$\text{depegBps} = \mathrm{round}\big((\text{price} - 1)\times 10\,000\big)$$
- Confiance :
  $$\text{confidence} = \mathrm{clamp}\Big(1 - \frac{t_{att}}{72} - \frac{|\text{depegBps}|}{4000},\; 0.4,\; 1\Big)$$
  où $t_{att}$ = ancienneté de l'attestation en heures.
- Agrégation : `worst(a,b)` avec le rang `PASS=0 < WARN=1 < FAIL=2`.
- *Rating* (`computeRating`, sur le nb de FAIL/WARN et le ratio projeté `proj`) :
  - `FAIL ≥ 2` **ou** `proj < 0.95` → **D**
  - `1 FAIL` → **CCC**
  - `≥3 WARN` → **BB** · `2 WARN` → **BBB** · `1 WARN` → **A**/**BBB**
  - sinon : `proj ≥ 1.06` → **AAA** · `proj ≥ 1.02` → **AA** · sinon **A**
- Empreinte : hash **FNV-1a 32 bits** sur
  `id:status:reserveRatio:attestationAge` (`hashVerdict`).

**Base réglementaire & scientifique**
- L'arbre de décision encode les seuils de la **Stablecoins Ordinance (Cap. 656)**.
- L'échelle de notation s'inspire des **rating ladders** des agences de notation
  (mapping qualitatif PASS/WARN/FAIL → AAA…D), adaptée au risque stablecoin.

---

## 3. Vue « Stress-test » — ⭐ la page de saisie

### Résumé
**Le seul écran où l'utilisateur entre des données.** Trois curseurs simulent un
choc : ruée au rachat, décote de liquidation, choc de change. Le verdict et le
ratio projeté se recalculent en direct.

### Détail

**Ce qu'on y voit** — entrées `StressInputs` (`src/lib/types.ts`) :
- `run` (ρ) — fraction de l'offre rachetée d'un coup (défaut **0.20** = 20 %).
- `haircut` (h) — décote « fire-sale » sur les réserves (défaut **0.04** = 4 %).
- `fxShockBps` — choc de change en points de base (défaut **0**).
- Le résultat **`projectedRatio`** et l'impact sur la note s'affichent en direct.

**Où l'on saisit la donnée**
- Sliders `run`, `haircut`, `fxShockBps` (composant `src/components/ui/slider.tsx`).

**Formule — solvabilité prédictive sous ruée + décote** (`projectedRatio`)

$$
\text{projected} = \frac{R\,(1-h)\,\text{fx} - \rho\,S}{S\,(1-\rho)},
\qquad \text{fx} = 1 - \frac{\text{fxShockBps}}{10\,000}
$$

avec $R$ = réserves, $S$ = offre, $\rho$ = `run`, $h$ = `haircut`.
Si le dénominateur ≤ 0 → 0.

**Base réglementaire & scientifique**
- *Réglementaire* : teste l'exigence de **backing ≥ 100 %** (Cap. 656, `reserve-backing`)
  sous conditions de stress.
- *Lignée scientifique* :
  - **Diamond & Dybvig (1983)** — modèle canonique de ruée bancaire (terme $\rho$).
  - **Basel III / BCBS (2013)** — logique LCR (couverture sous sorties de trésorerie).
  - **Shleifer & Vishny (2011)** — justification de la décote $h$.

---

## 4. Vue « Réserves » (composition & qualité)

### Résumé
Décomposition des actifs de réserve et part d'actifs **HQLA** vs non-HQLA.

### Détail

**Ce qu'on y voit** — `reserveComposition: ReserveSlice[]` :
- Un *donut* des tranches. Pour USDC : données Circle réelles (73 % T-bills ≤3M,
  11 % cash, 16 % notes ≤1Y — source `src/data/usdc-attestation.json`).
- Le drapeau `hqla` (booléen) par tranche, couleur PASS si HQLA, WARN sinon.
- La part HQLA agrégée et la comparaison réserves vs offre.

**Où l'on saisit la donnée** — aucune (provenance `attested`).

**Formule — part HQLA** (`hqlaShare`)

$$
\text{hqlaShare} = \frac{\sum_{i \,:\, \text{hqla}_i} v_i}{\sum_i v_i}
$$

Règle `reserve-quality` : `PASS` si ≥ 95 %, `WARN` si ≥ 85 %, sinon `FAIL`.

**Base réglementaire & scientifique**
- **Stablecoins Ordinance — Eligible reserve assets** : réserves = cash, dépôts ≤ 3 mois,
  titres d'État à maturité ≤ 1 an.
- Notion de **HQLA** issue de **Basel III (LCR)**.

---

## 5. Vue « Historique » (séries temporelles)

### Résumé
Graphiques sur 48 ticks : ratio de réserve, ratio projeté, prix (peg) et volume de
rachats — pour repérer une dérive ou un stress qui monte.

### Détail

**Ce qu'on y voit** — `history: SeriesPoint[]` (48 points) :
- `reserveRatio` et `projectedRatio` (aire/ligne),
- `price` (suivi du peg),
- `redemptions` (volume, avec *spikes* simulés sur les coins mock).

**Données selon le coin**

| Coin | Source du prix (`price`) | Labels de l'axe X |
|------|--------------------------|-------------------|
| **USDC** | Vrais prix de clôture Binance USDC/USDT (48 derniers jours) | `"Apr 20"`, `"Apr 21"`, … |
| aHKD / hkdR / eHKD / rUSD | Synthétique — PRNG mulberry32 graine fixe | `"-47h"`, `"-46h"`, … |

Pour USDC, les 48 points viennent de `src/data/usdc-history-48.json`
(extrait de `src/data/usdc-price-history.json` — 1 184 chandeliers journaliers
depuis le **dépeg SVB du 11 mars 2023**, low à 0.882 USD).

**Formules / génération** (`buildSeries`, `src/lib/mock-data.ts`)
- Coins mock : PRNG **mulberry32** (graine fixe) — dérive autour d'un `baseRatio`,
  dégradation tardive optionnelle (`stressLate`), pics de rachat (`redemptionSpike`).
- USDC : prix réels, `reserveRatio` / `projectedRatio` / `redemptions` restent
  réalistes mais simulés (pas de feed temps réel pour ces métriques en MVP).

**Base réglementaire & scientifique**
- Surveillance continue de la **stabilité du peg** et de la **couverture** —
  esprit « disclosure on a timely basis » (Cap. 656, clause `attestation-fresh`).

---

## 6. Vue « Règles » (checklist de conformité HKMA)

### Résumé
La liste des **12 clauses HKMA** évaluées une à une : statut, valeur observée,
seuil, barre de conformité et citation réglementaire.

### Détail

**Ce qu'on y voit** — `RuleResult[]` (`evaluateRules`), une ligne par clause :

| # | Clause (`check`) | Seuil | Catégorie |
|---|------------------|-------|-----------|
| 1 | `reserve-backing` — `reserveRatio >= 1.00` | ≥ 100 % | reserve |
| 2 | `overcollateral` — `reserveRatio >= 1.005` | ≥ +0.5 % | reserve |
| 3 | `reserve-quality` — `hqlaShare >= 0.95` | ≥ 95 % HQLA | reserve |
| 4 | `currency-match` — `currencyMatched == true` | match peg | reserve |
| 5 | `segregation` — `segregated && insolvencyRemote` | requis | governance |
| 6 | `redemption-speed` — `redemptionP95h <= 24` | ≤ 24 h | redemption |
| 7 | `redemption-fees` — `redemptionFeeBps <= 10` | ≤ 10 bps | redemption |
| 8 | `capital-paidup` — `paidUpCapitalHkd >= 25M` | ≥ HK$25M | capital |
| 9 | `capital-liquid` — `liquidCapitalHkd >= 3M && opex >= 12mo` | ≥ HK$3M · 12 mo | capital |
| 10 | `no-yield` — `paysYield == false` | interdit | governance |
| 11 | `aml-cft` — `amlFlags == 0` | 0 sanctionné | aml |
| 12 | `attestation-fresh` — `attestationAgeHours <= 24` | ≤ 24 h | governance |

**Formules — seuils & normalisation** (`evaluateRules`)
- `statusFromRatio(ratio, warnAt, failAt)` : `< failAt` → FAIL, `< warnAt` → WARN.
- Couplage stress : `reserve-backing` dégradé si `proj < 1.0` (`WARN`) ou `< 0.97` (`FAIL`).

**Base réglementaire & scientifique**
- Chaque règle porte sa citation renvoyant à la **Stablecoins Ordinance (Cap. 656)**.
- AML/CFT aligné **FATF / FSB**.

---

## 7. Vue « Sources & provenance »

### Résumé
Traçabilité : d'où vient chaque donnée, son ancienneté, et si elle est de confiance.

### Détail

**Ce qu'on y voit** — `DataSource[]` :
- `provenance` (`onchain` / `attested` / `oracle` / `config`),
- `ageSeconds` (fraîcheur), `trusted`, `detail`.

Pour USDC, les sources réelles sont :

| Donnée | Provenance | Source |
|--------|-----------|--------|
| Supply, mints, burns | 🟢 `onchain` | Ethereum RPC (`totalSupply`, `eth_getLogs`) |
| Prix DEX | 🟢 `onchain` | Uniswap V3 `slot0()` |
| Prix oracle | 🟠 `oracle` | Chainlink USDC/USD `latestRoundData()` — réseau décentralisé |
| Prix historique | 🟠 `oracle` | Binance klines USDC/USDT |
| Réserves, composition | 📄 `attested` | Circle · Deloitte — rapport mensuel |
| AML | 📄 `attested` | OFAC SDN list (hardcodée, Chainalysis en prod) |
| Chainlink PoR (réserves) | ❌ indisponible | Pas de feed public Chainlink PoR pour USDC natif sur Ethereum mainnet |

**Base réglementaire & scientifique**
- Cap. 656 — position réserve-vs-offre divulguée « on a timely basis »
  (clause `attestation-fresh`, seuil ≤ 24 h).

---

## Annexe — Carte du code

| Fichier | Rôle |
|---------|------|
| `src/lib/types.ts` | Types domaine : `Coin` (+ `attestedAt?: string`), `Verdict`, `RuleResult`, `StressInputs`, `OnchainSnapshot`, `ChainlinkPrice`, `AttestationData`, `SdnEntry`… |
| `src/lib/hkma-rules.ts` | Rule packs (HKMA/GENIUS/MiCA) + 12 clauses machine-checkable. |
| `src/lib/verdict-engine.ts` | Toutes les formules : `reserveRatio`, `projectedRatio`, `hqlaShare`, `depegBps`, `evaluateRules`, `computeRating`, `computeVerdict`, hash FNV-1a. |
| `src/lib/mock-data.ts` | 5 coins : USDC (données réelles) + 4 coins mock HKD/USD (PRNG mulberry32). |
| `src/lib/eth-rpc.ts` | Client JSON-RPC Ethereum sans dépendance — `totalSupply`, `eth_getLogs` (mints/burns), `slot0` Uniswap V3, `latestRoundData` Chainlink USDC/USD. Nœud : `ethereum.publicnode.com`. |
| `src/data/usdc-price-history.json` | 1 184 chandeliers USDC/USDT Binance (11 mars 2023 → aujourd'hui). |
| `src/data/usdc-history-48.json` | 48 derniers jours extraits, format `SeriesPoint[]`. |
| `src/data/usdc-attestation.json` | Attestation Circle (Deloitte) : réserves, composition, `attestedAt`, `reportLabel`, `porFeedAddress`. Mis à jour manuellement ~le 15 de chaque mois. |
| `src/data/ofac-sdn.json` | 8 adresses OFAC SDN réelles (Lazarus Group, Tornado Cash, Suex). |
| `src/app/api/usdc/onchain/route.ts` | `GET /api/usdc/onchain` — supply + mints/burns + Uniswap DEX price + **Chainlink** (`price`, `updatedAt`, `roundId`). Cache 60 s. |
| `src/app/api/usdc/price/route.ts` | `GET /api/usdc/price` — proxy Binance ticker live. Cache 30 s. |
| `src/app/api/usdc/attestation/route.ts` | `GET /api/usdc/attestation` — rapport Circle avec `ageSeconds` calculé server-side + `porFeedAddress: null`. Cache 1 h. |
| `src/components/app/store.tsx` | État global + tick 60 s + `withLiveAttestationAge` (calcul dynamique de l'âge d'attestation USDC). |
| `src/components/ui/*` | Design-system (tabs, table, slider, card…). |

### Note d'honnêteté sur les « articles scientifiques »
Le code cite des **textes réglementaires** (Cap. 656, GENIUS Act, Règlement (UE) 2023/1114).
Les références **Diamond–Dybvig (1983)**, **Basel III / BCBS LCR (2013)** et
**Shleifer–Vishny (2011)** sont la **lignée conceptuelle** des formules de stress — elles
ne figurent pas littéralement dans le dépôt.
