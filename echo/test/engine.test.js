global.window = {}; require('../game.js'); const E = window.ECHO; const assert = require('assert');
let seed = 12345; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(R() * a.length)];
// --- unit tests
(function units() {
  const g = { round: 2, players: { a: { cash: 50, trust: 5 }, b: { cash: 50, trust: 5 } }, nodes: { chat: { by: 'a', c: 0, scanned: true } }, bids: {}, pacts: [] };
  assert.strictEqual(E.effC(g.nodes.chat, 2), 0); g.nodes.chat.lic = 3; assert.strictEqual(E.effC(g.nodes.chat, 2), 1); assert.strictEqual(E.effC(g.nodes.chat, 4), 0);
  g.nodes.chat.c = 4; g.nodes.chat.lic = 9; assert.strictEqual(E.effC(g.nodes.chat, 2), 4);
  // cash floor
  const p = { cash: 3, trust: 5 }; assert.strictEqual(E.payOut(p, 12), 2); assert.strictEqual(p.cash, 0); assert.strictEqual(p.debt, 9);
  // co-owner split worth and revenue
  const h = { round: 2, players: { a: { cash: 0, trust: 5 }, b: { cash: 0, trust: 5 } }, nodes: { lake: { by: 'a', co: 'b', c: 0 } }, bids: {}, pacts: [] };
  const s = E.settle(h, 2); assert.ok(Math.abs(s.a.rev - s.b.rev) < .2 && s.a.rev > 0);
  assert.ok(Math.abs(E.worth(h, 'a') - E.worth(h, 'b') - 0) < .3);
  // licence: lender gets 25% of the borrower node revenue
  const l = { round: 2, players: { a: { cash: 0, trust: 5 }, b: { cash: 0, trust: 5 } }, nodes: { chat: { by: 'a', c: 1, lic: 3, licBy: 'b' } }, bids: {}, pacts: [] };
  const s2 = E.settle(l, 2); assert.ok(s2.b.rev > 0 && s2.a.rev > 0 && Math.abs(s2.b.rev / (s2.a.rev + s2.b.rev) - .25) < .02);
  // alert lowers odds, lender shares blame
  const rng = () => 0; const t = { round: 3, players: { a: { cash: 50, trust: 5, alert: 3 }, b: { cash: 50, trust: 5 } }, nodes: { chat: { by: 'a', c: 1, lic: 3, licBy: 'b', scanned: true } }, bids: {}, pacts: [] };
  const r = E.attack(t, 3, rng); const e = r.ev.find(x => x.k === 'chat'); assert.ok(e.hit); assert.ok(Math.abs(e.p - E.oddsOf('chat', 3, t.nodes.chat) * .8) < 1e-9); assert.ok(t.players.b.trust < 5 + 1 && r.tl.b === 1);
  // determinism of rng-free parts: no hits with rng=0.999
  const u = { round: 2, players: { a: { cash: 50, trust: 5 } }, nodes: { chat: { by: 'a', c: 0 } }, bids: {}, pacts: [] }; E.attack(u, 2, () => .9999); assert.strictEqual(u.players.a.cash, 50);
  console.log('unit tests ok');
})();
// --- randomised full games, invariants
function game(n) {
  const ids = Array.from({ length: n }, (_, i) => 'p' + i); const g = { round: 1, players: {}, nodes: {}, bids: {}, pacts: [], dil: {} };
  ids.forEach(p => g.players[p] = { cash: E.START, trust: 5 });
  for (let r = 1; r <= 4; r++) { g.round = r; if (r > 1) ids.forEach(p => g.players[p].cash = E.rnd(g.players[p].cash + E.TOPUP[r]));
    if (r <= 3) { g.bids = {}; ids.forEach(p => { g.bids[p] = {}; E.IDS.forEach(id => { if (R() < .4) g.bids[p][id] = Math.round(R() * 25); }); }); E.resolveBids(g); }
    ids.forEach(p => E.IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || ns.by !== p) return; const pl = g.players[p];
      for (let k = 0; k < 3; k++) if (R() < .5) { const c = ns.c || 0, cost = (c >= 3 ? 2 : 1) * E.COST.ctl; if (c < 4 && pl.cash >= cost) { pl.cash -= cost; ns.c = c + 1; } }
      if (R() < .5 && pl.cash >= 3) { pl.cash -= 3; ns.scanned = true; } if (ns.scanned && R() < .3 && pl.cash >= 6) { pl.cash -= 6; ns.fixed = true; } if (R() < .2) ns.mit = true; if (R() < .2) ns.ins = true;
      if (R() < .15 && r <= 2) ns.token = r + 2; if (R() < .3 && ids.length > 1) { ns.lic = r + 1; ns.licBy = pick(ids.filter(x => x !== p)); }
      if ((id === 'lake' || id === 'fm') && R() < .4 && ids.length > 1) ns.co = pick(ids.filter(x => x !== p)); if (R() < .1) ns.defused = true; }));
    ids.forEach(p => { if (R() < .3) g.players[p].alert = r; }); if (R() < .5 && ids.length > 1) g.pacts.push({ a: ids[0], b: ids[1], from: r, until: r + 2, on: true });
    if (r === 4) ids.forEach(p => g.dil[p] = pick(['disclose', 'quiet', undefined]));
    E.attack(g, r, R); E.settle(g, r);
    ids.forEach(p => { const pl = g.players[p]; assert.ok(Number.isFinite(pl.cash) && pl.cash >= 0, 'cash ' + pl.cash); assert.ok(pl.trust >= 0 && pl.trust <= 10, 'trust ' + pl.trust); }); }
  const sc = ids.map(p => E.finalScore(g, p)); sc.forEach(x => assert.ok(Number.isFinite(x) && x >= 0, 'score ' + x)); return sc; }
let N = 0; for (let i = 0; i < 4000; i++) { game(3 + (i % 3)); N++; } console.log('random games ok', N);
