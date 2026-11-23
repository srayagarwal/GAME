const E = require('../game.js'); let n = 0;
const ok = (c, m) => { n++; if (!c) { console.error('FAIL', m); process.exit(1); } };
// data sanity
ok(E.CARDS.length === 73 && E.SHORT.length === 10, 'card counts');
E.USE.forEach(u => { ok(u.a.length === 10 && u.a.every(a => E.ATK[a]), 'use case attacks ' + u.k); });
E.ALL.forEach(c => ok(E.DORDER.indexOf(c.d) >= 0 && c.m >= 0 && c.t >= 0, 'card ' + c.id));
E.SHORT.forEach(s => s.breaks.forEach(a => ok(E.ATK[a], 'shortcut target ' + a)));
// assignment: balanced, RAI about 1 in 10
[3, 4, 5, 10, 25, 60, 200].forEach(N => { const pl = Array.from({ length: N }, (_, i) => ({ id: 'p' + i })), a = E.assign(pl), c = {}; Object.values(a).forEach(d => c[d] = (c[d] || 0) + 1);
  ok(Object.keys(a).length === N, 'all assigned'); const r = c.RAI || 0; ok(N < 4 ? r === 0 : r >= 1 && Math.abs(r - N / 10) <= 1.01, 'rai share ' + N + ' ' + r);
  const ds = E.DORDER.map(d => c[d] || 0); ok(Math.max.apply(0, ds) - Math.min.apply(0, ds) <= 1 || N < 5, 'balanced ' + N); });
// cheapest cover and a "smart room" playthrough must be able to reach Gold within budget and deadline
function smart(useIdx, K, delaysOn) {
  const U = E.USE[useIdx], built = {}, appr = {}; let need = U.a.slice();
  for (let r = 1; r <= 4; r++) {
    const prop = []; // each dept proposes its cheapest card that covers a still-needed attack (greedy by most attacks covered per money)
    E.DORDER.forEach(d => { const cand = E.CARDS.filter(c => c.d === d && !built[c.id]).map(c => ({ c, cov: need.filter(a => E.ATK[a].k.indexOf(c.id) >= 0) })).filter(x => x.cov.length).sort((a, b) => b.cov.length / (b.c.m + 0.1) - a.cov.length / (a.c.m + 0.1)); const seen = {};
      let k = 0; cand.forEach(x => { if (k >= K) return; if (x.cov.every(a => seen[a])) return; x.cov.forEach(a => seen[a] = 1); prop.push(x.c.id); k++; }); });
    // drop duplicates already covered by another dept's pick this round
    const cov = {}, keep = []; prop.forEach(id => { const cv = need.filter(a => E.ATK[a].k.indexOf(id) >= 0); if (cv.some(a => !cov[a])) { keep.push(id); cv.forEach(a => cov[a] = 1); } });
    appr[r] = {}; keep.forEach(id => { appr[r][id] = 1; built[id] = r; }); need = need.filter(a => !cov[a]);
  }
  const t = E.totals(appr, {}), f = E.finish(useIdx, built, t.spent, t.time, U.b, U.t); return { f, t, left: need.length };
}
E.USE.forEach((u, i) => { const s = smart(i, 2); ok(s.left === 0, 'room can cover all attacks ' + u.k); ok(s.f.grade === 'gold', 'gold is reachable ' + u.k + ' spent ' + s.t.spent + '/' + u.b + ' time ' + s.t.time + '/' + u.t + ' ' + JSON.stringify(s.f.inc.map(x => x.a))); ok(s.t.spent <= u.b, 'budget not too slack ' + u.k + ' ' + s.t.spent); });
// shortcuts break their attacks even when a real control is present
{ const i = 0, U = E.USE[i]; const built = {}; E.ATK['a08'].k.forEach(c => built[c] = 1); built.x2 = 1; const f = E.finish(i, built, 1, 1, 12, 8); ok(f.items.find(x => x.a === 'a08').st === 'shortcut', 'shortcut breaks coverage'); }
// grades
{ const f0 = E.finish(0, {}, 99, 99, 12, 8); ok(f0.grade === 'fail' && !f0.safe && !f0.bOk && !f0.tOk, 'fail'); const f1 = E.finish(0, {}, 1, 1, 12, 8); ok(f1.grade === 'bronze', 'bronze: only safety failed'); }
// voting, ranking, overlaps
{ const pl = { a: { dept: 'SEC' }, b: { dept: 'SEC' }, c: { dept: 'AI' } }, v = { a: { 'sec-guard': true, 'sec-iam': true }, b: { 'sec-guard': true }, c: { 'sec-guard': true, 'ai-hitl': true } };
  const t = E.tally(v, pl); ok(t.SEC['sec-guard'] === 2 && !t.AI['sec-guard'] && t.AI['ai-hitl'] === 1, 'votes count only own dept cards'); ok(E.rank(t.SEC, 1)[0] === 'sec-guard', 'rank');
  ok(E.overlaps(0, 'sec-pen-q', 'sec-guard') && !E.overlaps(0, 'sec-pen-q', 'sec-pen-q'), 'overlap'); }
// RAI flags: advisory early, binding in round 4, never adds cards
{ const prop = { SEC: { 'sec-guard': 1, 'sec-iam': 1 }, AI: { x1: 1 } }, flags = { r1: { x1: 'x:shortcut', 'sec-guard': 'ok' }, r2: { x1: 'x:untested', 'sec-iam': 'x:cost' } }, sf = {};
  ok(E.vetoes(3, prop, flags, sf).count === 0, 'advisory in round 3'); const v = E.vetoes(4, prop, flags, sf); ok(v.cards.indexOf('x1') >= 0 && v.cards.indexOf('sec-guard') < 0 && v.cards.length === 2, 'card vetoes by majority cross (tie goes to the card? cross>tick needed)');
  const sf2 = { r1: { SEC: 'x:law' } }; const v2 = E.vetoes(4, prop, flags, sf2); ok(v2.sets[0] === 'SEC' && E.vetoedIds(v2, prop).indexOf('sec-guard') >= 0 && v2.count === 2, 'set veto removes the department set');
  ok(E.vetoedIds(v2, prop).every(id => prop.SEC[id] || prop.AI[id]), 'nothing added'); }
// cost rules: money adds up, time is the slowest card, shortcuts save
{ const c = E.roundCost(['sec-guard', 'dat-dpia'], 0); ok(c.m === 1.9 && c.t === 3, 'round cost'); const s = E.roundCost(['x3', 'sec-guard'], 1); ok(s.m === 0.5 && s.t === 3, 'shortcut saves money, veto delay adds time ' + JSON.stringify(s)); }
// random full games: invariants
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let g = 0; g < 3000; g++) { const ui = Math.floor(R() * 6), U = E.USE[ui], appr = {}, built = {}, delays = {};
  for (let r = 1; r <= 4; r++) { appr[r] = {}; const k = Math.floor(R() * 8); for (let j = 0; j < k; j++) { const c = E.ALL[Math.floor(R() * E.ALL.length)]; if (!built[c.id]) { built[c.id] = r; appr[r][c.id] = 1; } } if (r === 4 && R() < .5) delays[4] = Math.floor(R() * 3); }
  const t = E.totals(appr, delays), f = E.finish(ui, E.builtSet(appr), t.spent, t.time, U.b, U.t); ok(isFinite(t.spent) && t.time >= 0 && ['gold', 'silver', 'bronze', 'fail'].indexOf(f.grade) >= 0 && f.items.length === 10, 'random game ' + g); }
// trim: strictly more than half of the department must vote; a tie does not trim
{ const pl = { a: { name: 'a', dept: 'DAT' }, b: { name: 'b', dept: 'DAT' }, c: { name: 'c', dept: 'DAT' }, d: { name: 'd', dept: 'DAT' }, s: { name: 's', dept: 'SEC' } };
  ok(E.deptSize(pl, 'DAT') === 4 && E.deptSize(pl, 'SEC') === 1, 'dept size');
  const tr = { a: { 'dat-leak': true }, b: { 'dat-leak': true }, c: { 'dat-min': true }, d: { 'dat-min': true, 'dat-leak': true }, s: { 'dat-leak': true } };
  ok(E.trimCount(tr, 'dat-leak', pl) === 3, 'only own department votes count');
  const out = E.trimmed(['dat-leak', 'dat-min'], tr, pl); ok(out.length === 1 && out[0] === 'dat-leak', 'majority trims, a 2 of 4 tie does not');
  ok(E.trimmed(['sec-iam'], { s: { 'sec-iam': true } }, pl).length === 1, 'one-person department can trim its own card');
  ok(E.trimmed(['dat-leak'], {}, pl).length === 0 && E.trimmed(['dat-leak'], tr, {}).length === 0, 'no votes or no players trims nothing'); }
console.log('engine tests passed:', n);
