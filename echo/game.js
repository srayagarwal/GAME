/* ECHO · rules engine. Pure functions, no DOM. Deterministic except the attack draw (rng passed in). */
(function () {
  const SEV = { L: { p: .10, d: 4, t: 0, n: 'Low' }, M: { p: .25, d: 9, t: .5, n: 'Medium' }, H: { p: .40, d: 18, t: 1, n: 'High' }, C: { p: .60, d: 30, t: 2, n: 'Critical' } };
  const UP = { L: 'M', M: 'H', H: 'C', C: 'C' };
  const COST = { ctl: 5, ft: 3, scan: 3, fix: 6, mit: 4, ins: 3, defuse: 3 };
  const START = 50, TOPUP = [0, 0, 25, 25, 15], MULT = [0, 0, 1.0, 1.4, 1.0];
  const RATE = { min: .49, lim: .588, high: .70, shared: .42 };
  const TIERN = { min: 'MINIMAL', lim: 'LIMITED RISK', high: 'HIGH-RISK', shared: 'SHARED' };
  // topology: same for every sector pack (balanced once); packs re-skin names, categories, regulations
  const NODES = {
    chat: { price: 10, tier: 'lim', cat: 'cus', sev: 'H', pos: [180, 230] }, offer: { price: 10, tier: 'min', cat: 'cus', sev: 'L', pos: [180, 540], banned: true }, compl: { price: 12, tier: 'min', cat: 'cus', sev: 'L', pos: [180, 850] },
    cred: { price: 16, tier: 'high', cat: 'rsk', sev: 'H', pos: [700, 880] }, fraud: { price: 16, tier: 'min', cat: 'rsk', sev: 'M', pos: [1000, 880] }, aml: { price: 18, tier: 'lim', cat: 'rsk', sev: 'L', pos: [1300, 880] },
    doc: { price: 14, tier: 'min', cat: 'ops', sev: 'M', pos: [1350, 250] }, coll: { price: 14, tier: 'lim', cat: 'ops', sev: 'H', pos: [1680, 300], agentic: true }, pay: { price: 22, tier: 'high', cat: 'ops', sev: 'H', pos: [1500, 500], agentic: true },
    robo: { price: 24, tier: 'high', cat: 'adv', sev: 'M', pos: [1250, 640] }, suit: { price: 24, tier: 'high', cat: 'adv', sev: 'M', pos: [900, 640] }, wealth: { price: 28, tier: 'lim', cat: 'adv', sev: 'H', pos: [1700, 700] },
    lake: { price: 18, tier: 'shared', cat: 'hub', sev: 'C', pos: [560, 540] }, fm: { price: 20, tier: 'shared', cat: 'hub', sev: 'H', pos: [1000, 250] } };
  const LINKS = [['lake','chat'],['lake','compl'],['lake','cred'],['lake','fraud'],['lake','aml'],['lake','suit'],['fm','chat'],['fm','doc'],['fm','coll'],['fm','pay'],['fm','wealth'],['fm','robo'],['fm','lake'],
    ['cred','fraud'],['fraud','aml'],['doc','coll'],['coll','pay'],['robo','suit'],['robo','wealth'],['chat','offer'],['offer','compl']];
  const NB = {}; Object.keys(NODES).forEach(k => NB[k] = []); LINKS.forEach(([a, b]) => { NB[a].push(b); NB[b].push(a); });
  const CATS = { cus: 0, rsk: 1, ops: 2, adv: 3 };
  const IDS = Object.keys(NODES);
  const VULN = { chat: 'Prompt injection', offer: 'Manipulative design', compl: 'Biased outputs', cred: 'Biased or poisoned training data', fraud: 'Model evasion', aml: 'Model drift', doc: 'Sensitive-data leakage', coll: 'Excessive agent permissions', pay: 'Unauthorised agent actions', robo: 'Unsafe recommendations', suit: 'No explainability', wealth: 'Hallucinated output', lake: 'Data breach', fm: 'Zero-day in vendor model' };
  const mk = (cats, n, regs, shared, tone) => ({ cats, n, regs, shared, tone });
  const PACKS = {
    banking: { name: 'Banking', cats: ['Customer', 'Risk & Fraud', 'Operations', 'Advice & Wealth'], regs: 'EU AI Act · DORA · MiFID II',
      n: { chat: 'Customer Chatbot', offer: 'Manipulative Offers', compl: 'Complaints Triage', cred: 'Credit Scoring', fraud: 'Fraud Detection', aml: 'AML Monitor', doc: 'Document Processing', coll: 'Collections Agent', pay: 'Agentic Payments', robo: 'Robo-Adviser', suit: 'Suitability Checker', wealth: 'Wealth Copilot', lake: 'Customer Data Lake', fm: 'Foundation Model' } },
    insurance: { name: 'Insurance', cats: ['Customer', 'Underwriting & Pricing', 'Claims', 'Distribution'], regs: 'EU AI Act · Solvency II · IDD',
      n: { chat: 'Policy Chatbot', offer: 'Emotion-based Pricing', compl: 'Renewal Assistant', cred: 'Risk Scoring', fraud: 'Claims Fraud Detector', aml: 'Reinsurance Analytics', doc: 'Claims Document AI', coll: 'Subrogation Agent', pay: 'Agentic Claims Payer', robo: 'Product Recommender', suit: 'Needs Assessment', wealth: 'Broker Copilot', lake: 'Policyholder Data Lake', fm: 'Foundation Model' } },
    health: { name: 'Healthcare', cats: ['Patient', 'Diagnostics & Triage', 'Operations', 'Clinical Support'], regs: 'EU AI Act · MDR · GDPR',
      n: { chat: 'Patient Chatbot', offer: 'Patient Social Scoring', compl: 'Appointment Assistant', cred: 'Diagnostic Imaging', fraud: 'Triage Prioritiser', aml: 'Sepsis Alert', doc: 'Clinical Notes Scribe', coll: 'Bed & Discharge Agent', pay: 'Agentic Prescribing', robo: 'Treatment Recommender', suit: 'Trial Matching', wealth: 'Clinician Copilot', lake: 'Patient Record Lake', fm: 'Foundation Model' } },
    energy: { name: 'Energy', cats: ['Customer', 'Grid & Assets', 'Operations', 'Trading & Markets'], regs: 'EU AI Act · NIS2 · CER',
      n: { chat: 'Customer Chatbot', offer: 'Manipulative Tariff Nudging', compl: 'Billing Dispute Triage', cred: 'Grid Load Forecaster', fraud: 'Predictive Maintenance', aml: 'Smart Meter Analytics', doc: 'Field Report AI', coll: 'Outage Dispatch Agent', pay: 'Autonomous Grid Switching', robo: 'Energy Trading Bot', suit: 'Demand Response', wealth: 'Price Forecast Copilot', lake: 'Telemetry Data Lake', fm: 'Foundation Model' } },
    telecom: { name: 'Telecom', cats: ['Customer', 'Network', 'Operations', 'Commercial'], regs: 'EU AI Act · NIS2 · GDPR',
      n: { chat: 'Care Chatbot', offer: 'Emotion-based Upsell', compl: 'Churn Predictor', cred: 'Network Optimiser', fraud: 'SIM-swap Fraud Detector', aml: 'Anomaly Detection', doc: 'Contract Document AI', coll: 'Field Ops Agent', pay: 'Agentic Provisioning', robo: 'Offer Engine', suit: 'Credit Check', wealth: 'Sales Copilot', lake: 'Subscriber Data Lake', fm: 'Foundation Model' } } };
  const ROUNDS = [null,
    { n: 1, name: 'Launch', theme: 'Governance foundations', flip: 'Risk tiers revealed (EU AI Act)', more: 'Every system now shows its EU AI Act tier. One use case is a prohibited practice and is withdrawn. High-risk systems need 2 controls to run at full revenue.', attacks: false },
    { n: 2, name: 'Scale', theme: 'Data and model quality', flip: 'Hidden flaws surface', more: 'Attacks begin. Every system hides a vulnerability. Scan to see it, then fix, mitigate, insure or accept.', attacks: true },
    { n: 3, name: 'Crisis', theme: 'Security, agents and vendors', flip: 'Echo storm', more: 'A zero-day hits the shared model. Collections and payments agents go agentic: more revenue, higher severity. Attack odds are 1.4x.', attacks: true },
    { n: 4, name: 'Reckoning', theme: 'Accountability and audit', flip: 'Regulator view', more: 'Audit: unscanned or accepted vulnerabilities cost Trust, uncontrolled high-risk systems are fined. A final dilemma decides the last Trust swing.', attacks: true } ];
  const STEPS = ['flip', 'bid', 'build', 'deals', 'attack', 'settle'];
  const STEPN = { flip: 'Flip', bid: 'Bid', build: 'Build', deals: 'Deals', attack: 'Attack', settle: 'Settle' };
  const ctlF = (c, a, b) => Math.pow(a, Math.min(c, 3)) * (c >= 4 ? b : 1);
  const sevOf = (id, r) => { const n = NODES[id]; return n.agentic && r >= 3 ? UP[n.sev] : n.sev; };
  const oddsOf = (id, r, ns) => { if (!ns || ns.fixed || !MULT[r]) return 0; if (id === 'fm' && r === 3) return .9; return Math.min(.95, SEV[sevOf(id, r)].p * MULT[r] * ctlF(ns.c || 0, .8, .9)); };
  const nameOf = (pack, id) => (PACKS[pack] || PACKS.banking).n[id];
  const revOf = (g, id, r, trust) => {
    const ns = g.nodes[id], N = NODES[id]; if (!ns || !ns.by || ns.pause === r) return 0;
    let b = RATE[N.tier] * N.price * (1 + .25 * Math.min(ns.c || 0, 3) + ((ns.c || 0) >= 4 ? .125 : 0));
    if (N.agentic && r >= 3) b *= 1.5; if (N.tier === 'high' && (ns.c || 0) < 2) b *= .5;
    b *= trust >= 7 ? 1.1 : trust <= 3 ? .75 : 1;
    if (N.cat !== 'hub') { const mine = IDS.filter(x => NODES[x].cat === N.cat && !NODES[x].banned); if (mine.length === 3 && mine.every(x => g.nodes[x] && g.nodes[x].by === ns.by)) b *= 1.2; }
    if ((ns.c || 0) >= 4 && r === 4) b *= 1.15; return b; };
  const clamp = t => Math.max(0, Math.min(10, t));
  const rnd = x => Math.round(x * 10) / 10;
  /* sealed bids -> owners. g.bids[pid][id]=amount. Highest bid wins; ties go to the player with least cash. */
  function resolveBids(g) {
    const list = []; Object.keys(g.bids || {}).forEach(pid => Object.keys(g.bids[pid] || {}).forEach(id => { const a = +g.bids[pid][id]; if (a > 0 && NODES[id] && !NODES[id].banned && !(g.nodes[id] && g.nodes[id].by)) list.push({ pid, id, a, cash: g.players[pid].cash }); }));
    list.sort((x, y) => y.a - x.a || x.cash - y.cash); const won = [];
    list.forEach(b => { if (g.nodes[b.id] && g.nodes[b.id].by) return; const p = g.players[b.pid]; if (p.cash >= b.a) { p.cash = rnd(p.cash - b.a); g.nodes[b.id] = { by: b.pid, c: 0, bought: g.round }; won.push(b); } });
    return won; }
  /* attack phase: the ONLY randomness in the game */
  function attack(g, r, rng) {
    const ev = [], loss = {}, tl = {}, hitP = {}, echoT = {}, add = (o, k, v) => o[k] = (o[k] || 0) + v;
    if (MULT[r]) {
      IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || !ns.by || ns.fixed) return; const p = oddsOf(id, r, ns), roll = rng(); ev.push({ t: 'atk', k: id, by: ns.by, p, roll, hit: roll < p, sev: sevOf(id, r), echo: [] }); });
      ev.filter(e => e.hit).forEach(e => { const ns = g.nodes[e.k], d = SEV[e.sev].d * ctlF(ns.c || 0, .85, .95) * (ns.mit ? .5 : 1);
        e.dmg = rnd(d); add(loss, e.by, ns.ins ? d * .3 : d); add(tl, e.by, SEV[e.sev].t * (ns.mit ? .5 : 1)); hitP[e.by] = 1;
        NB[e.k].forEach(nb => { const nn = g.nodes[nb]; if (!nn || !nn.by) return; const dd = SEV[e.sev].d * .5 * ctlF(nn.c || 0, .85, 1); add(loss, nn.by, nn.ins ? dd * .3 : dd); e.echo.push(nb); if (nn.by !== ns.by) echoT[nn.by] = 1; }); });
      IDS.forEach(id => { const ns = g.nodes[id]; if (ns && ns.by && ns.token === r && !ns.defused) { add(loss, ns.by, 6 * ctlF(ns.c || 0, .85, 1)); add(tl, ns.by, 1); ev.push({ t: 'token', k: id, by: ns.by, hit: true, dmg: rnd(6 * ctlF(ns.c || 0, .85, 1)), sev: 'M', p: 1, roll: 0, echo: [] }); hitP[ns.by] = 1; } });
    }
    if (r === 4) Object.keys(g.players).forEach(pid => { const d = (g.dil || {})[pid];
      if (d === 'disclose') { add(loss, pid, 3); add(tl, pid, -1); ev.push({ t: 'dil', by: pid, k: 'dilemma', hit: false, label: 'Disclosed the flaw', p: 0, roll: 0, echo: [] }); }
      else { const roll = rng(), leak = roll < .5; if (leak) add(tl, pid, 3); ev.push({ t: 'dil', by: pid, k: 'dilemma', hit: leak, label: leak ? 'Stayed quiet · it leaked' : 'Stayed quiet · got away with it', p: .5, roll, echo: [] }); } });
    // shared-liability pacts split cash losses
    (g.pacts || []).filter(p => p.on && p.from <= r && p.until >= r).forEach(p => { const t = (loss[p.a] || 0) + (loss[p.b] || 0); loss[p.a] = t / 2; loss[p.b] = t / 2; });
    Object.keys(g.players).forEach(pid => { const p = g.players[pid]; p.cash = rnd(p.cash - (loss[pid] || 0)); let t = p.trust - (tl[pid] || 0) - (echoT[pid] ? 1 : 0); if (!hitP[pid] && r >= 2) t += 1; p.trust = clamp(t);
      });
    return { ev, loss, tl, echoT }; }
  /* settle: revenue, then the round-4 audit */
  function settle(g, r) {
    const out = {};
    Object.keys(g.players).forEach(pid => { const p = g.players[pid]; let rev = 0; IDS.forEach(id => { if (g.nodes[id] && g.nodes[id].by === pid) rev += revOf(g, id, r, p.trust); }); p.cash = rnd(p.cash + rev); out[pid] = { rev: rnd(rev), lines: [] }; });
    if (r === 4) Object.keys(g.players).forEach(pid => { const p = g.players[pid]; let t = p.trust;
      IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || ns.by !== pid) return; const N = NODES[id];
        if (N.tier === 'high' && (ns.c || 0) < 2) { p.cash = rnd(p.cash - 6); t -= 2; out[pid].lines.push('Fined €6M · high-risk system without 2 controls'); }
        if (!ns.fixed && !ns.mit && (!ns.scanned || ns.acc)) { t -= 1; out[pid].lines.push(ns.scanned ? 'Accepted risk logged against you' : 'Never scanned: negligence'); }
        if ((ns.c || 0) >= 4) { t += 1; out[pid].lines.push('Certified system +1 Trust'); } });
      p.trust = clamp(t); });
    return out; }
  const owned = (g, pid) => IDS.filter(id => g.nodes[id] && g.nodes[id].by === pid);
  function worth(g, pid) { let v = g.players[pid].cash; owned(g, pid).forEach(id => { const c = g.nodes[id].c || 0; v += .8 * NODES[id].price + 2 * c + (c >= 4 ? 3 : 0); }); return v; }
  const finalScore = (g, pid) => worth(g, pid) * (0.6 + 0.08 * g.players[pid].trust);
  window.ECHO = { SEV, COST, START, TOPUP, MULT, RATE, TIERN, NODES, LINKS, NB, IDS, VULN, PACKS, ROUNDS, STEPS, STEPN, ctlF, sevOf, oddsOf, nameOf, revOf, resolveBids, attack, settle, owned, worth, finalScore, clamp, rnd, CATS };
})();
