/* Defend the Agent · Proximus × Infosys booth game. One page, three views: player (default), ?board (projector), ?host=KEY */
(function () {
  const P = window.PX, cfg = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || cfg.room || 'conf').replace(/[^\w-]/g, ''), BASE = 'games/proximusinfy-' + ROOM;
  const VIEW = Q.has('board') ? 'board' : (Q.get('host') && Q.get('host') === cfg.hostKey ? 'host' : 'player');
  const $app = document.getElementById('app'), SECS = +Q.get('secs') || cfg.roundSeconds || 120;
  if (Q.get('host') && VIEW !== 'host') { $app.innerHTML = '<div class="ph"><div class="boot">Wrong host key.</div></div>'; return; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STO = () => DB.mode === 'demo' ? sessionStorage : localStorage;
  const store = { get(k) { try { return STO().getItem(k); } catch (e) { return null; } }, set(k, v) { try { STO().setItem(k, v); } catch (e) {} } };
  const clean = s => String(s || '').replace(/[<>.#$\[\]\/\\"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const keyOf = n => clean(n).toLowerCase().replace(/\s/g, '');
  const h53 = s => { let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ a >>> 16, 2246822507) ^ Math.imul(b ^ b >>> 13, 3266489909); b = Math.imul(b ^ b >>> 16, 2246822507) ^ Math.imul(a ^ a >>> 13, 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36); };
  const pc = x => Math.round(x * 100);
  const fmtT = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };
  const sfx = (n, ...a) => { try { window.SFX && SFX[n] && SFX[n](...a); } catch (e) {} };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const playURL = () => location.origin + location.pathname + (Q.get('room') ? '?room=' + ROOM : '');
  let state = { open: false }, pub = {};
  const rows = () => Object.keys(pub).map(id => Object.assign({ id }, pub[id])).filter(r => r.done).sort((a, b) => b.sc - a.sc || a.t - b.t);
  function lbHTML(list, mine, n) {
    return list.slice(0, n).map((r, i) => `<div class="lb ${mine.has(r.id) ? 'me' : ''}"><span class="r">${i + 1}</span><div><b>${esc(r.u)}</b><small>${esc((P.SECTORS[r.s] || {}).n || '')}${mine.has(r.id) ? ' · you' : ''}</small></div><span class="sc">${r.sc}</span></div>`).join('') || '<p style="text-align:center;margin:20px 0">No scores yet. Be the first.</p>';
  }

  /* ======================= PLAYER ======================= */
  const PIDK = 'px_pid_' + ROOM, PROF = 'px_prof_' + ROOM;
  let cur = null, ui = { screen: 'boot', form: {}, err: '', tab: 'All', mine: new Set(), subm: false, animDone: {} }, saveT = null;
  const prof = () => { try { return JSON.parse(store.get(PROF)) || {}; } catch (e) { return {}; } };
  function save() { clearTimeout(saveT); saveT = setTimeout(() => DB.set(BASE + '/priv/' + cur.id, cur), 250); }
  const saveNow = () => { clearTimeout(saveT); return DB.set(BASE + '/priv/' + cur.id, cur); };
  const go = s => { ui.screen = s; ui.err = ''; render(true); };
  const round = () => ui.screen === 'r2' ? 2 : 1;
  const remain = () => { const st = round() === 2 ? cur.r2s : cur.r1s; return st ? st + SECS * 1000 - DB.now() : SECS * 1000; };
  const tot = () => { const l = P.lv(cur.r1, cur.r2); return Object.keys(l).reduce((s, k) => s + l[k], 0); };
  const head = (right = '') => `<div class="hud"><span class="pill">⚔ ${esc(cur ? cur.u : '')}</span><span class="grow"></span>${right}</div>`;
  const arena = (cls = '') => { const t = cur ? tot() : 0, on = [t >= 1, t >= 4, t >= 8]; return `<div class="arena ${cls}" id="arena">${[0, 1, 2].map(i => { const d = (cls === 'sm' ? [150, 115, 85] : cls === 'lg' ? [280, 215, 150] : [210, 160, 115])[i]; return `<div class="ring ${on[i] ? '' : 'dim'}" style="width:${d}px;height:${d}px"></div>`; }).join('')}<div class="core" id="core">🤖</div></div>`; };
  const brand = '<div class="brand">● ● PROXIMUS × INFOSYS</div>';
  const tok = (id, lvl, price, o = {}) => { const c = P.CARD[id]; return `<div class="tok l${lvl} ${o.fresh ? 'fresh' : ''}" data-act="add" data-id="${id}">${o.nw ? '<span class="nw">NEW</span>' : ''}${o.minus ? `<button class="minus" data-act="sub" data-id="${id}">−</button>` : ''}<div class="o">${c.e}<span class="coin c">${lvl >= 3 ? 'MAX' : price}</span></div><b>${esc(c.n)}</b><small>${lvl ? ['', 'Light', 'Strong', 'Very strong'][lvl] : esc(c.s)}</small><div class="pips"><i></i><i></i><i></i></div></div>`; };

  function vClosed() { return `${brand}<h1>Opening soon</h1><p>The game is not open right now. This page opens by itself when the host starts it.</p><div class="gap"></div><div class="link" data-act="login">Already played? See your scores</div>`; }
  function vDetails() {
    const f = ui.form, v = k => esc(f[k] || '');
    return `${brand}<h1>Defend the<br>agent</h1><p>Two rounds. Two minutes each. Beat the other players.</p>
    <div class="in hero" style="margin-top:12px"><label>USERNAME · SHOWN ON THE LEADERBOARD</label><input data-f="u" maxlength="16" autocomplete="off" value="${v('u')}" placeholder="Pick a username"></div>
    <div class="in"><label>FULL NAME</label><input data-f="name" autocomplete="name" value="${v('name')}"></div>
    <div class="in"><label>PHONE</label><input data-f="phone" type="tel" autocomplete="tel" value="${v('phone')}"></div>
    <div class="in"><label>WORK EMAIL</label><input data-f="email" type="email" autocomplete="email" value="${v('email')}"></div>
    <div class="in"><label>COMPANY</label><input data-f="company" autocomplete="organization" value="${v('company')}"></div>
    <label class="chk"><input type="checkbox" data-f="ok" ${f.ok ? 'checked' : ''}><span>I agree that Proximus and Infosys may email me my results and the best strategy.</span></label>
    <div class="err" id="err">${esc(ui.err)}</div><div class="gap"></div><button class="go" data-act="details">NEXT ▶</button><div class="link" data-act="login">Already played? See your scores</div>`;
  }
  const vSector = () => `${brand}<h2>Choose your sector</h2><p>You will protect an AI agent from that world.</p><div style="margin-top:10px">${Object.keys(P.SECTORS).map(k => { const s = P.SECTORS[k]; return `<div class="sec ${cur.sector === k ? 'on' : ''}" data-act="sector" data-id="${k}"><span class="o">${s.e}</span><div>${s.n}<small>${s.sub}</small></div></div>`; }).join('')}</div>`;
  function vUse() { const s = P.SECTORS[cur.sector]; return `${brand}${arena('lg')}<div class="kick" style="text-align:center">YOUR AGENT · ${s.n.toUpperCase()}</div><h2 style="text-align:center">${s.agent}</h2><p style="text-align:center">${s.t}</p>
    <p style="margin-top:12px;text-align:center"><b style="color:#fff">2 rounds · 3 random attacks each</b><br>Buy defences with your coins. Survive. Upgrade. Survive harder.</p><p style="margin-top:8px;text-align:center">⏱ <b style="color:var(--gold)">2:00</b> per round, or tap Submit when ready.</p><div class="gap"></div><button class="go gold" data-act="start1">ENTER ROUND 1 ▶</button>`; }
  function vShop(r) {
    const co = P.coins(cur), left = r === 1 ? co.c1 : co.c2, buys = (cur.b1 || 0) + (cur.b2 || 0), lbl = r === 1 ? 'ROUND 1/2' : 'ROUND 2/2';
    let dock;
    if (r === 1) dock = `<div class="dock">${P.R1.map(c => tok(c[0], cur.r1[c[0]] || 0, c[4])).join('')}</div>`;
    else dock = `<div class="sech">NEW ADVANCED DEFENCES</div><div class="dock">${P.R2.map(c => tok(c[0], (cur.r2[c[0]] || 0), c[4], { nw: 1, fresh: (cur.r2[c[0]] || 0) > 0, minus: (cur.r2[c[0]] || 0) > 0 })).join('')}</div>
      <div class="sech">YOUR ROUND 1 DEFENCES · UPGRADE +${P.UPG} COINS PER LEVEL</div><div class="dock">${P.R1.map(c => { const a = cur.r1[c[0]] || 0, b = cur.r2[c[0]] || 0; return tok(c[0], a + b, c[4] + P.UPG, { fresh: b > 0, minus: b > 0 }); }).join('')}</div>`;
    return `${head(`<span class="pill">${lbl}</span><span class="pill tm" id="tm">⏱ ${fmtT(remain())}</span>`)}${arena('sm')}
    <div class="coins"><span class="coin">${left}</span><div><b>${left}</b><small>coins left</small></div><button class="buy" id="buy" data-act="buy" ${buys >= P.MAX_EXTRA ? 'disabled' : ''}>+${P.EXTRA} COINS<small>costs −${P.EXTRA_PEN} points</small></button></div>${dock}
    <div class="tip"><span style="color:#2be0ff">● Light</span> &nbsp;<span style="color:#3dffb0">● Strong</span> &nbsp;<span style="color:#ffcf4d">● Very strong</span><br>Tap a defence again to raise its level. 3 random attacks hit when you submit.${buys ? ` Extra coins bought: ${buys}.` : ''}</div><div class="gap"></div><button class="go" data-act="submit">SUBMIT ROUND ${r} ▶</button>`;
  }
  function vAttack(r) {
    return `${head(`<span class="pill">ROUND ${r}/2</span>`)}${arena('lg')}<div class="shotlbl" id="lbl"></div><div class="bar"><i id="bar" style="width:0"></i></div><div id="rows"></div><div class="gap"></div><button class="go gold" id="nx" data-act="${r === 1 ? 'start2' : 'score'}" disabled>${r === 1 ? 'ROUND 2 ▶' : 'SEE MY SCORE ▶'}</button>`;
  }
  function vScore() {
    const e = P.evaluate(cur), list = rows(), rank = list.findIndex(x => x.id === cur.id) + 1;
    return `${head('<span class="pill">FINAL</span>')}${arena('lg')}<div class="big">${e.score}<small>/100</small></div><div class="math">Blocked <b>${pc(e.avg)}%</b> overall → <b>${pc(e.avg)}% × ${pc(e.avg)}% = ${e.base}</b>${e.buys ? `<br>Extra coins bought: <b style="color:#ff9aa8">−${e.pen}</b>` : ''}</div>
    <div class="row3"><span class="pill">R1 ${pc(e.avg1)}%</span><span class="pill">R2 ${pc(e.avg2)}%</span><span class="pill">${rank ? '#' + rank + ' / ' + list.length : '…'}</span></div><p style="text-align:center">Your analysis and the best strategy will be emailed after the event.</p><div class="gap"></div><button class="go" data-act="board">LEADERBOARD ▶</button>`;
  }
  function vBoard() {
    const all = rows(), list = ui.tab === 'All' ? all : all.filter(r => r.s === ui.tab), mine = ui.mine;
    const tabs = ['All'].concat(Object.keys(P.SECTORS)).map(k => `<span class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${k === 'All' ? 'All' : P.SECTORS[k].n}</span>`).join('');
    const mineRows = all.filter(r => mine.has(r.id)).map(r => `${esc(r.u)} ${r.sc}`).join(' · ');
    return `${head('<span class="live">LIVE</span>')}<h2>Leaderboard</h2><div class="tabs">${tabs}</div>${lbHTML(list, mine, 40)}${mineRows ? `<p style="text-align:center;margin-top:10px;font-size:13px">Your scores: ${mineRows}</p>` : ''}<p style="text-align:center;margin-top:8px;font-size:12.5px">Updates live. Come back any time and log in.</p><div class="gap"></div>${state.open && cur ? '<button class="go gold" data-act="again">PLAY AGAIN ▶</button>' : !cur ? '<button class="go" data-act="home">BACK ▶</button>' : '<p style="text-align:center">The event is closed. Thanks for playing.</p>'}`;
  }
  function vLogin() {
    const f = ui.form;
    return `${brand}<h2>See your scores</h2><p>Use the email and phone you registered with.</p><div class="in" style="margin-top:14px"><label>WORK EMAIL</label><input data-f="lemail" type="email" value="${esc(f.lemail || '')}"></div><div class="in"><label>LAST 4 DIGITS OF YOUR PHONE</label><input data-f="lp4" inputmode="numeric" maxlength="4" value="${esc(f.lp4 || '')}"></div><div class="err" id="err">${esc(ui.err)}</div><div class="gap"></div><button class="go" data-act="dologin">SHOW ME ▶</button><div class="link" data-act="home">Back</div>`;
  }
  function render(force) {
    const y = window.scrollY, s = ui.screen; let h = '';
    if (s === 'boot') h = '<div class="boot">Loading…</div>';
    else if (s === 'closed') h = vClosed(); else if (s === 'details') h = vDetails(); else if (s === 'sector') h = vSector(); else if (s === 'usecase') h = vUse();
    else if (s === 'r1') h = vShop(1); else if (s === 'r2') h = vShop(2); else if (s === 'att1') h = vAttack(1); else if (s === 'att2') h = vAttack(2);
    else if (s === 'score') h = vScore(); else if (s === 'board') h = vBoard(); else if (s === 'login') h = vLogin();
    $app.innerHTML = `<div class="ph">${h}${DB.mode === 'demo' ? '<p style="text-align:center;font-size:11px;margin-top:8px">DEMO MODE</p>' : ''}</div>`;
    if (!force) window.scrollTo(0, y); else if (s === 'att1' || s === 'att2') runAttacks(s === 'att1' ? 1 : 2);
  }
  /* attack animation: projectiles fly at the agent, the shield flashes, the % blocked is stamped */
  function runAttacks(r) {
    const res = P.evaluate(cur)['r' + r], $a = document.getElementById('arena'), $c = document.getElementById('core'), $l = document.getElementById('lbl'), $r = document.getElementById('rows'), $b = document.getElementById('bar'), $n = document.getElementById('nx');
    const row = x => { const a = P.AT[x.a], cls = x.pct >= .7 ? '' : x.pct >= .45 ? 'w' : 'l', why = x.by.length ? 'Stopped by ' + x.by.map(i => P.CARD[i].n).join(', ') : 'Nothing in place', miss = x.pct < .7 && x.gap.length ? '. Missing: ' + x.gap.map(i => P.CARD[i].n).join(', ') : '';
      return `<div class="atk"><span class="e">${a.e}</span><div><b>${a.n}</b><small>${esc(why + miss)}</small></div><span class="p ${cls}">${pc(x.pct)}%</span></div>`; };
    const finish = () => { const avg = res.reduce((s, x) => s + x.pct, 0) / 3; $l.textContent = ''; $b.style.width = pc(avg) + '%'; $r.insertAdjacentHTML('beforeend', `<p style="text-align:center;margin-top:8px">Round ${r}: <b style="color:#fff">${pc(avg)}%</b> blocked</p>`); $n.disabled = false; ui.animDone[cur.id + r] = 1; };
    if (ui.animDone[cur.id + r]) { $r.innerHTML = res.map(row).join(''); finish(); return; }
    let i = 0, sum = 0;
    const step = () => {
      if (i >= res.length) { sfx('fanfare'); finish(); return; }
      const x = res[i], a = P.AT[x.a], W = $a.clientWidth, H = $a.clientHeight, ang = Math.random() * Math.PI * 2, sx = W / 2 + Math.cos(ang) * W * .7, sy = H / 2 + Math.sin(ang) * H * .7;
      $l.textContent = `⚠ INCOMING ${i + 1} OF 3 · ${a.n.toUpperCase()}`; sfx('whoosh');
      const p = document.createElement('div'); p.className = 'proj'; $a.appendChild(p);
      const an = p.animate([{ left: sx + 'px', top: sy + 'px', opacity: 0 }, { left: sx + 'px', top: sy + 'px', opacity: 1, offset: .1 }, { left: W / 2 + 'px', top: H / 2 + 'px', opacity: 1 }], { duration: 900, easing: 'ease-in', fill: 'forwards' });
      an.onfinish = () => {
        p.remove(); const cls = x.pct >= .7 ? '' : x.pct >= .45 ? 'w' : 'l';
        const fx = document.createElement('div'); fx.className = 'fx ' + (x.pct < .45 ? 'hurt' : ''); $a.appendChild(fx); setTimeout(() => fx.remove(), 700);
        const st = document.createElement('div'); st.className = 'stamp ' + cls; st.textContent = pc(x.pct) + '% BLOCKED'; $a.appendChild(st); setTimeout(() => st.remove(), 1500);
        $c.classList.remove('shk'); void $c.offsetWidth; $c.classList.add('shk'); sfx(x.pct >= .45 ? 'shield' : 'boom'); buzz(x.pct >= .45 ? 20 : [40, 30, 60]);
        $r.insertAdjacentHTML('beforeend', row(x)); sum += x.pct; $b.style.width = pc(sum / (i + 1)) + '%'; i++; setTimeout(step, 1500);
      };
    };
    setTimeout(step, 500);
  }
  /* actions */
  const valid = () => { const f = ui.form, d = String(f.phone || '').replace(/\D/g, '');
    if (clean(f.u).length < 2) return 'Pick a username (2 to 16 characters).'; if (!String(f.name || '').trim()) return 'Please enter your name.'; if (d.length < 7) return 'Please enter a valid phone number.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(f.email || '').trim())) return 'Please enter a valid email.'; if (!String(f.company || '').trim()) return 'Please enter your company.'; if (!f.ok) return 'Please tick the box to continue.'; return ''; };
  async function doDetails() {
    const e = valid(); if (e) { ui.err = e; document.getElementById('err').textContent = e; return; }
    if (ui.busy) return; ui.busy = 1;
    try {
      const o = await DB.get(BASE + '/state'); state = o || state; if (!state.open) { ui.busy = 0; return go('closed'); }
      const f = ui.form, u = clean(f.u), id = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), k = keyOf(u);
      await DB.tx(BASE + '/names/' + k, c => c ? undefined : id);
      if ((await DB.get(BASE + '/names/' + k)) !== id) { ui.err = 'That username is taken. Please pick another.'; ui.busy = 0; return render(true); }
      const email = String(f.email).trim().toLowerCase(), digits = String(f.phone).replace(/\D/g, '');
      cur = { id, u, name: String(f.name).trim(), phone: String(f.phone).trim(), p4: digits.slice(-4), email, company: String(f.company).trim(), sector: '', seed: 1 + Math.floor(Math.random() * 1e9), t0: DB.now(), r1: {}, r2: {}, b1: 0, b2: 0, done: 0 };
      await saveNow(); await DB.set(BASE + '/pub/' + id, { u, s: '', sc: 0, done: 0, t: cur.t0 }); await DB.set(BASE + '/ix/' + h53(email) + '/' + id, 1);
      store.set(PIDK, id); store.set(PROF, JSON.stringify({ name: cur.name, phone: cur.phone, email, company: cur.company })); ui.busy = 0; go('sector');
    } catch (err) { ui.busy = 0; ui.err = 'Could not connect. Please try again.'; render(true); }
  }
  function add(id) {
    const r = ui.screen === 'r2' ? 2 : 1, c = P.CARD[id], co = P.coins(cur), left = r === 1 ? co.c1 : co.c2, price = r === 1 ? c.p : c.p + (c.r === 1 ? P.UPG : 0);
    if (r === 1 && c.r === 2) return; const have = (cur.r1[id] || 0) + (cur.r2[id] || 0);
    const bad = () => { const el = document.querySelector(`.tok[data-id="${id}"]`); el && (el.classList.add('shake'), setTimeout(() => el.classList.remove('shake'), 400)); buzz(30); };
    if (have >= 3) { toast('Already at the maximum level'); return bad(); }
    if (left < price) { toast(`You need ${price - left} more coins`); const b = document.getElementById('buy'); b && (b.classList.remove('pulse'), void b.offsetWidth, b.classList.add('pulse')); return bad(); }
    const sel = r === 1 ? cur.r1 : cur.r2; sel[id] = (sel[id] || 0) + 1; sfx('chip'); buzz(10); save(); render();
  }
  function sub(id) { const sel = ui.screen === 'r2' ? cur.r2 : cur.r1; if (!sel[id]) return; sel[id]--; if (!sel[id]) delete sel[id]; sfx('tick'); save(); render(); }
  function buy() { const r = ui.screen === 'r2' ? 2 : 1, buys = (cur.b1 || 0) + (cur.b2 || 0); if (buys >= P.MAX_EXTRA) return; cur['b' + r] = (cur['b' + r] || 0) + 1; sfx('chip'); toast(`+${P.EXTRA} coins, −${P.EXTRA_PEN} points`); save(); render(); }
  async function submitRound(auto) {
    if (ui.subm) return; const r = round(); if (!auto && !confirm0()) return; ui.subm = 1;
    // never end a round with negative coins (cannot happen through the UI, but guard anyway)
    cur['r' + r + 'e'] = DB.now();
    if (r === 2) { const e = P.evaluate(cur); cur.score = e.score; cur.done = 1; cur.sc1 = pc(e.avg1); cur.sc2 = pc(e.avg2); await saveNow(); await DB.set(BASE + '/pub/' + cur.id, { u: cur.u, s: cur.sector, sc: e.score, done: 1, t: cur.t0 }); } else await saveNow();
    ui.subm = 0; if (auto) toast('Time is up. Round submitted.'); go(r === 1 ? 'att1' : 'att2');
  }
  const confirm0 = () => true;
  async function login() {
    const em = String(ui.form.lemail || '').trim().toLowerCase(), p4 = String(ui.form.lp4 || '').replace(/\D/g, '').slice(-4);
    if (!em || p4.length < 4) { ui.err = 'Enter your email and the last 4 digits of your phone.'; return render(true); }
    try { const ix = await DB.get(BASE + '/ix/' + h53(em)) || {}, ok = new Set();
      for (const id of Object.keys(ix)) { const p = await DB.get(BASE + '/priv/' + id); if (p && p.p4 === p4) ok.add(id); }
      if (!ok.size) { ui.err = 'We could not find a game with those details.'; return render(true); }
      ui.mine = ok; ui.tab = 'All'; go('board'); } catch (e) { ui.err = 'Could not connect. Please try again.'; render(true); }
  }
  const A = {
    details: doDetails, login: () => { ui.form = Object.assign({}, ui.form); go('login'); }, dologin: login, home: () => go(cur && !cur.done && cur.r1s ? 'r1' : (state.open ? 'details' : 'closed')),
    sector(el) { cur.sector = el.dataset.id; save(); DB.set(BASE + '/pub/' + cur.id, { u: cur.u, s: cur.sector, sc: 0, done: 0, t: cur.t0 }); go('usecase'); },
    async start1() { const o = await DB.get(BASE + '/state'); state = o || state; if (!state.open && !cur.r1s) return go('closed'); if (!cur.r1s) cur.r1s = DB.now(); await saveNow(); go('r1'); },
    add: el => add(el.dataset.id), sub: el => sub(el.dataset.id), buy, submit: () => submitRound(false),
    async start2() { if (!cur.r2s) cur.r2s = DB.now(); await saveNow(); go('r2'); }, score: () => go('score'), board() { ui.mine = new Set([cur.id]); ui.tab = 'All'; go('board'); },
    tab(el) { ui.tab = el.dataset.id; render(); },
    again() { const p = prof(); ui.form = { name: p.name, phone: p.phone, email: p.email, company: p.company, u: '', ok: 1 }; cur = null; store.set(PIDK, ''); go('details'); },
  };
  function bind() {
    $app.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; e.stopPropagation(); const f = A[el.dataset.act]; if (f) f(el); });
    $app.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.f; if (!k) return; ui.form[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
    setInterval(() => { if (!cur || !(ui.screen === 'r1' || ui.screen === 'r2')) return; const t = document.getElementById('tm'), ms = remain(); if (t) { t.textContent = '⏱ ' + fmtT(ms); t.classList.toggle('low', ms < 15000); } if (ms <= 0) submitRound(true); }, 250);
  }
  function resume(p) { cur = p; if (p.done) return 'score'; if (p.r2s) return ui.animDone[p.id + 1] || 1 ? 'r2' : 'r2'; if (p.r1e) return 'att1'; if (p.r1s) return 'r1'; return p.sector ? 'usecase' : 'sector'; }
  async function player() {
    bind(); DB.on(BASE + '/state', v => { const was = state.open; state = v || { open: false }; if (state.open !== was && (ui.screen === 'closed' || ui.screen === 'boot')) { if (ui.screen === 'closed' && state.open) go('details'); } });
    DB.on(BASE + '/pub', v => { pub = v || {}; if (ui.screen === 'board' || ui.screen === 'score') { if (ui.screen === 'board') render(); else { const e = document.querySelector('.row3 .pill:last-child'); if (e) { const l = rows(), rk = l.findIndex(x => x.id === cur.id) + 1; e.textContent = rk ? '#' + rk + ' / ' + l.length : '…'; } } } });
    const id = store.get(PIDK); let p = id ? await DB.get(BASE + '/priv/' + id) : null; const s = await DB.get(BASE + '/state'); state = s || { open: false };
    const pr = prof(); ui.form = { name: pr.name, phone: pr.phone, email: pr.email, company: pr.company, ok: pr.email ? 1 : 0 };
    if (p) { const sc = resume(p); if (sc === 'att1' && !p.r2s) { ui.animDone[p.id + 1] = 1; } if (!p.done && p.r2s && remain0(p) <= 0) { ui.screen = 'r2'; cur = p; await submitRound(true); return; } if (!p.done && p.r1s && !p.r1e && remain1(p) <= 0 && sc === 'r1') { cur = p; ui.screen = 'r1'; await submitRound(true); return; } if (sc === 'att1') ui.animDone[p.id + 1] = 1; return go(sc); }
    go(state.open ? 'details' : 'closed');
  }
  const remain0 = p => p.r2s + SECS * 1000 - DB.now(), remain1 = p => p.r1s + SECS * 1000 - DB.now();

  /* ======================= HOST ======================= */
  function qrSVG(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); }
  function host() {
    $app.innerHTML = '<div class="ph wide"><div class="boot">Loading…</div></div>';
    const draw = () => { const all = Object.keys(pub).map(id => pub[id]), done = all.filter(x => x.done).length, url = playURL(), burl = url + (url.includes('?') ? '&' : '?') + 'board';
      $app.innerHTML = `<div class="ph wide"><div class="brand">HOST · PROXIMUS × INFOSYS</div><h1>Defend the agent</h1>
      <div class="hbox"><h3>EVENT</h3><div class="hbig">${state.open ? '🟢 OPEN' : '🔴 CLOSED'}</div><p>${state.open ? 'Players can register and play.' : 'Nobody can start a new game. Anyone mid-round finishes that round.'}</p><button class="hbtn ${state.open ? 'off' : 'on'}" data-act="toggle">${state.open ? 'CLOSE THE EVENT' : 'OPEN THE EVENT'}</button></div>
      <div class="hbox"><h3>PLAYERS</h3><div class="hrow"><div><div class="hbig">${all.length}</div><p>started</p></div><div><div class="hbig">${done}</div><p>finished</p></div></div></div>
      <div class="hbox"><h3>TOP 10</h3>${lbHTML(rows(), new Set(), 10)}</div>
      <div class="hbox"><h3>EXPORT</h3><button class="hbtn n" data-act="csv">Download all plays (CSV)</button><button class="hbtn n" data-act="csv2">Download scores by person (CSV)</button><p id="xmsg" style="margin-top:6px"></p></div>
      <div class="hbox"><h3>LINKS</h3><div style="display:flex;gap:16px;align-items:center"><div class="qr">${qrSVG(url)}</div><div style="line-height:1.9;font-size:14px">Players: <a style="color:var(--cy)" href="${esc(url)}" target="_blank">${esc(url)}</a><br>Projector: <a style="color:var(--cy)" href="${esc(burl)}" target="_blank">${esc(burl)}</a></div></div></div></div>`; };
    DB.on(BASE + '/state', v => { state = v || { open: false }; draw(); }); DB.on(BASE + '/pub', v => { pub = v || {}; draw(); });
    const csvq = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    async function fetchAll() { const ids = Object.keys(pub), out = []; for (const id of ids) { const p = await DB.get(BASE + '/priv/' + id); if (p) out.push(p); } return out; }
    const dl = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); };
    $app.addEventListener('click', async e => { const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act;
      if (a === 'toggle') { if (state.open && !window.confirm('Close the event? Nobody can start a new game.')) return; await DB.set(BASE + '/state', { open: !state.open, at: DB.now() }); }
      if (a === 'csv' || a === 'csv2') { const m = document.getElementById('xmsg'); m.textContent = 'Preparing…'; try { const ps = await fetchAll(); const ev = ps.map(p => Object.assign({ p }, P.evaluate(p)));
        if (a === 'csv') dl('proximus-infy-plays.csv', ['Username,Name,Phone,Email,Company,Sector,Status,Round 1 %,Round 2 %,Extra coin buys,Score,Started'].concat(ev.map(x => [x.p.u, x.p.name, x.p.phone, x.p.email, x.p.company, (P.SECTORS[x.p.sector] || {}).n || '', x.p.done ? 'finished' : 'incomplete', pc(x.avg1), pc(x.avg2), x.buys, x.p.done ? x.score : '', new Date(x.p.t0).toISOString()].map(csvq).join(','))).join('\n'));
        else { const by = {}; ev.forEach(x => { const k = x.p.email; (by[k] = by[k] || { name: x.p.name, company: x.p.company, list: [] }).list.push(x); });
          dl('proximus-infy-by-person.csv', ['Email,Name,Company,Plays,Best score,All scores (username: score)'].concat(Object.keys(by).map(k => { const b = by[k], l = b.list.filter(x => x.p.done); return [k, b.name, b.company, l.length, l.length ? Math.max(...l.map(x => x.score)) : '', l.map(x => x.p.u + ': ' + x.score).join('; ')].map(csvq).join(','); })).join('\n')); }
        m.textContent = ps.length + ' plays exported.'; } catch (err) { m.textContent = 'Could not read player details with the current database rules. Use Firebase console → Export JSON.'; } } });
  }

  /* ======================= BOARD (projector) ======================= */
  function board() {
    $app.innerHTML = '<div class="ph wide board"><div class="boot">Loading…</div></div>';
    const draw = () => { const url = playURL(); $app.innerHTML = `<div class="ph wide board"><div style="display:flex;align-items:center;gap:20px"><div style="flex:1"><div class="brand">PROXIMUS × INFOSYS</div><h1>Defend the agent</h1><p>${state.open ? 'Scan to play. Two rounds, two minutes each.' : 'Event closed. Final leaderboard.'}</p></div><div class="qr">${qrSVG(url)}</div></div><h2>Leaderboard <span class="live" style="font-size:13px">LIVE</span></h2>${lbHTML(rows(), new Set(), 12)}</div>`; };
    DB.on(BASE + '/state', v => { state = v || { open: false }; draw(); }); DB.on(BASE + '/pub', v => { pub = v || {}; draw(); });
  }
  if (VIEW === 'host') host(); else if (VIEW === 'board') board(); else player();
})();
