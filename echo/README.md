# ECHO: one project, one room

A cooperative workshop game for any number of players. The whole room builds one AI project together and wins or loses together.

**Roles.** Players are split across CISO / Security, Risk, AI team, Data team and Info security group. About 1 in 10 (at least 1) are RAI and Governance wild cards: they hold no cards and review everyone else's.

**Host = the CEO.** Picks one of six use cases, sets the budget and deadline, and can change money, time and cards per department at any time. The room sees every change.

**Rounds (max 4, one floor of the tower each).**
1. **Propose.** Each department holds a fixed hand (73 cards, with cheaper/slower variants and tempting shortcuts). Players back cards; the most backed go forward. Everything is public.
2. **RAI review.** RAI ticks or crosses every forwarded card with a reason from a fixed list. Advice only in rounds 1 to 3. In round 4 a cross is a binding veto on a card or on a whole department set (each veto adds a week). RAI can remove cards but never add them.
3. **Trim and decide.** If the room is over budget or time, every team is asked to trim. A card is trimmed when more than half of its department votes Trim (a tie does not trim). Optional. The host can also remove any card; the team is told.
4. **Built.** Approved cards go up as bays on the tower.

After round 4 the hidden attacks run. Grade: **Gold** (Safe, on budget, on time, no incidents), **Silver** (all three pass, with incidents), **Bronze** (one fails), **Fail** (two or more). Safe means no Critical attack got through. Shortcut cards save money or time but quietly break an attack even if a real control exists.

**Coverage.** 73 cards and 38 attacks map to 52 references: EU AI Act, GDPR, DORA, OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF, ISO 42001. Literacy cards for every department (AI Act Art. 4).

**Run it.** Players open the page (QR on the projector). Projector: `?board`. Host: `?host=KEY` (key in `config.js`). Add `?room=xyz` for a separate game. Without Firebase it runs in demo mode (one browser).

`node echo/test/engine.test.js` runs the engine checks, including that Gold is reachable in every use case. The previous 3 to 5 player ECHO is kept in `echo-old/`.
