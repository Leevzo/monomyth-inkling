/* ═══ crown.js — THE CROWN: the brand, the gems, the adjuster ═══
   His word, 2026-10-01 (with the pattern ~/Downloads/bead-pattern(1).png, "the crown", 76 pixels, 6 colours):
     "I'm thinking that's the adjuster, up and down — that will be the brand. the number in the middle can be the
      total of gems, and pixels are the gems themselves, growing from the middle, when you move it the gems follow you
      with clicky lag, and they change once a second."
     "double tap opens it and that's your qr code, with orv in the center. that's the share/save" (share.js)
     "it seems liek the grey pixels are contained to a square, I want them to be able to move anywhere on screen if
      pushed there" — so the gems are drawn on the whole screen (opts.overlay), never inside a box.
     "the crown can have greyed out pixels intermittent as it gets farther away along the line" … "no need for fixed pixels
      on the borders, I want them to be part of the crown" — so THE ARMS: grey crown pixels running out from the heart
      along the cross (up, down, and to the right, to opts.bounds()), intermittent and paler the farther they reach, and
      they lag like every other gem.

   · THE PATTERN is his, cell for cell (crown.json); nothing here redraws it. Its empty heart is crown.json "heart".
   · THE GEMS are its pixels. They light from the heart outward (ties: counter-clockwise from the top). A gem not yet
     earned stands in the quiet grey, so the crown's shape is always there.
   · THE NUMBER sits in the heart (3 × 5 crown pixels): one digit fills it exactly; more digits share it at a finer dot.
   · THE LAG: when the crown moves, every gem stays where it was and walks home a click at a time, the far ones setting
     off later; a gem flung far walks home in bigger clicks. With the overlay, a push can fling them anywhere on screen.
   · ONCE A SECOND every lit gem steps to the next of the crown's own six colours.
   Every tunable number is in KNOBS. Read only: it never writes anything.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KNOBS = {
    stepMs: 45,          // a lagging gem takes a step this often: the click
    lagPerPx: 1.4,       // ticks of wait per crown pixel of distance from the heart before a gem sets off home
    stride: 6,           // a gem this many crown pixels away walks home in 2-pixel clicks, twice this in 3, and so on
    boxLag: 14,          // without the overlay, a gem never trails further than its canvas allows (min of this and pad)
    secondMs: 1000,      // the colours step this often
    cycle: ['#FF0000', '#FF8000', '#70B300', '#2D8686', '#00A0FF', '#A640BF'],   // the crown's six, in hue order
    quiet: null,         // the unlit gem: the page's --faint grey when null
    armGap: 5,           // along an arm, every pixel at first; one in two after this many; one in three after twice this …
    armFade: 70,         // an arm pixel this many crown pixels out is at its palest
    armMin: 0.16, armMax: 0.85   // the arms' opacity, far and near
  };
  async function load(url) { const r = await fetch(url || './crown.json'); return r.json(); }

  /* the 3×5 digits, drawn as pixels */
  const DIG = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
                3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
                6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
                9: ['111', '101', '111', '001', '111'] };
  const css = n => (getComputedStyle(root.document.documentElement).getPropertyValue(n) || '').trim();

  /* the whole screen, for gems that are pushed anywhere (one per page) */
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
    const LAG = OV ? Infinity : Math.min(KNOBS.boxLag, PAD);
    const hr = Array.isArray(data.heart) ? data.heart : [Math.round((H - 1) / 2) - 2, Math.round((W - 1) / 2) - 1];
    const heart = { r0: hr[0], c0: hr[1], rows: 5, cols: 3 }, cy = heart.r0 + 2, cx = heart.c0 + 1;
    const gems = data.cells.map(([r, c, hex]) => {
      const dy = r - cy, dx = c - cx, ang = (Math.atan2(-dx, -dy) + Math.PI * 2) % (Math.PI * 2);
      return { r, c, base: Math.max(0, KNOBS.cycle.indexOf(hex.toUpperCase())), d: Math.hypot(dx, dy), ang, ox: 0, oy: 0, wait: 0 };
    }).sort((a, b) => a.d - b.d || a.ang - b.ang);
    const st = { count: opts.count == null ? gems.length : opts.count, shown: null, step: 0, sec: null, last: null, acc: [0, 0], raf: 0, t: 0, alive: true };
    /* THE ARMS: grey pixels out from the heart along the cross, part of the crown (they lag like gems) */
    const ARMS = [], armOf = {};
    const arm = (dir, k) => { const key = dir + k; if (armOf[key]) return armOf[key];
      const start = dir === 'u' ? cy + 1 : dir === 'd' ? H - cy : W - cx;   // just past the crown's own edge
      const a = { dir, k, r: dir === 'u' ? cy - start - k : dir === 'd' ? cy + start + k : cy, c: dir === 'r' ? cx + start + k : cx,
                  d: start + k, ox: 0, oy: 0, wait: 0, on: k % (1 + Math.floor(k / KNOBS.armGap)) === 0,
                  alpha: Math.max(KNOBS.armMin, KNOBS.armMax - k / KNOBS.armFade) };
      ARMS.push(a); armOf[key] = a; return a; };
    const reach = rect => { if (!opts.bounds || !rect || !rect.width) return { u: 0, d: 0, r: 0 };
      const b = opts.bounds(), hx = rect.left + (PAD + cx + 0.5) * S, hy = rect.top + (PAD + cy + 0.5) * S;
      return { u: Math.max(0, Math.floor((hy - b.top) / S) - (cy + 1)), d: Math.max(0, Math.floor((b.bottom - hy) / S) - (H - cy)), r: Math.max(0, Math.floor((b.right - hx) / S) - (W - cx)) }; };

    function digits(g, X, Y, n) {
      const s = String(Math.max(0, Math.floor(n))), k = s.length;
      const dot = Math.max(1, Math.floor(Math.min((heart.cols * S) / (k * 4 - 1), (heart.rows * S) / 5)));
      const wPx = (k * 4 - 1) * dot, hPx = 5 * dot;
      const x0 = X + (PAD + heart.c0) * S + Math.round((heart.cols * S - wPx) / 2), y0 = Y + (PAD + heart.r0) * S + Math.round((heart.rows * S - hPx) / 2);
      g.fillStyle = css('--ink') || '#f2f2f2';
      Array.from(s).forEach((ch, i) => (DIG[ch] || DIG[0]).forEach((row, y) => Array.from(row).forEach((b, x) => {
        if (b === '1') g.fillRect(x0 + (i * 4 + x) * dot, y0 + y * dot, dot, dot); })));
    }
    function draw(rect) {
      const q = KNOBS.quiet || css('--faint') || '#6e6e6e';
      let g = own, X = 0, Y = 0;
      if (OV) { g = OV.ctx; g.clearRect(0, 0, OV.w(), OV.h()); own.clearRect(0, 0, canvas.width, canvas.height);
        const hide = root.document.body.classList.contains('setting') || !rect || !rect.width; if (hide) return;
        X = Math.round(rect.left); Y = Math.round(rect.top); }
      else own.clearRect(0, 0, canvas.width, canvas.height);
      if (OV && opts.bounds) { const R = reach(rect); g.fillStyle = q;
        ['u', 'd', 'r'].forEach(dir => { for (let k = 0; k < R[dir]; k++) { const a = arm(dir, k); if (!a.on) continue;
          g.globalAlpha = a.alpha; g.fillRect(X + (PAD + a.c + a.ox) * S, Y + (PAD + a.r + a.oy) * S, S, S); } });
        g.globalAlpha = 1; }
      gems.forEach((gm, i) => { g.fillStyle = i < st.count ? KNOBS.cycle[(gm.base + st.step) % KNOBS.cycle.length] : q;
        g.fillRect(X + (PAD + gm.c + gm.ox) * S, Y + (PAD + gm.r + gm.oy) * S, S, S); });
      digits(g, X, Y, st.shown == null ? st.count : st.shown);
    }
    /* the crown moved on the screen by (dx, dy) px: the gems stay behind, then walk home */
    function moved(dx, dy) {
      st.acc[0] += dx / S; st.acc[1] += dy / S;
      const mx = Math.trunc(st.acc[0]), my = Math.trunc(st.acc[1]); if (!mx && !my) return;
      st.acc[0] -= mx; st.acc[1] -= my;
      gems.concat(ARMS).forEach(g => { g.ox = Math.max(-LAG, Math.min(LAG, g.ox - mx)); g.oy = Math.max(-LAG, Math.min(LAG, g.oy - my));
        g.wait = Math.max(g.wait, Math.round(g.d * KNOBS.lagPerPx)); });
    }
    const home = v => v === 0 ? 0 : v - Math.sign(v) * Math.min(Math.abs(v), 1 + Math.floor(Math.abs(v) / KNOBS.stride));
    function frame(ts) {
      if (!st.alive) return;
      const r = canvas.getBoundingClientRect();
      if (st.last && r.width) moved(r.left - st.last[0], r.top - st.last[1]);
      if (r.width) st.last = [r.left, r.top];
      const tick = Math.floor(ts / KNOBS.stepMs);
      if (tick !== st.t) { st.t = tick;
        gems.concat(ARMS).forEach(g => { if (!g.ox && !g.oy) return; if (g.wait > 0) { g.wait--; return; } g.ox = home(g.ox); g.oy = home(g.oy); }); }
      const sec = Math.floor(Date.now() / KNOBS.secondMs); if (sec !== st.sec) { st.sec = sec; st.step = (st.step + 1) % KNOBS.cycle.length; }
      draw(r); st.raf = requestAnimationFrame(frame);
    }
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { const once = () => draw(canvas.getBoundingClientRect()); once(); root.addEventListener('resize', once); }
    else st.raf = requestAnimationFrame(frame);
    return {
      gems: gems.length,
      set(n, shown) { st.count = Math.max(0, Math.min(gems.length, Math.round(n))); st.shown = shown == null ? null : shown; if (reduce) draw(canvas.getBoundingClientRect()); },
      get count() { return st.count; },
      stop() { st.alive = false; cancelAnimationFrame(st.raf); }
    };
  }
  root.CROWN = { load, make, KNOBS };
})(window);
