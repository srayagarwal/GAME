/* DELTA · screens for player phones, the projector (?board) and the host (?host=KEY). */
(function () {
  const G = window.DeltaGame, CFG = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || CFG.room || 'dnb').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const BASE = 'games/delta-' + ROOM, PIDK = 'delta_pid_' + ROOM;
  const VIEW = Q.has('board') ? 'board' : Q.get('host') ? (Q.get('host') === CFG.hostKey ? 'host' : 'nohost') : 'player';
  const $app = document.getElementById('app');
  let state = {}, players = {}, pid = null, ui = { tab: 'p', seen: {}, sheetSkip: {} }, lastSig = '', lastPhase = null;
  try { pid = localStorage.getItem(PIDK) || sessionStorage.getItem(PIDK); } catch (e) {}
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ph = () => state.phase || 'lobby', idx = () => state.idx || 0, projId = () => (state.projects || [])[idx()], proj = () => G.ALLP[projId()];
  const me = () => (pid && players[pid]) ? players[pid] : null;
  const eur = v => (v < 0 ? '−€' : '€') + Math.abs(Math.round(v * 10) / 10) + 'k';
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + '€' + Math.abs(Math.round(v * 10) / 10) + 'k';
  const stars = n => '⭐'.repeat(Math.max(0, n)) + '<span style="opacity:.25">' + '⭐'.repeat(5 - Math.max(0, n)) + '</span>';
  const starsB = n => '★'.repeat(Math.max(0, n)) + '<i>' + '★'.repeat(5 - Math.max(0, n)) + '</i>';
  const dom = () => G.DOMAINS[state.dom || 'bank'];
  const len = () => state.len || 4;
  const left = () => Math.max(0, (state.deadline || 0) - DB.now());
  const fmtT = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const upd = (path, obj) => DB.update(BASE + path, obj);
  const plist = () => Object.entries(players).filter(([, p]) => p && p.name).map(([id, p]) => Object.assign({ id }, p));
  const sc = (id, p) => G.score(state, id, p || players[id]);
  const myPr = () => ((me() || {}).pr || {})[idx()] || {};
  const tierHTML = (p, show) => !show ? `<div class="tier unk">🏛️ EU AI Act tier: unknown<small>Buy the AI governance framework to see risk tiers</small></div>`
    : `<div class="tier ${p.tier === 'prohibited' ? 'pro' : ''}">🏛️ EU AI Act: ${G.TIER[p.tier]}<small>Shown because you own the AI governance framework</small></div>`;
  const qrSVG = text => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); };
  const joinURL = () => location.origin + location.pathname + (ROOM !== (CFG.room || 'dnb') ? '?room=' + ROOM : '');

  // ---------------- data ----------------
  DB.on(BASE + '/state', v => { state = v || {}; if (lastPhase !== null && lastPhase !== ph()) { ui.sheetSkip = {}; ui.tab = 'p'; ui.size = null; } lastPhase = ph(); render(); });
  DB.on(BASE + '/players', v => { players = v || {}; render(); });
  setInterval(() => { if (state.deadline && ['deal'].includes(ph())) { document.querySelectorAll('[data-tmr]').forEach(el => el.textContent = fmtT(left())); if (left() <= 0 && !ui.expired) { ui.expired = 1; render(true); } } if (left() > 0) ui.expired = 0; }, 500);

  function render(force) {
    const sig = JSON.stringify([state, VIEW === 'board' ? plist().map(p => [p.id, p.name, p.pr, p.f]) : players, ui.tab, ui.expired, ui.hostConfirm]);
    if (!force && sig === lastSig) return; lastSig = sig;
    const y = window.scrollY;
    if (VIEW === 'board') $app.innerHTML = board();
    else if (VIEW === 'host') $app.innerHTML = host();
    else if (VIEW === 'nohost') $app.innerHTML = `<div class="ph"><div class="wait"><div class="big">🔒</div><h2>Wrong host key</h2></div></div>`;
    else $app.innerHTML = player();
    bind(); if (VIEW === 'player') window.scrollTo(0, y);
  }

  // ================= PLAYER =================
  function topBar(r) { return `<div class="top"><span class="logo"><b>Δ</b> DELTA</span><span class="stat"><span class="pill ${r && r.budget < 0 ? 'neg' : 'g'}">${r ? eur(r.budget) : '€' + G.START + 'k'}</span><span class="pill">${stars(r ? r.stars : 5)}</span></span></div>`; }
  function player() {
    const m = me();
    if (!m) return joinScreen();
    const r = sc(pid, m);
    const p = ph();
    let body;
    if (p === 'lobby') body = lobbyScreen(m);
    else if (p === 'deal') body = dealScreen(m, r);
    else if (p === 'w1' || p === 'w4') body = newsScreen(m, r);
    else if (p === 'm3') body = resultScreen(m, r);
    else if (p === 'end') body = endScreen(m, r);
    else body = '';
    return `<div class="ph">${topBar(r)}${body}</div>`;
  }
  function rulesList() { return `<ul class="rules">
    <li><span>🔒</span><div>Each project has <b>2 hidden weaknesses</b>. Only you can see yours.</div></li>
    <li><span>💰</span><div><b>One budget for the whole game.</b> €${G.START}k must last all ${len()} projects, so about <b>€${Math.round(G.START / len())}k each</b>. Don't spend it all on project 1.</div></li>
    <li><span>🛡️</span><div>Buy only the <b>controls</b> that fix your weaknesses. You don't need every card.</div></li>
    <li><span>🚀</span><div>Launch <b>small or big</b>, or <b>pause</b> if it looks wrong.</div></li>
    <li><span>📰</span><div>Watch the big screen. <b>Real AI incidents</b> will break.</div></li>
    <li><span>⭐</span><div>Lose trust and you <b>earn less</b> on every project after.</div></li></ul>`; }
  function joinScreen() {
    const d = dom();
    return `<div class="ph"><div class="logo" style="font-size:18px"><b>Δ</b> DELTA</div>
      <h2 style="font-size:29px;margin-top:14px">You're the new <em>Head of AI</em> at ${esc(d.org)}.</h2>
      <div class="obj"><div class="t">🎯 YOUR OBJECTIVE</div>Run ${len()} AI projects. Finish with the <b>biggest budget</b> while keeping customers' <b>trust ⭐</b>.</div>
      <div class="k">How it works</div>${rulesList()}
      <div class="facts"><div><b>€${G.START}k</b>for all ${len()}</div><div><b>⭐×5</b>trust</div><div><b>~${len() * 5} min</b>${len()} projects</div></div>
      <input class="inp" id="nm" maxlength="14" placeholder="Your name…" autocomplete="off">
      <button class="btn" id="join">Join the game →</button></div>`;
  }
  function lobbyScreen(m) {
    return `<h2>You're in, <em>${esc(m.name)}</em>.</h2>
      <div class="obj"><div class="t">🎯 YOUR OBJECTIVE</div>You're the new Head of AI at ${esc(dom().org)}. Run ${len()} AI projects. Finish with the <b>biggest budget</b> while keeping customers' <b>trust ⭐</b>.</div>
      <div class="k">How it works</div>${rulesList()}
      <div class="wait" style="padding:16px 0"><div class="hint">Waiting for the host to start the first project…</div></div>`;
  }
  // ---- shop + launch ----
  function dealScreen(m, r) {
    const p = proj(), i = idx(), pr = myPr(), c = pr.c || {}, my = G.dealt(state.seed, pid, i, projId());
    const showTier = G.ownsF(m, 'GOV', i), expired = left() <= 0;
    const fixes = w => Object.keys(c).some(k => G.C[k].fix.includes(w)) || Object.keys(G.F).some(k => G.ownsF(m, k, i) && G.F[k].fix.includes(w));
    const head = `<div class="k">Project ${i + 1} of ${len()} · ${dom().i} ${esc(dom().n)}</div>
      <div class="proj"><div class="ic">${p.i}</div><h3>${esc(p.n)}</h3><p>${esc(p.d)}</p>${tierHTML(p, showTier)}</div>
      <div class="k">🔒 Your hidden weaknesses · only you can see these</div>
      <div class="wk">${my.map(w => { const f = fixes(w), ctl = Object.values(G.C).find(x => x.fix.includes(w)) || Object.values(G.F).find(x => x.fix.includes(w));
        return `<div class="wc ${f ? 'fx' : ''}"><div class="wt">${f ? '✓ FIXED' : 'WEAKNESS'}</div><div class="t">${esc(G.W[w])}</div><div class="f">Fix: ${ctl.i} ${esc(ctl.n)}</div></div>`; }).join('')}</div>`;
    if (pr.s0) {
      const s = pr.s0 === 'pause' ? null : G.SIZE[pr.s0];
      return head + `<div class="lockd"><div class="e">${s ? s.e : '⏸️'}</div><b>${s ? s.n + ' launched' : 'Project paused'}</b>
        <div class="hint">${s ? 'Watch the big screen for the news.' : 'You won’t earn from this one, but nothing can hit you.'}</div>
        ${expired ? '' : '<button class="btn gh" id="relaunch">↩︎ Change my decision</button>'}</div>`;
    }
    if (expired) return head + `<div class="lockd"><div class="e">⏰</div><b>Time’s up</b><div class="hint">You didn’t launch, so this project is paused. Only the €${G.BUILD}k build cost is charged.</div></div>`;
    const tab = ui.tab;
    // shortlist: the controls that fix your weaknesses + a few look-alikes (same for this player and project), plus anything already bought
    const allC = Object.keys(G.C), fixC = allC.filter(k => G.C[k].fix.some(w => my.includes(w)));
    const decoy = G.shuffle(allC.filter(k => !fixC.includes(k)), state.seed + ':' + pid + ':' + i + ':dc').slice(0, 6 - Math.min(fixC.length, 3));
    const shortC = G.shuffle(fixC.concat(decoy), state.seed + ':' + i + ':ord').concat(Object.keys(c).filter(k => !fixC.includes(k) && !decoy.includes(k)));
    const list = tab === 'p' ? (ui.allC ? allC : shortC) : Object.keys(G.F);
    // budget pacing: how much of the money should go on this project
    const cards$ = Object.keys(c).reduce((a, k) => a + G.C[k].cost, 0) + Object.keys(G.F).filter(k => m.f && m.f[k] === i).reduce((a, k) => a + G.F[k].cost, 0);
    const startHere = r.budget + cards$;  // cards are already deducted from r.budget while shopping
    const spentHere = G.BUILD + cards$ + (ui.size && ui.size !== 'pause' ? G.SIZE[ui.size].cost : 0);
    const left_ = len() - i, fair = Math.round(startHere / left_);
    const pace = `<div class="pace ${spentHere > fair && left_ > 1 ? 'over' : ''}">💰 <b>${eur(startHere)}</b> must last <b>${left_ === 1 ? 'this last project' : 'all ' + left_ + ' projects left'}</b>. ${left_ === 1 ? 'Spend what helps.' : `Aim for about <b>€${fair}k</b> on this one.`}<div class="pb"><i style="width:${Math.min(100, Math.round(spentHere / Math.max(fair, 1) * 100))}%"></i></div><small>This project so far: €${spentHere}k (build + cards + launch)${spentHere > fair && left_ > 1 ? ' · over your share, leave room for the next ones' : ''}</small></div>`;
    const cards = list.map(k => {
      const x = tab === 'p' ? G.C[k] : G.F[k], match = x.fix.some(w => my.includes(w));
      if (tab === 'p') { const own = !!c[k];
        return `<button class="cc ${own ? 'own' : ''} ${match && !own ? 'match' : ''}" data-ctl="${k}">${own ? '<span class="bought">✓ BOUGHT</span>' : ''}<span class="ic">${x.i}</span><div class="c">€${x.cost}k</div><div class="n">${esc(x.n)}</div><div class="d">${esc(x.d)}</div>${match ? '<span class="mt">FIXES YOUR WEAKNESS</span>' : ''}${x.sec ? '<div class="tip">💡 Tip: pair it with Red teaming</div>' : ''}</button>`; }
      const owned = m.f && m.f[k] != null, mine = owned && m.f[k] === i, locked = x.wild && (!(m.f && m.f.IRP != null) || !(m.f && m.f.INV != null));
      return `<button class="cc ${owned ? (mine ? 'own' : 'done') : ''} ${match && !owned ? 'match' : ''} ${locked && !owned ? 'lock' : ''}" data-fnd="${k}">${owned ? '<span class="bought">✓ OWNED</span>' : ''}<span class="ic">${x.i}</span><div class="c">€${x.cost}k</div><div class="n">${esc(x.n)}</div><div class="d">${esc(x.d)}</div>${match ? '<span class="mt">FIXES YOUR WEAKNESS</span>' : ''}${x.sec ? '<div class="tip">💡 Tip: pair it with Red teaming</div>' : ''}${locked && !owned ? '<div class="ow">🔒 Needs Incident response plan + AI inventory</div>' : ''}${owned && !mine ? '<div class="ow">Covers every project</div>' : ''}</button>`;
    }).join('');
    if (ui.size && ui.size !== 'pause' && r.budget < G.BUILD + G.SIZE[ui.size].cost) ui.size = null;  // bought cards since choosing: drop a size you can no longer afford
    const sel = ui.size || null, bud = r.budget;
    const opt = k => { const s = G.SIZE[k], need = G.BUILD + s.cost;
      return `<button class="lc ${sel === k ? 'on' : ''}" data-size="${k}" ${bud < need && sel !== k ? 'disabled' : ''}><span class="e">${s.e}</span><div><div class="nm">${s.n}</div><div class="s">${s.s}</div></div><div class="r">Costs <b>€${s.cost}k</b>Earns €${s.earn}k · damage ×${s.mult === .5 ? '½' : s.mult}</div></button>`; };
    return head + pace + `<div class="k" style="display:flex;justify-content:space-between"><span>👆 Tap a card to buy it · tap again to undo</span><span class="tmr" data-tmr>${fmtT(left())}</span></div>
      <div class="tabs"><button data-tab="p" class="${tab === 'p' ? 'on' : ''}">🛡️ This project</button><button data-tab="f" class="${tab === 'f' ? 'on' : ''}">🏗️ Foundation</button></div>
      <div class="grid">${cards}</div>
      ${tab === 'p' ? `<button class="more" id="allc">${ui.allC ? '▲ Show the shortlist only' : '▼ Show all ' + allC.length + ' controls'}</button>` : ''}
      <div class="hint">${tab === 'p' ? 'Project controls protect this project only. You only need the ones that fix your weaknesses.' : 'Foundation cards are bought once and protect every project from now on. You don’t need them all.'}</div>
      <div class="k">Choose how big to launch (+ €${G.BUILD}k build cost) · tap again to unselect</div>
      ${G.ORDER.map(opt).join('')}
      <button class="lc pa ${sel === 'pause' ? 'on' : ''}" data-size="pause"><span class="e">⏸️</span><div><div class="nm">Pause</div><div class="s">Don't launch this one</div></div><div class="r">Lose <b>€${G.BUILD}k</b>build cost only</div></button>
      <div class="hint">After the news you can expand or pause, and you can undo that until Month 3.</div>
      <button class="btn" id="go" ${sel ? '' : 'disabled'}>${sel ? (sel === 'pause' ? 'Pause this project ⏸️' : 'Launch ' + G.SIZE[sel].n + ' ' + G.SIZE[sel].e) : 'Choose a launch size'}</button>`;
  }
  // ---- news ----
  function verdict(v) {
    const n = G.N[v.nid];
    if (v.kind === 'hit') return `⚠️ Hits you: ${esc(G.W[n.w].toLowerCase())} · ${sgn(-v.dmg)}`;
    if (v.kind === 'partial') return `🛡️ ${esc(v.by.n)} held only partly: never red-teamed · ${sgn(-v.dmg)}`;
    if (v.kind === 'blocked') return `✅ Blocked by ${esc(v.by.i + ' ' + v.by.n)}`;
    if (v.kind === 'wouldHit') return `⏸️ Would have hit you, but you’re not live`;
    if (v.kind === 'wouldPartial') return `⏸️ Would have partly hit you, but you’re not live`;
    return '✓ Not your risk';
  }
  function newsCard(v, isNew) { const n = G.N[v.nid];
    return `<div class="news ${v.kind} ${isNew ? 'new' : ''}"><div class="src"><span>${esc(n.src)}</span><span>${esc(G.AREAS[n.a])}</span></div><div class="h">${esc(n.h)}</div><span class="v">${verdict(v)}</span></div>`; }
  function newsScreen(m, r) {
    const i = idx(), R = r.proj[i], stage = ph() === 'w1' ? 1 : 2, pr = myPr();
    const cards = R.hits.slice().sort((a, b) => b.stage - a.stage);
    // size going INTO this news week (this week's own choice can still be changed)
    const b0 = pr.s0 && pr.s0 !== 'pause' ? pr.s0 : null;
    const before = stage === 1 ? b0 : (b0 && pr.s1 !== 'pause' ? (pr.s1 || b0) : null);
    const live = !!before;
    const key = stage === 1 ? 's1' : 's2', cur = pr[key] || null;
    let decide = '';
    if (live) {
      const s = before, nxt = G.ORDER[G.ORDER.indexOf(s) + 1], diff = nxt ? G.SIZE[nxt].cost - G.SIZE[s].cost : 0;
      const now = cur === 'pause' ? '⏸️ Paused' : cur ? G.SIZE[cur].e + ' ' + G.SIZE[cur].n : G.SIZE[s].e + ' ' + G.SIZE[s].n;
      decide = `<div class="k">You were live: ${G.SIZE[s].e} ${G.SIZE[s].n}. What now? · <span style="color:var(--gold)">Now: ${now}</span></div>
        <div class="row3"><button data-dec="stay" class="${!cur ? 'on' : ''}">Stay<small>keep going</small></button>
        <button data-dec="${nxt || ''}" class="${cur && cur === nxt ? 'on' : ''}" ${nxt && (cur === nxt || r.budget >= diff) ? '' : 'disabled'}>⬆️ Expand<small>${nxt ? G.SIZE[nxt].n + ' · €' + diff + 'k' : 'already max'}</small></button>
        <button data-dec="pause" class="pz ${cur === 'pause' ? 'on' : ''}">⏸️ Pause<small>half launch cost back</small></button></div>
        <div class="hint">${cur ? 'Changed your mind? Tap it again (or Stay) to undo. ' : ''}Month 3 comes next: the regulator and the press.</div>`;
    } else decide = `<div class="lockd"><div class="e">⏸️</div><b>Your project is paused</b><div class="hint">News can’t hurt you, but you won’t earn from it.</div></div>`;
    const pending = R.hits.find(v => v.kind === 'hit' && v.star && !v.resp && v.stage === stage && !ui.sheetSkip[v.nid]);
    let sheet = '';
    if (pending) { const n = G.N[pending.nid], irp = G.ownsF(m, 'IRP', i);
      sheet = `<div class="dim"><div class="sheet"><div class="tt">🚨 INCIDENT · YOUR ${esc(proj().n.toUpperCase())}</div><h3>${esc(n.h)}</h3>
        <p>It costs you <b>${eur(pending.dmg)}</b> either way. What do you tell people?</p>
        <button class="opt g" data-resp="disc" data-nid="${pending.nid}"><b>📢 Disclose and fix</b><div>${irp ? 'Free with your Incident response plan.' : 'Pay €10k.'} Tell customers, fix it. You keep your ⭐.</div></button>
        <button class="opt r" data-resp="quiet" data-nid="${pending.nid}"><b>🤐 Stay quiet</b><div>Free. 50% chance it leaks in Month 3: −2 ⭐ and your name on the big screen.</div></button>
        <div class="hint" style="color:#8a8170">Decide nothing and you lose 1 ⭐.</div></div></div>`; }
    return `<div class="k">📰 The news · does it affect you?</div>
      ${cards.map(v => newsCard(v, v.stage === stage)).join('')}${decide}${sheet}`;
  }
  // ---- results ----
  function m3Box(R, m) { const M = G.M3[R.m3.id];
    return `<div class="m3c"><div class="t">🏛️ MONTH 3</div><h3>${M.i} ${esc(M.n)}</h3><p>${esc(M.d)}</p>
      ${R.m3.check ? `<div class="chk">${R.m3.check.map(c => `<span class="${c[1] ? 'ok' : 'neg'}" style="color:${c[1] ? '#127a48' : '#a3141a'}">${c[1] ? '✓' : '✗'} ${esc(c[0])}</span>`).join('')}</div>` : ''}
      ${R.m3.lines.length ? R.m3.lines.map(l => `<div class="ln">${esc(l)}</div>`).join('') : `<div class="ln ok">✓ Nothing here hurt you.</div>`}</div>`; }
  function resultScreen(m, r) {
    const R = r.proj[idx()]; const tot = R.net;
    const title = proj().trap ? (R.size || R.lines.some(l => l.txt.includes('prohibited')) ? 'You launched a banned system.' : 'You spotted the trap.') : R.paused ? 'You paused this one.' : tot >= 0 ? 'Launched and profitable.' : 'Launched, but it cost you.';
    const real = R.hits.filter(v => ['hit', 'partial', 'wouldHit', 'wouldPartial'].includes(v.kind));
    return `<div class="k">Results · project ${idx() + 1} of ${len()}</div><h2>${esc(title)}</h2>
      ${m3Box(R, m)}
      <div class="k">Where your money went</div>
      <div class="res">${R.lines.filter(l => l.v || l.kind === 'disc').map(l => `<div class="rl"><span>${esc(l.txt)}</span><b class="${l.v > 0 ? 'pos' : l.v < 0 ? 'neg' : ''}">${l.v ? sgn(l.v) : '€0'}</b></div>`).join('')}
        <div class="rl tot"><span>This project</span><b class="${tot >= 0 ? 'pos' : 'neg'}">${sgn(tot)}</b></div>
        <div class="rl"><span>Trust</span><b>${R.starsBefore} → ${R.starsAfter} ⭐</b></div></div>
      <div class="lesson">${esc(R.lesson || '')}</div>
      ${real.map(v => { const n = G.N[v.nid]; return `<div class="wr"><div class="t">WHAT REALLY HAPPENED</div><div class="h">${esc(n.h)}</div>${esc(n.r)}</div>`; }).join('')}
      <div class="hint" style="margin-top:14px">${idx() + 1 < len() ? 'Next project coming up…' : 'Final results coming up…'}</div>`;
  }
  function ranking() { return plist().map(p => ({ p, r: sc(p.id, p) })).sort((a, b) => b.r.budget - a.r.budget || b.r.stars - a.r.stars); }
  function endScreen(m, r) {
    const rk = ranking(), pos = rk.findIndex(x => x.p.id === pid) + 1, most = Math.max(...rk.map(x => x.r.stars));
    return `<div class="k">Final results</div><div class="rank">#${pos}</div><div class="hint">of ${rk.length} players</div>
      <div class="facts"><div><b>${eur(r.budget)}</b>budget</div><div><b>${r.stars} ⭐</b>trust</div><div><b>${r.launched}/${len()}</b>launched</div></div>
      ${r.stars === most ? '<div class="award">🌱 Responsible Leader: you kept the most trust</div>' : ''}
      <div class="k">Your projects</div><div class="res">${r.proj.map(R => `<div class="mini"><span>${G.ALLP[R.projId].i} ${esc(G.ALLP[R.projId].n)}</span><b class="${R.net >= 0 ? 'pos' : 'neg'}">${sgn(R.net)}</b></div>`).join('')}</div>
      <div class="lesson">Controls are cheaper than incidents. Scale multiplies risk. Some systems should never be built.</div>`;
  }

  // ================= BOARD =================
  function bTop(right) { return `<div class="bbar"><span class="blogo"><b>Δ</b> DELTA</span>${right ? `<span class="bpl">${right}</span>` : ''}</div>`; }
  function timeline(on) { const it = [['① Fix and launch', 'Buy controls, choose size'], ['② The news', '4 headlines'], ['③ Month 3', 'Regulator and press'], ['④ Results', 'What really happened']];
    return `<div class="tl">${it.map((x, k) => `<div class="${k < on ? 'dn' : k === on ? 'on' : ''}">${x[0]}<small>${x[1]}</small></div>`).join('')}</div>`; }
  function board() {
    const p = ph(); let inner = '';
    if (p === 'lobby') inner = bWelcome();
    else if (p === 'deal') inner = bDeal();
    else if (p === 'w1' || p === 'w4') inner = bNews();
    else if (p === 'm3') inner = bM3();
    else if (p === 'end') inner = bEnd();
    return `<div class="bd"><div class="bin">${inner}</div></div>`;
  }
  function bWelcome() {
    const d = state.dom ? dom() : null, L = plist();
    return `${bTop(d ? `Today's sector: <b>${d.i} ${esc(d.n)}</b>` : 'Host is choosing a sector…')}
     <div class="wel"><div>
      <h1>You're the new <em>Head of AI</em>.<br>Ship AI that makes money, without making headlines.</h1>
      <div class="wobj"><div class="t">🎯 YOUR OBJECTIVE</div>Run <b>${len()} AI projects</b> for ${esc(d ? d.org : 'your company')}. Finish with the <b>biggest budget</b> while keeping customers' <b>trust ⭐</b>. Every project hides weaknesses, and the news will find them. Spend on the right controls, launch at the right size, and know when to pause.</div>
      <div class="bk">How each project works</div>
      <div class="steps">
       <div class="st"><div class="n">1</div><div class="h">📱 Get a project</div><div class="d">You see 2 hidden weaknesses that only you know about</div></div>
       <div class="st"><div class="n">2</div><div class="h">🛡️ Fix weak spots</div><div class="d">Buy controls. Each one fixes one weakness</div></div>
       <div class="st"><div class="n">3</div><div class="h">🚀 Launch or pause</div><div class="d">Pilot, Rollout or Go big. Bigger earns more and risks more</div></div>
       <div class="st"><div class="n">4</div><div class="h">📰 The news breaks</div><div class="d">Four real-world incidents break. Do they hit you?</div></div>
       <div class="st"><div class="n">5</div><div class="h">🏛️ Month 3</div><div class="d">The regulator and the press check in. Then results</div></div></div>
      <div class="two">
       <div class="bx"><div class="t">🏆 HOW TO WIN</div><ul><li><b>One €${G.START}k budget for all ${len()} projects</b>: about €${Math.round(G.START / len())}k each. Spend it all on project 1 and you can't launch the rest</li><li>Most <b>€ budget</b> after ${len()} projects wins</li><li>Your revenue is multiplied by your <b>⭐ trust</b>, so lost trust means lost sales</li><li>🌱 <b>Responsible Leader</b> award for the most ⭐ left</li></ul></div>
       <div class="bx"><div class="t">⚠️ GOOD TO KNOW</div><ul><li>Every headline is based on <b>a real AI incident</b></li><li>Some projects are <b>illegal under the EU AI Act</b>. Spot them and pause</li><li>Hit by an incident? <b>Disclose</b> it or <b>stay quiet</b>, but whistleblowers exist</li></ul></div></div>
     </div><div class="side">
      <div class="qr"><div class="u">Scan to join</div>${qrSVG(joinURL())}<div class="u">${esc(joinURL().replace(/^https?:\/\//, ''))}</div><div class="s">Room: ${esc(ROOM)}</div></div>
      <div class="bfacts">💰 <b>€${G.START}k</b> for all ${len()} projects · <b>⭐⭐⭐⭐⭐</b><br>⏱️ About <b>${len() * 5} minutes</b> · ${len()} projects<br>👤 Play solo on your phone<br>🎓 No AI or poker knowledge needed</div>
      <div class="joined"><div class="t">${L.length} PLAYER${L.length === 1 ? '' : 'S'} JOINED</div><div class="chips">${L.map(x => `<span>${esc(x.name)}</span>`).join('')}</div></div>
     </div></div>`;
  }
  function bDeal() {
    const p = proj(), i = idx(), L = plist();
    const status = x => { const pr = (x.pr || {})[i] || {}; return pr.s0 === 'pause' ? ['z', '⏸ paused'] : pr.s0 ? ['r', '✓ ' + G.SIZE[pr.s0].n] : ['', 'deciding…']; };
    return `${bTop(`PROJECT ${i + 1} OF ${len()} · ${dom().i} ${esc(dom().n.toUpperCase())}`)}
     <div class="split"><div class="pc"><div class="i">${p.i}</div><h2>${esc(p.n)}</h2><p>${esc(p.d)} The board wants it live this quarter.</p>
       <div class="tags"><span class="tg">💰 Up to €${G.SIZE.big.earn}k revenue</span><span class="tg q">🏛️ EU AI Act tier: shown only to players with a governance framework</span></div></div>
      <div><div class="bk" style="margin-top:0">📱 Check your phone: your hidden weaknesses are there</div>
       <div class="ps">${L.slice(0, 24).map(x => { const s = status(x); return `<div class="pp ${s[0]}">${esc(x.name)} <span>${s[1]}</span></div>`; }).join('')}</div>
       <div class="btmr"><span data-tmr>${fmtT(left())}</span><small>to fix your weak spots and choose your launch</small></div></div></div>
     ${timeline(0)}`;
  }
  function paper(nid, k, opt) { const n = G.N[nid];
    return `<div class="np ${opt.cls || ''} r${(k % 3) + 1} ${opt.still ? 'still' : ''}" style="animation-delay:${opt.delay || 0}s">${opt.brk ? '<span class="brk">BREAKING</span>' : ''}<div class="mh">${esc(n.src)} <span>${opt.week}</span></div><div class="h">${esc(n.h)}</div>${opt.small ? '' : `<div class="ar">${esc(n.s)}</div>`}<span class="cat">${esc(G.AREAS[n.a])}</span></div>`; }
  function bNews() {
    const i = idx(), nw = (state.news || {})[i] || {}, p = proj(), w4 = ph() === 'w4';
    const key = 'n' + i + ph(), anim = !ui.seen[key]; ui.seen[key] = 1;
    const all = (nw.w1 || []).concat(nw.w4 || []);
    if (anim) setTimeout(() => all.forEach((x, k) => setTimeout(() => window.SFX && SFX.news && SFX.news(), (0.3 + k * 1.1) * 1000)), 10);
    const body = `<div class="nw nw4">${all.map((id, k) => paper(id, k, { brk: 1, week: k === all.length - 1 ? 'Top story' : 'This month', delay: anim ? 0.3 + k * 1.1 : 0, still: !anim })).join('')}</div>`;
    return `${bTop(`📰 THE NEWS · ${esc(p.n.toUpperCase())}`)}${body}
      <div class="ask">Does this affect <span>your</span> ${esc(p.n.toLowerCase())}?<small>Check your phone: stay, expand or pause.</small></div>${timeline(1)}`;
  }
  function lbTable(rk, title) { return `<div class="bk" style="margin-top:0">${title}</div><table class="lb"><tr><th></th><th>PLAYER</th><th>TRUST</th><th style="text-align:right">BUDGET</th></tr>
    ${rk.slice(0, 10).map((x, k) => `<tr class="${k === 0 ? 'lead' : ''}"><td class="n">${k + 1}</td><td>${esc(x.p.name)}</td><td class="s">${starsB(x.r.stars)}</td><td class="b">${eur(x.r.budget)}</td></tr>`).join('')}</table>`; }
  function bM3() {
    const i = idx(), id = ((state.news || {})[i] || {}).m3 || 'QUIET', M = G.M3[id], rk = ranking();
    const key = 'm3' + i, anim = !ui.seen[key]; ui.seen[key] = 1; if (anim) setTimeout(() => window.SFX && SFX.stamp && SFX.stamp(), 300);
    const leaked = rk.filter(x => x.r.proj[i] && x.r.proj[i].leaked).map(x => x.p.name);
    const m3hit = rk.filter(x => x.r.proj[i] && x.r.proj[i].m3 && x.r.proj[i].m3.hit).map(x => x.p.name);
    const paused = rk.filter(x => x.r.proj[i] && x.r.proj[i].paused).length;
    const most = rk.slice().sort((a, b) => b.r.stars - a.r.stars || b.r.budget - a.r.budget)[0];
    return `${bTop(`🏛️ MONTH 3 · PROJECT ${i + 1} OF ${len()}`)}
     <div class="split" style="grid-template-columns:.9fr 1.1fr"><div>
      <div class="m3b"><div class="t">MONTH 3 CARD</div><h2>${M.i} ${esc(M.n)}</h2><p>${esc(M.d)}</p></div>
      ${leaked.length ? `<div class="wbn"><div class="t">EXPOSED · HID AN INCIDENT</div><div class="h">${leaked.map(esc).join(', ')}</div></div>` : ''}
      ${m3hit.length ? `<div class="wbn"><div class="t">CAUGHT BY ${esc(M.n.toUpperCase())}</div><div class="h">${m3hit.slice(0, 8).map(esc).join(', ')}${m3hit.length > 8 ? ' +' + (m3hit.length - 8) : ''}</div></div>` : ''}
      ${proj().trap ? `<div class="okb">🚫 This was a <b>prohibited</b> system under the EU AI Act. ${paused} of ${rk.length} players paused it.</div>` : ''}
      ${most ? `<div class="okb">🌱 Most trusted so far: <b>${esc(most.p.name)}</b> (${most.r.stars} ⭐)</div>` : ''}
     </div><div>${lbTable(rk, `LEADERBOARD · AFTER ${i + 1} OF ${len()} PROJECTS`)}</div></div>${timeline(2)}`;
  }
  function bEnd() {
    const rk = ranking(), top = rk.slice(0, 3), most = rk.slice().sort((a, b) => b.r.stars - a.r.stars || b.r.budget - a.r.budget)[0];
    const order = [top[1], top[0], top[2]].filter(Boolean), h = { 0: 26, 1: 34, 2: 20 };
    return `${bTop('FINAL RESULTS')}
     <div class="split" style="grid-template-columns:1.1fr .9fr"><div><div class="pod">${order.map(x => { const k = top.indexOf(x);
        return `<div><div class="nm">${esc(x.p.name)}</div><div class="sc">${eur(x.r.budget)} · ${x.r.stars} ⭐</div><div class="bar" style="height:${h[k === 0 ? 1 : k === 1 ? 0 : 2]}vh">${k + 1}</div></div>`; }).join('')}</div>
       ${most ? `<div class="okb" style="font-size:2.4vh;margin-top:3vh">🌱 Responsible Leader: <b>${esc(most.p.name)}</b> kept ${most.r.stars} ⭐</div>` : ''}
       <div class="m3b" style="margin-top:2vh"><div class="t">WHAT TO TAKE AWAY</div><p>Controls are cheaper than incidents. Scale multiplies risk as well as revenue. Some systems should never be built. Hiding problems costs more than disclosing them.</p></div></div>
      <div>${lbTable(rk, 'FINAL LEADERBOARD')}</div></div>`;
  }

  // ================= HOST =================
  function host() {
    const p = ph(), L = plist(), i = idx();
    const next = { lobby: ['▶ Start the game', 'start'], deal: ['📰 Reveal the news', 'w4'], w1: ['📰 Reveal the news', 'w4'], w4: ['🏛️ Month 3 + results', 'm3'],
      m3: i + 1 < len() ? ['➡️ Next project (' + (i + 2) + ' of ' + len() + ')', 'next'] : ['🏆 Final results', 'end'], end: ['Game over', ''] }[p];
    const setup = p === 'lobby' ? `<div class="hcard"><h3>1 · CHOOSE THE SECTOR</h3><div class="doms">${G.DKEYS.map(k => { const d = G.DOMAINS[k];
        return `<button class="dm ${state.dom === k ? 'on' : ''}" data-dom="${k}"><div class="i">${d.i}</div><div class="n">${esc(d.n)}</div><div class="d">${esc(d.blurb)}</div></button>`; }).join('')}</div></div>
      <div class="hcard"><h3>2 · GAME LENGTH</h3><div class="seg">${[3, 4, 6].map(n => `<button data-len="${n}" class="${len() === n ? 'on' : ''}">${n} projects · ~${n * 5} min</button>`).join('')}</div>
       <h3 style="margin-top:14px">TIME TO FIX AND LAUNCH, PER PROJECT</h3><div class="seg">${[1.5, 2, 3, 4].map(n => `<button data-min="${n}" class="${(state.shopMin || CFG.shopMinutes || 2) === n ? 'on' : ''}">${n} min</button>`).join('')}</div></div>` : '';
    const counts = p === 'deal' ? `${L.filter(x => ((x.pr || {})[i] || {}).s0).length} of ${L.length} decided` : '';
    return `<div class="host"><div class="logo" style="font-size:20px"><b>Δ</b> DELTA · host</div>
      <h1>${p === 'lobby' ? 'Set up the game' : p === 'end' ? 'Game over' : `Project ${i + 1} of ${len()}: ${esc(proj().n)}`}</h1>
      <div class="sub">Room <b class="gd">${esc(ROOM)}</b> · ${L.length} players · phase: <b class="gd">${p}</b> ${counts ? '· ' + counts : ''} ${p === 'deal' ? '· <span data-tmr class="tmr">' + fmtT(left()) + '</span> left' : ''}</div>
      ${setup}
      <div class="hcard"><button class="hbig" id="next" ${next[1] && !(p === 'lobby' && !state.dom) ? '' : 'disabled'}>${next[0]}</button>
       ${p === 'lobby' && !state.dom ? '<div class="hint">Choose a sector first.</div>' : ''}
       ${p === 'deal' ? '<div class="hrow"><button id="plus">+1 minute</button></div>' : ''}</div>
      ${p !== 'lobby' && p !== 'end' ? `<div class="hcard hst"><h3>THIS PROJECT</h3>${proj().i} <b>${esc(proj().n)}</b> · tier ${G.TIER[proj().tier]}${proj().trap ? ' · <b>TRAP</b>' : ''}<br>
        News: ${((state.news || {})[i] || {}).w1.concat(((state.news || {})[i] || {}).w4).map(id => esc(G.N[id].h)).join(' · ')}</div>` : ''}
      <div class="hcard"><h3>PLAYERS</h3><div class="hpl">${ranking().map(x => `<div>${esc(x.p.name)} <span>${eur(x.r.budget)} · ${x.r.stars}⭐</span></div>`).join('') || '<span class="hint">Nobody yet</span>'}</div></div>
      <div class="hcard"><h3>LINKS</h3><div class="hrow"><a href="${esc(location.pathname + '?board' + (ROOM !== (CFG.room || 'dnb') ? '&room=' + ROOM : ''))}" target="_blank">📽️ Open projector view</a><a href="${esc(joinURL())}" target="_blank">📱 Player link</a>
        <button class="warn" id="reset">${ui.hostConfirm ? '⚠️ Tap again to wipe this room' : '♻️ Reset game'}</button></div></div></div>`;
  }
  async function hostStep() {
    const p = ph(), now = DB.now(), pids = plist().map(x => x.id), min = state.shopMin || CFG.shopMinutes || 2;
    const usedNews = () => Object.values(state.news || {}).flatMap(n => (n.w1 || []).concat(n.w4 || []));
    if (p === 'lobby') {
      const seed = Math.random().toString(36).slice(2, 10), projects = G.pickProjects(state.dom, len(), seed);
      const n0 = G.drawNews(seed, 0, projects[0], pids, []);
      return DB.set(BASE + '/state', Object.assign({}, state, { len: len(), phase: 'deal', seed, projects, idx: 0, news: { 0: n0 }, deadline: now + min * 60000, t: now }));
    }
    if (p === 'deal') return upd('/state', { phase: 'w4', t: now });
    if (p === 'w1') return upd('/state', { phase: 'w4', t: now });
    if (p === 'w4') { const i = idx(), anyQuiet = plist().some(x => Object.values((((x.pr || {})[i] || {}).d) || {}).includes('quiet'));
      return upd('/state', { phase: 'm3', t: now, ['news/' + i + '/m3']: G.drawM3(state.seed, i, projId(), anyQuiet) }); }
    if (p === 'm3' && idx() + 1 < len()) { const i = idx() + 1, n = G.drawNews(state.seed, i, state.projects[i], pids, usedNews());
      return upd('/state', { phase: 'deal', idx: i, ['news/' + i]: n, deadline: now + min * 60000, t: now }); }
    if (p === 'm3') return upd('/state', { phase: 'end', t: now });
  }

  // ================= EVENTS =================
  function bind() {
    const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));
    // player
    const j = document.getElementById('join');
    if (j) j.onclick = () => { const n = (document.getElementById('nm').value || '').trim().slice(0, 14); if (!n) return toast('Type your name first');
      pid = 'p' + Math.random().toString(36).slice(2, 10); try { localStorage.setItem(PIDK, pid); sessionStorage.setItem(PIDK, pid); } catch (e) {}
      DB.set(BASE + '/players/' + pid, { name: n, t: DB.now() }); window.SFX && SFX.chip && SFX.chip(); };
    on('[data-tab]', 'click', e => { ui.tab = e.currentTarget.dataset.tab; render(true); });
    const i = idx(), m = me(), base = BASE + '/players/' + pid;
    on('[data-ctl]', 'click', e => { if (left() <= 0) return; const k = e.currentTarget.dataset.ctl, own = !!(myPr().c || {})[k];
      if (!own && sc(pid, m).budget < G.C[k].cost) return toast('Not enough budget');
      DB.update(base + '/pr/' + i + '/c', { [k]: own ? null : 1 }); window.SFX && SFX.chip && SFX.chip(); });
    on('[data-fnd]', 'click', e => { if (left() <= 0) return; const k = e.currentTarget.dataset.fnd, f = (m && m.f) || {}, x = G.F[k];
      if (f[k] != null && f[k] !== i) return toast('You already own this. It covers every project.');
      if (f[k] === i) { if (k === 'IRP' || k === 'INV') { if (f.INS === i) DB.update(base + '/f', { INS: null }); } return DB.update(base + '/f', { [k]: null }); }
      if (x.wild && (f.IRP == null || f.INV == null)) return toast('🔒 The insurer wants your Incident response plan and AI inventory first');
      if (sc(pid, m).budget < x.cost) return toast('Not enough budget');
      DB.update(base + '/f', { [k]: i }); window.SFX && SFX.chip && SFX.chip(); });
    on('[data-size]', 'click', e => { const v = e.currentTarget.dataset.size; ui.size = ui.size === v ? null : v; render(true); });
    const ac = document.getElementById('allc'); if (ac) ac.onclick = () => { ui.allC = !ui.allC; render(true); };
    const go = document.getElementById('go');
    if (go) go.onclick = () => { if (!ui.size || left() <= 0) return; DB.update(base + '/pr/' + i, { s0: ui.size }); window.SFX && SFX[ui.size === 'pause' ? 'whoosh' : 'fanfare'] && SFX[ui.size === 'pause' ? 'whoosh' : 'fanfare'](); ui.size = null; };
    const rl = document.getElementById('relaunch'); if (rl) rl.onclick = () => { ui.size = myPr().s0; DB.update(base + '/pr/' + i, { s0: null }); };
    on('[data-dec]', 'click', e => { const v = e.currentTarget.dataset.dec; if (!v) return; const key = ph() === 'w1' ? 's1' : 's2';
      const cur = myPr()[key] || null, nv = (v === 'stay' || v === cur) ? null : v;  // stay / tap-again = undo this week's change
      DB.update(base + '/pr/' + i, { [key]: nv }); window.SFX && SFX.chip && SFX.chip(); });
    on('[data-resp]', 'click', e => { const nid = e.currentTarget.dataset.nid, v = e.currentTarget.dataset.resp; ui.sheetSkip[nid] = 1;
      DB.update(base + '/pr/' + i + '/d', { [nid]: v }); window.SFX && SFX[v === 'disc' ? 'shield' : 'flip'] && SFX[v === 'disc' ? 'shield' : 'flip'](); });
    // host
    on('[data-dom]', 'click', e => upd('/state', { dom: e.currentTarget.dataset.dom, phase: 'lobby' }));
    on('[data-len]', 'click', e => upd('/state', { len: +e.currentTarget.dataset.len }));
    on('[data-min]', 'click', e => upd('/state', { shopMin: +e.currentTarget.dataset.min }));
    const nx = document.getElementById('next'); if (nx) nx.onclick = () => { nx.disabled = true; hostStep(); };
    const pl = document.getElementById('plus'); if (pl) pl.onclick = () => upd('/state', { deadline: Math.max(state.deadline || 0, DB.now()) + 60000 });
    const rs = document.getElementById('reset'); if (rs) rs.onclick = () => { if (!ui.hostConfirm) { ui.hostConfirm = 1; render(true); setTimeout(() => { ui.hostConfirm = 0; render(true); }, 4000); return; }
      ui.hostConfirm = 0; DB.set(BASE, { state: { phase: 'lobby', dom: state.dom || null, len: len(), shopMin: state.shopMin || null } }); };
  }
  render(true);
})();
