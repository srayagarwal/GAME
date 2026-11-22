/* ECHO · rules engine. Pure functions, no DOM. Deterministic except the attack draw (rng passed in). */
(function () {
  const SEV = { L: { p: .10, d: 4, t: 0, n: 'Low' }, M: { p: .25, d: 9, t: .5, n: 'Medium' }, H: { p: .40, d: 18, t: 1, n: 'High' }, C: { p: .60, d: 30, t: 2, n: 'Critical' } };
  const UP = { L: 'M', M: 'H', H: 'C', C: 'C' };
  const COST = { ctl: 5, ft: 3, scan: 3, fix: 6, mit: 4, ins: 3, defuse: 3 };
  const SLOTS = { prv: { n: 'Prevent', d: 'Stop bad inputs and limit what the system can do' }, tst: { n: 'Test', d: 'Find the weakness before an attacker does' }, mon: { n: 'Detect', d: 'Spot problems quickly once the system is live' }, own: { n: 'Oversee & prove', d: 'People in charge, and evidence a regulator can inspect' } };
  const CT = {
    grd: { s: 'prv', n: 'Guardrails & input filtering', d: 'Blocks malicious or out-of-scope prompts before the model sees them.', ref: 'EU AI Act Art. 15' },
    lpv: { s: 'prv', n: 'Least-privilege access', d: 'Gives the system only the data and permissions it really needs.', ref: 'GDPR Art. 25' },
    ksw: { s: 'prv', n: 'Kill switch & rate limits', d: 'Lets you stop a runaway or misbehaving system at once.', ref: 'EU AI Act Art. 14' },
    min: { s: 'prv', n: 'Data minimisation', d: 'Collects and keeps only the personal data that is necessary.', ref: 'GDPR Art. 5' },
    rdt: { s: 'tst', n: 'Red-teaming', d: 'Experts attack the system before launch, like a real adversary.', ref: 'EU AI Act Art. 15' },
    bia: { s: 'tst', n: 'Bias & fairness testing', d: 'Tests outcomes across groups before and after launch.', ref: 'EU AI Act Art. 10' },
    evl: { s: 'tst', n: 'Accuracy & hallucination evals', d: 'Measures how often it is wrong, and how.', ref: 'EU AI Act Art. 15' },
    pen: { s: 'tst', n: 'Penetration test & vulnerability scan', d: 'Looks for known flaws in code, models, libraries and servers.', ref: 'EU AI Act Art. 15 · DORA' },
    dqc: { s: 'tst', n: 'Data quality & poisoning checks', d: 'Checks training data is clean, licensed and untampered.', ref: 'EU AI Act Art. 10' },
    drf: { s: 'mon', n: 'Drift monitoring', d: 'Alerts you when performance quietly gets worse.', ref: 'EU AI Act Art. 72' },
    anm: { s: 'mon', n: 'Anomaly & misuse alerts', d: 'Flags unusual use, attacks and abuse as they happen.', ref: 'EU AI Act Art. 15' },
    log: { s: 'mon', n: 'Output logging & sampling', d: 'Records what it did and reviews a sample every week.', ref: 'EU AI Act Art. 12' },
    esc: { s: 'mon', n: 'Incident detection & escalation', d: 'Staff know how to spot an incident and who to tell.', ref: 'EU AI Act Art. 73' },
    hum: { s: 'own', n: 'Human-in-the-loop review', d: 'A named person approves high-impact decisions and can override.', ref: 'EU AI Act Art. 14' },
    xai: { s: 'own', n: 'Explainability', d: 'Every decision comes with a reason people can understand.', ref: 'EU AI Act Art. 13' },
    doc: { s: 'own', n: 'Documentation & audit trail', d: 'Technical records and logs a regulator can inspect.', ref: 'EU AI Act Arts. 11-12' },
    ria: { s: 'own', n: 'Impact assessment (DPIA / FRIA)', d: 'Assesses the harm to people before the system goes live.', ref: 'GDPR Art. 35 · AI Act Art. 27' },
    trn: { s: 'own', n: 'Transparency notice', d: 'Tells people they are dealing with an AI system.', ref: 'EU AI Act Art. 50' } };
  const FITS = { chat: ['grd', 'rdt'], compl: ['bia', 'hum'], cred: ['dqc', 'doc'], fraud: ['rdt', 'anm'], aml: ['drf', 'evl'], doc: ['lpv', 'log'], coll: ['ksw', 'hum'], pay: ['hum', 'ksw'], robo: ['hum', 'evl'], suit: ['xai', 'bia'], wealth: ['evl', 'grd'], lake: ['lpv', 'pen'], fm: ['pen', 'anm'], offer: ['trn', 'ria'] };
  const FND = {
    gov: { n: 'AI governance framework', c: 8, d: 'Board-level policy, roles and reporting. In the round 4 audit, fines are halved and you gain +1 Trust.', ref: 'EU AI Act Art. 17 · ISO 42001' },
    inv: { n: 'AI inventory & named owner', c: 2, d: 'You know every AI system you run and who owns it. Systems earn 3% more because accountability is clear, and negligence penalties in the audit are waived.', ref: 'EU AI Act Arts. 16, 26' },
    pol: { n: 'AI policy & acceptable use', c: 3, d: 'Clear rules for staff and suppliers. Trust lost to incidents is cut by 50%.', ref: 'EU AI Act Art. 26' },
    irp: { n: 'Incident response plan', c: 5, d: 'Roles and playbooks ready. Disclosing the flaw is free, and echoes from neighbours hurt 25% less.', ref: 'EU AI Act Art. 73' },
    eth: { n: 'Ethics & risk committee', c: 6, d: 'Independent review of every system. All systems you own are scanned automatically.', ref: 'EU AI Act Art. 9' },
    lit: { n: 'AI literacy programme', c: 6, d: 'Staff can judge what they read. Acting on a news card costs €1M, and a fake costs no Trust.', ref: 'EU AI Act Art. 4' },
    ven: { n: 'Vendor due diligence', c: 5, d: 'Checks suppliers and shared models. Damage echoing from shared pipelines and models is cut by 50%.', ref: 'EU AI Act Art. 25 · DORA Art. 28' },
    mpl: { n: 'Continuous monitoring platform', c: 5, d: 'One view of every system. Attack odds on all your systems are 20% lower.', ref: 'EU AI Act Art. 72' } };
  const FIT_ODDS = .9, FIT_DMG = .95;
  const hasFit = (id, ns) => !!(ns && ns.k && FITS[id] && ns.k.some(k => FITS[id].indexOf(k) >= 0));
  const slotsUsed = ns => (ns && ns.k || []).map(k => CT[k] && CT[k].s);
  const fnd = (g, pid, f) => !!(g.players[pid] && g.players[pid].fnd && g.players[pid].fnd[f]);
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
  const effC = (ns, r) => { const c = (ns && ns.c) || 0; return c >= 4 ? c : Math.min(3, c + (ns && (ns.lic || 0) >= r ? 1 : 0)); };
  const ctlF = (c, a, b) => Math.pow(a, Math.min(c, 3)) * (c >= 4 ? b : 1);
  const sevOf = (id, r) => { const n = NODES[id]; return n.agentic && r >= 3 ? UP[n.sev] : n.sev; };
  const oddsOf = (id, r, ns) => { if (!ns || ns.fixed || !MULT[r]) return 0; if (id === 'fm' && r === 3) return .9; return Math.min(.95, SEV[sevOf(id, r)].p * MULT[r] * ctlF(effC(ns, r), .8, .9) * (hasFit(id, ns) ? FIT_ODDS : 1)); };
  const nameOf = (pack, id) => (PACKS[pack] || PACKS.banking).n[id];
  const revOf = (g, id, r, trust) => {
    const ns = g.nodes[id], N = NODES[id]; if (!ns || !ns.by || ns.pause === r) return 0;
    const ce = effC(ns, r); let b = RATE[N.tier] * N.price * (1 + .25 * Math.min(ce, 3) + ((ns.c || 0) >= 4 ? .125 : 0));
    if (N.agentic && r >= 3) b *= 1.5; if (N.tier === 'high' && ce < 2) b *= .5;
    b *= trust >= 7 ? 1.1 : trust <= 3 ? .75 : 1; if (fnd(g, ns.by, 'inv')) b *= 1.03;
    if (N.cat !== 'hub') { const mine = IDS.filter(x => NODES[x].cat === N.cat && !NODES[x].banned); if (mine.length === 3 && mine.every(x => g.nodes[x] && g.nodes[x].by === ns.by)) b *= 1.2; }
    if ((ns.c || 0) >= 4 && r === 4) b *= 1.15; return b; };
  const holders = ns => ns.co ? [[ns.by, .5], [ns.co, .5]] : [[ns.by, 1]];
  const CARDS = [null,
    [{ real: true, h: 'Regulator guidance: high-risk systems need two controls before the audit', n: 'Official guidance' }, { real: false, h: 'Blog: "Controls are optional if your vendor is certified"', n: 'Unverified post' }],
    [{ real: true, h: 'Security bulletin: attackers are probing exposed AI systems this round', n: 'Security bulletin' }, { real: false, h: 'Influencer: "Insurance is pointless, attackers only hit big firms"', n: 'Social media' }],
    [{ real: true, h: 'Vendor advisory: a flaw is being exploited in a shared model', n: 'Vendor advisory' }, { real: false, h: 'Forum: "The model flaw is a hoax, ignore the patch"', n: 'Anonymous forum' }],
    [{ real: true, h: 'Auditor notice: documented controls are scored first', n: 'Auditor notice' }, { real: false, h: 'Rumour: "The regulator audit has been cancelled"', n: 'Rumour' }]];
  const CARD_COST = 3, ALERT = .8, LIC_SHARE = .25, CO_SHARE = .4;
  const clamp = t => Math.max(0, Math.min(10, t));
  const rnd = x => Math.round(x * 10) / 10;
  /* sealed bids -> owners. g.bids[pid][id]=amount. Highest bid wins; ties go to the player with least cash. */
  function resolveBids(g) {
    const list = []; Object.keys(g.bids || {}).forEach(pid => Object.keys(g.bids[pid] || {}).forEach(id => { const a = +g.bids[pid][id]; if (a > 0 && NODES[id] && !NODES[id].banned && !(g.nodes[id] && g.nodes[id].by)) list.push({ pid, id, a, cash: g.players[pid].cash }); }));
    list.sort((x, y) => y.a - x.a || x.cash - y.cash); const won = [];
    list.forEach(b => { if (g.nodes[b.id] && g.nodes[b.id].by) return; const p = g.players[b.pid]; if (p.cash >= b.a) { p.cash = rnd(p.cash - b.a); g.nodes[b.id] = { by: b.pid, c: 0, bought: g.round }; if (fnd(g, b.pid, 'eth')) g.nodes[b.id].scanned = true; won.push(b); } });
    return won; }
  /* attack phase: the ONLY randomness in the game */
  function attack(g, r, rng) {
    const ev = [], loss = {}, tl = {}, hitP = {}, echoT = {}, add = (o, k, v) => o[k] = (o[k] || 0) + v;
    if (MULT[r]) {
      IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || !ns.by || ns.fixed) return; const al = ((g.players[ns.by] && g.players[ns.by].alert === r) ? ALERT : 1) * (fnd(g, ns.by, 'mpl') ? .8 : 1);
        const p = Math.min(.95, oddsOf(id, r, ns) * al), roll = rng(); ev.push({ t: 'atk', k: id, by: ns.by, co: ns.co || null, p, roll, hit: roll < p, sev: sevOf(id, r), echo: [] }); });
      ev.filter(e => e.hit).forEach(e => { const ns = g.nodes[e.k], ce = effC(ns, r), d = SEV[e.sev].d * ctlF(ce, .85, .95) * (hasFit(e.k, ns) ? FIT_DMG : 1) * (ns.mit ? .5 : 1);
        e.dmg = rnd(d); const lt = SEV[e.sev].t * (ns.mit ? .5 : 1);
        holders(ns).forEach(([pid, sh]) => { add(loss, pid, (ns.ins ? d * .3 : d) * sh); add(tl, pid, lt * sh); hitP[pid] = 1; });
        if ((ns.lic || 0) >= r && ns.licBy && g.players[ns.licBy]) add(tl, ns.licBy, 1); // lender shares the blame
        NB[e.k].forEach(nb => { const nn = g.nodes[nb]; if (!nn || !nn.by) return; const dd = SEV[e.sev].d * .5 * ctlF(effC(nn, r), .85, 1); e.echo.push(nb);
          holders(nn).forEach(([pid, sh]) => { const mod = (fnd(g, pid, 'irp') ? .75 : 1) * (NODES[e.k].cat === 'hub' && fnd(g, pid, 'ven') ? .5 : 1); add(loss, pid, (nn.ins ? dd * .3 : dd) * sh * mod); if (pid !== ns.by && pid !== ns.co) echoT[pid] = 1; }); }); });
      IDS.forEach(id => { const ns = g.nodes[id]; if (ns && ns.by && ns.token === r && !ns.defused) { const dm = 6 * ctlF(effC(ns, r), .85, 1);
        holders(ns).forEach(([pid, sh]) => { add(loss, pid, dm * sh); add(tl, pid, sh); hitP[pid] = 1; });
        ev.push({ t: 'token', k: id, by: ns.by, hit: true, dmg: rnd(dm), sev: 'M', p: 1, roll: 0, echo: [] }); } });
    }
    if (r === 4) Object.keys(g.players).forEach(pid => { const d = (g.dil || {})[pid];
      if (d === 'disclose') { add(loss, pid, fnd(g, pid, 'irp') ? 0 : 3); add(tl, pid, -1); ev.push({ t: 'dil', by: pid, k: 'dilemma', hit: false, label: 'Disclosed the flaw', p: 0, roll: 0, echo: [] }); }
      else { const roll = rng(), leak = roll < .5; if (leak) add(tl, pid, 3); ev.push({ t: 'dil', by: pid, k: 'dilemma', hit: leak, label: leak ? 'Stayed quiet · it leaked' : 'Stayed quiet · got away with it', p: .5, roll, echo: [] }); } });
    // shared-liability pacts split cash losses
    (g.pacts || []).filter(p => p.on && p.from <= r && p.until >= r && g.players[p.a] && g.players[p.b]).forEach(p => { const t = (loss[p.a] || 0) + (loss[p.b] || 0); loss[p.a] = t / 2; loss[p.b] = t / 2; });
    Object.keys(g.players).forEach(pid => { const p = g.players[pid]; const tv = tl[pid] || 0; let t = p.trust - (tv > 0 ? tv * (fnd(g, pid, 'pol') ? .5 : 1) : tv) - (echoT[pid] ? 1 : 0); if (!hitP[pid] && r >= 2) t += 1;
      t -= payOut(p, loss[pid] || 0); p.trust = clamp(t); });
    return { ev, loss, tl, echoT }; }
  /* cash never goes below zero: an unpaid shortfall becomes a regulator enforcement, -1 Trust per started EUR 5M */
  function payOut(p, x) { p.cash = rnd(p.cash - x); if (p.cash >= 0) return 0; const sh = -p.cash; p.cash = 0; p.debt = rnd((p.debt || 0) + sh); return Math.ceil(sh / 5); }
  /* settle: revenue (with licence fees and co-owner splits), then the round-4 audit */
  function settle(g, r) {
    const out = {}, inc = {}; Object.keys(g.players).forEach(pid => { inc[pid] = 0; out[pid] = { rev: 0, lines: [] }; });
    IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || !ns.by || !g.players[ns.by]) return; let rev = revOf(g, id, r, g.players[ns.by].trust); if (!rev) return;
      if ((ns.lic || 0) >= r && ns.licBy && g.players[ns.licBy]) { const fee = rev * LIC_SHARE; inc[ns.licBy] += fee; rev -= fee; out[ns.licBy].lines.push('Licence fee +€' + rnd(fee) + 'M'); }
      holders(ns).forEach(([pid, sh]) => { inc[pid] += rev * sh; }); });
    Object.keys(g.players).forEach(pid => { const p = g.players[pid]; p.cash = rnd(p.cash + inc[pid]); out[pid].rev = rnd(inc[pid]); });
    if (r === 4) Object.keys(g.players).forEach(pid => { const p = g.players[pid]; let t = p.trust;
      IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || ns.by !== pid) return; const N = NODES[id];
        if (N.tier === 'high' && effC(ns, r) < 2) { const gv = fnd(g, pid, 'gov'); t -= payOut(p, gv ? 3 : 6) + (gv ? 1 : 2); out[pid].lines.push('Fined €6M · high-risk system without 2 controls'); }
        if (!fnd(g, pid, 'inv') && !ns.fixed && !ns.mit && (!ns.scanned || ns.acc)) { t -= 1; out[pid].lines.push(ns.scanned ? 'Accepted risk logged against you' : 'Never scanned: negligence'); }
        if ((ns.c || 0) >= 4) { t += 1; out[pid].lines.push('Certified system +1 Trust'); } });
      if (fnd(g, pid, 'gov')) { t += 1; out[pid].lines.push('Governance framework +1 Trust'); }
      p.trust = clamp(t); });
    return out; }
  const owned = (g, pid) => IDS.filter(id => g.nodes[id] && g.nodes[id].by === pid);
  function worth(g, pid) { let v = g.players[pid].cash; IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || !ns.by) return; const h = holders(ns).find(x => x[0] === pid); if (!h) return; const c = ns.c || 0; v += h[1] * (.8 * NODES[id].price + 2 * c + (c >= 4 ? 3 : 0)); }); return v; }
  const finalScore = (g, pid) => worth(g, pid) * (0.6 + 0.08 * g.players[pid].trust);
  window.ECHO = { SLOTS, CT, FITS, FND, slotsUsed, fnd, hasFit, FIT_ODDS, FIT_DMG, effC, holders, payOut, CARDS, CARD_COST, ALERT, LIC_SHARE, CO_SHARE, SEV, COST, START, TOPUP, MULT, RATE, TIERN, NODES, LINKS, NB, IDS, VULN, PACKS, ROUNDS, STEPS, STEPN, ctlF, sevOf, oddsOf, nameOf, revOf, resolveBids, attack, settle, owned, worth, finalScore, clamp, rnd, CATS };
})();
