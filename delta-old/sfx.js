/* Agent Tycoon · sound effects, synthesised with Web Audio (no files to load).
   Browsers only allow sound after a tap/click on the page, so SFX.unlock() runs on the first touch. */
(function () {
  let ctx = null, master = null, on = true;
  const ok = () => ctx && ctx.state === 'running' && on;
  function init() {
    if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  }
  function unlock() { init(); if (ctx && ctx.state !== 'running') ctx.resume(); }
  let nb = null; const noise = () => { if (nb) return nb; nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return nb; };
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f, t, a, peak, d, f2) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); env(g, t, a, peak, d); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + d + 0.05); }
  function burst(t, type, freq, q, peak, d, a = 0.003) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(); f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t, a, peak, d); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + a + d + 0.05); }
  const S = {
    unlock, get enabled() { return ok(); }, set mute(m) { on = !m; },
    tick(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; tone('square', 1200, t, 0.002, 0.25, 0.05); },
    flip(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; burst(t, 'highpass', 2500, 0.7, 0.5, 0.09, 0.01); },
    deal(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; burst(t, 'bandpass', 3200, 1.2, 0.35, 0.06); tone('triangle', 900, t, 0.002, 0.08, 0.05, 500); },
    news(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; burst(t, 'lowpass', 300, 0.8, 0.6, 0.35, 0.005);
      [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42]].forEach(([f, x]) => { tone('square', f, t + x, 0.005, 0.12, 0.16); tone('sine', f / 2, t + x, 0.005, 0.18, 0.2); }); },
    chip(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; [0, 0.05, 0.1].forEach((x, i) => tone('sine', 2200 + i * 300, t + x, 0.002, 0.18, 0.08)); },
    drumroll(dur = 2.4, t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; for (let x = 0; x < dur; x += 0.045) { const p = 0.08 + 0.5 * (x / dur); burst(t + x, 'bandpass', 1800, 0.8, p, 0.05); burst(t + x, 'lowpass', 180, 0.7, p * 0.6, 0.06); } S.crash(t0 + dur); },
    crash(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; burst(t, 'highpass', 5000, 0.3, 0.7, 1.6, 0.002); tone('sine', 70, t, 0.005, 0.9, 0.5, 40); },
    boom(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; tone('sine', 110, t, 0.004, 1.0, 0.9, 32); burst(t, 'lowpass', 400, 0.8, 0.8, 0.5); tone('sawtooth', 220, t + 0.05, 0.01, 0.15, 0.6, 110); },
    clang(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; tone('triangle', 520, t, 0.003, 0.5, 0.5); tone('triangle', 780, t, 0.003, 0.3, 0.4); burst(t, 'bandpass', 900, 2, 0.4, 0.15); },
    shield(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; [1046, 1318, 1568, 2093].forEach((f, i) => tone('sine', f, t + i * 0.06, 0.004, 0.3, 0.7)); },
    whoosh(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(); f.type = 'bandpass'; f.Q.value = 1; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2500, t + 0.35); env(g, t, 0.15, 0.25, 0.3); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.6); },
    fanfare(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; [[523, 0], [659, .12], [784, .24], [1046, .36]].forEach(([f, x]) => { tone('triangle', f, t + x, 0.01, 0.35, x === .36 ? 0.9 : 0.2); tone('square', f / 2, t + x, 0.01, 0.06, 0.2); }); },
    sad(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; [[392, 0], [370, .35], [349, .7], [330, 1.05]].forEach(([f, x], i) => tone('sawtooth', f, t + x, 0.03, 0.18, i === 3 ? 1.0 : 0.3, i === 3 ? 260 : 0)); },
    stamp(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; tone('sine', 90, t, 0.002, 1, 0.35, 45); burst(t, 'lowpass', 900, 0.6, 0.9, 0.18); },
    ring(t0 = 0) { if (!ok()) return; const t = ctx.currentTime + t0; [[1319, 0], [988, .14], [1175, .28], [1568, .42], [1319, .7], [988, .84], [1175, .98], [1568, 1.12]].forEach(([f, x]) => { tone('sine', f, t + x, 0.005, 0.32, 0.16); tone('triangle', f * 2, t + x, 0.005, 0.06, 0.1); }); },
    heartbeat(n = 3, t0 = 0) { if (!ok()) return; for (let i = 0; i < n; i++) { const t = ctx.currentTime + t0 + i * 0.8; tone('sine', 60, t, 0.01, 0.9, 0.18, 40); tone('sine', 55, t + 0.22, 0.01, 0.6, 0.2, 38); } },
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  window.SFX = S;
})();
