/* ECHO · cooperative team game. One page, three views: player (default), ?board (projector), ?host=KEY.
   Everything is public: proposals, votes, trims, RAI ticks and crosses, money, time and threat intel are visible to the whole room.
   Look: the room builds one tower together. Each round is a floor, each department has bays on it. */
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
  const apprAll = () => { const o = {}; for (let r = 1; r <= 4; r++) o[r] = Object.assign({}, (D.appr || {})['r' + r] || {}); return o; };
  const delays = () => { const o = {}; for (let r = 1; r <= 4; r++) o[r] = (D.delay || {})['r' + r] || 0; return o; };
  const built = () => E.builtSet(apprAll());
  const budget = () => ST().budget != null ? ST().budget : E.USE[UC()].b, deadline = () => ST().deadline != null ? ST().deadline : E.USE[UC()].t;
  const mon = x => (x < 0 ? '−' : '') + '€' + (Math.round(Math.abs(x || 0) * 10) / 10).toString() + 'M', fm = x => (Math.round((x || 0) * 10) / 10).toString(), C = id => E.BYID[id];
  const dcol = d => E.DCOL[d] || '#fff';
  const tally = () => E.tally(nd('votes'), PL());
  const lead = d => E.rank(tally()[d], K());
  const propD = d => Object.keys(nd('prop')[d] || {});
  const allProp = () => [].concat.apply([], E.DORDER.map(d => propD(d)));
  const shownIds = d => stp() === 'propose' ? lead(d) : propD(d);
  const veto = () => E.vetoes(rd(), nd('prop'), nd('flags'), nd('sflags'));
  const dropped = id => !!nd('drop')[id];
  const trimIds = () => E.trimmed(allProp(), nd('trim'), PL());
  const me = () => PL()[pid] && PL()[pid].name ? PL()[pid] : null;
  const dept = () => (me() || {}).dept;
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const PAL = ['#3dd6a3', '#b4a8ff', '#f2c14e', '#5bc0eb', '#ff8d9b', '#f39c3d'];
  const pcol = id => PAL[[].reduce.call(String(id), (s, c) => s + c.charCodeAt(0), 0) % PAL.length];
  const ini = id => esc(((PL()[id] || {}).name || '?').trim().charAt(0).toUpperCase());
  const voters = (src, id) => Object.keys(src || {}).filter(p => (src[p] || {})[id] && (PL()[p] || {}).dept === C(id).d);
  const dots = ids => ids.map(p => `<i style="background:${pcol(p)}" title="${esc((PL()[p] || {}).name)}">${ini(p)}</i>`).join('');

  /* ---------- the shared rules: what is removed, what the room would cost ---------- */
  const removedIds = () => { const v = veto(), gone = {}; E.vetoedIds(v, nd('prop')).forEach(i => gone[i] = 'veto'); allProp().forEach(id => { if (gone[id]) return; if (dropped(id)) gone[id] = 'drop'; }); trimIds().forEach(id => { if (!gone[id]) gone[id] = 'trim'; }); return gone; };
  const status = id => { if (stp() === 'propose') return ''; if (stp() === 'built') return (D.appr || {})['r' + rd()] && (D.appr['r' + rd()][id]) ? '' : (removedIds()[id] || 'gone'); return removedIds()[id] || ''; };
  function proj() { const a = apprAll(), d = delays(); if (stp() !== 'built') { const gone = removedIds(); a[rd()] = {}; (stp() === 'propose' ? [].concat.apply([], E.DORDER.map(x => lead(x))) : allProp()).forEach(id => { if (!gone[id]) a[rd()][id] = 1; }); if (rd() === 4 && stp() !== 'propose') d[4] = veto().count; } return E.totals(a, d); }
  const over = () => { const p = proj(); return { m: E.rnd(Math.max(0, p.spent - budget())), t: Math.max(0, p.time - deadline()), spent: p.spent, time: p.time }; };
  const overTxt = o => [o.m > 0 ? '€' + fm(o.m) + 'M' : '', o.t > 0 ? o.t + ' wk' : ''].filter(Boolean).join(' and ');
  const stepName = { propose: 'Propose', review: 'RAI review', ceo: 'Trim and decide', built: 'Built' };
  const noteBox = () => { const n = ST().note; return n && n.txt ? `<div class="note">${esc(n.txt)}</div>` : ''; };
  const cost = c => `<span class="mo">${c.saveM ? 'saves €' + fm(c.saveM) + 'M' : '€' + fm(c.m) + 'M'}</span> <span class="ti">${c.saveT ? (c.t ? c.t + ' wk, ' : '') + 'saves ' + c.saveT + ' wk' : c.t + ' wk'}</span>`;
  const intelIds = () => E.intelAt(UC(), rd()).map(a => a.id);
  function stops(id) { const known = intelIds(); return E.USE[UC()].a.filter(a => known.indexOf(a) >= 0 && E.ATK[a].k.indexOf(id) >= 0 && !C(id).sc).map(a => E.ATK[a].n); }
  function overlapTxt(id) { const d = C(id).d, out = []; E.DORDER.forEach(o => { if (o === d) return; shownIds(o).forEach(x => { if (E.overlaps(UC(), id, x)) out.push(E.DEPTS[o] + ' also has ' + C(x).n); }); }); return out; }
  function flagLine(id) { const f = E.cardFlags(nd('flags'), id); if (!f.ok && !f.x) return ''; const why = Object.keys(f.why).map(r => E.REASON[r] + (f.why[r] > 1 ? ' ×' + f.why[r] : '')).join(', ');
    return `<div class="fl">${f.ok ? `<b class="okc">✓ ${f.ok}</b>` : ''}${f.x ? `<b class="xc">✗ ${f.x}</b>` : ''}${why ? `<span class="why">${esc(why)}</span>` : ''}</div>`; }
  function setLine(d) { const f = E.setFlags(nd('sflags'), d); if (!f.ok && !f.x) return ''; const why = Object.keys(f.why).map(r => E.REASON[r]).join(', ');
    return `<div class="fl"><span class="why">Whole set:</span>${f.ok ? `<b class="okc">✓ ${f.ok}</b>` : ''}${f.x ? `<b class="xc">✗ ${f.x}</b>` : ''}${why ? `<span class="why">${esc(why)}</span>` : ''}</div>`; }
  const need = d => Math.floor(E.deptSize(PL(), d) / 2) + 1;
  const whyGone = (id, s) => s === 'veto' ? 'Vetoed by RAI' : s === 'drop' ? 'Removed by the CEO' : s === 'trim' ? 'Trimmed by ' + E.DEPTS[C(id).d] : '';

  /* ---------- tower: each round is a floor, each department has K bays per floor ---------- */
  function bayStates(r, d) { let ids; if (r > rd()) ids = []; else if (r === rd() && stp() === 'propose') ids = lead(d); else ids = Object.keys(((D.prop || {})['r' + r] || {})[d] || {});
    const ap = (D.appr || {})['r' + r] || {}, gone = r === rd() ? removedIds() : {};
    return ids.slice(0, K()).map(id => ap[id] ? 2 : (r < rd() || (r === rd() && stp() === 'built')) ? 3 : gone[id] ? 3 : 1); }
  function tower() { const W = 600, H = 900, k = K(), fw = W * .72, x0 = (W - fw) / 2 + 16, fh = (H - 150) / 4, bw = fw / (5 * k) - 4, bh = fh * .5; let s = '';
    s += `<defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a78"/><stop offset="1" stop-color="#101a3f"/></linearGradient><filter id="bl"><feGaussianBlur stdDeviation="6"/></filter></defs>`;
    s += `<rect x="${x0 - 14}" y="70" width="${fw + 28}" height="${H - 100}" rx="18" fill="url(#gl)" stroke="#ffffff22"/><path d="M${x0 - 14} 70 L${x0 + fw / 2} 24 L${x0 + fw + 14} 70Z" fill="#1c2a5e" stroke="#ffffff22"/><line x1="${x0 + fw / 2}" y1="24" x2="${x0 + fw / 2}" y2="-18" stroke="#8ea0d8" stroke-width="3"/><path d="M${x0 + fw / 2} -18 l46 14 l-46 14z" fill="${stp() === 'built' && rd() === 4 ? '#3dd6a3' : '#f2c14e'}"/>`;
    for (let f = 0; f < 4; f++) { const r = f + 1, y = H - 30 - fh * r + 6;
      s += `<text x="${x0 - 28}" y="${y + fh / 2 + 6}" fill="${r === rd() ? '#f2c14e' : '#8ea0d8'}" font-size="20" font-weight="800" text-anchor="end" font-family="Manrope">R${r}</text>`;
      if (f < 3) s += `<line x1="${x0 - 14}" y1="${y + fh - 4}" x2="${x0 + fw + 14}" y2="${y + fh - 4}" stroke="#ffffff18"/>`;
      E.DORDER.forEach((d, di) => { const st = bayStates(r, d), c = dcol(d);
        for (let j = 0; j < k; j++) { const v = st[j] || 0, x = x0 + (di * k + j) * (fw / (5 * k)) + 2, by = y + (fh - bh) / 2; let g = '';
          if (v === 0) g = `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="none" stroke="${c}" stroke-opacity=".25" stroke-dasharray="4 5"/>`;
          else if (v === 1) g = `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="${c}" fill-opacity=".42" stroke="${c}" stroke-width="2" stroke-dasharray="5 4"/>`;
          else if (v === 2 || v === 4) g = `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="${c}" filter="url(#bl)" opacity=".5"/><rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="${c}"/>` + (v === 4 ? `<path d="M${x + bw * .3} ${by} l${bw * .15} ${bh * .4} l-${bw * .12} ${bh * .25} l${bw * .2} ${bh * .35}" stroke="#0b1026" stroke-width="3" fill="none"/>` : '');
          else g = `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="#ff5d73" fill-opacity=".16" stroke="#ff5d73"/><path d="M${x + 8} ${by + 8} L${x + bw - 8} ${by + bh - 8} M${x + bw - 8} ${by + 8} L${x + 8} ${by + bh - 8}" stroke="#ff5d73" stroke-width="4" stroke-linecap="round"/>`;
          s += g; } }); }
    return `<svg viewBox="-10 -30 620 960" xmlns="http://www.w3.org/2000/svg">${s}</svg>`; }
  function ring(v, max, col, label, txt) { const r = 84, c = 2 * Math.PI * r, pc = Math.max(0, Math.min(1, v / max)), ov = v > max + 1e-9, cc = ov ? '#ff5d73' : col;
    return `<div class="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${r}" fill="none" stroke="#ffffff1a" stroke-width="14"/><circle cx="100" cy="100" r="${r}" fill="none" stroke="${cc}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${c * pc} ${c}" transform="rotate(-90 100 100)"/></svg><b style="color:${cc}">${txt}<small>${label}</small></b></div>`; }

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
  function vote(id) { if (!canVote() || !dept() || dept() === 'RAI') return; const on = !((nd('votes')[pid] || {})[id]); DB.set(`${BASE}/votes/r${rd()}/${pid}/${id}`, on ? true : null); SFX.deal && SFX.deal(); }
  function trimVote(id) { if (stp() !== 'ceo' || !dept() || dept() === 'RAI' || C(id).d !== dept()) return; const on = !((nd('trim')[pid] || {})[id]); DB.set(`${BASE}/trim/r${rd()}/${pid}/${id}`, on ? true : null); SFX.chip && SFX.chip(); }
  function flag(id, v) { if (dept() !== 'RAI' || stp() !== 'review') return; DB.set(`${BASE}/flags/r${rd()}/${pid}/${id}`, v); SFX.chip && SFX.chip(); }
  function sflag(d, v) { if (dept() !== 'RAI' || stp() !== 'review') return; DB.set(`${BASE}/sflags/r${rd()}/${pid}/${d}`, v); SFX.chip && SFX.chip(); }

  function lede() { const o = over(), t = overTxt(o), s = stp();
    if (s === 'propose') return `<div class="lede" style="--c:${dcol(dept())}">Back the cards your team wants. <b>The top ${K()}</b> go to RAI review. ${rd() > 1 ? 'Check the other teams so you do not duplicate.' : 'Everyone can see the choices.'}${t ? ` <span class="rd">The room is over by ${t}.</span>` : ''}</div>`;
    if (s === 'ceo') return t ? `<div class="lede red">Room is over by <span class="rd">${t}</span>. Every team is asked to trim a card. Tap <b>Trim</b>; when most of your team agrees, it goes. Optional. The CEO can also remove cards.</div>` : `<div class="lede" style="--c:${dcol(dept())}">The room is within budget and time. The CEO is deciding. You may still trim a card you would drop.</div>`;
    return ''; }
  function row(id, o) { o = o || {}; const c = C(id), s = o.state != null ? o.state : status(id), ov = o.noOv ? [] : overlapTxt(id), st = o.noStops ? [] : stops(id), sel = o.sel && !s;
    const tags = (o.fw ? '<em class="f">Forward</em>' : '') + (s ? `<em class="w">${s === 'trim' ? 'Trimmed' : s === 'veto' ? 'Vetoed' : 'Removed'}</em>` : '');
    return `<div class="hr ${sel ? 'sel' : ''} ${s ? 'gone' : ''}" style="--c:${dcol(c.d)}" ${o.act ? `data-a="${o.act}" data-id="${id}" role="button"` : ''}>
      <div class="tg">${s ? '✕' : sel ? '✓' : o.tog ? '' : ''}</div>
      <div><div class="hn"><span>${esc(c.n)}</span>${tags}</div><div class="hs">${esc(c.w)}${st.length ? ' · Stops <b>' + esc(st.join(', ')) + '</b>' : ''}${ov.length ? `<br><span class="ov">${esc(ov.join(' · '))}</span>` : ''}${s ? `<br><span class="rs">${whyGone(id, s)}</span>` : ''}${o.hs || ''}</div>${o.noFlags ? '' : flagLine(id)}</div>
      <div class="hc"><div>${cost(c)}</div>${o.right || ''}</div></div>`; }
  function handPropose() { const d = dept(), voted = nd('votes')[pid] || {}, bt = built(), cards = E.hand(d, bt), fw = lead(d), vs = nd('votes');
    const mine = cards.filter(c => voted[c.id]), mm = mine.reduce((s, c) => s + c.m - (c.saveM || 0), 0), tt = mine.reduce((s, c) => Math.max(s, c.t), 0);
    return lede() + `<div class="hand">${cards.map(c => { const ids = voters(vs, c.id); return row(c.id, { state: '', sel: !!voted[c.id], fw: fw.indexOf(c.id) >= 0, act: 'vote', noFlags: true, right: `<div class="vt">${dots(ids)}${ids.length ? `<span>${ids.length}</span>` : ''}</div>` }); }).join('')}</div>
      <div class="dock"><div style="--c:${dcol(d)}"><div class="tot">You back ${mine.length}<b>${mon(mm)} · ${tt} wk</b></div><div class="tot" style="flex:1;text-align:right">Top ${K()} of your team go forward.<br>Votes are public.</div></div></div>`; }
  function forwardList(d, canTrim) { const ids = propD(d); if (!ids.length) return '<div class="mut" style="margin-top:12px">Nothing proposed.</div>'; const tr = nd('trim'), n = need(d), size = E.deptSize(PL(), d);
    return `<div class="hand">${ids.map(id => { const s = status(id), vs = voters(tr, id), mineOn = !!(tr[pid] || {})[id];
      const right = `<div class="vt">${dots(vs)}</div>` + (canTrim && !s ? `<button class="trimb ${mineOn ? 'on' : ''}" data-a="trim" data-id="${id}">${mineOn ? 'Trim ✓' : 'Trim'}</button>` : '');
      return row(id, { sel: true, noOv: true, right, hs: !s && stp() === 'ceo' && size ? `<br>Trim votes ${vs.length} of ${n} needed` : '' }); }).join('')}</div>${setLine(d)}`; }
  function handTab() { const d = dept(), s = stp();
    if (s === 'propose') return handPropose();
    if (s === 'built') return builtTab();
    return lede() + `<div class="kick" style="margin-top:16px">Your team put forward</div>` + forwardList(d, s === 'ceo') + (s === 'review' ? `<div class="mut" style="margin-top:12px">RAI is reviewing. ${rd() < 4 ? 'Ticks and crosses are advice only this round.' : 'Final round: a cross removes a card, or a whole set.'}</div>` : ''); }
  function ledger(d, mine) { const ids = shownIds(d), b = Object.keys((D.appr || {})['r' + rd()] || {}).filter(id => C(id).d === d);
    return `<div class="dg" style="--c:${dcol(d)}"><h3>${E.DEPTS[d]}${mine ? ' · your team' : ''}</h3>${d === 'RAI' ? raiSummary() : ids.length ? ids.map(id => { const s = status(id), v = stp() === 'propose' ? (tally()[d] || {})[id] || 0 : 0;
        return `<div class="li ${s ? 'gone' : ''}"><span class="nn">${esc(C(id).n)}</span><span>${cost(C(id))}${v ? ` <span class="mut">· ${v} vote${v === 1 ? '' : 's'}</span>` : ''}</span>${s ? `<div class="hs rs">${whyGone(id, s)}</div>` : ''}${flagLine(id) ? `<div class="hs">${flagLine(id)}</div>` : ''}</div>`; }).join('') + setLine(d) : `<div class="mut" style="margin-top:6px">${stp() === 'propose' ? 'No votes yet.' : 'Nothing proposed.'}</div>`}${stp() === 'built' && b.length ? `<div class="mut">Built: ${b.map(id => esc(C(id).n)).join(', ')}</div>` : ''}</div>`; }
  function raiSummary() { const rs = plist().filter(p => p.dept === 'RAI'); return `<div class="mut" style="margin-top:6px">${rs.length} member${rs.length === 1 ? '' : 's'}: ${rs.map(p => esc(p.name)).join(', ') || 'none'}. Ticks and crosses show on every card. ${rd() < 4 ? 'Advice only this round.' : 'Final round: a cross can remove a card or a whole set.'}</div>`; }
  function legend() { return `<div class="legend"><span>▮ built</span><span style="opacity:.8">▯ proposed</span><span class="x">✕ removed</span><span style="color:var(--amber)">⚡ ${E.intelAt(UC(), rd()).length} threats named</span></div>`; }
  function bars() { const o = over(); return `<div class="bars"><div class="rw"><span>Money <b class="${o.m ? 'x' : 'ok'}">${mon(o.spent)}</b> of €${fm(budget())}M</span><span class="${o.m ? 'x' : 'ok'}">${o.m ? 'over' : 'on budget'}</span></div><div class="tr"><span style="width:${Math.min(100, o.spent / budget() * 100)}%;background:${o.m ? '#ff5d73' : '#3dd6a3'}"></span></div><div class="rw"><span>Time <b class="${o.t ? 'x' : ''}" style="${o.t ? '' : 'color:var(--gold)'}">${o.time} wk</b> of ${deadline()} wk</span><span class="${o.t ? 'x' : 'ok'}">${o.t ? 'late' : 'on time'}</span></div><div class="tr"><span style="width:${Math.min(100, o.time / deadline() * 100)}%;background:${o.t ? '#ff5d73' : '#f2c14e'}"></span></div></div>`; }
  function roomTab() { return `<div class="lede">The whole room, in public. Win or lose together.</div><div class="towerw">${tower()}</div>${legend()}${bars()}` + E.DORDER.map(d => ledger(d, d === dept())).join('') + ledger('RAI', false); }
  function threatTab() { const a = E.intelAt(UC(), rd()), n = E.USE[UC()].a.length;
    return `<div class="lede">${a.length} of ${n} hidden attacks are named so far. More each round. The room only wins if every critical one is stopped.</div>` + a.map(x => `<div class="stormrow ${x.v}"><small class="sev ${x.v}">${x.v}</small>${esc(x.n)}</div>`).join(''); }
  function raiTab() {
    const ds = E.DORDER.filter(x => propD(x).length), my = (nd('flags')[pid] || {}), mys = (nd('sflags')[pid] || {});
    if (stp() !== 'review') return `<div class="lede">${rd() < 4 ? 'Advice only this round.' : 'Binding in this round.'} ${stp() === 'propose' ? 'Departments are choosing cards. Watch the Room tab. Review opens when the host sends the proposals to you.' : stp() === 'ceo' ? 'Your ticks and crosses are with the CEO. Teams may trim.' : 'Round done.'}</div>` + ds.map(x => ledger(x, false)).join('');
    return `<div class="lede ${rd() === 4 ? 'red' : ''}">${rd() < 4 ? '<b>Tick or cross, advice only.</b> Everyone sees your tick or cross and the reason. The CEO decides.' : '<b>Final round: crosses are binding.</b> A cross removes a card, or a whole department set. You cannot add cards.'}</div>` +
      ds.map(x => `<div class="rg" style="--c:${dcol(x)}"><h3>${E.DEPTS[x]}</h3>${propD(x).map(id => `<div class="rr"><div class="top"><span class="hn">${esc(C(id).n)}</span><span class="hc">${cost(C(id))}</span></div><div class="hs">${esc(C(id).w)}</div>${flagLine(id)}<div class="tc"><button class="tk ${my[id] === 'ok' ? 'on' : ''}" data-a="ok" data-id="${id}">✓ Tick</button><button class="xk ${(my[id] || '')[0] === 'x' ? 'on' : ''}" data-a="x" data-id="${id}">✗ Cross${(my[id] || '')[0] === 'x' ? ': ' + esc(E.REASON[my[id].slice(2)]) : ''}</button></div></div>`).join('')}
        ${rd() === 4 ? `<div class="tc" style="margin:10px 0 0 21px"><button class="tk set ${mys[x] === 'ok' ? 'on' : ''}" data-a="sok" data-id="${x}">✓ Whole set</button><button class="xk set ${(mys[x] || '')[0] === 'x' ? 'on' : ''}" data-a="sx" data-id="${x}">✗ Remove whole set${(mys[x] || '')[0] === 'x' ? ': ' + esc(E.REASON[mys[x].slice(2)]) : ''}</button></div>${setLine(x)}` : ''}</div>`).join('') + sheet(); }
  function sheet() { if (!ui.cross) return ''; const kind = ui.cross.k[0], k = ui.cross.k.slice(1), nm = kind === 'c' ? C(k).n : 'the whole ' + E.DEPTS[k] + ' set';
    return `<div class="veil" data-a="cancel"></div><div class="sheet"><h4>Why cross ${esc(nm)}? Pick one reason</h4><div class="pills">${E.REASONS.map(r => `<button data-a="${kind === 'c' ? 'cr' : 'sr'}" data-id="${k}" data-r="${r[0]}">${r[1]}</button>`).join('')}</div><button class="cancel" data-a="cancel">Cancel</button></div>`; }
  function builtTab() { const ids = Object.keys((D.appr || {})['r' + rd()] || {}), v = veto(), dl = (D.delay || {})['r' + rd()] || 0, gone = allProp().filter(id => ids.indexOf(id) < 0);
    return `<div class="lede">Round ${rd()} built. ${ids.length} card${ids.length === 1 ? '' : 's'} approved.${dl ? ` RAI vetoes cost ${dl} week${dl === 1 ? '' : 's'}.` : ''}</div><div class="hand">${ids.map(id => row(id, { sel: true, noOv: true, noStops: true, state: '' })).join('')}${gone.map(id => row(id, { state: removedIds()[id] || 'drop', noOv: true, noStops: true })).join('')}</div>` + (rd() === 4 && (v.cards.length || v.sets.length) ? `<div class="mut" style="margin-top:12px">Vetoed: ${v.sets.map(s => 'whole set ' + E.DEPTS[s]).concat(v.cards.map(id => C(id).n)).map(esc).join(' · ')}</div>` : ''); }

  function doneView() { const t = E.totals(apprAll(), delays()), r = E.finish(UC(), built(), t.spent, t.time, budget(), deadline()), rs = E.raiScore(Object.values(D.flags || {}).reduce((m, o) => { Object.keys(o).forEach(p => m[p] = Object.assign(m[p] || {}, o[p])); return m; }, {}));
    return `<div class="ph">${hdr()}<div class="grade g-${r.grade}"><small>The room's result</small><h1>${E.GR[r.grade]}</h1></div>
      <div class="meas"><span class="${r.safe ? 'okc' : 'xc'}">${r.safe ? '✓' : '✗'} Safe</span><span class="${r.bOk ? 'okc' : 'xc'}">${r.bOk ? '✓' : '✗'} On budget (€${fm(r.spent)}M of €${fm(r.budget)}M)</span><span class="${r.tOk ? 'okc' : 'xc'}">${r.tOk ? '✓' : '✗'} On time (${r.time} of ${r.deadline} wks)</span></div>
      <div class="kick" style="margin:14px 0 4px">What the attacks found</div>${r.items.map(i => `<div class="arow ${i.st === 'stopped' ? '' : 'bad'}"><span>${i.st === 'stopped' ? '🛡️' : '💥'}</span><span class="an">${esc(i.n)}</span><span class="sev ${i.v}">${i.v}</span><span class="aw">${i.st === 'stopped' ? 'Stopped by ' + esc(C(i.by).n) : i.st === 'shortcut' ? 'Opened by the shortcut: ' + esc(C(i.sc).n) : 'No control was built'}</span></div>`).join('')}
      <div class="lede" style="margin-top:16px"><b>RAI team judgment.</b> ${rs.n ? rs.good + ' of ' + rs.n + ' ticks and crosses were right (a cross on a shortcut, a tick on a real control).' : 'No ticks or crosses were recorded.'}</div></div>`; }
  function hdr() { const m = me(), d = dept(), o = over(), left = budget() - o.spent, play = ST().phase === 'play', c = d ? dcol(d) : '#f2c14e', r = rd();
    return `<div class="hd"><div class="r1"><span class="dtag" style="background:${c}">${d ? E.DEPTS[d] : 'ECHO'}</span><span class="nm">${esc(m ? m.name : '')}</span>${play || ST().phase === 'done' ? `<span class="mini"><b class="${left < 0 ? 'bad' : ''}">${left < 0 ? '−' : ''}€${fm(Math.abs(left))}M</b><i class="${o.t ? 'bad' : ''}">${o.time}/${deadline()} wk</i></span>` : ''}</div>${play ? `<div class="floors" style="--c:${c}">${[1, 2, 3, 4].map(j => `<i class="${j < r || (j === r && stp() === 'built') ? 'd' : j === r ? 'n' : ''}"></i>`).join('')}</div><div class="sub"><span>Round ${r} · ${E.RN[r - 1]}</span><span class="${r === 4 && stp() === 'review' ? 'hot' : ''}">${stepName[stp()]}${r === 4 && stp() === 'review' ? ' · crosses bind' : ''}</span></div>` : ''}${noteBox()}</div>`; }
  function playerView() {
    const st = ST(), m = me();
    if (!m) return `<div class="ph"><div class="logo">ECHO</div><div class="tag">One project. One room.<br>Win or lose together.</div><input class="txt" id="nm" placeholder="Your name" maxlength="16" autocomplete="off" value="${esc(ui.typed)}"><button class="btn" data-a="join">Join the room</button></div>`;
    if (st.phase === 'done') return doneView();
    if (st.phase !== 'play' || !m.dept) return `<div class="ph">${hdr()}<div class="lede"><b>You are in.</b> ${plist().length} player${plist().length === 1 ? '' : 's'} so far. Your department appears here as soon as the host starts the game.</div></div>`;
    const raiP = dept() === 'RAI', tab = ui.tab || (raiP ? 'rai' : 'hand'), tabs = [[raiP ? 'rai' : 'hand', raiP ? 'Review' : 'My hand'], ['room', 'Room'], ['threat', 'Threats']];
    const body = tab === 'room' ? roomTab() : tab === 'threat' ? threatTab() : raiP ? (stp() === 'built' ? builtTab() : raiTab()) : handTab();
    return `<div class="ph">${hdr()}<div class="tabs" style="--c:${dcol(dept())}">${tabs.map(t => `<button class="${tab === t[0] ? 'on' : ''}" data-a="tab" data-id="${t[0]}">${t[1]}</button>`).join('')}</div>${body}</div>`;
  }
  function playerClick(e) { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, id = b.dataset.id; SFX.unlock && SFX.unlock();
    if (a === 'join') { const i = document.getElementById('nm'); join(i ? i.value : ui.typed); }
    else if (a === 'tab') { ui.tab = id; render(true); }
    else if (a === 'vote') vote(id);
    else if (a === 'trim') trimVote(id);
    else if (a === 'cancel') { ui.cross = null; render(true); }
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
    const o = over(), rows = E.DORDER.reduce((n, d) => n + shownIds(d).length, 0), rai = plist().filter(p => p.dept === 'RAI').map(p => esc(p.name)).join(', ');
    const step = stepName[stp()] + (rd() === 4 && stp() === 'review' ? '<span class="xc">Crosses are binding</span>' : rd() < 4 && stp() === 'review' ? '<span class="xc" style="color:var(--lav)">RAI advice only</span>' : stp() === 'ceo' && (o.m || o.t) ? `<span class="xc">Over by ${overTxt(o)}: teams may trim</span>` : '');
    return `<div class="stageW"><div class="stage" id="stage"><div class="bttl"><div class="kick">${esc(E.USE[UC()].n)}</div><h1>Round ${rd()} of 4</h1><div class="rn">${E.RN[rd() - 1]}</div><div class="step">${step}</div></div>
      ${noteBox()}<div class="bstorm"><h3>The storm is coming</h3>${E.intelAt(UC(), rd()).map(x => `<span class="${x.v}">${esc(x.n)}</span>`).join('')}</div>
      <div class="btower">${tower()}</div><div class="bgauges">${ring(o.spent, budget(), '#3dd6a3', 'Money', mon(o.spent))}${ring(o.time, deadline(), '#f2c14e', 'Time', o.time + ' wk')}</div>
      <div class="bled" style="${rows > 10 ? 'font-size:.82em' : ''}"><div class="kick">${rd() === 4 && stp() === 'review' ? 'RAI review · crosses are binding' : stp() === 'propose' ? 'Leading picks' : 'What the room proposes'}</div><h2 class="serif">${stp() === 'propose' ? 'What the teams are backing' : 'What the room proposes'}</h2>${rai ? `<div class="mut">RAI team: ${rai}</div>` : ''}${E.DORDER.map(d => ledger(d, false)).join('')}</div></div></div>`; }
  function boardDone() { const t = E.totals(apprAll(), delays()), r = E.finish(UC(), built(), t.spent, t.time, budget(), deadline());
    return `<div class="stageW"><div class="stage" id="stage"><div class="vd"><div class="gl g-${r.grade}"><small>The room's result</small><h1>${E.GR[r.grade]}</h1><div class="meas"><span class="${r.safe ? 'okc' : 'xc'}">${r.safe ? '✓' : '✗'} Safe</span><span class="${r.bOk ? 'okc' : 'xc'}">${r.bOk ? '✓' : '✗'} Budget €${fm(r.spent)}M of €${fm(r.budget)}M</span><span class="${r.tOk ? 'okc' : 'xc'}">${r.tOk ? '✓' : '✗'} Time ${r.time} of ${r.deadline} wks</span></div></div>
      <div class="atk">${r.items.map((i, k) => `<div class="ar ${i.st === 'stopped' ? '' : 'bad'}" style="animation-delay:${0.4 + k * 0.45}s"><span class="ic">${i.st === 'stopped' ? '🛡️' : '💥'}</span><span class="an">${esc(i.n)}</span><span class="sev ${i.v}">${i.v}</span><span class="aw">${i.st === 'stopped' ? esc(C(i.by).n) : i.st === 'shortcut' ? 'Shortcut: ' + esc(C(i.sc).n) : 'No control built'}</span></div>`).join('')}</div></div></div></div>`; }

  /* ======================= HOST ======================= */
  function setNote(txt) { return { 'state/note': txt ? { txt, at: DB.now() } : null }; }
  function hostView() {
    const st = ST(), url = location.origin + location.pathname.replace(/index\.html$/, ''), rm = ROOM !== (cfg.room || 'main') ? '?room=' + ROOM : '';
    const links = `<div class="hbox"><h3>Links</h3><div style="line-height:1.9">Players (QR): <a href="${url}${rm}" target="_blank">${esc(url + rm)}</a><br>Projector: <a href="${url}?board${rm ? '&' + rm.slice(1) : ''}" target="_blank">${esc(url + '?board' + (rm ? '&' + rm.slice(1) : ''))}</a></div></div>`;
    const roster = `<div class="hbox"><h3>Players · ${plist().length}</h3><div class="names">${plist().map(p => `<span style="border-color:${dcol(p.dept)}">${esc(p.name)}${p.dept ? ' · ' + (E.DEPTS[p.dept] || '').split(' ')[0] : ''}</span>`).join('') || '<span>Nobody yet</span>'}</div></div>`;
    if (st.phase !== 'play' && st.phase !== 'done') return `<div class="host"><h1>ECHO host</h1>${links}${roster}<div class="hbox"><h3>Use case</h3><select id="huc">${E.USE.map((u, i) => `<option value="${i}" ${i === UC() ? 'selected' : ''}>${esc(u.n)} · €${u.b}M · ${u.t} wks</option>`).join('')}</select><p class="mut" style="margin-top:6px">${esc(E.USE[UC()].x)}</p><h3 style="margin-top:14px">Cards per department each round</h3><select id="hk">${[1, 2, 3, 4].map(k => `<option ${k === K() ? 'selected' : ''}>${k}</option>`).join('')}</select></div><div style="margin-top:16px"><button class="btn" data-h="start" ${plist().length ? '' : 'disabled'}>Start the game</button><button class="btn ghost" data-h="reset" style="margin-top:10px">Reset room</button></div></div>`;
    if (st.phase === 'done') return `<div class="host"><h1>ECHO host</h1><div class="hbox"><h3>Game over</h3><p>Result shown on the projector.</p></div><button class="btn ghost" data-h="reset" style="margin-top:14px">New game</button></div>`;
    const o = over(), dials = `<div class="hbox"><h3>Money and time · the room sees every change</h3><div class="dial"><span>Budget €${fm(budget())}M</span><span class="b"><button data-h="b" data-v="-1">−1</button><button data-h="b" data-v="-0.5">−0.5</button><button data-h="b" data-v="0.5">+0.5</button><button data-h="b" data-v="1">+1</button></span></div><div class="dial"><span>Deadline ${deadline()} wks</span><span class="b"><button data-h="t" data-v="-1">−1</button><button data-h="t" data-v="1">+1</button></span></div><div class="dial"><span>Cards per department</span><span class="b"><button data-h="k" data-v="-1">−</button><button style="min-width:30px;background:none">${K()}</button><button data-h="k" data-v="1">+</button></span></div><div style="margin-top:12px"><button class="btn sm ghost" data-h="ev">Surprise: regulator moves the deadline −1 wk</button></div></div>`;
    const v = veto(), gone = removedIds(), s = stp();
    const list = (s === 'ceo' || s === 'review') ? `<div class="hbox"><h3>${s === 'ceo' ? 'Proposed cards · remove any card (the team is told)' : 'Proposed cards'}</h3>${allProp().length ? E.DORDER.map(d => propD(d).length ? `<div class="hgrp" style="--c:${dcol(d)}">${E.DEPTS[d]}${v.sets.indexOf(d) >= 0 ? ' · whole set vetoed' : ''}</div>` + propD(d).map(id => { const g = gone[id], f = E.cardFlags(nd('flags'), id), tc = E.trimCount(nd('trim'), id, PL());
        return `<div class="hostrow" style="--c:${dcol(d)}"><span class="dot"></span><div><div style="font-weight:800;font-size:15px;${g ? 'text-decoration:line-through;color:#ffb0ba' : ''}">${esc(C(id).n)}</div><div class="mut">${f.ok ? '✓' + f.ok + ' ' : ''}${f.x ? '✗' + f.x + ' ' : ''}${tc ? 'trim ' + tc + '/' + need(d) + ' ' : ''}${g ? whyGone(id, g) : ''}</div></div><div style="font-weight:900;font-size:13px;white-space:nowrap">${cost(C(id))}</div>${s === 'ceo' && g !== 'veto' && g !== 'trim' ? `<button class="xb ${g === 'drop' ? 'done' : ''}" data-h="drop" data-id="${id}">${g === 'drop' ? 'Put back' : 'Remove'}</button>` : '<span></span>'}</div>`; }).join('') : '').join('') : '<p class="mut">Nothing proposed.</p>'}${s === 'ceo' ? '<p class="mut" style="margin-top:10px">Cards trimmed by a team majority or vetoed by RAI in round 4 are removed automatically.</p>' : ''}</div>` : '';
    const nxt = { propose: 'Send proposals to RAI review', review: 'Send to trim and CEO', ceo: 'Approve and build', built: rd() < 4 ? 'Start round ' + (rd() + 1) : 'Run the attacks' }[s];
    return `<div class="host"><div class="kick">ROUND ${rd()} OF 4 · ${E.RN[rd() - 1].toUpperCase()} · ${stepName[s].toUpperCase()}</div><h1>ECHO host</h1><div class="hstat"><div><div class="big" style="color:${o.m ? '#ff5d73' : '#3dd6a3'}">${mon(o.spent)}</div><small>OF €${fm(budget())}M${o.m ? ' · OVER ' + fm(o.m) : ''}</small></div><div><div class="big" style="color:${o.t ? '#ff5d73' : '#f2c14e'}">${o.time} wk</div><small>OF ${deadline()}${o.t ? ' · LATE ' + o.t : ''}</small></div></div><div class="hbox"><button class="btn" data-h="next">${nxt}</button></div>${list}${dials}${roster}${links}<button class="btn ghost" data-h="reset" style="margin-top:14px">Reset room</button></div>`; }
  function hostClick(e) { const b = e.target.closest('[data-h]'); if (!b || b.tagName === 'INPUT') return; hostAct(b.dataset.h, b.dataset.v, b.dataset.id); }
  function hostChange(e) { const t = e.target; if (t.id === 'huc') WR({ 'state/uc': +t.value, 'state/phase': 'lobby' }); else if (t.id === 'hk') WR({ 'state/k': +t.value }); }
  async function hostAct(a, v, id) {
    const st = ST();
    if (a === 'reset') { if (confirm('Reset this room? All players and results are cleared.')) await DB.set(BASE, null); return; }
    if (a === 'start') { const as = E.assign(plist()), u = E.USE[UC()], o = { 'state/phase': 'play', 'state/round': 1, 'state/step': 'propose', 'state/uc': UC(), 'state/k': K(), 'state/budget': u.b, 'state/deadline': u.t, 'state/note': null };
      Object.keys(as).forEach(p => o['players/' + p + '/dept'] = as[p]); await WR(o); SFX.fanfare && SFX.fanfare(); return; }
    if (a === 'b' || a === 't') { const nb = a === 'b' ? Math.max(1, E.rnd(budget() + +v)) : Math.max(1, deadline() + +v), txt = a === 'b' ? `The CEO changed the budget to €${fm(nb)}M` : `The CEO changed the deadline to ${nb} weeks`; await WR(Object.assign({ ['state/' + (a === 'b' ? 'budget' : 'deadline')]: nb }, setNote(txt))); return; }
    if (a === 'k') { await WR({ 'state/k': Math.min(4, Math.max(1, K() + +v)) }); return; }
    if (a === 'drop') { const on = !dropped(id), c = C(id); await WR(Object.assign({ [`drop/r${rd()}/${id}`]: on ? true : null }, setNote(on ? `The CEO removed ${c.n} from ${E.DEPTS[c.d]}` : `The CEO put ${c.n} back`))); SFX.chip && SFX.chip(); return; }
    if (a === 'ev') { const nd2 = Math.max(1, deadline() - 1); await WR(Object.assign({ 'state/deadline': nd2 }, setNote(`The regulator moved the deadline to ${nd2} weeks`))); SFX.news && SFX.news(); return; }
    if (a === 'next') {
      if (st.step === 'propose') { const t = tally(), o = { 'state/step': 'review' }; E.DORDER.forEach(d => E.rank(t[d], K()).forEach(c => o[`prop/r${rd()}/${d}/${c}`] = 1)); await WR(o); }
      else if (st.step === 'review') await WR({ 'state/step': 'ceo' });
      else if (st.step === 'ceo') { const vt = veto(), gone = removedIds(), o = { 'state/step': 'built' };
        allProp().forEach(c => { if (!gone[c]) o[`appr/r${rd()}/${c}`] = 1; }); o[`delay/r${rd()}`] = rd() === 4 ? vt.count : 0; await WR(o); SFX.stamp && SFX.stamp(); }
      else if (st.step === 'built') { if (rd() < 4) await WR({ 'state/round': rd() + 1, 'state/step': 'propose', 'state/note': null }); else { await WR({ 'state/phase': 'done', 'state/note': null }); const t = E.totals(apprAll(), delays()), r = E.finish(UC(), built(), t.spent, t.time, budget(), deadline()); (r.grade === 'fail' || r.grade === 'bronze') ? SFX.sad && SFX.sad() : SFX.fanfare && SFX.fanfare(); } }
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
