/* ═══ sky.js — SQUATCH'S CONSTELLATION, A LITTLE BALL (his word, 2026-10-02: "Squatch's little constellation, just make it a
   little ball then, when I click it, the word comes out and it connects to other things and also when I drag it, it can move
   around slightly, but it should look like a constellation").
   At rest: every place and person of the film is a star, packed into one small ball (the places at its core, the people round
   them), the constellation's own lines faint between them, one star flaring in its colour once a second.
   Tap a star: it steps out of the ball and its word comes out in its colour; the lines run from it to everything it touches,
   and those step out too, their words coming out small and white. Tap it again, or the sky beside the ball, and they go back in.
   Drag the ball: it follows the finger a little way, each star on its own spring so the ball wobbles, and settles home when let go.
   (The lattice constellation it replaces is kept in git: a0e5c17.) The data comes only inside the King's link (#k=…, its "sq"
   part), never from this repository.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const KNOBS = {
    font: "'Dogica', ui-monospace, monospace",   // the phone's own pixel face
    spacing: 12,                 // px: the room each star has in the ball at rest
    star: { place: 3, person: 2, out: 4, sel: 5 },   // px: a star's size; a touched one; the one tapped
    out: 10,                     // px: how far a touched star steps out of the ball
    label: 11, small: 9,         // px: the word that comes out; the words of what it touches
    give: 0.38,                  // how much of the drag the ball follows
    reach: 30,                   // px: the farthest it goes
    stiff: [0.07, 0.2],          // each star's own spring, laziest to quickest: the ball wobbles
    damp: 0.76,
    lineRest: 0.2,               // the constellation's lines at rest: this much ink
    twinkleMs: 1000, flareMs: 450,   // one star flares in its colour, once a second
    fadeMs: 140,                 // the words come out in a split second
    top: 30                      // px of sky above the ball, for the words
  };

  /* ── the colour: the Magic's name law into the phone's own twelve (magic.html hashIdx) ── */
  const WHEEL = ['#FF7A12', '#FF12A1', '#FA12FF', '#9212FF', '#2A12FF', '#126EFF', '#12D6FF', '#12FFC2', '#12FF5A', '#22FF12', '#8AFF12', '#F2FF12'];
  function hashOf(name) { let h = 0; const s = String(name == null ? '' : name); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  const colourOf = name => WHEEL[hashOf(name) % WHEEL.length];
  const TEXT = ['#12D6FF', '#12FFC2', '#12FF5A', '#22FF12', '#8AFF12', '#F2FF12'];   // a word wears only a colour that reads on the grey (4.5:1); stars and lines keep all twelve
  const textOf = name => {
    const c = TEXT[hashOf(name) % TEXT.length];
    if (root.document.documentElement.getAttribute('data-theme') !== 'light') return c;
    const n = parseInt(c.slice(1), 16);
    const ch = v => Math.round(v * .58).toString(16).padStart(2, '0');
    return '#' + ch(n >> 16 & 255) + ch(n >> 8 & 255) + ch(n & 255);
  };

  /* ── the greys (the room's own, read live) ── */
  function greys() {
    const cs = root.getComputedStyle(root.document.documentElement), v = n => (cs.getPropertyValue(n) || '').trim();
    return { ground: v('--ground') || '#454545', dim: v('--dim') || '#a9a9a9', faint: v('--faint') || '#6e6e6e', ink: v('--ink') || '#f2f2f2' };
  }

  /* from the link's "sq" part: {title, c: [people], l: [places], s: [[placeIndex, [personIndex, …], "the beat, in the tape's words"], …]} */
  function fromSq(sq) {
    const people = (sq.c || []).map(String), places = (sq.l || []).map(String), where = {}, who = {}, beats = [];
    places.forEach(l => { who[l] = []; }); people.forEach(p => { where[p] = []; });
    (sq.s || []).forEach(([li, ci, text]) => { const l = places[li]; if (l == null) return; const ws = (ci || []).map(i => people[i]).filter(Boolean);
      ws.forEach(p => { if (!where[p].includes(l)) where[p].push(l); if (!who[l].includes(p)) who[l].push(p); });
      beats.push({ place: l, who: ws, text: String(text || '') }); });
    return { title: String(sq.title || ''), capL: sq.capL, capC: sq.capC, f: sq.f || null, places, people, where, who, beats };
  }
  function factsOf(W, s) {
    const beats = (W.beats || []).filter(b => s.kind === 'place' ? b.place === s.name : b.who.includes(s.name)).map(b => b.text);
    const with_ = s.kind === 'place' ? (W.who[s.name] || []) : (W.where[s.name] || []);
    return [s.name + (with_.length ? ' · ' + with_.join(', ') : '')].concat(beats, (W.f && W.f[s.name]) || []);
  }

  /* ═══ THE BALL: the stars at home, packed by the sunflower's own turn (the places first, so they are its core) ═══ */
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  function build(W) {
    const stars = W.places.map(n => ({ id: 'place:' + n, name: n, kind: 'place' })).concat(W.people.map(n => ({ id: 'person:' + n, name: n, kind: 'person' })));
    const N = stars.length, R0 = Math.max(10, Math.round(KNOBS.spacing * Math.sqrt(N / Math.PI)));
    stars.forEach((s, i) => {
      const r = R0 * Math.sqrt((i + 0.5) / N), a = i * GOLD - Math.PI / 2;
      s.hx = Math.round(r * Math.cos(a)); s.hy = Math.round(r * Math.sin(a)); s.x = s.hx; s.y = s.hy; s.vx = 0; s.vy = 0;
      s.k = KNOBS.stiff[0] + (KNOBS.stiff[1] - KNOBS.stiff[0]) * ((hashOf(s.id) % 100) / 99);
      s.lum = 0.55 + 0.45 * ((hashOf(s.name + '*') % 100) / 99);
      s.partners = s.kind === 'place' ? (W.who[s.name] || []).map(n => 'person:' + n) : (W.where[s.name] || []).map(n => 'place:' + n);
    });
    const pairs = []; stars.forEach(s => { if (s.kind === 'place') s.partners.forEach(p => pairs.push([s.id, p])); });
    return { stars, byId: new Map(stars.map(s => [s.id, s])), pairs, R0 };
  }

  /* where a star wants to be: home, stepped out if it is touched, plus the drag */
  function aim(S, s) {
    let x = s.hx, y = s.hy;
    if (S.sel && (s.id === S.sel || S.touched.has(s.id))) { let l = Math.hypot(x, y), ux = x / (l || 1), uy = y / (l || 1); if (l < 1) { ux = 0; uy = -1; }
      const o = KNOBS.out * (s.id === S.sel ? 1.4 : 1); x += ux * o; y += uy * o; }
    return [x + S.off.x, y + S.off.y];
  }

  /* ═══ the drawing: pixels only ═══ */
  function pline(x, a, b, c, d) { const n = Math.max(1, Math.round(Math.max(Math.abs(c - a), Math.abs(d - b)))); for (let i = 0; i <= n; i++) x.fillRect(Math.round(a + (c - a) * i / n), Math.round(b + (d - b) * i / n), 1, 1); }
  function paint(S) {
    const x = S.ctx; if (!x || !S.w) return;
    const G = greys(), now = Date.now(), B = S.ball, cx = S.cx, cy = S.cy, fade = S.sel ? Math.min(1, (now - S.selAt) / KNOBS.fadeMs) : 0;
    x.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); x.clearRect(0, 0, S.w, S.h);
    const P = s => [cx + s.x, cy + s.y], sel = S.sel && B.byId.get(S.sel);
    /* the lines: faint at rest; when a star is tapped, its own lines in its colour, the rest almost gone */
    B.pairs.forEach(([a, b]) => { const A = B.byId.get(a), C = B.byId.get(b); if (!A || !C) return;
      const mine = sel && (a === sel.id || b === sel.id);
      x.globalAlpha = sel ? (mine ? 1 : 0.07) : KNOBS.lineRest; x.fillStyle = mine ? colourOf(sel.name) : G.dim;
      const [p, q] = [P(A), P(C)]; pline(x, p[0], p[1], q[0], q[1]); });
    /* the stars */
    B.stars.forEach((s, i) => {
      const on = sel && s.id === sel.id, near = sel && S.touched.has(s.id), quiet = sel && !on && !near, flare = S.flare.i === i && now < S.flare.until && !sel;
      const z = on ? KNOBS.star.sel : near ? KNOBS.star.out : KNOBS.star[s.kind];
      x.globalAlpha = quiet ? 0.28 : on || near || flare ? 1 : s.lum; x.fillStyle = on || near || flare ? colourOf(s.name) : G.ink;
      const [px, py] = P(s); x.fillRect(Math.round(px - z / 2), Math.round(py - z / 2), z, z); });
    /* the words that come out, each away from the ball's heart, a ground-coloured rim so they read over the stars */
    S.hits = []; x.globalAlpha = fade;
    if (sel) [sel].concat(sel.partners.map(id => B.byId.get(id)).filter(Boolean)).forEach(s => {
      const big = s === sel, px = big ? KNOBS.label : KNOBS.small, [sx, sy] = P(s);
      x.font = px + 'px ' + KNOBS.font; x.textBaseline = 'middle'; x.lineJoin = 'round';
      const w = Math.ceil(x.measureText(s.name).width), right = s.x - S.off.x >= 0, gap = (big ? KNOBS.star.sel : KNOBS.star.out) / 2 + 4;
      let tx = right ? sx + gap : sx - gap - w; tx = Math.max(2, Math.min(S.w - 2 - w, tx));
      /* no word lands on another: it steps a line down, or up, until it stands clear */
      const lo = px / 2 + 1, hi = S.h - px / 2 - 1, clear = y => !S.hits.some(h => tx < h.x1 && tx + w > h.x0 && y - px / 2 - 2 < h.y1 - 4 && y + px / 2 + 2 > h.y0 + 4);
      let ty = Math.max(lo, Math.min(hi, sy));
      for (let k = 1, y0 = ty; !clear(ty) && k < 12; k++) { const y = y0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (px + 3); if (y >= lo && y <= hi) ty = y; }
      x.strokeStyle = G.ground; x.lineWidth = 3; x.strokeText(s.name, tx, ty); x.fillStyle = big ? textOf(s.name) : G.ink; x.fillText(s.name, tx, ty);
      S.hits.push({ id: s.id, x0: tx - 3, x1: tx + w + 3, y0: ty - px / 2 - 4, y1: ty + px / 2 + 4 }); });
    x.globalAlpha = 1;
  }
  function step(S) {
    S.raf = 0; let moving = false;
    S.ball.stars.forEach(s => { const [tx, ty] = aim(S, s);
      s.vx = (s.vx + (tx - s.x) * s.k) * KNOBS.damp; s.vy = (s.vy + (ty - s.y) * s.k) * KNOBS.damp; s.x += s.vx; s.y += s.vy;
      if (Math.abs(tx - s.x) > 0.15 || Math.abs(ty - s.y) > 0.15 || Math.abs(s.vx) + Math.abs(s.vy) > 0.05) moving = true; else { s.x = tx; s.y = ty; } });
    paint(S);
    if (moving || S.drag || (S.sel && Date.now() - S.selAt < KNOBS.fadeMs + 40)) kick(S);
  }
  function kick(S) { if (!S.raf && root.requestAnimationFrame) S.raf = root.requestAnimationFrame(() => step(S)); }

  function facts(S) {
    const F = S.facts; F.textContent = ''; const sel = S.sel && S.ball.byId.get(S.sel);
    (sel ? factsOf(S.W, sel) : [S.W.title || '']).forEach((t, i) => { if (!t) return; const p = root.document.createElement('p'); p.textContent = t; if (i === 0 && sel) p.className = 'h'; F.appendChild(p); });
  }
  /* the ball tugs in any direction while the sky fits; once the words below it run past the pane, an up-and-down drag scrolls them
     instead (a sideways drag still tugs it) */
  function fit(S) { if (S.cv) S.cv.style.touchAction = S.host.scrollHeight > S.host.clientHeight + 2 ? 'pan-y' : 'none'; }
  function choose(S, id) {
    S.sel = id; S.selAt = Date.now();
    const s = id && S.ball.byId.get(id); S.touched = new Set(s ? s.partners : []);
    S.cv.setAttribute('aria-label', s ? s.name + (s.partners.length ? ', touching ' + s.partners.map(p => p.split(':').slice(1).join(':')).join(', ') : '') : 'the constellation, a little ball: tap a star');
    facts(S); fit(S); kick(S);
  }
  function size(S) {
    const host = S.host, hs = root.getComputedStyle(host), w = Math.floor(host.clientWidth - (parseFloat(hs.paddingLeft) || 0) - (parseFloat(hs.paddingRight) || 0) - 2);
    S.lastCW = host.clientWidth; if (w < 40) { S.w = 0; return; }
    const R = S.ball.R0, dpr = Math.min(3, root.devicePixelRatio || 1);
    S.w = w; S.h = KNOBS.top + 2 * (R + KNOBS.out * 1.4 + KNOBS.reach / 2) + 18; S.cx = Math.round(w / 2); S.cy = Math.round(KNOBS.top + R + KNOBS.out);
    S.dpr = dpr; S.cv.width = Math.round(w * dpr); S.cv.height = Math.round(S.h * dpr); S.cv.style.width = w + 'px'; S.cv.style.height = S.h + 'px';
    paint(S); fit(S);
  }

  /* ═══ the hand: tap a star (or its word) · tap the sky beside the ball to let go · drag to tug the ball ═══ */
  function hands(S) {
    const cv = S.cv; let down = null;
    const at = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, p: at(e) }; S.drag = false; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!S.drag && Math.hypot(dx, dy) > 6) S.drag = true;
      if (S.drag) { let ox = dx * KNOBS.give, oy = dy * KNOBS.give; const l = Math.hypot(ox, oy); if (l > KNOBS.reach) { ox *= KNOBS.reach / l; oy *= KNOBS.reach / l; }
        S.off = { x: ox, y: oy }; kick(S); } });
    const up = () => { if (!down) return; const was = S.drag, p = down.p; down = null; S.drag = false; S.off = { x: 0, y: 0 }; kick(S);
      if (was) return;
      const hit = S.hits.find(h => p[0] >= h.x0 && p[0] <= h.x1 && p[1] >= h.y0 && p[1] <= h.y1);
      if (hit) return choose(S, hit.id === S.sel ? null : hit.id);
      let best = null, bd = 1e9; S.ball.stars.forEach(s => { const d = Math.hypot(S.cx + s.x - p[0], S.cy + s.y - p[1]); if (d < bd) { bd = d; best = s; } });
      const onBall = Math.hypot(p[0] - S.cx, p[1] - S.cy) <= S.ball.R0 + KNOBS.out * 1.4 + 10;
      if (best && (bd <= KNOBS.spacing || onBall)) choose(S, best.id === S.sel ? null : best.id); else if (S.sel) choose(S, null); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { down = null; S.drag = false; S.off = { x: 0, y: 0 }; kick(S); });
    cv.addEventListener('keydown', e => { const L = S.ball.stars; if (!L.length) return; const i = L.findIndex(s => s.id === S.sel);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); choose(S, L[(i + 1) % L.length].id); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); choose(S, L[(i - 1 + L.length) % L.length].id); }
      if (e.key === 'Escape') choose(S, null); });
  }

  /* draw(host, sq): the ball into host */
  async function draw(host, sq) {
    const S = host._sky || (host._sky = { host, book: null, W: null, ball: null, sel: null, touched: new Set(), selAt: 0, off: { x: 0, y: 0 }, drag: false, raf: 0, hits: [], flare: { i: -1, until: 0 }, w: 0 });
    if (!sq || !Array.isArray(sq.c)) { host.textContent = ''; S.book = null; S.cv = null; const p = root.document.createElement('p'); p.className = 'sky-facts'; p.textContent = 'his constellation comes with your link'; host.appendChild(p); return; }
    const key = JSON.stringify(sq);
    if (S.book !== key || !S.cv) {
      S.book = key; S.W = fromSq(sq); S.ball = build(S.W); S.sel = null; S.touched = new Set();
      host.textContent = '';
      const wrap = root.document.createElement('div'); wrap.className = 'sky';
      S.cv = root.document.createElement('canvas'); S.cv.tabIndex = 0; S.cv.setAttribute('role', 'img');
      S.cv.style.cssText = 'display:block;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:pointer';
      S.ctx = S.cv.getContext('2d');
      S.facts = root.document.createElement('div'); S.facts.className = 'sky-facts';
      wrap.append(S.cv, S.facts); host.appendChild(wrap);
      hands(S); choose(S, null);
    }
    if (root.document.fonts && root.document.fonts.load) { try { await root.document.fonts.load(KNOBS.label + 'px ' + KNOBS.font, 'A'); } catch (e) {} }
    size(S);
    if (!S.ro && root.ResizeObserver) {
      let t = 0;
      S.ro = new root.ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (S.cv && Math.abs(S.host.clientWidth - (S.lastCW || 0)) > 2) size(S); }, 120); });
      S.ro.observe(host);
    }
    if (!S.tw) S.tw = root.setInterval(() => {   // once a second, one star flares (only while the sky is seen)
      if (!S.cv || !S.host.offsetParent || S.sel || !S.ball.stars.length) return;
      if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      S.flare = { i: Math.floor(Math.random() * S.ball.stars.length), until: Date.now() + KNOBS.flareMs }; paint(S);
      root.setTimeout(() => paint(S), KNOBS.flareMs + 20); }, KNOBS.twinkleMs);
  }
  root.SKY = { draw, colourOf, KNOBS };
})(window);
