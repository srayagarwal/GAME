/* Agent Tycoon · phone edition. One page, three views: player (default), ?board, ?host=KEY */
(function () {
  const G = window.TYCOON, cfg = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || cfg.room || 'main').replace(/[^\w-]/g, ''), BASE = 'games/' + ROOM;
  const VIEW = Q.has('board') ? 'board' : (Q.get('host') && Q.get('host') === cfg.hostKey ? 'host' : 'player');
  const NAMES = [['Alert','🚨'],['Anchor','⚓'],['Atlas','🗺️'],['Audit','🧾'],['Beacon','🗼'],['Bear','🐻'],['Check','✅'],['Clear','💎'],['Comet','☄️'],['Compass','🧭'],
    ['Eagle','🦅'],['Echo','🔊'],['Fair','⚖️'],['Fox','🦊'],['Gate','⛩️'],['Guard','💂'],['Hawk','🪶'],['Human','🙋'],['Key','🗝️'],['Koala','🐨'],
    ['Lion','🦁'],['Lock','🔒'],['Moon','🌙'],['Ninja','🥷'],['Nova','✨'],['Orbit','🪐'],['Owl','🦉'],['Owner','👑'],['Panda','🐼'],['Pilot','🧑‍✈️'],
    ['Pixel','👾'],['Proof','📜'],['Radar','📡'],['Ranger','🤠'],['Robot','🤖'],['Rocket','🚀'],['Safe','🦺'],['Shark','🦈'],['Shield','🛡️'],['Sky','☁️'],
    ['Spark','⚡'],['Star','⭐'],['Sun','☀️'],['Test','🧪'],['Tiger','🐯'],['Trust','🤝'],['Truth','🔍'],['Watch','⌚'],['Wolf','🐺'],['Zebra','🦓']];
  const EMO = {}; NAMES.forEach(([n, e]) => EMO[n] = e);
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
  const scoreOf = p => G.score({ q1: p.q1, q2: p.q2, has2: has2(p) }, fired(), at('d6'));
  const fmtT = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const left = () => state.deadline ? state.deadline - DB.now() : null;
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const cardHTML = (k, extra = '', st = '') => { const [, e, n, f, cost, s] = G.CARD[k]; const col = s === 'r' ? 'var(--red)' : s === 'f' ? 'var(--amber)' : 'var(--navy)';
    return `<div class="pc ${extra}" style="${st}"><div class="cn" style="color:${col}"><b>${cost}</b><span>${s === 'r' ? '♦' : s === 'f' ? '♣' : '♠'}</span></div><div class="ce">${e}</div><div class="nm" style="color:${col}">${n}</div><div class="fx">${f}</div></div>`; };
  const table = inner => `<div class="ph"><div class="fl"></div><div class="brand">NBD</div>${inner}</div>${DB.mode === 'demo' ? '<div class="demo">DEMO MODE · this browser only</div>' : ''}`;

  /* ======================= PLAYER ======================= */
  const PIDK = 'tycoon_pid_' + ROOM;
  let pid = store.get(PIDK); if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set(PIDK, pid); }
  let ui = { pick: null, overlay: null, pop: null, seen: {} }, lastSig = '';
  const me = () => players[pid] || null;
  const partOf = () => (ph() === 'p2' || ph() === 'p2x') ? 2 : 1;
  async function join(name) {
    const owner = await DB.tx(BASE + '/names/' + name, cur => cur ? undefined : pid);
    const now = await DB.get(BASE + '/names/' + name);
    if (now !== pid) { ui.overlay = { t: 'rejoin', name, owner: now }; render(true); return; }
    await DB.set(BASE + '/players/' + pid, { name, q1: {}, q2: {}, b1: 0, b2: 0, l1: false, l2: false, t: DB.now() });
    buzz(30);
  }
  function rejoin(owner) { pid = owner; store.set(PIDK, pid); ui.overlay = null; render(true); }
  function shopData() {
    const part = partOf(), m = me(), q = Object.assign({}, m['q' + part] || {}), b = m['b' + part] || 0;
    const listP = part === 1 ? G.P1 : G.P2, budget = part === 1 ? G.BUDGET1 : G.BUDGET2;
    const sp = G.spent(q, listP); return { part, q, b, listP, budget, chips: budget + b, sp, leftC: budget + b - sp };
  }
  function deal(k) {
    const d = shopData(), c = G.CARD[k]; const n = d.q[k] || 0;
    if (n >= c[6]) { toast('No more ' + c[2] + ' cards on the table'); return; }
    if (d.leftC < c[4]) { const bar = document.querySelector('.bar'); if (bar) { bar.classList.remove('shake'); void bar.offsetWidth; bar.classList.add('shake'); } toast('Not enough chips. Tap +10 to borrow from the bank.'); buzz([40, 40, 40]); return; }
    players[pid]['q' + d.part] = Object.assign({}, d.q, { [k]: n + 1 }); ui.pop = k; buzz(15);
    DB.update(BASE + '/players/' + pid, { ['q' + d.part + '/' + k]: n + 1 }); render(true);
  }
  function undeal(k) {
    const d = shopData(); const n = d.q[k] || 0; if (!n) return;
    players[pid]['q' + d.part] = Object.assign({}, d.q, { [k]: n - 1 }); ui.pop = null;
    DB.update(BASE + '/players/' + pid, { ['q' + d.part + '/' + k]: n - 1 }); render(true);
  }
  function borrow() {
    const d = shopData(); players[pid]['b' + d.part] = d.b + 10; buzz(25);
    DB.update(BASE + '/players/' + pid, { ['b' + d.part]: d.b + 10 }); ui.overlay = { t: 'iou' }; render(true);
  }
  function lock() { const part = partOf(); players[pid]['l' + part] = true; ui.overlay = null; DB.update(BASE + '/players/' + pid, { ['l' + part]: true }); buzz(60); render(true); }

  function vJoin() {
    const taken = names;
    return table(`<div class="logo">Agent<br><em>Tycoon</em></div><div class="tag">You run <b>Nova</b>, NBD Bank’s new AI agent.<br>Grow revenue. Don’t get burned.</div>
      <div class="lab">PICK YOUR CODENAME</div><div class="names">${NAMES.map(([n, e]) => `<button class="name ${ui.pick === n ? 'sel' : ''} ${taken[n] && taken[n] !== pid ? 'tk' : ''}" data-name="${n}">${e} ${n}</button>`).join('')}</div>
      <div class="note" style="margin-bottom:12px">Faded names are taken. No PIN: this phone remembers you.</div>
      <button class="btn" id="joinb" ${ui.pick ? '' : 'disabled'}>${ui.pick ? 'I’m ' + esc(ui.pick) : 'Pick a codename'}</button>`);
  }
  function vClosed(msg) { return table(`<div class="logo">Agent<br><em>Tycoon</em></div><div class="mid"><div class="ls">${msg}</div></div>`); }
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
    const piles = d.listP.map(c => { const k = c[0], left = c[6] - (d.q[k] || 0);
      return `<div class="pile ${left <= 0 ? 'empty' : ''}" data-pile="${k}">${Array.from({ length: Math.max(0, left - 1) }, (_, i) => `<div class="back" style="top:${i * 4}px"></div>`).join('')}${cardHTML(k, '', `top:${Math.max(0, left - 1) * 4}px`)}${d.q[k] ? `<div class="cnt">×${d.q[k]}</div>` : ''}</div>`; }).join('');
    const t = left();
    return table(`${topBar('PART ' + d.part + (t != null ? ' · <span class="cdi">' + fmtT(t) + '</span>' : ''))}${chipBar(d)}
      <div class="lab">${d.part === 1 ? '♦ REVENUE · ♠ CONTROLS' : '♦ REVENUE · ♠ CONTROLS · ♣ ONE-OFF FIXES'} · HOLD TO FLIP</div><div class="tab">${piles}</div>
      ${handHTML(d.q, d.listP, 'YOUR HAND')}<button class="btn" id="lockb">Lock my hand</button>`);
  }
  function vLocked(closed) {
    const part = partOf(), L = list(), n = L.filter(p => p['l' + part]).length, t = left();
    const d = me()['q' + part] || {}, listP = part === 1 ? G.P1 : G.P2;
    return table(`${topBar(closed ? 'SHOP CLOSED' : 'PART ' + part)}<div class="mid"><div class="lk">🔒</div><div class="lt">Hand locked</div>
      <div class="ls">${closed ? 'Eyes on the screen.<br>Nova goes live…' : 'Eyes on the screen.<br>The shop closes in'}</div>${!closed && t != null ? `<div class="cd cdi">${fmtT(t)}</div>` : '<div style="height:18px"></div>'}
      <div class="ls"><span id="lockn">${n}</span> of ${L.length} players locked</div><div class="prog"><i style="width:${L.length ? 100 * n / L.length : 0}%"></i></div></div>${handHTML(d, listP, 'YOUR HAND')}`);
  }
  function incRow(id, r, q1, q2, delay) {
    const [, e, name, , , ctrl] = G.INC[id]; const h = r.hits.find(x => x.id === id);
    if (!h) return `<div class="inc down" style="animation-delay:${delay}s">FACE DOWN · DIDN’T HAPPEN</div>`;
    const lvl = h.v <= 0 ? 2 : Math.min(2, G.shield(id, G.full(q1, G.P1), G.full(q2, G.P2)));
    const mine = []; const add = (k, n) => { for (let i = 0; i < Math.min(n || 0, 2); i++) mine.push(k); };
    const c = G.CTRL[id]; if (c) add(c, (q1[c] !== undefined ? q1[c] : q2[c]));
    if (id === 'S_EMAIL') { add('PE', q1.PE); add('LPE', q2.LPE); } if (id === 'S_AUDIT') { add('AU', q1.AU); add('GO', q1.GO ? 1 : 0); add('LGO', q2.LGO); add('LAU', q2.LAU); }
    const cls = lvl >= 2 ? 'safe' : lvl === 1 ? 'half' : 'hit';
    const txt = lvl >= 2 ? `Your cards stopped it. <b>Blocked</b>` : lvl === 1 ? `Your card caught part of it. Halved: <b>−${h.v}</b>` : `Nothing stopped it (${esc(ctrl)}). Full hit: <b>−${h.v}</b>`;
    return `<div class="inc ${cls}" style="animation-delay:${delay}s"><div class="it"><span class="ie">${e}</span>${esc(name)}</div><div class="id">${txt}</div>${mine.length ? `<div class="mc">${mine.slice(0, 3).map(k => cardHTML(k)).join('')}</div>` : ''}</div>`;
  }
  function rankOf(key, filt) { const L = list().filter(filt || (() => true)).map(p => [p.id, scoreOf(p)[key]]).sort((a, b) => b[1] - a[1]); return [L.findIndex(x => x[0] === pid) + 1, L.length]; }
  function vReveal(day) {
    const m = me(), r = scoreOf(m), q1 = m.q1 || {}, q2 = m.q2 || {};
    const ids = day === 1 ? ['JB', 'RUN', 'BIG', 'LEAK'] : ['S_EMAIL', 'S_AUDIT', 'FAIR', 'INV', 'DRIFT', 'DEEP'];
    const key = 'rev' + day + ph(), anim = !ui.seen[key]; ui.seen[key] = true; if (anim) buzz([80, 60, 160]);
    const order = ids.slice().sort((a, b) => (r.hits.some(h => h.id === b) ? 1 : 0) - (r.hits.some(h => h.id === a) ? 1 : 0));
    const rows = order.map((id, i) => incRow(id, r, q1, q2, anim ? 0.3 + i * 0.7 : 0)).join('');
    const sd = anim ? 0.6 + ids.length * 0.7 : 0;
    if (day === 1) {
      const [rk, of] = rankOf('mid');
      return table(`${topBar('DAY 1 · HOUR 6')}<div class="scroll"><div class="h2">Nova’s first night</div><div class="incs ${anim ? 'anim' : ''}">${rows}</div>
        <div class="anim2" style="animation-delay:${sd}s"><div class="sc" style="margin-top:16px"><div class="scl">YOUR HOUR 6 SCORE</div><div class="scv">${r.mid}</div><div class="scr">Rank ${rk} of ${of}</div></div>
        <div class="calc"><div><span>Revenue</span><b>${r.rev1}</b></div><div><span>Incident hits</span><b class="r">−${r.pen1}</b></div>${r.bust1 ? `<div><span>Over budget</span><b class="r">−${r.bust1}</b></div>` : ''}<div><span>Named owner</span><b>×${r.gov1}</b></div><div><span>Trust damage</span><b>÷${r.trust1}</b></div></div>
        <div class="tease">😴 Something from Day 1 is still asleep…</div></div></div>`);
    }
    const fin = ph() === 'cfo', [rk, of] = fin ? rankOf('fin', p => !scoreOf(p).dq) : rankOf('fin');
    const verdict = fin ? (r.dq ? `<div class="verdict bad"><b>❌ Disqualified by the CFO</b>You spent ${r.total} against an annual AI budget of ${G.TOTAL}. IOUs count.</div>`
      : `<div class="verdict ok"><b>✓ CFO review: on budget</b>Spent ${r.total} of ${G.TOTAL}.</div>`) : '';
    return table(`${topBar(fin ? 'CFO REVIEW' : 'DAY 6 · FINAL')}<div class="scroll"><div class="h2">The sleepers wake up</div><div class="incs ${anim ? 'anim' : ''}">${rows}</div>
      <div class="anim2" style="animation-delay:${sd}s"><div class="sc" style="margin-top:16px"><div class="scl">FINAL SCORE</div><div class="scv">${r.fin}</div><div class="scr">${fin && r.dq ? 'Not ranked' : `Rank ${rk} of ${of}${fin ? ' on budget' : ''}`}</div></div>
      <div class="calc"><div><span>Revenue</span><b>${r.rev}</b></div><div><span>Incident hits</span><b class="r">−${r.pen}</b></div>${r.bust ? `<div><span>Over budget</span><b class="r">−${r.bust}</b></div>` : ''}<div><span>Owner</span><b>×${r.gov}</b></div><div><span>AI literacy</span><b class="gtxt">+${r.lit}</b></div><div><span>Trust damage (${r.n} hits)</span><b>÷${r.trust}</b></div></div>
      ${verdict}${fin ? '' : '<div class="tease">Wait for the CFO…</div>'}</div></div>`);
  }
  function overlayHTML() {
    const o = ui.overlay; if (!o) return '';
    if (o.t === 'flip') { const c = G.CARD[o.k]; return `<div class="ov" data-close="1"><div class="flip"><div class="fh">${c[1]}</div><h3>${esc(c[2])}</h3><div class="fs">${c[4]} chips · ${esc(c[3])}</div>${c[7].map((t, i) => `<div class="cp ${/Wasted/.test(t) ? 'dim' : ''}"><b>×${i + 1}</b>${esc(t)}</div>`).join('')}</div></div>`; }
    if (o.t === 'iou') { const d = shopData(); return `<div class="ov" data-close="1"><div class="iou"><div class="iouh">IOU · NBD BANK</div><div class="iouv">${d.b} chips</div><div class="iout">${esc(me().name)} borrowed ${Array(d.b / 10).fill(10).join(' + ')}.<br>Charged to NBD Bank’s<br>annual AI budget.</div><div class="sig">${esc(me().name)}</div></div></div>`; }
    if (o.t === 'lock') { const d = shopData(); return `<div class="ov"><div class="sheet"><h3>Lock your hand?</h3><p>You can’t change your cards after locking.${d.leftC > 0 ? `<br>You still have <b style="color:var(--gold)">${d.leftC} chips</b> unspent.` : ''}</p><div class="row2"><button class="btn ghost" data-close="1">Keep playing</button><button class="btn" id="lockyes">Lock it</button></div></div></div>`; }
    if (o.t === 'rejoin') return `<div class="ov"><div class="sheet"><h3>${esc(o.name)} is taken</h3><p>Is this you on a new phone? Rejoin to carry on with your cards.</p><div class="row2"><button class="btn ghost" data-close="1">Pick another</button><button class="btn" id="rejoinb" data-owner="${esc(o.owner)}">That’s me</button></div></div></div>`;
    return '';
  }
  function playerView() {
    const m = me(), p = ph();
    if (!m) return (p === 'lobby' || p === 'p1') ? vJoin() : vClosed('The game has already started.<br>Watch the big screen: you can join the next one.');
    if (p === 'lobby') return table(`${topBar('LOBBY')}<div class="mid"><div class="lk">${EMO[m.name] || '🙂'}</div><div class="lt">You’re in, ${esc(m.name)}</div><div class="ls">Keep this page open.<br>The shop opens when the host is ready.</div></div>`);
    if (p === 'p1' || p === 'p2') return m['l' + partOf()] ? vLocked(false) : vShop();
    if (p === 'p1x' || p === 'p2x') return vLocked(true);
    if (p === 'd1') return vReveal(1);
    return vReveal(6);
  }
  function playerSig() {
    const m = me(), p = ph();
    let s = p + '|' + JSON.stringify(m) + '|' + JSON.stringify(ui.overlay) + '|' + ui.pick + '|' + (state.d1 || '') + (state.d6 || '') + '|' + state.deadline;
    if (!m) s += JSON.stringify(names);
    if (m && (p === 'p1x' || p === 'p2x' || (m['l' + partOf()] && (p === 'p1' || p === 'p2')))) s += '|' + Object.keys(players).length;
    if (p === 'd1' || p === 'd6' || p === 'cfo') s += '|' + Object.keys(players).length;
    return s;
  }
  function bindPlayer() {
    $app.querySelectorAll('[data-name]').forEach(b => b.onclick = () => { const n = b.dataset.name; if (names[n] && names[n] !== pid) { ui.overlay = { t: 'rejoin', name: n, owner: names[n] }; } else ui.pick = n; render(true); });
    const jb = document.getElementById('joinb'); if (jb) jb.onclick = () => ui.pick && join(ui.pick);
    const rb = document.getElementById('rejoinb'); if (rb) rb.onclick = () => rejoin(rb.dataset.owner);
    const bw = document.getElementById('borrow'); if (bw) bw.onclick = borrow;
    const lb = document.getElementById('lockb'); if (lb) lb.onclick = () => { ui.overlay = { t: 'lock' }; render(true); };
    const ly = document.getElementById('lockyes'); if (ly) ly.onclick = lock;
    $app.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => { ui.overlay = null; render(true); }));
    const press = (el, tap, hold) => { let t, held = false;
      el.addEventListener('pointerdown', () => { held = false; t = setTimeout(() => { held = true; buzz(20); hold(); }, 430); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, e => { clearTimeout(t); if (ev === 'pointerup' && !held) tap(); }));
      el.addEventListener('contextmenu', e => e.preventDefault()); };
    $app.querySelectorAll('[data-pile]').forEach(el => { const k = el.dataset.pile; press(el, () => deal(k), () => { ui.overlay = { t: 'flip', k }; render(true); }); });
    $app.querySelectorAll('[data-hand] .pc').forEach(el => { const k = el.parentNode.dataset.hand; press(el, () => undeal(k), () => { ui.overlay = { t: 'flip', k }; render(true); }); });
  }

  /* ======================= BOARD ======================= */
  const playerURL = () => location.origin + location.pathname + (ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '');
  function qrSVG(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); }
  function exposure(id) { let bl = 0, hf = 0, ex = 0; list().forEach(p => { const n = G.shield(id, G.full(p.q1, G.P1), G.full(p.q2, G.P2)); if (n >= 2) bl++; else if (n === 1) hf++; else ex++; }); return { bl, hf, ex }; }
  function boardIncs(ids, on) {
    return ids.map((id, i) => { const [, e, n] = G.INC[id];
      if (on.indexOf(id) < 0) return `<div class="binc down" style="animation-delay:${i * .5}s"><div class="e">${e}</div><div class="bn">${esc(n)}</div><div class="bs">didn’t fire</div></div>`;
      const x = exposure(id); return `<div class="binc" style="animation-delay:${i * .5}s"><div class="e">${e}</div><div class="bn">${esc(n)}</div><div class="bs">💥 ${x.ex} full hit · <span class="a">½ ${x.hf} halved</span> · <span class="g">🛡️ ${x.bl} blocked</span></div></div>`; }).join('');
  }
  function lbRows(rows, key, strike) { return rows.map((x, i) => `<tr class="${strike && x.r.dq ? 'dq' : ''} ${!strike && i < 3 ? 'pod' : ''}"><td>${i + 1}</td><td>${EMO[x.p.name] || ''} ${esc(x.p.name)}</td><td class="s">${at('d6') ? 'spent ' + x.r.total : ''}</td><td>${x.r[key]}</td></tr>`).join(''); }
  function boardView() {
    const p = ph(), L = list(), url = playerURL();
    let inner = '';
    if (p === 'lobby') inner = `<div class="bjoin"><div class="qrb">${qrSVG(url)}</div><div><div class="blogo">Agent<br><em>Tycoon</em></div><div class="burl">Scan to play · ${esc(url.replace(/^https?:\/\//, ''))}</div>
      <div class="bcount"><b>${L.length}</b> players joined</div><div class="bnames">${L.slice(-40).map(x => `<span>${EMO[x.name] || ''} ${esc(x.name)}</span>`).join('')}</div></div></div>`;
    else if (p === 'p1' || p === 'p2' || p === 'p1x' || p === 'p2x') { const part = p[1], n = L.filter(x => x['l' + part]).length, t = left(), closed = p.endsWith('x');
      inner = `<div class="bh">Part ${part} · <em>${closed ? 'the shop is closed' : 'the shop is open'}</em></div><div class="bshop">${p === 'p1' ? `<div class="qrb" style="padding:1.4vh">${qrSVG(url).replace('<svg', '<svg style="width:26vh;height:26vh"')}</div>` : ''}
      <div>${!closed && t != null ? `<div class="bcd cdi">${fmtT(t)}</div>` : `<div class="bcd" style="font-size:12vh">🔒</div>`}<div class="bcount"><b id="bn">${n}</b> of ${L.length} hands locked</div><div class="bprog"><i style="width:${L.length ? 100 * n / L.length : 0}%"></i></div>
      <div class="bsub" style="margin:1vh 0 0">${part === '1' ? 'Budget: 100 chips' : 'Budget: 80 chips'} · borrowing is allowed</div></div></div>`; }
    else if (p === 'd1') { const rows = L.map(x => ({ p: x, r: scoreOf(x) })).sort((a, b) => b.r.mid - a.r.mid).slice(0, 8);
      inner = `<div class="bh">Day 1 · <em>Nova’s first night</em></div><div class="split"><div class="bincs four">${boardIncs(['JB', 'RUN', 'BIG', 'LEAK'], state.d1 || [])}</div><div><div class="lbh">HOUR 6 LEADERBOARD</div><table class="lb">${lbRows(rows, 'mid')}</table></div></div>`; }
    else if (p === 'd6') { const rows = L.map(x => ({ p: x, r: scoreOf(x) })).sort((a, b) => b.r.fin - a.r.fin).slice(0, 8);
      inner = `<div class="bh">Day 6 · <em>the sleepers wake up</em></div><div class="split"><div class="bincs">${boardIncs(['S_EMAIL', 'S_AUDIT', 'FAIR', 'INV', 'DRIFT', 'DEEP'], state.d6 || [])}</div><div><div class="lbh">FINAL LEADERBOARD · BEFORE REVIEW</div><table class="lb">${lbRows(rows, 'fin')}</table></div></div>`; }
    else { const all = L.map(x => ({ p: x, r: scoreOf(x) })).sort((a, b) => b.r.fin - a.r.fin), ok = all.filter(x => !x.r.dq), dq = all.filter(x => x.r.dq);
      const med = ['🥇', '🥈', '🥉'];
      inner = `<div class="bh">Official leaderboard · <em>after CFO review</em></div><div class="cfo3">${ok.slice(0, 3).map((x, i) => `<div class="pod"><div class="m">${med[i]}</div><div class="n">${EMO[x.p.name] || ''} ${esc(x.p.name)}</div><div class="v">${x.r.fin}</div><div class="s">spent ${x.r.total} of ${G.TOTAL}</div></div>`).join('')}</div>
      <div class="split" style="grid-template-columns:1fr 1fr"><div><div class="lbh">ON BUDGET</div><table class="lb">${ok.slice(3, 9).map((x, i) => `<tr><td>${i + 4}</td><td>${EMO[x.p.name] || ''} ${esc(x.p.name)}</td><td class="s">spent ${x.r.total}</td><td>${x.r.fin}</td></tr>`).join('')}</table></div>
      <div><div class="lbh">DISQUALIFIED BY THE CFO · ${dq.length} PLAYERS</div><table class="lb">${dq.slice(0, 6).map(x => `<tr class="dq"><td>❌</td><td>${EMO[x.p.name] || ''} ${esc(x.p.name)}</td><td class="s">spent ${x.r.total}</td><td>${x.r.fin}</td></tr>`).join('')}</table>
      ${dq.length ? `<div class="dqline">Top raw score: <b>${esc(dq[0].p.name)} ${dq[0].r.fin}</b>, spent ${dq[0].r.total} of ${G.TOTAL}. No budget, no bonus.</div>` : ''}</div></div><div class="stamp">CFO REVIEW</div>`; }
    return `<div class="bd"><div class="oval"></div><div class="bin">${inner}</div></div>${DB.mode === 'demo' ? '<div class="demo">DEMO MODE</div>' : ''}`;
  }
  const boardSig = () => ph() + '|' + JSON.stringify(state) + '|' + (['lobby'].includes(ph()) ? Object.values(players).map(x => x.name).join() : JSON.stringify(players));

  /* ======================= HOST ======================= */
  const STEPS = [['Open Part 1', 'lobby', 'p1'], ['Close Part 1', 'p1', 'p1x'], ['Reveal Day 1', 'p1x', 'd1'], ['Open Part 2', 'd1', 'p2'], ['Close Part 2', 'p2', 'p2x'], ['Reveal Day 6', 'p2x', 'd6'], ['CFO review', 'd6', 'cfo']];
  async function step(i) {
    const [, from, to] = STEPS[i]; if (ph() !== from) return; const L = list(), upd = { phase: to, t: DB.now() };
    const mins = parseFloat((document.getElementById('mins') || {}).value) || cfg.shopMinutes || 6;
    if (to === 'p1' || to === 'p2') upd.deadline = DB.now() + mins * 60000; else upd.deadline = null;
    if (to === 'p1x') { const u = {}; L.forEach(p => { if (!p.l1) u[p.id + '/l1'] = true; }); if (Object.keys(u).length) await DB.update(BASE + '/players', u); }
    if (to === 'p2x') { const u = {}; L.forEach(p => { if (!p.l2 && Object.values(p.q2 || {}).some(v => v > 0)) u[p.id + '/l2'] = true; }); if (Object.keys(u).length) await DB.update(BASE + '/players', u); }
    if (to === 'd1') upd.d1 = G.pick(1, L.map(p => ({ q1: p.q1, q2: {} })));
    if (to === 'd6') upd.d6 = G.pick(2, L.map(p => ({ q1: p.q1, q2: has2(p) ? p.q2 : {} })));
    await DB.update(BASE + '/state', upd);
  }
  async function back() { const i = PHASES.indexOf(ph()); if (i <= 0) return; if (!confirm('Go back to “' + PHASES[i - 1] + '”? Players will see that screen again.')) return; await DB.update(BASE + '/state', { phase: PHASES[i - 1], deadline: null }); }
  async function reset() { if (!confirm('Start a NEW game in room “' + ROOM + '”? This deletes all players and cards in this room.')) return; await DB.set(BASE, { state: { phase: 'lobby', t: DB.now() } }); }
  async function addTime(m) { if (!state.deadline) return; await DB.update(BASE + '/state', { deadline: Math.max(DB.now(), state.deadline) + m * 60000 }); }
  function exportCSV() {
    const L = list(), cols = ['name'].concat(G.P1.map(c => 'P1_' + c[0]), ['P1_spent', 'P1_borrowed'], G.P2.map(c => 'P2_' + c[0]), ['P2_spent', 'P2_borrowed', 'played_P2', 'hour6', 'final', 'total_spent', 'cfo_disqualified', 'incidents']);
    const rows = L.map(p => { const r = scoreOf(p); return [p.name].concat(G.P1.map(c => (p.q1 || {})[c[0]] || 0), [r.s1, p.b1 || 0], G.P2.map(c => (p.q2 || {})[c[0]] || 0), [r.s2, p.b2 || 0, has2(p) ? 'yes' : 'no', r.mid, at('d6') ? r.fin : '', r.total, r.dq ? 'yes' : 'no', fired().join(' ')]); });
    const csv = [cols].concat(rows).map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'agent-tycoon-' + ROOM + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  }
  function hostView() {
    const L = list(), p = ph(), cur = PHASES.indexOf(p), t = left();
    const part = p === 'p2' || p === 'p2x' ? 2 : 1, locked = L.filter(x => x['l' + part]).length;
    const btns = STEPS.map(([lab, from], i) => { const done = PHASES.indexOf(from) < cur, go = from === p;
      return `<button class="hb ${done ? 'dn' : ''} ${go ? 'go' : ''}" data-step="${i}" ${go ? '' : 'disabled'}><span>${i + 1} · ${lab}</span><i>${done ? '✓' : '▶'}</i></button>`; }).join('');
    const rows = L.map(x => ({ x, r: scoreOf(x) })).sort((a, b) => (at('d6') ? b.r.fin - a.r.fin : b.r.mid - a.r.mid));
    const url = playerURL(), burl = location.origin + location.pathname + '?board' + (ROOM !== (cfg.room || 'main') ? '&room=' + ROOM : '');
    return `<div class="host"><h1>Agent Tycoon · <em>host</em></h1><div class="hs">Room <b>${esc(ROOM)}</b> · phase <b>${p}</b> · ${L.length} players · ${locked} locked${t != null ? ' · shop timer <b class="cdi">' + fmtT(t) + '</b>' : ''}${DB.mode === 'demo' ? ' · <b style="color:var(--coral)">DEMO MODE (no Firebase config)</b>' : ''}</div>
      <div class="hgrid">${btns}<button class="hb" id="exp"><span>⬇ Export results (CSV)</span><i></i></button></div>
      <div class="hbox"><h3>SHOP TIMER</h3><div class="hrow">Minutes for the next shop round <input id="mins" type="number" min="1" max="30" value="${cfg.shopMinutes || 6}"> <button class="sbtn" data-add="1">+1 min now</button><button class="sbtn" data-add="-1">−1 min now</button></div></div>
      ${state.d1 ? `<div class="hbox"><h3>INCIDENTS FIRED</h3><div style="font-weight:700;line-height:1.7">Day 1: ${(state.d1 || []).map(i => G.INC[i][1] + ' ' + G.INC[i][2]).join(' · ')}${state.d6 ? '<br>Day 6: ' + state.d6.map(i => G.INC[i][1] + ' ' + G.INC[i][2]).join(' · ') : ''}</div></div>` : ''}
      <div class="hbox links"><h3>LINKS</h3><div style="line-height:1.9;font-size:14px">Players (QR): <a href="${url}" target="_blank">${esc(url)}</a><br>Projector: <a href="${burl}" target="_blank">${esc(burl)}</a></div></div>
      <div class="hbox"><h3>PLAYERS</h3><table class="htab"><tr><th>NAME</th><th>P1</th><th>P2</th><th class="n">SPENT</th><th class="n">IOU</th><th class="n">HOUR 6</th><th class="n">FINAL</th></tr>
      ${rows.map(({ x, r }) => `<tr><td>${EMO[x.name] || ''} ${esc(x.name)}</td><td>${x.l1 ? '🔒' : '…'}</td><td>${at('p2') ? (x.l2 ? '🔒' : '…') : ''}</td><td class="n">${r.total}${r.total > G.TOTAL ? ' ❌' : ''}</td><td class="n">${(x.b1 || 0) + (x.b2 || 0) || ''}</td><td class="n">${at('d1') ? r.mid : ''}</td><td class="n">${at('d6') ? r.fin : ''}</td></tr>`).join('') || '<tr><td colspan="7" style="color:var(--lav)">No players yet</td></tr>'}</table></div>
      <div class="hbox"><h3>SAFETY</h3><div class="hrow"><button class="sbtn" id="back">↩ Go back one step</button><button class="sbtn red" id="reset">Start a new game (clears this room)</button></div></div></div>`;
  }
  function bindHost() {
    $app.querySelectorAll('[data-step]').forEach(b => b.onclick = () => step(+b.dataset.step));
    $app.querySelectorAll('[data-add]').forEach(b => b.onclick = () => addTime(+b.dataset.add));
    document.getElementById('exp').onclick = exportCSV; document.getElementById('back').onclick = back; document.getElementById('reset').onclick = reset;
  }

  function fit() {
    const W = Math.min(window.innerWidth, 480), H = window.innerHeight;
    const byW = (W - 84) / 4, byH = (H - 350) / (3 * 1.3 + 1.3 * 0.8);
    const cw = Math.max(48, Math.min(74, byW, byH));
    document.documentElement.style.setProperty('--cw', cw + 'px'); document.documentElement.style.setProperty('--ch', cw * 1.3 + 'px');
    document.documentElement.style.setProperty('--hw', Math.round(cw * 0.8) + 'px'); document.documentElement.classList.toggle('sm', cw < 62);
  }
  fit(); window.addEventListener('resize', () => { fit(); render(true); });
  /* ======================= LOOP ======================= */
  function render(force) {
    let sig = VIEW === 'player' ? playerSig() : VIEW === 'board' ? boardSig() : JSON.stringify(state) + JSON.stringify(players);
    if (!force && sig === lastSig) return; lastSig = sig;
    const keepMins = document.getElementById('mins') && document.getElementById('mins').value;
    if (VIEW === 'player') { $app.innerHTML = playerView() + overlayHTML(); bindPlayer(); ui.pop = null;
      const a2 = $app.querySelector('.anim2'), sc = $app.querySelector('.scroll');
      if (a2 && sc) { const d = parseFloat(a2.style.animationDelay) || 0; setTimeout(() => sc.scrollTo({ top: a2.offsetTop - 60, behavior: d ? 'smooth' : 'auto' }), d * 1000 + 200); } }
    else if (VIEW === 'board') $app.innerHTML = boardView();
    else { $app.innerHTML = hostView(); if (keepMins) document.getElementById('mins').value = keepMins; bindHost(); }
  }
  setInterval(() => { const t = left(); if (t == null) return; document.querySelectorAll('.cdi').forEach(el => el.textContent = fmtT(t)); }, 500);
  let lastPhase = null;
  DB.on(BASE + '/state', s => { state = s || { phase: 'lobby' }; if (lastPhase && lastPhase !== state.phase) { ui.overlay = null; buzz(50); } lastPhase = state.phase; render(); });
  DB.on(BASE + '/players', s => { players = s || {}; render(); });
  if (VIEW === 'player') DB.on(BASE + '/names', s => { names = s || {}; render(); });
})();
