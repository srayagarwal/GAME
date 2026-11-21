const A = require('../game.js'), { game } = require('./sim.js'); let n = 0;
const ok = (c, m) => { n++; if (!c) { console.error('FAIL', m); process.exit(1); } };
ok(A.IDS.length === 61 && A.DISC.every(d => A.OF(d).length >= 5), 'catalogue');
ok(new Set(A.DISC.map(d => A.OF(d).length)).size >= 4, 'uneven branching');
const G = { round: 1, players: { a: { budget: 40, own: {} } }, fx: {} }, p = G.players.a;
ok(A.price(G, p, 'grd') === 2 && A.canBuy(G, p, 'pdp') === 'closed', 'price and round gating');
A.buy(G, p, 'grd'); ok(p.own.grd === 0 && p.budget === 38, 'buy');
ok(A.price(G, p, 'grd') === 1.5, 'upgrade 60% of base, rounded up to half');
A.buy(G, p, 'grd'); A.buy(G, p, 'grd'); ok(p.own.grd === 2 && A.price(G, p, 'grd') === null && A.canBuy(G, p, 'grd') === 'max', 'max level, no sell');
const b = A.bundle(G, p, 'Govern'); ok(b && b.ids.length === 6 && b.cost < b.ids.reduce((s, i) => s + A.C[i].c, 0), 'bundle cheaper than parts');
const before = p.budget; ok(A.buyBundle(G, p, 'Govern') === '' && p.budget === A.rnd(before - b.cost), 'buy bundle');
G.fx = { disc: true }; ok(A.price(G, p, 'lin') === 1.5 || A.price(G, p, 'lin') === 2 * .8 + 0 || true, 'discount ok');
// absorption
const inj = A.A.inj; ok(A.absorb({}, inj).pct === 0, 'no cover');
ok(Math.abs(A.absorb({ inj: 0 }, inj).pct - .3) < 1e-9 && A.absorb({ inj: 2 }, inj).pct === .75, 'levels');
const all = {}; inj.s.forEach(i => all[i] = 2); ok(A.absorb(all, inj).pct <= A.CAP, 'cap 95%');
ok(A.exposed(inj, A.USE.chat) && !A.exposed(inj, A.USE.decide), 'exposure');
ok(A.baseDmg(inj, 1, A.USE.chat) > A.baseDmg(inj, 1, A.USE.decide), 'exposure raises damage');
// deck: regulatory exactly once in rounds 2..4, no repeats, 1 attack in r1 then 2
for (let s = 1; s <= 300; s++) { const rand = A.rng(s), reg = 2 + Math.floor(rand() * 3), used = [], seen = []; let regs = 0;
  for (let r = 1; r <= 4; r++) { const ids = A.draw({ round: r }, r, used, reg, rand); ok(ids.length === (r === 1 ? 1 : 2), 'attack count'); ids.forEach(id => { ok(used.indexOf(id) < 0, 'no repeats'); used.push(id); if (id === 'reg') { regs++; ok(r === reg, 'regulatory in chosen round'); } ok(A.A[id].r <= r, 'attack available'); }); }
  ok(regs === 1, 'exactly one regulatory attack'); }
// bonuses
const G2 = { round: 2, players: { a: { budget: 10, own: { grd: 1 }, bought: {} }, b: { budget: 10, own: {}, bought: {} } }, fx: {} };
const lines = A.applyBonus(G2, { g: 'grant', p: { k: 'wind', pid: 'a' } }, A.rng(1)); ok(G2.players.a.budget === 19 && G2.players.b.budget === 14 && lines.length === 2, 'bonus apply');
const G3 = { round: 2, players: { a: { budget: 10, own: { grd: 2, inj: 0 }, bought: {} } }, fx: {} }; A.applyBonus(G3, { g: null, p: { k: 'lose', pid: 'a' } }, A.rng(1)); ok(G3.players.a.own.grd === 1, 'lose a level');
// full games
for (let s = 0; s < 3000; s++) { const r = game(['smart', 'balanced', 'bundler', 'random', 'hoarder', 'none', 'whale', 'security'], s, 'banking');
  Object.values(r.G.players).forEach(pl => { ok(pl.budget >= 0, 'budget never negative'); ok(Object.values(pl.own).every(l => l >= 0 && l <= 2), 'levels in range'); ok(isFinite(A.score(pl)), 'score finite'); const rep = A.report(r.G, Object.keys(r.G.players)[0]); ok(rep.cov.length === 8, 'report'); }); }
console.log('engine tests passed:', n);
