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
  const muted = () => store.get('px_mute') === '1';
  const bedOn = () => { try { SFX.setMute(muted()); SFX.bed(!muted() && (ui.screen === 'r1' || ui.screen === 'r2')); } catch (e) {} };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const playURL = () => location.origin + location.pathname + (Q.get('room') ? '?room=' + ROOM : '');
  const DQ_MS = 15 * 60000, isDQ = r => r && !r.done && DB.now() > r.t + DQ_MS;
  let state = { open: false }, pub = {};
  const rows = () => Object.keys(pub).map(id => Object.assign({ id }, pub[id])).filter(r => r.done).sort((a, b) => b.sc - a.sc || a.t - b.t);
  function lbHTML(list, mine, n) {
    return list.slice(0, n).map((r, i) => `<div class="lb ${mine.has(r.id) ? 'me' : ''}"><span class="r">${['🥇', '🥈', '🥉'][i] || i + 1}</span><div><b>${esc(r.u)}</b><small>${esc((P.SECTORS[r.s] || {}).n || '')}${mine.has(r.id) ? ' · you' : ''}</small></div><span class="sc">${r.sc}</span></div>`).join('') || '<p style="text-align:center;margin:20px 0">No scores yet. Be the first.</p>';
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
  const LVN = ['', 'LIGHT', 'STRONG', 'VERY STRONG'];
  const legend = () => `<div class="lvls"><div style="--c:#2be0ff"><b>● LIGHT · 50%</b><span>of the attack it covers is stopped</span></div><div style="--c:#3dffb0"><b>● STRONG · 70%</b><span>of the attack it covers is stopped</span></div><div style="--c:#ffcf4d"><b>● VERY STRONG · 100%</b><span>of the attack it covers is stopped</span></div></div>`;
  function vClosed() { return `${brand}<h1>Opening soon</h1><p>The game is not open right now. This page opens by itself when the host starts it.</p><div class="gap"></div><div class="link" data-act="login">Already played? See your scores</div>`; }
  function vDetails() {
    const f = ui.form, v = k => esc(f[k] || '');
    return `${brand}<h1>Defend the<br>agent</h1><p>Two stages, DEFCON 3 then DEFCON 5. Two minutes each. Buy defences for your AI agent, then random attacks hit it. Beat the other players.</p>
    <div class="in hero" style="margin-top:12px"><label>USERNAME · SHOWN ON THE LEADERBOARD</label><input data-f="u" maxlength="16" autocomplete="off" value="${v('u')}" placeholder="Pick a username"></div>
    <div class="in"><label>FULL NAME</label><input data-f="name" autocomplete="off" value="${v('name')}"></div>
    <div class="in"><label>PHONE</label><input data-f="phone" type="tel" autocomplete="off" value="${v('phone')}"></div>
    <div class="in"><label>WORK EMAIL</label><input data-f="email" type="email" autocomplete="off" value="${v('email')}"></div>
    <div class="in"><label>COMPANY</label><input data-f="company" autocomplete="off" value="${v('company')}"></div>
    <label class="chk"><input type="checkbox" data-f="ok" ${f.ok ? 'checked' : ''}><span>I agree that Proximus and Infosys may email me my results and the best strategy.</span></label>
    <div class="err" id="err">${esc(ui.err)}</div><div class="gap"></div><button class="go" data-act="details">NEXT ▶</button><div class="link" data-act="login">Already played? See your scores</div>`;
  }
  const vSector = () => `${brand}<h2>Choose your sector</h2><p>You will protect an AI agent from that world.</p><div style="margin-top:10px">${Object.keys(P.SECTORS).map(k => { const s = P.SECTORS[k]; return `<div class="sec ${cur.sector === k ? 'on' : ''}" data-act="sector" data-id="${k}"><span class="o">${s.e}</span><div>${s.n}<small>${s.sub}</small></div></div>`; }).join('')}</div>`;
  function vUse() { const s = P.SECTORS[cur.sector]; return `${brand}${arena('lg')}<div class="kick" style="text-align:center">YOUR AGENT · ${s.n.toUpperCase()}</div><h2 style="text-align:center">${s.agent}</h2><p style="text-align:center">${s.t}</p>
    <p style="margin-top:12px;text-align:center"><b style="color:#fff">DEFCON 3, then DEFCON 5 · 3 to 5 random attacks</b><br><span style="font-size:12px">DEFCON = Defense Readiness Condition</span><br>Buy defences with your coins. Survive. Upgrade. Survive harder.</p><p style="margin-top:8px;text-align:center">⏱ <b style="color:var(--gold)">2:00</b> per round, or tap Submit when ready.</p>${legend()}<div class="gap"></div><button class="go gold" data-act="start1">ENTER DEFCON 3 ▶</button>`; }
  /* ---------- ring shop ---------- */
  const LC = ['#2a3560', '#2be0ff', '#3dffb0', '#ffcf4d'], LNm = ['', 'Light', 'Strong', 'Very strong'];
  const ell = (n, rx, ry, cx, cy) => Array.from({ length: n }, (_, i) => { const a = (-90 + i * 360 / n) * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
  const arcSVG = (l, sz = 50, rr = 22) => { const c = 2 * Math.PI * rr, seg = c / 3 - 4, k = sz / 50; return `<svg width="${sz}" height="${sz}" viewBox="0 0 50 50">${[0, 1, 2].map(i => `<circle cx="25" cy="25" r="${rr}" fill="none" stroke="${i < l ? LC[l] : '#2a3560'}" stroke-width="${3.5}" stroke-dasharray="${seg} ${c - seg}" stroke-dashoffset="${-(i * (c / 3))}" transform="rotate(-90 25 25)" stroke-linecap="round"/>`).join('')}</svg>`; };
  const SHORT = { 'Vulnerability scanning': 'Vuln. scanning', 'Vulnerability mitigation': 'Vuln. mitigation', 'AI vulnerability scanning': 'AI vuln. scanning' };
  const centreH = (hot) => { const s = P.SECTORS[cur.sector] || P.SECTORS.telecom; return `<div class="ctr ${hot ? 'hot' : ''}" id="ctr"><div class="k">YOUR AGENT</div><div class="a">${s.e}</div><b>${esc(s.agent)}</b><small>${esc(s.n)}</small></div>`; };
  function slotH(id, x, y, lvl, price, o = {}) {
    const c = P.CARD[id], sl = id === 'MIT' ? P.scanLv(P.lv(cur.r1, cur.r2)) : -1, need = sl === 0, cap = sl > 0 && lvl >= sl && lvl < 3 ? sl : 0, can = lvl > (o.lockMin || 0);
    return `<div class="sl ${lvl ? 'on' : ''} ${need ? 'lock' : ''} ${o.fresh ? 'fresh' : ''} ${o.deal ? 'deal' : ''}" data-id="${id}" style="left:${(x / 390 * 100).toFixed(2)}%;top:${y}px;--d:${(o.i || 0) * 45}ms"><div class="w" data-act="add" data-id="${id}">${arcSVG(lvl)}<span>${c.e}</span>${need ? '<i class="lk">🔒</i>' : ''}</div>
      <div class="n">${esc(SHORT[c.n] || c.n)}</div>${need ? '<div class="tg">needs a scan first</div>' : cap ? `<div class="tg">max ${LNm[cap]} · your scan</div>` : ''}
      <div class="pm"><b class="m ${can ? '' : 'x'}" ${can ? `data-act="sub" data-id="${id}"` : ''}>−</b><b class="p ${lvl >= 3 || need ? 'x' : ''}" data-act="add" data-id="${id}">${lvl >= 3 ? 'MAX' : '+' + price}</b></div></div>`;
  }
  function vShop(r) {
    const co = P.coins(cur), left = r === 1 ? co.c1 : co.c2, buys = (cur.b1 || 0) + (cur.b2 || 0), dl = ui.dealt !== r, dc = r === 1 ? 3 : 5; let stage;
    const tab = r === 2 ? (ui.t2 || 'new') : 'r1', ring = (n, ry, cy) => ell(n, 146, ry, 195, cy);
    if (tab === 'new') { const p = ring(P.R2.length, 220, 320); stage = P.R2.map((c, i) => slotH(c[0], p[i][0], p[i][1] - 4, cur.r2[c[0]] || 0, c[4], { i, deal: dl, fresh: (cur.r2[c[0]] || 0) > 0 })).join(''); }
    else if (tab === 'mine') { const p = ring(P.R1.length, 236, 322); stage = P.R1.map((c, i) => { const a = cur.r1[c[0]] || 0, b = cur.r2[c[0]] || 0; return slotH(c[0], p[i][0], p[i][1], a + b, c[4] + P.UPG, { i, deal: dl, fresh: b > 0, lockMin: a }); }).join(''); }
    else { const p = ring(P.R1.length, 236, 322); stage = P.R1.map((c, i) => slotH(c[0], p[i][0], p[i][1], cur.r1[c[0]] || 0, c[4], { i, deal: dl })).join(''); }
    ui.dealt = r;
    const tabs = r === 2 ? `<div class="rtabs"><span class="${tab === 'new' ? 'on' : ''}" data-act="t2" data-id="new">DEFCON 5</span><span class="${tab === 'mine' ? 'on' : ''}" data-act="t2" data-id="mine">DEFCON 3 · upgrade +${P.UPG}</span></div>` : '';
    return `<div class="topbar">${head(`<span class="pill">DEFCON ${dc}</span><span class="pill tm" id="tm">⏱ ${fmtT(remain())}</span><button class="pill mute" data-act="mute">${muted() ? '🔇' : '🔊'}</button>`)}
    <div class="coins"><span class="coin">${left}</span><div><b id="cl">${left}</b><small>coins left</small></div><button class="buy" id="buy" data-act="buy" ${buys >= P.MAX_EXTRA ? 'disabled' : ''}>+${P.EXTRA} COINS<small>costs −${P.EXTRA_PEN} points</small></button></div></div>${tabs}
    <div class="rg"><div class="el" style="width:74%;height:68%"></div><div class="el" style="width:49%;height:46%;opacity:.5"></div>${centreH()}${stage}</div>
    <div class="tip">Tap <b>+</b> to buy a level, <b>−</b> to take it back. The arc fills as you add levels: <span style="color:#2be0ff">Light 50%</span> · <span style="color:#3dffb0">Strong 70%</span> · <span style="color:#ffcf4d">Very strong 100%</span>. 3 to 5 random attacks hit across the two DEFCONs, a different mix every play.${buys ? ` Extra coin packs bought: ${buys}.` : ''}</div><div class="subw"><button class="go" data-act="submit">SUBMIT DEFCON ${dc} ▶</button></div>`;
  }
  function vAttack(r) {
    const dc = r === 1 ? 3 : 5, res0 = P.evaluate(cur)['r' + r], nA = res0.length, off = r === 2 ? P.evaluate(cur).r1.length : 0;
    return `${head(`<span class="pill">DEFCON ${dc}</span><span class="pill" id="albl">${nA} ATTACK${nA > 1 ? 'S' : ''}</span>`)}<div class="astrip" id="strip" style="grid-template-columns:repeat(${nA},1fr)">${res0.map((_, i) => `<div id="sp${i + 1}"><b>${off + i + 1}</b> Waiting<small></small></div>`).join('')}</div>
    <div class="aw" id="aw"><div class="el" style="width:74%;height:70%"></div><div class="el" style="width:49%;height:46%;opacity:.5"></div>${centreH()}<div id="dfs"></div><div id="abn"></div></div><div id="rep"></div><div class="gap"></div><button class="go gold" id="nx" data-act="${r === 1 ? 'start2' : 'score'}" disabled>${r === 1 ? 'DEFCON 5 ▶' : 'SEE MY SCORE ▶'}</button>`;
  }
  function vScore() {
    const e = P.evaluate(cur), list = rows(), rank = list.findIndex(x => x.id === cur.id) + 1, all = e.r1.concat(e.r2), f2 = x => (Math.round(x * 100) / 100).toFixed(2);
    return `${head('<span class="pill">FINAL</span>')}${arena('lg')}<div class="big">0<small>/100</small></div>
    <div class="math">Score = 100 × damage-weighted average of (blocked)²<br>Bolt ×1 · Missile ×2 · Heavy missile ×3<br><b>(${all.map(x => x.w + '×' + f2(x.pct * x.pct)).join(' + ')}) ÷ ${all.reduce((s, x) => s + x.w, 0)} = ${f2(e.sq)} → ${e.base}</b>${e.buys ? `<br>Extra coins bought: <b style="color:#ff9aa8">−${e.pen}</b>` : ''}</div>
    <div class="row3"><span class="pill">DEFCON 3 ${pc(e.avg1)}%</span><span class="pill">DEFCON 5 ${pc(e.avg2)}%</span><span class="pill">${rank ? '#' + rank + ' / ' + list.length : '…'}</span></div><p style="text-align:center">Your analysis and the best strategy will be emailed after the event.</p><div class="gap"></div><button class="go" data-act="board">LEADERBOARD ▶</button>`;
  }
  function vBoard() {
    const all = rows(), list = ui.tab === 'All' ? all : all.filter(r => r.s === ui.tab), mine = ui.mine;
    const tabs = ['All'].concat(Object.keys(P.SECTORS)).map(k => `<span class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${k === 'All' ? 'All' : P.SECTORS[k].n}</span>`).join('');
    const mineRows = Object.keys(pub).filter(id => mine.has(id)).map(id => pub[id]).map(r => r.done ? `${esc(r.u)} ${r.sc}` : (r.dq || isDQ(r)) ? `${esc(r.u)} disqualified` : `${esc(r.u)} in progress`).join(' · ');
    return `${head('<span class="live">LIVE</span>')}<h2>Leaderboard</h2><div class="tabs">${tabs}</div>${lbHTML(list, mine, 40)}${mineRows ? `<p style="text-align:center;margin-top:10px;font-size:13px">Your scores: ${mineRows}</p>` : ''}<p style="text-align:center;margin-top:8px;font-size:12.5px">Updates live. Come back any time and log in.</p><div class="gap"></div>${state.open && cur ? '<button class="go gold" data-act="again">PLAY AGAIN ▶</button>' : !cur ? '<button class="go" data-act="home">BACK ▶</button>' : '<p style="text-align:center">The event is closed. Thanks for playing.</p>'}`;
  }
  const vDq = () => `${brand}<h2>Game ended</h2><p style="margin-top:8px">The game was not finished within 15 minutes, so it was disqualified and is not on the leaderboard.</p><p style="margin-top:8px">You are welcome to start again from the beginning.</p><div class="gap"></div><button class="go gold" data-act="again">START AGAIN ▶</button><div class="link" data-act="login">See my scores</div>`;
  function vLogin() {
    const f = ui.form;
    return `${brand}<h2>See your scores</h2><p>Use the email and phone you registered with.</p><div class="in" style="margin-top:14px"><label>WORK EMAIL</label><input data-f="lemail" type="email" autocomplete="off" value="${esc(f.lemail || '')}"></div><div class="in"><label>LAST 4 DIGITS OF YOUR PHONE</label><input data-f="lp4" autocomplete="off" inputmode="numeric" maxlength="4" value="${esc(f.lp4 || '')}"></div><div class="err" id="err">${esc(ui.err)}</div><div class="gap"></div><button class="go" data-act="dologin">SHOW ME ▶</button><div class="link" data-act="home">Back</div>`;
  }
  function render(force) {
    const y = window.scrollY, s = ui.screen; let h = '';
    if (s === 'boot') h = '<div class="boot">Loading…</div>';
    else if (s === 'closed') h = vClosed(); else if (s === 'details') h = vDetails(); else if (s === 'sector') h = vSector(); else if (s === 'usecase') h = vUse();
    else if (s === 'r1') h = vShop(1); else if (s === 'r2') h = vShop(2); else if (s === 'att1') h = vAttack(1); else if (s === 'att2') h = vAttack(2);
    else if (s === 'dq') h = vDq(); else if (s === 'score') h = vScore(); else if (s === 'board') h = vBoard(); else if (s === 'login') h = vLogin();
    $app.innerHTML = `<div class="ph">${h}${DB.mode === 'demo' ? '<p style="text-align:center;font-size:11px;margin-top:8px">DEMO MODE</p>' : ''}</div>`;
    if (!force) window.scrollTo(0, y); else if (s === 'att1' || s === 'att2') runAttacks(s === 'att1' ? 1 : 2);
    if (force) { bedOn(); if (s === 'r1' || s === 'r2') { ui.dealt = s === 'r1' ? 1 : 2; sfx('horn'); } if (s === 'score') scoreFx(); }
    if (ui.pop) { const el = document.querySelector(`.card[data-id="${ui.pop}"]`); ui.pop = null; if (el) { el.classList.add('pop'); sparks(el); } }
  }
  function sparks(el) { const r = el.getBoundingClientRect(); for (let i = 0; i < 12; i++) { const s = document.createElement('span'); s.className = 'spk'; s.textContent = i % 3 ? '✦' : '🪙'; s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(s);
    const ang = Math.random() * 6.28, d = 50 + Math.random() * 70; s.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px),calc(-50% + ${Math.sin(ang) * d - 20}px)) scale(1.2)`, opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'ease-out' }).onfinish = () => s.remove(); } }
  function confetti() { for (let i = 0; i < 60; i++) { const s = document.createElement('i'); s.className = 'cf'; s.style.left = Math.random() * 100 + 'vw'; s.style.background = ['#ffcf4d', '#2be0ff', '#3dffb0', '#ff4a63', '#8a5cff'][i % 5]; s.style.animationDelay = Math.random() * .8 + 's'; s.style.animationDuration = 2 + Math.random() * 1.5 + 's'; document.body.appendChild(s); setTimeout(() => s.remove(), 4500); } }
  function scoreFx() { const e = P.evaluate(cur), el = document.querySelector('.big'); if (!el) return; const t0 = performance.now(), tgt = e.score; const tick = () => { const k = Math.min(1, (performance.now() - t0) / 1400); el.firstChild.nodeValue = Math.round(tgt * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); else { sfx(tgt >= 50 ? 'fanfare' : 'sad'); if (tgt >= 50) confetti(); } }; sfx('drumroll', 1.2); tick(); }
  /* ---------- attack sequence: bolt, missile, heavy missile ---------- */
  const WEAPON = {
    1: w => `<svg width="${w}" viewBox="0 0 60 120"><defs><linearGradient id="wb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4a6300"/><stop offset="1" stop-color="#ff4a63"/></linearGradient></defs><rect x="26" y="0" width="8" height="70" fill="url(#wb)"/><polygon points="34,50 20,80 30,80 24,112 44,70 33,70 40,50" fill="#ffd166" stroke="#ff4a63" stroke-width="2"/></svg>`,
    2: w => `<svg width="${w}" viewBox="0 0 60 140"><defs><linearGradient id="wm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd16600"/><stop offset="1" stop-color="#ff9f43"/></linearGradient></defs><path d="M30 0 L40 34 L20 34 Z" fill="url(#wm)"/><polygon points="20,70 6,48 20,50" fill="#ff4a63"/><polygon points="40,70 54,48 40,50" fill="#ff4a63"/><path d="M20 34 H40 V92 L30 134 L20 92 Z" fill="#e8ecf6" stroke="#ff4a63" stroke-width="2"/><path d="M20 92 L30 134 L40 92 Z" fill="#ff4a63"/><rect x="20" y="58" width="20" height="6" fill="#ff4a63"/></svg>`,
    3: w => `<svg width="${w}" viewBox="0 0 90 160"><defs><linearGradient id="wh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4a6300"/><stop offset="1" stop-color="#ff9f43"/></linearGradient></defs><path d="M45 0 L62 38 L28 38 Z" fill="url(#wh)"/><polygon points="28,86 6,52 28,56" fill="#ff3b3b"/><polygon points="62,86 84,52 62,56" fill="#ff3b3b"/><path d="M28 38 H62 V104 L45 156 L28 104 Z" fill="#e8ecf6" stroke="#ff3b3b" stroke-width="2.5"/><path d="M28 104 L45 156 L62 104 Z" fill="#ff3b3b"/><rect x="28" y="62" width="34" height="7" fill="#ff3b3b"/><circle cx="45" cy="84" r="6" fill="#ffd166"/></svg>` };
  const WNAME = ['', 'Bolt', 'Missile', 'Heavy missile'], WW = [0, 40, 54, 78];
  function runAttacks(r) {
    const res = P.evaluate(cur)['r' + r], off = r === 2 ? P.evaluate(cur).r1.length : 0, L = r === 1 ? cur.r1 : P.capMit(P.lv(cur.r1, cur.r2)), $a = document.getElementById('aw'), $d = document.getElementById('dfs'), $b = document.getElementById('abn'), $n = document.getElementById('nx'), $rep = document.getElementById('rep'), $ph = document.querySelector('.ph');
    const owned = Object.keys(L).filter(k => L[k] > 0), pos = ell(owned.length, 140, 205, 195, 320);
    $d.innerHTML = owned.map((id, i) => `<div class="dfi" data-id="${id}" style="left:${(pos[i][0] / 390 * 100).toFixed(2)}%;top:${pos[i][1]}px"><div class="w">${arcSVG(L[id], 44)}<span>${P.CARD[id].e}</span></div></div>`).join('');
    const sp = i => document.getElementById('sp' + (i + 1)), cls = p => p >= .7 ? 'g' : p >= .45 ? 'w' : 'l';
    const setSp = (i, st, t, s) => { const e = sp(i); e.className = st; e.innerHTML = `<b>${off + i + 1}</b> ${t}<small>${s}</small>`; };
    const replay = () => {
      const avg = res.reduce((s, x) => s + x.pct, 0) / res.length; $a.classList.add('gone'); document.getElementById('strip').classList.add('gone'); document.getElementById('albl').textContent = pc(avg) + '% BLOCKED';
      $rep.innerHTML = `<div class="rph"><b>WHAT HIT YOU</b><span>DEFCON ${r === 1 ? 3 : 5} · average ${pc(avg)}% blocked</span></div>` + res.map(x => { const a = P.AT[x.a];
        return `<div class="rc"><div class="rt"><span class="e">${a.e}</span><b>${a.n}</b><span class="p ${cls(x.pct)}">${pc(x.pct)}%</span></div><small>${esc(a.t)}</small><div class="rbar"><i class="${cls(x.pct)}" style="width:${pc(x.pct)}%"></i></div>
        <div class="rs">${['', 'Bolt', 'Missile', 'Heavy missile'][x.w]} · damage ×${x.w} · counts ${(x.pct * x.pct).toFixed(2)} (blocked²) · Stopped by: ${x.by.length ? x.by.map(i => P.CARD[i].e + ' ' + esc(P.CARD[i].n)).join(' · ') : 'nothing in place'}</div>${x.pct < .7 && x.gap.length ? `<div class="rg2">Gap: ${x.gap.map(i => esc(P.CARD[i].n)).join(', ')}</div>` : ''}</div>`; }).join('');
      $n.disabled = false; ui.animDone[cur.id + r] = 1;
    };
    if (ui.animDone[cur.id + r]) { replay(); return; }
    res.forEach((x, i) => setSp(i, '', 'Waiting', ''));
    let i = 0;
    const step = () => {
      if (i >= res.length) { sfx('fanfare'); setTimeout(replay, 1300); return; }
      const x = res[i], a = P.AT[x.a], k = off + i + 1, NT = P.split(cur.seed || 1).n, wk = Math.ceil(k * 3 / NT), W = $a.clientWidth, H = $a.clientHeight, cx = W / 2, cy = 314;
      setSp(i, 'now', 'Incoming', 'hits now');
      $b.innerHTML = `<div class="abn s${wk}"><div class="kk">ATTACK ${k} OF ${NT} · ${WNAME[wk].toUpperCase()} · DAMAGE ×${wk}</div><b>${a.e} ${a.n}</b><small>${esc(a.t)}</small></div>`; sfx('whoosh'); buzz(10);
      const side = [-1, 1, 0][(k - 1) % 3], sx = cx + side * W * .34, sy = 90, ang = Math.atan2(-(cx - sx), (cy - sy)) * 180 / Math.PI, w = WW[wk], hh = w * (wk === 1 ? 2 : wk === 2 ? 2.33 : 1.78);
      const m = document.createElement('div'); m.className = 'wp'; m.innerHTML = WEAPON[wk](w); $a.appendChild(m);
      const an = m.animate([{ left: sx + 'px', top: sy + 'px', transform: `translate(-50%,0) rotate(${ang}deg)`, opacity: 0 }, { opacity: 1, offset: .12 }, { left: cx + 'px', top: (cy - hh * .9) + 'px', transform: `translate(-50%,0) rotate(${ang}deg)`, opacity: 1 }], { duration: 1100 - wk * 90, delay: 900, easing: 'ease-in', fill: 'forwards' });
      an.onfinish = () => {
        m.remove(); const hot = x.pct < .45;
        const bl = document.createElement('div'); bl.className = 'blast'; bl.style.setProperty('--sz', [0, 120, 180, 260][wk] + 'px'); bl.textContent = '💥'; $a.appendChild(bl); setTimeout(() => bl.remove(), 800);
        const fx = document.createElement('div'); fx.className = 'fx ' + (hot ? 'hurt' : ''); $a.appendChild(fx); setTimeout(() => fx.remove(), 700);
        $ph.classList.remove('s1', 's2', 's3'); void $ph.offsetWidth; $ph.classList.add('s' + wk); setTimeout(() => $ph.classList.remove('s' + wk), 900);
        const v = document.createElement('div'); v.className = 'vig v' + wk; document.body.appendChild(v); setTimeout(() => v.remove(), 900);
        const c = document.getElementById('ctr'); c.classList.add('hot'); setTimeout(() => c.classList.remove('hot'), 900);
        sfx(x.pct >= .45 ? 'shield' : 'boom'); if (wk > 1) setTimeout(() => sfx('boom'), 120); buzz(wk === 1 ? 25 : wk === 2 ? [40, 30, 50] : [70, 40, 90]);
        x.by.forEach(id => { const e = $d.querySelector(`.dfi[data-id="${id}"]`); if (e) { e.classList.add('help'); setTimeout(() => e.classList.remove('help'), 1800); } });
        const st = document.createElement('div'); st.className = 'bstamp ' + cls(x.pct); st.innerHTML = `${pc(x.pct)}% BLOCKED`; $a.appendChild(st); setTimeout(() => st.remove(), 1700);
        setSp(i, 'ok ' + cls(x.pct), 'Blocked', pc(x.pct) + '%'); i++; setTimeout(() => { $b.innerHTML = ''; step(); }, 2100);
      };
    };
    setTimeout(step, 400);
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
      const ow = await DB.get(BASE + '/names/' + k);
      if (ow && ow !== id) { const op = await DB.get(BASE + '/pub/' + ow); if (isDQ(op) || (op && op.dq)) await DB.set(BASE + '/names/' + k, null); }
      await DB.tx(BASE + '/names/' + k, c => c ? undefined : id);
      if ((await DB.get(BASE + '/names/' + k)) !== id) { ui.err = 'That username is taken. Please pick another.'; ui.busy = 0; return render(true); }
      const email = String(f.email).trim().toLowerCase(), digits = String(f.phone).replace(/\D/g, '');
      cur = { id, u, name: String(f.name).trim(), phone: String(f.phone).trim(), p4: digits.slice(-4), email, company: String(f.company).trim(), sector: '', seed: 1 + Math.floor(Math.random() * 1e9), t0: DB.now(), r1: {}, r2: {}, b1: 0, b2: 0, done: 0 };
      await saveNow(); await DB.set(BASE + '/pub/' + id, { u, s: '', sc: 0, done: 0, t: cur.t0 }); await DB.set(BASE + '/ix/' + h53(email) + '/' + id, 1);
      store.set(PIDK, id);  ui.busy = 0; go('sector');
    } catch (err) { ui.busy = 0; ui.err = 'Could not connect. Please try again.'; render(true); }
  }
  function add(id) {
    const r = ui.screen === 'r2' ? 2 : 1, c = P.CARD[id], co = P.coins(cur), left = r === 1 ? co.c1 : co.c2, price = r === 1 ? c.p : c.p + (c.r === 1 ? P.UPG : 0);
    if (r === 1 && c.r === 2) return; const have = (cur.r1[id] || 0) + (cur.r2[id] || 0);
    const bad = () => { sfx('deny'); const el = document.querySelector(`.sl[data-id="${id}"]`); el && (el.classList.add('shake'), setTimeout(() => el.classList.remove('shake'), 400)); buzz(30); };
    if (have >= 3) { toast('Already at the maximum level'); return bad(); }
    if (id === 'MIT') { const sl = P.scanLv(P.lv(cur.r1, cur.r2)); if (!sl) { toast('Mitigation needs a scan first: buy a scanning card'); return bad(); } if (have >= sl) { toast('Mitigation cannot be stronger than your scan. Upgrade your scan first'); return bad(); } }
    if (left < price) { toast(`You need ${price - left} more coins`); const b = document.getElementById('buy'); b && (b.classList.remove('pulse'), void b.offsetWidth, b.classList.add('pulse')); return bad(); }
    const sel = r === 1 ? cur.r1 : cur.r2; sel[id] = (sel[id] || 0) + 1; sfx('chip'); buzz(10); save(); render();
  }
  function sub(id) { const sel = ui.screen === 'r2' ? cur.r2 : cur.r1; if (!sel[id]) return; sel[id]--; if (!sel[id]) delete sel[id];
    if (cur.r2.MIT) { const m = Math.min(cur.r2.MIT, P.scanLv(P.lv(cur.r1, cur.r2))); if (m < cur.r2.MIT) { toast('Mitigation lowered: it cannot be stronger than your scan'); if (m) cur.r2.MIT = m; else delete cur.r2.MIT; } }
    sfx('undo'); save(); render(); }
  function buy() { const r = ui.screen === 'r2' ? 2 : 1, buys = (cur.b1 || 0) + (cur.b2 || 0); if (buys >= P.MAX_EXTRA) return; cur['b' + r] = (cur['b' + r] || 0) + 1; sfx('coin'); toast(`+${P.EXTRA} coins, −${P.EXTRA_PEN} points`); save(); render(); }
  async function submitRound(auto) {
    if (ui.subm) return; const r = round(); if (!auto && !confirm0()) return; ui.subm = 1;
    // never end a round with negative coins (cannot happen through the UI, but guard anyway)
    cur['r' + r + 'e'] = DB.now();
    if (r === 2) { const e = P.evaluate(cur); cur.score = e.score; cur.done = 1; cur.sc1 = pc(e.avg1); cur.sc2 = pc(e.avg2); await saveNow(); await DB.set(BASE + '/pub/' + cur.id, { u: cur.u, s: cur.sector, sc: e.score, done: 1, t: cur.t0 }); } else await saveNow();
    ui.subm = 0; if (auto) toast('Time is up. Submitted.'); go(r === 1 ? 'att1' : 'att2');
  }
  const confirm0 = () => true;
  async function markDQ(p) { try { cur = p; p.dq = 1; await DB.set(BASE + '/priv/' + p.id, p); await DB.set(BASE + '/pub/' + p.id, { u: p.u, s: p.sector || '', sc: 0, done: 0, dq: 1, t: p.t0 }); } catch (e) {} store.set(PIDK, ''); cur = null; sfx('sad'); go('dq'); }
  async function login() {
    const em = String(ui.form.lemail || '').trim().toLowerCase(), p4 = String(ui.form.lp4 || '').replace(/\D/g, '').slice(-4);
    if (!em || p4.length < 4) { ui.err = 'Enter your email and the last 4 digits of your phone.'; return render(true); }
    try { const ix = await DB.get(BASE + '/ix/' + h53(em)) || {}, ok = new Set();
      for (const id of Object.keys(ix)) { const p = await DB.get(BASE + '/priv/' + id); if (p && p.p4 === p4) ok.add(id); }
      if (!ok.size) { ui.err = 'We could not find a game with those details.'; return render(true); }
      ui.mine = ok; ui.tab = 'All'; ui.form = {}; cur = null; go('board'); } catch (e) { ui.err = 'Could not connect. Please try again.'; render(true); }
  }
  const A = {
    details: doDetails, login: () => { ui.form = {}; go('login'); }, dologin: login, home: () => { ui.form = {}; ui.mine = new Set(); go(cur && !cur.done && cur.r1s ? 'r1' : (state.open ? 'details' : 'closed')); },
    sector(el) { cur.sector = el.dataset.id; save(); DB.set(BASE + '/pub/' + cur.id, { u: cur.u, s: cur.sector, sc: 0, done: 0, t: cur.t0 }); go('usecase'); },
    async start1() { const o = await DB.get(BASE + '/state'); state = o || state; if (!state.open && !cur.r1s) return go('closed'); if (!cur.r1s) cur.r1s = DB.now(); await saveNow(); go('r1'); },
    add: el => add(el.dataset.id), sub: el => sub(el.dataset.id), buy, submit: () => submitRound(false),
    async start2() { ui.t2 = 'new'; if (!cur.r2s) cur.r2s = DB.now(); await saveNow(); go('r2'); }, score: () => go('score'), board() { ui.mine = new Set([cur.id]); ui.tab = 'All'; go('board'); },
    mute() { store.set('px_mute', muted() ? '0' : '1'); bedOn(); render(); },
    tab(el) { ui.tab = el.dataset.id; render(); }, t2(el) { ui.t2 = el.dataset.id; ui.dealt = 2; render(); },
    again() { ui.form = {}; ui.mine = new Set(); cur = null; store.set(PIDK, ''); go('details'); },
  };
  function bind() {
    $app.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; e.stopPropagation(); const f = A[el.dataset.act]; if (f) f(el); });
    $app.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.f; if (!k) return; ui.form[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
    setInterval(() => { if (cur && !cur.done && ui.screen !== 'dq' && ui.screen !== 'score' && ui.screen !== 'board' && ui.screen !== 'login' && DB.now() > cur.t0 + DQ_MS) { markDQ(cur); return; } if (!cur || !(ui.screen === 'r1' || ui.screen === 'r2')) return; const t = document.getElementById('tm'), ms = remain(); if (t) { t.textContent = '⏱ ' + fmtT(ms); t.classList.toggle('low', ms < 15000); const sc = Math.ceil(ms / 1000); if (sc <= 10 && sc > 0 && sc !== ui.lastTick) { ui.lastTick = sc; sfx('tick'); } const cl = document.getElementById('cl'); } if (ms <= 0) submitRound(true); }, 250);
  }
  function resume(p) { p.r1 = p.r1 || {}; p.r2 = p.r2 || {}; p.b1 = p.b1 || 0; p.b2 = p.b2 || 0; cur = p; if (p.done) return 'score'; if (p.r2s) return ui.animDone[p.id + 1] || 1 ? 'r2' : 'r2'; if (p.r1e) return 'att1'; if (p.r1s) return 'r1'; return p.sector ? 'usecase' : 'sector'; }
  async function player() {
    bind(); DB.on(BASE + '/state', v => { const was = state.open; state = v || { open: false }; if (state.open !== was && (ui.screen === 'closed' || ui.screen === 'boot')) { if (ui.screen === 'closed' && state.open) go('details'); } });
    DB.on(BASE + '/pub', v => { pub = v || {}; if (ui.screen === 'board' || ui.screen === 'score') { if (ui.screen === 'board') render(); else { const e = document.querySelector('.row3 .pill:last-child'); if (e) { const l = rows(), rk = l.findIndex(x => x.id === cur.id) + 1; e.textContent = rk ? '#' + rk + ' / ' + l.length : '…'; } } } });
    const id = store.get(PIDK); let p = id ? await DB.get(BASE + '/priv/' + id) : null; const s = await DB.get(BASE + '/state'); state = s || { open: false };
    ui.form = {};
    if (p && p.done) { store.set(PIDK, ''); p = null; }
    if (p && !p.done && DB.now() > p.t0 + DQ_MS) { await markDQ(p); return; }
    if (p) { p.r1 = p.r1 || {}; p.r2 = p.r2 || {}; p.b1 = p.b1 || 0; p.b2 = p.b2 || 0; }
    if (p) { const sc = resume(p); if (sc === 'att1' && !p.r2s) { ui.animDone[p.id + 1] = 1; } if (!p.done && p.r2s && remain0(p) <= 0) { ui.screen = 'r2'; cur = p; await submitRound(true); return; } if (!p.done && p.r1s && !p.r1e && remain1(p) <= 0 && sc === 'r1') { cur = p; ui.screen = 'r1'; await submitRound(true); return; } if (sc === 'att1') ui.animDone[p.id + 1] = 1; return go(sc); }
    go(state.open ? 'details' : 'closed');
  }
  const remain0 = p => p.r2s + SECS * 1000 - DB.now(), remain1 = p => p.r1s + SECS * 1000 - DB.now();

  /* ======================= HOST ======================= */
  function qrSVG(text) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); }
  function host() {
    $app.innerHTML = '<div class="ph wide"><div class="boot">Loading…</div></div>';
    const draw = () => { const all = Object.keys(pub).map(id => pub[id]), done = all.filter(x => x.done).length, dq = all.filter(x => !x.done && (x.dq || isDQ(x))).length, url = playURL(), burl = url + (url.includes('?') ? '&' : '?') + 'board';
      $app.innerHTML = `<div class="ph wide"><div class="brand">HOST · PROXIMUS × INFOSYS</div><h1>Defend the agent</h1>
      <div class="hbox"><h3>EVENT</h3><div class="hbig">${state.open ? '🟢 OPEN' : '🔴 CLOSED'}</div><p>${state.open ? 'Players can register and play.' : 'Nobody can start a new game. Anyone mid-round finishes that round.'}</p><button class="hbtn ${state.open ? 'off' : 'on'}" data-act="toggle">${state.open ? 'CLOSE THE EVENT' : 'OPEN THE EVENT'}</button></div>
      <div class="hbox"><h3>PLAYERS</h3><div class="hrow"><div><div class="hbig">${all.length}</div><p>started</p></div><div><div class="hbig">${done}</div><p>finished</p></div><div><div class="hbig">${all.length - done - dq}</div><p>playing now</p></div><div><div class="hbig">${dq}</div><p>disqualified (15 min)</p></div></div></div>
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
        if (a === 'csv') dl('proximus-infy-plays.csv', ['Username,Name,Phone,Email,Company,Sector,Status,Round 1 %,Round 2 %,Extra coin buys,Score,Started'].concat(ev.map(x => [x.p.u, x.p.name, x.p.phone, x.p.email, x.p.company, (P.SECTORS[x.p.sector] || {}).n || '', x.p.done ? 'finished' : (x.p.dq || DB.now() > x.p.t0 + DQ_MS) ? 'disqualified' : 'in progress', pc(x.avg1), pc(x.avg2), x.buys, x.p.done ? x.score : '', new Date(x.p.t0).toISOString()].map(csvq).join(','))).join('\n'));
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
