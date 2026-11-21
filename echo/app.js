/* ECHO · one page, three views: player (default), ?board (projector), ?host=KEY */
(function () {
  const E = window.ECHO, cfg = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || cfg.room || 'main').replace(/[^\w-]/g, ''), BASE = 'games/echo-' + ROOM;
  const VIEW = Q.has('board') ? 'board' : (Q.get('host') && Q.get('host') === cfg.hostKey ? 'host' : 'player');
  const $app = document.getElementById('app');
  if (Q.get('host') && VIEW !== 'host') { $app.innerHTML = '<div class="boot">Wrong host key.</div>'; return; }
  if (VIEW === 'board') document.body.classList.add('board');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cleanName = s => String(s || '').replace(/[<>.#$\[\]\/\\"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const keyOf = n => cleanName(n).toLowerCase().replace(/\s/g, '');
  const STO = () => DB.mode === 'demo' ? sessionStorage : localStorage;
  const store = { get(k) { try { return STO().getItem(k); } catch (e) { return null; } }, set(k, v) { try { STO().setItem(k, v); } catch (e) {} } };
  const PCOL = ['#3DD6A3', '#F2C14E', '#b4a8ff', '#ff8d9b', '#5bc0eb', '#f39c3d', '#9be564', '#ff6fd8'];
  let D = {}, ui = { typed: '', bidDraft: {}, ft: false, partner: null, msg: '' };
  const ST = () => D.state || { phase: 'lobby' }, PL = () => D.players || {}, ND = () => D.nodes || {};
  const pack = () => E.PACKS[ST().pack] || E.PACKS.banking;
  const nm = id => pack().n[id];
  const rd = () => ST().round || 1, sp = () => ST().step || 'flip', R = () => E.ROUNDS[rd()];
  const plist = () => Object.keys(PL()).map(id => Object.assign({ id }, PL()[id])).filter(p => p.name).sort((a, b) => (a.t || 0) - (b.t || 0));
  const pcol = id => PCOL[Math.max(0, plist().findIndex(p => p.id === id)) % PCOL.length];
  const pname = id => (PL()[id] || {}).name || '?';
  const fmt = x => (Math.round(x * 10) / 10).toString();
  function G() { const pl = {}, bids = {}; Object.keys(PL()).forEach(id => { const p = PL()[id]; if (!p.name) return; pl[id] = { cash: p.cash, trust: p.trust, alert: p.alert }; bids[id] = p.bids || {}; });
    return { round: rd(), players: pl, nodes: JSON.parse(JSON.stringify(ND())), bids, pacts: Object.values(D.pacts || {}), dil: D.dil || {} }; }
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const fmtT = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const DUR = { flip: 45, bid: 90, build: 180, deals: 75, attack: 0, settle: 45 };
  const tierTag = id => { const N = E.NODES[id]; return N.banned ? '<span class="tier t-ban">⛔ PROHIBITED</span>' : `<span class="tier t-${N.tier}">${E.TIERN[N.tier]}</span>`; };
  const cname = id => { const N = E.NODES[id]; return N.cat === 'hub' ? (id === 'lake' ? 'Shared data pipeline' : 'Shared AI model') : pack().cats[E.CATS[N.cat]]; };
  const nodeOwn = id => (ND()[id] || {}).by;
  const costCtl = (c, ft) => (ft ? E.COST.ft : E.COST.ctl) * (c >= 3 ? 2 : 1);

  /* ======================= PLAYER ======================= */
  const PIDK = 'echo_pid_' + ROOM;
  let pid = store.get(PIDK); if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set(PIDK, pid); }
  const me = () => PL()[pid] && PL()[pid].name ? PL()[pid] : null;
  const myNodes = () => E.IDS.filter(id => nodeOwn(id) === pid);
  const WR = (o) => DB.update(BASE, o);
  async function join(name) {
    name = cleanName(name); const k = keyOf(name); if (!k) return;
    await DB.tx(BASE + '/names/' + k, cur => cur ? undefined : pid);
    const now = await DB.get(BASE + '/names/' + k);
    if (now !== pid) { if (confirm('The name "' + name + '" is taken. Is that you? OK = rejoin as that player.')) { pid = now; store.set(PIDK, pid); render(true); } return; }
    await DB.set(BASE + '/players/' + pid, { name, cash: E.START, trust: 5, t: DB.now() }); ui.typed = ''; buzz(30); render(true);
  }
  const canAct = step => ST().phase === 'play' && sp() === step && !(me() && me().ready === rd() + ':' + step);
  function bidTotal() { const b = (me() || {}).bids || {}; return Object.keys(b).reduce((s, k) => s + (+b[k] || 0), 0); }
  function setBid(id, a) { const m = me(); const cur = +((m.bids || {})[id] || 0); a = Math.max(0, Math.round(a)); if (a - cur > m.cash - bidTotal()) { toast('Not enough cash'); buzz([40, 40]); return; }
    DB.set(BASE + '/players/' + pid + '/bids/' + id, a || null); SFX.chip(); }
  function spend(c, extra) { const m = me(); if (m.cash < c) { toast('Not enough cash (€' + c + 'M)'); buzz([40, 40]); return false; } WR(Object.assign({ ['players/' + pid + '/cash']: E.rnd(m.cash - c) }, extra)); SFX.deal(); return true; }
  function buyCtl(id) { if (!canAct('build')) return; const ns = ND()[id], c = ns.c || 0; if (c >= 4) return; const ft = ui.ft && rd() <= 2; const cost = costCtl(c, ft);
    const x = { ['nodes/' + id + '/c']: c + 1 }; if (ft && !ns.token) x['nodes/' + id + '/token'] = rd() + 2; spend(cost, x); }
  const scan = id => canAct('build') && spend(E.COST.scan, { ['nodes/' + id + '/scanned']: true });
  function treat(id, how) { if (!canAct('build')) return; const ns = ND()[id]; const p = 'nodes/' + id + '/';
    if (how === 'fix') spend(E.COST.fix, { [p + 'fixed']: true, [p + 'pause']: rd(), [p + 'acc']: null });
    else if (how === 'mit') spend(E.COST.mit, { [p + 'mit']: true, [p + 'acc']: null });
    else if (how === 'ins') spend(E.COST.ins, { [p + 'ins']: true });
    else if (how === 'acc') { WR({ [p + 'acc']: true }); SFX.stamp(); }
    else if (how === 'def') spend(E.COST.defuse, { [p + 'defused']: true }); }
  const ready = () => DB.set(BASE + '/players/' + pid + '/ready', rd() + ':' + sp());
  const unready = () => DB.set(BASE + '/players/' + pid + '/ready', null);
  const offerKey = (type, to, node) => rd() + '_' + type + '_' + pid + '_' + to + (node ? '_' + node : '');
  function sendOffer(type, to, node) { if (type === 'lic' && !E.IDS.some(id => nodeOwn(id) === to && (ND()[id].c || 0) >= 2)) { toast(pname(to) + ' has no system with 2 controls to lend'); return; }
     const mine = Object.values(D.offers || {}).filter(o => o.from === pid && o.r === rd() && o.type === type);
    if (mine.length >= 2) { toast('Max 2 ' + type + ' offers per round'); return; }
    DB.set(BASE + '/offers/' + offerKey(type, to, node), { from: pid, to, st: 'open', r: rd(), type, node: node || null }); toast('Offer sent to ' + pname(to)); }
  const offerPact = to => sendOffer('pact', to);
  function answerOffer(key, yes) { const o = (D.offers || {})[key]; if (!o || o.st !== 'open') return; const x = { ['offers/' + key + '/st']: yes ? 'yes' : 'no' }, r = rd();
    if (yes) {
      if (o.type === 'pact') x['pacts/' + key] = { a: o.from, b: o.to, from: r, until: r + 2, on: true };
      else if (o.type === 'lic') { const ns = ND()[o.node]; if (!ns || ns.by !== o.from) { toast('That system changed hands'); return; } if (!E.IDS.some(id => nodeOwn(id) === pid && (ND()[id].c || 0) >= 2)) { toast('You need a system with 2+ controls to license'); return; }
        x['nodes/' + o.node + '/lic'] = r + 1; x['nodes/' + o.node + '/licBy'] = pid; }
      else if (o.type === 'co') { const ns = ND()[o.node], cost = E.rnd(E.CO_SHARE * E.NODES[o.node].price); if (!ns || ns.by !== o.from || ns.co) { toast('No longer available'); return; }
        if (me().cash < cost) { toast('You need €' + cost + 'M to co-own'); return; }
        x['players/' + pid + '/cash'] = E.rnd(me().cash - cost); x['players/' + o.from + '/cash'] = E.rnd((PL()[o.from].cash || 0) + cost); x['nodes/' + o.node + '/co'] = pid; } }
    WR(x); }
  const answerPact = answerOffer;
  function actCard(i) { const m = me(), c = E.CARDS[rd()][i], k = rd() + '_' + i; if (!canAct('deals') || (m.cards || {})[k]) return;
    if (m.cash < E.CARD_COST) { toast('Not enough cash'); return; }
    const x = { ['players/' + pid + '/cash']: E.rnd(m.cash - E.CARD_COST), ['players/' + pid + '/cards/' + k]: true };
    if (c.real) x['players/' + pid + '/alert'] = rd(); else x['players/' + pid + '/trust'] = E.clamp(m.trust - 1); WR(x); c.real ? SFX.shield && SFX.shield() : SFX.sad && SFX.sad(); }
  const dilemma = c => DB.set(BASE + '/dil/' + pid, c);

  function stepBar() { const i = E.STEPS.indexOf(sp()); return `<div class="steps">${E.STEPS.map((s, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('')}</div>`; }
  function header() { const m = me(), st = ST(), dl = st.deadline ? `<span id="tm">${fmtT(st.deadline - DB.now())}</span>` : '<span></span>';
    return `<div class="hd"><div class="row"><div class="nm">${esc(m.name)}</div><span class="pill g">€${fmt(m.cash)}M</span><span class="pill ${m.trust >= 5 ? 'm' : 'c'}">Trust ${fmt(m.trust)}</span></div>${stepBar()}<div class="tm"><span>Round ${rd()} · ${R().name} · <b>${E.STEPN[sp()]}</b></span>${dl}</div></div>`; }
  function nodeRow(id, extra) { const N = E.NODES[id]; return `<div class="card node ${N.cat}"><div class="row"><div class="grow"><b>${esc(nm(id))}</b> ${tierTag(id)}<div class="mut">${esc(cname(id))} · list €${N.price}M</div></div>${extra || ''}</div></div>`; }
  function vsev(id) { return E.sevOf(id, Math.max(2, rd())); }
  function pFlip() { const r = R(), p = pack();
    return `<div class="card"><div class="kick">Round ${rd()} of 4 · ${esc(r.theme)}</div><h3>🔄 ${esc(r.flip)}</h3><p>${esc(r.more)}</p></div>
    <div class="card"><div class="kick">${esc(p.name)} sector · ${esc(p.regs)}</div>${E.IDS.map(id => `<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line)"><div class="grow" style="font-weight:700;font-size:14px">${esc(nm(id))}</div>${tierTag(id)}</div>`).join('')}</div>
    <p class="mut c" style="text-align:center">Waiting for the host to open bidding…</p>`; }
  function pBid() { if (rd() === 4) return '<div class="card"><h3>No bidding in the final round</h3><p>Use your cash on controls and treatments in the Build step.</p></div>';
    const m = me(), left = m.cash - bidTotal(), free = E.IDS.filter(id => !E.NODES[id].banned && !nodeOwn(id));
    const dis = !canAct('bid');
    return `<div class="card"><div class="kick">Sealed bids</div><p>Highest bid wins the system. Ties go to the player with less cash. Uncommitted: <b class="gold" style="color:var(--gold)">€${fmt(left)}M</b></p></div>` +
      free.map(id => { const N = E.NODES[id], b = +((m.bids || {})[id] || 0);
        return `<div class="card node ${N.cat}"><div class="row"><div class="grow"><b>${esc(nm(id))}</b> ${tierTag(id)}<div class="mut">${esc(cname(id))} · list €${N.price}M · ${N.tier === 'high' ? 'needs 2 controls' : ''}</div></div></div>
        <div class="row" style="margin-top:10px"><div class="stp"><button data-a="bm" data-id="${id}" ${dis ? 'disabled' : ''}>−</button><b>${b ? '€' + b : '—'}</b><button data-a="bp" data-id="${id}" ${dis ? 'disabled' : ''}>+</button></div><div class="grow"></div><button class="btn sm ghost" data-a="bl" data-id="${id}" ${dis ? 'disabled' : ''}>List price</button></div></div>`; }).join('') +
      (free.length ? '' : '<div class="card"><p>Every system has an owner.</p></div>'); }
  function pBuild() { const ids = myNodes(), r = rd(), m = me(), dis = !canAct('build');
    if (!ids.length) return '<div class="card"><h3>You own no systems yet</h3><p>Win a bid in the next round, or wait for unclaimed systems.</p></div>';
    const ftOK = r <= 2;
    return `<div class="card"><div class="row"><div class="grow"><b>Fast-track</b><div class="mut">Controls at half price, but a hidden echo token fires an incident in 2 rounds (defuse for €${E.COST.defuse}M)</div></div><button class="btn sm ${ui.ft && ftOK ? '' : 'ghost'}" data-a="ft" ${ftOK ? '' : 'disabled'}>${ui.ft && ftOK ? 'ON' : 'OFF'}</button></div></div>` +
    ids.map(id => { const ns = ND()[id], N = E.NODES[id], c = ns.c || 0, sev = vsev(id), odds = E.oddsOf(id, Math.max(2, r), ns);
      const ft = ui.ft && ftOK; const cc = costCtl(c, ft);
      let v = '';
      if (!ns.scanned) v = `<div class="vul" style="background:rgba(255,255,255,.06);border-color:var(--line)">❓ Unscanned. A hidden vulnerability may be waiting.</div>`;
      else if (ns.fixed) v = `<div class="vul ok">✓ Fixed: ${esc(E.VULN[id])}</div>`;
      else v = `<div class="vul">⚠ ${esc(E.VULN[id])} · ${E.SEV[sev].n} · attack odds ${Math.round(odds * 100)}%${ns.mit ? ' · mitigated' : ''}${ns.ins ? ' · insured' : ''}${ns.acc ? ' · accepted' : ''}</div>`;
      return `<div class="card node ${N.cat}"><div class="row"><div class="grow"><b>${esc(nm(id))}</b> ${tierTag(id)}<div class="mut">${esc(cname(id))} · ${[0, 1, 2, 3].map(i => `<span class="cb ${i < c ? 'on' : ''}"></span>`).join('')}${c >= 4 ? ' CERTIFIED' : ''}${N.tier === 'high' && c < 2 ? ' · <span style="color:var(--coral)">needs 2 controls</span>' : ''}</div></div></div>${v}
      <div class="acts"><button class="btn sm" data-a="ctl" data-id="${id}" ${dis || c >= 4 ? 'disabled' : ''}>＋ Control €${cc}M</button>${ns.scanned ? '' : `<button class="btn sm ghost" data-a="scan" data-id="${id}" ${dis ? 'disabled' : ''}>🔍 Scan €${E.COST.scan}M</button>`}</div>
      ${ns.scanned && !ns.fixed ? `<div class="acts"><button class="btn sm ghost" data-a="fix" data-id="${id}" ${dis ? 'disabled' : ''}>🔧 Fix €${E.COST.fix}M</button><button class="btn sm ghost" data-a="mit" data-id="${id}" ${dis || ns.mit ? 'disabled' : ''}>🛡 Mitigate €${E.COST.mit}M</button><button class="btn sm ghost" data-a="ins" data-id="${id}" ${dis || ns.ins ? 'disabled' : ''}>🧾 Insure €${E.COST.ins}M</button><button class="btn sm ghost" data-a="acc" data-id="${id}" ${dis || ns.acc ? 'disabled' : ''}>✍️ Accept</button></div>` : ''}
      ${ns.token && !ns.defused ? `<div class="vul">⏱ Echo token: an incident fires in round ${ns.token}. <button class="btn sm" data-a="def" data-id="${id}" ${dis ? 'disabled' : ''}>Defuse €${E.COST.defuse}M</button></div>` : ''}</div>`; }).join(''); }
  function pDeals() { const others = plist().filter(p => p.id !== pid), offers = D.offers || {}, r = rd(), can = canAct('deals'), m = me();
    const pacts = Object.values(D.pacts || {}).filter(p => p.on && (p.a === pid || p.b === pid) && p.until >= r);
    const inc = Object.keys(offers).filter(k => offers[k].to === pid && offers[k].st === 'open' && offers[k].r === r);
    const mineN = myNodes(), hubs = mineN.filter(id => E.NODES[id].cat === 'hub' && !ND()[id].co), lender = mineN.some(id => (ND()[id].c || 0) >= 2);
    let h = '';
    if (r >= 2) { h += `<div class="card"><div class="kick">News feed · one of these is real</div><p class="mut">Acting costs €${E.CARD_COST}M. A real warning cuts your attack odds by 20% this round. Acting on a fake costs Trust.</p>` + E.CARDS[r].map((c, i) => { const done = (m.cards || {})[r + '_' + i];
      return `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="mut">${esc(c.n)}</div><b>${esc(c.h)}</b><div class="acts"><button class="btn sm ${done ? 'ghost' : ''}" data-a="card" data-id="${i}" ${can && !done ? '' : 'disabled'}>${done ? (c.real ? '✓ Acted · odds −20%' : '✗ Acted · it was fake') : 'Act on this'}</button></div></div>`; }).join('') + '</div>'; }
    h += `<div class="card"><div class="kick">Shared-liability pact</div><h3>Split the damage</h3><p>For 3 rounds you and a partner split cash losses from attacks 50/50.</p>`;
    h += others.length ? `<div class="acts">${others.map(o => `<button class="btn sm ghost" data-a="offer" data-id="${o.id}" ${can ? '' : 'disabled'}>${esc(o.name)}</button>`).join('')}</div>` : '<p class="mut">No other players yet.</p>'; h += '</div>';
    const need = mineN.filter(id => E.NODES[id].cat !== 'hub' || true).filter(id => !ND()[id].lic || ND()[id].lic < r);
    h += `<div class="card"><div class="kick">Control licence</div><h3>Borrow a control</h3><p>Ask a player with a 2-control system to lend you one control level on a system of yours for 2 rounds. They take 25% of its revenue and share the blame if it is hit.</p>`;
    h += !need.length ? '<p class="mut">You have no systems to cover.</p>' : need.map(id => `<div style="padding:6px 0;border-top:1px solid var(--line)"><b style="font-size:14px">${esc(nm(id))}</b><div class="acts">${others.map(o => `<button class="btn sm ghost" data-a="lic" data-id="${o.id}|${id}" ${can ? '' : 'disabled'}>from ${esc(o.name)}</button>`).join('')}</div></div>`).join(''); h += '</div>';
    h += `<div class="card"><div class="kick">Pipeline co-ownership</div><h3>Share a data pipeline or model</h3><p>Sell half of a shared system you own for ${Math.round(E.CO_SHARE * 100)}% of its list price. Revenue, damage and Trust loss are then split 50/50.</p>`;
    h += hubs.length ? hubs.map(id => `<div style="padding:6px 0;border-top:1px solid var(--line)"><b style="font-size:14px">${esc(nm(id))}</b> <span class="mut">€${E.rnd(E.CO_SHARE * E.NODES[id].price)}M</span><div class="acts">${others.map(o => `<button class="btn sm ghost" data-a="co" data-id="${o.id}|${id}" ${can ? '' : 'disabled'}>offer ${esc(o.name)}</button>`).join('')}</div></div>`).join('') : '<p class="mut">You own no unshared pipeline or model.</p>'; h += '</div>';
    const lbl = { pact: 'a shared-liability pact', lic: 'to license a control to', co: 'half of' };
    inc.forEach(k => { const o = offers[k], what = o.type === 'pact' ? 'offers a shared-liability pact' : o.type === 'lic' ? `asks you to license a control to <b>${esc(nm(o.node))}</b> (you earn 25% of its revenue)` : `offers you half of <b>${esc(nm(o.node))}</b> for €${E.rnd(E.CO_SHARE * E.NODES[o.node].price)}M`;
      h += `<div class="card"><b>${esc(pname(o.from))}</b> ${what}.<div class="acts"><button class="btn sm" data-a="yes" data-id="${k}">Accept</button><button class="btn sm ghost" data-a="no" data-id="${k}">Decline</button></div></div>`; });
    pacts.forEach(p => { h += `<div class="card"><span class="chip ok">PACT</span> with <b>${esc(pname(p.a === pid ? p.b : p.a))}</b> until round ${p.until}</div>`; });
    E.IDS.forEach(id => { const ns = ND()[id]; if (!ns) return; if (ns.co && (ns.by === pid || ns.co === pid)) h += `<div class="card"><span class="chip ok">CO-OWNED</span> <b>${esc(nm(id))}</b> with ${esc(pname(ns.by === pid ? ns.co : ns.by))}</div>`;
      if (ns.lic >= r && (ns.by === pid || ns.licBy === pid)) h += `<div class="card"><span class="chip ok">LICENCE</span> <b>${esc(nm(id))}</b> · ${ns.by === pid ? 'covered by ' + esc(pname(ns.licBy)) : 'you lend a control'} until round ${ns.lic}</div>`; });
    if (r === 4) { const d = (D.dil || {})[pid]; h += `<div class="card"><div class="kick">Final dilemma</div><h3>A flaw has been found</h3><p>An internal review found a flaw in one of your models that regulators don't know about yet.</p><div class="acts"><button class="btn sm ${d === 'disclose' ? '' : 'ghost'}" data-a="dil" data-id="disclose">📣 Disclose (−€3M, +1 Trust)</button><button class="btn sm ${d === 'quiet' ? '' : 'ghost'}" data-a="dil" data-id="quiet">🤫 Stay quiet (50% it leaks: −3 Trust)</button></div><p class="mut" style="margin-top:8px">${d ? 'Chosen: ' + d : 'No choice means staying quiet.'}</p></div>`; }
    return h; }
  function pAttack() { const a = ST().attack, mine = a ? (a.events || []).filter(e => e.by === pid) : [];
    return `<div class="card"><div class="kick">Attack phase · the only luck in the game</div><h3>🎲 Watch the projector</h3><p>${R().n === 1 ? 'Launch round: no attacks yet.' : 'Every open vulnerability is rolled against its odds.'}</p></div>` +
      (mine.length && ST().step === 'attack' ? mine.map(e => `<div class="card"><b>${esc(e.k === 'dilemma' ? e.label : nm(e.k))}</b> <span class="chip ${e.hit ? 'bad' : 'ok'}">${e.hit ? 'HIT' : 'MISS'}</span><div class="mut">${e.t === 'atk' ? 'odds ' + Math.round(e.p * 100) + '%' : ''}</div></div>`).join('') : ''); }
  function pSettle() { const s = (ST().sum || {})[pid] || {}; const m = me();
    return `<div class="card"><div class="kick">Round ${rd()} result</div><div class="row"><div class="grow"><div class="mut">Revenue</div><div class="big">+€${fmt(s.rev || 0)}M</div></div><div class="grow"><div class="mut">Damage</div><div class="big" style="color:var(--coral)">−€${fmt(s.dmg || 0)}M</div></div></div>
    <p style="margin-top:10px">Cash €${fmt(m.cash)}M · Trust ${fmt(m.trust)}${s.dt ? ' (' + (s.dt > 0 ? '+' : '') + fmt(s.dt) + ')' : ''}</p></div>` +
      ((s.lines || []).length ? `<div class="card">${s.lines.map(l => `<div style="padding:4px 0;font-weight:700;font-size:14px">• ${esc(l)}</div>`).join('')}</div>` : '') + '<p class="mut" style="text-align:center">Waiting for the host…</p>'; }
  function pFinal() { const f = ST().final || [], mine = f.findIndex(x => x.pid === pid);
    return `<div class="card"><div class="kick">Final standings</div>${f.map((x, i) => `<div class="lead"><div class="rk">${i + 1}</div><div class="grow"><b>${esc(pname(x.pid))}</b><div class="mut">€${fmt(x.cash)}M cash · Trust ${fmt(x.trust)}</div></div><div class="big" style="font-size:30px">${Math.round(x.score)}</div></div>`).join('')}<p class="mut" style="margin-top:10px">Score = net worth × (0.6 + 0.08 × Trust)</p></div>
    <div class="card"><div class="kick">Your vulnerability register</div>${myNodes().map(id => { const ns = ND()[id], t = ns.fixed ? 'Fixed' : ns.mit ? 'Mitigated' : ns.ins ? 'Insured' : ns.acc ? 'Accepted' : ns.scanned ? 'Open' : 'Never scanned'; const cl = ns.fixed || ns.mit ? 'ok' : ns.ins ? 'warn' : 'bad';
      return `<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${esc(nm(id))}</b><div class="mut">${esc(E.VULN[id])} <span class="chip ${cl}">${t}</span> ${(ns.c || 0)} controls</div></div>`; }).join('') || '<p>You owned no systems.</p>'}</div>`; }
  function playerView() {
    const st = ST();
    if (!me()) return `<div class="ph"><div class="logo">ECHO</div><div class="tag">Every decision comes back around.<br><b>Pick a name to join</b></div><input class="txt" id="nm" maxlength="16" placeholder="Your name or team" value="${esc(ui.typed)}" autocomplete="off"><button class="btn" data-a="join">Join the game</button></div>${DB.mode === 'demo' ? '<div class="demo">DEMO MODE</div>' : ''}`;
    if (st.phase === 'lobby') return `<div class="ph"><div class="hd"><div class="row"><div class="nm">${esc(me().name)}</div><span class="pill m">Joined</span></div></div><div class="logo" style="font-size:56px;margin-top:40px">ECHO</div><div class="tag">You're in. ${plist().length} player${plist().length > 1 ? 's' : ''} so far.<br>The host will start the game.</div></div>`;
    if (st.phase === 'final') return `<div class="ph">${header().replace(/<div class="steps">.*?<\/div>/, '')}${pFinal()}</div>`;
    const s = sp(); const body = { flip: pFlip, bid: pBid, build: pBuild, deals: pDeals, attack: pAttack, settle: pSettle }[s]();
    const done = me().ready === rd() + ':' + s; const needs = ['bid', 'build', 'deals'].includes(s) && !(s === 'bid' && rd() === 4);
    return `<div class="ph">${header()}${body}</div>${needs ? `<div class="foot"><button class="btn ${done ? 'ghost' : ''}" data-a="${done ? 'unready' : 'ready'}">${done ? '✓ Done · tap to edit' : "I'm done"}</button></div>` : ''}`; }
  function playerClick(e) { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a, id = b.dataset.id, m = me();
    if (a === 'join') return join(document.getElementById('nm').value);
    if (a === 'ready') return ready(); if (a === 'unready') return unready();
    if (a === 'bp') { const cur = +((m.bids || {})[id] || 0), N = E.NODES[id]; return setBid(id, cur ? cur + 1 : Math.max(1, Math.round(N.price * .8))); }
    if (a === 'bm') { const cur = +((m.bids || {})[id] || 0); return setBid(id, cur - 1); }
    if (a === 'bl') return setBid(id, E.NODES[id].price);
    if (a === 'ft') { ui.ft = !ui.ft; return render(true); } if (a === 'ctl') return buyCtl(id); if (a === 'scan') return scan(id);
    if (['fix', 'mit', 'ins', 'acc', 'def'].includes(a)) return treat(id, a);
    if (a === 'offer') return offerPact(id); if (a === 'lic') { const [to, n] = id.split('|'); return sendOffer('lic', to, n); } if (a === 'co') { const [to, n] = id.split('|'); return sendOffer('co', to, n); }
    if (a === 'card') return actCard(+id); if (a === 'yes') return answerOffer(id, true); if (a === 'no') return answerOffer(id, false); if (a === 'dil') return dilemma(id); }

  /* ======================= BOARD ======================= */
  const CATCOL = { cus: '#5bc0eb', rsk: '#e5484d', ops: '#f39c3d', adv: '#3dbb73', hub: '#c9d2f2' };
  function attackIdx() { const a = ST().attack; if (!a || sp() !== 'attack') return -1; const evs = (a.events || []).filter(e => e.t !== 'dil'); return Math.min(evs.length - 1, Math.floor((DB.now() - a.at) / 2800)); }
  function boardView() {
    const st = ST(), pk = pack(), r = rd(), s = sp(), pls = plist(), nodes = ND();
    const origin = location.href.split('?')[0].replace(/\/$/, '/');
    if (st.phase === 'lobby') { const url = origin + (ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '');
      let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); } catch (e) {}
      return `<div class="stageW"><div class="stage" id="stage"><div class="btop"><div class="blogo">ECHO</div><div class="brd">Waiting for players<small>${esc(pk.name)} sector${st.client ? ' · ' + esc(st.client) : ''}</small></div></div>
      <div class="joinB"><div class="qr">${qr}</div><div><h1>ECHO</h1><div style="font-size:34px;color:var(--lav);font-weight:700;margin:6px 0 24px">Scan to join · ${esc(url.replace(/^https?:\/\//, ''))}</div><div class="nmz">${pls.map(p => `<span style="border-left:8px solid ${pcol(p.id)}">${esc(p.name)}</span>`).join('') || '<span>No one yet…</span>'}</div></div></div></div></div>`; }
    const idx = attackIdx(), evs = ((st.attack || {}).events || []).filter(e => e.t !== 'dil'), shown = s === 'attack' ? evs.slice(0, idx + 1) : (s === 'settle' ? evs : []);
    const hitIds = {}; shown.forEach(e => { if (e.hit) { hitIds[e.k] = 1; } });
    const echoPairs = []; shown.forEach(e => { if (e.hit) e.echo.forEach(n => echoPairs.push([e.k, n])); });
    const down = r === 3 && (s === 'attack' || s === 'settle') && hitIds.fm;
    const lines = E.LINKS.map(([a, b]) => { const hot = echoPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); const A = E.NODES[a].pos, B = E.NODES[b].pos, same = E.NODES[a].cat === E.NODES[b].cat && E.NODES[a].cat !== 'hub';
      return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${hot ? '#ff5d73' : '#4a5fa8'}" stroke-width="${hot ? 8 : 3}" ${same ? 'stroke-dasharray="10 8"' : ''} opacity="${hot ? 1 : .7}"/>`; }).join('');
    const cur = s === 'attack' && idx >= 0 ? evs[idx] : null;
    const nodeHTML = E.IDS.map(id => { const N = E.NODES[id], ns = nodes[id] || {}, by = ns.by, [x, y] = N.pos, c = ns.c || 0; let bd = '', bc = '#4a5fa8';
      if (N.banned) { bd = '⛔ WITHDRAWN · PROHIBITED'; bc = '#d7263d'; }
      else if (by) { if (ns.fixed) { bd = '✓ Fixed'; bc = '#2a9d6b'; } else if (ns.scanned) { const sv = E.sevOf(id, Math.max(2, r)); bd = '⚠ ' + E.VULN[id] + ' · ' + E.SEV[sv].n + ' ' + Math.round(E.oddsOf(id, Math.max(2, r), ns) * 100) + '%' + (ns.mit ? ' · mitigated' : '') + (ns.ins ? ' · insured' : '') + (ns.acc ? ' · accepted' : '') + ((ns.lic || 0) >= r ? ' · licensed' : ''); bc = ns.mit || ns.ins ? '#2e7dd1' : '#b8860b'; } else { bd = '? Unscanned'; bc = '#555'; } }
      else { bd = N.tier === 'shared' ? 'SHARED' : E.TIERN[N.tier]; bc = { min: '#3a8a5a', lim: '#2e7dd1', high: '#e68a00', shared: '#4a5fa8' }[N.tier]; if (N.tier !== 'shared') bd += ' · €' + N.price + 'M'; }
      const isHit = hitIds[id], isDown = down && id === 'fm', spot = cur && cur.k === id;
      const owner = isDown ? '<span class="ow" style="background:#ff5d73;color:#fff">ZERO-DAY · OFFLINE</span>' : by ? `<span class="ow" style="background:${pcol(by)}">${esc(pname(by))}${ns.co ? ' + ' + esc(pname(ns.co)) : ''}</span>` : '<span class="ow un">Unclaimed</span>';
      return `<div class="bnd ${N.banned ? 'ban' : ''} ${isHit || isDown ? 'hit' : ''} ${spot ? 'spot' : ''}" style="left:${x - 125}px;top:${y - 79}px;border-color:${by ? pcol(by) : 'rgba(255,255,255,.2)'}"><div class="band" style="background:${CATCOL[N.cat]}"></div><div class="n">${esc(nm(id))}</div><div class="s">${esc(cname(id))}</div><div class="o">${N.banned ? '' : owner}<span class="pp">${[0, 1, 2, 3].map(i => `<i class="${by && i < c ? 'on' : ''}"></i>`).join('')}</span></div><div class="bd" style="background:${bc}">${esc(bd)}</div></div>`; }).join('');
    const ban = { flip: ['🔄 FLIP · ' + R().flip, '#4a5fd6'], bid: ['🤝 Sealed bids open', '#2a56a0'], build: ['🛠 Build · scan · treat', '#2a56a0'], deals: ['🤝 Deals' + (r === 4 ? ' · final dilemma' : ''), '#2a56a0'], attack: [r === 1 ? 'Launch round · no attacks' : '🎲 ATTACK PHASE · the only luck in the game', '#d7263d'], settle: ['📊 Settle · revenue and damage', '#2a9d6b'] }[s];
    let spotP = '';
    if (cur) { const t = (DB.now() - st.attack.at) - idx * 2800, roll = Math.min(1, Math.max(0, (t - 300) / 900)), shownR = cur.roll * roll, done = t > 1500;
      spotP = `<div class="bpan"><div style="width:380px"><div class="nm">${esc(nm(cur.k))}</div><div style="font-size:24px;font-weight:700;color:var(--lav)">${esc(pname(cur.by))} · ${cur.t === 'token' ? 'echo token fires' : E.SEV[cur.sev].n + ' · ' + esc(E.VULN[cur.k])}</div></div><div class="grow" style="flex:1"><div style="font-size:24px;font-weight:800;margin-bottom:6px">Attack odds ${Math.round(cur.p * 100)}%</div><div class="gauge"><i style="width:${cur.p * 100}%"></i><b style="left:${shownR * 100}%"></b></div></div><div class="res" style="color:${cur.hit ? '#ff5d73' : '#3DD6A3'};min-width:230px;text-align:right">${done ? (cur.hit ? 'HIT' + (cur.dmg ? ' −€' + cur.dmg + 'M' : '') : 'MISS') : '…'}</div></div>`;
      if (done && cur !== ui.lastSpot) { ui.lastSpot = cur; cur.hit ? SFX.boom() : SFX.shield(); } }
    else if (s === 'attack' && !evs.length) spotP = `<div class="bpan"><div class="nm">${r === 1 ? 'Grace round: no attacks yet' : 'No open vulnerabilities to attack'}</div></div>`;
    else if (s === 'attack' && idx === evs.length - 1 && DB.now() - st.attack.at > evs.length * 2800 + 200) spotP = '';
    let over = '';
    if (st.phase === 'final') { const f = st.final || []; over = `<div class="bover"><h1>Final standings</h1>${f.map((x, i) => `<div class="blead"><div class="rk">${i + 1}</div><div style="flex:1">${esc(pname(x.pid))}<br><small>€${fmt(x.cash)}M cash · Trust ${fmt(x.trust)} · ${E.owned({ nodes: nodes }, x.pid).length} systems</small></div><div class="serif" style="color:var(--gold);font-size:64px">${Math.round(x.score)}</div></div>`).join('')}<div style="margin-top:20px;font-size:26px;color:var(--lav);font-weight:700">Score = net worth × (0.6 + 0.08 × Trust)</div></div>`; }
    const phs = E.STEPS.map(x => `<span class="bph ${x === s && st.phase === 'play' ? 'on' : ''} ${x === 'attack' ? 'atk' : ''}">${E.STEPN[x]}${x === 'attack' ? ' 🎲' : ''}</span>`).join('');
    return `<div class="stageW"><div class="stage" id="stage"><div class="btop"><div class="blogo">ECHO</div><div class="brd">Round ${r} of 4 · ${R().name}<small>${esc(R().theme)}</small></div><div class="bchip">${esc(pk.name.toUpperCase())}${st.client ? ' · ' + esc(st.client).toUpperCase() : ''}</div><div class="bpls">${pls.map(p => `<div class="bpl" style="border-color:${pcol(p.id)}"><b style="color:${pcol(p.id)}">${esc(p.name)}</b> €${fmt(p.cash)}M<small>Trust ${fmt(p.trust)}${p.ready === r + ':' + s ? ' · ✓ ready' : ''}</small></div>`).join('')}</div></div>
      <svg width="1920" height="1080">${lines}</svg>${nodeHTML}<div class="bban" style="background:${ban[1]}">${ban[0]}${st.deadline && st.phase === 'play' ? ' · ' + fmtT(st.deadline - DB.now()) : ''}</div>${spotP}${over}<div class="bbot">${phs}<div style="margin-left:auto;color:var(--lav);font-size:20px;font-weight:600">${esc(pk.regs)}</div></div></div></div>`; }
  function fitStage() { const s = document.getElementById('stage'); if (!s) return; const k = Math.min(innerWidth / 1920, innerHeight / 1080); s.style.transform = `scale(${k})`; }

  /* ======================= HOST ======================= */
  async function hostAdvance(back) {
    const snap = await DB.get(BASE); D = snap || {}; const st = ST(), upd = {}, now = DB.now(), g = G();
    const setS = o => Object.keys(o).forEach(k => upd['state/' + k] = o[k]);
    const clearReady = () => plist().forEach(p => upd['players/' + p.id + '/ready'] = null);
    const writeP = () => Object.keys(g.players).forEach(id => { upd['players/' + id + '/cash'] = g.players[id].cash; upd['players/' + id + '/trust'] = g.players[id].trust; });
    if (st.phase === 'lobby') { if (!plist().length) { toast('No players yet'); return; } const pkv = document.getElementById('hpack'), cl = document.getElementById('hclient');
      setS({ phase: 'play', round: 1, step: 'flip', pack: pkv ? pkv.value : 'banking', client: cl ? cl.value.trim() : '', at: now, deadline: now + DUR.flip * 1000, attack: null, sum: null, final: null });
      plist().forEach(p => { upd['players/' + p.id + '/cash'] = E.START; upd['players/' + p.id + '/trust'] = 5; }); clearReady(); return WR(upd); }
    if (st.phase === 'final') return;
    const r = rd(), s = sp(); let nr = r, ns = null;
    if (s === 'flip') ns = r <= 3 ? 'bid' : 'build';
    else if (s === 'bid') { const won = E.resolveBids(g); Object.keys(g.nodes).forEach(id => { if (g.nodes[id].by && !ND()[id]) upd['nodes/' + id] = g.nodes[id]; }); writeP(); plist().forEach(p => upd['players/' + p.id + '/bids'] = null); setS({ won }); ns = 'build'; }
    else if (s === 'build') ns = 'deals';
    else if (s === 'deals') { const seed = Math.floor(Math.random() * 1e9); let a = seed; const rng = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const before = {}; Object.keys(g.players).forEach(id => before[id] = { cash: g.players[id].cash, trust: g.players[id].trust });
      const res = E.attack(g, r, rng); writeP(); setS({ attack: { at: now + 1500, r, seed, events: res.ev }, snap: before }); ns = 'attack'; }
    else if (s === 'attack') { const out = E.settle(g, r), before = st.snap || {}, evs = (st.attack || {}).events || [], sum = {}; writeP();
      Object.keys(g.players).forEach(id => { const lines = []; evs.forEach(e => { if (e.by === id && e.hit) lines.push(e.t === 'token' ? 'Echo token fired on ' + nm(e.k) : nm(e.k) + ': ' + E.VULN[e.k] + ' exploited'); if (e.t === 'atk' && e.hit && e.by !== id) (e.echo || []).forEach(n => { if (nodeOwn(n) === id) lines.push('Echo from ' + nm(e.k) + ' reached ' + nm(n)); }); if (e.t === 'dil' && e.by === id) lines.push(e.label); });
        const dmg = E.rnd(Math.max(0, (before[id] ? before[id].cash : 0) - (PL()[id] ? PL()[id].cash : 0)));
        sum[id] = { rev: out[id].rev, dmg, dt: E.rnd(g.players[id].trust - (before[id] ? before[id].trust : 0)), lines: lines.concat(out[id].lines) }; });
      setS({ sum }); ns = 'settle'; }
    else if (s === 'settle') { if (r === 4) { const f = Object.keys(g.players).map(id => ({ pid: id, score: E.finalScore(g, id), cash: g.players[id].cash, trust: g.players[id].trust })).sort((a, b) => b.score - a.score);
        setS({ phase: 'final', final: f, deadline: null }); return WR(upd); }
      nr = r + 1; ns = 'flip'; plist().forEach(p => { upd['players/' + p.id + '/cash'] = E.rnd(p.cash + E.TOPUP[nr]); }); upd['offers'] = null; }
    setS({ round: nr, step: ns, at: now, deadline: DUR[ns] ? now + DUR[ns] * 1000 : null }); clearReady(); return WR(upd); }
  function hostView() {
    const st = ST(), pls = plist(), url = location.href.split('?')[0], rm = ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '';
    const nextLbl = st.phase === 'lobby' ? 'Start game' : st.phase === 'final' ? 'Game over' : { flip: 'Open bidding', bid: 'Reveal bids → Build', build: 'Close build → Deals', deals: 'Close deals → Attack!', attack: 'Settle the round', settle: rd() === 4 ? 'Final standings' : 'Next round' }[sp()] + (sp() === 'flip' && rd() === 4 ? ' (open build)' : '');
    return `<div class="host"><h1>ECHO · host</h1>
      ${st.phase === 'lobby' ? `<div class="hbox"><h3>SECTOR PACK (set per client)</h3><select id="hpack">${Object.keys(E.PACKS).map(k => `<option value="${k}" ${k === (st.pack || 'banking') ? 'selected' : ''}>${esc(E.PACKS[k].name)}</option>`).join('')}</select><input id="hclient" placeholder="Client name (shown on the board)" value="${esc(st.client || '')}" size="30"></div>` : `<div class="hbox"><h3>NOW</h3><b style="font-size:22px">${esc(pack().name)} · Round ${rd()} · ${R().name} · ${E.STEPN[sp()] || ''}</b> <span id="tm" style="font-size:20px;margin-left:12px"></span></div>`}
      <div class="hbox"><div class="hrow"><button class="btn" id="hnext" ${st.phase === 'final' ? 'disabled' : ''}>${nextLbl}</button><button class="btn ghost" id="hreset" style="font-size:15px">Reset room</button>${st.phase === 'play' ? '<button class="btn ghost" id="hplus" style="font-size:15px">+30 s</button>' : ''}</div></div>
      <div class="hbox"><h3>PLAYERS (${pls.length})</h3><table class="t"><tr><th>Name</th><th>Cash</th><th>Trust</th><th>Systems</th><th>Ready</th></tr>${pls.map(p => `<tr><td style="color:${pcol(p.id)};font-weight:800">${esc(p.name)}</td><td>€${fmt(p.cash)}M</td><td>${fmt(p.trust)}</td><td>${E.IDS.filter(id => nodeOwn(id) === p.id).map(id => esc(nm(id))).join(', ') || '—'}</td><td>${p.ready === rd() + ':' + sp() ? '✓' : ''}</td></tr>`).join('')}</table></div>
      <div class="hbox"><h3>LINKS</h3><div style="line-height:1.9">Players (QR): <a href="${url}${rm}" target="_blank" style="color:var(--gold)">${esc(url + rm)}</a><br>Projector: <a href="${url}?board${rm ? '&' + rm.slice(1) : ''}" target="_blank" style="color:var(--gold)">${esc(url + '?board' + (rm ? '&' + rm.slice(1) : ''))}</a></div></div></div>`; }
  function hostClick(e) { const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'hnext') return hostAdvance();
    if (b.id === 'hplus') return DB.set(BASE + '/state/deadline', Math.max(DB.now(), ST().deadline || DB.now()) + 30000);
    if (b.id === 'hreset') { if (confirm('Clear the whole room (players, systems, scores)?')) DB.set(BASE, null); } }

  /* ======================= render loop ======================= */
  let lastSig = '';
  function render(force) {
    const act = document.activeElement; if (VIEW === 'player' && act && act.id === 'nm' && !force) return;
    const html = VIEW === 'board' ? boardView() : VIEW === 'host' ? hostView() : playerView();
    const sig = html; if (!force && sig === lastSig) return; lastSig = sig;
    const keep = VIEW === 'player' && act && act.id === 'nm' ? act.value : null; const sy = window.scrollY;
    $app.innerHTML = html + (DB.mode === 'demo' && VIEW !== 'board' ? '<div class="demo">DEMO MODE · this browser only</div>' : '');
    if (VIEW === 'board') fitStage(); else window.scrollTo(0, sy);
    const inp = document.getElementById('nm'); if (inp) { inp.addEventListener('input', () => ui.typed = inp.value); if (keep != null) inp.value = keep; } }
  document.addEventListener('click', e => VIEW === 'host' ? hostClick(e) : VIEW === 'player' ? playerClick(e) : 0);
  window.addEventListener('resize', fitStage);
  DB.on(BASE, v => { D = v || {}; render(); });
  setInterval(() => { const t = document.getElementById('tm'); if (t && ST().deadline) t.textContent = fmtT(ST().deadline - DB.now()); if (VIEW === 'board' && ST().phase !== 'lobby') render(); }, 400);
  window.__echo = { get D() { return D; }, pid: () => pid };
})();
