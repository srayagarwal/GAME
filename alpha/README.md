# ALPHA — the control mind-map game (v1)

- Players (phones / QR): `/alpha/` (add `?room=xyz` for a separate game)
- Projector board: `/alpha/?board`
- Host console: `/alpha/?host=alpha-7421`

**What it is.** A five-tier mind map of 61 AI controls: use case → 8 branches → 22 areas → optional sub-areas → controls (Govern 10, Data 7, Model 7, Security 14, Operate 6, People 5, Assurance 6, Third parties 6; areas hold 2–4 controls, some have sub-areas such as Guardrails or Policy engine). Scanners, harnesses, policy engines and semantic policy sit *inside* the branch they belong to.
The host picks the **sector** and a **use case for each of the four rounds** (or types a custom title) and activates each round. Players buy controls under a budget; every control has three levels (Basic 30% / Strong 55% / Leading 75% absorption, upgrade = 60% of base per step).
Nothing is ever sold, choices persist, new branches open each round (R1 foundations, R2 scanners/policy/agents/vendors, R3 semantic policy/red team/identity/assurance, R4 none). A bundle buys every open control in a branch, area or sub-area for 75% of the parts (all at Basic; strengthen afterwards). Budget is €40M, then +16, +16, +12.

**Attacks are random.** Round 1 draws one attack, rounds 2–4 draw two, never repeating. Exactly one is the **regulatory investigation** (named for the sector, e.g. EU AI Act and DORA), and it lands in a random round 2–4 that only the host can see. An attack that hits a branch the use case exposes does 40% more damage. Several controls on the same attack stack (cap 95%).

**Surprises.** Every round the host's Activate button reveals one bonus for everyone (discount, grant, vendor price rise, half-price strengthening, branch opening early) and one for a random player (free control, open-source gift, payout, or "key engineer leaves").
**Awards.** Clean sheet, Early bird, Branch master, Balanced shield, Leading edge, Linked pair (cross-links on the map), Comeback, then final awards (Most resilient, Widest coverage, Smartest spender). Players get a final analysis on their phone: damage by round, coverage by branch, the controls that would have saved most, and what to do at work.

Score = 40 − damage + credit + 0.25 × value of controls + 0.5 × budget left.

**Tests.** `node test/engine.test.js` (unit tests + 3,000 random 8-bot games) and `node test/sim.js 3000` (strategy comparison). Numbers are simulation-tuned, not yet human-playtested.
