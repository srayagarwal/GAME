/* Tiny data layer: Firebase Realtime Database when configured, otherwise a local demo store
   (localStorage + BroadcastChannel) so the game can be tried in several tabs of one browser. */
(function () {
  const cfg = window.TYCOON_CONFIG || {};
  const parts = p => p.split('/').filter(Boolean);
  function local() {
    const KEY = 'tycoon_demo_db', ch = 'BroadcastChannel' in window ? new BroadcastChannel('tycoon') : null, subs = [];
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const save = t => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {} };
    const getAt = (t, p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), t);
    const setAt = (t, p, v) => { const ks = parts(p); let o = t; ks.slice(0, -1).forEach(k => { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k]; });
      if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
    const fire = () => { const t = load(); subs.forEach(s => s.cb(getAt(t, s.p) ?? null)); };
    if (ch) ch.onmessage = fire; window.addEventListener('storage', e => { if (e.key === KEY) fire(); });
    const commit = t => { save(t); fire(); if (ch) ch.postMessage(1); };
    return {
      mode: 'demo',
      on(p, cb) { const s = { p, cb }; subs.push(s); cb(getAt(load(), p) ?? null); return () => subs.splice(subs.indexOf(s), 1); },
      async get(p) { return getAt(load(), p) ?? null; },
      async set(p, v) { const t = load(); setAt(t, p, v); commit(t); },
      async update(p, obj) { const t = load(); Object.keys(obj).forEach(k => setAt(t, p + '/' + k, obj[k])); commit(t); },
      async tx(p, fn) { const t = load(); const v = fn(getAt(t, p) ?? null); if (v !== undefined) { setAt(t, p, v); commit(t); } return v; },
      now: () => Date.now(),
    };
  }
  function fire() {
    firebase.initializeApp(cfg.firebase); const db = firebase.database(); let off = 0;
    db.ref('.info/serverTimeOffset').on('value', s => off = s.val() || 0);
    return {
      mode: 'live',
      on(p, cb) { const r = db.ref(p), h = s => cb(s.val()); r.on('value', h); return () => r.off('value', h); },
      async get(p) { return (await db.ref(p).get()).val(); },
      set: (p, v) => db.ref(p).set(v),
      update: (p, obj) => db.ref(p).update(obj),
      async tx(p, fn) { const r = await db.ref(p).transaction(v => { const n = fn(v); return n === undefined ? v : n; }); return r.snapshot.val(); },
      now: () => Date.now() + off,
    };
  }
  window.DB = cfg.firebase && window.firebase ? fire() : local();
})();
