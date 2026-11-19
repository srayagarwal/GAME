/* Agent Tycoon · rules and scoring (same maths as the v4 Google Sheet) */
(function (root) {
  const BUDGET1 = 100, BUDGET2 = 80, TOTAL = 180, LIT_PER_CARD = 1, SA_FACTOR = 0.75, TRUST_PER_HIT = 0.2, REM_MAX = 0.65, BUST = 50;
  // id, emoji, name, short effect, cost, suit (r revenue · b control · f one-off fix), max copies, what 1/2/3 copies do
  const P1 = [
    ['PAY', '💰', 'Payments', '+30 revenue · raises risk', 10, 'r', 3, ['+30 revenue, every hit +25%', '+60 revenue, every hit +50%', '+90 revenue, every hit +75%']],
    ['MKT', '📣', 'Marketing', '+15 revenue', 10, 'r', 3, ['+15 revenue', '+30 revenue', '+45 revenue']],
    ['PE', '🛡️', 'Policy engine', 'stops prompt injection', 10, 'b', 3, ['Halves a poisoned-input hit', 'Blocks it completely', 'No extra effect']],
    ['RT', '🎯', 'Red team', 'stops jailbreaks', 10, 'b', 3, ['Halves a jailbreak', 'Blocks it completely', 'No extra effect']],
    ['KS', '🔌', 'Kill switch', 'stops runaway loops', 10, 'b', 3, ['Halves a runaway loop', 'Blocks it completely', 'No extra effect']],
    ['LP', '🔑', 'Least privilege', 'stops data leaks', 10, 'b', 3, ['Halves a data leak', 'Blocks it completely', 'No extra effect']],
    ['GO', '📋', 'Named owner', 'score ×1.5', 20, 'b', 3, ['Whole score ×1.5, helps with audits', 'No extra effect', 'No extra effect']],
    ['AU', '🧾', 'Audit trail', 'evidence for regulators', 10, 'b', 3, ['Halves an audit hit', 'Blocks it completely', 'No extra effect']],
    ['HU', '👤', 'Human check', 'stops big payments', 10, 'b', 3, ['Halves a wrong payment, −5 revenue', 'Blocks it, −10 revenue', 'No extra effect, −15 revenue']],
    ['VM', '🩺', 'Vuln. mgmt', 'cuts trust damage', 10, 'b', 3, ['Scanning: trust damage −50%', 'Scanning + remediation: −65%', 'No extra effect']],
    ['IND', '📜', 'Indemnity policy', 'wild card', 20, 'w', 1, ['Pays your biggest hit at the next reveal (Day 1 if bought in Part 1, Day 6 if bought in Part 2)']],
  ];
  const P2 = [
    ['LOAN', '🏦', 'Loans', '+30 revenue', 10, 'r', 3, ['+30 revenue, fairness fine +50%', '+60 revenue, fairness fine +100%', '+90 revenue, fairness fine +150%']],
    ['FT', '⚖️', 'Fairness tests', 'stops fairness fines', 10, 'b', 3, ['Halves a fairness fine', 'Blocks it completely', 'No extra effect']],
    ['GC', '📚', 'Grounding', 'stops invented policy', 10, 'b', 3, ['Halves an invented policy', 'Blocks it completely', 'No extra effect']],
    ['DM', '📈', 'Drift monitor', 'catches silent drift', 10, 'b', 3, ['Halves silent drift', 'Blocks it completely', 'No extra effect']],
    ['LT', '🎓', 'AI literacy', '+1 per card you own', 10, 'b', 3, ['+1 per card you own, halves a deepfake', '+2 per card, blocks deepfakes', '+3 per card']],
    ['SA', '🧪', 'Seeded test', 'Day 6 hits −25%', 10, 'f', 2, ['Every Day 6 hit 25% smaller', 'No extra effect']],
    ['LPE', '🩹', 'Late policy', 'blocks the planted email', 30, 'f', 2, ['Blocks the planted email', 'No extra effect']],
    ['LGO', '🩹', 'Late owner', 'score ×1.25', 20, 'f', 2, ['×1.25 if you had no owner, helps audits', 'No extra effect']],
    ['LAU', '🩹', 'Late audit', 'blocks the audit', 20, 'f', 2, ['Blocks the regulator audit', 'No extra effect']],
    ['LRM', '🩹', 'Late remediation', 'cuts trust damage', 20, 'f', 2, ['Trust damage −25% more (max −65%)', 'No extra effect']],
    ['IND', '📜', 'Indemnity policy', 'wild card', 20, 'w', 1, ['Pays your biggest hit at the next reveal (Day 1 if bought in Part 1, Day 6 if bought in Part 2)']],
  ];
  // id, emoji, name, part, penalty, what stops it, story
  const INCIDENTS = [
    ['JB', '🏴‍☠️', 'Jailbreak goes viral', 1, 30, 'Red team', 'A customer tricks Nova into rude replies. Screenshots everywhere.'],
    ['RUN', '🌀', 'Runaway agent loop', 1, 40, 'Kill switch', 'Nova loops on a task all night and burns the cloud budget.'],
    ['BIG', '💸', 'Big wrong payment', 1, 50, 'Human check', 'Nova pays a supplier ten times the invoice.'],
    ['LEAK', '🔓', 'Client data leak', 1, 50, 'Least privilege', 'Nova reads files it never needed and shares a client’s data.'],
    ['S_EMAIL', '😴', 'The planted email wakes up', 2, 50, 'Policy engine or late fix', 'The Day 1 supplier email was poisoned. Nova follows its hidden instruction.'],
    ['S_AUDIT', '😴', 'Regulator audit', 2, 40, 'Audit trail + owner', 'The regulator asks who owns Nova and for the decision logs.'],
    ['FAIR', '⚖️', 'Fairness fine on loans', 2, 40, 'Fairness tests', 'Loan approvals differ by postcode. A fine follows.'],
    ['INV', '📚', 'Bot invents a policy', 2, 40, 'Grounding', 'Nova promises a refund policy that doesn’t exist.'],
    ['DRIFT', '📈', 'Silent drift after vendor update', 2, 40, 'Drift monitor', 'The model vendor updates. Nova’s answers quietly get worse.'],
    ['DEEP', '🎭', 'Deepfake CEO call', 2, 40, 'AI literacy', 'A cloned CEO voice asks staff for an urgent transfer.'],
  ];
  const CTRL = { JB: 'RT', RUN: 'KS', BIG: 'HU', LEAK: 'LP', FAIR: 'FT', INV: 'GC', DRIFT: 'DM', DEEP: 'LT' };
  const CARD = {}; P1.concat(P2).forEach(c => CARD[c[0]] = c);
  /* EU AI Act article each incident breaks */
  const ACT = { JB: ['15', 'Accuracy, robustness & cybersecurity'], RUN: ['14', 'Human oversight'], BIG: ['14', 'Human oversight'], LEAK: ['10', 'Data & data governance'],
    S_EMAIL: ['15', 'Cybersecurity'], S_AUDIT: ['12', 'Record-keeping'], FAIR: ['10', 'Bias in data (credit scoring is high-risk)'], INV: ['13', 'Transparency'], DRIFT: ['72', 'Post-market monitoring'], DEEP: ['4', 'AI literacy'] };
  const UNTESTED = 0.75;   // without Red team, controls against ADVERSARIAL attacks only work at 75% (EU AI Act Art. 9: test your risk controls)
  const RTS = ['S_EMAIL', 'LEAK', 'INV'];   // prompt injection, data exfiltration, hallucination: the attacks a red team probes for
  const POOL = { 1: ['JB', 'RUN', 'BIG', 'LEAK'], 2: ['FAIR', 'INV', 'DRIFT', 'DEEP'] };
  const INC = {}; INCIDENTS.forEach(i => INC[i[0]] = i);
  const zero = list => { const o = {}; list.forEach(c => o[c[0]] = 0); return o; };
  const full = (q, list) => Object.assign(zero(list), q || {});
  const spent = (q, list) => list.reduce((a, c) => a + (q && q[c[0]] || 0) * c[4], 0);
  const prot = n => n <= 0 ? 0 : (n === 1 ? 0.5 : 1);
  const rem = (q1, q2) => Math.min(REM_MAX, ((q1.VM || 0) >= 1 ? 0.5 : 0) + ((q1.VM || 0) >= 2 ? 0.15 : 0) + ((q2.LRM || 0) >= 1 ? 0.25 : 0));
  function shield(id, q1, q2) {
    if (id === 'S_EMAIL') return (q1.PE || 0) + 2 * (q2.LPE || 0);
    if (id === 'S_AUDIT') return (q1.AU || 0) + (q1.GO ? 1 : 0) + (q2.LGO ? 1 : 0) + 2 * Math.min(q2.LAU || 0, 1);
    const c = CTRL[id]; return (q1[c] !== undefined ? q1[c] : q2[c]) || 0;
  }
  const tested = q1 => (q1.RT || 0) >= 1;
  const weak = (id, q1) => RTS.indexOf(id) >= 0 && !tested(q1);
  function hitOf(id, q1, q2) {
    const [, , , part, p] = INC[id];
    let v = p * (1 - prot(shield(id, q1, q2)) * (weak(id, q1) ? UNTESTED : 1)) * (1 + 0.25 * (q1.PAY || 0));
    if (id === 'FAIR') v *= 1 + 0.5 * (q2.LOAN || 0);
    if (part === 2 && q2.SA) v *= SA_FACTOR;
    return v;
  }
  /* player: {q1, q2, b1, b2, has2}; on: list of fired incident ids; final: include Day 6 */
  function score(player, on, final) {
    const q1 = full(player.q1, P1), q2 = full(player.q2, P2), has2 = !!player.has2;
    const s1 = player.s1 != null ? player.s1 : spent(q1, P1), s2 = has2 ? (player.s2 != null ? player.s2 : spent(q2, P2)) : 0;
    const rev1 = 50 + 30 * q1.PAY + 15 * q1.MKT - 5 * q1.HU, rev2 = has2 ? 50 + 30 * q2.LOAN : 0;
    const bust1 = s1 > BUDGET1 ? BUST : 0, bust2 = has2 && s2 > BUDGET2 ? BUST : 0;
    let pen1 = 0, pen2 = 0, u1 = 0, u2 = 0; const hits = [];
    INCIDENTS.forEach(([id, , , part]) => {
      if (on.indexOf(id) < 0 || (part === 2 && !final)) return;
      const v = hitOf(id, q1, part === 2 ? q2 : (final ? q2 : {}));
      const lvl = Math.min(2, shield(id, q1, q2));
      hits.push({ id, v: Math.round(v), raw: Math.round(v), lvl, part, untested: lvl > 0 && weak(id, q1) && v > 0, ind: false });
    });
    // wild card: Indemnity policy pays the biggest hit of the reveal that follows its purchase (trust damage still counts)
    [1, 2].forEach(part => { if (!(part === 1 ? q1.IND : q2.IND)) return; const hs = hits.filter(h => h.part === part && h.v > 0); if (!hs.length) return;
      const big = hs.reduce((a, b) => (b.v > a.v ? b : a)); big.ind = true; big.v = 0; });
    hits.forEach(h => { if (h.v > 0 || h.ind) { if (h.part === 1) { pen1 += h.v; u1++; } else { pen2 += h.v; u2++; } } });
    // EU AI Act: every incident that got through breaks its article; untested controls break Art. 9
    const arts = []; hits.forEach(h => { if (h.raw > 0) { const a = ACT[h.id][0]; if (arts.indexOf(a) < 0) arts.push(a); } if (h.untested && arts.indexOf('9') < 0) arts.push('9'); });
    arts.sort((a, b) => a - b);
    // whistleblower (Part 2 surprise): report = +10, hide = 50% chance of −60 on Day 6
    const wb = final && player.wb ? (player.wb.choice === 'report' ? 10 : (player.wb.leak ? -60 : 0)) : 0;
    const gov1 = q1.GO ? 1.5 : 1;
    // below-zero rule: if money minus damage is already negative, the owner boost and trust damage are skipped (they only scale a positive score)
    const base1 = rev1 - pen1 - bust1, neg1 = base1 < 0, trust1raw = 1 + TRUST_PER_HIT * u1 * (1 - rem(q1, {}));
    const mid = neg1 ? Math.round(base1) : Math.round(base1 * gov1 / trust1raw);
    const gov = q1.GO ? 1.5 : (q2.LGO ? 1.25 : 1);
    const cards = player.cards != null ? player.cards : Object.values(q1).reduce((a, b) => a + b, 0) + Object.values(q2).reduce((a, b) => a + b, 0);
    const lit = LIT_PER_CARD * cards * (q2.LT || 0);
    const r = rem(q1, q2), trust = 1 + TRUST_PER_HIT * (u1 + u2) * (1 - r);
    const base = rev1 + rev2 - pen1 - pen2 - bust1 - bust2, neg = base < 0;
    const fin = (neg ? Math.round(base + lit) : Math.round((base * gov + lit) / trust)) + wb;
    return { wb, arts, mid, fin, hits, s1, s2, total: s1 + s2, dq: s1 + s2 > TOTAL, rev: rev1 + rev2, rev1, pen: Math.round(pen1 + pen2), pen1: Math.round(pen1),
      bust: bust1 + bust2, bust1, gov: neg ? 1 : gov, gov1: neg1 ? 1 : gov1, lit, trust: neg ? 1 : Math.round(trust * 100) / 100, trust1: neg1 ? 1 : Math.round(trust1raw * 100) / 100, n: u1 + u2,
      neg, neg1, govSet: gov, trustSet: Math.round(trust * 100) / 100 };
  }
  /* incident pick: same as the sheet. Most exposed players first (exposed + ½ halved) */
  /* Gamma: incidents are drawn at random. A REAL headline doubles that incident's chance; a fake one does nothing. Sleepers always wake on Day 6. */
  function pick(part, news, rnd) {
    rnd = rnd || Math.random; const pool = POOL[part].slice(), out = [];
    const w = id => (news || []).some(n => n.id === id && n.real) ? 2 : 1;
    for (let k = 0; k < 2; k++) { const tot = pool.reduce((a, id) => a + w(id), 0); let x = rnd() * tot, i = 0;
      for (; i < pool.length - 1; i++) { x -= w(pool[i]); if (x < 0) break; } out.push(pool.splice(i, 1)[0]); }
    return (part === 1 ? [] : ['S_EMAIL', 'S_AUDIT']).concat(out);
  }
  /* breaking news: ONE headline per shop, about a random incident from that day's pool, randomly real or fake */
  const NEWS = {
    JB: ['Jailbreak screenshots of bank chatbots trending online', 'Users are sharing tricks that make AI assistants say things they shouldn’t. Several European banks named.'],
    RUN: ['Cloud bills surge as AI agents loop overnight', 'Finance teams report runaway agents burning through compute budgets. Several banks investigating.'],
    BIG: ['Supplier fraud up 40% as AI approves payments', 'Fraudsters target automated payment approvals. Regulators urge human checks on large transfers.'],
    LEAK: ['AI assistant leaks client files at rival bank', 'An agent with broad access shared confidential records with the wrong customer.'],
    FAIR: ['EU regulator opens sweep on AI credit scoring', 'Banks using AI for loan decisions asked to show fairness tests by Friday.'],
    INV: ['Customers say AI bots are making up refund rules', 'Complaints rise as chatbots promise policies that don’t exist. Ombudsman taking note.'],
    DRIFT: ['Model vendor pushes surprise update to banks', 'Users report AI answers quietly getting worse after an overnight update.'],
    DEEP: ['CEO voice-clone scam hits a European bank', 'Staff transferred funds after a convincing deepfake call from “the CEO”.'] };
  function makeNews(part, rnd) { rnd = rnd || Math.random; const pool = POOL[part]; return [{ id: pool[Math.floor(rnd() * pool.length)], real: rnd() < 0.5 }]; }
  const api = { BUDGET1, BUDGET2, TOTAL, P1, P2, INCIDENTS, INC, CARD, CTRL, ACT, NEWS, POOL, UNTESTED, RTS, weak, score, pick, makeNews, shield, spent, full, hitOf, tested };
  if (typeof module !== 'undefined') module.exports = api; else root.TYCOON = api;
})(this);
