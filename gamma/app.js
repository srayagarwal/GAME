/* Agent Tycoon GAMMA · phone edition (random attacks, breaking news, wild card, whistleblower, EU AI Act). One page, three views: player (default), ?board, ?host=KEY */
(function () {
  const G = window.TYCOON, cfg = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || cfg.room || 'main').replace(/[^\w-]/g, ''), BASE = 'games/gamma-' + ROOM;
  const VIEW = Q.has('board') ? 'board' : (Q.get('host') && Q.get('host') === cfg.hostKey ? 'host' : 'player');
  const NAMES = [['Alert','🚨'],['Anchor','⚓'],['Atlas','🗺️'],['Audit','🧾'],['Beacon','🗼'],['Bear','🐻'],['Check','✅'],['Clear','💎'],['Comet','☄️'],['Compass','🧭'],
    ['Eagle','🦅'],['Echo','🔊'],['Fair','⚖️'],['Fox','🦊'],['Gate','⛩️'],['Guard','💂'],['Hawk','🪶'],['Human','🙋'],['Key','🗝️'],['Koala','🐨'],
    ['Lion','🦁'],['Lock','🔒'],['Moon','🌙'],['Ninja','🥷'],['Nova','✨'],['Orbit','🪐'],['Owl','🦉'],['Owner','👑'],['Panda','🐼'],['Pilot','🧑‍✈️'],
    ['Pixel','👾'],['Proof','📜'],['Radar','📡'],['Ranger','🤠'],['Robot','🤖'],['Rocket','🚀'],['Safe','🦺'],['Shark','🦈'],['Shield','🛡️'],['Sky','☁️'],
    ['Spark','⚡'],['Star','⭐'],['Sun','☀️'],['Test','🧪'],['Tiger','🐯'],['Trust','🤝'],['Truth','🔍'],['Watch','⌚'],['Wolf','🐺'],['Zebra','🦓']];
  const EMO0 = {}; NAMES.forEach(([n, e]) => EMO0[n] = e);
  const EMO = new Proxy(EMO0, { get: (t, n) => t[n] || (typeof n === 'string' && n ? '🙂' : '') });
  // typed names: tidy for display; keyOf makes them unique regardless of case/spaces
  const cleanName = s => String(s || '').replace(/[<>.#$\[\]\/\\"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const keyOf = n => cleanName(n).toLowerCase().replace(/\s/g, '');
  const PHASES = ['lobby', 'p1', 'p1x', 'd1', 'p2', 'p2x', 'd6', 'cfo'];
  const $app = document.getElementById('app');
  if (Q.get('host') && VIEW !== 'host') { $app.innerHTML = '<div class="boot">Wrong host key.</div>'; return; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // live: the phone remembers the player (localStorage). demo: each tab is its own player (sessionStorage)
  const STO = () => DB.mode === 'demo' ? sessionStorage : localStorage;
  const store = { get(k) { try { return STO().getItem(k); } catch (e) { return null; } }, set(k, v) { try { STO().setItem(k, v); } catch (e) {} } };
  let state = { phase: 'lobby' }, players = {}, names = {};
  const ph = () => state.phase || 'lobby', at = p => PHASES.indexOf(ph()) >= PHASES.indexOf(p);
  const list = () => Object.keys(players).map(id => Object.assign({ id }, players[id])).filter(p => p.name);
  const has2 = p => !!p.l2;
  const fired = () => (state.d1 || []).concat(at('d6') ? (state.d6 || []) : []);
  const wbOf = p => state.wb && state.wb.pid === p.id ? { choice: state.wb.choice || 'hide', leak: !!state.wb.leak } : null;
  const scoreOf = p => G.score({ q1: p.q1, q2: p.q2, has2: has2(p), wb: wbOf(p) }, fired(), at('d6'));
  /* breaking news: headlines released so far for the current shop */
  const shopPart = () => (ph() === 'p2' || ph() === 'p2x') ? 2 : (ph() === 'p1' || ph() === 'p1x') ? 1 : 0;
  const released = part => ((state.news && state.news[part]) || []).filter(n => n && DB.now() >= n.at);
  const wbLive = () => !!(state.wb && state.wb.pid === pid && !state.wb.choice && DB.now() >= state.wb.at && (ph() === 'p2' || ph() === 'p2x'));
  const actTag = id => { const a = G.ACT[id]; return a ? `<div class="act">⚖️ EU AI Act <b>Art. ${a[0]}</b> · ${esc(a[1])}</div>` : ''; };
  const fmtT = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const left = () => state.deadline ? state.deadline - DB.now() : null;
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const cardHTML = (k, extra = '', st = '') => { const [, e, n, f, cost, s] = G.CARD[k]; const col = s === 'r' ? 'var(--red)' : s === 'f' ? 'var(--amber)' : s === 'w' ? '#7A4FD0' : 'var(--navy)';
    return `<div class="pc ${extra} ${s === 'w' ? 'wild' : ''}" style="${st}"><div class="cn" style="color:${col}"><b>${cost}</b><span>${s === 'r' ? '♦' : s === 'f' ? '♣' : s === 'w' ? '★' : '♠'}</span></div><div class="ce">${e}</div><div class="nm" style="color:${col}">${n}</div><div class="fx">${f}</div></div>`; };
  const table = inner => `<div class="ph"><div class="fl"></div><div class="brand">NBD</div>${inner}</div>${DB.mode === 'demo' ? '<div class="demo">DEMO MODE · this browser only</div>' : ''}`;

  /* ======================= PLAYER ======================= */
  const PIDK = 'gamma_pid_' + ROOM;
  let pid = store.get(PIDK); if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set(PIDK, pid); }
  let ui = { pick: null, overlay: null, pop: null, seen: {} }, lastSig = '';
  const me = () => players[pid] ? Object.assign({ id: pid }, players[pid]) : null;
  const partOf = () => (ph() === 'p2' || ph() === 'p2x') ? 2 : 1;
  async function join(name) {
    name = cleanName(name); const k = keyOf(name); if (!k) return;
    const owner = await DB.tx(BASE + '/names/' + k, cur => cur ? undefined : pid);
    const now = await DB.get(BASE + '/names/' + k);
    if (now !== pid) { ui.overlay = { t: 'rejoin', name: (players[now] && players[now].name) || name, owner: now }; render(true); return; }
    await DB.set(BASE + '/players/' + pid, { name, q1: {}, q2: {}, b1: 0, b2: 0, l1: false, l2: false, t: DB.now() });
    ui.typed = ''; buzz(30); render(true);
  }
  function rejoin(owner) { pid = owner; store.set(PIDK, pid); ui.overlay = null; render(true); }
  function shopData() {
    const part = partOf(), m = me(), q = Object.assign({}, m['q' + part] || {}), b = m['b' + part] || 0;
    const listP = part === 1 ? G.P1 : G.P2, budget = part === 1 ? G.BUDGET1 : G.BUDGET2;
    const sp = G.spent(q, listP); return { part, q, b, listP, budget, chips: budget + b, sp, leftC: budget + b - sp };
  }
  /* wild card: unlocked by owning Least privilege + Kill switch (bought in Part 1); one per game */
  function wildState(d) { const q1 = d.part === 1 ? d.q : (me().q1 || {});
    if (d.part === 2 && (me().q1 || {}).IND) return 'used';
    return (q1.LP || 0) >= 1 && (q1.KS || 0) >= 1 ? 'open' : 'locked'; }
  function deal(k) { if (guarded() || me()['l' + partOf()] || !(ph() === 'p1' || ph() === 'p2')) return;
    const d = shopData(), c = G.CARD[k]; const n = d.q[k] || 0;
    if (k === 'IND' && !n) { const w = wildState(d); if (w === 'used') { toast('📜 You already bought your one Indemnity policy in Part 1'); return; }
      if (w === 'locked') { toast('🔒 Indemnity is locked: you need Least privilege + Kill switch, bought in Part 1'); buzz([40, 40, 40]); return; } }
    if (n >= c[6]) { toast(k === 'IND' ? 'One wild card per game' : 'No more ' + c[2] + ' cards on the table'); return; }
    if (d.leftC < c[4]) { const bar = document.querySelector('.bar'); if (bar) { bar.classList.remove('shake'); void bar.offsetWidth; bar.classList.add('shake'); } toast('Not enough chips. Tap +10 to borrow from the bank.'); buzz([40, 40, 40]); return; }
    players[pid]['q' + d.part] = Object.assign({}, d.q, { [k]: n + 1 }); ui.pop = k; buzz(15);
    DB.update(BASE + '/players/' + pid, { ['q' + d.part + '/' + k]: n + 1 }); SFX.deal(); render(true);
  }
  function undeal(k) { if (me()['l' + partOf()] || !(ph() === 'p1' || ph() === 'p2')) { toast('Your hand is locked. Tap ✏️ Change my hand to edit it.'); return; }
    const d = shopData(); const n = d.q[k] || 0; if (!n) return;
    players[pid]['q' + d.part] = Object.assign({}, d.q, { [k]: n - 1 }); ui.pop = null;
    DB.update(BASE + '/players/' + pid, { ['q' + d.part + '/' + k]: n - 1 }); render(true);
  }
  function borrow() {
    const d = shopData(); players[pid]['b' + d.part] = d.b + 10; buzz(25);
    DB.update(BASE + '/players/' + pid, { ['b' + d.part]: d.b + 10 }); SFX.chip(); ui.overlay = { t: 'iou' }; render(true);
  }
  const guard = () => { ui.guard = Date.now() + 700; }, guarded = () => Date.now() < (ui.guard || 0);
  function lock() { if (guarded()) return; const part = partOf(); players[pid]['l' + part] = true; ui.overlay = null; DB.update(BASE + '/players/' + pid, { ['l' + part]: true }); buzz(60); SFX.stamp();
    const q1 = me().q1 || {}, q2 = part === 2 ? (me().q2 || {}) : {}, ctrls = ['PE', 'LP', 'GC', 'LPE'].filter(k => (q1[k] || q2[k]) > 0);
    if (!(q1.RT > 0) && ctrls.length) { ui.flash = { ks: ctrls }; clearTimeout(ui.flashT); ui.flashT = setTimeout(() => { ui.flash = null; render(true); }, 6000); }
    render(true); }
  function flashHTML() {
    if (!ui.flash) return '';
    return `<div class="flash9" id="flash9"><div class="fk">⚠️ EU AI ACT · ARTICLE 9</div><div class="fh">Your controls were never tested</div>
      <div class="ft">No Red team in your hand. Against attacks a red team would have caught, your <b>${ui.flash.ks.map(k => G.CARD[k][1] + ' ' + G.CARD[k][2]).join(', ')}</b> will only work at <b>75%</b>.</div><div class="fx">Tap to close</div></div>`;
  }

  function vJoin() {
    const taken = names;
    return table(`<div class="logo"><small>AGENT TYCOON</small><em>Gamma</em></div><div class="tag">You run <b>Nova</b>, NBD Bank’s new AI agent.<br>Grow revenue. Don’t get burned.</div>
      <div class="lab">TYPE YOUR NAME</div><input id="nmin" class="nmin" maxlength="16" autocomplete="off" autocapitalize="words" enterkeyhint="go" placeholder="e.g. Priya or Team Ops" value="${esc(ui.typed || '')}">
      <div class="lab">OR PICK A CODENAME</div><div class="names">${NAMES.map(([n, e]) => `<button class="name ${!ui.typed && ui.pick === n ? 'sel' : ''} ${taken[keyOf(n)] && taken[keyOf(n)] !== pid ? 'tk' : ''}" data-name="${n}">${e} ${n}</button>`).join('')}</div>
      <div class="note" style="margin-bottom:12px">Faded names are taken. No PIN: this phone remembers you.</div>
      <button class="btn" id="joinb" ${ui.pick ? '' : 'disabled'}>${ui.pick ? 'I’m ' + esc(ui.pick) : 'Type or pick a name'}</button>`);
  }
  function vClosed(msg) { return table(`<div class="logo"><small>AGENT TYCOON</small><em>Gamma</em></div><div class="mid"><div class="ls">${msg}</div></div>`); }
  const topBar = (r) => `<div class="top"><span class="pill">${EMO[me().name] || '🙂'} ${esc(me().name)}</span><span class="pill g">${r}</span></div>`;
  function chipBar(d) {
    const f = Math.max(0, Math.min(10, Math.round(d.leftC / d.chips * 10)));
    return `<div class="bar"><div class="stack">${Array.from({ length: 10 }, (_, i) => `<i class="${i < f ? '' : 'u'}"></i>`).join('')}</div>
      <div class="tot"><b>${d.leftC}</b><span> of ${d.chips} chips</span><small>spent ${d.sp}</small></div><button class="bank" id="borrow">+10<small>BORROW</small></button></div>`;
  }
  function handHTML(q, listP, label) {
    const ks = []; listP.forEach(c => { for (let i = 0; i < (q[c[0]] || 0); i++) ks.push(c[0]); });
    if (!ks.length) return `<div class="hand"><div class="hl">${label}</div><div class="empty">Tap a pile to deal a card into your hand</div></div>`;
    const W = Math.min(window.innerWidth, 480) - 44, cw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hw')) || 60;
    const n = ks.length, sp = Math.min(34, (W - cw - 10) / Math.max(1, n - 1)), rot = Math.min(7, 44 / n);
    let popped = false;
    return `<div class="hand"><div class="hl">${label} · ${n} CARD${n > 1 ? 'S' : ''}</div>` + ks.map((k, i) => {
      const pop = !popped && ui.pop === k && (i === n - 1 || ks[i + 1] !== k); if (pop) popped = true;
      return `<div data-hand="${k}" style="position:absolute;inset:0;pointer-events:none">${cardHTML(k, pop ? 'pop' : '', `left:${W / 2 + (i - (n - 1) / 2) * sp - cw / 2}px;transform:rotate(${(i - (n - 1) / 2) * rot}deg);transform-origin:50% 170%;z-index:${i};pointer-events:auto`)}</div>`; }).join('') + '</div>';
  }
  function vShop() {
    const d = shopData();
    const ws = wildState(d);
    const piles = d.listP.map(c => { const k = c[0], left = c[6] - (d.q[k] || 0), wl = k === 'IND' && !d.q[k] && ws !== 'open';
      return `<div class="pile ${left <= 0 ? 'empty' : ''} ${k === 'IND' ? 'wp' : ''} ${wl ? (ws === 'used' ? 'wused' : 'wlock') : ''} ${k === 'IND' && ws === 'open' && !d.q[k] ? 'wopen' : ''}" data-pile="${k}" ${wl ? `data-wl="${ws}"` : ''}>${Array.from({ length: Math.max(0, left - 1) }, (_, i) => `<div class="back" style="top:${i * 4}px"></div>`).join('')}${cardHTML(k, '', `top:${Math.max(0, left - 1) * 4}px`)}${d.q[k] ? `<div class="cnt">×${d.q[k]}</div>` : ''}<button class="fb ${ui.flipped ? '' : 'hint'}" data-flip="${k}" style="top:calc(${Math.max(0, left - 1) * 4}px + var(--ch) - 21px)" aria-label="Flip card">↻</button></div>`; }).join('');
    const t = left();
    return table(`${topBar('PART ' + d.part + (t != null ? ' · <span class="cdi">' + fmtT(t) + '</span>' : ''))}${newsBanner()}${chipBar(d)}
      <div class="lab">${d.part === 1 ? '♦ REVENUE · ♠ CONTROLS · ★ WILD' : '♦ REVENUE · ♠ CONTROLS · ♣ FIXES · ★ WILD'}</div>${ui.flipped ? '' : '<div class="coach">👆 Tap a card to buy it · tap <b>↻</b> to flip it and see what it does</div>'}<div class="tab">${piles}</div>
      ${handHTML(d.q, d.listP, 'YOUR HAND')}<button class="btn" id="lockb">Lock my hand</button>`);
  }
  function newsBanner() {
    const part = shopPart(), rel = released(part); if (!rel.length) return '';
    const i = Math.min(ui.newsI || 0, rel.length - 1), n = rel[i], h = G.NEWS[n.id];
    return `<div class="nbar" id="nbar"><div class="r1"><span class="dot"></span>BREAKING NEWS<em>PART ${part}</em></div><div class="t">${esc(h[0])}</div></div>`;
  }
  function newsTakeHTML() {
    const tk = ui.newsTake; if (!tk) return ''; const n = ((state.news || {})[tk.part] || [])[tk.i]; if (!n) return ''; const h = G.NEWS[n.id];
    const tm = new Date(n.at), hh = String(tm.getHours()).padStart(2, '0') + ':' + String(tm.getMinutes()).padStart(2, '0');
    return `<div class="nwov"><div class="nwbar"><div class="dot"></div><b>BREAKING</b><span>${hh}</span></div><div class="nwm"><span>BREAKING NEWS</span><i>The Daily Ledger</i><span>PART ${tk.part}</span></div>
      <div class="nwbody"><div class="nwh">${esc(h[0])}</div><div class="nwd">${esc(h[1])}</div><div class="nwq">Is this a real warning… or just noise? Only you can decide.</div></div>
      <div class="nwf"><button id="nwok">Back to the shop</button><small>THE HEADLINE STAYS PINNED AT THE TOP</small></div></div>`;
  }
  function wbHTML() {
    if (!wbLive()) return '';
    return `<div class="wbov"><div class="wbk">🤫 PRIVATE · ONLY YOU CAN SEE THIS</div><div class="wbh">You’ve found something.</div>
      <div class="wbt">Going through Nova’s logs, you discover it quietly approved <b>40 payments</b> it should never have made. Nobody else knows… yet.</div>
      <div class="wbc"><button class="wbb rep" id="wbrep"><b>📣 Report it</b><span>Tell compliance now. +10 points and a ⭐ Speak-up badge.</span></button>
      <button class="wbb hid" id="wbhid"><b>🙈 Hide it</b><span>Say nothing. 50% chance it never comes out… 50% chance it leaks on Day 6: −60.</span></button></div>
      <div class="wbn">Your choice will be revealed to the room, with your name, at the CFO review.</div></div>`;
  }
  function vLocked(closed) {
    const part = partOf(), L = list(), n = L.filter(p => p['l' + part]).length, t = left();
    const d = me()['q' + part] || {}, listP = part === 1 ? G.P1 : G.P2;
    return table(`${topBar(closed ? 'SHOP CLOSED' : 'PART ' + part)}${newsBanner()}<div class="mid"><div class="lk">🔒</div><div class="lt">Hand locked</div>
      <div class="ls">${closed ? 'Eyes on the screen.<br>Nova goes live…' : 'Eyes on the screen.<br>The shop closes in'}</div>${!closed && t != null ? `<div class="cd cdi">${fmtT(t)}</div>` : '<div style="height:18px"></div>'}
      <div class="ls"><span id="lockn">${n}</span> of ${L.length} players locked</div><div class="prog"><i style="width:${L.length ? 100 * n / L.length : 0}%"></i></div>${closed ? '' : '<button class="btn ghost unl" id="unlockb">✏️ Change my hand</button>'}</div>${handHTML(d, listP, 'YOUR HAND')}`);
  }
  function incRow(id, r, q1, q2, delay) {
    const [, e, name, , , ctrl] = G.INC[id]; const h = r.hits.find(x => x.id === id);
    if (!h) return `<div class="inc down" style="animation-delay:${delay}s"><div class="it"><span class="ie">${e}</span>${esc(name)}</div><div class="id">Not tonight. This one didn’t happen.</div></div>`;
    const lvl = h.v <= 0 ? 2 : h.lvl;
    const mine = []; const add = (k, n) => { for (let i = 0; i < Math.min(n || 0, 2); i++) mine.push(k); };
    const c = G.CTRL[id]; if (c) add(c, (q1[c] !== undefined ? q1[c] : q2[c]));
    if (id === 'S_EMAIL') { add('PE', q1.PE); add('LPE', q2.LPE); } if (id === 'S_AUDIT') { add('AU', q1.AU); add('GO', q1.GO ? 1 : 0); add('LGO', q2.LGO); add('LAU', q2.LAU); }
    if (h.ind) mine.unshift('IND');
    const cls = h.v <= 0 ? 'safe' : lvl >= 1 ? 'half' : 'hit';
    const txt = h.ind ? `📜 Your Indemnity policy paid this one (−${h.raw} covered). <b>Trust damage still counts</b>`
      : h.v <= 0 ? `Your cards stopped it. <b>Blocked</b>`
      : h.untested ? `Your ${lvl >= 2 ? 'cards' : 'card'} only worked at 75%: never tested (no Red team · AI Act Art. 9). <b>−${h.v}</b>`
      : lvl === 1 ? `Your card caught part of it. Halved: <b>−${h.v}</b>` : `Nothing stopped it (${esc(ctrl)}). Full hit: <b>−${h.v}</b>`;
    return `<div class="inc ${cls}" style="animation-delay:${delay}s"><div class="it"><span class="ie">${e}</span>${esc(name)}</div><div class="id">${txt}</div>${actTag(id)}${(() => { const x = exposure(id); return `<div class="room">Room: <b class="r">💥 ${x.ex} hit</b> · <b class="a">½ ${x.hf} halved</b> · <b class="g">🛡️ ${x.bl} blocked</b></div>`; })()}${mine.length ? `<div class="mc">${mine.slice(0, 3).map(k => cardHTML(k)).join('')}</div>` : ''}</div>`;
  }
  function rankOf(key, filt) { const L = list().filter(filt || (() => true)).map(p => [p.id, scoreOf(p)[key]]).sort((a, b) => b[1] - a[1]); return [L.findIndex(x => x[0] === pid) + 1, L.length]; }
  function miniBoard(key, title, cfoMode) {
    const all = list().map(p => ({ p, r: scoreOf(p) })).sort((a, b) => b.r[key] - a.r[key]);
    const rows = cfoMode ? all.filter(x => !x.r.dq).concat(all.filter(x => x.r.dq)) : all;
    const mine = rows.findIndex(x => x.p.id === pid), show = rows.slice(0, 5);
    if (mine >= 5) show.push(null, rows[mine]);
    const med = ['🥇', '🥈', '🥉'];
    const tr = (x, i) => { if (!x) return '<div class="mbr gap">⋯</div>'; const idx = rows.indexOf(x), dq = cfoMode && x.r.dq;
      return `<div class="mbr ${x.p.id === pid ? 'me' : ''} ${dq ? 'dq' : ''}"><span class="rk">${dq ? '❌' : (idx < 3 ? med[idx] : idx + 1)}</span><span class="nmb">${EMO[x.p.name] || ''} ${esc(x.p.name)}${x.p.id === pid ? ' · you' : ''}</span><b>${x.r[key]}</b></div>`; };
    return `<div class="mb"><div class="mbh">${title}</div>${show.map(tr).join('')}</div>`;
  }
  function cfoBoard() {
    const all = list().map(p => ({ p, r: scoreOf(p) })).sort((a, b) => b.r.fin - a.r.fin), ok = all.filter(x => !x.r.dq), dq = all.filter(x => x.r.dq);
    const med = ['🥇', '🥈', '🥉'], me_ = x => x.p.id === pid ? ' me' : '', nm = x => `${EMO[x.p.name] || ''} ${esc(x.p.name)}${x.p.id === pid ? ' · you' : ''}`;
    const pod = ok.slice(0, 3).map((x, i) => `<div class="pp${me_(x)}"><div class="m">${med[i]}</div><div class="n">${nm(x)}</div><div class="v">${x.r.fin}</div><div class="s">spent ${x.r.total}</div></div>`).join('');
    const mi = ok.findIndex(x => x.p.id === pid), rest = ok.slice(3, 8).map((x, i) => [x, i + 4]);
    if (mi >= 8) rest.push(null, [ok[mi], mi + 1]);
    const rows = rest.map(e => !e ? '<div class="mbr gap">⋯</div>' : `<div class="mbr${me_(e[0])}"><span class="rk">${e[1]}</span><span class="nmb">${nm(e[0])}</span><b>${e[0].r.fin}</b></div>`).join('');
    const dqi = dq.findIndex(x => x.p.id === pid), dshow = dq.slice(0, 6); if (dqi >= 6) dshow.push(dq[dqi]);
    const drows = dshow.map(x => `<div class="mbr dq2${me_(x)}"><span class="rk">❌</span><span class="nmb">${nm(x)}</span><small>spent ${x.r.total}</small><b>${x.r.fin}</b></div>`).join('');
    return `${wbReveal()}<div class="mb"><div class="mbh">OFFICIAL LEADERBOARD · AFTER CFO REVIEW</div>${ok.length ? `<div class="pod3">${pod}</div>` : ''}${rows}</div>
      ${dq.length ? `<div class="mb dqb"><div class="mbh">DISQUALIFIED BY THE CFO · ${dq.length} PLAYER${dq.length > 1 ? 'S' : ''}</div>${drows}${dq.length > dshow.length ? `<div class="mbr gap">+ ${dq.length - dshow.length} more</div>` : ''}
      <div class="dqn">Top raw score: <b>${esc(dq[0].p.name)} ${dq[0].r.fin}</b>, spent ${dq[0].r.total} of ${G.TOTAL}. No budget, no bonus.</div></div>` : ''}`;
  }
  function wbReveal(big) {
    const w = state.wb; if (!w || !players[w.pid]) return ''; const n = players[w.pid].name, c = w.choice || 'hide';
    const what = c === 'report' ? `chose to <b class="g">REPORT IT</b> ⭐` : (w.choice ? `chose to <b class="r">HIDE IT</b>` : `said nothing, so it stayed <b class="r">HIDDEN</b>`) + (w.leak ? ' … and it leaked 📰' : ' … and it never leaked');
    return `<div class="wbrev ${big ? 'big' : ''}"><div class="k">🤫 THE WHISTLEBLOWER</div><div class="v"><b>${EMO[n]} ${esc(n)}</b> found 40 bad payments in Part 2 and ${what}</div></div>`;
  }
  function vReveal(day) {
    const m = me(), r = scoreOf(m), q1 = m.q1 || {}, q2 = m.q2 || {};
    const ids = day === 1 ? ['JB', 'RUN', 'BIG', 'LEAK'] : ['S_EMAIL', 'S_AUDIT', 'FAIR', 'INV', 'DRIFT', 'DEEP'];
    const key = 'rev' + day, anim = !ui.seen[key] && ph() !== 'cfo'; ui.seen[key] = true;
    const order = ids.slice().sort((a, b) => (r.hits.some(h => h.id === b) ? 1 : 0) - (r.hits.some(h => h.id === a) ? 1 : 0));
    const INTRO = anim ? 3.4 : 0, STEP = 1.1, at0 = i => INTRO + 0.2 + i * STEP;
    const rows = order.map((id, i) => incRow(id, r, q1, q2, anim ? at0(i) : 0)).join('');
    const sd = anim ? at0(ids.length) + 0.2 : 0, score = day === 1 ? r.mid : r.fin;
    if (anim) {
      const fx = [{ t: 0, f: 'intro', day }];
      order.forEach((id, i) => { const h = r.hits.find(x => x.id === id); const f = !h ? 'none' : h.v <= 0 ? 'safe' : h.lvl >= 1 ? 'half' : 'hit';
        fx.push({ t: at0(i), f }); });
      fx.push({ t: sd, f: 'score', v: score }); ui.fx = fx;
    }
    const intro = anim ? `<div class="intro" style="animation-delay:${INTRO - 0.4}s"><div class="ik">${day === 1 ? 'DAY 1 · HOUR 6' : 'DAY 6'}</div><div class="iq">${day === 1 ? 'Nova goes live…' : 'Something wakes up…'}</div><div class="icd"><span>3</span><span>2</span><span>1</span></div></div><div class="flash"></div>` : '';
    if (day === 1) {
      const [rk, of] = rankOf('mid');
      return table(`${topBar('DAY 1 · HOUR 6')}<div class="scroll"><div class="h2">Nova’s first night</div><div class="incs ${anim ? 'anim' : ''}">${rows}</div>${intro}
        <div class="anim2" style="animation-delay:${sd}s"><div class="sc" style="margin-top:16px"><div class="scl">YOUR HOUR 6 SCORE</div><div class="scv" data-count="${r.mid}">${anim ? 0 : r.mid}</div><div class="scr">Rank ${rk} of ${of}</div></div>
        <div class="calc"><div><span>Revenue</span><b>${r.rev1}</b></div><div><span>Incident hits</span><b class="r">−${r.pen1}</b></div>${r.bust1 ? `<div><span>Over budget</span><b class="r">−${r.bust1}</b></div>` : ''}<div><span>Named owner</span><b>×${r.gov1}</b></div><div><span>Trust damage</span><b>÷${r.trust1}</b></div></div>
        ${miniBoard('mid', 'HOUR 6 LEADERBOARD')}<div class="tease">😴 Something from Day 1 is still asleep…</div></div></div>`);
    }
    if (ph() === 'cfo' && !ui.seen.cfo) { ui.seen.cfo = true; ui.call = { stage: 'ring' }; }
    const fin = ph() === 'cfo', [rk, of] = fin ? rankOf('fin', p => !scoreOf(p).dq) : rankOf('fin');
    const wbx = wbOf(m), wbRow = wbx ? (wbx.choice === 'report' ? `<div class="inc safe wbrow"><div class="it"><span class="ie">⭐</span>You spoke up</div><div class="id">You reported Nova’s 40 bad payments. <b>+10 · Speak-up badge</b></div></div>`
      : wbx.leak ? `<div class="inc hit wbrow"><div class="it"><span class="ie">📰</span>Cover-up exposed</div><div class="id">The 40 bad payments you hid just leaked to the press. <b>−60</b></div></div>`
      : `<div class="inc half wbrow"><div class="it"><span class="ie">🙈</span>Your secret held… for now</div><div class="id">The 40 bad payments you hid didn’t leak. <b>No points lost</b></div></div>`) : '';
    const ap = !!m.ap;
    const breaches = fin ? `<div class="acts"><div class="ah">⚖️ EU AI ACT · YOU BREACHED <b>${r.arts.length}</b> ARTICLE${r.arts.length === 1 ? '' : 'S'}</div>${r.arts.length ? `<div class="al">${r.arts.map(a => `<span>Art. ${a}</span>`).join('')}</div>
      <div class="pen"><b>Probable penalty</b>Up to €15 million or 3% of global turnover, whichever is higher</div>
      <div class="todo"><div class="${ap ? 'dn' : ''}">${ap ? '✅' : '⏳'} Action plan to the CFO · <b>${ap ? 'submitted' : 'due today'}</b></div><div>📄 Conformity assessment + technical documentation · <b>due in 7 days</b></div></div>
      ${ap ? '' : '<button class="btn apb" id="apb">📝 Submit my action plan</button>'}` : '<div class="al ok">Clean record. Nothing got through. No penalty.</div>'}</div>` : '';
    const verdict = fin ? (r.dq ? `<div class="verdict bad vstamp"><b>❌ Disqualified by the CFO</b>You spent ${r.total} against an annual AI budget of ${G.TOTAL}. IOUs count.</div>`
      : `<div class="verdict ok vstamp"><b>✓ CFO review: on budget</b>Spent ${r.total} of ${G.TOTAL}.</div>`) : '';
    return table(`${topBar(fin ? 'CFO REVIEW' : 'DAY 6 · FINAL')}<div class="scroll"><div class="h2">The sleepers wake up</div><div class="incs ${anim ? 'anim' : ''}">${rows}${wbRow}</div>${intro}
      <div class="anim2" style="animation-delay:${sd}s"><div class="sc" style="margin-top:16px"><div class="scl">FINAL SCORE</div><div class="scv" data-count="${r.fin}">${anim ? 0 : r.fin}</div><div class="scr">${fin && r.dq ? 'Not ranked' : `Rank ${rk} of ${of}${fin ? ' on budget' : ''}`}</div></div>
      <div class="calc"><div><span>Revenue</span><b>${r.rev}</b></div><div><span>Incident hits</span><b class="r">−${r.pen}</b></div>${r.bust ? `<div><span>Over budget</span><b class="r">−${r.bust}</b></div>` : ''}<div><span>Owner</span><b>×${r.gov}</b></div><div><span>AI literacy</span><b class="gtxt">+${r.lit}</b></div><div><span>Trust damage (${r.n} hits)</span><b>÷${r.trust}</b></div>${r.wb ? `<div><span>${r.wb > 0 ? '⭐ Spoke up' : '📰 Cover-up'}</span><b class="${r.wb > 0 ? 'gtxt' : 'r'}">${r.wb > 0 ? '+' : ''}${r.wb}</b></div>` : ''}</div>
      ${verdict}${breaches}${fin ? '<button class="btn anb" id="anb">📊 See my analysis</button>' : ''}${fin ? cfoBoard() : miniBoard('fin', 'LEADERBOARD · BEFORE CFO REVIEW')}${fin ? '' : '<div class="tease">Wait for the CFO…</div>'}</div></div>`);
  }
  /* ---------- end-of-game analysis: how the score was made, what each card did ---------- */
  function analysisHTML() {
    const m = me(), on = fired(), wb = wbOf(m), has = has2(m);
    const base = { q1: m.q1 || {}, q2: m.q2 || {}, has2: has, wb };
    const r = G.score(base, on, true), s1 = r.s1, s2 = r.s2;
    const q1 = G.full(m.q1, G.P1), q2 = G.full(m.q2, G.P2), ncards = Object.values(q1).reduce((a, b) => a + b, 0) + Object.values(q2).reduce((a, b) => a + b, 0);
    const without = k => { const a = Object.assign({}, m.q1 || {}), b = Object.assign({}, m.q2 || {}); if (k in a) a[k] = 0; if (k in b) b[k] = 0;
      return G.score({ q1: a, q2: b, has2: has, wb, s1, s2, cards: ncards }, on, true).fin; };
    const nm = id => G.INC[id][1] + ' ' + G.INC[id][2], hit = id => r.hits.find(h => h.id === id);
    const covers = k => { const ids = Object.keys(G.CTRL).filter(id => G.CTRL[id] === k);
      if (k === 'PE' || k === 'LPE') ids.push('S_EMAIL'); if (['AU', 'GO', 'LGO', 'LAU'].includes(k)) ids.push('S_AUDIT'); return ids; };
    const P = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
    // what each card did
    const owned = G.P1.filter(c => (m.q1 || {})[c[0]] > 0).concat(has ? G.P2.filter(c => (m.q2 || {})[c[0]] > 0) : []);
    const seen = {}; const rows = [];
    owned.forEach(c => { const k = c[0]; if (seen[k]) return; seen[k] = 1; const n = ((m.q1 || {})[k] || 0) + (has ? ((m.q2 || {})[k] || 0) : 0), worth = r.fin - without(k);
      const lines = [];
      if (k === 'PAY') { const pre = Math.round(r.hits.reduce((a, h) => a + (h.ind ? 0 : h.v), 0) / (1 + 0.25 * n));
        lines.push(`+${30 * n} revenue`, `but every hit on you was ${25 * n}% bigger`,
          `Payments is a bet on your protection: it pays off only if your hits stay under about 120`,
          worth > 0 ? `It paid off for you: your hits were only ${pre} before Payments` : worth < 0 ? `It cost you: your hits were ${pre} before Payments, so the extra damage beat the extra money` : `It broke even: your hits were ${pre} before Payments`); }
      else if (k === 'MKT') lines.push(`+${15 * n} revenue`);
      else if (k === 'LOAN') lines.push(`+${30 * n} revenue`, on.includes('FAIR') ? 'and made the fairness fine bigger' : 'the fairness fine it risks never came');
      else if (k === 'GO') lines.push(r.neg ? 'Boost skipped: money minus damage was below zero' : 'Whole score ×1.5');
      else if (k === 'LGO') lines.push(q1.GO ? 'No extra multiplier: your Named owner already gave ×1.5' : r.neg ? 'Boost skipped: money minus damage was below zero' : 'Whole score ×1.25');
      else if (k === 'VM') lines.push(r.neg ? 'Trust damage was skipped (score below zero), so nothing to cut' : `Cut trust damage by ${n >= 2 ? 65 : 50}%`);
      else if (k === 'LRM') lines.push(r.neg ? 'Trust damage was skipped (score below zero), so nothing to cut' : 'Cut trust damage by 25%');
      else if (k === 'SA') lines.push('Made every Day 6 hit 25% smaller');
      else if (k === 'LT') lines.push(`+${r.lit} literacy points (1 per card you own)`);
      else if (k === 'IND') { const h = r.hits.find(x => x.ind); lines.push(h ? `Paid your biggest hit: ${nm(h.id)} (${h.raw})` : 'Nothing big enough got through to claim'); }
      if (k === 'HU') lines.push(`−${5 * n} revenue (humans are slower)`);
      if (k === 'RT' && G.RTS.some(id => on.includes(id) && G.shield(id, q1, q2) > 0)) lines.push('Tested your other controls, so they worked at 100%');
      covers(k).forEach(id => { if (!on.includes(id)) { lines.push(`${nm(id)} never came`); return; }
        const h = hit(id); lines.push((h && h.raw === 0 ? `Blocked ${nm(id)}` : `Reduced ${nm(id)} to −${h ? h.raw : 0}`) + (h && h.ind ? ', but your Indemnity policy paid that one anyway' : '')); });
      const wasted = c[7].slice(0, n).filter(t => /^No extra effect/.test(t)).length; if (wasted) lines.push(`${wasted} extra cop${wasted > 1 ? 'ies' : 'y'} had no extra effect`);
      if (worth === 0 && covers(k).some(id => on.includes(id) && hit(id) && hit(id).raw === 0)) lines.push('your other cards already had it covered');
      rows.push({ k, n, worth, lines, cost: c[4] * n }); });
    rows.sort((a, b) => b.worth - a.worth);
    const card = x => { const c = G.CARD[x.k], cls = x.worth > 0 ? 'up' : x.worth < 0 ? 'dn' : 'zero';
      return `<div class="anr ${cls}"><div class="ant"><span>${c[1]} ${esc(c[2])}${x.n > 1 ? ' ×' + x.n : ''}<i>${x.cost} chips</i></span><b>${x.worth === 0 ? 'did nothing' : P(x.worth) + ' pts'}</b></div><div class="anl">${x.lines.map(esc).join(' · ')}</div></div>`; };
    // attacks that got through with nothing in the way
    const gaps = r.hits.filter(h => h.raw > 0 && h.lvl === 0).map(h => { const ctrl = h.id === 'S_EMAIL' ? 'PE' : h.id === 'S_AUDIT' ? 'AU' : G.CTRL[h.id];
      return `<div class="anr dn"><div class="ant"><span>${nm(h.id)}</span><b>−${h.raw}</b></div><div class="anl">Nothing stopped it. One ${G.CARD[ctrl][1]} ${esc(G.CARD[ctrl][2])} card (${G.CARD[ctrl][4]} chips) would have halved it.</div></div>`; }).join('');
    const unspent = Math.max(0, 100 + (m.b1 || 0) - s1) + (has ? Math.max(0, 80 + (m.b2 || 0) - s2) : 0);
    // the score: equation first, then each number explained in words
    const f1 = x => { const v = Math.round(x * 10) / 10; return (v < 0 ? '−' : '') + Math.abs(v); };
    const cn = k => G.CARD[k][1] + ' ' + G.CARD[k][2];
    const protBy = id => { const ks = id === 'S_EMAIL' ? ['PE', 'LPE'] : id === 'S_AUDIT' ? ['AU', 'GO', 'LGO', 'LAU'] : [G.CTRL[id]];
      return ks.filter(k => (q1[k] || 0) + (has ? (q2[k] || 0) : 0) > 0).map(cn).join(' + '); };
    const chain = h => { const inc = G.INC[h.id]; let v = inc[4]; const st = [`starts at <b>${v}</b>`];
      if (h.lvl >= 2) st.push(`blocked by ${esc(protBy(h.id))} → <b>0</b>`);
      else { if (h.lvl === 1) { const w = G.weak(h.id, q1); v = v * (w ? 0.625 : 0.5);
          st.push(w ? `${esc(protBy(h.id))} cut it, but only by 37.5% because you had no Red team → <b>${f1(v)}</b>` : `${esc(protBy(h.id))} halved it → <b>${f1(v)}</b>`); }
        else st.push('nothing stopped it');
        if (q1.PAY) { v *= 1 + 0.25 * q1.PAY; st.push(`Payments made it ${25 * q1.PAY}% bigger → <b>${f1(v)}</b>`); }
        if (h.id === 'FAIR' && q2.LOAN) { v *= 1 + 0.5 * q2.LOAN; st.push(`Loans made it ${50 * q2.LOAN}% bigger → <b>${f1(v)}</b>`); }
        if (h.part === 2 && has && q2.SA) { v *= 0.75; st.push(`Seeded test made it 25% smaller → <b>${f1(v)}</b>`); }
        if (h.ind) st.push(`your Indemnity policy paid it → <b>0</b>`); }
      return `<div class="vrow"><span>${nm(h.id)}</span><b>${h.v ? '−' + h.v : '0'}</b></div><div class="vchain">${st.join(' → ')}</div>`; };
    const keep = Math.round(100 / r.trust), rp = Math.round((1 - (r.trust - 1) / (0.2 * Math.max(1, r.n))) * 100);
    const rev1d = [`50 to start`].concat(q1.PAY ? [`+ ${30 * q1.PAY} Payments`] : [], q1.MKT ? [`+ ${15 * q1.MKT} Marketing`] : [], q1.HU ? [`− ${5 * q1.HU} Human check`] : []).join(' ');
    const rev2d = has ? [`50 to start`].concat(q2.LOAN ? [`+ ${30 * q2.LOAN} Loans`] : []).join(' ') : '';
    const V = (cls, ico, name, val, body) => `<div class="vbox ${cls}"><div class="vhd"><span>${ico} ${name}</span><b>${val}</b></div>${body}</div>`;
    const boxes =
      V('c1', '💰', 'Money you made', r.rev, `<p>Every company starts with 50 in each part. Some cards add money, some take a little away.</p>
        <div class="vrow"><span>Part 1: ${rev1d}</span><b>${r.rev1}</b></div>${has ? `<div class="vrow"><span>Part 2: ${rev2d}</span><b>${r.rev - r.rev1}</b></div>` : '<p>You didn’t play Part 2, so no money from it.</p>'}`)
      + V('c2', '💥', 'Damage from attacks', '−' + r.pen, `<p>${on.length} attacks happened. Each one starts with a damage number. Your cards make it smaller, Payments make it bigger.</p>${r.hits.map(chain).join('')}`)
      + V('c3', '🚫', 'Overspend fine', r.bust ? '−' + r.bust : '0', r.bust ? `<p>You spent more than the budget${r.bust1 ? ' in Part 1 (limit 100)' : ''}${r.bust - (r.bust1 || 0) ? ' in Part 2 (limit 80)' : ''}, counting IOUs. Going over costs a flat 50.</p>` : '<p>You stayed within budget, so no fine.</p>')
      + (r.neg ? V('c4', '📋', 'Owner boost', 'skipped', `<p>${r.govSet > 1 ? `You bought an owner card, but money minus damage was <b>below zero</b>.` : 'Nobody owned the AI, and money minus damage was below zero anyway.'} A boost only multiplies a positive score, so it was skipped.</p>`) : '')
      + (r.neg ? '' : V('c4', '📋', 'Owner boost', '×' + r.gov, r.gov === 1.5 ? '<p>You bought a <b>Named owner</b>, so someone is accountable for the AI. Your total is multiplied by 1.5 (one and a half times).</p>'
          : r.gov === 1.25 ? '<p>You bought a <b>Late owner</b> in Part 2. Your total is multiplied by 1.25.</p>' : '<p>Nobody owned the AI, so no boost (×1 means it stays the same).</p>'))
      + (q2.LT && has ? V('c5', '🎓', 'Literacy bonus', '+' + r.lit, `<p>Your AI literacy card gives ${q2.LT} point${q2.LT > 1 ? 's' : ''} for every card you own. You own ${ncards} cards → <b>${r.lit}</b>.</p>`) : '')
      + (r.neg ? V('c6', '🤝', 'Trust damage', 'skipped', `<div class="hearts">${'💔'.repeat(r.n)}<span>${r.n} attack${r.n > 1 ? 's' : ''} got through</span></div><p>Trust damage takes away a <b>share</b> of a positive score. Your money minus damage was already below zero, so there was nothing left to take a share of. It was skipped.</p>`) : '')
      + (r.neg ? '' : (() => { const t3b = (r.rev - r.pen - r.bust) * r.gov + r.lit, aft = Math.round(t3b / r.trust), lost = Math.round((1 - 1 / r.trust) * 100),
          noRep = Math.round((1 - 1 / (1 + 0.2 * r.n)) * 100), fr = x => ({ 50: 'half', 33: 'a third', 25: 'a quarter', 67: 'two thirds' })[x],
          pc = x => x + '%' + (fr(x) ? ` (${fr(x)})` : ''), reps = [q1.VM ? 'Vuln. mgmt' : '', q2.LRM && has ? 'Late remediation' : ''].filter(Boolean).join(' + ');
        const body = !r.n ? '<p>No attacks got through, so customers still trust you. You keep your whole score.</p>'
          : `<p>When attacks get through, customers stop trusting you and some walk away. So you lose a <b>share</b> of your score, not a fixed number.</p>
          <div class="hearts">${'💔'.repeat(r.n)}<span>${r.n} attack${r.n > 1 ? 's' : ''} got through</span></div>
          <div class="vrow"><span>With no repair cards you would lose</span><b>${pc(noRep)}</b></div>
          <div class="vrow"><span>${reps ? `Your ${reps} repaired some of it, so you lose` : 'You had no repair cards, so you lose'}</span><b>${pc(lost)}</b></div>
          ${t3b > 0 ? `<div class="kbar2"><i style="width:${100 - lost}%">Kept ${aft}</i><u>Lost ${Math.round(t3b - aft)}</u></div>
          <div class="vrow"><span>Score before trust damage</span><b>${f1(t3b)}</b></div><div class="vrow"><span>Score after</span><b>${aft}</b></div>`
          : `<div class="vrow"><span>Score before trust damage</span><b>${f1(t3b)}</b></div><div class="vrow"><span>Score after</span><b>${aft}</b></div>
          <p>Your score was already below zero, so taking a share away made the minus smaller.</p>`}`;
        return V('c6', '🤝', 'Trust damage', r.n && t3b > 0 ? `−${Math.round(t3b - aft)} <small>(÷${r.trust})</small>` : '÷' + r.trust, body); })())
      + (r.wb ? V('c7', '📣', 'Whistleblower', P(r.wb), r.wb > 0 ? '<p>You reported the problem. Honesty bonus +10.</p>' : '<p>You hid the problem and it leaked. −60.</p>') : '');
    const t1 = r.rev - r.pen - r.bust, t2 = t1 * r.gov, t3 = t2 + r.lit;
    const lad = (l, v, x) => `<div class="lad${x ? ' skip' : ''}"><span>${l}</span><b>${v}</b></div>`;
    const ladder = lad(`💰 ${r.rev} − 💥 ${r.pen}${r.bust ? ' − 🚫 ' + r.bust : ''}`, f1(t1))
      + (r.neg ? lad('× 📋 Owner boost: skipped (below zero)', f1(t1), 1) : lad(`× 📋 ${r.gov}`, f1(t2)))
      + (r.lit ? lad(`+ 🎓 ${r.lit}`, f1(r.neg ? t1 + r.lit : t3)) : '')
      + (r.neg ? lad('÷ 🤝 Trust damage: skipped (below zero)', f1(t1 + r.lit), 1) : lad(`÷ 🤝 ${r.trust}`, Math.round(t3 / r.trust)))
      + (r.wb ? lad(`${r.wb > 0 ? '+' : '−'} 📣 ${Math.abs(r.wb)}`, r.fin) : '');
    const eq = `<div class="eqs">Your score = what you <i class="c1">💰 earned</i>, minus <i class="c2">💥 attack damage</i> and any <i class="c3">🚫 overspend fine</i> → multiply by your <i class="c4">📋 owner boost</i> → add your <i class="c5">🎓 literacy bonus</i> → then <i class="c6">🤝 trust damage</i> takes a share away${r.wb ? ' → plus or minus the <i class="c7">📣 whistleblower</i> result' : ''}.</div>
      <div class="eqs2">If money minus damage is already below zero, the owner boost and trust damage are skipped.</div>
      <div class="eqn">${r.neg ? `( <i class="c1">${r.rev}</i> − <i class="c2">${r.pen}</i> − <i class="c3">${r.bust}</i> ) + <i class="c5">${r.lit}</i>`
        : `[ ( <i class="c1">${r.rev}</i> − <i class="c2">${r.pen}</i> − <i class="c3">${r.bust}</i> ) × <i class="c4">${r.gov}</i> + <i class="c5">${r.lit}</i> ] ÷ <i class="c6">${r.trust}</i>`}${r.wb ? ` ${r.wb > 0 ? '+' : '−'} <i class="c7">${Math.abs(r.wb)}</i>` : ''} = <b>${r.fin}</b></div>`;
    return `<div class="anov"><div class="anh"><div><small>YOUR ANALYSIS</small>${EMO[m.name]} ${esc(m.name)}</div><b>${r.fin}</b></div><div class="anb2">
      <div class="ansec">HOW YOUR SCORE WORKS</div><div class="anw">${eq}</div>
      <div class="anatk"><b>ATTACKS THIS GAME</b>${on.map(id => `<span>${nm(id)}</span>`).join('')}</div>
      <div class="ansec">WHERE EACH NUMBER CAME FROM</div>${boxes}
      <div class="ansec">PUTTING IT TOGETHER</div><div class="anw">${ladder}<div class="ans tot"><span>Final score</span><b>${r.fin}</b></div></div>
      <div class="ansec">WHAT EACH CARD DID <i>points it added to your final score</i></div>${rows.length ? rows.map(card).join('') : '<div class="anl">You didn’t buy any cards.</div>'}
      ${gaps ? `<div class="ansec">WHAT HURT YOU MOST</div>${gaps}` : ''}
      ${unspent ? `<div class="antip">💡 You left <b>${unspent} chips</b> unspent.</div>` : ''}
      </div><button class="btn anx" data-close="1">Close</button></div>`;
  }
  function cardBack(k) {
    const c = G.CARD[k], [, e, n, , cost, s] = c, kind = { r: 'REVENUE', b: 'CONTROL', f: 'ONE-OFF FIX', w: 'WILD CARD' }[s];
    const stops = []; Object.keys(G.CTRL).forEach(id => { if (G.CTRL[id] === k) stops.push(id); });
    if (k === 'PE' || k === 'LPE') stops.push('S_EMAIL'); if (['AU', 'GO', 'LGO', 'LAU'].includes(k)) stops.push('S_AUDIT');
    const extra = { PAY: 'Raises every hit you take by 25% per card', LOAN: 'Raises the fairness fine per card', RT: 'Also tests your other controls, so they work at 100%', VM: 'Cuts trust damage after every hit', SA: 'Makes every Day 6 hit 25% smaller', LRM: 'Cuts trust damage a little more', GO: 'Your whole score ×1.5', LGO: 'Score ×1.25 if you had no owner', LT: '+1 point for every card you own', }[k];
    const weak = stops.some(id => G.RTS.includes(id)) && k !== 'RT';
    if (k === 'IND') return `<div class="cb-k">${kind} · ${cost} CHIPS</div><div class="cb-t">${e} ${esc(n)}</div>
      <div class="cb-c"><b>WHAT IT DOES</b><p class="cb-p">At the next reveal, your <u>single biggest hit</u> costs you <b>0 points</b>. Insurance pays it for you.</p></div>
      <div class="cb-c"><b>HOW TO UNLOCK</b><p class="cb-p">Own <b>🔑 Least privilege</b> and <b>🔌 Kill switch</b>. Insurers only cover agents with basic controls.</p></div>
      <div class="cb-c"><b>GOOD TO KNOW</b><p class="cb-p">• One per game<br>• Covers the next reveal: Day 1 or Day 6<br>• Your reputation still takes the hit (trust damage)</p></div>`;
    return `<div class="cb-k">${kind} · ${cost} CHIPS</div><div class="cb-t">${e} ${esc(n)}</div>
      ${stops.length ? `<div class="cb-s"><b>STOPS</b>${stops.map(id => `<span>${G.INC[id][1]} ${esc(G.INC[id][2])}<i>EU AI Act Art. ${G.ACT[id][0]}</i></span>`).join('')}</div>` : ''}
      ${extra ? `<div class="cb-x">${esc(extra)}</div>` : ''}
      <div class="cb-c"><b>${c[7].length > 1 ? 'HOW MANY TO BUY' : 'WHAT IT DOES'}</b>${c[7].map((t, i) => `<div class="${/^No extra effect/.test(t) ? 'dim' : ''}"><em>×${i + 1}</em>${esc(t)}</div>`).join('')}</div>
      ${weak ? '<div class="cb-w">💡 Tip: pair it with Red team. Untested, it only works at 75%.</div>' : ''}`;
  }
  function flipHTML(k) {
    const [, e, n, f, cost, s] = G.CARD[k], col = s === 'r' ? 'var(--red)' : s === 'f' ? 'var(--amber)' : s === 'w' ? '#7A4FD0' : 'var(--navy)';
    return `<div class="ov fov" data-close="1"><div class="fcard"><div class="fin">
      <div class="ff ffront ${s === 'w' ? 'wild' : ''}"><div class="fcn" style="color:${col}"><b>${cost}</b><span>${s === 'r' ? '♦' : s === 'f' ? '♣' : s === 'w' ? '★' : '♠'}</span></div><div class="fe">${e}</div><div class="fn" style="color:${col}">${esc(n)}</div><div class="ffx">${esc(f)}</div></div>
      <div class="ff fback ${s === 'w' ? 'wild' : ''}">${cardBack(k)}</div></div></div><div class="fhint">Tap anywhere to flip back</div></div>`;
  }
  function overlayHTML() {
    const o = ui.overlay; if (!o) return '';
    if (o.t === 'flip') return flipHTML(o.k);
    if (o.t === 'an') return analysisHTML();
    if (o.t === 'flipold') { const c = G.CARD[o.k]; return `<div class="ov" data-close="1"><div class="flip"><div class="fh">${c[1]}</div><h3>${esc(c[2])}</h3><div class="fs">${c[4]} chips · ${esc(c[3])}</div>${c[7].map((t, i) => `<div class="cp ${/Wasted/.test(t) ? 'dim' : ''}"><b>×${i + 1}</b>${esc(t)}</div>`).join('')}</div></div>`; }
    if (o.t === 'iou') { const d = shopData(); return `<div class="ov" data-close="1"><div class="iou"><div class="iouh">IOU · NBD BANK</div><div class="iouv">${d.b} chips</div><div class="iout">${esc(me().name)} borrowed ${Array(d.b / 10).fill(10).join(' + ')}.<br>Charged to NBD Bank’s<br>annual AI budget.</div><div class="sig">${esc(me().name)}</div></div></div>`; }
    if (o.t === 'lock') { const d = shopData(); return `<div class="ov"><div class="sheet"><h3>Lock your hand?</h3><p>You can’t change your cards after locking.${d.leftC > 0 ? `<br>You still have <b style="color:var(--gold)">${d.leftC} chips</b> unspent.` : ''}</p><div class="row2"><button class="btn ghost" data-close="1">Keep playing</button><button class="btn" id="lockyes">Lock it</button></div></div></div>`; }
    if (o.t === 'rejoin') return `<div class="ov"><div class="sheet"><h3>${esc(o.name)} is taken</h3><p>Is this you on a new phone? Rejoin to carry on with your cards.</p><div class="row2"><button class="btn ghost" data-close="1">Pick another</button><button class="btn" id="rejoinb" data-owner="${esc(o.owner)}">That’s me</button></div></div></div>`;
    return '';
  }
  function playerView() {
    const m = me(), p = ph();
    if (!m) return (p === 'lobby' || p === 'p1') ? vJoin() : vClosed('The game has already started.<br>Watch the big screen: you can join the next one.');
    if (p === 'lobby') return table(`${topBar('LOBBY')}<div class="mid"><div class="lk">${EMO[m.name] || '🙂'}</div><div class="lt">You’re in, ${esc(m.name)}</div><div class="ls">Keep this page open.<br>The shop opens when the host is ready.</div>
      <div class="lobby"><div class="lbh2">${list().length} PLAYERS AT THE TABLE</div><div class="lobn">${list().map(x => `<span class="${x.id === pid ? 'me' : ''}">${EMO[x.name] || ''} ${esc(x.name)}</span>`).join('')}</div></div></div>`);
    if (p === 'p1' || p === 'p2') return m['l' + partOf()] ? vLocked(false) : vShop();
    if (p === 'p1x' || p === 'p2x') return vLocked(true);
    if (p === 'd1') return vReveal(1);
    return vReveal(6) + (p === 'cfo' ? callHTML() : '');
  }
  /* ---------- the CFO calls (or emails, if you decline) ---------- */
  function cfoLines() {
    const m = me(), r = scoreOf(m), n = m.name, iou = (m.b1 || 0) + (m.b2 || 0);
    const [rk, of] = rankOf('fin', p => !scoreOf(p).dq);
    const k = r.arts.length, act = k ? [`But Nova breached ${k} article${k > 1 ? 's' : ''} of the EU AI Act.`, `The Commission can fine us up to 15 million euros, or 3% of our global turnover.`,
      `I need your action plan to fix this on my desk today.`, `And a conformity assessment and full technical documentation within one week.`]
      : [`And Nova breached no EU AI Act articles. That’s how it’s done.`];
    if (r.dq) return [`Hi ${n}, it’s the CFO.`, `You spent ${r.total} credits against a budget of ${G.TOTAL}.${iou ? ` Your IOUs count.` : ''} You’re disqualified.`].concat(act);
    return [`Hi ${n}, it’s the CFO.`, `You spent ${r.total} of ${G.TOTAL}. On budget. Your score of ${r.fin} puts you number ${rk} of ${of}.`].concat(act);
  }
  function callHTML() {
    const c = ui.call; if (!c || c.stage === 'done') return '';
    const head = sub => `<div class="cl-top"><div class="cl-sub" ${sub === 'timer' ? 'id="ctimer"' : ''}>${sub === 'timer' ? '00:00' : sub}</div><div class="cl-av">CFO</div><div class="cl-name">Chief Financial Officer</div><div class="cl-org">NBD Bank · Head office</div></div>`;
    if (c.stage === 'ring') return `<div class="call ring">${head('incoming call…')}<div class="cl-btns"><button class="cl-b no" id="cdecl"><span>✆</span><small>Decline</small></button><button class="cl-b yes" id="cacc"><span>✆</span><small>Accept</small></button></div></div>`;
    if (c.stage === 'talk') return `<div class="call">${head('timer')}<div class="cl-cap" id="ccap"></div><div class="cl-btns"><button class="cl-b no" id="chang"><span>✆</span><small>End call</small></button></div></div>`;
    if (c.stage === 'mail') { const r = scoreOf(me()), t = new Date(), hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      return `<div class="mailov"><div class="mailbn">✉️ <b>CFO, NBD Bank</b> · ${r.dq ? 'Nova budget review: action taken' : r.arts.length ? 'Nova review: EU AI Act action required' : 'Nova budget review: approved'}</div><div class="mailv">
        <div class="mvh"><span>Inbox</span><span>${hh}</span></div><div class="mvs">${r.dq ? 'Nova budget review: you are disqualified' : r.arts.length ? 'EU AI Act breaches: action plan needed today' : 'Nova budget review: approved'}</div>
        <div class="mvf"><div class="mva">CFO</div><div><b>Chief Financial Officer</b><small>to ${esc(me().name)} · cc: Board of Directors</small></div></div>
        <div class="mvb">${cfoLines().map(l => `<p>${esc(l)}</p>`).join('')}<p class="sig">— Office of the CFO, NBD Bank</p></div>
        <button class="btn" id="cmail">${r.dq ? 'Close' : 'See my result'}</button></div></div>`; }
    return '';
  }
  let ringT = null, callT = null;
  function stopRing() { clearInterval(ringT); ringT = null; try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} }
  function endCall() { stopRing(); clearInterval(callT); try { speechSynthesis.cancel(); } catch (e) {} ui.call = { stage: 'done' }; const r = scoreOf(me()); ui.fx = [{ t: 0.3, f: r.dq ? 'dq' : 'ok' }]; render(true); }
  function startRing() { if (ringT) return; const ring = () => { SFX.ring(); buzz([500, 250, 500]); }; ring(); ringT = setInterval(ring, 2600); }
  function acceptCall() {
    stopRing(); ui.call = { stage: 'talk' }; render(true);
    const lines = cfoLines(), t0 = Date.now();
    callT = setInterval(() => { const el = document.getElementById('ctimer'); if (el) { const s = Math.floor((Date.now() - t0) / 1000); el.textContent = '00:' + String(s).padStart(2, '0'); } }, 500);
    const show = i => { const cap = document.getElementById('ccap'); if (cap) cap.innerHTML = lines.slice(0, i + 1).map((l, j) => `<p class="${j === i ? 'now' : ''}">${esc(l)}</p>`).join(''); };
    const synth = window.speechSynthesis; let voice = null;
    try { const vs = synth.getVoices(); voice = vs.find(v => /en-GB/i.test(v.lang) && /female|serena|kate|martha|libby|sonia/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)); } catch (e) {}
    const next = i => { if (!ui.call || ui.call.stage !== 'talk') return; if (i >= lines.length) { setTimeout(() => { if (ui.call && ui.call.stage === 'talk') endCall(); }, 1200); return; }
      show(i);
      if (synth && window.SpeechSynthesisUtterance) { const u = new SpeechSynthesisUtterance(lines[i]); if (voice) u.voice = voice; u.rate = 0.98; u.pitch = 0.95;
        const st = Date.now(), min = 900 + lines[i].length * 50; let done = false;
        const go = () => { if (done) return; done = true; setTimeout(() => next(i + 1), Math.max(250, min - (Date.now() - st))); };
        u.onend = go; u.onerror = go; setTimeout(go, 1500 + lines[i].length * 90); try { synth.speak(u); } catch (e) { go(); } }
      else setTimeout(() => next(i + 1), 1400 + lines[i].length * 55); };
    setTimeout(() => next(0), 700);
  }
  function playerSig() {
    const m = me(), p = ph();
    let s = p + '|' + JSON.stringify(m) + '|' + JSON.stringify(ui.overlay) + '|' + JSON.stringify(ui.call) + '|' + ui.pick + '|' + (state.d1 || '') + (state.d6 || '') + '|' + state.deadline;
    if (!m) s += JSON.stringify(names);
    if (p === 'lobby') s += '|' + list().map(x => x.name).join();
    if (m && (p === 'p1x' || p === 'p2x' || (m['l' + partOf()] && (p === 'p1' || p === 'p2')))) s += '|' + Object.keys(players).length;
    if (p === 'd1' || p === 'd6' || p === 'cfo') s += '|' + Object.keys(players).length;
    s += '|' + !!ui.flash + '|' + !!ui.flipped + '|' + released(shopPart()).length + '|' + JSON.stringify(ui.newsTake) + '|' + ui.newsI + '|' + wbLive() + '|' + JSON.stringify(state.wb || null);
    return s;
  }
  function bindPlayer() {
    $app.querySelectorAll('[data-name]').forEach(b => b.onclick = () => { const n = b.dataset.name, o = names[keyOf(n)]; ui.typed = ''; if (o && o !== pid) { ui.overlay = { t: 'rejoin', name: n, owner: o }; } else ui.pick = n; render(true); });
    const jb = document.getElementById('joinb');
    const tryJoin = () => { if (!ui.pick) return; const o = names[keyOf(ui.pick)]; if (o && o !== pid) { ui.overlay = { t: 'rejoin', name: (players[o] && players[o].name) || cleanName(ui.pick), owner: o }; render(true); } else join(ui.pick); };
    if (jb) jb.onclick = tryJoin;
    const ni = document.getElementById('nmin');
    if (ni) { ni.oninput = () => { ui.typed = ni.value; const c = cleanName(ni.value); ui.pick = c || null; $app.querySelectorAll('.name.sel').forEach(b => b.classList.remove('sel'));
        if (jb) { jb.disabled = !c; jb.textContent = c ? 'I’m ' + c : 'Type or pick a name'; } };
      ni.onkeydown = e => { if (e.key === 'Enter') { ni.blur(); tryJoin(); } };
      ni.onblur = () => setTimeout(() => render(), 0);
      if (ui.typed) { ni.focus(); try { ni.setSelectionRange(ni.value.length, ni.value.length); } catch (e) {} } }
    const rb = document.getElementById('rejoinb'); if (rb) rb.onclick = () => rejoin(rb.dataset.owner);
    const anb = document.getElementById('anb'); if (anb) anb.onclick = () => { ui.overlay = { t: 'an' }; SFX.flip(); render(true); };
    const apb = document.getElementById('apb'); if (apb) apb.onclick = () => { players[pid].ap = true; DB.update(BASE + '/players/' + pid, { ap: true }); SFX.stamp(); buzz(60); toast('📝 Action plan sent to the CFO'); render(true); };
    const fl = document.getElementById('flash9'); if (fl) fl.onclick = () => { ui.flash = null; guard(); render(true); };
    const nk = document.getElementById('nwok'); if (nk) nk.onclick = () => { ui.newsTake = null; guard(); render(true); };
    const nb = document.getElementById('nbar'); if (nb) nb.onclick = () => { const n = released(shopPart()).length; if (n > 1) { ui.newsI = ((ui.newsI || 0) + 1) % n; SFX.chip(); render(true); } };
    const wr = document.getElementById('wbrep'), wh = document.getElementById('wbhid');
    if (wr) wr.onclick = () => { guard(); DB.update(BASE + '/state/wb', { choice: 'report' }); SFX.fanfare(); buzz(60); toast('⭐ Reported. +10 and a Speak-up badge'); };
    if (wh) wh.onclick = () => { guard(); DB.update(BASE + '/state/wb', { choice: 'hide' }); SFX.stamp(); buzz(60); toast('🙈 Hidden. Let’s hope it never comes out…'); };
    const bw = document.getElementById('borrow'); if (bw) bw.onclick = borrow;
    const lb = document.getElementById('lockb'); if (lb) lb.onclick = () => { if (guarded()) return; ui.overlay = { t: 'lock' }; guard(); render(true); };
    const ub = document.getElementById('unlockb'); if (ub) ub.onclick = () => { const part = partOf(); players[pid]['l' + part] = false; DB.update(BASE + '/players/' + pid, { ['l' + part]: false }); guard(); SFX.chip(); render(true); };
    const ly = document.getElementById('lockyes'); if (ly) ly.onclick = lock;
    const ca = document.getElementById('cacc'); if (ca) { ca.onclick = acceptCall; startRing(); }
    const cd = document.getElementById('cdecl'); if (cd) cd.onclick = () => { stopRing(); SFX.chip(); ui.call = { stage: 'mail' }; render(true); };
    const ch = document.getElementById('chang'); if (ch) ch.onclick = endCall;
    const cm = document.getElementById('cmail'); if (cm) cm.onclick = endCall;
    $app.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => { ui.overlay = null; guard(); render(true); }));
    const press = (el, tap, hold) => { let t, held = false;
      el.addEventListener('pointerdown', () => { held = false; t = setTimeout(() => { held = true; buzz(20); hold(); }, 430); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, e => { clearTimeout(t); if (ev === 'pointerup' && !held) tap(); }));
      el.addEventListener('contextmenu', e => e.preventDefault()); };
    $app.querySelectorAll('[data-flip]').forEach(b => { ['pointerdown', 'pointerup'].forEach(ev => b.addEventListener(ev, e => e.stopPropagation()));
      b.addEventListener('click', e => { e.stopPropagation(); ui.flipped = true; SFX.flip(); ui.overlay = { t: 'flip', k: b.dataset.flip }; render(true); }); });
    $app.querySelectorAll('[data-pile]').forEach(el => { const k = el.dataset.pile; press(el, () => deal(k), () => { ui.flipped = true; ui.overlay = { t: 'flip', k }; render(true); }); });
    $app.querySelectorAll('[data-hand] .pc').forEach(el => { const k = el.parentNode.dataset.hand; press(el, () => undeal(k), () => { ui.overlay = { t: 'flip', k }; render(true); }); });
  }

  /* ---------- reveal effects: sounds, shake, flash, count-up ---------- */
  function runFx(phone) {
    const fx = ui.fx; ui.fx = null; if (!fx) return;
    const root = $app.querySelector(phone ? '.ph' : '.bd');
    const later = (t, fn) => setTimeout(fn, t * 1000);
    fx.forEach(e => {
      if (e.f === 'intro') { SFX.heartbeat(2, 0); SFX.drumroll(1.7, 1.6); buzz([60, 740, 60]); [0.0, 0.8, 1.6].forEach((t, i) => later(t + 0.05, () => SFX.tick())); }
      else if (e.f === 'none') later(e.t, () => SFX.whoosh());
      else if (e.f === 'hit') later(e.t, () => { SFX.flip(); later(0.2, () => { SFX.boom(); buzz([200, 60, 200]); if (root) { root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); const fl = $app.querySelector('.flash'); if (fl) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); } } }); });
      else if (e.f === 'half') later(e.t, () => { SFX.flip(); later(0.2, () => { SFX.clang(); buzz(90); }); });
      else if (e.f === 'safe') later(e.t, () => { SFX.flip(); later(0.2, () => { SFX.shield(); buzz(30); }); });
      else if (e.f === 'score') later(e.t, () => { countUp(); const v = e.v; later(1.0, () => (v < 0 ? SFX.sad() : SFX.fanfare())); });
      else if (e.f === 'dq') later(e.t, () => { SFX.stamp(); buzz([300]); later(0.5, () => SFX.sad()); });
      else if (e.f === 'ok') later(e.t, () => { SFX.stamp(); later(0.3, () => SFX.fanfare()); });
      else if (e.f === 'board-lb') later(e.t, () => SFX.chip());
      else if (e.f === 'cfo') { [0.2, 2.8].forEach(t => later(t, () => SFX.ring())); later(e.t - 1.6, () => SFX.drumroll(1.5)); later(e.t, () => { SFX.stamp(); later(0.6, () => SFX.fanfare()); }); }
    });
  }
  function countUp() { $app.querySelectorAll('[data-count]').forEach(el => { const to = +el.dataset.count, t0 = performance.now(), D = 900;
    const step = now => { const k = Math.min(1, (now - t0) / D); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }); }

  /* ======================= BOARD ======================= */
  const playerURL = () => location.origin + location.pathname + (ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '');
  function qrSVG(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); }
  function exposure(id) { let bl = 0, hf = 0, ex = 0; list().forEach(p => { const q1 = G.full(p.q1, G.P1), n = G.shield(id, q1, G.full(p.q2, G.P2)); if (n >= 2 && !G.weak(id, q1)) bl++; else if (n >= 1) hf++; else ex++; }); return { bl, hf, ex }; }
  function boardIncs(ids, on, anim, INTRO, STEP, fx) {
    const order = ids.slice().sort((a, b) => (on.indexOf(b) >= 0) - (on.indexOf(a) >= 0));
    const pos = id => order.indexOf(id), d = id => anim ? INTRO + 0.2 + pos(id) * STEP : 0;
    if (anim) order.forEach(id => { const x = on.indexOf(id) >= 0 ? exposure(id) : null; fx.push({ t: d(id), f: !x ? 'none' : x.ex > 0 ? 'hit' : x.hf > 0 ? 'half' : 'safe' }); });
    return ids.map(id => { const [, e, n] = G.INC[id];
      if (on.indexOf(id) < 0) return `<div class="binc down" style="animation-delay:${d(id)}s"><div class="e">${e}</div><div class="bn">${esc(n)}</div><div class="bs">not tonight</div></div>`;
      const x = exposure(id); return `<div class="binc ${x.ex > 0 ? 'hot' : ''}" style="animation-delay:${d(id)}s"><div class="e">${e}</div><div class="bn">${esc(n)}</div><div class="bs">💥 ${x.ex} full hit · <span class="a">½ ${x.hf} partly stopped</span> · <span class="g">🛡️ ${x.bl} blocked</span></div><div class="bact">⚖️ EU AI Act Art. ${G.ACT[id][0]}</div></div>`; }).join('');
  }
  function boardReveal(day) {
    const key = 'brev' + day, anim = !ui.seen[key]; ui.seen[key] = true;
    const INTRO = anim ? 3.4 : 0, STEP = 1.1, ids = day === 1 ? ['JB', 'RUN', 'BIG', 'LEAK'] : ['S_EMAIL', 'S_AUDIT', 'FAIR', 'INV', 'DRIFT', 'DEEP'];
    const fx = anim ? [{ t: 0, f: 'intro', day }] : [];
    const cards = boardIncs(ids, (day === 1 ? state.d1 : state.d6) || [], anim, INTRO, STEP, fx);
    const lbAt = anim ? INTRO + 0.2 + ids.length * STEP + 0.3 : 0; if (anim) { fx.push({ t: lbAt, f: 'board-lb' }); ui.fx = fx; }
    const intro = anim ? `<div class="intro big" style="animation-delay:${INTRO - 0.4}s"><div class="ik">${day === 1 ? 'DAY 1 · HOUR 6' : 'DAY 6'}</div><div class="iq">${day === 1 ? 'Nova goes live…' : 'Something wakes up…'}</div><div class="icd"><span>3</span><span>2</span><span>1</span></div></div><div class="flash"></div>` : '';
    return { cards, intro, lbAt };
  }
  function lbRows(rows, key, strike) { return rows.map((x, i) => `<tr class="${strike && x.r.dq ? 'dq' : ''} ${!strike && i < 3 ? 'pod' : ''}"><td>${i + 1}</td><td>${EMO[x.p.name] || ''} ${esc(x.p.name)}</td><td class="s">${at('d6') ? 'spent ' + x.r.total : ''}</td><td>${x.r[key]}</td></tr>`).join(''); }
  function boardNews(part) {
    const rel = released(part); if (!rel.length) return '';
    const tk = ui.bTake && ui.bTake.part === part ? rel[ui.bTake.i] : null;
    if (tk) { const h = G.NEWS[tk.id], tm = new Date(tk.at), hh = String(tm.getHours()).padStart(2, '0') + ':' + String(tm.getMinutes()).padStart(2, '0');
      return `<div class="pj"><div class="pbar"><div class="d"></div><b>BREAKING</b><span>${hh}</span></div><div class="pmst"><span>PART ${part} · SHOP OPEN</span><i>The Daily Ledger</i><span>EUROPE EDITION</span></div>
        <div class="pbd"><h1>${esc(h[0])}</h1><p>${esc(h[1])}</p></div><div class="pft"><span>REAL WARNING OR NOISE? YOU DECIDE.</span><span>BACK TO THE SHOP IN 10s</span></div></div>`; }
    return `<div class="pjn">${rel.map((n, i) => `<div class="row"><div class="l">BREAKING</div><div class="m"><b>${esc(G.NEWS[n.id][0])}</b></div></div>`).join('')}</div>`;
  }
  function boardView() {
    const p = ph(), L = list(), url = playerURL();
    let inner = '', newsB = '';
    if (p === 'lobby') inner = `<div class="bjoin"><div class="qrb">${qrSVG(url)}</div><div><div class="blogo"><small>AGENT TYCOON</small><em>Gamma</em></div><div class="burl">Scan to play · ${esc(url.replace(/^https?:\/\//, ''))}</div>
      <div class="bcount"><b>${L.length}</b> players joined</div><div class="bnames">${L.slice(-40).map(x => `<span>${EMO[x.name] || ''} ${esc(x.name)}</span>`).join('')}</div></div></div>`;
    else if (p === 'p1' || p === 'p2' || p === 'p1x' || p === 'p2x') { const part = p[1], n = L.filter(x => x['l' + part]).length, t = left(), closed = p.endsWith('x'); newsB = boardNews(+part);
      inner = `<div class="bh">Part ${part} · <em>${closed ? 'the shop is closed' : 'the shop is open'}</em></div><div class="bshop">${p === 'p1' ? `<div class="qrb" style="padding:1.4vh">${qrSVG(url).replace('<svg', '<svg style="width:26vh;height:26vh"')}</div>` : ''}
      <div>${!closed && t != null ? `<div class="bcd cdi">${fmtT(t)}</div>` : `<div class="bcd" style="font-size:12vh">🔒</div>`}<div class="bcount"><b id="bn">${n}</b> of ${L.length} hands locked</div><div class="bprog"><i style="width:${L.length ? 100 * n / L.length : 0}%"></i></div>
      <div class="bsub" style="margin:1vh 0 0">${part === '1' ? 'Budget: 100 chips' : 'Budget: 80 chips'} · borrowing is allowed</div></div></div>`; }
    else if (p === 'd1') { const rows = L.map(x => ({ p: x, r: scoreOf(x) })).sort((a, b) => b.r.mid - a.r.mid).slice(0, 8), R = boardReveal(1);
      inner = `<div class="bh">Day 1 · <em>Nova’s first night</em></div><div class="split"><div class="bincs four">${R.cards}</div><div class="anim2" style="animation-delay:${R.lbAt}s"><div class="lbh">HOUR 6 LEADERBOARD</div><table class="lb">${lbRows(rows, 'mid')}</table></div></div>${R.intro}`; }
    else if (p === 'd6') { const rows = L.map(x => ({ p: x, r: scoreOf(x) })).sort((a, b) => b.r.fin - a.r.fin).slice(0, 8), R = boardReveal(6);
      const cov = state.wb && state.wb.leak && state.wb.choice !== 'report' ? `<div class="cover anim2" style="animation-delay:${R.lbAt + 0.6}s"><b>📰 COVER-UP EXPOSED AT NOVA</b><span>Someone in this room hid 40 bad payments. It just leaked to the press. Name revealed at the CFO review.</span></div>` : '';
      inner = `<div class="bh">Day 6 · <em>the sleepers wake up</em></div><div class="split"><div class="bincs">${R.cards}</div><div class="anim2" style="animation-delay:${R.lbAt}s"><div class="lbh">FINAL LEADERBOARD · BEFORE REVIEW</div><table class="lb">${lbRows(rows, 'fin')}</table>${cov}</div></div>${R.intro}`; }
    else { const all = L.map(x => ({ p: x, r: scoreOf(x) })).sort((a, b) => b.r.fin - a.r.fin), ok = all.filter(x => !x.r.dq), dq = all.filter(x => x.r.dq);
      const med = ['🥇', '🥈', '🥉'], first = !ui.seen.bcfo; if (first) { ui.seen.bcfo = true; ui.fx = [{ t: 7.0, f: 'cfo' }]; }
      inner = `<div class="bh">Official leaderboard · <em>after CFO review</em></div>${wbReveal(true)}<div class="cfo3">${ok.slice(0, 3).map((x, i) => `<div class="pod"><div class="m">${med[i]}</div><div class="n">${EMO[x.p.name] || ''} ${esc(x.p.name)}</div><div class="v">${x.r.fin}</div><div class="s">spent ${x.r.total} of ${G.TOTAL}</div></div>`).join('')}</div>
      <div class="split" style="grid-template-columns:1fr 1fr"><div><div class="lbh">ON BUDGET</div><table class="lb">${ok.slice(3, 9).map((x, i) => `<tr><td>${i + 4}</td><td>${EMO[x.p.name] || ''} ${esc(x.p.name)}</td><td class="s">spent ${x.r.total}</td><td>${x.r.fin}</td></tr>`).join('')}</table></div>
      <div><div class="lbh">DISQUALIFIED BY THE CFO · ${dq.length} PLAYERS</div><table class="lb">${dq.slice(0, 6).map(x => `<tr class="dq"><td>❌</td><td>${EMO[x.p.name] || ''} ${esc(x.p.name)}</td><td class="s">spent ${x.r.total}</td><td>${x.r.fin}</td></tr>`).join('')}</table>
      ${dq.length ? `<div class="dqline">Top raw score: <b>${esc(dq[0].p.name)} ${dq[0].r.fin}</b>, spent ${dq[0].r.total} of ${G.TOTAL}. No budget, no bonus.</div>` : ''}</div></div><div class="stamp" style="animation-delay:${first ? 7 : 0}s">CFO REVIEW</div>${first ? `<div class="intro big bcall" style="animation-delay:5.2s"><div class="cl-av big">CFO</div><div class="ik">INCOMING CALL · NBD BANK</div><div class="iq">The CFO is calling every player…</div><div class="bsub" style="margin-top:2vh">Pick up your phone</div></div>` : ''}`; }
    if (state.about) { inner = aboutHTML(); newsB = ''; }
    return `<div class="bd"><div class="oval"></div><div class="bin">${inner}</div></div>${newsB}<button class="snd ${SFX.enabled ? 'on' : ''}" id="snd">${SFX.enabled ? '🔊' : '🔇 Click for sound'}</button>${DB.mode === 'demo' ? '<div class="demo">DEMO MODE</div>' : ''}`;
  }
  function aboutHTML() {
    const col = (n, ico, h, sub, li) => `<div class="abc"><div class="abn">${n}</div><div class="abi">${ico}</div><h3>${h}</h3><div class="abs">${sub}</div><ul>${li.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    return `<div class="ab"><div class="abt"><small>AGENT TYCOON · GAMMA · WHAT IS THIS GAME?</small><h1>Can you grow your AI agent <em>without getting burned?</em></h1>
      <p>You run <b>Nova</b>, your company’s new AI agent. Make it earn money, protect it from what can go wrong, and stay on the right side of the <b>EU AI Act</b>. Your CFO is watching every chip.</p></div>
      <div class="ab3">${col(1, '🛒', 'Buy cards', 'Part 1: 100 chips · Part 2: 80 chips', ['💰 <b>Money cards</b> earn revenue, but make you a bigger target', '🛡️ <b>Control cards</b> stop attacks: one card halves it, two block it', '🩹 <b>Late fixes</b> patch gaps in Part 2'])}
      ${col(2, '💥', 'Attacks hit', 'Day 1 and Day 6', ['🌙 <b>Day 1:</b> random attacks on Nova’s first night', '😴 <b>Day 6:</b> sleepers from Day 1 wake up, with new attacks', '📰 <b>Breaking news</b> hints what’s coming, but it might be fake'])}
      ${col(3, '🧾', 'The CFO reviews', 'The final verdict', ['⚖️ Every attack that gets through breaks an <b>EU AI Act</b> article', '❌ Spend more than <b>180 chips</b> in total and you’re out', '🏆 <b>Highest score wins</b>'])}</div>
      <div class="abf"><b>HOW YOUR SCORE WORKS</b><div>Your score = what you <i class="c1">💰 earned</i> − <i class="c2">💥 attack damage</i> − <i class="c3">🚫 overspend fine</i> → × your <i class="c4">📋 owner boost</i> → + your <i class="c5">🎓 literacy bonus</i> → then <i class="c6">🤝 trust damage</i> takes a share away</div></div></div>`;
  }
  const boardSig = () => ph() + '|' + released(shopPart()).length + '|' + JSON.stringify(ui.bTake || null) + '|' + JSON.stringify(state) + '|' + (ph() === 'lobby' ? Object.values(players).map(x => x.name).join() : ['d1', 'd6', 'cfo'].includes(ph()) ? Object.keys(players).length : JSON.stringify(players));

  /* ======================= HOST ======================= */
  const STEPS = [['Open Part 1', 'lobby', 'p1'], ['Close Part 1', 'p1', 'p1x'], ['Reveal Day 1', 'p1x', 'd1'], ['Open Part 2', 'd1', 'p2'], ['Close Part 2', 'p2', 'p2x'], ['Reveal Day 6', 'p2x', 'd6'], ['CFO review', 'd6', 'cfo']];
  async function step(i) {
    const [, from, to] = STEPS[i]; if (ph() !== from) return; const L = list(), upd = { phase: to, t: DB.now() };
    const mins = parseFloat((document.getElementById('mins') || {}).value) || cfg.shopMinutes || 6;
    if (to === 'p1' || to === 'p2') { const now = DB.now(), dur = mins * 60000; upd.deadline = now + dur;
      const pt = to === 'p1' ? 1 : 2, nw = G.makeNews(pt); nw[0].at = now + Math.min(90000, dur * 0.3); upd['news/' + pt] = nw;
      if (to === 'p2' && L.length) { const w = L[Math.floor(Math.random() * L.length)]; upd.wb = { pid: w.id, at: now + Math.min(150000, dur * 0.55), leak: Math.random() < 0.5, choice: null }; } }
    else upd.deadline = null;
    if (to === 'p1x') { const u = {}; L.forEach(p => { if (!p.l1) u[p.id + '/l1'] = true; }); if (Object.keys(u).length) await DB.update(BASE + '/players', u); }
    if (to === 'p2x') { const u = {}; L.forEach(p => { if (!p.l2 && Object.values(p.q2 || {}).some(v => v > 0)) u[p.id + '/l2'] = true; }); if (Object.keys(u).length) await DB.update(BASE + '/players', u); }
    if (to === 'd1') upd.d1 = G.pick(1, (state.news || {})[1]);
    if (to === 'd6') upd.d6 = G.pick(2, (state.news || {})[2]);
    await DB.update(BASE + '/state', upd);
  }
  async function back() { const i = PHASES.indexOf(ph()); if (i <= 0) return; if (!confirm('Go back to “' + PHASES[i - 1] + '”? Players will see that screen again.')) return; await DB.update(BASE + '/state', { phase: PHASES[i - 1], deadline: null }); }
  async function reset() { if (!confirm('Start a NEW game in room “' + ROOM + '”? This deletes all players and cards in this room.')) return; await DB.set(BASE, { state: { phase: 'lobby', t: DB.now() } }); }
  async function addTime(m) { if (!state.deadline) return; await DB.update(BASE + '/state', { deadline: Math.max(DB.now(), state.deadline) + m * 60000 }); }
  function exportCSV() {
    const L = list(), cols = ['name'].concat(G.P1.map(c => 'P1_' + c[0]), ['P1_spent', 'P1_borrowed'], G.P2.map(c => 'P2_' + c[0]), ['P2_spent', 'P2_borrowed', 'played_P2', 'hour6', 'final', 'total_spent', 'cfo_disqualified', 'ai_act_articles_breached', 'action_plan_submitted', 'whistleblower', 'incidents']);
    const rows = L.map(p => { const r = scoreOf(p); return [p.name].concat(G.P1.map(c => (p.q1 || {})[c[0]] || 0), [r.s1, p.b1 || 0], G.P2.map(c => (p.q2 || {})[c[0]] || 0), [r.s2, p.b2 || 0, has2(p) ? 'yes' : 'no', r.mid, at('d6') ? r.fin : '', r.total, r.dq ? 'yes' : 'no', at('d6') ? r.arts.map(a => 'Art.' + a).join(' ') : '', p.ap ? 'yes' : '', wbOf(p) ? wbOf(p).choice + (wbOf(p).leak ? ' (leaked if hidden)' : '') : '', fired().join(' ')]); });
    const csv = [cols].concat(rows).map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'tycoon-gamma-' + ROOM + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  }
  function hostView() {
    const L = list(), p = ph(), cur = PHASES.indexOf(p), t = left();
    const part = p === 'p2' || p === 'p2x' ? 2 : 1, locked = L.filter(x => x['l' + part]).length;
    const btns = STEPS.map(([lab, from], i) => { const done = PHASES.indexOf(from) < cur, go = from === p;
      return `<button class="hb ${done ? 'dn' : ''} ${go ? 'go' : ''}" data-step="${i}" ${go ? '' : 'disabled'}><span>${i + 1} · ${lab}</span><i>${done ? '✓' : '▶'}</i></button>`; }).join('');
    const rows = L.map(x => ({ x, r: scoreOf(x) })).sort((a, b) => (at('d6') ? b.r.fin - a.r.fin : b.r.mid - a.r.mid));
    const url = playerURL(), burl = location.origin + location.pathname + '?board' + (ROOM !== (cfg.room || 'main') ? '&room=' + ROOM : '');
    return `<div class="host"><h1>Tycoon Gamma · <em>host</em></h1><div class="hs">Room <b>${esc(ROOM)}</b> · phase <b>${p}</b> · ${L.length} players · ${locked} locked${t != null ? ' · shop timer <b class="cdi">' + fmtT(t) + '</b>' : ''}${DB.mode === 'demo' ? ' · <b style="color:var(--coral)">DEMO MODE (no Firebase config)</b>' : ''}</div>
      <div class="hgrid">${btns}<button class="hb" id="exp"><span>⬇ Export results (CSV)</span><i></i></button><button class="hb${state.about ? ' go' : ''}" id="about"><span>📖 ${state.about ? 'Hide' : 'Show'} “What is this game?” on the big screen</span><i></i></button></div>
      <div class="hbox"><h3>SHOP TIMER</h3><div class="hrow">Minutes for the next shop round <input id="mins" type="number" min="1" max="30" value="${cfg.shopMinutes || 6}"> <button class="sbtn" data-add="1">+1 min now</button><button class="sbtn" data-add="-1">−1 min now</button></div></div>
      ${state.news ? `<div class="hbox"><h3>BREAKING NEWS · HOST ONLY</h3><div style="font-weight:700;line-height:1.8">${[1, 2].filter(k => state.news[k]).map(k => state.news[k].map((n, i) => `Part ${k} · <span style="color:${n.real ? 'var(--mint)' : 'var(--coral)'}">${n.real ? 'REAL' : 'FAKE'}</span> · ${G.INC[n.id][1]} ${esc(G.NEWS[n.id][0])} · ${DB.now() >= n.at ? 'out' : 'in ' + fmtT(n.at - DB.now())}`).join('<br>')).join('<br>')}</div></div>` : ''}
      ${state.wb && players[state.wb.pid] ? `<div class="hbox"><h3>WHISTLEBLOWER · HOST ONLY</h3><div style="font-weight:700;line-height:1.8">${EMO[players[state.wb.pid].name]} ${esc(players[state.wb.pid].name)} · ${DB.now() >= state.wb.at ? 'pop-up shown' : 'pop-up in ' + fmtT(state.wb.at - DB.now())} · choice: <b>${state.wb.choice || '—'}</b> · if hidden it ${state.wb.leak ? '<b style="color:var(--coral)">WILL leak</b>' : 'will not leak'}</div></div>` : ''}
      ${state.d1 ? `<div class="hbox"><h3>INCIDENTS FIRED</h3><div style="font-weight:700;line-height:1.7">Day 1: ${(state.d1 || []).map(i => G.INC[i][1] + ' ' + G.INC[i][2]).join(' · ')}${state.d6 ? '<br>Day 6: ' + state.d6.map(i => G.INC[i][1] + ' ' + G.INC[i][2]).join(' · ') : ''}</div></div>` : ''}
      <div class="hbox links"><h3>LINKS</h3><div style="line-height:1.9;font-size:14px">Players (QR): <a href="${url}" target="_blank">${esc(url)}</a><br>Projector: <a href="${burl}" target="_blank">${esc(burl)}</a></div></div>
      <div class="hbox"><h3>PLAYERS</h3><table class="htab"><tr><th>NAME</th><th>P1</th><th>P2</th><th class="n">SPENT</th><th class="n">IOU</th><th class="n">HOUR 6</th><th class="n">FINAL</th></tr>
      ${rows.map(({ x, r }) => `<tr><td>${EMO[x.name] || ''} ${esc(x.name)}</td><td>${x.l1 ? '🔒' : '…'}</td><td>${at('p2') ? (x.l2 ? '🔒' : '…') : ''}</td><td class="n">${r.total}${r.total > G.TOTAL ? ' ❌' : ''}</td><td class="n">${(x.b1 || 0) + (x.b2 || 0) || ''}</td><td class="n">${at('d1') ? r.mid : ''}</td><td class="n">${at('d6') ? r.fin : ''}</td></tr>`).join('') || '<tr><td colspan="7" style="color:var(--lav)">No players yet</td></tr>'}</table></div>
      <div class="hbox"><h3>SAFETY</h3><div class="hrow"><button class="sbtn" id="back">↩ Go back one step</button><button class="sbtn red" id="reset">Start a new game (clears this room)</button></div></div></div>`;
  }
  function bindHost() {
    $app.querySelectorAll('[data-step]').forEach(b => b.onclick = () => step(+b.dataset.step));
    $app.querySelectorAll('[data-add]').forEach(b => b.onclick = () => addTime(+b.dataset.add));
    document.getElementById('exp').onclick = exportCSV; document.getElementById('about').onclick = () => DB.update(BASE + '/state', { about: !state.about }); document.getElementById('back').onclick = back; document.getElementById('reset').onclick = reset;
  }

  let fitNews = false;
  function fit() {
    const W = Math.min(window.innerWidth, 480), H = window.innerHeight - (fitNews ? 96 : 0);
    const byW = (W - 84) / 4, byH = (H - 350) / (3 * 1.3 + 1.3 * 0.8);
    const cw = Math.max(48, Math.min(74, byW, byH));
    document.documentElement.style.setProperty('--cw', cw + 'px'); document.documentElement.style.setProperty('--ch', cw * 1.3 + 'px');
    document.documentElement.style.setProperty('--hw', Math.round(cw * 0.8) + 'px'); document.documentElement.classList.toggle('sm', cw < 62);
  }
  fit(); window.addEventListener('resize', () => { fit(); render(true); });
  /* ======================= LOOP ======================= */
  function render(force) {
    let sig = VIEW === 'player' ? playerSig() : VIEW === 'board' ? boardSig() : JSON.stringify(state) + JSON.stringify(players);
    if (!force && sig === lastSig) return;
    if (!force && VIEW === 'player' && document.activeElement && document.activeElement.id === 'nmin') return;
    lastSig = sig;
    const keepMins = document.getElementById('mins') && document.getElementById('mins').value;
    if (VIEW === 'player') { const nb = !!(me() && shopPart() && released(shopPart()).length); if (nb !== fitNews) { fitNews = nb; fit(); }
      $app.innerHTML = playerView() + overlayHTML() + (me() ? flashHTML() + newsTakeHTML() + wbHTML() : ''); bindPlayer(); ui.pop = null;
      const a2 = $app.querySelector('.anim2'), sc = $app.querySelector('.scroll');
      if (a2 && sc) { const d = parseFloat(a2.style.animationDelay) || 0; setTimeout(() => sc.scrollTo({ top: a2.offsetTop - 60, behavior: d ? 'smooth' : 'auto' }), d * 1000 + 200); }
      runFx(true); }
    else if (VIEW === 'board') { $app.innerHTML = boardView(); const sb = document.getElementById('snd'); if (sb) sb.onclick = () => { SFX.unlock(); setTimeout(() => { SFX.fanfare(); render(true); }, 150); }; runFx(false); }
    else { $app.innerHTML = hostView(); if (keepMins) document.getElementById('mins').value = keepMins; bindHost(); }
  }
  setInterval(() => { const t = left(); if (t == null) return; document.querySelectorAll('.cdi').forEach(el => el.textContent = fmtT(t)); }, 500);
  /* Gamma events that arrive on a clock: breaking news (phones + projector) and the whistleblower's private pop-up */
  let relKey;
  setInterval(() => {
    if (VIEW === 'host') return;
    const part = shopPart(), rel = part ? released(part).length : 0, key = ph() + ':' + rel;
    if (key !== relKey) { const first = relKey === undefined; relKey = key;
      if (!first && rel > 0 && (ph() === 'p1' || ph() === 'p2')) {
        if (VIEW === 'player' && me()) { ui.newsTake = { part, i: rel - 1 }; ui.newsI = rel - 1; guard(); SFX.news(); buzz([90, 60, 90]); }
        if (VIEW === 'board') { ui.bTake = { part, i: rel - 1 }; SFX.news(); clearTimeout(ui.bT); ui.bT = setTimeout(() => { ui.bTake = null; render(true); }, 10000); } }
      if (rel === 0) { ui.newsI = 0; ui.newsTake = null; }
      render(true); }
    if (VIEW === 'player') { const w = wbLive(); if (w !== ui.wbOn) { ui.wbOn = w; guard(); if (w) { SFX.heartbeat(2, 0); buzz([200, 100, 200, 100, 200]); } render(true); } }
  }, 500);
  let lastPhase = null;
  DB.on(BASE + '/state', s => { state = s || { phase: 'lobby' }; if (lastPhase && lastPhase !== state.phase) { ui.overlay = null; buzz(50); } lastPhase = state.phase; render(); });
  DB.on(BASE + '/players', s => { players = s || {}; render(); });
  if (VIEW === 'player') DB.on(BASE + '/names', s => { names = s || {}; render(); });
})();
