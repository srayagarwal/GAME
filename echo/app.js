/* ECHO · cooperative team game. One page, three views: player (default), ?board (projector), ?host=KEY.
   Everything is public: proposals, votes, RAI ticks and crosses, money, time and threat intel are visible to the whole room. */
(function () {
  const E = window.ECHO, cfg = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || cfg.room || 'main').replace(/[^\w-]/g, ''), BASE = 'games/echo2-' + ROOM;
  const VIEW = Q.has('board') ? 'board' : (Q.get('host') && Q.get('host') === cfg.hostKey ? 'host' : 'player');
  const $app = document.getElementById('app');
  if (Q.get('host') && VIEW !== 'host') { $app.innerHTML = '<div class="boot">Wrong host key.</div>'; return; }
  if (VIEW === 'board') document.body.classList.add('board');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cleanName = s => String(s || '').replace(/[<>.#$\[\]\/\\"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  const keyOf = n => cleanName(n).toLowerCase().replace(/\s/g, '');
  const STO = () => DB.mode === 'demo' ? sessionStorage : localStorage;
  const store = { get(k) { try { return STO().getItem(k); } catch (e) { return null; } }, set(k, v) { try { STO().setItem(k, v); } catch (e) {} } };
  let D = {}, ui = { typed: '', tab: null, cross: null };
  const ST = () => D.state || { phase: 'lobby' }, PL = () => D.players || {};
  const rd = () => ST().round || 1, stp = () => ST().step || 'propose', UC = () => ST().uc || 0, K = () => ST().k || 2;
  const plist = () => Object.keys(PL()).map(id => Object.assign({ id }, PL()[id])).filter(p => p.name).sort((a, b) => (a.t || 0) - (b.t || 0));
  const nd = (n, r) => (D[n] || {})['r' + (r || rd())] || {};
  const apprAll = () => { const o = {}; for (let r = 1; r <= 4; r++) o[r] = (D.appr || {})['r' + r] || {}; return o; };
  const delays = () => { const o = {}; for (let r = 1; r <= 4; r++) o[r] = (D.delay || {})['r' + r] || 0; return o; };
  const tot = () => E.totals(apprAll(), delays()), built = () => E.builtSet(apprAll());
  const budget = () => ST().budget != null ? ST().budget : E.USE[UC()].b, deadline = () => ST().deadline != null ? ST().deadline : E.USE[UC()].t;
  const fm = x => (Math.round((x || 0) * 10) / 10).toString(), C = id => E.BYID[id];
  const dcol = d => E.DCOL[d] || '#fff';
  const tally = () => E.tally(nd('votes'), PL());
  const lead = d => E.rank(tally()[d], K());
  const propD = d => Object.keys(nd('prop')[d] || {});
  const shownIds = d => stp() === 'propose' ? lead(d) : propD(d);
  const veto = () => E.vetoes(rd(), nd('prop'), nd('flags'), nd('sflags'));
  const dropped = id => !!nd('drop')[id];
  const me = () => PL()[pid] && PL()[pid].name ? PL()[pid] : null;
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  /* ---------- shared pieces ---------- */
  const cost = c => `<span class="mo">${c.saveM ? 'saves €' + fm(c.saveM) + 'M' : '€' + fm(c.m) + 'M'}</span> <span class="ti">${c.saveT ? (c.t ? c.t + ' wk, ' : '') + 'saves ' + c.saveT + ' wk' : c.t + ' wk'}</span>`;
  function flagLine(id) { const f = E.cardFlags(nd('flags'), id); if (!f.ok && !f.x) return ''; const why = Object.keys(f.why).map(r => E.REASON[r] + (f.why[r] > 1 ? ' ×' + f.why[r] : '')).join(', ');
    return `<div class="fl">${f.ok ? `<b class="okc">✓ ${f.ok}</b>` : ''}${f.x ? `<b class="xc">✗ ${f.x}</b>` : ''}${why ? `<span class="why">${esc(why)}</span>` : ''}</div>`; }
  function setLine(d) { const f = E.setFlags(nd('sflags'), d); if (!f.ok && !f.x) return ''; const why = Object.keys(f.why).map(r => E.REASON[r]).join(', ');
    return `<div class="fl"><span class="why">Whole set:</span>${f.ok ? `<b class="okc">✓ ${f.ok}</b>` : ''}${f.x ? `<b class="xc">✗ ${f.x}</b>` : ''}${why ? `<span class="why">${esc(why)}</span>` : ''}</div>`; }
  function overlapTxt(id) { const d = C(id).d; const out = []; E.DORDER.forEach(o => { if (o === d) return; shownIds(o).forEach(x => { if (E.overlaps(UC(), id, x)) out.push(E.DEPTS[o] + ': ' + C(x).n); }); }); return out; }
  function status(id) { const v = veto(), s = rd() === 4 && (v.cards.indexOf(id) >= 0 || v.sets.indexOf(C(id).d) >= 0); return s ? 'veto' : dropped(id) ? 'drop' : ''; }
  function meter(l, v, max, unit, extra) { const over = v > max + 1e-9, pc = Math.max(0, Math.min(100, v / max * 100)); return `<div class="mt${over ? ' over' : ''}"><div class="ml"><span>${l}</span><b>${unit === 'M' ? '€' : ''}${fm(v)}${unit} of ${unit === 'M' ? '€' : ''}${fm(max)}${unit}</b></div><i><span style="width:${pc}%"></span></i>${extra || ''}</div>`; }
  const stepName = { propose: 'Propose', review: 'RAI review', ceo: 'CEO decides', built: 'Built' };
  const stepsBar = () => { const order = ['propose', 'review', 'ceo', 'built'], i = order.indexOf(stp()); return `<div class="steps">${order.map((s, j) => `<i class="${j < i ? 'done' : j === i ? 'on' : ''}"></i>`).join('')}</div>`; };
  const noteBox = () => { const n = ST().note; return n && n.txt ? `<div class="note">${esc(n.txt)}</div>` : ''; };

  /* ======================= PLAYER ======================= */
  const PIDK = 'echo2_pid_' + ROOM;
  let pid = store.get(PIDK); if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set(PIDK, pid); }
  const WR = o => DB.update(BASE, o);
  async function join(name) {
    name = cleanName(name); const k = keyOf(name); if (!k) return;
    await DB.tx(BASE + '/names/' + k, cur => cur ? undefined : pid);
    const now = await DB.get(BASE + '/names/' + k);
    if (now !== pid) { if (confirm('The name "' + name + '" is taken. Is that you? OK = rejoin as that player.')) { pid = now; store.set(PIDK, pid); render(true); } return; }
    const rec = { name, t: DB.now() }; if (ST().phase === 'play') rec.dept = E.pickDept(PL());
    await DB.set(BASE + '/players/' + pid, rec); ui.typed = ''; buzz(30); render(true); }
  const canVote = () => ST().phase === 'play' && stp() === 'propose';
  const dept = () => (me() || {}).dept;
  function vote(id) { if (!canVote() || !dept() || dept() === 'RAI') return; const on = !((nd('votes')[pid] || {})[id]); DB.set(`${BASE}/votes/r${rd()}/${pid}/${id}`, on ? true : null); SFX.deal && SFX.deal(); }
  function flag(id, v) { if (dept() !== 'RAI' || stp() !== 'review') return; DB.set(`${BASE}/flags/r${rd()}/${pid}/${id}`, v); SFX.chip && SFX.chip(); }
  function sflag(d, v) { if (dept() !== 'RAI' || stp() !== 'review') return; DB.set(`${BASE}/sflags/r${rd()}/${pid}/${d}`, v); SFX.chip && SFX.chip(); }

  function card(id, o) { o = o || {}; const c = C(id), s = status(id), ov = o.noOv ? [] : overlapTxt(id), vc = (tally()[c.d] || {})[id] || 0;
    return `<div class="cd ${s}" style="--dc:${dcol(c.d)}"><div class="top"><span class="nm">${esc(c.n)}</span><span class="cs">${cost(c)}</span></div><div class="wh">${esc(c.w)}</div>
      ${o.votes && (stp() === 'propose') ? `<div class="vt">${vc} vote${vc === 1 ? '' : 's'}</div>` : ''}${ov.length ? `<div class="ov">Overlaps with ${esc(ov.join(' · '))}</div>` : ''}${flagLine(id)}${s === 'veto' ? '<div class="vetoed">Vetoed by RAI</div>' : s === 'drop' ? '<div class="vetoed">Dropped by the CEO</div>' : ''}${o.extra || ''}</div>`; }

  function handTab() {
    const d = dept(), voted = (nd('votes')[pid] || {}), bt = built();
    if (stp() !== 'propose') return roomDept(d, true);
    const cards = E.hand(d, bt).sort((a, b) => a.m - b.m);
    return `<div class="card"><div class="kick">Round ${rd()} · propose</div><p>Vote for the cards your department should put forward. The top ${K()} go to RAI review. ${rd() > 1 ? 'Check what other departments are choosing, so you do not duplicate.' : 'Everyone can see the choices, so talk across the room.'}</p></div>` +
      cards.map(c => `<div class="vrow"><div class="grow">${card(c.id, { votes: true })}</div><button class="vb ${voted[c.id] ? 'on' : ''}" data-a="vote" data-id="${c.id}" aria-label="Vote for ${esc(c.n)}">${voted[c.id] ? '✓' : '+'}</button></div>`).join('');
  }
  function roomDept(d, mine) { const ids = shownIds(d), b = Object.keys(apprAll()[rd()] || {}).filter(id => C(id).d === d);
    return `<div class="dpt" style="--dc:${dcol(d)}"><h3>${E.DEPTS[d]}${mine ? ' · your team' : ''}</h3>${d === 'RAI' ? raiSummary() : ids.length ? ids.map(id => card(id, { votes: true })).join('') + setLine(d) : `<div class="mut">${stp() === 'propose' ? 'No votes yet.' : 'Nothing proposed.'}</div>`}${stp() === 'built' && b.length ? `<div class="mut">Built: ${b.map(id => esc(C(id).n)).join(', ')}</div>` : ''}</div>`; }
  function raiSummary() { const rs = plist().filter(p => p.dept === 'RAI'); return `<div class="mut">${rs.length} member${rs.length === 1 ? '' : 's'}: ${rs.map(p => esc(p.name)).join(', ') || 'none'}. Ticks and crosses show on every card. ${rd() < 4 ? 'Advice only this round.' : 'Final round: a cross can remove a card or a whole set.'}</div>`; }
  function roomTab() { return `<div class="card"><div class="kick">The whole room</div><p>Everything is public. Win or lose together.</p></div>` + E.DORDER.map(d => roomDept(d, d === dept())).join('') + roomDept('RAI', false); }
  function threatTab() { const a = E.intelAt(UC(), rd()), n = E.USE[UC()].a.length; return `<div class="card"><div class="kick">Threat briefing</div><p>${a.length} of ${n} hidden attacks are named so far. More are named each round. The room only wins if every critical one is stopped.</p></div>` +
    a.map(x => `<div class="cd" style="--dc:${x.v === 'Critical' ? '#ff5d73' : x.v === 'Major' ? '#f2c14e' : '#9fb0d9'}"><div class="top"><span class="nm">${esc(x.n)}</span><span class="sev ${x.v}">${x.v}</span></div></div>`).join(''); }
  function raiTab() {
    const d = 'RAI', ds = E.DORDER.filter(x => propD(x).length), my = (nd('flags')[pid] || {}), mys = (nd('sflags')[pid] || {});
    if (stp() !== 'review') return `<div class="card"><div class="kick">${rd() < 4 ? 'Advice only' : 'Binding in this round'}</div><p>${stp() === 'propose' ? 'Departments are choosing cards. Watch the Room tab. Review opens when the host sends the proposals to you.' : stp() === 'ceo' ? 'Your ticks and crosses are with the CEO.' : 'Round done.'}</p></div>` + ds.map(x => roomDept(x, false)).join('');
    const chips = (kind, k) => ui.cross && ui.cross.k === kind + k ? `<div class="chips">${E.REASONS.map(r => `<button data-a="${kind === 'c' ? 'cr' : 'sr'}" data-id="${k}" data-r="${r[0]}">${r[1]}</button>`).join('')}</div>` : '';
    return `<div class="card"><div class="kick">${rd() < 4 ? 'Tick or cross · advice only' : 'Final round · crosses are binding'}</div><p>${rd() < 4 ? 'Everyone sees your tick or cross and the reason. The CEO decides.' : 'A cross can remove a card, or a whole department set. You cannot add cards.'}</p></div>` +
      ds.map(x => `<div class="dpt" style="--dc:${dcol(x)}"><h3>${E.DEPTS[x]}</h3>${propD(x).map(id => `<div>${card(id, { noOv: true })}<div class="tc"><button class="tk ${my[id] === 'ok' ? 'on' : ''}" data-a="ok" data-id="${id}">✓ Tick</button><button class="xk ${(my[id] || '')[0] === 'x' ? 'on' : ''}" data-a="x" data-id="${id}">✗ Cross${(my[id] || '')[0] === 'x' ? ': ' + esc(E.REASON[my[id].slice(2)]) : ''}</button></div>${chips('c', id)}</div>`).join('')}
        ${rd() === 4 ? `<div class="tc set"><button class="tk ${mys[x] === 'ok' ? 'on' : ''}" data-a="sok" data-id="${x}">✓ Whole set</button><button class="xk ${(mys[x] || '')[0] === 'x' ? 'on' : ''}" data-a="sx" data-id="${x}">✗ Remove whole set${(mys[x] || '')[0] === 'x' ? ': ' + esc(E.REASON[mys[x].slice(2)]) : ''}</button></div>${chips('s', x)}${setLine(x)}` : ''}</div>`).join('');
  }
  function builtTab() { const ids = Object.keys(apprAll()[rd()] || {}), v = veto(), dl = (D.delay || {})['r' + rd()] || 0;
    return `<div class="card"><div class="kick">Round ${rd()} built</div><p>${ids.length} card${ids.length === 1 ? '' : 's'} approved. ${dl ? `RAI vetoes cost ${dl} week${dl === 1 ? '' : 's'}.` : ''}</p></div>` + ids.map(id => card(id, { noOv: true })).join('') + (rd() === 4 && (v.cards.length || v.sets.length) ? `<div class="card"><div class="kick">Vetoed</div><p>${v.sets.map(s => 'Whole set: ' + E.DEPTS[s]).concat(v.cards.map(id => C(id).n)).map(esc).join(' · ')}</p></div>` : ''); }

  function doneView() { const r = E.finish(UC(), built(), tot().spent, tot().time, budget(), deadline()), rs = E.raiScore(Object.values(D.flags || {}).reduce((m, o) => { Object.keys(o).forEach(p => m[p] = Object.assign(m[p] || {}, o[p])); return m; }, {}));
    return `<div class="ph">${hdr()}<div class="grade g-${r.grade}"><small>The room's result</small><h1>${E.GR[r.grade]}</h1></div>
      <div class="card"><div class="meas"><span class="${r.safe ? 'okc' : 'xc'}">${r.safe ? '✓' : '✗'} Safe</span><span class="${r.bOk ? 'okc' : 'xc'}">${r.bOk ? '✓' : '✗'} On budget (€${fm(r.spent)}M of €${fm(r.budget)}M)</span><span class="${r.tOk ? 'okc' : 'xc'}">${r.tOk ? '✓' : '✗'} On time (${r.time} of ${r.deadline} wks)</span></div></div>
      <div class="kick" style="margin:10px 2px 6px">What the attacks found</div>${r.items.map(i => `<div class="cd ${i.st === 'stopped' ? '' : 'veto'}"><div class="top"><span class="nm">${i.st === 'stopped' ? '🛡️' : '💥'} ${esc(i.n)}</span><span class="sev ${i.v}">${i.v}</span></div><div class="wh">${i.st === 'stopped' ? 'Stopped by ' + esc(C(i.by).n) : i.st === 'shortcut' ? 'Opened by the shortcut: ' + esc(C(i.sc).n) : 'No control was built'}</div></div>`).join('')}
      <div class="card"><div class="kick">RAI team judgment</div><p>${rs.n ? rs.good + ' of ' + rs.n + ' ticks and crosses were right (a cross on a shortcut, a tick on a real control).' : 'No ticks or crosses were recorded.'}</p></div></div>`; }
  function hdr() { const m = me(), d = dept(), t = tot(), left = budget() - t.spent;
    return `<div class="hd"><div class="r1"><span class="dtag" style="background:${dcol(d)}">${d ? E.DEPTS[d] : 'ECHO'}</span><span class="nm">${esc(m ? m.name : '')}</span><span class="pill ${left < 0 ? 'bad' : 'g'}">${left < 0 ? '−' : ''}€${fm(Math.abs(left))}M</span><span class="pill ${t.time > deadline() ? 'bad' : ''}">${t.time}/${deadline()} wk</span></div>${ST().phase === 'play' ? `<div class="tm"><span>Round ${rd()} of 4 · ${E.RN[rd() - 1]}</span><span>${stepName[stp()]}</span></div>${stepsBar()}` : ''}${noteBox()}</div>`; }
  function playerView() {
    const st = ST(), m = me();
    if (!m) return `<div class="ph"><div class="logo">ECHO</div><div class="tag">One project. One room.<br>Win or lose together.</div><input class="txt" id="nm" placeholder="Your name" maxlength="16" autocomplete="off" value="${esc(ui.typed)}"><button class="btn" data-a="join">Join the room</button></div>`;
    if (st.phase === 'done') return doneView();
    if (st.phase !== 'play' || !m.dept) return `<div class="ph">${hdr()}<div class="card"><div class="kick">You are in</div><h3>Waiting for the host</h3><p>${plist().length} player${plist().length === 1 ? '' : 's'} so far. Your department appears here as soon as the game starts.</p></div></div>`;
    const raiP = dept() === 'RAI', tab = ui.tab || (raiP ? 'rai' : 'hand'), tabs = [[raiP ? 'rai' : 'hand', raiP ? 'Review' : 'My hand'], ['room', 'Room'], ['threat', 'Threats']];
    const body = tab === 'room' ? roomTab() : tab === 'threat' ? threatTab() : stp() === 'built' ? builtTab() : raiP ? raiTab() : handTab();
    return `<div class="ph">${hdr()}<div class="tabs">${tabs.map(t => `<button class="${tab === t[0] ? 'on' : ''}" data-a="tab" data-id="${t[0]}">${t[1]}</button>`).join('')}</div>${body}</div>`;
  }
  function playerClick(e) { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, id = b.dataset.id; SFX.unlock && SFX.unlock();
    if (a === 'join') { const i = document.getElementById('nm'); join(i ? i.value : ui.typed); }
    else if (a === 'tab') { ui.tab = id; render(true); }
    else if (a === 'vote') vote(id);
    else if (a === 'ok') { ui.cross = null; flag(id, 'ok'); }
    else if (a === 'x') { ui.cross = { k: 'c' + id }; render(true); }
    else if (a === 'cr') { flag(id, 'x:' + b.dataset.r); ui.cross = null; render(true); }
    else if (a === 'sok') { ui.cross = null; sflag(id, 'ok'); }
    else if (a === 'sx') { ui.cross = { k: 's' + id }; render(true); }
    else if (a === 'sr') { sflag(id, 'x:' + b.dataset.r); ui.cross = null; render(true); } }

  /* ======================= BOARD ======================= */
  function fitStage() { const s = document.getElementById('stage'); if (!s) return; s.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; }
  function boardView() { const st = ST(), origin = location.origin + location.pathname.replace(/index\.html$/, '');
    if (st.phase === 'lobby' || !st.phase) { const url = origin + (ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : ''); let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); } catch (e) {}
      return `<div class="stageW"><div class="stage" id="stage"><div class="lob"><div class="bigl">ECHO</div><p class="bsub">One project. One room. Win or lose together.</p><div class="qr">${qr}</div><div class="join">Scan to join · ${plist().length} in the room</div><div class="names">${plist().map(p => `<span>${esc(p.name)}</span>`).join('')}</div></div></div></div>`; }
    if (st.phase === 'done') return boardDone();
    const t = tot(), v = veto(), cols = E.DORDER.concat(['RAI']);
    return `<div class="stageW"><div class="stage" id="stage"><div class="bt1"><div><div class="kick">${esc(E.USE[UC()].n)}</div><h2>Round ${rd()} of 4 · ${E.RN[rd() - 1]}</h2></div><div class="bm">${meter('Money', t.spent, budget(), 'M')}${meter('Time', t.time, deadline(), ' wk')}</div><div class="bs"><b>${stepName[stp()]}</b>${rd() === 4 && stp() === 'review' ? '<span class="xc">Crosses are binding</span>' : rd() < 4 && stp() === 'review' ? '<span>RAI advice only</span>' : ''}</div></div>${noteBox()}
      <div class="cols">${cols.map(d => `<div class="col" style="--dc:${dcol(d)}"><h3>${E.DEPTS[d]}</h3><div class="mut">${plist().filter(p => p.dept === d).length} people</div>${d === 'RAI' ? `<div class="mut" style="margin-top:10px">${plist().filter(p => p.dept === 'RAI').map(p => esc(p.name)).join(', ')}</div>` : shownIds(d).map(id => card(id, { votes: true })).join('') + setLine(d) || ''}${d !== 'RAI' && !shownIds(d).length ? '<div class="mut">Choosing…</div>' : ''}</div>`).join('')}</div>
      <div class="intel"><b>Threat briefing</b>${E.intelAt(UC(), rd()).map(x => `<span class="sev ${x.v}">${esc(x.n)}</span>`).join('')}</div></div></div>`; }
  function boardDone() { const r = E.finish(UC(), built(), tot().spent, tot().time, budget(), deadline());
    return `<div class="stageW"><div class="stage" id="stage"><div class="vd"><div class="gl g-${r.grade}"><small>The room's result</small><h1>${E.GR[r.grade]}</h1><div class="meas"><span class="${r.safe ? 'okc' : 'xc'}">${r.safe ? '✓' : '✗'} Safe</span><span class="${r.bOk ? 'okc' : 'xc'}">${r.bOk ? '✓' : '✗'} Budget €${fm(r.spent)}M of €${fm(r.budget)}M</span><span class="${r.tOk ? 'okc' : 'xc'}">${r.tOk ? '✓' : '✗'} Time ${r.time} of ${r.deadline} wks</span></div></div>
      <div class="atk">${r.items.map((i, k) => `<div class="ar ${i.st === 'stopped' ? 'ok' : 'bad'}" style="animation-delay:${0.4 + k * 0.45}s"><span class="ic">${i.st === 'stopped' ? '🛡️' : '💥'}</span><span class="an">${esc(i.n)}</span><span class="sev ${i.v}">${i.v}</span><span class="aw">${i.st === 'stopped' ? esc(C(i.by).n) : i.st === 'shortcut' ? 'Shortcut: ' + esc(C(i.sc).n) : 'No control built'}</span></div>`).join('')}</div></div></div></div>`; }

  /* ======================= HOST ======================= */
  function setNote(txt) { return { 'state/note': txt ? { txt, at: DB.now() } : null }; }
  function hostView() {
    const st = ST(), url = location.origin + location.pathname.replace(/index\.html$/, ''), rm = ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '';
    const links = `<div class="hbox"><h3>LINKS</h3><div style="line-height:1.9">Players (QR): <a href="${url}${rm}" target="_blank">${esc(url + rm)}</a><br>Projector: <a href="${url}?board${rm ? '&' + rm.slice(1) : ''}" target="_blank">${esc(url + '?board' + (rm ? '&' + rm.slice(1) : ''))}</a></div></div>`;
    const roster = `<div class="hbox"><h3>PLAYERS · ${plist().length}</h3><div class="names">${plist().map(p => `<span style="border-color:${dcol(p.dept)}">${esc(p.name)}${p.dept ? ' · ' + (E.DEPTS[p.dept] || '').split(' ')[0] : ''}</span>`).join('') || '<span>Nobody yet</span>'}</div></div>`;
    if (st.phase !== 'play' && st.phase !== 'done') return `<div class="host"><h1>ECHO host</h1>${links}${roster}<div class="hbox"><h3>USE CASE</h3><select id="huc">${E.USE.map((u, i) => `<option value="${i}" ${i === UC() ? 'selected' : ''}>${esc(u.n)} · €${u.b}M · ${u.t} wks</option>`).join('')}</select><p class="mut">${esc(E.USE[UC()].x)}</p><h3 style="margin-top:12px">CARDS PER DEPARTMENT EACH ROUND</h3><select id="hk">${[1, 2, 3, 4].map(k => `<option ${k === K() ? 'selected' : ''}>${k}</option>`).join('')}</select></div><button class="btn" data-h="start" ${plist().length ? '' : 'disabled'}>Start the game</button><button class="btn ghost" data-h="reset" style="margin-top:8px">Reset room</button></div>`;
    const t = tot(), dials = `<div class="hbox"><h3>MONEY AND TIME · the room sees every change</h3><div class="dial"><span>Budget €${fm(budget())}M (spent €${fm(t.spent)}M)</span><span><button data-h="b" data-v="-1">−1</button><button data-h="b" data-v="-0.5">−0.5</button><button data-h="b" data-v="0.5">+0.5</button><button data-h="b" data-v="1">+1</button></span></div><div class="dial"><span>Deadline ${deadline()} wks (used ${t.time})</span><span><button data-h="t" data-v="-1">−1</button><button data-h="t" data-v="1">+1</button></span></div><div class="dial"><span>Cards per department</span><span><button data-h="k" data-v="-1">−</button> ${K()} <button data-h="k" data-v="1">+</button></span></div><button class="btn sm ghost" data-h="ev">Surprise: regulator moves the deadline −1 wk</button></div>`;
    if (st.phase === 'done') return `<div class="host"><h1>ECHO host</h1><div class="hbox"><h3>GAME OVER</h3><p>Result shown on the projector.</p></div><button class="btn ghost" data-h="reset">New game</button></div>`;
    const prop = nd('prop'), v = veto(), ids = [].concat.apply([], E.DORDER.map(d => propD(d)));
    const list = (stp() === 'ceo' || stp() === 'review') ? `<div class="hbox"><h3>PROPOSED CARDS</h3>${ids.length ? E.DORDER.map(d => propD(d).length ? `<div class="mut" style="margin-top:8px">${E.DEPTS[d]}${v.sets.indexOf(d) >= 0 ? ' · whole set vetoed' : ''}</div>` + propD(d).map(id => { const s = status(id); return `<label class="hl ${s}"><input type="checkbox" data-h="drop" data-id="${id}" ${dropped(id) ? 'checked' : ''} ${stp() === 'ceo' ? '' : 'disabled'}> ${esc(C(id).n)} · ${cost(C(id)).replace(/<[^>]+>/g, '')} ${(() => { const f = E.cardFlags(nd('flags'), id); return (f.ok ? '✓' + f.ok + ' ' : '') + (f.x ? '✗' + f.x : ''); })()}${s === 'veto' ? ' · VETOED' : ''}</label>`; }).join('') : '').join('') : '<p class="mut">Nothing proposed.</p>'}${stp() === 'ceo' ? '<p class="mut">Tick a box to drop a card as CEO. Cards vetoed by RAI in round 4 are removed automatically.</p>' : ''}</div>` : '';
    const nxt = { propose: 'Send proposals to RAI review', review: 'Send to the CEO', ceo: 'Approve and build', built: rd() < 4 ? 'Start round ' + (rd() + 1) : 'Run the attacks' }[stp()];
    return `<div class="host"><h1>ECHO host</h1><div class="hbox"><h3>ROUND ${rd()} OF 4 · ${E.RN[rd() - 1].toUpperCase()} · ${stepName[stp()].toUpperCase()}</h3><button class="btn" data-h="next">${nxt}</button></div>${list}${dials}${roster}${links}<button class="btn ghost" data-h="reset" style="margin-top:8px">Reset room</button></div>`; }
  function hostClick(e) { const b = e.target.closest('[data-h]'); if (!b || b.tagName === 'INPUT') return; hostAct(b.dataset.h, b.dataset.v, b.dataset.id); }
  function hostChange(e) { const t = e.target; if (t.id === 'huc') WR({ 'state/uc': +t.value, 'state/phase': 'lobby' }); else if (t.id === 'hk') WR({ 'state/k': +t.value }); else if (t.dataset && t.dataset.h === 'drop') DB.set(`${BASE}/drop/r${rd()}/${t.dataset.id}`, t.checked ? true : null); }
  async function hostAct(a, v, id) {
    const st = ST();
    if (a === 'reset') { if (confirm('Reset this room? All players and results are cleared.')) await DB.set(BASE, null); return; }
    if (a === 'start') { const as = E.assign(plist()), u = E.USE[UC()], o = { 'state/phase': 'play', 'state/round': 1, 'state/step': 'propose', 'state/uc': UC(), 'state/k': K(), 'state/budget': u.b, 'state/deadline': u.t, 'state/note': null };
      Object.keys(as).forEach(p => o['players/' + p + '/dept'] = as[p]); await WR(o); SFX.fanfare && SFX.fanfare(); return; }
    if (a === 'b' || a === 't') { const nb = a === 'b' ? Math.max(1, E.rnd(budget() + +v)) : Math.max(1, deadline() + +v), txt = a === 'b' ? `The CEO changed the budget to €${fm(nb)}M` : `The CEO changed the deadline to ${nb} weeks`; await WR(Object.assign({ ['state/' + (a === 'b' ? 'budget' : 'deadline')]: nb }, setNote(txt))); return; }
    if (a === 'k') { await WR({ 'state/k': Math.min(4, Math.max(1, K() + +v)) }); return; }
    if (a === 'ev') { const nd2 = Math.max(1, deadline() - 1); await WR(Object.assign({ 'state/deadline': nd2 }, setNote(`The regulator moved the deadline to ${nd2} weeks`))); SFX.news && SFX.news(); return; }
    if (a === 'next') {
      if (st.step === 'propose') { const t = tally(), o = { 'state/step': 'review' }; E.DORDER.forEach(d => E.rank(t[d], K()).forEach(c => o[`prop/r${rd()}/${d}/${c}`] = 1)); await WR(o); }
      else if (st.step === 'review') await WR({ 'state/step': 'ceo' });
      else if (st.step === 'ceo') { const vt = veto(), gone = {}; E.vetoedIds(vt, nd('prop')).forEach(c => gone[c] = 1); const o = { 'state/step': 'built' };
        [].concat.apply([], E.DORDER.map(d => propD(d))).forEach(c => { if (!gone[c] && !dropped(c)) o[`appr/r${rd()}/${c}`] = 1; }); o[`delay/r${rd()}`] = rd() === 4 ? vt.count : 0; await WR(o); SFX.stamp && SFX.stamp(); }
      else if (st.step === 'built') { if (rd() < 4) await WR({ 'state/round': rd() + 1, 'state/step': 'propose', 'state/note': null }); else { await WR({ 'state/phase': 'done', 'state/note': null }); const r = E.finish(UC(), built(), tot().spent, tot().time, budget(), deadline()); (r.grade === 'fail' || r.grade === 'bronze' ? SFX.sad : SFX.fanfare) && (r.grade === 'fail' || r.grade === 'bronze' ? SFX.sad() : SFX.fanfare()); } }
    } }

  /* ======================= shell ======================= */
  let lastSig = '', lastPhase = null;
  function render(force) {
    const act = document.activeElement; if (VIEW === 'player' && act && act.id === 'nm' && !force) return; if (VIEW === 'host' && act && /^h(uc|k)$/.test(act.id || '') && !force) return;
    const html = VIEW === 'board' ? boardView() : VIEW === 'host' ? hostView() : playerView();
    if (!force && html === lastSig) return; lastSig = html;
    const keep = VIEW === 'player' && act && act.id === 'nm' ? act.value : null, sy = window.scrollY;
    $app.innerHTML = html + (DB.mode === 'demo' && VIEW !== 'board' ? '<div class="demo">DEMO MODE · this browser only</div>' : '');
    if (VIEW === 'board') fitStage(); else window.scrollTo(0, sy);
    const inp = document.getElementById('nm'); if (inp) { inp.addEventListener('input', () => ui.typed = inp.value); if (keep != null) inp.value = keep; }
    if (VIEW === 'board' && lastPhase && lastPhase !== ST().phase && ST().phase === 'done') { try { SFX.drumroll && SFX.drumroll(2.4); } catch (e) {} }
    lastPhase = ST().phase; }
  document.addEventListener('click', e => VIEW === 'host' ? hostClick(e) : VIEW === 'player' ? playerClick(e) : 0);
  document.addEventListener('change', e => VIEW === 'host' && hostChange(e));
  window.addEventListener('resize', fitStage);
  DB.on(BASE, v => { D = v || {}; render(); });
  window.__echo = { get D() { return D; }, pid: () => pid };
})();
