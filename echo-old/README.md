# ECHO — Responsible AI board game (v1)

- Players (phones / QR): `/echo/` (add `?room=xyz` for a separate game)
- Projector board: `/echo/?board`
- Host console: `/echo/?host=echo-7421`

Host picks the sector pack (banking, insurance, health, energy, telecom) and client name in the lobby, then steps through the game with one button.
4 rounds · flip → bid → build → deals → attack → settle. Only the Attack phase uses chance.
Score = (cash + system values + controls) × (0.6 + 0.08 × Trust).
Deals: shared-liability pacts, control licences, pipeline co-ownership. News cards (one real, one fake) from round 2. Cash never goes below 0: an unpaid shortfall costs Trust.
Tests: `node test/engine.test.js` (unit + 4,000 random games).
Numbers are simulation-tuned but not yet human-playtested.
