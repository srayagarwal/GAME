/* Defend the Agent · rules. Cards can be bought up to 3 times: level 1 light, 2 strong, 3 very strong. */
(function () {
  const LEVEL = [0, 0.55, 0.80, 0.92], LEVEL2 = [0, 0.65, 0.88, 0.96], CAP = 0.95, SECOND = 0.75, BASE = 0.30;
  const START1 = 240, START2 = 150, EXTRA = 60, EXTRA_PEN = 6, MAX_EXTRA = 3, UPG = 10;
  // [id, emoji, name, short, price]
  const R1 = [
    ['AUD', '🧾', 'Audit trail', 'Regulator checks', 10], ['POL', '🛡️', 'Policy engine', 'Stops injection', 20], ['KILL', '🔌', 'Kill switch', 'Stops loops', 20],
    ['LIT', '🎓', 'AI literacy', 'Spots deepfakes', 20], ['LEP', '🔑', 'Least privilege', 'Stops leaks', 30], ['HIL', '👤', 'Human in the loop', 'Stops bad actions', 30],
    ['HARN', '🧰', 'Agent harness', 'Controlled runtime', 30], ['SCAN', '🔎', 'Vulnerability scanning', 'Finds known flaws', 30]];
  const R2 = [
    ['MIT', '🩹', 'Vulnerability mitigation', 'Fixes flaws found', 40], ['AID', '🪪', 'Agent identity', 'One ID per agent', 40], ['RED', '🎯', 'Red teaming', 'Tests jailbreaks', 50],
    ['SIM', '🧪', 'Threat simulation (auto red teaming)', 'Powerful: covers 4 attacks', 70], ['AIS', '🤖', 'AI vulnerability scanning', 'Finds AI-speed flaws', 50], ['HARN2', '🧰', 'Agent harness+', 'Sandboxed tools', 60]];
  const CARD = {}; R1.forEach(c => CARD[c[0]] = { id: c[0], e: c[1], n: c[2], s: c[3], p: c[4], r: 1 }); R2.forEach(c => CARD[c[0]] = { id: c[0], e: c[1], n: c[2], s: c[3], p: c[4], r: 2 });
  // attacks: cover = card → weight (1 primary, 0.6 secondary)
  const AT = {
    INJ: { e: '💉', n: 'Prompt injection', t: 'A message hides instructions that override the agent’s rules.', r: 1, c: { POL: 1, HARN: SECOND } },
    LOOP: { e: '🔁', n: 'Runaway loop', t: 'The agent repeats an action again and again and cannot stop.', r: 1, c: { KILL: 1, HARN: SECOND } },
    LEAK: { e: '🧨', n: 'Data leak', t: 'The agent is tricked into sending out customer data.', r: 1, c: { LEP: 1, POL: SECOND } },
    DEEP: { e: '🎭', n: 'Deepfake request', t: 'A cloned voice asks for an urgent, unusual action.', r: 1, c: { LIT: 1, HIL: SECOND } },
    BAD: { e: '⚠️', n: 'Bad agent action', t: 'The agent takes a costly action nobody checked.', r: 1, c: { HIL: 1, HARN: SECOND, AUD: 0.3 } },
    KNOWN: { e: '🕳️', n: 'Known-flaw exploit', t: 'Attackers use a weakness that was already public.', r: 1, c: { SCAN: 1, LEP: SECOND } },
    AUDT: { e: '📋', n: 'Regulator audit', t: 'A regulator asks for proof of what the agent did.', r: 1, c: { AUD: 1, HIL: SECOND } },
    JAIL: { e: '🔓', n: 'Jailbreak chain', t: 'A long conversation slowly talks the agent out of its limits.', r: 2, c: { RED: 1, SIM: 0.9, POL: 0.5, HARN2: SECOND } },
    NOVEL: { e: '🌀', n: 'Novel attack', t: 'A new kind of attack nobody has seen before.', r: 2, c: { SIM: 1, RED: SECOND } },
    AIFLAW: { e: '⚡', n: 'AI-found flaw', t: 'An AI finds a flaw and exploits it in minutes.', r: 2, c: { AIS: 1, SIM: 1, MIT: SECOND } },
    UNPATCH: { e: '🩸', n: 'Unpatched flaw', t: 'A known flaw has no fix yet and is being attacked.', r: 2, c: { MIT: 1, SIM: SECOND, SCAN: 0.5 } },
    IMPER: { e: '🥸', n: 'Agent impersonation', t: 'Someone pretends to be your agent to reach other systems.', r: 2, c: { AID: 1, LEP: 0.5 } },
    TOOLX: { e: '🛠️', n: 'Tool abuse', t: 'The agent is steered to misuse the powerful tools it can call.', r: 2, c: { HARN2: 1, KILL: 0.5, HARN: 0.5 } } };
  const POOL = { 1: ['INJ', 'LOOP', 'LEAK', 'DEEP', 'BAD', 'KNOWN', 'AUDT'], 2: ['JAIL', 'NOVEL', 'AIFLAW', 'UNPATCH', 'IMPER', 'TOOLX'] };
  const SECTORS = {
    telecom: { e: '📡', n: 'Telecom', sub: 'Network operations', agent: 'Network-ops agent', t: 'Spots faults in the network and fixes them alone: reroutes traffic, restarts services, pushes patches.' },
    banking: { e: '🏦', n: 'Banking', sub: 'Payments', agent: 'Payments agent', t: 'Approves and sends customer payments and flags fraud on its own.' },
    insurance: { e: '🛡️', n: 'Insurance', sub: 'Claims', agent: 'Claims agent', t: 'Reads claims, checks policies and approves payouts on its own.' },
    health: { e: '🏥', n: 'Healthcare', sub: 'Scheduling and records', agent: 'Patient-ops agent', t: 'Books appointments and updates patient records on its own.' },
    energy: { e: '⚡', n: 'Energy', sub: 'Grid balancing', agent: 'Grid agent', t: 'Balances power supply and demand and switches assets on and off.' } };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function draw(seed, round) { const r = rng(seed * 7 + round * 101), p = POOL[round].slice(), out = []; for (let i = 0; i < 3; i++) out.push(p.splice(Math.floor(r() * p.length), 1)[0]); return out; }
  const lv = (a, b) => { const o = {}; Object.keys(a || {}).forEach(k => o[k] = a[k]); Object.keys(b || {}).forEach(k => o[k] = Math.min(3, (o[k] || 0) + b[k])); return o; };
  function block(aid, levels) { let miss = 1 - BASE; const by = [], gap = []; Object.keys(AT[aid].c).forEach(cid => { const l = levels[cid] || 0, w = AT[aid].c[cid]; if (l) { miss *= 1 - Math.min(0.95, (CARD[cid].r === 2 ? LEVEL2 : LEVEL)[l] * w); by.push(cid); } else if (w >= 1 || CARD[cid].r === AT[aid].r) gap.push(cid); }); return { pct: Math.min(CAP, 1 - miss), by, gap }; }
  function cost1(sel) { return Object.keys(sel || {}).reduce((s, k) => s + sel[k] * CARD[k].p, 0); }
  function cost2(add) { return Object.keys(add || {}).reduce((s, k) => s + add[k] * (CARD[k].p + (CARD[k].r === 1 ? UPG : 0)), 0); }
  function coins(p) { p = Object.assign({}, p, { r1: p.r1 || {}, r2: p.r2 || {} }); const c1 = START1 + EXTRA * (p.b1 || 0) - cost1(p.r1); const c2 = c1 + START2 + EXTRA * (p.b2 || 0) - cost2(p.r2); return { c1, c2 }; }
  function evaluate(p) {
    p = Object.assign({}, p, { r1: p.r1 || {}, r2: p.r2 || {}, b1: p.b1 || 0, b2: p.b2 || 0 });
    const a1 = draw(p.seed || 1, 1), a2 = draw(p.seed || 1, 2), L1 = p.r1 || {}, L2 = lv(L1, p.r2 || {});
    const r1 = a1.map(a => Object.assign({ a }, block(a, L1))), r2 = a2.map(a => Object.assign({ a }, block(a, L2)));
    const avg1 = r1.reduce((s, x) => s + x.pct, 0) / 3, avg2 = r2.reduce((s, x) => s + x.pct, 0) / 3, avg = (avg1 + avg2) / 2;
    const buys = (p.b1 || 0) + (p.b2 || 0), pen = buys * EXTRA_PEN, base = Math.round(100 * avg * avg);
    return { r1, r2, avg1, avg2, avg, base, pen, buys, score: Math.max(0, base - pen) };
  }
  window.PX = { BASE, LEVEL, LEVEL2, START1, START2, EXTRA, EXTRA_PEN, MAX_EXTRA, UPG, R1, R2, CARD, AT, POOL, SECTORS, draw, lv, block, cost1, cost2, coins, evaluate };
})();
