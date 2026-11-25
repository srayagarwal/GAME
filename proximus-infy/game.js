/* Defend the Agent · rules. Cards can be bought up to 3 times: level 1 light, 2 strong, 3 very strong. */
(function () {
  const LEVEL = [0, 0.50, 0.70, 1.0], LEVEL2 = [0, 0.50, 0.70, 1.0], CAP = 1.0, SECOND = 0.75, BASE = 0.30;
  const START1 = 300, START2 = 200, EXTRA = 60, EXTRA_PEN = 6, MAX_EXTRA = 3, UPG = 10;
  // [id, emoji, name, short, price]
  const R1 = [
    ['POL', '🛡️', 'Policy engine', 'Stops injection', 20], ['KILL', '🔌', 'Kill switch', 'Stops loops', 20], ['LIT', '🎓', 'AI literacy', 'Spots deepfakes', 20],
    ['GRD', '🧠', 'Hallucination control', 'Stops made-up answers', 20], ['FAIR', '⚖️', 'Fairness testing', 'Stops biased decisions', 20], ['HARN', '🧰', 'Agent harness', 'Controlled runtime', 30],
    ['SCAN', '🔎', 'Vulnerability scanning', 'Finds known flaws', 30], ['PRIV', '🔐', 'Privacy', 'Stops data leaks and misuse', 40], ['HIL', '👤', 'HITL', 'Human oversight and audit trail', 40],
    ['SIM', '🧪', 'Threat simulation', 'Powerful: covers unknown attacks', 60]];
  const R2 = [
    ['AID', '🪪', 'Agent identity', 'One ID per agent', 40], ['MIT', '🩹', 'Vulnerability mitigation', 'Fixes flaws found. Needs a scan', 40], ['RED', '🎯', 'Red teaming (manual)', 'Tests jailbreaks', 50],
    ['AIS', '🤖', 'AI vulnerability scanning', 'Finds AI-speed flaws', 50], ['EUAI', '🇪🇺', 'EU AIA auto-compliance', 'Passes regulator checks', 60], ['HARN2', '🧰', 'Agent harness+', 'Sandboxed tools', 60]];
  const CARD = {}; R1.forEach(c => CARD[c[0]] = { id: c[0], e: c[1], n: c[2], s: c[3], p: c[4], r: 1 }); R2.forEach(c => CARD[c[0]] = { id: c[0], e: c[1], n: c[2], s: c[3], p: c[4], r: 2 });
  // attacks: cover = card → weight (1 primary, 0.6 secondary)
  const AT = {
    INJ: { e: '💉', n: 'Prompt injection', t: 'A message hides instructions that override the agent’s rules.', r: 1, c: { POL: 1, HARN: SECOND, SIM: 0.5 } },
    LOOP: { e: '🔁', n: 'Runaway loop', t: 'The agent repeats an action again and again and cannot stop.', r: 1, c: { KILL: 1, HARN: SECOND } },
    LEAK: { e: '🧨', n: 'Data leak or privacy breach', t: 'Customer or personal data is sent out or used where it should not be.', r: 1, c: { PRIV: 1, POL: SECOND } },
    HALL: { e: '🌫️', n: 'Made-up answer', t: 'The agent states something false with confidence and acts on it.', r: 1, c: { GRD: 1, HIL: SECOND } },
    BIAS: { e: '⚖️', n: 'Biased decision', t: 'The agent treats groups of customers unfairly.', r: 1, c: { FAIR: 1, HIL: SECOND } },
    DEEP: { e: '🎭', n: 'Deepfake request', t: 'A cloned voice asks for an urgent, unusual action.', r: 1, c: { LIT: 1, HIL: SECOND, SIM: 0.5 } },
    BAD: { e: '⚠️', n: 'Bad agent action', t: 'The agent takes a costly action nobody checked.', r: 1, c: { HIL: 1, HARN: SECOND } },
    KNOWN: { e: '🕳️', n: 'Known-flaw exploit', t: 'Attackers use a weakness that was already public.', r: 1, c: { SCAN: 1, PRIV: SECOND, SIM: 0.5 } },
    AUDT: { e: '📋', n: 'Regulator audit', t: 'A regulator asks for proof of what the agent did.', r: 1, c: { HIL: 1, FAIR: 0.5 } },
    JAIL: { e: '🔓', n: 'Jailbreak chain', t: 'A long conversation slowly talks the agent out of its limits.', r: 2, c: { RED: 1, SIM: 0.9, POL: 0.5, HARN2: SECOND } },
    NOVEL: { e: '🌀', n: 'Novel attack', t: 'A new kind of attack nobody has seen before.', r: 2, c: { SIM: 1, RED: SECOND } },
    AIFLAW: { e: '⚡', n: 'AI-found flaw', t: 'An AI finds a flaw and exploits it in minutes.', r: 2, c: { AIS: 1, SIM: 1, MIT: SECOND } },
    UNPATCH: { e: '🩸', n: 'Unpatched flaw', t: 'A known flaw has no fix yet and is being attacked.', r: 2, c: { MIT: 1, SIM: SECOND, SCAN: 0.5 } },
    IMPER: { e: '🥸', n: 'Agent impersonation', t: 'Someone pretends to be your agent to reach other systems.', r: 2, c: { AID: 1, PRIV: 0.5 } },
    EUACT: { e: '🇪🇺', n: 'EU AI Act investigation', t: 'A regulator checks whether the agent meets the EU AI Act.', r: 2, c: { EUAI: 1, HIL: 0.5, FAIR: 0.5 } },
    TOOLX: { e: '🛠️', n: 'Tool abuse', t: 'The agent is steered to misuse the powerful tools it can call.', r: 2, c: { HARN2: 1, KILL: 0.5, HARN: 0.5 } } };
  const POOL = { 1: ['INJ', 'LOOP', 'LEAK', 'DEEP', 'BAD', 'KNOWN', 'AUDT', 'HALL', 'BIAS'], 2: ['JAIL', 'NOVEL', 'AIFLAW', 'UNPATCH', 'IMPER', 'TOOLX', 'EUACT'] };
  const SECTORS = {
    telecom: { e: '📡', n: 'Telecom', sub: 'Network operations', agent: 'Network-ops agent', t: 'Spots faults in the network and fixes them alone: reroutes traffic, restarts services, pushes patches.' },
    banking: { e: '🏦', n: 'Banking', sub: 'Payments', agent: 'Payments agent', t: 'Approves and sends customer payments and flags fraud on its own.' },
    insurance: { e: '🛡️', n: 'Insurance', sub: 'Claims', agent: 'Claims agent', t: 'Reads claims, checks policies and approves payouts on its own.' },
    health: { e: '🏥', n: 'Healthcare', sub: 'Scheduling and records', agent: 'Patient-ops agent', t: 'Books appointments and updates patient records on its own.' },
    energy: { e: '⚡', n: 'Energy', sub: 'Grid balancing', agent: 'Grid agent', t: 'Balances power supply and demand and switches assets on and off.' } };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Random number of attacks per play: 3 to 5 in total across both DEFCONs, split between them (each gets at least 1)
  const total = seed => 3 + Math.floor(rng(seed * 17 + 3)() * 3);
  const split = seed => { const n = total(seed), lo = Math.floor(n / 2), n1 = rng(seed * 31 + 5)() < 0.5 ? lo : n - lo; return { n, n1, n2: n - n1 }; };
  function draw(seed, round) { const sp = split(seed), n = round === 1 ? sp.n1 : sp.n2, r = rng(seed * 7 + round * 101), p = POOL[round].slice(), out = []; for (let i = 0; i < n; i++) out.push(p.splice(Math.floor(r() * p.length), 1)[0]); return out; }
  const lv = (a, b) => { const o = {}; Object.keys(a || {}).forEach(k => o[k] = a[k]); Object.keys(b || {}).forEach(k => o[k] = Math.min(3, (o[k] || 0) + b[k])); return o; };
  // Mitigation needs a scan: its level can never exceed the best scan level (Vulnerability scanning or AI vulnerability scanning)
  const scanLv = L => Math.max(L.SCAN || 0, L.AIS || 0);
  const capMit = L => { if (!L.MIT) return L; const o = Object.assign({}, L), m = Math.min(L.MIT, scanLv(L)); if (m) o.MIT = m; else delete o.MIT; return o; };
  function block(aid, levels) { let miss = 1 - BASE; const by = [], gap = []; Object.keys(AT[aid].c).forEach(cid => { const l = levels[cid] || 0, w = AT[aid].c[cid]; if (l) { miss *= 1 - Math.min(1, (CARD[cid].r === 2 ? LEVEL2 : LEVEL)[l] * w); by.push(cid); } else if (w >= 1 || CARD[cid].r === AT[aid].r) gap.push(cid); }); return { pct: Math.min(CAP, 1 - miss), by, gap }; }
  function cost1(sel) { return Object.keys(sel || {}).reduce((s, k) => s + sel[k] * CARD[k].p, 0); }
  function cost2(add) { return Object.keys(add || {}).reduce((s, k) => s + add[k] * (CARD[k].p + (CARD[k].r === 1 ? UPG : 0)), 0); }
  function coins(p) { p = Object.assign({}, p, { r1: p.r1 || {}, r2: p.r2 || {} }); const c1 = START1 + EXTRA * (p.b1 || 0) - cost1(p.r1); const c2 = c1 + START2 + EXTRA * (p.b2 || 0) - cost2(p.r2); return { c1, c2 }; }
  function evaluate(p) {
    p = Object.assign({}, p, { r1: p.r1 || {}, r2: p.r2 || {}, b1: p.b1 || 0, b2: p.b2 || 0 });
    const a1 = draw(p.seed || 1, 1), a2 = draw(p.seed || 1, 2), L1 = p.r1 || {}, L2 = capMit(lv(L1, p.r2 || {}));
    const r1 = a1.map(a => Object.assign({ a }, block(a, L1))), r2 = a2.map(a => Object.assign({ a }, block(a, L2)));
    const sum = a => a.reduce((s, x) => s + x.pct, 0), avg1 = sum(r1) / r1.length, avg2 = sum(r2) / r2.length, avg = (sum(r1) + sum(r2)) / (r1.length + r2.length);
    // quadratic per attack, weighted by damage: score = 100 × Σ w·(blocked)² / Σ w, minus extra-coin penalty
    // damage escalates with the weapon: bolt x1, missile x2, heavy missile x4 (same tier as the attack animation)
    const all = r1.concat(r2); all.forEach((x, i) => { x.t = Math.ceil((i + 1) * 3 / all.length); x.w = [0, 1, 2, 4][x.t]; });
    const wsum = all.reduce((s, x) => s + x.w, 0), sq = all.reduce((s, x) => s + x.w * x.pct * x.pct, 0) / wsum;
    const buys = (p.b1 || 0) + (p.b2 || 0), pen = buys * EXTRA_PEN, base = Math.round(100 * sq);
    return { r1, r2, avg1, avg2, avg, sq, base, pen, buys, score: Math.max(0, base - pen) };
  }
  window.PX = { BASE, LEVEL, LEVEL2, START1, START2, EXTRA, EXTRA_PEN, MAX_EXTRA, UPG, R1, R2, CARD, AT, POOL, SECTORS, draw, split, total, lv, scanLv, capMit, block, cost1, cost2, coins, evaluate };
})();
