global.window = {}; require('../game.js'); const E = window.ECHO;
let s = 7; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
// player A: all-in R1 on one system (bid = all cash). B,C: sensible (bid ~list on 2 systems, keep reserve, controls).
function run(allin) { const g = { round: 1, players: { A: { cash: 50, trust: 5 }, B: { cash: 50, trust: 5 }, C: { cash: 50, trust: 5 } }, nodes: {}, bids: {}, pacts: [], dil: {} };
  const log = [];
  for (let r = 1; r <= 4; r++) { g.round = r; if (r > 1) Object.values(g.players).forEach(p => p.cash = E.rnd(p.cash + E.TOPUP[r]));
    if (r <= 3) { g.bids = { A: {}, B: {}, C: {} }; const free = E.IDS.filter(i => !E.NODES[i].banned && !g.nodes[i]).sort((a, b) => E.NODES[b].price - E.NODES[a].price);
      if (r === 1) { g.bids.A[allin ? 'wealth' : 'chat'] = allin ? 50 : E.NODES.chat.price; g.bids.B.compl = 10; g.bids.B.chat = 6; g.bids.C.cred = 16; g.bids.C.aml = 8; }
      else { const cheap = free.filter(i => E.NODES[i].price <= 14); ['A', 'B', 'C'].forEach((p, k) => { if (cheap[k] && g.players[p].cash > E.NODES[cheap[k]].price + 10) g.bids[p][cheap[k]] = E.NODES[cheap[k]].price; }); }
      E.resolveBids(g); }
    ['A', 'B', 'C'].forEach(p => E.IDS.forEach(id => { const ns = g.nodes[id]; if (!ns || ns.by !== p) return; const pl = g.players[p]; while ((ns.c || 0) < (E.NODES[id].tier === 'high' ? 2 : 1) && pl.cash >= 5) { pl.cash -= 5; ns.c = (ns.c || 0) + 1; } if (r >= 2 && pl.cash >= 3 && !ns.scanned) { pl.cash -= 3; ns.scanned = true; } }));
    E.attack(g, r, R); E.settle(g, r); log.push(r + ':' + ['A', 'B', 'C'].map(p => p + ' €' + g.players[p].cash + ' T' + g.players[p].trust).join(' ')); }
  return { log, score: ['A', 'B', 'C'].map(p => Math.round(E.finalScore(g, p))) }; }
console.log('ALL-IN R1:', JSON.stringify(run(true))); console.log('SENSIBLE :', JSON.stringify(run(false)));
