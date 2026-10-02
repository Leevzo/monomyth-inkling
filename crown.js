/* ═══ crown.js — THE CROWN: the brand, the gems, the adjuster ═══
   His words, 2026-10-01 (the pattern ~/Downloads/bead-pattern(1).png, "the crown", 76 cells, 6 colours):
     "the number in the middle can be the total of gems, and pixels are the gems themselves, growing from the middle, when
      you move it the gems follow you with clicky lag, and they change once a second."
     "I want them to be able to move anywhere on screen if pushed there" — drawn on the whole screen (opts.overlay).
     "the crown can have greyed out pixels intermittent as it gets farther away along the line … I want them to be part of
      the crown" — THE ARMS, grey crown pixels out from the heart along the cross, lagging like gems.
     "take away the gray pixels around the number just add the colors of the gems. I want them to hit randomly fan out
      from the middle and change position once a second" — no grey crown any more: only the gems, in their colours; each
      second they burst out of the heart to new places among the crown's own cells.
     "the [number] flash on one second off another second and if it's more than one digit, it will flash the first one for
      a second the second one for a second and the third one will be a space" — one digit at a time, filling the heart.
     "I want the movement on the actual app to look like the movement that's going on in what you have in the preview window
      like just movement within the established parameters" — so the gems keep their places in the crown's own shape (lit
      from the heart outward) and only their colours move: every beat each takes one of the crown code's four colours, the
      very look of the crown when it sends. No more bursts.
   · THE PATTERN is his, cell for cell (crown.json): its cells are the only places a gem may land; its heart is "heart".
   · Every tunable number is in KNOBS. Read only: it never writes anything.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KNOBS = {
    stepMs: 30,          // a travelling gem takes a step this often: the click
    lagPerPx: 0.35,      // ticks of wait per crown pixel from the heart before a gem follows a move ("slightly more delay")
    scatter: 3,          // each gem waits up to this many more clicks of its own ("and scatter")
    fling: 0.45,         // and is thrown up to this much farther than the push, the far ones most
    stride: 3,           // a gem this many crown pixels away travels in 2-pixel clicks, twice this in 3 …
    secondMs: 1000,      // the gems take new places, and the number its next digit, this often
    beatMs: 200,         // the colours switch this often, as the sending crown's beats do
    four: ['#FF0000', '#70B300', '#00A0FF', '#A640BF'],   // the crown code's four (share.js FOUR)
    cycle: ['#FF0000', '#FF8000', '#70B300', '#2D8686', '#00A0FF', '#A640BF'],   // the crown's six
    armGap: 5, armFade: 70, armMin: 0.16, armMax: 0.85, armGrey: null   // THE ARMS (armGrey: the page's --faint when null)
  };
  async function load(url) { const r = await fetch(url || './crown.json'); return r.json(); }

  const DIG = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
                3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
                6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
                9: ['111', '101', '111', '001', '111'] };
  const css = n => (getComputedStyle(root.document.documentElement).getPropertyValue(n) || '').trim();

  function sky() {
    let c = root.document.getElementById('crownSky');
    if (!c) { c = root.document.createElement('canvas'); c.id = 'crownSky'; c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:7;image-rendering:pixelated';
      root.document.body.appendChild(c); }
    const ctx = c.getContext('2d');
    const fit = () => { const d = root.devicePixelRatio || 1; c.width = Math.round(root.innerWidth * d); c.height = Math.round(root.innerHeight * d);
      c.style.width = root.innerWidth + 'px'; c.style.height = root.innerHeight + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.imageSmoothingEnabled = false; };
    fit(); root.addEventListener('resize', fit);
    return { c, ctx, w: () => root.innerWidth, h: () => root.innerHeight };
  }

  function make(canvas, data, opts) {
    opts = opts || {};
    const S = opts.scale || 4, PAD = opts.pad == null ? 6 : opts.pad, W = data.w, H = data.h;
    canvas.width = (W + PAD * 2) * S; canvas.height = (H + PAD * 2) * S;
    canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px';
    canvas.style.imageRendering = 'pixelated';
    const own = canvas.getContext('2d'); own.imageSmoothingEnabled = false;
    const OV = opts.overlay ? sky() : null;
    const LAG = OV ? Infinity : PAD;
    const hr = Array.isArray(data.heart) ? data.heart : [Math.round((H - 1) / 2) - 2, Math.round((W - 1) / 2) - 1];
    const heart = { r0: hr[0], c0: hr[1], rows: 5, cols: 3 }, cy = heart.r0 + 2, cx = heart.c0 + 1;
    const CELLS = data.cells.map(([r, c, hex]) => ({ r, c, base: Math.max(0, KNOBS.cycle.indexOf(hex.toUpperCase())), d: Math.hypot(r - cy, c - cx) }));
    /* the gems: one per lit cell, each with its own colour and temper; they move between the crown's cells */
    const GEMS = CELLS.slice().sort((a, b) => a.d - b.d).map((cell, i) => ({ r: cell.r, c: cell.c, base: cell.base, d: cell.d, ox: 0, oy: 0, wait: 0, fx: 0, fy: 0,
      j: (((i + 1) * 2654435761) >>> 0) % 1000 / 1000, col: (Math.random() * 4) | 0 }));   // in their places, lit from the heart outward
    const st = { count: opts.count == null ? GEMS.length : opts.count, shown: null, step: 0, sec: null, last: null, acc: [0, 0], raf: 0, t: 0, alive: true };

    /* THE ARMS */
    const ARMS = [], armOf = {};
    const arm = (dir, k) => { const key = dir + k; if (armOf[key]) return armOf[key];
      const start = dir === 'u' ? cy + 1 : dir === 'd' ? H - cy : W - cx;
      const a = { r: dir === 'u' ? cy - start - k : dir === 'd' ? cy + start + k : cy, c: dir === 'r' ? cx + start + k : cx, d: start + k,
                  ox: 0, oy: 0, wait: 0, fx: 0, fy: 0, j: 0, on: k % (1 + Math.floor(k / KNOBS.armGap)) === 0,
                  alpha: Math.max(KNOBS.armMin, KNOBS.armMax - k / KNOBS.armFade) };
      ARMS.push(a); armOf[key] = a; return a; };
    const reach = rect => { if (!opts.bounds || !rect || !rect.width) return { u: 0, d: 0, r: 0 };
      const b = opts.bounds(), hx = rect.left + (PAD + cx + 0.5) * S, hy = rect.top + (PAD + cy + 0.5) * S;
      return { u: Math.max(0, Math.floor((hy - b.top) / S) - (cy + 1)), d: Math.max(0, Math.floor((b.bottom - hy) / S) - (H - cy)), r: Math.max(0, Math.floor((b.right - hx) / S) - (W - cx)) }; };

    /* each beat: every gem takes one of the four colours, in its own place (the sending crown's look) */
    function beat() { GEMS.forEach(g => { g.col = (Math.random() * 4) | 0; }); }
    /* the number in the heart: one digit at a time, a second each, then a space */
    function digit(g, X, Y) {
      const s = String(Math.max(0, Math.floor(st.shown == null ? st.count : st.shown))), seq = s.split('').concat([' ']);
      const ch = seq[Math.floor(Date.now() / KNOBS.secondMs) % seq.length]; if (ch === ' ') return;
      g.fillStyle = css('--ink') || '#f2f2f2';
      (DIG[ch] || DIG[0]).forEach((row, y) => Array.from(row).forEach((b, x) => { if (b === '1') g.fillRect(X + (PAD + heart.c0 + x) * S, Y + (PAD + heart.r0 + y) * S, S, S); }));
    }
    function draw(rect) {
      let g = own, X = 0, Y = 0;
      if (OV) { g = OV.ctx; g.clearRect(0, 0, OV.w(), OV.h()); own.clearRect(0, 0, canvas.width, canvas.height);
        if (root.document.body.classList.contains('setting') || !rect || !rect.width) return;
        X = Math.round(rect.left); Y = Math.round(rect.top); }
      else own.clearRect(0, 0, canvas.width, canvas.height);
      if (OV && opts.bounds) { const R = reach(rect); g.fillStyle = KNOBS.armGrey || css('--faint') || '#6e6e6e';
        ['u', 'd', 'r'].forEach(dir => { for (let k = 0; k < R[dir]; k++) { const a = arm(dir, k); if (!a.on) continue;
          g.globalAlpha = a.alpha; g.fillRect(X + (PAD + a.c + a.ox) * S, Y + (PAD + a.r + a.oy) * S, S, S); } });
        g.globalAlpha = 1; }
      const n = Math.min(st.count, GEMS.length);
      for (let i = 0; i < n; i++) { const gm = GEMS[i]; g.fillStyle = KNOBS.four[gm.col];
        g.fillRect(X + (PAD + gm.c + gm.ox) * S, Y + (PAD + gm.r + gm.oy) * S, S, S); }
      digit(g, X, Y);
    }
    function moved(dx, dy) {
      st.acc[0] += dx / S; st.acc[1] += dy / S;
      const mx = Math.trunc(st.acc[0]), my = Math.trunc(st.acc[1]); if (!mx && !my) return;
      st.acc[0] -= mx; st.acc[1] -= my;
      GEMS.concat(ARMS).forEach(g => { const f = 1 + KNOBS.fling * g.j * Math.min(1, g.d / 9);
        g.fx += mx * f; g.fy += my * f; const ix = Math.trunc(g.fx), iy = Math.trunc(g.fy); g.fx -= ix; g.fy -= iy;
        g.ox = Math.max(-LAG, Math.min(LAG, g.ox - ix)); g.oy = Math.max(-LAG, Math.min(LAG, g.oy - iy));
        g.wait = Math.max(g.wait, Math.round(g.d * KNOBS.lagPerPx + g.j * KNOBS.scatter)); });
    }
    const home = v => v === 0 ? 0 : v - Math.sign(v) * Math.min(Math.abs(v), 1 + Math.floor(Math.abs(v) / KNOBS.stride));
    function frame(ts) {
      if (!st.alive) return;
      const r = canvas.getBoundingClientRect();
      if (st.last && r.width) moved(r.left - st.last[0], r.top - st.last[1]);
      if (r.width) st.last = [r.left, r.top];
      const b = Math.floor(Date.now() / KNOBS.beatMs); if (b !== st.sec) { st.sec = b; beat(); }
      const tick = Math.floor(ts / KNOBS.stepMs);
      if (tick !== st.t) { st.t = tick;
        GEMS.concat(ARMS).forEach(g => { if (!g.ox && !g.oy) return; if (g.wait > 0) { g.wait--; return; } g.ox = home(g.ox); g.oy = home(g.oy); }); }
      draw(r); st.raf = requestAnimationFrame(frame);
    }
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { const once = () => draw(canvas.getBoundingClientRect()); once(); root.addEventListener('resize', once); setInterval(once, KNOBS.secondMs); }
    else st.raf = requestAnimationFrame(frame);
    return {
      gems: GEMS.length,
      set(n, shown) { st.count = Math.max(0, Math.min(GEMS.length, Math.round(n))); st.shown = shown == null ? null : shown; if (reduce) draw(canvas.getBoundingClientRect()); },
      get count() { return st.count; },
      stop() { st.alive = false; cancelAnimationFrame(st.raf); }
    };
  }
  root.CROWN = { load, make, KNOBS };
})(window);
