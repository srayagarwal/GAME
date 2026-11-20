/* DELTA · Responsible AI Leadership. Screens for player phones (the whole game), the optional projector (?board) and the host (?host=KEY). */
(function () {
  const G = window.DeltaGame, CFG = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || CFG.room || 'dnb').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const BASE = 'games/delta2-' + ROOM, PIDK = 'delta2_pid_' + ROOM;
  const VIEW = Q.has('board') ? 'board' : Q.get('host') ? (Q.get('host') === CFG.hostKey ? 'host' : 'nohost') : 'player';
  const $app = document.getElementById('app');
  let state = {}, players = {}, pid = null, ui = { lib: null, libTab: 'C', libArea: '', sheet: null, open: {} }, lastSig = '', lastPhase = null, lastQ = null;
  try { pid = localStorage.getItem(PIDK) || sessionStorage.getItem(PIDK); } catch (e) {}
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const r1 = v => Math.round(v * 10) / 10;
  const eur = v => (v < 0 ? '−€' : '€') + Math.abs(r1(v)) + 'k';
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + '€' + Math.abs(r1(v)) + 'k';
  const stars = n => '⭐'.repeat(Math.max(0, n)) + '<span class="dim">' + '⭐'.repeat(5 - Math.max(0, n)) + '</span>';
  const ph = () => state.phase || 'lobby', q = () => state.q || 0, len = () => state.len || 6;
  const me = () => (pid && players[pid]) ? players[pid] : null;
  const left = () => Math.max(0, (state.deadline || 0) - DB.now());
  const fmtT = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const toast = msg => { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const sfx = n => { try { window.SFX && SFX[n] && SFX[n](); } catch (e) {} };
  const plist = () => Object.entries(players).filter(([, p]) => p && p.name).map(([id, p]) => Object.assign({ id }, p));
  const sc = (id, p) => G.score(state, id, p || players[id]);
  const prods = () => state.products || [];
  const sector = () => G.SECTORS[state.sector || 'bank'];
  const qrSVG = text => { const z = qrcode(0, 'M'); z.addData(text); z.make(); return z.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); };
  const joinURL = () => location.origin + location.pathname + (ROOM !== (CFG.room || 'dnb') ? '?room=' + ROOM : '');
  const ql = n => 'Q' + (n + 1);
  const cost = (m, p) => `<span class="m">€${m}k</span>${p ? ` <span class="p">👥${p}</span>` : ''}`;
  const ranking = () => plist().map(p => ({ p, r: sc(p.id, p) })).sort((a, b) => b.r.total - a.r.total || b.r.trust - a.r.trust);

  // ---------------- data ----------------
  DB.on(BASE + '/state', v => { state = v || {}; if (lastPhase !== ph() || lastQ !== q()) { ui.sheet = null; if (lastPhase !== null && VIEW === 'player') window.scrollTo(0, 0); } lastPhase = ph(); lastQ = q(); render(); });
  DB.on(BASE + '/players', v => { players = v || {}; render(); });
  setInterval(() => { if (state.deadline && ph() === 'plan') { document.querySelectorAll('[data-tmr]').forEach(el => { el.textContent = left() > 0 ? fmtT(left()) : 'Time'; el.classList.toggle('late', left() < 30000); }); if (left() <= 0 && !ui.expired) { ui.expired = 1; render(true); } } if (left() > 0) ui.expired = 0; }, 500);

  function render(force) {
    const sig = JSON.stringify([state, VIEW === 'player' ? players : plist().map(p => [p.id, p.name, p.p, p.f, p.r]), ui, ui.expired]);
    if (!force && sig === lastSig) return; lastSig = sig;
    const y = window.scrollY, ov = document.querySelector('.ov .in'), oy = ov ? ov.scrollTop : 0, nm = document.getElementById('nm'), nv = nm ? nm.value : null;
    if (VIEW === 'board') $app.innerHTML = board();
    else if (VIEW === 'host') $app.innerHTML = host();
    else if (VIEW === 'nohost') $app.innerHTML = `<div class="ph"><div class="wait"><div class="bigi">🔒</div><h2>Wrong host key</h2></div></div>`;
    else $app.innerHTML = player();
    if (VIEW === 'player') window.scrollTo(0, y);
    const ov2 = document.querySelector('.ov .in'); if (ov2) ov2.scrollTop = oy;
    const nm2 = document.getElementById('nm'); if (nm2 && nv != null) nm2.value = nv;
  }

  // ================= PLAYER =================
  function player() {
    const m = me();
    if (!m) return joinScreen();
    let body;
    if (ph() === 'lobby') body = lobbyScreen(m);
    else if (ph() === 'plan') body = planScreen(m);
    else if (ph() === 'ev') body = evScreen(m);
    else if (ph() === 'rep') body = repScreen(m);
    else body = endScreen(m);
    return `<div class="ph">${body}</div>${ui.sheet ? ctlSheet(m) : ''}${ui.lib ? library() : ''}`;
  }
  function topBar(right) { return `<div class="top"><span class="logo"><b>Δ</b> DELTA</span>${right || ''}</div>`; }
  function resBar(info, showPeople) {
    return `<div class="res"><div class="m"><b>${eur(info.cash)}</b><small>budget</small></div>${showPeople ? `<div class="p"><b>${info.peopleLeft}/${G.PEOPLE}</b><small>people this quarter</small></div>` : ''}<div><b class="st5">${stars(info.trust)}</b><small>trust</small></div></div>`;
  }
  function rules() {
    return `<div class="rules">
      <div class="ru"><span>🏢</span><div>You run AI at <b>${esc(sector().org)}</b>. Over <b>${len()} quarters</b> you decide which AI products to build, how to control them, and what governance to put in place.</div></div>
      <div class="ru"><span>💶</span><div>You start with <b>€${G.START}k for the whole game</b>, and <b>${G.PEOPLE} people each quarter</b>. Live products earn money every quarter. Lose trust ⭐ and they earn less.</div></div>
      <div class="ru"><span>🎴</span><div>Every product hides <b>3 risks</b>. Assess it to see them. Add <b>controls</b> to a product, or build <b>foundations</b> that protect everything. You can’t afford them all.</div></div>
      <div class="ru"><span>📰</span><div>Each quarter a <b>real AI incident</b> hits every live product with that risk, unless a control stops it. From ${ql(1)}, <b>regulators, journalists and the board</b> check on you too.</div></div>
      <div class="ru"><span>🏆</span><div>Final score = cash + the value of your live products. You also get a <b>Responsible AI report</b> on how you played.</div></div></div>`;
  }
  function joinScreen() {
    return `${topBar()}<div class="hero"><div class="kick">RESPONSIBLE AI LEADERSHIP</div><h1>Build AI.<br>Govern it.<br>Survive the headlines.</h1></div>
      <input id="nm" class="inp" maxlength="18" placeholder="Your name or team" autocomplete="off">
      <button class="btn" data-a="join">Join the game</button>
      <div class="hint">Room: ${esc(ROOM)}</div>`;
  }
  function lobbyScreen(m) {
    return `${topBar(`<span class="pill">${esc(m.name)}</span>`)}
      <div class="kick" style="margin-top:14px">YOU’RE IN · WAITING FOR THE HOST</div>
      <h2 class="h2">How it works</h2>${rules()}
      <div class="who">${plist().map(p => `<span>${esc(p.name)}</span>`).join('')}</div>
      <button class="btn ghost" data-a="lib">📚 Browse the card library</button>`;
  }

  // ---------- planning ----------
  const myP = (m, id) => ((m.p || {})[id]) || {};
  const myF = m => m.f || {};
  function knownRisks(m, id, r) { // risks the player has seen: all 3 if assessed, else those revealed by incidents
    const x = myP(m, id), all = G.risksOf(state.seed, id);
    if (x.a != null) return all;
    const seen = new Set(); (r.quarters || []).forEach(Q => Q.hits.forEach(v => { if (v.prod === id && v.kind !== 'safe' && G.N[v.nid]) seen.add(G.N[v.nid].w); })); return all.filter(w => seen.has(w));
  }
  const tierKnown = (m, id) => myP(m, id).a != null || myF(m).GOV != null;
  const canAct = () => ph() === 'plan' && (!state.deadline || left() > 0);
  function prodStatus(m, id, r) { const x = myP(m, id), cur = q(); if (r.prod[id] && r.prod[id].pulled) return r.quarters.some(Q => Q.notes.some(n => n.ban === id)) ? ['ban', 'Shut down by regulator'] : ['pulled', 'Pulled']; if (x.l != null) return ['live', 'Live']; if (x.s != null) return x.s < cur ? ['ready', 'Built · ready to launch'] : ['build', 'In build']; return ['idea', 'Idea']; }
  function planScreen(m) {
    const info = G.planInfo(state, pid, m), r = info.r, cur = q(), lock = !canAct(), f = myF(m);
    const started = prods().filter(id => myP(m, id).s != null), ideas = prods().filter(id => myP(m, id).s == null);
    const Rq = r.quarters[cur] || { lines: [] }, inc = Rq.lines.filter(l => l.k === 'inc');
    let h = `${topBar(`<span class="qtag">${ql(cur)} of ${len()}</span><span class="tmr" data-tmr>${state.deadline ? (left() > 0 ? fmtT(left()) : 'Time') : ''}</span>`)}${resBar(info, true)}`;
    if (inc.length) h += `<div class="earned">💶 Income this quarter: <b>${sgn(inc.reduce((s, l) => s + l.v, 0))}</b></div>`;
    if (lock) h += `<div class="lockd">⏱️ Planning time is over. The host will reveal this quarter’s news.</div>`;
    h += `<div class="sec">YOUR AI PRODUCTS<span>${started.length ? '' : 'none yet'}</span></div>`;
    if (!started.length) h += `<div class="empty">Start a product below. It takes one quarter to build, then you can launch it.</div>`;
    started.forEach(id => h += prodCard(m, id, r, info, lock));
    if (ideas.length) { h += `<div class="sec">NEW PRODUCT IDEAS<span>${esc(sector().n)}</span></div>`; ideas.forEach(id => h += ideaCard(m, id, info, lock)); }
    h += `<div class="sec">GOVERNANCE FOUNDATIONS<span>protect every product</span></div><div class="fgrid">`;
    Object.keys(G.F).forEach(k => { const F = G.F[k], on = f[k] != null, mine = f[k] === cur, need = (F.need || []).filter(n => f[n] == null);
      h += `<button class="fd ${on ? 'on' : ''} ${on && !mine ? 'fixed' : ''}" data-a="fnd" data-k="${k}" ${lock || (on && !mine) ? 'disabled' : ''}><span class="fi">${F.i}</span><b>${esc(F.n)}</b><small>${esc(F.d)}</small><em>${on ? (mine ? '✓ Building now · tap to undo' : '✓ Since ' + ql(f[k])) : cost(F.m, F.p)}${need.length && !on ? ' · needs ' + need.map(n => G.F[n].i).join('') : ''}</em></button>`; });
    h += `</div><button class="btn ghost" data-a="lib">📚 Card library: every control, risk and incident</button>
      <div class="hint">Your choices save as you go. Anything you did this quarter can be undone until time’s up.</div>`;
    return h;
  }
  function tierTag(m, id) { const P = G.ALLP[id]; if (!tierKnown(m, id)) return `<span class="tier unk">EU AI Act tier: ?</span>`; return `<span class="tier ${P.tier}">${G.TIER[P.tier]}</span>`; }
  function prodCard(m, id, r, info, lock) {
    const P = G.ALLP[id], x = myP(m, id), cur = q(), [st, stn] = prodStatus(m, id, r), known = knownRisks(m, id, r), ctl = Object.keys(x.c || {}), dead = st === 'pulled' || st === 'ban';
    let h = `<div class="prod ${st}"><div class="h"><span class="n">${P.i} ${esc(P.n)}</span><span class="st ${st}">${stn}</span></div>
      <div class="pd">${esc(P.d)}</div><div class="tags">${tierTag(m, id)}</div>
      <div class="tags">${known.map(w => `<span class="tg r">⚠️ ${esc(G.W[w])}</span>`).join('')}${x.a == null ? `<span class="tg u">${3 - known.length} hidden risk${3 - known.length === 1 ? '' : 's'}</span>` : ''}</div>`;
    if (ctl.length) h += `<div class="tags">${ctl.map(k => `<span class="tg c">${G.C[k].i} ${esc(G.C[k].n)}</span>`).join('')}</div>`;
    h += `<div class="earn">Earns <b>€${P.earn}k</b> a quarter at 5 ⭐${st === 'build' ? ` · launch from ${ql(x.s + 1)}` : ''}</div>`;
    if (!dead) {
      h += `<div class="acts">`;
      if (x.a == null) h += `<button data-a="assess" data-id="${id}" ${lock ? 'disabled' : ''}>🔍 Assess <small>${cost(G.ASSESS.m, G.ASSESS.p)}</small></button>`;
      else if (x.a === cur) h += `<button class="sel" data-a="assess" data-id="${id}" ${lock ? 'disabled' : ''}>🔍 Assessed <small>undo</small></button>`;
      h += `<button data-a="ctl" data-id="${id}">🛡️ Controls <small>${ctl.length ? ctl.length + ' added' : 'add'}</small></button>`;
      if (x.l == null && x.s < cur) h += `<button class="go" data-a="launch" data-id="${id}" ${lock ? 'disabled' : ''}>🚀 Launch <small>free</small></button>`;
      else if (x.l === cur) h += `<button class="sel" data-a="launch" data-id="${id}" ${lock ? 'disabled' : ''}>🚀 Launching <small>undo</small></button>`;
      else if (x.l != null) h += `<button data-a="pull" data-id="${id}" ${lock ? 'disabled' : ''}>⏸️ Pull <small>stop it</small></button>`;
      if (x.s === cur) h += `<button data-a="unstart" data-id="${id}" ${lock ? 'disabled' : ''}>↩️ Cancel <small>refund</small></button>`;
      h += `</div>`;
    } else if (x.x != null && x.x === cur - 0.5) h += `<div class="acts"><button class="sel" data-a="pull" data-id="${id}" ${lock ? 'disabled' : ''}>⏸️ Pulled <small>undo</small></button></div>`;
    return h + `</div>`;
  }
  function ideaCard(m, id, info, lock) {
    const P = G.ALLP[id], f = myF(m), warn = P.tier === 'prohibited' && f.ETH != null;
    return `<div class="prod idea"><div class="h"><span class="n">${P.i} ${esc(P.n)}</span><span class="st idea">Idea</span></div><div class="pd">${esc(P.d)}</div>
      <div class="tags">${tierTag(m, id)}<span class="tg u">3 hidden risks</span></div>
      ${warn ? `<div class="warn">⚖️ Your ethics committee warns: this is a <b>prohibited practice</b> under the EU AI Act (Art. 5). If it goes live it will be shut down and fined.</div>` : ''}
      <div class="earn">Build cost <b class="neg">€${P.build}k</b> · earns <b>€${P.earn}k</b> a quarter once live</div>
      <div class="acts"><button class="go" data-a="start" data-id="${id}" ${lock ? 'disabled' : ''}>💡 Start building <small>€${P.build}k</small></button></div></div>`;
  }
  function ctlSheet(m) {
    const id = ui.sheet, P = G.ALLP[id], x = myP(m, id), cs = x.c || {}, cur = q(), lock = !canAct(), info = G.planInfo(state, pid, m), dead = info.r.prod[id] && info.r.prod[id].pulled;
    let h = `<div class="ov"><div class="in"><div class="shd"><div><div class="kick">CONTROLS FOR</div><b>${P.i} ${esc(P.n)}</b></div><button class="xb" data-a="close">✕</button></div>
      ${resBar(info, true)}<div class="hint" style="text-align:left">A control protects only this product. It works from this quarter on. Nothing tells you if it’s the right one: assess the product first, or check the card library.</div>`;
    Object.keys(G.AREAS).forEach(a => { const ks = Object.keys(G.C).filter(k => G.C[k].a === a); if (!ks.length) return;
      h += `<div class="sec">${esc(G.AREAS[a])}</div>`;
      ks.forEach(k => { const C = G.C[k], on = cs[k] != null, mine = cs[k] === cur;
        h += `<button class="li ${on ? 'sel' : ''}" data-a="addc" data-k="${k}" ${lock || dead || (on && !mine) ? 'disabled' : ''}><span class="e">${C.i}</span><span class="t">${esc(C.n)}<small>${esc(C.d)}</small></span><span class="c">${on ? (mine ? '✓ added<br><small>undo</small>' : '✓ ' + ql(cs[k])) : cost(C.m, C.p)}</span></button>`; }); });
    return h + `<button class="btn" data-a="close">Done</button></div></div>`;
  }

  // ---------- library ----------
  function library() {
    const t = ui.libTab, area = ui.libArea;
    const tabs = [['C', 'Controls'], ['F', 'Foundations'], ['W', 'Risks'], ['N', 'Incidents'], ['E', 'Events'], ['P', 'Products']];
    let h = `<div class="ov"><div class="in"><div class="shd"><div><div class="kick">CARD LIBRARY</div><b>Every card in the game</b></div><button class="xb" data-a="close">✕</button></div>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="${t === k ? 'on' : ''}" data-a="ltab" data-k="${k}">${n}</button>`).join('')}</div>`;
    if (['C', 'W', 'N'].includes(t)) h += `<div class="chips"><button class="${!area ? 'on' : ''}" data-a="larea" data-k="">All</button>${Object.keys(G.AREAS).filter(a => t === 'C' || a !== 'act').map(a => `<button class="${area === a ? 'on' : ''}" data-a="larea" data-k="${a}">${esc(G.AREAS[a])}</button>`).join('')}</div>`;
    const fixedBy = w => [...G.FIXOF[w].map(k => G.C[k].i + ' ' + G.C[k].n), ...Object.keys(G.F).filter(k => (G.F[k].fix || []).includes(w)).map(k => G.F[k].i + ' ' + G.F[k].n + ' (foundation)')];
    if (t === 'C') Object.keys(G.C).filter(k => !area || G.C[k].a === area).forEach(k => { const C = G.C[k];
      h += `<div class="lc"><div class="lh"><span>${C.i} <b>${esc(C.n)}</b></span><span class="c">${cost(C.m, C.p)}</span></div><div class="ld">${esc(C.d)}</div>${C.fix.length ? `<div class="lf">Closes: ${C.fix.map(w => esc(G.W[w])).join(' · ')}</div>` : `<div class="lf">Needed for EU AI Act high-risk inspections</div>`}</div>`; });
    if (t === 'F') Object.keys(G.F).forEach(k => { const F = G.F[k]; h += `<div class="lc"><div class="lh"><span>${F.i} <b>${esc(F.n)}</b></span><span class="c">${cost(F.m, F.p)}</span></div><div class="ld">${esc(F.d)}</div></div>`; });
    if (t === 'W') Object.keys(G.W).filter(w => !area || G.WAREA[w] === area).forEach(w => { h += `<div class="lc"><div class="lh"><span>⚠️ <b>${esc(G.W[w])}</b></span></div><div class="ld">${esc(G.AREAS[G.WAREA[w]])}</div><div class="lf">Stopped by: ${fixedBy(w).map(esc).join(' · ')}</div></div>`; });
    if (t === 'N') Object.keys(G.N).filter(k => !area || G.N[k].a === area).forEach(k => { const n = G.N[k];
      h += `<div class="lc news"><div class="ls">${esc(n.src)} · ${G.SEV[n.sev].n.toUpperCase()}</div><div class="lh"><b>${esc(n.h)}</b></div><div class="ld">${esc(n.r)}</div><div class="lf">Risk: ${esc(G.W[n.w])}<br>Would have been stopped by: ${fixedBy(n.w).map(esc).join(' · ')}</div></div>`; });
    if (t === 'E') Object.keys(G.EV).forEach(k => { const e = G.EV[k]; h += `<div class="lc"><div class="lh"><span>${e.i} <b>${esc(e.n)}</b></span></div><div class="ld">${esc(e.d)}</div></div>`; });
    if (t === 'P') G.SKEYS.filter(k => k !== 'mixed').forEach(k => { const S = G.SECTORS[k]; h += `<div class="sec">${S.i} ${esc(S.n)}</div>`;
      S.p.forEach(P => { h += `<div class="lc"><div class="lh"><span>${P.i} <b>${esc(P.n)}</b></span><span class="c">€${P.build}k → €${P.earn}k/q</span></div><div class="ld">${esc(P.d)}</div><div class="lf">${G.TIER[P.tier]} · possible risks: ${P.w.map(w => esc(G.W[w])).join(' · ')}</div></div>`; }); });
    return h + `</div></div>`;
  }

  // ---------- events ----------
  function incCard(nid) { const n = G.N[nid]; if (!n) return ''; return `<div class="news"><div class="s">📰 ${esc(n.src)} · ${G.SEV[n.sev].n.toUpperCase()}</div><div class="hh">${esc(n.h)}</div><div class="x">${esc(n.s)}</div><div class="cat">Risk: ${esc(G.W[n.w])}</div></div>`; }
  function verdict(v, m, interactive) {
    const P = G.ALLP[v.prod], n = G.N[v.nid];
    if (v.kind === 'blocked') return `<div class="safe">🛡️ <b>${esc(P.n)}</b>: blocked by <b>${v.by.i} ${esc(v.by.n)}</b>.</div>`;
    if (v.kind === 'partial') return `<div class="part">🛡️ <b>${esc(P.n)}</b>: ${v.by.i} ${esc(v.by.n)} stopped most of it, but without red teaming some got through: <b>${sgn(-v.dmg)}</b>, no trust lost.</div>`;
    if (v.kind === 'notlive') return `<div class="near">😮‍💨 <b>${esc(P.n)}</b> has this risk, but it isn’t live. It would have been hit.</div>`;
    if (v.kind === 'safe') return `<div class="calm">✅ <b>${esc(P.n)}</b>: not exposed to this risk.</div>`;
    const resp = v.resp || 'quiet', on = k => resp === k ? 'on' : '';
    return `<div class="hit">💥 <b>${esc(P.n)}</b> was hit: <b>${sgn(-v.dmg)}</b> and −1 ⭐.
      ${interactive ? `<div class="ch3"><button class="${on('disc')}" data-a="resp" data-id="${v.prod}" data-k="disc"><b>📢 Disclose and fix</b>${myF(m).IRP != null ? 'Free with your incident plan' : '−€' + G.DISCLOSE + 'k'} · no leak risk</button>
        <button class="${on('quiet')}" data-a="resp" data-id="${v.prod}" data-k="quiet"><b>🤫 Stay quiet</b>Free · 50% chance it leaks: −1 ⭐ (−2 ⭐ if a whistleblower talks)</button>
        <button class="${on('pull')}" data-a="resp" data-id="${v.prod}" data-k="pull"><b>⏸️ Pull the product</b>No more income from it</button></div>` : `<div class="rsp">You chose: <b>${{ disc: '📢 Disclose and fix', quiet: '🤫 Stay quiet', pull: '⏸️ Pull it' }[resp]}</b></div>`}</div>`;
  }
  function regBox(R, m) {
    if (!R.reg) return '';
    const e = G.EV[R.reg.id], lines = R.lines.filter(l => l.k === 'reg');
    let h = `<div class="reg"><div class="s">${e.i} ${esc(e.n).toUpperCase()}</div><div class="x">${esc(e.d)}</div>`;
    R.reg.check.forEach(c => { h += `<div class="chk"><b>${G.ALLP[c.prod].i} ${esc(G.ALLP[c.prod].n)}</b>${c.chk.map(([t, ok]) => `<div class="${ok ? 'ok' : 'no'}">${ok ? '✅' : '❌'} ${esc(t)}</div>`).join('')}</div>`; });
    const all = [...lines.map(l => `${esc(l.t)}: <b class="neg">${sgn(l.v)}</b>`), ...R.reg.lines.map(esc)];
    if (R.reg.id === 'WHISTLE') all.push(myF(m).IRP != null ? 'Your incident response plan protects you.' : 'Anything you keep quiet this quarter will leak.');
    h += all.length ? all.map(t => `<div class="rl">${t}</div>`).join('') : (R.reg.id === 'QUIET' ? '' : `<div class="rl ok">✅ You passed.</div>`);
    return h + `</div>`;
  }
  function evScreen(m) {
    const r = sc(pid, m), cur = q(), R = r.quarters[cur] || { hits: [], lines: [], notes: [] }, ev = (state.ev || {})[cur] || {};
    let h = `${topBar(`<span class="qtag">${ql(cur)} · THE NEWS</span>`)}${resBar(r, false)}<div class="sec">THIS QUARTER’S INCIDENT</div>${incCard(ev.inc)}`;
    R.notes.filter(n => n.ban).forEach(n => h += `<div class="hit">🚫 <b>${esc(G.ALLP[n.ban].n)}</b> is a banned AI practice under the EU AI Act (Art. 5). It has been shut down: <b>−€${G.BANFINE}k</b>, −2 ⭐.</div>`);
    h += `<div class="sec">YOUR PRODUCTS</div>`;
    h += R.hits.length ? R.hits.map(v => verdict(v, m, true)).join('') : `<div class="calm">You have no products yet, so nothing could be hit.</div>`;
    if (R.reg) h += `<div class="sec">REGULATORS AND STAKEHOLDERS</div>${regBox(R, m)}`;
    else if (cur === 0) h += `<div class="hint">From ${ql(1)}, regulators, journalists and the board will also check on you.</div>`;
    return h + `<div class="hint">Wait for the host to show the quarter report.</div>`;
  }

  // ---------- report ----------
  function moneyLines(R) { return R.lines.map(l => `<div class="ml"><span>${esc(l.t)}</span><b class="${l.v > 0 ? 'pos' : 'neg'}">${sgn(l.v)}</b></div>`).join(''); }
  function stoppers(w) { return [...G.FIXOF[w].map(k => G.C[k].i + ' ' + G.C[k].n), ...Object.keys(G.F).filter(k => (G.F[k].fix || []).includes(w)).map(k => G.F[k].i + ' ' + G.F[k].n)]; }
  function repScreen(m) {
    const r = sc(pid, m), cur = q(), R = r.quarters[cur] || { lines: [], hits: [], notes: [] }, ev = (state.ev || {})[cur] || {}, n = G.N[ev.inc];
    let h = `${topBar(`<span class="qtag">${ql(cur)} · REPORT</span>`)}${resBar(r, false)}`;
    h += `<div class="sec">MONEY THIS QUARTER</div><div class="box">${moneyLines(R) || '<div class="ml"><span>No spending or income</span><b>€0k</b></div>'}<div class="ml tot"><span>Budget now</span><b>${eur(r.cash)}</b></div></div>`;
    h += `<div class="sec">TRUST</div><div class="box"><div class="ml"><span>Start of quarter</span><b>${stars(R.trustBefore)}</b></div><div class="ml"><span>Now</span><b>${stars(R.trustAfter)}</b></div>
      ${R.hits.filter(v => v.kind === 'hit' && v.resp !== 'disc' && v.resp !== 'pull').map(v => `<div class="ml"><span>🤫 ${esc(G.ALLP[v.prod].n)}: you stayed quiet</span><b class="${v.leaked ? 'neg' : 'pos'}">${v.leaked ? 'It leaked: −2 ⭐' : 'It didn’t leak'}</b></div>`).join('')}
      <div class="hint" style="text-align:left">Trust sets your income: 5 ⭐ earns 100%, and every star lost costs 12%.</div></div>`;
    if (n) h += `<div class="sec">WHAT REALLY HAPPENED</div><div class="tip">📖 ${esc(n.r)}<div class="stp">Would have been stopped by: <b>${stoppers(n.w).map(esc).join(' · ')}</b></div></div>`;
    h += `<div class="sec">LEADERBOARD</div>${lb(true)}`;
    return h + `<div class="hint">${cur + 1 < len() ? 'Next: planning for ' + ql(cur + 1) + '.' : 'Next: final results.'}</div>`;
  }
  function lb(small) { const rk = ranking(); return `<div class="lb">${rk.slice(0, small ? 8 : 20).map((x, i) => `<div class="lr ${x.p.id === pid ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="nm">${esc(x.p.name)}</span><span class="tr">${'★'.repeat(x.r.trust)}</span><b>${eur(x.r.total)}</b></div>`).join('')}</div>`; }

  // ---------- end ----------
  function report(r) {
    const m = r.m, pct = (a, b) => b ? Math.round(100 * a / b) : null;
    const rows = [
      ['🏛️', 'Governance', m.gov + ' of 11 foundations', pct(m.gov, 6) == null ? 0 : Math.min(100, pct(m.gov, 6)), 'Strong programmes build 5–6 foundations.'],
      ['🔍', 'Risk assessment', m.assessN ? m.assessOK + ' of ' + m.assessN + ' launches assessed first' : 'No launches', pct(m.assessOK, m.assessN), 'Assess every product before it goes live.'],
      ['🎯', 'Control selection', m.ctlN ? m.ctlOK + ' of ' + m.ctlN + ' controls matched a real risk' : 'No controls bought', pct(m.ctlOK, m.ctlN), 'Controls only work on the risk they’re designed for.'],
      ['🇪🇺', 'EU AI Act duties', m.actN ? m.actOK + ' of ' + m.actN + ' obligations met' : 'No high- or limited-risk systems live', pct(m.actOK, m.actN), 'High risk: human oversight, documentation, conformity, governance, inventory. Limited risk: tell people it’s AI.'],
      ['🚨', 'Incident response', m.irN ? m.irOK + ' of ' + m.irN + ' incidents disclosed or pulled' : 'No incidents hit you', pct(m.irOK, m.irN), 'Being open costs less than being found out.'],
      ['🚫', 'Prohibited AI', m.banned ? 'Never launched a banned system' : 'Launched a banned system', m.banned ? 100 : 0, 'Some AI uses are banned outright in the EU (Art. 5).'],
    ];
    const scored = rows.filter(x => x[3] != null);
    const best = scored.slice().sort((a, b) => b[3] - a[3])[0], worst = scored.slice().sort((a, b) => a[3] - b[3])[0];
    return { rows, best, worst, avg: scored.length ? Math.round(scored.reduce((s, x) => s + x[3], 0) / scored.length) : 0 };
  }
  function endScreen(m) {
    const r = sc(pid, m), rk = ranking(), pos = rk.findIndex(x => x.p.id === pid) + 1, rep = report(r);
    let h = `${topBar(`<span class="qtag">FINAL</span>`)}<div class="fin"><div class="kick">YOUR SCORE · ${pos ? '#' + pos + ' of ' + rk.length : ''}</div><div class="bign">${eur(r.total)}</div>
      <div class="sub">${eur(r.cash)} cash + ${eur(r.value)} value of live products · ${stars(r.trust)}</div></div>
      <div class="sec">RESPONSIBLE AI REPORT<span>${rep.avg}/100</span></div><div class="box">${rep.rows.map(x => `<div class="bar"><span>${x[0]} ${x[1]}<small>${esc(x[2])}</small></span><div class="b"><i style="width:${x[3] == null ? 0 : x[3]}%;${x[3] != null && x[3] < 50 ? 'background:var(--red)' : ''}"></i></div><em>${x[3] == null ? '–' : x[3]}</em></div>`).join('')}</div>`;
    if (rep.best) h += `<div class="safe">💪 <b>Strength: ${rep.best[1]}.</b> ${esc(rep.best[2])}.</div>`;
    if (rep.worst && rep.worst[3] < 80) h += `<div class="tip">🔦 <b>Blind spot: ${rep.worst[1]}.</b> ${esc(rep.worst[4])}</div>`;
    h += `<div class="sec">YOUR PRODUCTS: THE HIDDEN RISKS</div>`;
    prods().forEach(id => { const P = G.ALLP[id], x = r.prod[id];
      h += `<div class="prod ${x.started ? '' : 'idea'}"><div class="h"><span class="n">${P.i} ${esc(P.n)}</span><span class="tier ${P.tier}">${G.TIER[P.tier]}</span></div><div class="tags">${x.risks.map(w => `<span class="tg ${x.started && stoppers(w).length && Object.keys(x.c || {}).some(k => G.C[k].fix.includes(w)) ? 'ok' : 'r'}">${esc(G.W[w])}</span>`).join('')}</div><div class="earn">${x.started ? (x.live ? 'Live' : x.pulled ? 'Pulled or shut down' : 'Never launched') : 'Not built'}</div></div>`; });
    h += `<div class="sec">LEADERBOARD</div>${lb()}<button class="btn" data-a="cert">🎓 Download my certificate</button>`;
    return h;
  }
  function certificate() {
    const m = me(); if (!m) return; const r = sc(pid, m), rep = report(r), c = document.createElement('canvas'); c.width = 1600; c.height = 1100; const x = c.getContext('2d');
    x.fillStyle = '#0e3b30'; x.fillRect(0, 0, 1600, 1100); x.strokeStyle = '#f2c14e'; x.lineWidth = 6; x.strokeRect(40, 40, 1520, 1020); x.lineWidth = 2; x.strokeRect(58, 58, 1484, 984);
    x.textAlign = 'center'; x.fillStyle = '#f2c14e'; x.font = '800 34px Manrope, sans-serif'; x.fillText('Δ  DELTA · RESPONSIBLE AI LEADERSHIP', 800, 150);
    x.fillStyle = '#fff'; x.font = '800 74px Fraunces, serif'; x.fillText('Certificate of completion', 800, 260);
    x.fillStyle = '#b9c7c0'; x.font = '600 30px Manrope, sans-serif'; x.fillText('awarded to', 800, 330);
    x.fillStyle = '#f2c14e'; x.font = '800 86px Fraunces, serif'; x.fillText(m.name, 800, 440);
    x.fillStyle = '#fff'; x.font = '600 30px Manrope, sans-serif'; x.fillText('for leading AI at ' + sector().org + ' through ' + len() + ' quarters of the DELTA simulation', 800, 510);
    x.font = '800 40px Manrope, sans-serif'; x.fillText('Score ' + eur(r.total).replace('−', '-') + '   ·   Trust ' + r.trust + '/5   ·   RAI report ' + rep.avg + '/100', 800, 590);
    x.textAlign = 'left'; x.font = '700 28px Manrope, sans-serif';
    rep.rows.forEach((row, i) => { const y = 670 + i * 56; x.fillStyle = '#b9c7c0'; x.fillText(row[1], 260, y); x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(620, y - 22, 600, 22); x.fillStyle = row[3] != null && row[3] < 50 ? '#e5484d' : '#3ccf91'; x.fillRect(620, y - 22, 6 * (row[3] || 0), 22); x.fillStyle = '#f2c14e'; x.fillText(row[3] == null ? '–' : String(row[3]), 1250, y); });
    x.textAlign = 'center'; x.fillStyle = '#8fb3a6'; x.font = '600 24px Manrope, sans-serif'; x.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · room ' + ROOM, 800, 1020);
    const a = document.createElement('a'); a.download = 'DELTA-certificate-' + m.name.replace(/[^a-z0-9]+/gi, '-') + '.png'; a.href = c.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }

  // ================= BOARD (optional projector) =================
  function bTop(right) { return `<div class="bbar"><span class="blogo"><b>Δ</b> DELTA <small>Responsible AI Leadership</small></span>${right ? `<span class="bpl">${right}</span>` : ''}</div>`; }
  function qbar() { if (ph() === 'lobby') return ''; return `<div class="qbar">${Array.from({ length: len() }, (_, i) => `<div class="${i < q() || ph() === 'end' ? 'dn' : i === q() ? 'on' : ''}">${ql(i)}</div>`).join('')}</div>`; }
  function board() {
    let h;
    if (ph() === 'lobby') h = bWelcome(); else if (ph() === 'plan') h = bPlan(); else if (ph() === 'ev') h = bEv(); else if (ph() === 'rep') h = bRep(); else h = bEnd();
    return `<div class="sc">${h}${qbar()}</div>`;
  }
  function bWelcome() {
    return `${bTop(`<b>${plist().length}</b> joined`)}<div class="g2"><div><div class="kick">${sector().i} ${esc(sector().n).toUpperCase()} · ${len()} QUARTERS</div><h1 class="bh">Build AI. Govern it.<br>Survive the headlines.</h1>${rules()}</div>
      <div><div class="qr"><div class="u">Scan to join</div>${qrSVG(joinURL())}<div class="u">${esc(joinURL().replace(/^https?:\/\//, ''))}</div></div><div class="who">${plist().map(p => `<span>${esc(p.name)}</span>`).join('')}</div></div></div>`;
  }
  function bPlan() {
    const ps = plist(), cur = q();
    const busy = ps.map(p => { const x = p.p || {}; let n = Object.values(p.f || {}).filter(v => v === cur).length; Object.values(x).forEach(o => { if (o.s === cur) n++; if (o.a === cur) n++; if (o.l === cur) n++; n += Object.values(o.c || {}).filter(v => v === cur).length; }); return { p, n }; });
    return `${bTop(`<b>${ql(cur)}</b> of ${len()} · planning`)}<div class="g2"><div><div class="kick">PLANNING ON YOUR PHONES</div><div class="btmr" data-tmr>${state.deadline ? fmtT(left()) : ''}</div>
      <div class="box"><div class="t">THIS QUARTER YOU CAN</div><div class="s2"><span>💡 Start a product</span><b>1 quarter to build</b></div><div class="s2"><span>🔍 Assess a product</span><b>see its 3 risks</b></div><div class="s2"><span>🛡️ Add controls</span><b>protect one product</b></div><div class="s2"><span>🏛️ Build foundations</span><b>protect everything</b></div><div class="s2"><span>🚀 Launch or ⏸️ pull</span><b>free</b></div></div></div>
      <div class="box"><div class="t">ACTIONS THIS QUARTER</div>${busy.sort((a, b) => b.n - a.n).map(x => `<div class="s2"><span>${esc(x.p.name)}</span><b>${x.n ? x.n + ' ✓' : '…'}</b></div>`).join('') || '<div class="s2"><span>No players yet</span></div>'}</div></div>`;
  }
  function bEv() {
    const cur = q(), ev = (state.ev || {})[cur] || {}, n = G.N[ev.inc], ps = plist();
    let hit = 0, blk = 0, near = 0, ban = 0; ps.forEach(p => { const R = sc(p.id, p).quarters[cur]; if (!R) return; R.hits.forEach(v => { if (v.kind === 'hit') hit++; if (v.kind === 'blocked' || v.kind === 'partial') blk++; if (v.kind === 'notlive') near++; }); ban += R.notes.filter(x => x.ban).length; });
    const e = ev.reg && G.EV[ev.reg];
    return `${bTop(`<b>${ql(cur)}</b> · the news`)}<div class="g2"><div>${n ? `<div class="paper"><div class="brk">BREAKING</div><div class="mh">${esc(n.src)}</div><div class="h">${esc(n.h)}</div><div class="ar">${esc(n.s)}</div><div class="cat">Risk: ${esc(G.W[n.w])} · ${G.SEV[n.sev].n}</div></div>` : ''}</div>
      <div>${e ? `<div class="box"><div class="t">${e.i} ${esc(e.n).toUpperCase()}</div><div class="bd">${esc(e.d)}</div></div>` : ''}
      <div class="box" style="margin-top:14px"><div class="t">ACROSS THE ROOM</div><div class="s2"><span>💥 Products hit</span><b>${hit}</b></div><div class="s2"><span>🛡️ Blocked by a control</span><b>${blk}</b></div><div class="s2"><span>😮‍💨 Lucky: not live yet</span><b>${near}</b></div>${ban ? `<div class="s2"><span>🚫 Banned systems shut down</span><b>${ban}</b></div>` : ''}</div>
      <div class="bd" style="margin-top:12px">If you were hit, choose on your phone: disclose, stay quiet, or pull it.</div></div></div>`;
  }
  function bRep() { const cur = q(), n = G.N[((state.ev || {})[cur] || {}).inc];
    return `${bTop(`<b>${ql(cur)}</b> · report`)}<div class="g2"><div>${n ? `<div class="box"><div class="t">📖 WHAT REALLY HAPPENED</div><div class="bd big">${esc(n.r)}</div><div class="bd" style="margin-top:10px">Would have been stopped by: <b>${stoppers(n.w).map(esc).join(' · ')}</b></div></div>` : ''}</div><div>${bLB()}</div></div>`; }
  function bLB() { return `<div class="box"><div class="t">LEADERBOARD</div><table>${ranking().slice(0, 10).map((x, i) => `<tr class="${i ? '' : 'lead'}"><td class="n">${i + 1}</td><td>${esc(x.p.name)}</td><td class="s">${'★'.repeat(x.r.trust)}</td><td class="b">${eur(x.r.total)}</td></tr>`).join('')}</table></div>`; }
  function bEnd() { const rk = ranking();
    return `${bTop('Final results')}<div class="g2"><div><div class="kick">THE WINNER</div><h1 class="bh">${rk[0] ? esc(rk[0].p.name) : '—'}</h1>${rk[0] ? `<div class="bign">${eur(rk[0].r.total)}</div>` : ''}<div class="bd" style="margin-top:14px">Open your phone for your Responsible AI report and certificate.</div></div><div>${bLB()}</div></div>`; }

  // ================= HOST =================
  function host() {
    const p = ph(), cur = q(), sk = state.sector || 'bank';
    let h = `<div class="ph host">${topBar(`<span class="pill">HOST · ${esc(ROOM)}</span>`)}<div class="sec">STATUS</div><div class="box"><div class="ml"><span>Phase</span><b>${{ lobby: 'Lobby', plan: ql(cur) + ' planning', ev: ql(cur) + ' news', rep: ql(cur) + ' report', end: 'Finished' }[p]}</b></div><div class="ml"><span>Players</span><b>${plist().length}</b></div>${p === 'plan' ? `<div class="ml"><span>Time left</span><b data-tmr>${fmtT(left())}</b></div>` : ''}</div>`;
    if (p === 'lobby') {
      h += `<div class="sec">SECTOR</div><div class="chips big">${G.SKEYS.map(k => `<button class="${sk === k ? 'on' : ''}" data-a="hset" data-f="sector" data-k="${k}">${G.SECTORS[k].i} ${esc(G.SECTORS[k].n)}</button>`).join('')}</div>
        <div class="sec">QUARTERS</div><div class="chips big">${[4, 6].map(n => `<button class="${len() === n ? 'on' : ''}" data-a="hset" data-f="len" data-k="${n}">${n} quarters</button>`).join('')}</div>
        <div class="sec">PLANNING TIME PER QUARTER</div><div class="chips big">${[2, 3, 4, 5].map(n => `<button class="${(state.planMin || CFG.planMinutes || 3) === n ? 'on' : ''}" data-a="hset" data-f="planMin" data-k="${n}">${n} min</button>`).join('')}</div>`;
    }
    const nx = { lobby: '▶ Start the game', plan: '📰 Reveal the news', ev: '📊 Show the quarter report', rep: cur + 1 < len() ? '▶ Plan ' + ql(cur + 1) : '🏆 Final results', end: '' }[p];
    if (nx) h += `<button class="btn" data-a="next">${nx}</button>`;
    if (p === 'plan') h += `<button class="btn ghost" data-a="plus">+1 minute</button>`;
    if (p === 'ev' || p === 'rep') { const ev = (state.ev || {})[cur] || {}; h += `<div class="hint">Incident: ${esc((G.N[ev.inc] || {}).h || '—')}<br>Event: ${esc((G.EV[ev.reg] || {}).n || 'none (first quarter)')}</div>`; }
    h += `<div class="sec">LINKS</div><div class="hint" style="text-align:left">Players: ${esc(joinURL())}<br>Projector (optional): ${esc(location.origin + location.pathname)}?board${ROOM !== (CFG.room || 'dnb') ? '&room=' + ROOM : ''}</div>`;
    h += `<button class="btn ghost danger" data-a="reset">${ui.hostConfirm ? 'Tap again to wipe this room' : '↺ Reset room'}</button>`;
    if (p !== 'lobby') h += `<div class="sec">LEADERBOARD</div>${lb()}`;
    return h + `</div>`;
  }
  async function hostNext() {
    const p = ph(), now = DB.now(), cur = q(), min = state.planMin || CFG.planMinutes || 3;
    if (p === 'lobby') { const seed = Math.random().toString(36).slice(2, 10), sk = state.sector || 'bank';
      return DB.set(BASE + '/state', { phase: 'plan', sector: sk, len: len(), planMin: min, seed, products: G.productsFor(sk, seed), q: 0, ev: {}, deadline: now + min * 60000, t: now }); }
    if (p === 'plan') { const e = G.drawEvents(state, players); return DB.update(BASE + '/state', { phase: 'ev', ['ev/' + cur]: e, deadline: null, t: now }); }
    if (p === 'ev') return DB.update(BASE + '/state', { phase: 'rep', t: now });
    if (p === 'rep') { if (cur + 1 < len()) return DB.update(BASE + '/state', { phase: 'plan', q: cur + 1, deadline: now + min * 60000, t: now }); return DB.update(BASE + '/state', { phase: 'end', t: now }); }
  }

  // ================= actions =================
  const myBase = () => BASE + '/players/' + pid;
  function afford(m, money, ppl) { const info = G.planInfo(state, pid, m); if (money > info.cash + 1e-9) { toast('Not enough budget: you have ' + eur(info.cash)); return false; } if (ppl > info.peopleLeft) { toast('No people left this quarter (' + G.PEOPLE + ' per quarter)'); return false; } return true; }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a, id = b.dataset.id, k = b.dataset.k, m = me(), cur = q();
    if (a === 'join') { const n = (document.getElementById('nm').value || '').trim().slice(0, 18); if (!n) return toast('Type your name first');
      pid = pid || ('p' + Math.random().toString(36).slice(2, 10)); try { localStorage.setItem(PIDK, pid); } catch (er) { try { sessionStorage.setItem(PIDK, pid); } catch (er2) {} }
      DB.set(myBase(), { name: n, t: DB.now() }); sfx('stamp'); return; }
    if (a === 'lib') { ui.lib = 1; return render(true); }
    if (a === 'close') { ui.lib = null; ui.sheet = null; return render(true); }
    if (a === 'ltab') { ui.libTab = k; ui.libArea = ''; render(true); const o = document.querySelector('.ov .in'); if (o) o.scrollTop = 0; return; }
    if (a === 'larea') { ui.libArea = k; return render(true); }
    if (a === 'ctl') { ui.sheet = id; render(true); const o = document.querySelector('.ov .in'); if (o) o.scrollTop = 0; return; }
    if (a === 'cert') return certificate();
    // host
    if (a === 'hset') { const v = b.dataset.f === 'sector' ? k : Number(k); return DB.update(BASE + '/state', { [b.dataset.f]: v }); }
    if (a === 'next') { sfx('whoosh'); return hostNext(); }
    if (a === 'plus') return DB.update(BASE + '/state', { deadline: Math.max(state.deadline || 0, DB.now()) + 60000 });
    if (a === 'reset') { if (!ui.hostConfirm) { ui.hostConfirm = 1; render(true); setTimeout(() => { ui.hostConfirm = 0; render(true); }, 4000); return; }
      ui.hostConfirm = 0; return DB.set(BASE, { state: { phase: 'lobby', sector: state.sector || 'bank', len: len(), planMin: state.planMin || null } }); }
    if (!m) return;
    if (a === 'resp') { if (ph() !== 'ev') return; sfx(k === 'disc' ? 'shield' : k === 'pull' ? 'whoosh' : 'clang'); return DB.update(myBase() + '/r/' + cur, { [id]: k }); }
    if (!canAct()) return toast('Planning time is over');
    const x = myP(m, id || ''), pb = myBase() + '/p/' + id;
    if (a === 'start') { if (!afford(m, G.ALLP[id].build, 0)) return; sfx('stamp'); return DB.set(pb, { s: cur }); }
    if (a === 'unstart') { if (x.s !== cur) return; return DB.set(pb, null); }
    if (a === 'assess') { if (x.a === cur) return DB.update(pb, { a: null }); if (x.a != null) return; if (!afford(m, G.ASSESS.m, G.ASSESS.p)) return; sfx('flip'); return DB.update(pb, { a: cur }); }
    if (a === 'launch') { if (x.l === cur) return DB.update(pb, { l: null }); if (x.l != null || !(x.s < cur)) return; sfx('fanfare'); return DB.update(pb, { l: cur }); }
    if (a === 'pull') { if (x.x === cur - 0.5) return DB.update(pb, { x: null }); if (x.l == null || x.x != null) return; sfx('whoosh'); return DB.update(pb, { x: cur - 0.5 }); }
    if (a === 'addc') { const pid2 = ui.sheet, y = myP(m, pid2), cs = y.c || {}, C = G.C[k];
      if (cs[k] === cur) return DB.update(myBase() + '/p/' + pid2 + '/c', { [k]: null }); if (cs[k] != null) return;
      if (!afford(m, C.m, C.p)) return; sfx('shield'); return DB.update(myBase() + '/p/' + pid2 + '/c', { [k]: cur }); }
    if (a === 'fnd') { const f = myF(m), F = G.F[k];
      if (f[k] === cur) { const dep = Object.keys(G.F).filter(j => (G.F[j].need || []).includes(k) && f[j] === cur); const o = { [k]: null }; dep.forEach(j => o[j] = null); return DB.update(myBase() + '/f', o); }
      if (f[k] != null) return; const need = (F.need || []).filter(n => f[n] == null); if (need.length) return toast('Build ' + need.map(n => G.F[n].n).join(' and ') + ' first');
      if (!afford(m, F.m, F.p)) return; sfx('stamp'); return DB.update(myBase() + '/f', { [k]: cur }); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'nm') { const b = document.querySelector('[data-a="join"]'); if (b) b.click(); } if (e.key === 'Escape' && (ui.lib || ui.sheet)) { ui.lib = null; ui.sheet = null; render(true); } });
  render(true);
})();
