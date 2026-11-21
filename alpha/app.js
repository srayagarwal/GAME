/* ALPHA · one page, three views: player (default), ?board (projector), ?host=KEY */
(function () {
  const A = window.ALPHA, cfg = window.TYCOON_CONFIG || {}, Q = new URLSearchParams(location.search);
  const ROOM = (Q.get('room') || cfg.room || 'main').replace(/[^\w-]/g, ''), BASE = 'games/alpha-' + ROOM;
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
  let D = {}, ui = { typed: '', focus: null, sel: null, ai: 0, lastSpot: null };
  const ST = () => D.state || { phase: 'lobby' }, PL = () => D.players || {};
  const rd = () => ST().round || 1, sp = () => ST().step || 'wait', sector = () => ST().sector || 'banking';
  const plist = () => Object.keys(PL()).map(id => Object.assign({ id }, PL()[id])).filter(p => p.name).sort((a, b) => (a.t || 0) - (b.t || 0));
  const pcol = id => PCOL[Math.max(0, plist().findIndex(p => p.id === id)) % PCOL.length];
  const pname = id => (PL()[id] || {}).name || '?';
  const fmt = x => (Math.round((x || 0) * 10) / 10).toString();
  const ucOf = r => { const u = (ST().ucs || {})[r]; if (!u) return null; const k = A.USE[u.k] ? u.k : 'chat'; return { k, t: u.t || A.USE[k].t[sector()], x: A.USE[k].x, n: A.USE[k].n }; };
  const atkName = id => id === 'reg' ? A.REGN[sector()] : A.A[id].n;
  const hist = () => Object.values(ST().history || {});
  const attacks = () => Object.values((ST().attack || {}).list || {}).map(s => Object.assign({}, s, { res: s.res || {} }));
  const dshort = d => A.DSHORT[d] || d;
  function G() { const pl = {}; plist().forEach(p => { pl[p.id] = { budget: p.budget || 0, own: Object.assign({}, p.own), bought: Object.assign({}, p.bought), dmg: p.dmg || 0, saved: p.saved || 0, credit: p.credit || 0, spent: p.spent || 0, paid: Object.keys(p.paid || {}).reduce((m, k) => (m[k] = Object.values(p.paid[k]), m), {}), byRound: Object.values(p.byRound || {}), awd: Object.assign({}, p.awd) }; });
    return { round: rd(), fx: Object.assign({}, ST().fx), players: pl, history: hist() }; }
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const fmtT = ms => { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const DUR = { 1: 300, 2: 270, 3: 240, 4: 240 }, SLOT = 9000;
  const bonText = l => { const B = A.BON[l.k]; return l.who ? `${B.n}: ${esc(pname(l.who))} ${B.d}${l.note ? ' (' + esc(l.note) + ')' : ''}` : `${B.n}: ${B.d}`; };
  const lvl = l => `<span class="lv ${l == null ? '' : 'lv' + l}"><i></i><i></i><i></i></span>`;
  const helps = id => A.AIDS.filter(a => A.A[a].s.slice(0, 3).indexOf(id) >= 0).map(a => atkName(a));
  const LCOL = ['#5bc0eb', '#3dd6a3', '#f2c14e'];

  /* ======================= mind map geometry ======================= */
  const DA = {}; A.DISC.forEach((d, i) => DA[d] = -90 + i * 45);
  function leafPos(d, j, k, cx, cy, r1, r2, r3) { const span = Math.min(40, 7 * k), st = k > 1 ? span / (k - 1) : 0, a = DA[d] + (j - (k - 1) / 2) * st, r = k > 3 ? (j % 2 ? r3 : r2) : (r2 + r3) / 2; return [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180), a]; }
  const discPos = (d, cx, cy, r1) => [cx + r1 * Math.cos(DA[d] * Math.PI / 180), cy + r1 * Math.sin(DA[d] * Math.PI / 180)];

  /* ======================= PLAYER ======================= */
  const PIDK = 'alpha_pid_' + ROOM;
  let pid = store.get(PIDK); if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set(PIDK, pid); }
  const me = () => PL()[pid] && PL()[pid].name ? PL()[pid] : null;
  const WR = o => DB.update(BASE, o);
  async function join(name) {
    name = cleanName(name); const k = keyOf(name); if (!k) return;
    await DB.tx(BASE + '/names/' + k, cur => cur ? undefined : pid);
    const now = await DB.get(BASE + '/names/' + k);
    if (now !== pid) { if (confirm('The name "' + name + '" is taken. Is that you? OK = rejoin as that player.')) { pid = now; store.set(PIDK, pid); render(true); } return; }
    let b = A.START; if (ST().phase === 'play') for (let r = 2; r <= rd(); r++) b += A.TOPUP[r] || 0;
    await DB.set(BASE + '/players/' + pid, { name, budget: b, t: DB.now() }); ui.typed = ''; buzz(30); render(true); }
  const canAct = () => ST().phase === 'play' && sp() === 'build';
  function persist(p) { WR({ ['players/' + pid + '/budget']: p.budget, ['players/' + pid + '/own']: p.own, ['players/' + pid + '/bought']: p.bought || null, ['players/' + pid + '/spent']: p.spent || 0, ['players/' + pid + '/paid']: p.paid || null }); }
  function doBuy(id) { if (!canAct()) return; const g = G(), p = g.players[pid]; if (!p) return; const was = p.own[id], e = A.buy(g, p, id);
    if (e) { toast(e === 'cash' ? 'Not enough budget (€' + A.price(g, p, id) + 'M)' : e === 'closed' ? 'Not open yet' : 'Already Leading'); buzz([40, 40]); return; }
    persist(p); SFX.deal(); toast(was == null ? 'Bought ' + A.C[id].n : A.C[id].n + ' is now ' + A.LV[p.own[id]]); }
  function doUndo(id) { if (!canAct()) return; const g = G(), p = g.players[pid]; if (!p) return; const was = p.own[id], e = A.undo(g, p, id);
    if (e) { toast('Frozen from an earlier round: it can only go up'); buzz([40, 40]); return; }
    persist(p); SFX.deal(); toast(was === 0 ? 'Removed ' + A.C[id].n + ', money back' : A.C[id].n + ' back to ' + A.LV[p.own[id]]); }
  function doBundle(key) { if (!canAct()) return; const g = G(), p = g.players[pid], e = A.buyBundle(g, p, nodeIds(key)); if (e) { toast(e === 'cash' ? 'Not enough budget for the bundle' : 'Nothing to bundle'); buzz([40, 40]); return; } persist(p); SFX.deal(); toast('Bundle bought'); }
  const ready = () => DB.set(BASE + '/players/' + pid + '/ready', rd());
  const unready = () => DB.set(BASE + '/players/' + pid + '/ready', null);

  const nodeIds = key => { const [d, p] = String(key).split('|'); if (!p) return A.OF(d); let n = { k: A.TREE[d] }; p.split('.').forEach(i => { n = n.k[+i]; }); return A.leaves(n); };
  // overview geometry: centre, branch pills, area nodes, then one dot per control
  function geo() { const out = []; A.DISC.forEach(d => { const areas = A.TREE[d], na = areas.length, sp = Math.min(15, 40 / na);
      areas.forEach((ar, i) => { const ang = DA[d] + (i - (na - 1) / 2) * sp, ids = A.leaves(ar), m = ids.length, st = 4.6; const [ax, ay] = [200 + 138 * Math.cos(ang * Math.PI / 180), 270 + 138 * Math.sin(ang * Math.PI / 180)];
        out.push({ d, ar, ax, ay, ids: ids.map((id, j) => { const a2 = ang + (j - (m - 1) / 2) * st, r = j % 2 ? 203 : 181; return { id, x: 200 + r * Math.cos(a2 * Math.PI / 180), y: 270 + r * Math.sin(a2 * Math.PI / 180) }; }) }); }); }); return out; }
  function mapPhone(own, afterId) {
    const r = rd(), g = G(), open = id => A.isOpen(id, g), AT = afterId ? A.A[afterId] : null, uc = ucOf(r); let s = '';
    const G2 = geo();
    A.DISC.forEach(d => { const [x, y] = discPos(d, 200, 270, 92); s += `<line x1="200" y1="270" x2="${x}" y2="${y}" stroke="${A.DCOL[d]}" stroke-width="3" opacity=".6"/>`; });
    G2.forEach(a => { const [x, y] = discPos(a.d, 200, 270, 92); s += `<line x1="${x}" y1="${y}" x2="${a.ax}" y2="${a.ay}" stroke="${A.DCOL[a.d]}" stroke-width="2" opacity=".5"/>`; a.ids.forEach(q => { const l = own[q.id]; s += `<line x1="${a.ax}" y1="${a.ay}" x2="${q.x}" y2="${q.y}" stroke="${l != null ? LCOL[l] : A.DCOL[a.d]}" stroke-width="1.5" opacity="${open(q.id) ? .5 : .15}"/>`; }); });
    G2.forEach(a => { s += `<rect x="${a.ax - 5}" y="${a.ay - 5}" width="10" height="10" rx="3" fill="${A.DCOL[a.d]}" opacity=".9"/>`; a.ids.forEach(q => { const id = q.id, l = own[id], o = open(id), st_ = AT && AT.s.indexOf(id) >= 0, gap = st_ && l == null, isNew = o && l == null && r > 1 && A.C[id].r === r;
        if (st_) s += `<circle cx="${q.x}" cy="${q.y}" r="11" fill="none" stroke="${gap ? '#ff6b87' : '#3dd6a3'}" stroke-width="2.5"/>`; else if (isNew) s += `<circle cx="${q.x}" cy="${q.y}" r="10" fill="none" stroke="#f2c14e" stroke-width="2" class="pulseN"/>`;
        s += `<g data-focus="${afterId ? '' : a.d}" style="cursor:pointer" ${o ? '' : 'opacity=".3"'}><circle cx="${q.x}" cy="${q.y}" r="6.5" fill="${l != null ? LCOL[l] : '#0b1026'}" stroke="${l != null ? LCOL[l] : '#6b75ad'}" stroke-width="1.6" ${l == null ? 'stroke-dasharray="2 2"' : ''}/></g>`; }); });
    A.DISC.forEach(d => { const [x, y] = discPos(d, 200, 270, 92), L = A.OF(d), ow = L.filter(id => own[id] != null).length, hit = AT && AT.h.indexOf(d) >= 0, ex = uc && uc.x.indexOf(d) >= 0 && !afterId;
      s += `<g data-focus="${afterId ? '' : d}" style="cursor:pointer"><rect x="${x - 34}" y="${y - 17}" width="68" height="34" rx="17" fill="${hit ? 'rgba(255,107,135,.28)' : '#1b2350'}" stroke="${hit ? '#ff6b87' : ex ? '#f2c14e' : ow ? A.DCOL[d] : '#5a66a8'}" stroke-width="${ex ? 3.5 : 2.5}"/><text x="${x}" y="${y - 2}" text-anchor="middle" fill="#f1f3ff" font-size="10.5" font-weight="800">${esc(dshort(d))}</text><text x="${x}" y="${y + 11}" text-anchor="middle" fill="#a8b0dc" font-size="9.5">${ow}/${L.length}</text></g>`; });
    s += `<circle cx="200" cy="270" r="40" fill="#2a2410" stroke="#f2c14e" stroke-width="3"/><text x="200" y="266" text-anchor="middle" fill="#f2c14e" font-size="12" font-weight="800">${afterId ? 'STRUCK' : 'USE CASE'}</text><text x="200" y="282" text-anchor="middle" fill="#f1f3ff" font-size="11" font-weight="700">${esc(afterId ? atkName(afterId).slice(0, 14) : uc ? uc.n.split(' ')[0] : '')}</text>`;
    return `<svg viewBox="0 0 400 540" role="img" aria-label="Your control map">${s}</svg>`; }
  const wrapT = (t, n) => { const w = String(t).split(' '), out = []; let c = ''; w.forEach(x => { if ((c + ' ' + x).trim().length > n && c) { out.push(c); c = x; } else c = (c + ' ' + x).trim(); }); if (c) out.push(c); return out; };
  // the opened branch as a pure node-and-branch map: no cards, no lists
  function focusTree(own) { const d = ui.focus, g = G(), p = g.players[pid] || { own, budget: 0 }, col = A.DCOL[d], sel = ui.sel, ROW = 40, BUB = 0, can = canAct(); let y = 34; const E = [], N = [], T = []; let dock = null;
    const bubble = (yy, title, lines, btn) => { dock = { title, lines, btn }; return ''; };
    const btnSvg = (yy, label, id, key, ok) => { const w = label.split(' · '); return `<g ${ok ? `data-a="${key}" data-id="${esc(id)}"` : ''} style="cursor:pointer" opacity="${ok ? 1 : .4}"><circle cx="340" cy="50" r="38" fill="${ok ? '#f2c14e' : '#3a4585'}" stroke="#fff" stroke-width="${ok ? 3 : 0}"/><text x="340" y="${w[1] ? 46 : 55}" text-anchor="middle" fill="${ok ? '#0b1026' : '#cfd6f5'}" font-size="12.5" font-weight="800">${esc(w[0])}</text>${w[1] ? `<text x="340" y="62" text-anchor="middle" fill="${ok ? '#0b1026' : '#cfd6f5'}" font-size="13" font-weight="800">${esc(w[1])}</text>` : ''}</g>`; };
    const rn = (cx, lab, sub, ok, key, id, gold) => `<g ${ok ? `data-a="${key}" data-id="${esc(id)}"` : ''} style="cursor:pointer" opacity="${ok ? 1 : .35}"><circle cx="${cx}" cy="50" r="29" fill="${ok && gold ? '#f2c14e' : '#1b2350'}" stroke="${ok ? '#fff' : '#3a4585'}" stroke-width="${ok ? 2.5 : 1.5}"/><text x="${cx}" y="${sub ? 47 : 58}" text-anchor="middle" fill="${ok && gold ? '#0b1026' : '#fff'}" font-size="${sub ? 20 : 22}" font-weight="800">${lab}</text>${sub ? `<text x="${cx}" y="63" text-anchor="middle" fill="${ok && gold ? '#0b1026' : '#cfd6f5'}" font-size="11" font-weight="800">${esc(sub)}</text>` : ''}</g>`;
    const ctlBtns = (id, l, op, c, ok, p, pd) => { const cd = can && l != null && pd && pd.length; return rn(252, '−', cd ? '+€' + pd[pd.length - 1] + 'M' : l != null ? '🔒' : '', cd, 'undo', id, false) + rn(332, '+', op && c != null ? '€' + c + 'M' : op ? 'max' : '', ok, 'buy', id, true); };
    const nodeBub = key => { const ids = nodeIds(key), b = A.bundle(g, p, ids), sum = b ? b.ids.reduce((x, id) => x + A.price(g, p, id), 0) : 0; let nm = key; if (key.indexOf('|') >= 0) { let n = { k: A.TREE[d] }; key.split('|')[1].split('.').forEach(i => { n = n.k[+i]; }); nm = n.n; }
      return [nm, [ids.filter(id => own[id] != null).length + ' of ' + ids.length + ' controls owned.', b ? 'Open ones as a bundle: €' + b.cost + 'M, saving €' + A.rnd(sum - b.cost) + 'M.' : 'No bundle available right now.'], null, b]; };
    let top = null; if (sel === 'node:' + d) { top = y - 14; y += BUB; }
    const lay = (n, depth, path) => { if (typeof n === 'string') { const o = { id: n, y, x: 214 }; y += ROW; if (sel === n) { o.ex = y - 14; y += BUB; } return o; }
      const kids = n.k.map((k, i) => lay(k, depth + 1, path + '.' + i)), o = { n, kids, x: depth === 1 ? 104 : 156, y: (kids[0].y + kids[kids.length - 1].y) / 2, key: d + '|' + path }; if (sel === 'node:' + o.key) { o.ex = y - 14; y += BUB; } return o; };
    const tops = A.TREE[d].map((n, i) => lay(n, 1, String(i))), dy = tops.length ? (tops[0].y + tops[tops.length - 1].y) / 2 : 60, DX = 40;
    const edge = (x1, y1, x2, y2, c, dash) => `<path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" fill="none" stroke="${c}" stroke-width="2.4" ${dash ? 'stroke-dasharray="4 4"' : ''} opacity=".75"/>`;
    const draw = (o, px, py) => { if (o.id) { const id = o.id, l = own[id], op = A.isOpen(id, g), c = op ? A.price(g, p, id) : null, isNew = op && l == null && rd() > 1 && A.C[id].r === rd(), nm = A.C[id].n, S = sel === id;
        E.push(edge(px + 14, py, o.x - 14, o.y, l != null ? LCOL[l] : col, l == null));
        const pd = (p.paid || {})[id], ch = l != null && pd && pd.length, fr = l != null && !ch;
        N.push(`<g data-sel="${id}" style="cursor:pointer" ${op ? '' : 'opacity=".5"'}>${isNew ? `<circle cx="${o.x}" cy="${o.y}" r="20" fill="none" stroke="#f2c14e" stroke-width="2.5" class="pulseN"/>` : ''}${ch ? `<circle cx="${o.x}" cy="${o.y}" r="19" fill="none" stroke="#f2c14e" stroke-width="2" stroke-dasharray="3 3"/>` : ''}<circle cx="${o.x}" cy="${o.y}" r="14" fill="${l != null ? LCOL[l] : '#0b1026'}" stroke="${S ? '#fff' : l != null ? LCOL[l] : col}" stroke-width="${S ? 4 : 2.5}" ${l == null ? 'stroke-dasharray="3 3"' : ''}/><text x="${o.x}" y="${o.y + 4.5}" text-anchor="middle" fill="${l != null ? '#04261b' : '#a8b0dc'}" font-size="13" font-weight="800">${l != null ? l + 1 : op ? '+' : '🔒'}</text>${fr ? `<text x="${o.x + 12}" y="${o.y - 9}" font-size="10">🔒</text>` : ''}
          <text x="${o.x + 24}" y="${o.y + 4.5}" fill="#f1f3ff" stroke="#0b1026" stroke-width="3.5" paint-order="stroke" font-size="12.5" font-weight="700">${esc(nm.length > 26 ? nm.slice(0, 25) + '…' : nm)}${isNew ? ' ★' : ''}</text></g>`);
        if (o.ex) { const C = A.C[id], ok = can && op && c != null && p.budget >= c, lab = !op ? 'Opens in round ' + C.r : l == null ? 'Buy · €' + c + 'M' : l < 2 ? 'Strengthen · €' + c + 'M' : 'Leading', hp = helps(id).slice(0, 2).join(', ');
          T.push(bubble(o.ex, C.n, [l != null ? A.LV[l] + ' · absorbs ' + Math.round(A.ABS[l] * 100) + '%' + (l < 2 ? ' → ' + Math.round(A.ABS[l + 1] * 100) + '%' : '') : 'Not owned yet'].concat(wrapT(C.t, 31).slice(0, 2), ['Helps: ' + (hp || '—')].map(x => x.length > 31 ? x.slice(0, 30) + '…' : x)), ctlBtns(id, l, op, c, ok, p, pd)) ); } return; }
      const S = sel === 'node:' + o.key, owned = A.leaves(o.n).filter(id => own[id] != null).length, tot = A.leaves(o.n).length, sub = o.x === 156;
      E.push(edge(px + 14, py, o.x - 14, o.y, col, sub)); o.kids.forEach(k => draw(k, o.x, o.y));
      const ln = wrapT(o.n.n, 11); N.push(`<g data-sel="node:${esc(o.key)}" style="cursor:pointer"><circle cx="${o.x}" cy="${o.y}" r="${sub ? 11 : 14}" fill="#10193d" stroke="${S ? '#fff' : col}" stroke-width="${S ? 4 : 3}"/><text x="${o.x}" y="${o.y + 4}" text-anchor="middle" fill="#fff" font-size="10.5" font-weight="800">${owned}/${tot}</text>${ln.map((t, i) => `<text x="${o.x}" y="${o.y + 26 + i * 11}" text-anchor="middle" fill="${col}" stroke="#0b1026" stroke-width="3.5" paint-order="stroke" font-size="9.5" font-weight="800">${esc(t)}</text>`).join('')}</g>`);
      if (o.ex) { const [nm, lines, , b] = nodeBub(o.key); T.push(bubble(o.ex, nm, lines, b ? btnSvg(o.ex, 'Buy all ' + b.ids.length + ' · €' + b.cost + 'M', o.key, 'bundle', can && p.budget >= b.cost) : '')); } };
    tops.forEach(o => { E.push(edge(DX + 20, dy, o.x - 14, o.y, col)); draw(o, DX + 6, dy); });
    if (top != null) { const [nm, lines, , b] = nodeBub(d); T.push(bubble(top, nm, lines, b ? btnSvg(top, 'Buy all ' + b.ids.length + ' · €' + b.cost + 'M', d, 'bundle', can && p.budget >= b.cost) : '')); }
    const ownN = A.OF(d).filter(id => own[id] != null).length, H = y + 20;
    const disc = `<g data-back="1" style="cursor:pointer"><circle cx="${DX}" cy="${dy}" r="28" fill="#10193d" stroke="#f2c14e" stroke-width="4"/><text x="${DX}" y="${dy - 9}" text-anchor="middle" fill="#f2c14e" font-size="13" font-weight="800">←</text><text x="${DX}" y="${dy + 4}" text-anchor="middle" fill="#fff" font-size="10" font-weight="800">${esc(dshort(d).split(' ')[0])}</text><text x="${DX}" y="${dy + 16}" text-anchor="middle" fill="#a8b0dc" font-size="9.5">${ownN}/${A.OF(d).length}</text></g>`;
    const back = `<g data-back="1" style="cursor:pointer"><circle cx="22" cy="16" r="13" fill="#1b2350" stroke="#f2c14e" stroke-width="2.5"/><text x="22" y="21" text-anchor="middle" fill="#f2c14e" font-size="15" font-weight="800">←</text><text x="42" y="20" fill="#f2c14e" font-size="11" font-weight="800">whole map</text></g>`;
    return `<div class="mm"><svg viewBox="0 0 400 ${H}" role="img" aria-label="${esc(d)} branch">${E.join('')}${disc}${N.join('')}</svg></div>${dock ? `<div class="dock"><svg viewBox="0 0 400 100">${dock.btn}<circle cx="18" cy="16" r="6" fill="${col}"/><text x="34" y="21" fill="#fff" font-size="14" font-weight="800">${esc(dock.title)}</text>${dock.lines.map((t, i) => `<text x="34" y="${40 + i * 16}" fill="#cfd6f5" font-size="11.5">${esc(t)}</text>`).join('')}</svg></div>` : ''}`; }

  function header() { const m = me(), st = ST(), dl = st.deadline && sp() === 'build' ? `<span id="tm">${fmtT(st.deadline - DB.now())}</span>` : '<span></span>';
    return `<div class="hd"><div class="row"><div class="nm">${esc(m.name)}</div><span class="pill g">€${fmt(m.budget)}M</span><span class="pill m">Credit ${fmt(m.credit)}</span></div><div class="tm"><span>Round ${rd()} of 4 · ${A.ROUNDS[rd()].name}</span>${dl}</div></div>`; }
  function bonusCards() { const bl = Object.values(ST().bl || {}); if (!bl.length) return '';
    return bl.map(l => `<div class="card bonus ${l.who === pid ? (l.k === 'lose' ? 'bad' : 'me') : l.who ? '' : ''}"><div class="kick">${l.who ? (l.who === pid ? 'Surprise · you' : 'Surprise · ' + esc(pname(l.who))) : 'Surprise · everyone'}</div><p><b>${bonText(l)}</b></p></div>`).join(''); }
  function detail(own) { const id = ui.sel; if (!id) return '';
    const g = G(), p = g.players[pid] || { own, budget: 0 }, l = own[id], C = A.C[id], o = A.isOpen(id, g), c = A.price(g, p, id), dis = !canAct() || !o || c == null || p.budget < c;
    const act = !o ? `<span class="pill">Opens in round ${C.r}</span>` : l == null ? `<button class="btn sm" data-a="buy" data-id="${id}" ${dis ? 'disabled' : ''}>Buy · €${c}M</button>` : l < 2 ? `<button class="btn sm" data-a="buy" data-id="${id}" ${dis ? 'disabled' : ''}>Strengthen · €${c}M</button>` : '<span class="chip ok">Leading</span>';
    return `<div class="card" style="border-color:${l != null ? LCOL[l] : 'var(--line)'};margin:6px 0"><div class="row"><div class="grow"><div class="mut">${esc(C.d)} branch</div></div>${lvl(l)}</div><p style="margin:8px 0">${esc(C.t)}</p><div class="mut">${l != null ? A.LV[l] + ' · absorbs ' + Math.round(A.ABS[l] * 100) + '% of what it covers' : 'Not owned'}${l != null && l < 2 ? ' · next level ' + Math.round(A.ABS[l + 1] * 100) + '%' : ''}</div><div class="mut" style="margin-top:6px">Helps against: ${helps(id).map(esc).join(', ') || '—'}</div><div class="acts">${act}</div></div>`; }
  function pBuild() { const m = me(), own = m.own || {}, uc = ucOf(rd());
    return `<div class="card"><div class="kick">Use case in the centre · activated by the host</div><h3>${esc(uc.t)}</h3><div>${uc.x.map(d => `<span class="exp">⚠ ${esc(d)} exposed</span>`).join('')}</div><p class="mut" style="margin-top:6px">Attacks that hit an exposed branch do 40% more damage.</p></div>` + bonusCards() +
      (ui.focus ? focusTree(own) : `<div class="mm">${mapPhone(own)}</div><div class="mut" style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:8px"><span>◯ not owned</span><span style="color:#5bc0eb">● Basic</span><span style="color:#3dd6a3">● Strong</span><span style="color:#f2c14e">● Leading</span></div><p class="mut" style="text-align:center">Centre → branch → area → controls. Tap a branch to open it, then tap any node.</p>`) +
      `<p class="mut c" style="text-align:center;margin-top:10px">You can buy and strengthen. You cannot sell.</p>`; }
  function pWait() { const r = rd(), uc = ucOf(r); return `<div class="card"><div class="kick">Round ${r} of 4 · ${A.ROUNDS[r].name}</div><h3>${esc(A.ROUNDS[r].theme)}</h3><p>${esc(A.ROUNDS[r].more)}</p></div><div class="card"><p class="mut c" style="text-align:center">Waiting for the host to activate the use case…</p></div>` + ((me().own && Object.keys(me().own).length) ? `<div class="mm">${mapPhone(me().own)}</div>` : ''); }
  function pStrike() { return `<div class="card"><div class="kick">Attack phase</div><h3>🎲 Watch the projector</h3><p>${rd() === 1 ? 'One attack lands in the first round.' : 'Two attacks land this round. Nobody knows what or where until it strikes.'}</p></div>`; }
  function pSettle() { const m = me(), atks = attacks(), a = atks[Math.min(ui.ai, atks.length - 1)], mine = ((ST().awards || {})[pid]) ? Object.values(ST().awards[pid]) : [];
    if (!a) return '<div class="card"><p>Waiting for results…</p></div>'; const r = (a.res || {})[pid] || { loss: 0, pct: 0 }, saved = Object.values(r.saved || {}), gaps = Object.values(r.gaps || {}), tot = atks.reduce((s, x) => s + (x.res[pid] ? x.res[pid].loss : 0), 0);
    const rank = Object.values(ST().rank || {}).indexOf(pid);
    return `<div class="card"><div class="kick">Round ${rd()} result</div><div class="big" style="font-size:34px;color:${tot > 8 ? 'var(--coral)' : 'var(--mint)'}">−€${fmt(tot)}M</div><p class="mut">total damage this round · budget €${fmt(m.budget)}M</p></div>
    <div class="tabs2">${atks.map((x, i) => `<button class="${i === ui.ai ? 'on' : ''}" data-a="ai" data-id="${i}">${esc(atkName(x.id))}</button>`).join('')}</div>
    <div class="atkc"><div class="kick" style="color:var(--coral)">${A.A[a.id].k}${a.exposed ? ' · hit your use case' : ''}</div><h3>${esc(atkName(a.id))}</h3><p>${esc(A.A[a.id].d)}</p><div style="display:flex;gap:12px;align-items:baseline;margin-top:6px"><b style="font-size:26px;color:${r.loss > 8 ? 'var(--coral)' : 'var(--mint)'}">−€${fmt(r.loss)}M</b><span class="mut">${Math.round((r.pct || 0) * 100)}% absorbed · base €${fmt(a.base)}M</span></div>${r.clean ? '<span class="chip ok">Clean sheet +3</span>' : ''}</div>
    <div class="mm">${mapPhone(m.own || {}, a.id)}</div>
    ${saved.length ? `<div class="card"><div class="kick" style="color:var(--mint)">What saved you</div>${saved.map(id => `<div class="row" style="padding:3px 0"><div class="grow">${esc(A.C[id].n)}</div>${lvl((m.own || {})[id])}</div>`).join('')}</div>` : ''}
    ${gaps.length ? `<div class="card" style="border-color:var(--coral)"><div class="kick" style="color:var(--coral)">Gaps that would have helped</div><p>${gaps.map(id => esc(A.C[id].n)).join(' · ')}</p></div>` : ''}
    <div class="card"><div class="kick">Credit earned</div>${mine.length ? mine.map(x => `<div class="row" style="padding:4px 0"><div class="grow">${esc(x.txt)}</div><b style="color:var(--gold)">+${x.pts}</b></div>`).join('') : '<p class="mut">None this round.</p>'}</div><p class="mut" style="text-align:center">Waiting for the host…</p>`; }
  function pFinal() { const f = ST().final || {}, order = Object.values(f.order || {}), mineI = order.indexOf(pid), g = G(); if (!g.players[pid]) return ''; const rep = A.report(g, pid), aw = f.awards && f.awards[pid] ? Object.values(f.awards[pid]) : [];
    return `<div class="card"><div class="kick">Final standings</div>${order.map((id, i) => `<div class="lead"><div class="rk">${i + 1}</div><div class="grow"><b style="${id === pid ? 'color:var(--gold)' : ''}">${esc(pname(id))}</b></div><div class="big" style="font-size:28px">${Math.round((f.score || {})[id] || 0)}</div></div>`).join('')}</div>
    <div class="card"><div class="kick">Your result</div><div class="row"><div class="grow"><div class="mut">Damage taken</div><b style="font-size:22px;color:var(--coral);white-space:nowrap">−€${fmt(rep.dmg)}M</b></div><div class="grow"><div class="mut">Absorbed</div><b style="font-size:24px;color:var(--mint)">€${fmt(rep.saved)}M</b></div><div class="grow"><div class="mut">Credit</div><b style="font-size:24px;color:var(--gold)">+${fmt(rep.credit)}</b></div></div>
    <p class="mut" style="margin-top:8px">${rep.byRound.map((x, i) => 'R' + (i + 1) + ' −€' + fmt(x.loss) + 'M').join(' · ')}</p></div>
    ${aw.length ? `<div class="card"><div class="kick">Final awards</div>${aw.map(x => `<div class="row" style="padding:4px 0"><div class="grow">🏆 ${esc(x.txt)}</div><b style="color:var(--gold)">+${x.pts}</b></div>`).join('')}</div>` : ''}
    <div class="card"><div class="kick">Your coverage by branch</div>${rep.cov.map(c => `<div class="cov"><span style="color:${A.DCOL[c.d]}">${esc(dshort(c.d))}</span><div class="bar"><i style="width:${Math.round(100 * c.own / c.all)}%;background:${A.DCOL[c.d]}"></i></div><span>${c.own}/${c.all}</span></div>`).join('')}<p class="mut" style="margin-top:6px">Strongest: <b>${esc(rep.strong)}</b> · Thinnest: <b>${esc(rep.weak)}</b></p></div>
    <div class="card"><div class="kick">Where you were most exposed</div>${rep.gaps.length ? rep.gaps.map(x => `<div class="row" style="padding:4px 0"><div class="grow"><b>${esc(A.C[x.id].n)}</b><div class="mut">${esc(A.C[x.id].d)} · would have saved about €${fmt(x.v)}M</div></div></div>`).join('') : '<p>No gaps: you covered everything that struck.</p>'}</div>
    <div class="card" style="border-color:var(--gold)"><div class="kick">Take this to work</div><h3>${esc(rep.advD)}</h3><p>${esc(rep.advice)}</p><p class="mut" style="margin-top:6px">Your real organisation faces the same attacks. Ask which of your own systems has no ${esc(rep.advD.toLowerCase())} control today.</p></div>`; }
  function playerView() { const st = ST();
    if (!me()) return `<div class="ph"><div class="logo">ALPHA</div><div class="tag">Build the map. Survive the attacks.<br><b>Pick a name to join</b></div><input class="txt" id="nm" maxlength="16" placeholder="Your name or team" value="${esc(ui.typed)}" autocomplete="off"><button class="btn" data-a="join">Join the game</button></div>`;
    if (st.phase === 'lobby') return `<div class="ph"><div class="hd"><div class="row"><div class="nm">${esc(me().name)}</div><span class="pill m">Joined</span></div></div><div class="logo" style="font-size:56px;margin-top:40px">ALPHA</div><div class="tag">You're in. ${plist().length} player${plist().length > 1 ? 's' : ''} so far.<br>Watch the projector.</div></div>`;
    if (st.phase === 'final') return `<div class="ph"><div class="hd"><div class="row"><div class="nm">${esc(me().name)}</div><span class="pill m">Final report</span></div></div>${pFinal()}</div>`;
    const s = sp(), body = { wait: pWait, build: pBuild, strike: pStrike, settle: pSettle }[s](), done = me().ready === rd();
    return `<div class="ph">${header()}${body}</div>${s === 'build' ? `<div class="foot"><button class="btn ${done ? 'ghost' : ''}" data-a="${done ? 'unready' : 'ready'}">${done ? '✓ Done · tap to edit' : "I'm done"}</button></div>` : ''}`; }
  function playerClick(e) { const nd = e.target.closest('[data-focus],[data-sel],[data-back]');
    if (nd) { if (nd.dataset.back) { ui.focus = null; ui.sel = null; } else if (nd.dataset.sel) ui.sel = ui.sel === nd.dataset.sel ? null : nd.dataset.sel; else if (nd.dataset.focus) { ui.focus = nd.dataset.focus; ui.sel = null; } else return; return render(true); }
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a, id = b.dataset.id;
    if (a === 'join') return join(document.getElementById('nm').value);
    if (a === 'ready') return ready(); if (a === 'unready') return unready();
    if (a === 'buy') return doBuy(id); if (a === 'undo') return doUndo(id); if (a === 'bundle') return doBundle(id); if (a === 'ai') { ui.ai = +id; return render(true); } }

  /* ======================= BOARD ======================= */
  const ucLines = uc => { const w = (uc ? uc.n : '').split(' '), out = []; let cur = ''; w.forEach(x => { if ((cur + ' ' + x).trim().length > 15 && cur) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); }); if (cur) out.push(cur); return out.slice(0, 3); };
  const BR = ['Security', 'Govern', 'Third parties'], BL = ['Data', 'Model', 'Operate', 'Assurance', 'People'];
  function boardMap(opts) { opts = opts || {}; const W = 1300, H = 840, CX = 650, CY = 420, pls = plist(), np = Math.max(1, pls.length), r = rd(), g = G(), at = opts.atk ? A.A[opts.atk] : null, uc = ucOf(r), PITCH = 25;
    const share = id => pls.filter(p => (p.own || {})[id] != null).length / np; let s = '', lab = '';
    const wrap2 = t => { const w = t.split(' '); if (t.length <= 13 || w.length < 2) return [t]; let best = 1, bd = 99; for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } } return [w.slice(0, best).join(' '), w.slice(best).join(' ')]; };
    const side = (list, sg) => { const rows = list.reduce((n, d) => n + A.OF(d).length, 0), gap = Math.max(12, (H - 16 - rows * PITCH) / (list.length - 1 || 1)); let y = (H - (rows * PITCH + gap * (list.length - 1))) / 2 + PITCH / 2;
      list.forEach(d => { const L = A.OF(d), gy0 = y, gy1 = y + (L.length - 1) * PITCH, dy = (gy0 + gy1) / 2, dx = CX + sg * 150, ax = CX + sg * 290, sx = CX + sg * 362, lx = CX + sg * 388, ex = uc && uc.x.indexOf(d) >= 0, hit = at && at.h.indexOf(d) >= 0 && opts.revealed, col = A.DCOL[d];
        s += `<path d="M${CX + sg * 82} ${CY} C${CX + sg * 100} ${CY} ${dx - sg * 60} ${dy} ${dx - sg * 60} ${dy}" fill="none" stroke="${col}" stroke-width="6" opacity=".7"/>`;
        let yy = y;
        A.TREE[d].forEach(ar => { const ids = A.leaves(ar), ay = yy + (ids.length - 1) * PITCH / 2, ah = Math.max(34, ids.length * PITCH - 6);
          s += `<path d="M${dx + sg * 60} ${dy} C${dx + sg * 90} ${dy} ${ax - sg * 90} ${ay} ${ax - sg * 62} ${ay}" fill="none" stroke="${col}" stroke-width="3.5" opacity=".6"/>`;
          const kids = ar.k.map(k => typeof k === 'string' ? { ids: [k], sub: false } : { ids: A.leaves(k), sub: true }); let ky = yy;
          kids.forEach(kd => { const my = ky + (kd.ids.length - 1) * PITCH / 2; if (kd.sub) { s += `<path d="M${ax + sg * 62} ${ay} L${sx - sg * 6} ${my}" fill="none" stroke="${col}" stroke-width="2.5" opacity=".6"/><circle cx="${sx}" cy="${my}" r="6" fill="#0b1026" stroke="${col}" stroke-width="3"/>`; }
            kd.ids.forEach((id, j) => { const y2 = ky + j * PITCH, o = A.isOpen(id, g), sh = share(id), isNew = o && r > 1 && A.C[id].r === r, st_ = at && at.s.indexOf(id) >= 0 && opts.revealed;
              s += `<path d="M${kd.sub ? sx + sg * 6 : ax + sg * 62} ${kd.sub ? my : ay} C${sx} ${kd.sub ? my : ay} ${lx - sg * 30} ${y2} ${lx - sg * 12} ${y2}" fill="none" stroke="${col}" stroke-width="1.8" opacity="${o ? .5 : .15}"/>`;
              if (isNew) s += `<circle cx="${lx}" cy="${y2}" r="12" fill="none" stroke="#f2c14e" stroke-width="3" class="pulseN"/>`; if (st_) s += `<circle cx="${lx}" cy="${y2}" r="13" fill="none" stroke="#3dd6a3" stroke-width="4"/>`;
              s += `<circle cx="${lx}" cy="${y2}" r="8" fill="${col}" fill-opacity="${o ? .1 + .9 * sh : .04}" stroke="${col}" stroke-width="2" ${o ? '' : 'stroke-dasharray="3 3" opacity=".55"'}/>`;
              const nm = A.C[id].n; lab += `<text x="${lx + sg * 18}" y="${y2 + 5}" text-anchor="${sg > 0 ? 'start' : 'end'}" fill="${o ? '#eef0ff' : '#7480b8'}" font-size="15.5" font-weight="${o ? 700 : 500}">${esc(nm.length > (sg < 0 ? 25 : 30) ? nm.slice(0, sg < 0 ? 24 : 29) + '…' : nm)}${o ? '' : ' · R' + A.C[id].r}${isNew ? ' ★' : ''}</text>`; });
            ky += kd.ids.length * PITCH; });
          const ln = wrap2(ar.n); s += `<rect x="${ax - 60}" y="${ay - ah / 2}" width="120" height="${ah}" rx="12" fill="#0f1a40" stroke="${col}" stroke-width="2"/>` + ln.map((t, i) => `<text x="${ax}" y="${ay + (ln.length === 1 ? 5 : i ? 17 : -5)}" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">${esc(t)}</text>`).join('');
          yy += ids.length * PITCH; });
        const own = pls.reduce((n, p) => n + L.filter(id => (p.own || {})[id] != null).length, 0), pct = Math.round(100 * own / (L.length * np));
        s += `<rect x="${dx - 68}" y="${dy - 30}" width="136" height="60" rx="30" fill="${hit ? '#4a1022' : '#12204d'}" stroke="${hit ? '#ff5d73' : ex ? '#f2c14e' : col}" stroke-width="${hit ? 7 : ex ? 6 : 3}" ${hit ? 'class="pulseN"' : ''}/><text x="${dx}" y="${dy - 2}" text-anchor="middle" fill="#fff" font-size="21" font-weight="800">${esc(dshort(d))}</text><text x="${dx}" y="${dy + 20}" text-anchor="middle" fill="${ex ? '#f2c14e' : '#b4beea'}" font-size="15" font-weight="700">${ex ? '⚠ ' : ''}${pct}%</text>`;
        y += L.length * PITCH + gap; }); };
    side(BR, 1); side(BL, -1);
    s += `<circle cx="${CX}" cy="${CY}" r="82" fill="#2a2410" stroke="#f2c14e" stroke-width="5"/><text x="${CX}" y="${CY - 34}" text-anchor="middle" fill="#f2c14e" font-size="16" font-weight="800">USE CASE</text>${ucLines(uc).map((l, i) => `<text x="${CX}" y="${CY - 8 + i * 24}" text-anchor="middle" fill="#fff" font-size="20" font-weight="800">${esc(l)}</text>`).join('')}`;
    return `<svg viewBox="0 0 ${W} ${H}">${s}${lab}</svg>`; }
  function fitStage() { const s = document.getElementById('stage'); if (!s) return; const k = Math.min(innerWidth / 1920, innerHeight / 1080); s.style.transform = `scale(${k})`; }
  const bonusBoard = () => Object.values(ST().bl || {}).map(l => `<div class="bcard" style="border-color:var(--gold)"><div class="k">${l.who ? 'Surprise · ' + esc(pname(l.who)) : 'Surprise · everyone'}</div><div style="font-size:27px;font-weight:800;line-height:1.25">${bonText(l)}</div></div>`).join('');
  function boardView() {
    const st = ST(), pls = plist(), r = rd(), s = sp(), origin = location.href.split('?')[0].replace(/\/$/, '/'), uc = ucOf(r), top = (a, b) => `<div class="btop"><div class="blogo">ALPHA</div><div class="brd">${a}<small>${b}</small></div><div class="bchip">${esc((A.SECTORS[sector()] || '').toUpperCase())}${st.client ? ' · ' + esc(st.client).toUpperCase() : ''}</div></div>`;
    if (st.phase === 'lobby') { const url = origin + (ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : ''); let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); } catch (e) {}
      return `<div class="stageW"><div class="stage" id="stage">${top('Waiting for players', 'Four rounds · random attacks · build once, keep it')}<div class="joinB"><div class="qr">${qr}</div><div><h1>ALPHA</h1><div style="font-size:34px;color:var(--lav);font-weight:700;margin:6px 0 24px">Scan to join · ${esc(url.replace(/^https?:\/\//, ''))}</div><div class="nmz">${pls.map(p => `<span style="border-left:8px solid ${pcol(p.id)}">${esc(p.name)}</span>`).join('') || '<span>Waiting for the first player…</span>'}</div></div></div></div></div>`; }
    if (st.phase === 'final') return boardFinal(top);
    const atks = attacks(), now = DB.now(), at = (st.attack || {}).at || 0, idx = s === 'strike' && atks.length ? Math.min(atks.length - 1, Math.max(0, Math.floor((now - at) / SLOT))) : -1, t = idx >= 0 ? (now - at) - idx * SLOT : 0, revealed = s === 'settle' || (idx >= 0 && t > 2600), cur = idx >= 0 ? atks[idx] : (s === 'settle' ? atks[atks.length - 1] : null);
    if (idx >= 0 && now >= at) { if (ui.lastSpot !== 'd' + idx && t < 1500) { ui.lastSpot = 'd' + idx; SFX.drumroll(2.4); } if (revealed && ui.lastSpot !== 'r' + idx) { ui.lastSpot = 'r' + idx; const mine = cur; const worst = Math.max(0, ...Object.values(mine.res).map(x => x.loss)); worst > 6 ? SFX.boom() : SFX.shield(); } }
    let side = '';
    if (s === 'wait') side = `<div class="bcard"><div class="k">Next up · Round ${r} of 4</div><h2>${esc(A.ROUNDS[r].name)}</h2><div style="font-size:26px;line-height:1.35;color:var(--lav);font-weight:600">${esc(A.ROUNDS[r].theme)}. ${esc(A.ROUNDS[r].more)}</div></div><div class="bcard"><div class="k">Players</div>${pls.map(p => `<div class="brow"><span class="dot on" style="background:${pcol(p.id)}"></span><span class="nm">${esc(p.name)}</span><span>€${fmt(p.budget)}M</span></div>`).join('')}</div>`;
    else if (s === 'build') side = `<div class="bcard" style="border-color:var(--gold)"><div class="k">Use case in the centre</div><h2 style="font-size:40px">${esc(uc.t)}</h2><div>${uc.x.map(d => `<span class="exp" style="font-size:22px;padding:6px 14px">⚠ ${esc(d)}</span>`).join('')}</div><div style="font-size:22px;color:var(--lav);margin-top:8px">Attacks on exposed branches do 40% more damage.</div></div>${bonusBoard()}<div class="bcard"><div class="k">Players · ${pls.filter(p => p.ready === r).length}/${pls.length} done</div>${pls.map(p => `<div class="brow"><span class="dot ${p.ready === r ? 'on' : ''}"></span><span class="nm" style="color:${pcol(p.id)}">${esc(p.name)}</span><span>${Object.keys(p.own || {}).length} controls</span><span style="color:var(--gold)">€${fmt(p.budget)}M</span></div>`).join('')}</div>`;
    else if (s === 'strike' || s === 'settle') { const a = cur ? A.A[cur.id] : null;
      if (s === 'strike' && !atks.length) side = '<div class="bcard"><h2>…</h2></div>';
      else if (s === 'strike' && now < at) side = '<div class="bcard flip"><h2>Incoming…</h2></div>';
      else if (s === 'strike') { const rows = pls.map(p => { const x = (cur.res || {})[p.id] || { loss: 0, pct: 0 }; return `<div class="brow"><span class="nm" style="color:${pcol(p.id)}">${esc(p.name)}</span><span style="width:170px"><div class="bar" style="height:16px"><i style="width:${Math.round((x.pct || 0) * 100)}%"></i></div></span><span style="width:60px;text-align:right">${Math.round((x.pct || 0) * 100)}%</span><b style="width:120px;text-align:right;color:${x.loss > 8 ? 'var(--coral)' : 'var(--mint)'}">−€${fmt(x.loss)}M</b></div>`; }).join('');
        side = `<div class="bcard" style="border:3px dashed var(--coral);${revealed ? '' : ''}"><div class="k" style="color:var(--coral)">Attack ${idx + 1} of ${atks.length} · ${revealed ? a.k : 'face down'}</div>${revealed ? `<h2 class="bbig" style="font-size:48px;line-height:1.05">${esc(atkName(cur.id))}</h2><div style="font-size:25px;line-height:1.35;margin-top:6px">${esc(a.d)}</div><div style="font-size:21px;color:var(--lav);margin-top:6px">Early sign: ${esc(a.tell)}</div>${cur.exposed ? '<div class="exp" style="font-size:20px;margin-top:8px">⚠ Hits an exposed branch · +40%</div>' : ''}` : `<h2 class="bbig flip" style="font-size:90px;text-align:center;color:var(--lav)">? ? ?</h2>`}</div>${revealed ? `<div class="bcard"><div class="k">Who absorbed it · base €${fmt(cur.base)}M</div>${rows}</div>` : ''}`; }
      else { const rank = pls.map(p => ({ p, sc: A.score(Object.assign({ own: {} }, p, { own: p.own || {}, budget: p.budget || 0 })) })).sort((x, y) => y.sc - x.sc); const aw = ST().awards || {};
        side = `<div class="bcard"><div class="k">Round ${r} scoreboard</div>${rank.map((x, i) => { const lr = Object.values(x.p.byRound || {}).slice(-1)[0] || { loss: 0 }; return `<div class="brow"><b style="width:36px;color:var(--gold)">${i + 1}</b><span class="nm" style="color:${pcol(x.p.id)}">${esc(x.p.name)}</span><span style="color:var(--coral)">−€${fmt(lr.loss)}M</span><span style="color:var(--gold)">+${fmt(x.p.credit)}</span><b style="width:90px;text-align:right">${Math.round(x.sc)}</b></div>`; }).join('')}</div><div class="bcard" style="border-color:var(--gold)"><div class="k">Awards announced</div>${pls.map(p => Object.values(aw[p.id] || {}).map(x => `<div style="font-size:23px;font-weight:700;padding:3px 0"><span style="color:${pcol(p.id)}">${esc(p.name)}</span> · ${esc(x.txt)} <b style="color:var(--gold)">+${x.pts}</b></div>`).join('')).join('') || '<div style="font-size:23px;color:var(--lav)">No awards this round.</div>'}</div>`; } }
    const hitD = cur && (s === 'strike' ? revealed : s === 'settle') ? cur.id : null;
    const ban = { wait: ['Round ' + r + ' · ' + A.ROUNDS[r].name, '#4a5fd6'], build: ['🛠 BUILD · buy and strengthen', '#2a56a0'], strike: ['🎲 ATTACK · random, and unannounced', '#c0243c'], settle: ['Round ' + r + ' results', '#2a7a5a'] }[s];
    const phs = ['wait', 'build', 'strike', 'settle'].map((x, i) => `<span class="bph ${x === s ? 'on' : ''} ${x === 'strike' ? 'atk' : ''}">${['Brief', 'Build', 'Attack', 'Results'][i]}</span>`).join('');
    return `<div class="stageW"><div class="stage" id="stage">${top('Round ' + r + ' of 4 · ' + A.ROUNDS[r].name, esc(A.ROUNDS[r].theme))}<div class="bmap">${boardMap({ atk: hitD, revealed: !!hitD })}</div><div class="bside">${side}</div><div class="bban" style="background:${ban[1]}">${ban[0]}${st.deadline && s === 'build' ? ' · ' + fmtT(st.deadline - now) : ''}</div><div class="bbot">${phs}<div style="margin-left:auto;color:var(--lav);font-size:20px;font-weight:600">Fill = share of players who own it · ★ new this round · dashed = opens later</div></div></div></div>`; }
  function boardFinal(top) { const f = ST().final || {}, order = Object.values(f.order || {}), g = G(), aw = f.awards || {};
    const gapAgg = {}; order.forEach(id => { if (g.players[id]) A.report(g, id).gaps.forEach(x => gapAgg[x.id] = (gapAgg[x.id] || 0) + x.v); }); const gaps = Object.keys(gapAgg).sort((a, b) => gapAgg[b] - gapAgg[a]).slice(0, 5);
    const dmgTotal = order.reduce((s, id) => s + ((g.players[id] || {}).dmg || 0), 0);
    return `<div class="stageW"><div class="stage" id="stage">${top('Final standings', 'Build once, keep it, survive four rounds')}<div style="position:absolute;left:60px;top:120px;width:900px">${order.map((id, i) => `<div class="blead"><div class="rk">${i + 1}</div><div style="flex:1;color:${pcol(id)}">${esc(pname(id))}<br><small style="color:var(--lav);font-size:22px">−€${fmt((g.players[id] || {}).dmg)}M damage · +${fmt((g.players[id] || {}).credit)} credit · ${Object.keys((g.players[id] || {}).own || {}).length} controls</small></div><div class="big" style="font-size:60px">${Math.round((f.score || {})[id] || 0)}</div></div>`).join('')}</div>
    <div style="position:absolute;right:60px;top:120px;width:760px;display:flex;flex-direction:column;gap:16px"><div class="bcard" style="border-color:var(--gold)"><div class="k">Final awards</div>${order.map(id => Object.values(aw[id] || {}).map(x => `<div style="font-size:26px;font-weight:700;padding:4px 0">🏆 <span style="color:${pcol(id)}">${esc(pname(id))}</span> · ${esc(x.txt)}</div>`).join('')).join('')}</div>
    <div class="bcard"><div class="k">The room's biggest shared gaps</div>${gaps.map(id => `<div style="font-size:25px;font-weight:700;padding:3px 0">${esc(A.C[id].n)} <span style="color:var(--lav);font-size:20px">· ${esc(A.C[id].d)}</span></div>`).join('') || '<div style="font-size:24px">No shared gaps.</div>'}<div style="font-size:21px;color:var(--lav);margin-top:8px">Total damage across the room: €${fmt(dmgTotal)}M</div></div></div></div></div>`; }

  /* ======================= HOST ======================= */
  async function hostAdvance() {
    const snap = await DB.get(BASE); D = snap || {}; const st = ST(), upd = {}, now = DB.now(), setS = o => Object.keys(o).forEach(k => upd['state/' + k] = o[k]);
    const clearReady = () => plist().forEach(p => upd['players/' + p.id + '/ready'] = null);
    if (st.phase === 'lobby') { if (!plist().length) { toast('No players yet'); return; } const sec = document.getElementById('hsec').value, ucs = {};
      for (let i = 1; i <= 4; i++) { const k = document.getElementById('huc' + i).value, c = document.getElementById('hct' + i).value.trim(); ucs[i] = { k, t: c || A.USE[k].t[sec] }; }
      setS({ phase: 'play', round: 1, step: 'wait', sector: sec, client: document.getElementById('hclient').value.trim(), ucs, regRound: 2 + Math.floor(Math.random() * 3), used: [], history: null, attack: null, fx: null, bl: null, awards: null, final: null, prevLoss: null, at: now, deadline: null });
      plist().forEach(p => { upd['players/' + p.id + '/budget'] = A.START; upd['players/' + p.id + '/own'] = null; upd['players/' + p.id + '/bought'] = null; upd['players/' + p.id + '/paid'] = null; upd['players/' + p.id + '/dmg'] = 0; upd['players/' + p.id + '/saved'] = 0; upd['players/' + p.id + '/credit'] = 0; upd['players/' + p.id + '/spent'] = 0; upd['players/' + p.id + '/byRound'] = null; upd['players/' + p.id + '/awd'] = null; }); clearReady(); return WR(upd); }
    if (st.phase === 'final') return;
    const r = rd(), s = sp(), g = G(); let ns = null, nr = r;
    const wr = () => Object.keys(g.players).forEach(id => { const p = g.players[id]; upd['players/' + id + '/budget'] = p.budget; upd['players/' + id + '/own'] = p.own; upd['players/' + id + '/bought'] = p.bought; upd['players/' + id + '/paid'] = null; upd['players/' + id + '/dmg'] = p.dmg; upd['players/' + id + '/saved'] = p.saved; upd['players/' + id + '/credit'] = p.credit; upd['players/' + id + '/byRound'] = p.byRound; upd['players/' + id + '/awd'] = p.awd; });
    if (s === 'wait') { const rand = Math.random; g.fx = {}; const bon = A.drawBonus(g, rand, r), lines = A.applyBonus(g, bon, rand); wr(); setS({ fx: g.fx, bl: lines }); ns = 'build'; }
    else if (s === 'build') { const seed = Math.floor(Math.random() * 1e9), rand = A.rng(seed), used = Object.values(st.used || {}), uc = ucOf(r), ids = A.draw(g, r, used, st.regRound, rand), list = [], h = hist().slice(), prev = Object.assign({}, st.prevLoss);
      ids.forEach(id => { const x = A.strike(g, id, { x: uc.x }); list.push(x); h.push({ id, base: x.base, round: r }); });
      const rl = {}; Object.keys(g.players).forEach(id => { const p = g.players[id]; let l = 0, sv = 0; list.forEach(x => { l += x.res[id].loss; sv += x.base - x.res[id].loss; }); p.dmg = A.rnd(p.dmg + l); p.saved = A.rnd(p.saved + sv); p.byRound = p.byRound.concat([{ loss: A.rnd(l), pct: list.reduce((q, x) => q + x.res[id].pct, 0) / list.length }]); rl[id] = l; });
      const aw = A.awardsRound(g, { strikes: list, prevLoss: Object.keys(prev).length ? prev : null }); wr();
      setS({ attack: { at: now + 1500, r, seed, list }, used: used.concat(ids), history: h, prevLoss: rl, awards: aw }); ns = 'strike'; }
    else if (s === 'strike') ns = 'settle';
    else if (s === 'settle') { if (r === 4) { const fa = A.finalAwards(g); wr(); const order = Object.keys(g.players).sort((a, b) => A.score(g.players[b]) - A.score(g.players[a])), score = {}; order.forEach(id => score[id] = A.score(g.players[id]));
        setS({ phase: 'final', final: { order, score, awards: fa }, deadline: null }); return WR(upd); }
      nr = r + 1; ns = 'wait'; plist().forEach(p => upd['players/' + p.id + '/budget'] = A.rnd((p.budget || 0) + (A.TOPUP[nr] || 0))); setS({ fx: null, bl: null, attack: null, awards: null }); }
    setS({ round: nr, step: ns, at: now, deadline: ns === 'build' ? now + DUR[r] * 1000 : null }); clearReady(); return WR(upd); }
  function hostView() { const st = ST(), pls = plist(), url = location.href.split('?')[0], rm = ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '', r = rd(), sec = st.sector || 'banking';
    const nextLbl = st.phase === 'lobby' ? 'Start game' : st.phase === 'final' ? 'Game over' : { wait: 'Activate round ' + r + ' · reveal surprises', build: 'Close build → ATTACK', strike: 'Show results', settle: r === 4 ? 'Final report' : 'Next round' }[sp()];
    const ucSel = (i, cur) => `<select id="huc${i}" data-r="${i}">${Object.keys(A.USE).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(A.USE[k].n)}</option>`).join('')}</select><input id="hct${i}" data-r="${i}" placeholder="Custom title (optional)" value="${esc(((st.ucs || {})[i] || {}).k && ((st.ucs || {})[i] || {}).t !== A.USE[((st.ucs || {})[i] || {}).k].t[sec] ? (st.ucs[i].t || '') : '')}" style="min-width:260px">`;
    const body = st.phase === 'lobby' ? `<div class="hbox"><h3>SECTOR AND USE CASES (one per round)</h3><select id="hsec">${Object.keys(A.SECTORS).map(k => `<option value="${k}">${A.SECTORS[k]}</option>`).join('')}</select><input id="hclient" placeholder="Client name (shown on the board)" maxlength="40"><br>${[1, 2, 3, 4].map(i => `<div style="margin-top:8px"><b style="color:var(--gold)">Round ${i}</b> ${ucSel(i, A.DEFAULT_UC[i - 1])}</div>`).join('')}</div>`
      : st.phase === 'play' && sp() === 'wait' ? `<div class="hbox"><h3>ROUND ${r} USE CASE · change before you activate</h3>${ucSel(r, ((st.ucs || {})[r] || {}).k)}<div class="mut" style="margin-top:8px">Players see it the moment you activate. ${r > 1 ? '' : ''}Regulator attack lands in round ${st.regRound} (host only).</div></div>` : '';
    return `<div class="host"><h1>ALPHA · host</h1>${body}
      <div class="hbox"><div class="hrow"><button class="btn" id="hnext" ${st.phase === 'final' ? 'disabled' : ''}>${nextLbl}</button><button class="btn ghost" id="hreset" style="font-size:15px">Reset room</button>${st.phase === 'play' && sp() === 'build' ? '<button class="btn ghost" id="hplus" style="font-size:15px">+30 s</button>' : ''}</div>
      <div class="mut" style="margin-top:8px">${st.phase === 'play' ? 'Round ' + r + ' of 4 · ' + A.ROUNDS[r].name + ' · step: ' + sp() + (ucOf(r) ? ' · ' + esc(ucOf(r).t) : '') : ''}</div></div>
      <div class="hbox"><h3>PLAYERS (${pls.length})</h3><table class="t"><tr><th>Name</th><th>Budget</th><th>Controls</th><th>Damage</th><th>Credit</th><th>Score</th><th>Done</th></tr>${pls.map(p => `<tr><td style="color:${pcol(p.id)};font-weight:800">${esc(p.name)}</td><td>€${fmt(p.budget)}M</td><td>${Object.keys(p.own || {}).length}</td><td>−€${fmt(p.dmg)}M</td><td>+${fmt(p.credit)}</td><td>${Math.round(A.score(Object.assign({ own: {} }, p, { budget: p.budget || 0 })))}</td><td>${p.ready === r && sp() === 'build' ? '✓' : ''}</td></tr>`).join('')}</table></div>
      <div class="hbox"><h3>LINKS</h3><div style="line-height:1.9">Players (QR): <a href="${url}${rm}" target="_blank" style="color:var(--gold)">${esc(url + rm)}</a><br>Projector: <a href="${url}?board${rm ? '&' + rm.slice(1) : ''}" target="_blank" style="color:var(--gold)">${esc(url + '?board' + (rm ? '&' + rm.slice(1) : ''))}</a></div></div></div>`; }
  function hostClick(e) { const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'hnext') return hostAdvance();
    if (b.id === 'hplus') return DB.set(BASE + '/state/deadline', Math.max(DB.now(), ST().deadline || DB.now()) + 30000);
    if (b.id === 'hreset') { if (confirm('Clear the whole room (players, controls, scores)?')) DB.set(BASE, null); } }
  function hostChange(e) { const t = e.target; if (t.dataset && t.dataset.r && ST().phase === 'play' && sp() === 'wait') { const i = t.dataset.r, k = document.getElementById('huc' + i).value, c = document.getElementById('hct' + i).value.trim(); DB.set(BASE + '/state/ucs/' + i, { k, t: c || A.USE[k].t[sector()] }); } }

  /* ======================= render loop ======================= */
  let lastSig = '';
  function render(force) {
    const act = document.activeElement; if (VIEW === 'player' && act && act.id === 'nm' && !force) return; if (VIEW === 'host' && act && /^(hct|hclient)/.test(act.id || '') && !force) return;
    const html = VIEW === 'board' ? boardView() : VIEW === 'host' ? hostView() : playerView();
    if (!force && html === lastSig) return; lastSig = html;
    const keep = VIEW === 'player' && act && act.id === 'nm' ? act.value : null, sy = window.scrollY;
    $app.innerHTML = html + (DB.mode === 'demo' && VIEW !== 'board' ? '<div class="demo">DEMO MODE · this browser only</div>' : '');
    if (VIEW === 'board') fitStage(); else window.scrollTo(0, sy);
    const inp = document.getElementById('nm'); if (inp) { inp.addEventListener('input', () => ui.typed = inp.value); if (keep != null) inp.value = keep; } }
  document.addEventListener('click', e => VIEW === 'host' ? hostClick(e) : VIEW === 'player' ? playerClick(e) : 0);
  document.addEventListener('change', e => VIEW === 'host' && hostChange(e));
  window.addEventListener('resize', fitStage);
  DB.on(BASE, v => { D = v || {}; render(); });
  setInterval(() => { const t = document.getElementById('tm'); if (t && ST().deadline) t.textContent = fmtT(ST().deadline - DB.now()); if (VIEW === 'board' && ST().phase !== 'lobby') render(); }, 400);
  window.__alpha = { get D() { return D; }, pid: () => pid };
})();
