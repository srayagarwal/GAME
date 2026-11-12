/* Agent Tycoon · rules and scoring (same maths as the v4 Google Sheet) */
(function (root) {
  const BUDGET1 = 100, BUDGET2 = 80, TOTAL = 180, LIT_PER_CARD = 1, SA_FACTOR = 0.75, TRUST_PER_HIT = 0.2, REM_MAX = 0.65, BUST = 50;
  // id, emoji, name, short effect, cost, suit (r revenue · b control · f one-off fix), max copies, what 1/2/3 copies do
  const P1 = [
    ['PAY', '💰', 'Payments', '+30 revenue · raises risk', 10, 'r', 3, ['+30 revenue, every hit +25%', '+60 revenue, every hit +50%', '+90 revenue, every hit +75%']],
    ['MKT', '📣', 'Marketing', '+15 revenue', 10, 'r', 3, ['+15 revenue', '+30 revenue', '+45 revenue']],
    ['PE', '🛡️', 'Policy engine', 'stops prompt injection', 10, 'b', 3, ['Halves a poisoned-input hit', 'Blocks it completely', 'Wasted. No extra effect']],
    ['RT', '🎯', 'Red team', 'stops jailbreaks', 10, 'b', 3, ['Halves a jailbreak', 'Blocks it completely', 'Wasted. No extra effect']],
    ['KS', '🔌', 'Kill switch', 'stops runaway loops', 10, 'b', 3, ['Halves a runaway loop', 'Blocks it completely', 'Wasted. No extra effect']],
    ['LP', '🔑', 'Least privilege', 'stops data leaks', 10, 'b', 3, ['Halves a data leak', 'Blocks it completely', 'Wasted. No extra effect']],
    ['GO', '📋', 'Named owner', 'score ×1.5', 20, 'b', 3, ['Whole score ×1.5, helps with audits', 'Wasted. Only 1 counts', 'Wasted. Only 1 counts']],
    ['AU', '🧾', 'Audit trail', 'evidence for regulators', 10, 'b', 3, ['Halves an audit hit', 'Blocks it completely', 'Wasted. No extra effect']],
    ['HU', '👤', 'Human check', 'stops big payments', 10, 'b', 3, ['Halves a wrong payment, −5 revenue', 'Blocks it, −10 revenue', 'Wasted, −15 revenue']],
    ['VM', '🩺', 'Vuln. mgmt', 'cuts trust damage', 10, 'b', 3, ['Scanning: trust damage −50%', 'Scanning + remediation: −65%', 'Wasted. No extra effect']],
  ];
  const P2 = [
    ['LOAN', '🏦', 'Loans', '+30 revenue', 10, 'r', 3, ['+30 revenue, fairness fine +50%', '+60 revenue, fairness fine +100%', '+90 revenue, fairness fine +150%']],
    ['FT', '⚖️', 'Fairness tests', 'stops fairness fines', 10, 'b', 3, ['Halves a fairness fine', 'Blocks it completely', 'Wasted. No extra effect']],
    ['GC', '📚', 'Grounding', 'stops invented policy', 10, 'b', 3, ['Halves an invented policy', 'Blocks it completely', 'Wasted. No extra effect']],
    ['DM', '📈', 'Drift monitor', 'catches silent drift', 10, 'b', 3, ['Halves silent drift', 'Blocks it completely', 'Wasted. No extra effect']],
    ['LT', '🎓', 'AI literacy', '+1 per card you own', 10, 'b', 3, ['+1 per card you own, halves a deepfake', '+2 per card, blocks deepfakes', '+3 per card']],
    ['SA', '🧪', 'Seeded test', 'Day 6 hits −25%', 10, 'f', 2, ['Every Day 6 hit 25% smaller', 'Wasted. Only 1 counts']],
    ['LPE', '🩹', 'Late policy', 'blocks the planted email', 30, 'f', 2, ['Blocks the planted email', 'Wasted. Only 1 counts']],
    ['LGO', '🩹', 'Late owner', 'score ×1.25', 20, 'f', 2, ['×1.25 if you had no owner, helps audits', 'Wasted. Only 1 counts']],
    ['LAU', '🩹', 'Late audit', 'blocks the audit', 20, 'f', 2, ['Blocks the regulator audit', 'Wasted. Only 1 counts']],
    ['LRM', '🩹', 'Late remediation', 'cuts trust damage', 20, 'f', 2, ['Trust damage −25% more (max −65%)', 'Wasted. Only 1 counts']],
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
  function hitOf(id, q1, q2) {
    const [, , , part, p] = INC[id];
    let v = p * (1 - prot(shield(id, q1, q2))) * (1 + 0.25 * (q1.PAY || 0));
    if (id === 'FAIR') v *= 1 + 0.5 * (q2.LOAN || 0);
    if (part === 2 && q2.SA) v *= SA_FACTOR;
    return v;
  }
  /* player: {q1, q2, b1, b2, has2}; on: list of fired incident ids; final: include Day 6 */
  function score(player, on, final) {
    const q1 = full(player.q1, P1), q2 = full(player.q2, P2), has2 = !!player.has2;
    const s1 = spent(q1, P1), s2 = has2 ? spent(q2, P2) : 0;
    const rev1 = 50 + 30 * q1.PAY + 15 * q1.MKT - 5 * q1.HU, rev2 = has2 ? 50 + 30 * q2.LOAN : 0;
    const bust1 = s1 > BUDGET1 ? BUST : 0, bust2 = has2 && s2 > BUDGET2 ? BUST : 0;
    let pen1 = 0, pen2 = 0, u1 = 0, u2 = 0; const hits = [];
    INCIDENTS.forEach(([id, , , part]) => {
      if (on.indexOf(id) < 0 || (part === 2 && !final)) return;
      const v = hitOf(id, q1, part === 2 ? q2 : (final ? q2 : {}));
      const lvl = Math.min(2, shield(id, q1, q2));
      hits.push({ id, v: Math.round(v), lvl: v > 0 ? lvl : 2, part });
      if (v > 0) { if (part === 1) { pen1 += v; u1++; } else { pen2 += v; u2++; } }
    });
    const gov1 = q1.GO ? 1.5 : 1;
    const mid = Math.round((rev1 - pen1 - bust1) * gov1 / (1 + TRUST_PER_HIT * u1 * (1 - rem(q1, {}))));
    const gov = q1.GO ? 1.5 : (q2.LGO ? 1.25 : 1);
    const cards = Object.values(q1).reduce((a, b) => a + b, 0) + Object.values(q2).reduce((a, b) => a + b, 0);
    const lit = LIT_PER_CARD * cards * (q2.LT || 0);
    const r = rem(q1, q2), trust = 1 + TRUST_PER_HIT * (u1 + u2) * (1 - r);
    const fin = Math.round(((rev1 + rev2 - pen1 - pen2 - bust1 - bust2) * gov + lit) / trust);
    return { mid, fin, hits, s1, s2, total: s1 + s2, dq: s1 + s2 > TOTAL, rev: rev1 + rev2, rev1, pen: Math.round(pen1 + pen2), pen1: Math.round(pen1),
      bust: bust1 + bust2, bust1, gov, gov1, lit, trust: Math.round(trust * 100) / 100, trust1: Math.round((1 + TRUST_PER_HIT * u1 * (1 - rem(q1, {}))) * 100) / 100, n: u1 + u2 };
  }
  /* incident pick: same as the sheet. Most exposed players first (exposed + ½ halved) */
  function pick(part, players) {
    const pool = part === 1 ? ['JB', 'RUN', 'BIG', 'LEAK'] : ['FAIR', 'INV', 'DRIFT', 'DEEP'];
    const fixed = part === 1 ? [] : ['S_EMAIL', 'S_AUDIT'];
    const sc = id => { let ex = 0, hf = 0; players.forEach(p => { const n = shield(id, full(p.q1, P1), full(p.q2, P2)); if (n === 1) hf++; else if (n <= 0) ex++; });
      return players.length ? (ex + 0.5 * hf) / players.length : Math.random(); };
    const ranked = pool.map(id => [id, sc(id) + Math.random() * 1e-6]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    return fixed.concat(ranked.slice(0, 2));
  }
  const api = { BUDGET1, BUDGET2, TOTAL, P1, P2, INCIDENTS, INC, CARD, CTRL, score, pick, shield, spent, full, hitOf };
  if (typeof module !== 'undefined') module.exports = api; else root.TYCOON = api;
})(this);
