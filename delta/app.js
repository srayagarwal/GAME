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
  const qrSVG = text => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); };
  const joinURL = () => location.origin + location.pathname + (ROOM !== (CFG.room || 'dnb') ? '?room=' + ROOM : '');

  // ---------------- data ----------------
  DB.on(BASE + '/state', v => { state = v || {}; if (lastPhase !== null && lastPhase !== ph()) { ui.sheetSkip = {}; ui.size = null; } lastPhase = ph(); render(); });
  DB.on(BASE + '/players', v => { players = v || {}; render(); });
  setInterval(() => { if (state.deadline && ['deal'].includes(ph())) { document.querySelectorAll('[data-tmr]').forEach(el => el.textContent = fmtT(left())); if (left() <= 0 && !ui.expired) { ui.expired = 1; render(true); } } if (left() > 0) ui.expired = 0; }, 500);

  function render(force) {
    const sig = JSON.stringify([state, VIEW === 'board' ? plist().map(p => [p.id, p.name, p.pr]) : players, ui.tab, ui.expired, ui.hostConfirm]);
    if (!force && sig === lastSig) return; lastSig = sig;
    const y = window.scrollY;
    if (VIEW === 'board') $app.innerHTML = board();
    else if (VIEW === 'host') $app.innerHTML = host();
    else if (VIEW === 'nohost') $app.innerHTML = `<div class="ph"><div class="wait"><div class="big">🔒</div><h2>Wrong host key</h2></div></div>`;
    else $app.innerHTML = player();
    bind(); if (VIEW === 'player') window.scrollTo(0, y);
  }

  // ================= PLAYER =================
  const B0 = () => G.budgetFor(len());
  function topBar(r) { return `<div class="top"><span class="logo"><b>Δ</b> DELTA</span><span class="stat"><span class="pill g">${r ? eur(r.budget) : '€' + B0() + 'k'}</span><span class="pill">${stars(r ? r.stars : 5)}</span></span></div>`; }
  function player() {
    const m = me();
    if (!m) return joinScreen();
    const r = sc(pid, m), p = ph();
    let body = '';
    if (p === 'lobby') body = lobbyScreen(m);
    else if (p === 'deal') body = dealScreen(m, r);
    else if (p === 'news') body = newsScreen(m, r);
    else if (p === 'res') body = resultScreen(m, r);
    else if (p === 'end') body = endScreen(m, r);
    return `<div class="ph">${topBar(r)}${body}</div>`;
  }
  function rulesList() { return `<ul class="rules">
    <li><span>💰</span><div><b>€${B0()}k for the whole game.</b> It never refills. Spend it all on project 1 and you can't fix the rest.</div></li>
    <li><span>🔒</span><div>Each project has <b>2 hidden weaknesses</b>. Pay to fix them, or take the risk.</div></li>
    <li><span>🚀</span><div>Launch <b>Small</b> (safe, earns a little), <b>Big</b> (earns a lot, hits hurt ×3) or <b>Pause</b>.</div></li>
    <li><span>📰</span><div><b>Real AI incidents</b> hit the big screen. Unfixed weaknesses cost money and ⭐.</div></li>
    <li><span>⭐</span><div>Revenue is paid at year end, <b>× your trust</b>. Lose stars, lose sales.</div></li></ul>`; }
  function joinScreen() {
    return `<div class="ph"><div class="logo" style="font-size:18px"><b>Δ</b> DELTA</div>
      <h2 style="font-size:29px;margin-top:14px">You're the new <em>Head of AI</em> at ${esc(dom().org)}.</h2>
      <div class="obj"><div class="t">🎯 YOUR OBJECTIVE</div>Run ${len()} AI projects. Finish with the <b>most money</b>: budget left + revenue at year end.</div>
      <div class="k">How it works</div>${rulesList()}
      <div class="facts"><div><b>€${B0()}k</b>whole game</div><div><b>⭐×5</b>trust</div><div><b>~${len() * 4} min</b>${len()} projects</div></div>
      <input class="inp" id="nm" maxlength="14" placeholder="Your name…" autocomplete="off">
      <button class="btn" id="join">Join the game →</button></div>`;
  }
  function lobbyScreen(m) {
    return `<h2>You're in, <em>${esc(m.name)}</em>.</h2>
      <div class="obj"><div class="t">🎯 YOUR OBJECTIVE</div>Run ${len()} AI projects for ${esc(dom().org)}. Finish with the <b>most money</b>: budget left + revenue at year end.</div>
      <div class="k">How it works</div>${rulesList()}
      <div class="wait" style="padding:16px 0"><div class="hint">Waiting for the host to start the first project…</div></div>`;
  }
  function budBox(r, i) { const n = len() - i;
    return `<div class="bud"><div class="l">💰 BUDGET FOR THE WHOLE GAME · NEVER REFILLS</div><div class="v">${eur(r.budget)} <small>left · ${n === 1 ? 'last project' : n + ' projects to go'}</small></div><div class="bar"><i style="width:${Math.max(0, Math.min(100, r.budget / r.start * 100))}%"></i></div></div>`; }
  // ---- decide: fix + launch ----
  function dealScreen(m, r) {
    const p = proj(), i = idx(), pr = myPr(), fx = pr.f || {}, my = G.dealt(state.seed, pid, i, projId()), expired = left() <= 0;
    const fixedCtl = [...new Set(my.filter(w => fx[w]).map(w => G.FIX[w]))];
    const head = budBox(r, i) + `<div class="k">Project ${i + 1} of ${len()} · ${dom().i} ${esc(dom().n)}</div>
      <div class="proj"><div class="ic">${p.i}</div><h3>${esc(p.n)}</h3><p>${esc(p.d)}</p></div>
      <div class="k">🔒 Your 2 hidden weaknesses</div>`;
    const locked = pr.s || expired;
    const wk = my.map(w => { const k = G.FIX[w], c = G.C[k], on = fixedCtl.includes(k), viaOther = on && !fx[w];
      return `<div class="wf ${on ? 'fx' : ''}"><div class="t">${esc(G.W[w])}<small>Fix: ${c.i} ${esc(c.n)}${viaOther ? ' · already fixed' : ''}</small></div>
        ${viaOther ? '<span class="b">✓ Fixed</span>' : `<button class="b" data-fix="${w}" ${locked ? 'disabled' : ''}>${on ? '✓ Fixed' : 'Fix it'}<br>€${c.cost}k</button>`}</div>`; }).join('');
    if (pr.s) { const s = pr.s === 'pause' ? null : G.SIZE[pr.s];
      return head + `<div class="wk2">${wk}</div><div class="lockd"><div class="e">${s ? s.e : '⏸️'}</div><b>${s ? s.n + ' launch locked in' : 'Project paused'}</b>
        <div class="hint">${s ? 'Watch the big screen for the news.' : 'Nothing can hit you, but you earn nothing.'}</div>
        ${expired ? '' : '<button class="btn gh" id="relaunch">↩︎ Change my decision</button>'}</div>`; }
    if (expired) return head + `<div class="wk2">${wk}</div><div class="lockd"><div class="e">⏰</div><b>Time’s up</b><div class="hint">You didn’t launch, so this project is paused.</div></div>`;
    if (ui.size && ui.size !== 'pause' && r.budget < G.SIZE[ui.size].cost) ui.size = null;
    const sel = ui.size;
    const opt = k => { const s = G.SIZE[k]; return `<button class="${sel === k ? 'on' : ''}" data-size="${k}" ${r.budget < s.cost && sel !== k ? 'disabled' : ''}><span class="e">${s.e}</span><b>${s.n}</b><small>Costs €${s.cost}k<br>Earns up to €${s.earn}k${s.mult > 1 ? '<br>Hits hurt ×' + s.mult : ''}</small></button>`; };
    return head + `<div class="wk2">${wk}</div>
      <div class="k" style="display:flex;justify-content:space-between"><span>🚀 Launch · tap again to unselect</span><span class="tmr" data-tmr>${fmtT(left())}</span></div>
      <div class="l3">${G.ORDER.map(opt).join('')}<button class="${sel === 'pause' ? 'on' : ''}" data-size="pause"><span class="e">⏸️</span><b>Pause</b><small>Costs nothing<br>Earns nothing</small></button></div>
      <button class="btn" id="go" ${sel ? '' : 'disabled'}>${sel ? (sel === 'pause' ? 'Pause this project ⏸️' : 'Launch ' + G.SIZE[sel].n + ' ' + G.SIZE[sel].e) : 'Choose Small, Big or Pause'}</button>
      <div class="hint">Revenue is paid at year end. What you spend now is gone.</div>`;
  }
  // ---- news ----
  function verdict(v) { const n = G.N[v.nid];
    if (v.kind === 'hit') return `⚠️ Hits you: ${esc(G.W[n.w].toLowerCase())} · ${sgn(-v.dmg)} · −1 ⭐`;
    if (v.kind === 'blocked') return `✅ Blocked by your fix: ${esc(v.by.i + ' ' + v.by.n)}`;
    if (v.kind === 'wouldHit') return `⏸️ Would have hit you, but you paused`;
    return '✓ Not your risk'; }
  function newsCard(v) { const n = G.N[v.nid];
    return `<div class="news ${v.kind} new"><div class="src"><span>${esc(n.src)}</span><span>${esc(G.AREAS[n.a])}</span></div><div class="h">${esc(n.h)}</div><span class="v">${verdict(v)}</span></div>`; }
  function newsScreen(m, r) {
    const R = r.proj[idx()], i = idx();
    const pending = R.hits.find(v => v.kind === 'hit' && !v.resp && !ui.sheetSkip[v.nid]);
    let sheet = '';
    if (pending) { const n = G.N[pending.nid];
      sheet = `<div class="dim"><div class="sheet"><div class="tt">🚨 INCIDENT · YOUR ${esc(proj().n.toUpperCase())}</div><h3>${esc(n.h)}</h3>
        <p>You launched ${esc(G.SIZE[R.size].n)}, so this costs you <b>€${pending.dmg}k</b> and <b>1 ⭐</b>. What do you tell people?</p>
        <div class="ch2"><button class="d" data-resp="disc" data-nid="${pending.nid}"><b>📢 Disclose</b>Costs €${G.DISCLOSE}k now.<br>No further risk.</button>
        <button class="q" data-resp="quiet" data-nid="${pending.nid}"><b>🤐 Stay quiet</b>Free now.<br>50% chance it leaks: <b>−2 ⭐</b></button></div>
        <div class="hint" style="color:#8a8170">Choose nothing and it counts as staying quiet.</div></div></div>`; }
    const status = R.size ? `${G.SIZE[R.size].e} You launched ${G.SIZE[R.size].n}` : '⏸️ You paused this project';
    return `<div class="k">📰 The news · does it hit your project?</div>
      ${R.hits.map(newsCard).join('')}
      <div class="lockd"><b style="font-size:16px">${status}</b><div class="hint">${R.hits.some(v => v.kind === 'hit') ? 'Results come next.' : 'Nothing hit you. Results come next.'}</div></div>${sheet}`;
  }
  // ---- results ----
  function lines(L) { return L.map(l => `<div class="rl"><span>${esc(l.txt)}</span><b class="${l.v > 0 ? 'pos' : l.v < 0 ? 'neg' : ''}">${sgn(l.v)}</b></div>`).join(''); }
  function resultScreen(m, r) {
    const R = r.proj[idx()];
    const title = R.trap ? (R.size ? 'You launched a banned system.' : 'You spotted the banned system.') : !R.size ? 'You paused this one.' : R.yearNet - R.spent >= 0 ? 'Launched and it paid off.' : 'Launched, but it cost you.';
    const real = R.hits.filter(v => ['hit', 'blocked', 'wouldHit'].includes(v.kind));
    return `<div class="k">Result · project ${idx() + 1} of ${len()}</div><h2>${esc(title)}</h2>
      <div class="k">Spent now · from your budget</div>
      <div class="res">${R.now.length ? lines(R.now) : '<div class="rl"><span>Nothing spent</span><b>€0k</b></div>'}<div class="rl tot"><span>Budget left</span><b class="gd">${eur(r.budget)}</b></div></div>
      <div class="k">At year end</div>
      <div class="res">${R.year.length ? lines(R.year) : '<div class="rl"><span>No revenue, no damage</span><b>€0k</b></div>'}<div class="rl tot"><span>This project adds</span><b class="${R.yearNet >= 0 ? 'pos' : 'neg'}">${sgn(R.yearNet)}</b></div>
       <div class="rl"><span>Trust</span><b>${R.starsBefore} → ${R.starsAfter} ⭐${R.leaked ? ' (your hidden incident leaked)' : ''}</b></div></div>
      <div class="les">🎯 ${esc(R.lesson || '')}</div>
      ${real.map(v => { const n = G.N[v.nid]; return `<div class="wr"><div class="t">📰 WHAT REALLY HAPPENED</div><div class="h">${esc(n.h)}</div>${esc(n.r)}</div>`; }).join('')}
      <div class="hint" style="margin-top:14px">${idx() + 1 < len() ? 'Next project coming up…' : 'Final results coming up…'}</div>`;
  }
  function ranking() { return plist().map(p => ({ p, r: sc(p.id, p) })).sort((a, b) => b.r.total - a.r.total || b.r.stars - a.r.stars); }
  function endScreen(m, r) {
    const rk = ranking(), pos = rk.findIndex(x => x.p.id === pid) + 1, most = Math.max(...rk.map(x => x.r.stars));
    return `<div class="k">Final results</div><div class="rank">#${pos}</div><div class="hint">of ${rk.length} players</div>
      <div class="facts"><div><b>${eur(r.total)}</b>final score</div><div><b>${r.stars} ⭐</b>trust</div><div><b>${r.launched}/${len()}</b>launched</div></div>
      <div class="res"><div class="rl"><span>💰 Budget left</span><b>${eur(r.budget)}</b></div><div class="rl"><span>📈 Year end: revenue − damage</span><b class="${r.year >= 0 ? 'pos' : 'neg'}">${sgn(r.year)}</b></div></div>
      ${r.stars === most ? '<div class="award">🌱 Responsible Leader: you kept the most trust</div>' : ''}
      <div class="k">Your projects</div><div class="res">${r.proj.map(R => `<div class="mini"><span>${G.ALLP[R.projId].i} ${esc(G.ALLP[R.projId].n)}</span><b class="${R.yearNet - R.spent >= 0 ? 'pos' : 'neg'}">${sgn(R.yearNet - R.spent)}</b></div>`).join('')}</div>
      <div class="lesson">Fixes are cheaper than incidents. Scale multiplies risk. Some systems should never be built. Hiding problems costs more than owning them.</div>`;
  }

  // ================= BOARD =================
  function bTop(right) { return `<div class="bbar"><span class="blogo"><b>Δ</b> DELTA</span>${right ? `<span class="bpl">${right}</span>` : ''}</div>`; }
  function timeline(on) { const it = [['① Fix and launch', 'On your phone'], ['② The news', '3 headlines'], ['③ Results', 'What really happened']];
    return `<div class="tl">${it.map((x, k) => `<div class="${k < on ? 'dn' : k === on ? 'on' : ''}">${x[0]}<small>${x[1]}</small></div>`).join('')}</div>`; }
  function board() {
    const p = ph(); let inner = '';
    if (p === 'lobby') inner = bWelcome();
    else if (p === 'deal') inner = bDeal();
    else if (p === 'news') inner = bNews();
    else if (p === 'res') inner = bRes();
    else if (p === 'end') inner = bEnd();
    return `<div class="bd"><div class="bin">${inner}</div></div>`;
  }
  function bWelcome() {
    const d = state.dom ? dom() : null, L = plist();
    return `${bTop(d ? `Today's sector: <b>${d.i} ${esc(d.n)}</b>` : 'Host is choosing a sector…')}
     <div class="wel"><div>
      <h1>You're the new <em>Head of AI</em>.<br>Ship AI that makes money, without making headlines.</h1>
      <div class="wobj"><div class="t">🎯 YOUR OBJECTIVE</div>Run <b>${len()} AI projects</b> for ${esc(d ? d.org : 'your company')} with <b>one €${B0()}k budget that never refills</b>. Every project hides 2 weaknesses. Fix them, or take the risk. Finish with the <b>most money</b>: budget left + revenue at year end.</div>
      <div class="bk">How each project works</div>
      <div class="steps s3">
       <div class="st"><div class="n">1</div><div class="h">🛡️ Fix and launch</div><div class="d">See your 2 hidden weaknesses. Pay to fix them. Launch Small, Big, or Pause</div></div>
       <div class="st"><div class="n">2</div><div class="h">📰 The news breaks</div><div class="d">3 real AI incidents. Unfixed weaknesses cost money and ⭐. Disclose, or stay quiet?</div></div>
       <div class="st"><div class="n">3</div><div class="h">📊 Results</div><div class="d">What it cost you, one lesson, and what really happened</div></div></div>
      <div class="two">
       <div class="bx"><div class="t">🏆 HOW TO WIN</div><ul><li><b>€${B0()}k for all ${len()} projects</b>. You can’t afford to fix everything and launch everything big</li><li>Revenue is paid at year end, <b>× your ⭐ trust</b></li><li>Score = <b>budget left + revenue − damage</b></li><li>🌱 <b>Responsible Leader</b> award for the most ⭐</li></ul></div>
       <div class="bx"><div class="t">⚠️ GOOD TO KNOW</div><ul><li>Every headline is based on <b>a real AI incident</b></li><li>One project is <b>banned under the EU AI Act</b>. Spot it and pause</li><li>Big launches earn ×3, and hits hurt ×3</li></ul></div></div>
     </div><div class="side">
      <div class="qr"><div class="u">Scan to join</div>${qrSVG(joinURL())}<div class="u">${esc(joinURL().replace(/^https?:\/\//, ''))}</div><div class="s">Room: ${esc(ROOM)}</div></div>
      <div class="bfacts">💰 <b>€${B0()}k</b> for the whole game · <b>⭐⭐⭐⭐⭐</b><br>⏱️ About <b>${len() * 4} minutes</b> · ${len()} projects<br>👤 Play solo on your phone<br>🎓 No AI knowledge needed</div>
      <div class="joined"><div class="t">${L.length} PLAYER${L.length === 1 ? '' : 'S'} JOINED</div><div class="chips">${L.map(x => `<span>${esc(x.name)}</span>`).join('')}</div></div>
     </div></div>`;
  }
  function bDeal() {
    const p = proj(), i = idx(), L = plist();
    const status = x => { const pr = (x.pr || {})[i] || {}; return pr.s === 'pause' ? ['z', '⏸ paused'] : pr.s ? ['r', '✓ ' + G.SIZE[pr.s].n] : ['', 'deciding…']; };
    return `${bTop(`PROJECT ${i + 1} OF ${len()} · ${dom().i} ${esc(dom().n.toUpperCase())}`)}
     <div class="split"><div class="pc"><div class="i">${p.i}</div><h2>${esc(p.n)}</h2><p>${esc(p.d)} The board wants it live this quarter.</p>
       <div class="tags"><span class="tg">🧪 Small: earns up to €${G.SIZE.small.earn}k</span><span class="tg">🌍 Big: earns up to €${G.SIZE.big.earn}k, hits hurt ×${G.SIZE.big.mult}</span></div></div>
      <div><div class="bk" style="margin-top:0">📱 Check your phone: fix your weaknesses, then launch</div>
       <div class="ps">${L.slice(0, 24).map(x => { const s = status(x); return `<div class="pp ${s[0]}">${esc(x.name)} <span>${s[1]}</span></div>`; }).join('')}</div>
       <div class="btmr"><span data-tmr>${fmtT(left())}</span><small>to fix and launch</small></div></div></div>
     ${timeline(0)}`;
  }
  function paper(nid, k, opt) { const n = G.N[nid];
    return `<div class="np r${(k % 3) + 1} ${opt.still ? 'still' : ''}" style="animation-delay:${opt.delay || 0}s"><span class="brk">BREAKING</span><div class="mh">${esc(n.src)}</div><div class="h">${esc(n.h)}</div><div class="ar">${esc(n.s)}</div><span class="cat">${esc(G.AREAS[n.a])}</span></div>`; }
  function bNews() {
    const i = idx(), all = ((state.news || {})[i] || {}).h || [], p = proj();
    const key = 'n' + i, anim = !ui.seen[key]; ui.seen[key] = 1;
    if (anim) setTimeout(() => all.forEach((x, k) => setTimeout(() => window.SFX && SFX.news && SFX.news(), (0.3 + k * 1.2) * 1000)), 10);
    return `${bTop(`📰 THE NEWS · ${esc(p.n.toUpperCase())}`)}<div class="nw">${all.map((id, k) => paper(id, k, { delay: anim ? 0.3 + k * 1.2 : 0, still: !anim })).join('')}</div>
      <div class="ask">Does this hit <span>your</span> ${esc(p.n.toLowerCase())}?<small>Check your phone. If it hits you: disclose, or stay quiet?</small></div>${timeline(1)}`;
  }
  function lbTable(rk, title) { return `<div class="bk" style="margin-top:0">${title}</div><table class="lb"><tr><th></th><th>PLAYER</th><th>TRUST</th><th style="text-align:right">SCORE</th></tr>
    ${rk.slice(0, 10).map((x, k) => `<tr class="${k === 0 ? 'lead' : ''}"><td class="n">${k + 1}</td><td>${esc(x.p.name)}</td><td class="s">${starsB(x.r.stars)}</td><td class="b">${eur(x.r.total)}</td></tr>`).join('')}</table>
    <div class="bk" style="font-size:1.5vh;letter-spacing:.1vh">Score = budget left + revenue − damage</div>`; }
  function bRes() {
    const i = idx(), rk = ranking(), P = rk.map(x => x.r.proj[i]).filter(Boolean), p = proj();
    const cnt = f => P.filter(f).length, nw = ((state.news || {})[i] || {}).h || [];
    const hitN = nw.filter(id => P.some(R => R.hits.some(v => v.nid === id && v.kind === 'hit')));
    const leaked = rk.filter(x => x.r.proj[i] && x.r.proj[i].leaked).map(x => x.p.name);
    const realId = hitN[0] || nw.find(id => P.some(R => R.hits.some(v => v.nid === id && v.kind !== 'safe'))) || nw[0];
    return `${bTop(`📊 RESULTS · PROJECT ${i + 1} OF ${len()}`)}
     <h2 class="bh">${p.i} ${esc(p.n)}</h2>
     <div class="split" style="grid-template-columns:1fr 1fr"><div>
      <div class="bk" style="margin-top:0">WHAT THE ROOM DID</div>
      <div class="stats"><div><span>🌍 Launched big</span><b>${cnt(R => R.size === 'big')}</b></div><div><span>🧪 Launched small</span><b>${cnt(R => R.size === 'small')}</b></div>
       <div><span>⏸️ Paused</span><b>${cnt(R => !R.size)}</b></div><div><span>⚠️ Hit by the news</span><b>${cnt(R => R.hits.some(v => v.kind === 'hit'))}</b></div>
       <div><span>🛡️ Blocked by a fix</span><b>${cnt(R => R.hits.some(v => v.kind === 'blocked'))}</b></div><div><span>🤐 Stayed quiet</span><b>${cnt(R => R.hits.some(v => v.kind === 'hit' && v.resp !== 'disc'))}</b></div></div>
      ${p.trap ? `<div class="okb">🚫 This system is <b>banned under the EU AI Act</b>. ${cnt(R => !R.size)} of ${P.length} players paused it.</div>` : ''}
      ${leaked.length ? `<div class="wbn"><div class="t">EXPOSED · HID AN INCIDENT AND IT LEAKED</div><div class="h">${leaked.slice(0, 8).map(esc).join(', ')}</div></div>` : ''}
      ${realId ? `<div class="realb">📰 <b>What really happened:</b> ${esc(G.N[realId].r)}</div>` : ''}
     </div><div>${lbTable(rk, `LEADERBOARD · AFTER ${i + 1} OF ${len()}`)}</div></div>${timeline(2)}`;
  }
  function bEnd() {
    const rk = ranking(), top = rk.slice(0, 3), most = rk.slice().sort((a, b) => b.r.stars - a.r.stars || b.r.total - a.r.total)[0];
    const order = [top[1], top[0], top[2]].filter(Boolean), h = { 0: 26, 1: 34, 2: 20 };
    return `${bTop('FINAL RESULTS')}
     <div class="split" style="grid-template-columns:1.1fr .9fr"><div><div class="pod">${order.map(x => { const k = top.indexOf(x);
        return `<div><div class="nm">${esc(x.p.name)}</div><div class="sc">${eur(x.r.total)} · ${x.r.stars} ⭐</div><div class="bar" style="height:${h[k === 0 ? 1 : k === 1 ? 0 : 2]}vh">${k + 1}</div></div>`; }).join('')}</div>
       ${most ? `<div class="okb" style="font-size:2.4vh;margin-top:3vh">🌱 Responsible Leader: <b>${esc(most.p.name)}</b> kept ${most.r.stars} ⭐</div>` : ''}
       <div class="m3b" style="margin-top:2vh"><div class="t">WHAT TO TAKE AWAY</div><p>Fixes are cheaper than incidents. Scale multiplies risk as well as revenue. Some systems should never be built. Hiding problems costs more than owning them.</p></div></div>
      <div>${lbTable(rk, 'FINAL LEADERBOARD')}</div></div>`;
  }

  // ================= HOST =================
  function host() {
    const p = ph(), L = plist(), i = idx();
    const next = { lobby: ['▶ Start the game', 'start'], deal: ['📰 Reveal the news', 'news'], news: ['📊 Show results', 'res'],
      res: i + 1 < len() ? ['➡️ Next project (' + (i + 2) + ' of ' + len() + ')', 'next'] : ['🏆 Final results', 'end'], end: ['Game over', ''] }[p] || ['…', ''];
    const setup = p === 'lobby' ? `<div class="hcard"><h3>1 · CHOOSE THE SECTOR</h3><div class="doms">${G.DKEYS.map(k => { const d = G.DOMAINS[k];
        return `<button class="dm ${state.dom === k ? 'on' : ''}" data-dom="${k}"><div class="i">${d.i}</div><div class="n">${esc(d.n)}</div><div class="d">${esc(d.blurb)}</div></button>`; }).join('')}</div></div>
      <div class="hcard"><h3>2 · GAME LENGTH</h3><div class="seg">${[3, 4, 6].map(n => `<button data-len="${n}" class="${len() === n ? 'on' : ''}">${n} projects · €${G.budgetFor(n)}k · ~${n * 4} min</button>`).join('')}</div>
       <h3 style="margin-top:14px">TIME TO FIX AND LAUNCH, PER PROJECT</h3><div class="seg">${[1, 1.5, 2, 3].map(n => `<button data-min="${n}" class="${(state.shopMin || CFG.shopMinutes || 2) === n ? 'on' : ''}">${n} min</button>`).join('')}</div></div>` : '';
    const counts = p === 'deal' ? `${L.filter(x => ((x.pr || {})[i] || {}).s).length} of ${L.length} decided` : '';
    const nw = p !== 'lobby' && p !== 'end' ? (((state.news || {})[i] || {}).h || []) : [];
    return `<div class="host"><div class="logo" style="font-size:20px"><b>Δ</b> DELTA · host</div>
      <h1>${p === 'lobby' ? 'Set up the game' : p === 'end' ? 'Game over' : `Project ${i + 1} of ${len()}: ${esc(proj().n)}`}</h1>
      <div class="sub">Room <b class="gd">${esc(ROOM)}</b> · ${L.length} players · step: <b class="gd">${p}</b> ${counts ? '· ' + counts : ''} ${p === 'deal' ? '· <span data-tmr class="tmr">' + fmtT(left()) + '</span> left' : ''}</div>
      ${setup}
      <div class="hcard"><button class="hbig" id="next" ${next[1] && !(p === 'lobby' && !state.dom) ? '' : 'disabled'}>${next[0]}</button>
       ${p === 'lobby' && !state.dom ? '<div class="hint">Choose a sector first.</div>' : ''}
       ${p === 'deal' ? '<div class="hrow"><button id="plus">+1 minute</button></div>' : ''}</div>
      ${nw.length ? `<div class="hcard hst"><h3>THIS PROJECT</h3>${proj().i} <b>${esc(proj().n)}</b>${proj().trap ? ' · <b>BANNED (trap)</b>' : ''}<br>News: ${nw.map(id => esc(G.N[id].h)).join(' · ')}</div>` : ''}
      <div class="hcard"><h3>PLAYERS</h3><div class="hpl">${ranking().map(x => `<div>${esc(x.p.name)} <span>${eur(x.r.total)} · ${x.r.stars}⭐</span></div>`).join('') || '<span class="hint">Nobody yet</span>'}</div></div>
      <div class="hcard"><h3>LINKS</h3><div class="hrow"><a href="${esc(location.pathname + '?board' + (ROOM !== (CFG.room || 'dnb') ? '&room=' + ROOM : ''))}" target="_blank">📽️ Open projector view</a><a href="${esc(joinURL())}" target="_blank">📱 Player link</a>
        <button class="warn" id="reset">${ui.hostConfirm ? '⚠️ Tap again to wipe this room' : '♻️ Reset game'}</button></div></div></div>`;
  }
  async function hostStep() {
    const p = ph(), now = DB.now(), pids = plist().map(x => x.id), min = state.shopMin || CFG.shopMinutes || 2;
    const used = () => Object.values(state.news || {}).flatMap(n => n.h || []);
    if (p === 'lobby') {
      const seed = Math.random().toString(36).slice(2, 10), projects = G.pickProjects(state.dom, len(), seed);
      return DB.set(BASE + '/state', Object.assign({}, state, { len: len(), phase: 'deal', seed, projects, idx: 0, news: { 0: G.drawNews(seed, 0, projects[0], pids, []) }, deadline: now + min * 60000, t: now }));
    }
    if (p === 'deal') return upd('/state', { phase: 'news', t: now });
    if (p === 'news') return upd('/state', { phase: 'res', t: now });
    if (p === 'res' && idx() + 1 < len()) { const i = idx() + 1;
      return upd('/state', { phase: 'deal', idx: i, ['news/' + i]: G.drawNews(state.seed, i, state.projects[i], pids, used()), deadline: now + min * 60000, t: now }); }
    if (p === 'res') return upd('/state', { phase: 'end', t: now });
  }

  // ================= EVENTS =================
  function bind() {
    const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));
    // player
    const j = document.getElementById('join');
    if (j) j.onclick = () => { const n = (document.getElementById('nm').value || '').trim().slice(0, 14); if (!n) return toast('Type your name first');
      pid = 'p' + Math.random().toString(36).slice(2, 10); try { localStorage.setItem(PIDK, pid); sessionStorage.setItem(PIDK, pid); } catch (e) {}
      DB.set(BASE + '/players/' + pid, { name: n, t: DB.now() }); window.SFX && SFX.chip && SFX.chip(); };
    const i = idx(), m = me(), base = BASE + '/players/' + pid;
    on('[data-fix]', 'click', e => { if (left() <= 0 || myPr().s) return; const w = e.currentTarget.dataset.fix, fx = myPr().f || {}, my = G.dealt(state.seed, pid, i, projId());
      const k = G.FIX[w], on = my.some(x => fx[x] && G.FIX[x] === k);
      if (on) { const off = {}; my.forEach(x => { if (G.FIX[x] === k) off[x] = null; }); return DB.update(base + '/pr/' + i + '/f', off); }
      if (sc(pid, m).budget < G.C[k].cost) return toast('Not enough budget left for this fix');
      DB.update(base + '/pr/' + i + '/f', { [w]: 1 }); window.SFX && SFX.chip && SFX.chip(); });
    on('[data-size]', 'click', e => { const v = e.currentTarget.dataset.size; ui.size = ui.size === v ? null : v; render(true); });
    const go = document.getElementById('go');
    if (go) go.onclick = () => { if (!ui.size || left() <= 0) return; DB.update(base + '/pr/' + i, { s: ui.size }); window.SFX && SFX[ui.size === 'pause' ? 'whoosh' : 'fanfare'] && SFX[ui.size === 'pause' ? 'whoosh' : 'fanfare'](); ui.size = null; };
    const rl = document.getElementById('relaunch'); if (rl) rl.onclick = () => { ui.size = myPr().s; DB.update(base + '/pr/' + i, { s: null }); };
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
