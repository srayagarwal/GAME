/* Bot simulation for ALPHA: plays whole games with different strategies to check balance. */
const A = require('../game.js');
function mkPlayer() { return { budget: A.START, own: {}, bought: {}, dmg: 0, saved: 0, credit: 0, spent: 0, byRound: [], awd: {} }; }
const pool = id => A.A[id];
// expected damage reduction (EUR M) per attack-pool of one control at the next level
function gain(G, p, id, uc) { let g = 0; A.AIDS.forEach(aid => { const atk = A.A[aid]; if (atk.s.indexOf(id) < 0) return; const base = A.baseDmg(atk, 3, uc); const a0 = A.absorb(p.own, atk).pct; const o2 = Object.assign({}, p.own); o2[id] = p.own[id] == null ? 0 : p.own[id] + 1; g += (A.absorb(o2, atk).pct - a0) * base * 0.5; }); return g; }
const S = {
  smart(G, p, uc, rand) { for (;;) { let best = null, bv = 0; A.IDS.forEach(id => { if (A.canBuy(G, p, id)) return; const c = A.price(G, p, id), v = gain(G, p, id, uc) / c; if (v > bv) { bv = v; best = id; } }); if (!best) break; A.buy(G, p, best); } },
  balanced(G, p) { for (;;) { let pick = null; for (const d of A.DISC) { const ids = A.OF(d).filter(id => !A.canBuy(G, p, id) && p.own[id] == null); if (ids.length && !A.OF(d).some(id => p.own[id] != null)) { pick = ids.sort((a, b) => A.C[a].c - A.C[b].c)[0]; break; } }
      if (!pick) { const c = A.IDS.filter(id => !A.canBuy(G, p, id)).sort((a, b) => (p.own[a] == null ? 0 : p.own[a] + 1) - (p.own[b] == null ? 0 : p.own[b] + 1) || A.C[a].c - A.C[b].c); pick = c[0]; }
      if (!pick) break; A.buy(G, p, pick); } },
  security(G, p) { for (;;) { const c = A.OF('Security').filter(id => !A.canBuy(G, p, id)).sort((a, b) => (p.own[a] == null ? -1 : p.own[a]) - (p.own[b] == null ? -1 : p.own[b])); if (!c.length) break; A.buy(G, p, c[0]); } },
  hoarder(G, p, uc, rand) { const keep = p.budget * 0.55; for (;;) { const c = A.IDS.filter(id => !A.canBuy(G, p, id) && p.budget - A.price(G, p, id) >= keep).sort((a, b) => A.C[a].c - A.C[b].c); if (!c.length) break; A.buy(G, p, c[0]); } },
  random(G, p, uc, rand) { for (let k = 0; k < 40; k++) { const c = A.IDS.filter(id => !A.canBuy(G, p, id)); if (!c.length) break; A.buy(G, p, c[Math.floor(rand() * c.length)]); } },
  bundler(G, p) { for (const d of A.DISC) { const b = A.bundle(G, p, d); if (b && p.budget >= b.cost) A.buyBundle(G, p, d); } S.balanced(G, p); },
  none() {},
  whale(G, p) { for (;;) { const c = A.IDS.filter(id => !A.canBuy(G, p, id) && p.own[id] != null).sort((a, b) => A.C[b].c - A.C[a].c); const n = A.IDS.filter(id => !A.canBuy(G, p, id) && p.own[id] == null).sort((a, b) => A.C[b].c - A.C[a].c); const pick = n[0] || c[0]; if (!pick) break; A.buy(G, p, pick); } }
};
function game(strats, seed, sector, ucs) { const rand = A.rng(seed); const G = { round: 1, players: {}, history: [], fx: {} }; strats.forEach((s, i) => G.players['p' + i] = Object.assign(mkPlayer(), { strat: s }));
  ucs = ucs || A.DEFAULT_UC; const used = [], regRound = 2 + Math.floor(rand() * 3); let prevLoss = null; const log = [];
  for (let r = 1; r <= 4; r++) { G.round = r; if (r > 1) Object.values(G.players).forEach(p => p.budget = A.rnd(p.budget + A.TOPUP[r]));
    const bon = A.drawBonus(G, rand, r); A.applyBonus(G, bon, rand); const uc = A.USE[ucs[r - 1]];
    Object.values(G.players).forEach(p => S[p.strat](G, p, uc, rand));
    const ids = A.draw(G, r, used, regRound, rand); const strikes = []; ids.forEach(id => { used.push(id); const s = A.strike(G, id, uc); strikes.push(s); G.history.push({ id, base: s.base, round: r }); });
    const rl = {}; Object.keys(G.players).forEach(pid => { const p = G.players[pid]; let l = 0, sv = 0; strikes.forEach(s => { l += s.res[pid].loss; sv += s.base - s.res[pid].loss; }); p.dmg = A.rnd(p.dmg + l); p.saved = A.rnd(p.saved + sv); p.byRound.push({ loss: A.rnd(l), pct: strikes.reduce((s, x) => s + x.res[pid].pct, 0) / strikes.length }); rl[pid] = l; });
    const aw = A.awardsRound(G, { strikes, prevLoss }); prevLoss = rl; G.fx = {}; log.push({ r, ids, bon }); }
  A.finalAwards(G); const out = {}; Object.keys(G.players).forEach(pid => out[pid] = { strat: G.players[pid].strat, score: A.score(G.players[pid]), dmg: G.players[pid].dmg, credit: G.players[pid].credit, left: G.players[pid].budget, own: Object.keys(G.players[pid].own).length });
  return { out, G, log, regRound }; }
module.exports = { game, S };
if (require.main === module) { const names = Object.keys(S), N = +process.argv[2] || 3000, agg = {}; names.forEach(n => agg[n] = { s: 0, d: 0, c: 0, l: 0, o: 0, n: 0, win: 0 });
  for (let i = 0; i < N; i++) { const r = game(names, 1000 + i); const arr = Object.values(r.out); const mx = Math.max(...arr.map(x => x.score)); arr.forEach(x => { const a = agg[x.strat]; a.s += x.score; a.d += x.dmg; a.c += x.credit; a.l += x.left; a.o += x.own; a.n++; if (x.score === mx) a.win++; }); }
  console.log('strategy   score  dmg   credit left own  win%'); names.forEach(n => { const a = agg[n]; console.log(n.padEnd(10), (a.s / a.n).toFixed(1).padStart(6), (a.d / a.n).toFixed(1).padStart(5), (a.c / a.n).toFixed(1).padStart(6), (a.l / a.n).toFixed(1).padStart(5), (a.o / a.n).toFixed(1).padStart(4), (100 * a.win / a.n).toFixed(0).padStart(4) + '%'); }); }
