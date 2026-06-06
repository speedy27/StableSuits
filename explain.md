# StableSuite — Guide d'explication (`explain.md`)

> **StableSuite** = « Compliance-as-a-service » pour stablecoins régulés.
> L'app vérifie, en continu et de façon *machine-checkable*, qu'un stablecoin
> respecte le régime de la **HKMA** (Stablecoins Ordinance, Cap. 656).

---

## 0. Comment lire ce document

- L'app est un **tableau de bord à page unique** (Next.js App Router). Les
  « pages » décrites ci-dessous sont en réalité les **panneaux / vues (onglets)**
  de ce tableau de bord unique.
- ⚠️ **État actuel du code** : toute la logique métier existe
  (`src/lib/types.ts`, `src/lib/hkma-rules.ts`, `src/lib/verdict-engine.ts`,
  `src/lib/mock-data.ts`) ainsi que la *design-system* (`src/components/ui/*`).
  Le composant de rendu `src/app/page.tsx` n'est **pas encore écrit** : les vues
  ci-dessous décrivent donc le produit **tel que le modèle de données et le
  moteur le définissent**.
- Chaque vue suit la structure demandée :
  **Résumé** → **Détail** (Ce qu'on y voit · Où l'on saisit la donnée ·
  Formules · Base réglementaire & scientifique).

### Données : d'où elles viennent
Le type `DataSource.provenance` (`src/lib/types.ts`) distingue 4 origines :

| Provenance | Sens | Saisie utilisateur ? |
|------------|------|----------------------|
| `onchain`  | Lue directement sur la blockchain (supply, contrat) | Non |
| `attested` | Attestation d'un auditeur/issuer (réserves) | Non |
| `oracle`   | Flux de prix / marché | Non |
| `config`   | Paramètres du *rule pack* | Non |

➡️ **Le seul endroit où l'utilisateur saisit réellement de la donnée** est le
panneau **Stress-test** (sliders `run`, `haircut`, `fxShockBps`). Tout le reste
est *observé* (onchain / attesté / oracle), pas tapé à la main.

### Légende des verdicts
`VerdictStatus = "PASS" | "WARN" | "FAIL"` — agrégés par la fonction `worst()`
(le pire statut l'emporte). `Rating` : échelle `AAA → AA → A → BBB → BB → B → CCC → D`.

---

## 1. Vue « Sélecteur » (shell global)

### Résumé
Barre de navigation : on choisit **quel stablecoin** auditer et **quel cadre
réglementaire** (*rule pack*) appliquer.

### Détail

**Ce qu'on y voit**
- La liste des 4 coins de démonstration (`src/lib/mock-data.ts`) :
  - `aHKD` — Anchorpoint HKD (Ethereum) — sain
  - `hkdR` — HSBC Reserve HKD (Polygon) — sain
  - `eHKD` — Ensemble eHKD (Arbitrum) — sous surveillance (1 flag AML, dépeg léger)
  - `rUSD` — Redstone USD (Base) — en défaut (sous-collatéralisé, 4 flags AML)
- Le *rule pack* actif : **HKMA** (les packs **GENIUS** et **MiCA** existent mais
  sont `active: false`, cf. `RULE_PACKS`).

**Où l'on saisit la donnée**
- Sélection du coin (clic) ; sélection du rule pack (toggle). Aucune saisie libre.

**Formules** — aucune (navigation).

**Base réglementaire & scientifique**
- Métadonnées des cadres (`RULE_PACKS`, `src/lib/hkma-rules.ts`) :
  - **HKMA** — Stablecoins Ordinance, **Cap. 656**, effectif **1 août 2025**,
    philosophie « *Same activity, same risks, same regulation* ».
  - **GENIUS Act** — cadre fédéral US (US Treasury / OCC), « 1:1 HQLA, attestation
    mensuelle ».
  - **MiCA** — **Regulation (EU) 2023/1114** (EMT / ART, EBA / ESMA).

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
  ➡️ **C'est ici qu'on « tape » la donnée.** Valeurs par défaut = `DEFAULT_STRESS`.

**Formule — solvabilité prédictive sous ruée + décote** (`projectedRatio`)

$$
\text{projected} = \frac{R\,(1-h)\,\text{fx} - \rho\,S}{S\,(1-\rho)},
\qquad \text{fx} = 1 - \frac{\text{fxShockBps}}{10\,000}
$$

avec $R$ = réserves, $S$ = offre, $\rho$ = `run`, $h$ = `haircut`.
Interprétation : après qu'une fraction $\rho$ des détenteurs a été remboursée au
pair (en consommant des réserves décotées de $h$ et ajustées du change), quel
ratio de couverture reste-t-il pour les détenteurs restants $S(1-\rho)$ ?
Si le dénominateur ≤ 0 → 0.

**Base réglementaire & scientifique**
- *Réglementaire* : teste en avance l'exigence de **backing ≥ 100 %** de la
  Cap. 656 sous conditions de stress (cf. règle `reserve-backing`, qui passe en
  WARN/FAIL si `proj < 1.0` / `< 0.97`).
- *Lignée scientifique / standards* (concepts sous-jacents, **non cités tels
  quels dans le code**) :
  - **Diamond & Dybvig (1983)**, *Bank Runs, Deposit Insurance, and Liquidity*,
    *Journal of Political Economy* — modèle canonique de ruée bancaire (terme $\rho$).
  - **Basel III / BCBS (2013)**, *Liquidity Coverage Ratio (LCR) and liquidity
    risk monitoring tools* — logique de couverture sous sorties de trésorerie.
  - **Shleifer & Vishny (2011)**, *Fire Sales in Finance and Macroeconomics*,
    *Journal of Economic Perspectives* — justification de la décote $h$.

---

## 4. Vue « Réserves » (composition & qualité)

### Résumé
Décomposition des actifs de réserve et part d'actifs **HQLA** (haute qualité,
très liquides) vs non-HQLA.

### Détail

**Ce qu'on y voit** — `reserveComposition: ReserveSlice[]` (`src/lib/types.ts`) :
- Un *donut* des tranches (ex. aHKD : « Cash @ HKMA AIs » 41 %, « ≤3M T-bills »
  38 %, « ≤3M bank deposits » 18 %, « Overnight repo » 3 %).
- Le drapeau `hqla` (booléen) par tranche, couleur PASS (vert) si HQLA, WARN
  (ambre) sinon.
- La part HQLA agrégée et la comparaison réserves vs offre.

**Où l'on saisit la donnée** — aucune (provenance `attested` / `oracle`).

**Formule — part HQLA** (`hqlaShare`)

$$
\text{hqlaShare} = \frac{\sum_{i \,:\, \text{hqla}_i} v_i}{\sum_i v_i}
$$

Règle associée `reserve-quality` : `PASS` si ≥ 95 %, `WARN` si ≥ 85 %, sinon `FAIL`.

**Base réglementaire & scientifique**
- **Stablecoins Ordinance — Eligible reserve assets** (clause `reserve-quality`) :
  réserves = cash, dépôts bancaires ≤ 3 mois, titres d'État/banque centrale à
  maturité résiduelle ≤ 1 an.
- Notion de **HQLA** issue de **Basel III (LCR)** — actifs de haute qualité
  immédiatement liquidables.

---

## 5. Vue « Historique » (séries temporelles)

### Résumé
Graphiques sur 48 h : ratio de réserve, ratio projeté, prix (peg) et volume de
rachats — pour repérer une dérive ou un stress qui monte.

### Détail

**Ce qu'on y voit** — `history: SeriesPoint[]` (48 points) :
- `reserveRatio` et `projectedRatio` (aire/ligne),
- `price` (suivi du peg, ex. rUSD décroche vers 0.96),
- `redemptions` (volume horaire, avec *spikes* simulés en fin de fenêtre).

**Où l'on saisit la donnée** — aucune.

**Formules / génération** (`buildSeries`, `src/lib/mock-data.ts`)
- ⚠️ Données **synthétiques** déterministes : PRNG **mulberry32** (graine fixe)
  pour éviter toute *hydration drift* entre serveur et client.
- En production ces séries proviendraient de télémétrie réelle
  (onchain + oracle). La forme : dérive de bruit autour d'un `baseRatio`,
  dégradation tardive optionnelle (`stressLate`), pics de rachat (`redemptionSpike`).

**Base réglementaire & scientifique**
- Surveillance continue de la **stabilité du peg** et de la **couverture** —
  esprit « disclosure on a timely basis » de la Cap. 656 (clause
  `attestation-fresh`).

---

## 6. Vue « Règles » (checklist de conformité HKMA)

### Résumé
La liste des **12 clauses HKMA** évaluées une à une : statut, valeur observée,
seuil, barre de conformité (ratio) et citation réglementaire.

### Détail

**Ce qu'on y voit** — `RuleResult[]` (`evaluateRules`), une ligne par clause de
`HKMA_CLAUSES` (`src/lib/hkma-rules.ts`) :

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

**Où l'on saisit la donnée** — aucune (évaluation automatique).

**Formules — seuils & normalisation** (`evaluateRules`)
- `statusFromRatio(ratio, warnAt, failAt)` : `< failAt` → FAIL, `< warnAt` →
  WARN, sinon PASS.
- `ratio` (barre 0–1.25) = valeur observée / seuil. Exemples :
  - réserve : `ratio = reserveRatio`
  - surcollatéral : `ratio = reserveRatio / 1.005`
  - rachat : `ratio = 24 / redemptionP95h`
  - capital : `ratio = paidUpCapitalHkd / 25 000 000`
  - liquide : `ratio = min(liquidCapital/3M, opexMonths/12)`
  - AML : `ratio = 1` si 0 flag, sinon `1/(amlFlags+1)`
  - attestation : `ratio = 24 / max(heures, 0.1)`
- Couplage stress : `reserve-backing` est dégradé si le **ratio projeté** `proj`
  passe sous 1.0 (`worst(status, proj<0.97 ? FAIL : WARN)`).

**Base réglementaire & scientifique**
- Chaque ligne porte sa **citation** (`RuleResult.citation`) renvoyant à la
  section correspondante de la **Stablecoins Ordinance (Cap. 656)** :
  reserve backing, overcollateralization, eligible assets, currency matching,
  segregation & insolvency protection, redemption right & speed, redemption
  conditions, capital requirements, liquid capital & opex buffer, yield
  prohibition, **AML/CFT** (aligné **FATF / FSB**), disclosure & risk management.

---

## 7. Vue « Sources & provenance » (confiance des données)

### Résumé
Traçabilité : d'où vient chaque donnée, son ancienneté, et si elle est de
confiance — c'est ce qui alimente le score de `confidence` du verdict.

### Détail

**Ce qu'on y voit** — `DataSource[]` (`src/lib/types.ts`) :
- `provenance` (`onchain` / `attested` / `oracle` / `config`),
- `ageSeconds` (fraîcheur), `trusted` (booléen), `detail`.

**Où l'on saisit la donnée** — aucune (métadonnées de flux).

**Formules** — alimente la pénalité de fraîcheur dans `confidence`
(cf. Vue 2) : plus l'attestation est ancienne, plus la confiance baisse.

**Base réglementaire & scientifique**
- **Stablecoins Ordinance — Disclosure & risk management** : position
  réserve-vs-offre divulguée « on a timely basis » (clause `attestation-fresh`,
  seuil ≤ 24 h).

---

## Annexe — Carte du code

| Fichier | Rôle |
|---------|------|
| `src/lib/types.ts` | Types du domaine (`Coin`, `Verdict`, `RuleResult`, `StressInputs`, `DataSource`…). |
| `src/lib/hkma-rules.ts` | *Rule packs* (HKMA/GENIUS/MiCA) + les 12 clauses HKMA `machine-checkable`. |
| `src/lib/verdict-engine.ts` | **Toutes les formules** : `reserveRatio`, `projectedRatio`, `hqlaShare`, `depegBps`, `evaluateRules`, `computeRating`, `computeVerdict`, hash FNV-1a. |
| `src/lib/mock-data.ts` | 4 coins de démo + générateur de séries (PRNG mulberry32). |
| `src/components/ui/*` | Design-system (tabs, table, slider, card, chart helpers…). |
| `src/app/page.tsx` | **À écrire** — rendu du tableau de bord décrit ci-dessus. |

### Note d'honnêteté sur les « articles scientifiques »
Le code cite des **textes réglementaires** (Cap. 656, GENIUS Act,
Règlement (UE) 2023/1114), **pas** des articles académiques. Les références
**Diamond–Dybvig (1983)**, **Basel III / BCBS LCR (2013)** et
**Shleifer–Vishny (2011)** ci-dessus sont la **lignée conceptuelle** des
formules de stress (ruée, couverture liquide, décote), fournie pour contexte —
elles ne figurent pas littéralement dans le dépôt.
