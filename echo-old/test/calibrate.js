global.window = {}; require('../game.js'); const E = window.ECHO;
function mkrng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const fnd = pl => !!(pl.fnd && pl.fnd.lit);
function play(seed, p0f) { const R = mkrng(seed), rA = mkrng(seed + 99991); const ids = ['p0', 'p1', 'p2', 'p3']; const g = { round: 1, players: {}, nodes: {}, bids: {}, pacts: [], dil: {} };
  ids.forEach(p => g.players[p] = { cash: E.START, trust: 5, fnd: {} });
  if (p0f) { g.players.p0.cash -= E.FND[p0f].c; g.players.p0.fnd[p0f] = 1; }
  for (let r = 1; r <= 4; r++) { g.round = r; if (r > 1) ids.forEach(p => g.players[p].cash = E.rnd(g.players[p].cash + E.TOPUP[r]));
    if (r <= 3) { g.bids = {}; ids.forEach(p => { g.bids[p] = {}; const free = E.IDS.filter(i => !E.NODES[i].banned && !g.nodes[i]); for (let k = 0; k < 2; k++) { const id = free[Math.floor(R() * free.length)]; if (id) g.bids[p][id] = Math.round(E.NODES[id].price * (.7 + R() * .5)); } }); E.resolveBids(g); }
    if (r >= 2) ids.forEach(p => { const pl = g.players[p]; for (let i = 0; i < 2; i++) if (R() < .5) { const lit = fnd(pl); pl.cash = Math.max(0, pl.cash - (lit ? 1 : 3)); if (i === 0) pl.alert = r; else if (!lit) pl.trust = Math.max(0, pl.trust - 1); } });
    ids.forEach(p => E.IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || ns.by !== p) return; const pl = g.players[p]; ns.k = ns.k || [];
      if (!ns.scanned && pl.cash >= 3 && R() < .8) { pl.cash -= 3; ns.scanned = true; }
      const want = E.NODES[id].tier === 'high' ? 3 : 2; while ((ns.c || 0) < want && pl.cash >= 5 + 8) { const free = Object.keys(E.CT).filter(k => !ns.k.some(x => E.CT[x].s === E.CT[k].s)); const fit = free.filter(k => (E.FITS[id] || []).includes(k)); const k = (fit.length && R() < .6 ? fit : free)[Math.floor(R() * (fit.length && R() < .6 ? fit : free).length)] || free[0]; const cost = ns.c >= 3 ? 10 : 5; pl.cash -= cost; ns.c = (ns.c || 0) + 1; ns.k.push(k); }
      if (ns.scanned && !ns.fixed && pl.cash > 20 && R() < .4) { pl.cash -= 4; ns.mit = true; } }));
    if (r === 4) ids.forEach(p => g.dil[p] = rA() < .5 ? 'disclose' : 'quiet');
    E.attack(g, r, rA); E.settle(g, r); }
  return E.finalScore(g, 'p0'); }
const N = 6000; const base = []; for (let i = 0; i < N; i++) base.push(play(i + 1, null));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length; const b = mean(base);
console.log('baseline p0 score', b.toFixed(1));
Object.keys(E.FND).forEach(f => { const arr = []; for (let i = 0; i < N; i++) arr.push(play(i + 1, f)); const d = mean(arr) - b; console.log(f.padEnd(4), ('cost €' + E.FND[f].c + 'M').padEnd(10), 'score delta', (d >= 0 ? '+' : '') + d.toFixed(1)); });
