/* ALPHA engine · pure functions, no DOM. Shared by the phone, the projector, the host and the tests.
   A mind map of AI controls: eight branches, 35 controls, levels Basic / Strong / Leading, four rounds, random attacks. */
(function (root) {
  const DISC = ['Govern', 'Data', 'Model', 'Security', 'Operate', 'People', 'Assurance', 'Third parties'];
  const DSHORT = { 'Third parties': '3rd parties' };
  const DCOL = { Govern: '#f2c14e', Data: '#5bc0eb', Model: '#b4a8ff', Security: '#ff6b87', Operate: '#f39c3d', People: '#3dd6a3', Assurance: '#9be564', 'Third parties': '#ff8fd0' };
  const LV = ['Basic', 'Strong', 'Leading'], ABS = [0.30, 0.55, 0.75], CAP = 0.95;
  // id: [name, discipline, cost, round it opens, what it does]
  const C = {
    pol: ['AI policy & standards', 'Govern', 2, 1, 'Written rules on what AI may and may not do'],
    inv: ['AI system inventory', 'Govern', 2, 1, 'A live list of every AI system, owner and risk tier'],
    brd: ['Board AI oversight', 'Govern', 3, 1, 'A named board owner and regular AI risk reporting'],
    pdp: ['Policy decision point', 'Govern', 4, 2, 'A policy engine that allows or blocks each AI action at run time'],
    sem: ['Semantic policy (intent check)', 'Govern', 3, 3, 'Checks what a request means, so reworded attacks cannot slip past'],
    lin: ['Data lineage & provenance', 'Data', 2, 1, 'Tracks where every training and retrieval document came from'],
    enc: ['Encryption & key management', 'Data', 3, 1, 'Protects data at rest and in transit'],
    rag: ['Poisoned-document screening', 'Data', 2, 2, 'Scans documents before the assistant is allowed to read them'],
    pii: ['PII & data-leak scanner', 'Data', 2, 2, 'Finds personal data in prompts, outputs and stores'],
    adv: ['Adversarial testing', 'Model', 3, 1, 'Tries to break the model before an attacker does'],
    bia: ['Bias & fairness testing', 'Model', 2, 1, 'Tests outcomes across groups before and after launch'],
    har: ['Evaluation harness', 'Model', 3, 2, 'Repeatable test suite that must pass before every release'],
    red: ['Red-team exercise', 'Model', 4, 3, 'A dedicated team attacks the live system under rules of engagement'],
    grd: ['Guardrails & input filtering', 'Security', 2, 1, 'Blocks unsafe or off-policy requests at the door'],
    inj: ['Prompt-injection defences', 'Security', 2, 1, 'Stops hidden instructions in prompts and documents'],
    out: ['Output filtering', 'Security', 2, 1, 'Checks answers before they reach the customer'],
    kil: ['Kill switch', 'Security', 2, 1, 'Stops an AI system or agent immediately'],
    tps: ['Tool permission scoping', 'Security', 2, 2, 'Agents only get the tools and limits they need'],
    sca: ['Static code analysis for AI code', 'Security', 1, 2, 'Scans prompts, plug-ins and glue code for known flaws'],
    vul: ['LLM vulnerability scanner', 'Security', 2, 2, 'Continuously probes your AI systems for new weaknesses'],
    aid: ['Agent identity & access', 'Security', 3, 3, 'Every agent has its own identity, credentials and audit trail'],
    drf: ['Drift & anomaly monitoring', 'Operate', 2, 1, 'Spots when quality, cost or behaviour moves off baseline'],
    irp: ['Incident response plan', 'Operate', 4, 1, 'Rehearsed playbook, roles and regulator notifications'],
    vpt: ['Virtual patching at the gateway', 'Operate', 2, 2, 'Blocks a known flaw at the gateway while the real fix is built'],
    rem: ['Automated remediation', 'Operate', 3, 3, 'Detects, contains and fixes common problems without waiting for a person'],
    hil: ['Human-in-the-loop review', 'People', 3, 1, 'A person approves the decisions that matter'],
    lit: ['AI literacy training', 'People', 2, 1, 'Staff know what AI can and cannot be trusted to do'],
    esc: ['Escalation & whistleblowing', 'People', 1, 2, 'A safe route for anyone to raise an AI concern'],
    aud: ['Audit trail & logs', 'Assurance', 2, 1, 'Immutable record of inputs, outputs and decisions'],
    reg: ['Regulatory mapping', 'Assurance', 2, 1, 'Each system mapped to the rules that apply to it'],
    ind: ['Independent audit', 'Assurance', 4, 3, 'An outside party tests your controls and signs off'],
    ccm: ['Continuous compliance monitoring', 'Assurance', 3, 3, 'Controls are tested every day, not once a year'],
    ven: ['Vendor monitoring', 'Third parties', 2, 2, 'Tracks the AI vendors you rely on and their changes'],
    vsa: ['Vendor security assessment', 'Third parties', 2, 2, 'Security review of a vendor before and after contract'],
    exi: ['Exit & portability terms', 'Third parties', 2, 3, 'You can leave a vendor without losing your service'],
    aup: ['Acceptable-use policy', 'Govern', 2, 1, 'Plain rules for staff and customers on what the AI may be used for'],
    rsk: ['AI risk tiering', 'Govern', 2, 1, 'Every system gets a risk tier that decides how much control it needs'],
    rac: ['RACI & sign-off', 'Govern', 1, 1, 'Named owners and a sign-off step before anything goes live'],
    pac: ['Policy-as-code library', 'Govern', 2, 2, 'Reusable machine-readable rules the policy engine can enforce'],
    icl: ['Intent classifier', 'Govern', 2, 3, 'Labels what a request is really trying to do'],
    lbl: ['Consent & labelling register', 'Data', 2, 1, 'Records what data may be used for what, and why'],
    msk: ['Masking & tokenisation', 'Data', 2, 2, 'Hides sensitive values before they reach a model'],
    idx: ['Index access controls', 'Data', 2, 2, 'The assistant can only retrieve what the user may see'],
    jbk: ['Jailbreak test pack', 'Model', 2, 2, 'A maintained library of known jailbreaks, run before each release'],
    bnc: ['Benchmark release gates', 'Model', 2, 2, 'A release is blocked if quality drops below the agreed bar'],
    xpl: ['Explainability tooling', 'Model', 3, 2, 'Shows why the model decided what it decided'],
    tpc: ['Topic & scope limits', 'Security', 1, 1, 'The assistant refuses subjects outside its job'],
    jbc: ['Jailbreak classifier', 'Security', 2, 2, 'A detector that spots jailbreak attempts as they arrive'],
    dlp: ['Output data-loss prevention', 'Security', 2, 2, 'Stops sensitive data leaving in an answer'],
    sbx: ['Sandboxed execution', 'Security', 3, 2, 'Agent code and tools run in a box with no reach into the rest'],
    dst: ['Prompt fuzzing', 'Security', 2, 3, 'Automatically mutates prompts to find weaknesses'],
    mcp: ['Plug-in & MCP scanner', 'Security', 2, 3, 'Checks every connected tool and plug-in for hidden risk'],
    anm: ['Usage anomaly alerts', 'Operate', 2, 1, 'Alerts on odd volumes, costs or behaviour'],
    rbk: ['Rollback & versioning', 'Operate', 2, 2, 'Go back to the last good model or prompt in minutes'],
    apv: ['Approval thresholds', 'People', 1, 2, 'Anything above a set value or risk needs a person'],
    rol: ['Role-based training', 'People', 2, 2, 'Different training for builders, approvers and users'],
    ev: ['Evidence vault', 'Assurance', 2, 2, 'Test results and approvals stored so you can prove them'],
    ass: ['Impact assessments', 'Assurance', 3, 2, 'A documented assessment of harm before launch'],
    ctr: ['AI contract clauses', 'Third parties', 2, 1, 'Contracts cover data use, audit rights and incident notice'],
    sla: ['Model-change notices', 'Third parties', 1, 2, 'The vendor must tell you before changing the model'],
    bkp: ['Fallback model', 'Third parties', 3, 3, 'A second model you can switch to if the first fails']
  };
  const IDS = Object.keys(C);
  const CT = {}; IDS.forEach(id => CT[id] = { id, n: C[id][0], d: C[id][1], c: C[id][2], r: C[id][3], t: C[id][4] });
  // the mind map below each branch: areas, optional sub-areas, then controls (uneven on purpose)
  const TREE = {
    Govern: [{ n: 'Policy & standards', k: ['pol', 'aup', 'rsk'] }, { n: 'Accountability', k: ['brd', 'inv', 'rac'] }, { n: 'Run-time policy', k: [{ n: 'Policy engine', k: ['pdp', 'pac'] }, { n: 'Semantic policy', k: ['sem', 'icl'] }] }],
    Data: [{ n: 'Provenance', k: ['lin', 'lbl'] }, { n: 'Protection', k: ['enc', 'pii', 'msk'] }, { n: 'Retrieval safety', k: ['rag', 'idx'] }],
    Model: [{ n: 'Testing', k: [{ n: 'Safety testing', k: ['adv', 'red', 'jbk'] }, { n: 'Quality gates', k: ['har', 'bnc'] }] }, { n: 'Fairness & explainability', k: ['bia', 'xpl'] }],
    Security: [{ n: 'Input defences', k: [{ n: 'Guardrails', k: ['grd', 'tpc', 'jbc'] }, 'inj'] }, { n: 'Output defences', k: ['out', 'dlp'] }, { n: 'Agent safety', k: ['kil', 'tps', 'aid', 'sbx'] }, { n: 'Scanning', k: ['vul', 'sca', 'dst', 'mcp'] }],
    Operate: [{ n: 'Detect', k: ['drf', 'anm'] }, { n: 'Respond', k: ['irp', 'vpt', 'rem', 'rbk'] }],
    People: [{ n: 'Oversight', k: ['hil', 'apv'] }, { n: 'Capability', k: ['lit', 'rol', 'esc'] }],
    Assurance: [{ n: 'Evidence', k: ['aud', 'ev'] }, { n: 'Compliance', k: ['reg', 'ccm'] }, { n: 'Independent', k: ['ind', 'ass'] }],
    'Third parties': [{ n: 'Due diligence', k: ['vsa', 'ctr'] }, { n: 'Ongoing', k: ['ven', 'sla'] }, { n: 'Exit', k: ['exi', 'bkp'] }]
  };
  const leaves = node => typeof node === 'string' ? [node] : node.k.reduce((a, x) => a.concat(leaves(x)), []);
  const OF = d => TREE[d].reduce((a, n) => a.concat(leaves(n)), []);
  // sanity: the tree and the catalogue must agree
  IDS.forEach(id => { if (OF(CT[id].d).indexOf(id) < 0) throw new Error('control not in tree: ' + id); });
  // cross-links on the mind map: owning both ends earns "Linked pair"
  const LINKS = [['pol', 'reg'], ['inv', 'aud'], ['grd', 'out'], ['kil', 'tps'], ['vul', 'vpt'], ['rag', 'lin'], ['hil', 'esc'], ['ven', 'exi'], ['drf', 'rem'], ['sem', 'pdp'], ['adv', 'red'], ['irp', 'rem'], ['aid', 'tps'], ['lit', 'hil'], ['enc', 'pii'], ['jbc', 'grd'], ['dlp', 'out'], ['anm', 'drf'], ['bkp', 'exi'], ['ev', 'aud'], ['pac', 'pdp']];

  // attacks: s = controls that absorb it (first three count fully, the rest at 60%), h = branches hit
  const A = {
    inj: { n: 'Prompt injection', k: 'Branch-wide', h: ['Security'], s: ['inj', 'grd', 'out', 'adv', 'vul', 'vpt', 'jbc', 'tpc', 'jbk'], b: 10, r: 1, d: 'A crafted message makes the assistant ignore its rules and reveal data.', tell: 'A customer posts a screenshot of the assistant leaking its rules.' },
    leak: { n: 'Customer data leak', k: 'Branch-wide', h: ['Data'], s: ['enc', 'pii', 'lin', 'grd', 'out', 'irp', 'msk', 'dlp', 'lbl'], b: 11, r: 1, d: 'Personal data appears in answers and in the logs.', tell: 'A journalist asks why an answer quoted a stranger\'s account.' },
    bias: { n: 'Discrimination complaint', k: 'Targeted', h: ['Model', 'People'], s: ['bia', 'har', 'hil', 'lit', 'aud', 'ind', 'xpl', 'bnc', 'ass'], b: 10, r: 1, d: 'A group of customers is treated worse by the model, and someone notices.', tell: 'A consumer body files a complaint about approval rates.' },
    drift: { n: 'Silent model drift', k: 'Targeted', h: ['Model', 'Operate'], s: ['drf', 'har', 'hil', 'rem', 'ccm', 'anm', 'bnc', 'rbk'], b: 9, r: 1, d: 'Quality slowly slides for weeks before anyone looks.', tell: 'Complaints creep up, but nothing triggers an alert.' },
    rag: { n: 'RAG poisoning', k: 'Targeted', h: ['Data', 'Security'], s: ['rag', 'lin', 'sem', 'out', 'enc', 'idx', 'aup'], b: 9, r: 2, d: 'A planted document steers the assistant to fraudulent advice.', tell: 'Answers about fees quote a policy nobody wrote.' },
    rogue: { n: 'Rogue agent action', k: 'Targeted', h: ['Security', 'People'], s: ['kil', 'tps', 'hil', 'aid', 'vpt', 'esc', 'sbx', 'apv'], b: 12, r: 2, d: 'An agent takes actions nobody approved, then keeps going.', tell: 'Three unusual transactions land in the middle of the night.' },
    unsc: { n: 'Unscanned vulnerability', k: 'Branch-wide', h: ['Security', 'Operate'], s: ['vul', 'sca', 'vpt', 'rem', 'adv', 'red', 'dst', 'mcp', 'jbk'], b: 10, r: 2, d: 'A known flaw nobody scanned for is used against you.', tell: 'A researcher publishes a proof of concept on your product.' },
    ven: { n: 'Vendor model outage', k: 'Branch-wide', h: ['Third parties', 'Operate'], s: ['ven', 'vsa', 'exi', 'irp', 'drf', 'rem', 'ctr', 'sla', 'bkp'], b: 9, r: 2, d: 'Your AI vendor fails or changes the model with no notice.', tell: 'Status page turns red and support goes quiet.' },
    wallet: { n: 'Denial of wallet', k: 'Branch-wide', h: ['Operate', 'Security'], s: ['drf', 'grd', 'rem', 'vpt', 'kil', 'anm', 'tpc'], b: 8, r: 2, d: 'Bots drive up usage and run up your model bill.', tell: 'Finance asks why the cloud bill tripled overnight.' },
    insider: { n: 'Insider misuse', k: 'Targeted', h: ['People', 'Security'], s: ['aid', 'hil', 'lit', 'aud', 'esc', 'tps', 'rol', 'apv', 'ev'], b: 9, r: 2, d: 'An employee uses AI access to take or change things they should not.', tell: 'An unusual export shows up in the access log.' },
    bypass: { n: 'Paraphrased policy bypass', k: 'Targeted', h: ['Govern', 'Security'], s: ['sem', 'pdp', 'inj', 'har', 'red', 'pac', 'icl', 'jbc'], b: 9, r: 3, d: 'The same forbidden request, reworded, walks past your keyword rules.', tell: 'A forum thread shares the rewording trick.' },
    stuck: { n: 'Fix that never stuck', k: 'Targeted', h: ['Operate', 'Assurance'], s: ['ccm', 'rem', 'vul', 'aud', 'irp', 'rbk', 'ev'], b: 9, r: 3, d: 'A flaw you "fixed" last quarter is back, and nobody tested it again.', tell: 'The same ticket is raised for the third time.' },
    sector: { n: 'Sector-wide AI incident', k: 'Whole tree', h: DISC.slice(), s: ['irp', 'brd', 'inv', 'hil', 'aud', 'exi', 'rem', 'bkp', 'rsk'], b: 14, r: 3, d: 'A shared model fails across the industry and every branch is shaken.', tell: 'Three competitors announce outages in the same hour.' },
    reg: { n: 'Regulator investigation', k: 'Regulatory', h: ['Govern', 'Assurance'], s: ['aud', 'reg', 'inv', 'brd', 'pol', 'ind', 'ccm', 'ev', 'ass', 'rac', 'rsk'], b: 12, r: 2, d: 'The supervisor asks for your AI inventory, your logs and who signed off.', tell: 'A letter arrives with a ten-day deadline.' }
  };
  const AIDS = Object.keys(A);
  const REGN = { banking: 'Supervisor review (EU AI Act, DORA)', insurance: 'Supervisory review (EU AI Act, Solvency II)', health: 'Regulator audit (EU AI Act, MDR)', energy: 'Regulator audit (NIS2, EU AI Act)', telecom: 'Regulator audit (NIS2, EU AI Act)' };

  // use cases: six shapes, five sector flavours. x = branches this use case exposes (damage x1.4 when an attack hits them)
  const USE = {
    chat: { n: 'Customer-facing assistant', x: ['Security', 'Data'], t: { banking: 'Customer chatbot at a retail bank', insurance: 'Policyholder chatbot at an insurer', health: 'Patient-facing symptom assistant', energy: 'Customer assistant at an energy supplier', telecom: 'Customer-care assistant at a telecom' } },
    decide: { n: 'Decision assistant', x: ['Model', 'Govern'], t: { banking: 'Credit-decision assistant for loan officers', insurance: 'Claims-decision assistant for handlers', health: 'Clinical decision-support for doctors', energy: 'Tariff and hardship-decision assistant', telecom: 'Credit and plan-eligibility assistant' } },
    agent: { n: 'Autonomous agent', x: ['Security', 'People', 'Operate'], t: { banking: 'Autonomous payments agent with its own tools', insurance: 'Autonomous claims-payment agent', health: 'Autonomous scheduling and records agent', energy: 'Autonomous grid-balancing agent', telecom: 'Autonomous network-repair agent' } },
    copilot: { n: 'Enterprise copilot on a vendor model', x: ['Data', 'Third parties'], t: { banking: 'Enterprise copilot on a vendor model', insurance: 'Underwriter copilot on a vendor model', health: 'Clinician copilot on a vendor model', energy: 'Engineer copilot on a vendor model', telecom: 'Sales and service copilot on a vendor model' } },
    triage: { n: 'High-risk triage', x: ['Model', 'People'], t: { banking: 'Fraud and AML alert triage', insurance: 'Fraud and underwriting triage', health: 'Emergency-triage prioritisation', energy: 'Outage and safety-incident triage', telecom: 'Fraud and abuse triage' } },
    ops: { n: 'AI in operations', x: ['Operate', 'Third parties'], t: { banking: 'AI-driven trading-operations monitor', insurance: 'AI-driven claims-operations monitor', health: 'AI-driven hospital-operations planner', energy: 'AI-driven asset-maintenance planner', telecom: 'AI-driven network-operations monitor' } }
  };
  const SECTORS = { banking: 'Banking', insurance: 'Insurance', health: 'Healthcare', energy: 'Energy', telecom: 'Telecom' };
  const DEFAULT_UC = ['chat', 'decide', 'agent', 'copilot'];
  const ROUNDS = {
    1: { name: 'Foundations', theme: 'Lay the groundwork', more: 'Eight branches are open. Start with what matters for this use case.' },
    2: { name: 'Scale', theme: 'Add scanners, policy and the people layer', more: 'Scanners, the policy engine, agent safety and third-party branches open.' },
    3: { name: 'Pressure', theme: 'Attackers get smarter', more: 'Semantic policy, red teams, agent identity and independent assurance open.' },
    4: { name: 'Reckoning', theme: 'Everything is tested', more: 'No new branches. Close your gaps, then everything is tested.' }
  };
  const START = 40, TOPUP = { 2: 16, 3: 16, 4: 12 }, BASE_EQ = 40, EXPO = 1.4, RISE = 0.12, UPG = 0.6, BUNDLE = 0.85;

  // surprise cards. g = for everyone, p = one random player
  const BON = {
    disc: { t: 'g', n: 'Bulk licence deal', d: 'Every purchase costs 20% less this round.' },
    grant: { t: 'g', n: 'Regulator innovation grant', d: 'Every player receives +4 budget.' },
    price: { t: 'g', n: 'Vendor price rise', d: 'Third-party and Data controls cost 25% more this round.' },
    sprint: { t: 'g', n: 'Standards update', d: 'Strengthening a control costs half price this round.' },
    early: { t: 'g', n: 'New branch opens early', d: 'Next round\'s controls are open now. Early buyers earn +2.' },
    free: { t: 'p', n: 'Bug-bounty find', d: 'receives a free Basic Security or Operate control.' },
    gift: { t: 'p', n: 'Open-source release', d: 'receives a free Basic control from any open branch.' },
    wind: { t: 'p', n: 'Insurance payout', d: 'receives +5 budget.' },
    lose: { t: 'p', n: 'Key engineer leaves', d: 'loses one level on their strongest control.' }
  };
  const BIDS = Object.keys(BON);

  /* ---------- helpers ---------- */
  const rnd = x => Math.round(x * 10) / 10;
  const half = x => Math.ceil(x * 2 - 1e-9) / 2;
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const isOpen = (id, G) => CT[id].r <= G.round + (G.fx && G.fx.early ? 1 : 0);
  const up = id => half(CT[id].c * UPG);
  function price(G, p, id) {
    const l = (p.own || {})[id], fx = G.fx || {}; let x;
    if (l == null) x = CT[id].c; else if (l >= 2) return null; else x = up(id);
    if (l != null && fx.sprint) x *= 0.5;
    if (fx.disc) x *= 0.8;
    if (fx.price && (CT[id].d === 'Third parties' || CT[id].d === 'Data')) x *= 1.25;
    return half(x);
  }
  function bundleIds(G, p, ids) { ids = ids.filter(id => isOpen(id, G) && (p.own || {})[id] == null); if (ids.length < 2) return null; return { ids, cost: half(ids.reduce((s, id) => s + price(G, p, id), 0) * BUNDLE) }; }
  const bundle = (G, p, x) => bundleIds(G, p, typeof x === 'string' ? OF(x) : x);
  function canBuy(G, p, id) { if (!CT[id] || !isOpen(id, G)) return 'closed'; const c = price(G, p, id); if (c == null) return 'max'; if (p.budget < c) return 'cash'; return ''; }
  function buy(G, p, id) { const e = canBuy(G, p, id); if (e) return e; const c = price(G, p, id); p.budget = rnd(p.budget - c); p.own = p.own || {}; p.bought = p.bought || {}; const l = p.own[id]; p.own[id] = l == null ? 0 : l + 1; if (l == null) p.bought[id] = G.round; p.spent = rnd((p.spent || 0) + c); return ''; }
  function buyBundle(G, p, x) { const b = bundle(G, p, x); if (!b) return 'none'; if (p.budget < b.cost) return 'cash'; p.budget = rnd(p.budget - b.cost); p.spent = rnd((p.spent || 0) + b.cost); p.own = p.own || {}; p.bought = p.bought || {}; b.ids.forEach(id => { p.own[id] = 0; p.bought[id] = G.round; }); return ''; }
  const value = p => rnd(Object.keys(p.own || {}).reduce((s, id) => { let v = CT[id].c; for (let i = 0; i < p.own[id]; i++) v += up(id); return s + v; }, 0));

  /* ---------- attacks ---------- */
  function absorb(own, atk, extra) { let keep = 1; const list = [];
    atk.s.forEach((id, i) => { const l = (own || {})[id]; if (l != null) { keep *= 1 - ABS[l] * (i < 3 ? 1 : 0.6); list.push(id); } });
    if (extra) { keep *= 1 - ABS[0] * 0.6; }
    return { pct: Math.min(CAP, 1 - keep), list }; }
  const exposed = (atk, uc) => !!(uc && uc.x && atk.h.some(d => uc.x.indexOf(d) >= 0));
  const baseDmg = (atk, round, uc) => rnd(atk.b * (1 + RISE * (round - 1)) * (exposed(atk, uc) ? EXPO : 1));
  function draw(G, r, used, regRound, rand) {
    const n = r === 1 ? 1 : 2, out = [];
    const pool = AIDS.filter(id => id !== 'reg' && A[id].r <= r && used.indexOf(id) < 0);
    if (regRound === r) out.push('reg');
    while (out.length < n && pool.length) { const i = Math.floor(rand() * pool.length); out.push(pool.splice(i, 1)[0]); }
    return out; }
  function strike(G, atkId, uc) { const atk = A[atkId], base = baseDmg(atk, G.round, uc), res = {};
    Object.keys(G.players).forEach(pid => { const p = G.players[pid], ab = absorb(p.own, atk), loss = rnd(base * (1 - ab.pct)); res[pid] = { loss, pct: ab.pct, saved: ab.list, gaps: atk.s.filter(id => (p.own || {})[id] == null), clean: ab.pct >= 0.8 }; });
    return { id: atkId, base, exposed: exposed(atk, uc), res }; }

  /* ---------- surprises ---------- */
  function drawBonus(G, rand, r) { const pl = Object.keys(G.players), out = { g: null, p: null };
    const gs = ['disc', 'grant', 'price', 'sprint']; if (r < 4) gs.push('early');
    out.g = gs[Math.floor(rand() * gs.length)];
    const ps = ['free', 'gift', 'wind']; if (r >= 2) ps.push('lose');
    const t = ps[Math.floor(rand() * ps.length)]; if (pl.length) out.p = { k: t, pid: pl[Math.floor(rand() * pl.length)] };
    return out; }
  function applyBonus(G, bon, rand) { const lines = []; G.fx = {}; if (!bon) return lines;
    if (bon.g) { const k = bon.g; if (k === 'grant') Object.values(G.players).forEach(p => p.budget = rnd(p.budget + 4)); else G.fx[k] = true; lines.push({ k, who: null }); }
    if (bon.p) { const p = G.players[bon.p.pid]; if (p) { const k = bon.p.k; let note = '';
      const free = (pred) => { const c = IDS.filter(id => isOpen(id, G) && p.own[id] == null && pred(CT[id])); if (!c.length) return null; const id = c[Math.floor(rand() * c.length)]; p.own[id] = 0; p.bought = p.bought || {}; p.bought[id] = G.round; return id; };
      if (k === 'free') { const id = free(c => c.d === 'Security' || c.d === 'Operate'); note = id ? CT[id].n : ''; }
      else if (k === 'gift') { const id = free(() => true); note = id ? CT[id].n : ''; }
      else if (k === 'wind') p.budget = rnd(p.budget + 5);
      else if (k === 'lose') { const ids = Object.keys(p.own).filter(id => p.own[id] > 0).sort((a, b) => p.own[b] - p.own[a]); if (ids.length) { p.own[ids[0]]--; note = CT[ids[0]].n; } else bon.p.k = 'wind', p.budget = rnd(p.budget + 5); }
      lines.push({ k: bon.p.k, who: bon.p.pid, note }); } }
    return lines; }

  /* ---------- awards ---------- */
  function awardsRound(G, ctx) { // ctx: strikes [] for this round; prevLoss {pid:x}
    const out = {}, r = G.round; Object.keys(G.players).forEach(pid => out[pid] = []);
    Object.keys(G.players).forEach(pid => { const p = G.players[pid], own = p.own || {}; p.awd = p.awd || {}; const add = (k, pts, txt) => { out[pid].push({ k, pts, txt }); p.credit = rnd((p.credit || 0) + pts); };
      ctx.strikes.forEach(s => { if (s.res[pid].clean) add('clean', 3, 'Clean sheet: ' + A[s.id].n + ' 80%+ absorbed'); });
      if (r > 1) { const eb = Object.keys(p.bought || {}).filter(id => p.bought[id] === r && CT[id].r === r); if (eb.length) add('early', 2, 'Early bird: bought into a branch the round it opened'); }
      OF && DISC.forEach(d => { const open = OF(d).filter(id => CT[id].r <= r); if (open.length >= 3 && !p.awd['bm' + d] && open.filter(id => own[id] != null).length / open.length >= 1) { p.awd['bm' + d] = 1; add('master', 3, 'Branch master: ' + d); } });
      if (r >= 2) { const covered = DISC.every(d => OF(d).some(id => CT[id].r <= r && own[id] != null) || !OF(d).some(id => CT[id].r <= r)); if (covered) if (!p.awd['bal' + r]) { p.awd['bal' + r] = 1; add('balanced', 3, 'Balanced shield: every open branch covered'); }; }
      Object.keys(own).forEach(id => { if (own[id] === 2 && !p.awd.lead) { p.awd.lead = 1; add('lead', 2, 'Leading edge: first control at Leading (' + CT[id].n + ')'); } });
      LINKS.forEach(([a, b]) => { const k = 'lk' + a + b; if (own[a] != null && own[b] != null && !p.awd[k]) { p.awd[k] = 1; add('link', 1, 'Linked pair: ' + CT[a].n + ' + ' + CT[b].n); } });
      const pl = ctx.prevLoss && ctx.prevLoss[pid]; if (r > 1 && pl != null) { const ranked = Object.keys(ctx.prevLoss).sort((x, y) => ctx.prevLoss[y] - ctx.prevLoss[x]); const avg = ctx.strikes.reduce((s, x) => s + x.res[pid].pct, 0) / Math.max(1, ctx.strikes.length);
        if (ranked.indexOf(pid) < Math.max(1, Math.ceil(ranked.length / 3)) && avg >= 0.6) add('comeback', 3, 'Comeback: strong defence after a hard round'); } });
    return out; }
  function score(p) { return rnd(BASE_EQ - (p.dmg || 0) + (p.credit || 0) + 0.25 * value(p) + 0.5 * p.budget); }
  function finalAwards(G) { const ids = Object.keys(G.players), out = {}; ids.forEach(i => out[i] = []);
    const best = (fn, min) => { let b = null, bv = -1e9; ids.forEach(i => { const v = fn(G.players[i]); if (v > bv) { bv = v; b = i; } }); return b; };
    const cov = p => DISC.filter(d => OF(d).some(id => (p.own || {})[id] != null)).length + Object.keys(p.own || {}).length / 100;
    const defs = [['resilient', 'Most resilient', 'least damage taken', p => -(p.dmg || 0)], ['coverage', 'Widest coverage', 'most branches covered', cov], ['spender', 'Smartest spender', 'most damage absorbed per €', p => (p.saved || 0) / Math.max(1, p.spent || 1)]];
    defs.forEach(([k, n, why, fn]) => { const w = best(fn); if (w) { G.players[w].credit = rnd((G.players[w].credit || 0) + 3); out[w].push({ k, pts: 3, txt: n + ': ' + why }); } });
    return out; }
  const advice = { Govern: 'Write the policy, name the owner, and add a policy engine so rules run at run time.', Data: 'Know where data comes from, screen what the assistant reads, and scan for personal data.', Model: 'Test before launch and keep testing: adversarial, bias and a harness that gates every release.', Security: 'Add layered guardrails, scope every tool and scan continuously for new weaknesses.', Operate: 'Monitor for drift, patch at the gateway, and rehearse the incident plan.', People: 'Keep a person in the loop for decisions that matter and train everyone who touches AI.', Assurance: 'Keep an immutable audit trail, map every system to its rules and test controls continuously.', 'Third parties': 'Monitor and assess every AI vendor, and make sure you can leave one.' };
  function report(G, pid) { const p = G.players[pid], hist = G.history || [];
    const gapVal = {}; hist.forEach(h => { const atk = A[h.id], base = h.base, ab0 = absorb(p.own, atk).pct; atk.s.forEach(id => { if ((p.own || {})[id] == null) { const own2 = Object.assign({}, p.own); own2[id] = 0; const gain = (absorb(own2, atk).pct - ab0) * base; gapVal[id] = (gapVal[id] || 0) + gain; } }); });
    const gaps = Object.keys(gapVal).map(id => ({ id, v: rnd(gapVal[id]) })).sort((a, b) => b.v - a.v).slice(0, 4);
    const cov = DISC.map(d => { const all = OF(d), own = all.filter(id => (p.own || {})[id] != null); return { d, own: own.length, all: all.length, lvl: own.length ? rnd(own.reduce((s, id) => s + p.own[id] + 1, 0) / own.length) : 0 }; });
    const weak = cov.slice().sort((a, b) => a.own / a.all - b.own / b.all)[0], strong = cov.slice().sort((a, b) => b.own / b.all - a.own / a.all)[0];
    const topGapD = gaps.length ? CT[gaps[0].id].d : weak.d;
    return { gaps, cov, weak: weak.d, strong: strong.d, dmg: rnd(p.dmg || 0), saved: rnd(p.saved || 0), credit: rnd(p.credit || 0), score: score(p), value: value(p), left: p.budget, advice: advice[topGapD], advD: topGapD, byRound: p.byRound || [] }; }

  root.ALPHA = { DISC, TREE, leaves, bundleIds, DSHORT, DCOL, LV, ABS, CAP, C: CT, IDS, OF, LINKS, A, AIDS, REGN, USE, SECTORS, DEFAULT_UC, ROUNDS, START, TOPUP, BASE_EQ, BON, BIDS, rnd, half, rng, isOpen, price, up, bundle, canBuy, buy, buyBundle, value, absorb, exposed, baseDmg, draw, strike, drawBonus, applyBonus, awardsRound, finalAwards, score, report, advice };
  if (typeof module !== 'undefined') module.exports = root.ALPHA;
})(typeof window !== 'undefined' ? window : globalThis);
