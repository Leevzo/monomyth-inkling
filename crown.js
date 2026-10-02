/* ═══ crown.js — THE CROWN: the brand, the gems, the adjuster ═══
   His word, 2026-10-01 (with the pattern ~/Downloads/bead-pattern(1).png, "the crown", 76 pixels, 6 colours):
     "I'm thinking that's the adjuster, up and down — that will be the brand. the number in the middle can be the
      total of gems, and pixels are the gems themselves, growing from the middle, when you move it the gems follow you
      with clicky lag, and they change once a second."
     "double tap opens it and that's your qr code, with orv in the center. that's the share/save" (share.js)

   · THE PATTERN is his, cell for cell (crown.json); nothing here redraws it.
   · THE GEMS are its pixels. They light from the middle outward: the nearest the heart first (ties: counter-clockwise
     from the top). A gem not yet earned stands in the quiet grey, so the crown's shape is always there.
   · THE NUMBER sits in the empty heart (3 × 5 crown pixels): one digit fills the heart exactly, pixel for pixel;
     more digits share it at a finer dot.
   · THE LAG: when the crown moves on the screen, every gem stays where it was and then walks home ONE crown pixel at a
     time (a click), the far gems setting off later than the near ones.
   · ONCE A SECOND every lit gem steps to the next of the crown's own six colours (the bars keep their families).
   Every tunable number is in KNOBS. Read only: it never writes anything.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KNOBS = {
    stepMs: 45,          // a lagging gem walks one crown pixel this often: the click
    lagPerPx: 1.4,       // ticks of wait per crown pixel of distance from the heart before a gem sets off home
    maxLag: 14,          // a gem never trails further than this many crown pixels
    secondMs: 1000,      // the colours step this often
    cycle: ['#FF0000', '#FF8000', '#70B300', '#2D8686', '#00A0FF', '#A640BF'],   // the crown's six, in hue order
    quiet: null          // the unlit gem: the page's --faint grey when null
  };
  async function load(url) { const r = await fetch(url || './crown.json'); return r.json(); }

  /* the 3×5 digits, drawn as pixels (a digit is three dots wide and five tall, like the heart) */
  const DIG = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
                3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
                6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
                9: ['111', '101', '111', '001', '111'] };

  function make(canvas, data, opts) {
    opts = opts || {};
    const S = opts.scale || 4, PAD = opts.pad == null ? 6 : opts.pad, W = data.w, H = data.h;
    canvas.width = (W + PAD * 2) * S; canvas.height = (H + PAD * 2) * S;
    canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px';
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    /* the heart: the empty middle the bars stand round */
    const cy = (H - 1) / 2, cx = (W - 1) / 2;
    const heart = { r0: Math.round(cy) - 2, c0: Math.round(cx) - 1, rows: 5, cols: 3 };
    const gems = data.cells.map(([r, c, hex]) => {
      const dy = r - cy, dx = c - cx, ang = (Math.atan2(-dx, -dy) + Math.PI * 2) % (Math.PI * 2);   // counter-clockwise from the top
      return { r, c, base: Math.max(0, KNOBS.cycle.indexOf(hex.toUpperCase())), hex, d: Math.hypot(dx, dy), ang, ox: 0, oy: 0, wait: 0 };
    }).sort((a, b) => a.d - b.d || a.ang - b.ang);
    const st = { count: opts.count == null ? gems.length : opts.count, shown: null, step: 0, last: null, acc: [0, 0], raf: 0, t: 0, alive: true };
    const quiet = () => KNOBS.quiet || (getComputedStyle(root.document.documentElement).getPropertyValue('--faint') || '#6e6e6e').trim();
    function colourOf(g, lit) { return lit ? KNOBS.cycle[(g.base + st.step) % KNOBS.cycle.length] : quiet(); }
    function digits(n) {
      const s = String(Math.max(0, Math.floor(n))), k = s.length;
      const dot = Math.max(1, Math.floor(Math.min((heart.cols * S) / (k * 4 - 1), (heart.rows * S) / 5)));
      const wPx = (k * 4 - 1) * dot, hPx = 5 * dot;
      const x0 = (PAD + heart.c0) * S + Math.round((heart.cols * S - wPx) / 2), y0 = (PAD + heart.r0) * S + Math.round((heart.rows * S - hPx) / 2);
      ctx.fillStyle = (getComputedStyle(root.document.documentElement).getPropertyValue('--ink') || '#f2f2f2').trim();
      Array.from(s).forEach((ch, i) => (DIG[ch] || DIG[0]).forEach((row, y) => Array.from(row).forEach((b, x) => {
        if (b === '1') ctx.fillRect(x0 + (i * 4 + x) * dot, y0 + y * dot, dot, dot); })));
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gems.forEach((g, i) => { ctx.fillStyle = colourOf(g, i < st.count); ctx.fillRect((PAD + g.c + g.ox) * S, (PAD + g.r + g.oy) * S, S, S); });
      digits(st.shown == null ? st.count : st.shown);
    }
    /* the canvas moved on the screen by (dx, dy) px: the gems stay behind, then walk home one click at a time */
    function moved(dx, dy) {
      st.acc[0] += dx / S; st.acc[1] += dy / S;
      const mx = Math.trunc(st.acc[0]), my = Math.trunc(st.acc[1]); if (!mx && !my) return;
      st.acc[0] -= mx; st.acc[1] -= my;
      gems.forEach(g => { g.ox = Math.max(-KNOBS.maxLag, Math.min(KNOBS.maxLag, g.ox - mx)); g.oy = Math.max(-KNOBS.maxLag, Math.min(KNOBS.maxLag, g.oy - my));
        g.wait = Math.max(g.wait, Math.round(g.d * KNOBS.lagPerPx)); });
    }
    function frame(ts) {
      if (!st.alive) return;
      const r = canvas.getBoundingClientRect();
      if (st.last && r.width) moved(r.left - st.last[0], r.top - st.last[1]);
      if (r.width) st.last = [r.left, r.top];
      const tick = Math.floor(ts / KNOBS.stepMs);
      if (tick !== st.t) { st.t = tick;
        gems.forEach(g => { if (!g.ox && !g.oy) return; if (g.wait > 0) { g.wait--; return; }
          if (g.ox) g.ox -= Math.sign(g.ox); if (g.oy) g.oy -= Math.sign(g.oy); }); }
      const sec = Math.floor(Date.now() / KNOBS.secondMs); if (sec !== st.sec) { st.sec = sec; st.step = (st.step + 1) % KNOBS.cycle.length; }
      draw(); st.raf = requestAnimationFrame(frame);
    }
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) draw(); else st.raf = requestAnimationFrame(frame);
    return {
      gems: gems.length,
      set(n, shown) { st.count = Math.max(0, Math.min(gems.length, Math.round(n))); st.shown = shown == null ? null : shown; if (reduce) draw(); },
      get count() { return st.count; },
      stop() { st.alive = false; cancelAnimationFrame(st.raf); }
    };
  }
  root.CROWN = { load, make, KNOBS };
})(window);
