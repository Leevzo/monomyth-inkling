/* ═══ sky.js — SQUATCH'S CONSTELLATION: his own wooden sword (his word, 2026-10-01: "put orv and squatch on a clicking wheel …
   when I rotate them, they have their own wooden sword, squatch has his costellation"). The film's world as a hexagonal
   constellation, characters and places, carried over from the Scriptorium's World (~/Scriptorium/app/world.js), which carries
   the King's own primitives from orv-hex.js / THE ANCHOR: the lattice, the three-line bracket, a word's bottom-left ink pixel
   on its hex centre, lines that walk the honeycomb's edges. "the words should be anchored on polygons, and they are just
   white until clicked": every word stands white on its bracket; tap one and it, and all it touches, wear their colours while
   the lines walk to them. The data comes only inside the King's link (#k=…, its "sq" part), never from this repository.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const KNOBS = {
    hexR: 9,                    // the Anchor's HEXR — one grade, always
    margin: { x: 2, y: 22 },    // px: col 0's bracket stands this far in; row 0's words clear the top
    right: 4,                   // px kept clear at the right edge
    font: "'Dogica', ui-monospace, monospace",   // the phone's own pixel face
    px: 12,                     // a word
    capPx: 9,                   // 'where' · 'who', the Field's own words for the two kinds
    gapPx: 10,                  // the least air between two words on a row
    rowStep: 2,                 // lattice rows from one row of words to the next: the words, one empty row the lines walk in
    bandGap: 3,                 // rows from the last place to the people
    avoid: 9,                   // the Anchor's findPath: what crossing ink (or another word's bracket) costs
    trunk: 0.5,                 // an edge another line from the same word already walks
    pad: 6,                     // search box padding, in hexes
    bed: 0.10,                  // the lattice under everything: this share from the ground grey to the dim grey
    mark: { opacity: 0.5, w: 1.5, wSel: 2 },
    line: { w: 1.5 },
    quiet: 0.28                 // a word that is not touched by the selection
  };

  /* ── THE ANCHOR'S LATTICE, verbatim (via orv-hex.js) ── */
  const HEXR = KNOBS.hexR;
  const W_STEP = Math.sqrt(3) * HEXR;
  const V_STEP = 1.5 * HEXR;
  const H_INSET = HEXR * (Math.cos(Math.PI / 6) - 0.5);
  function hexCenter(col, row) { const off = (row & 1) ? W_STEP / 2 : 0; return { cx: col * W_STEP + off, cy: row * V_STEP }; }
  function vert(cx, cy, s, k) { const a = Math.PI / 180 * (60 * k - 90); return [cx + s * Math.cos(a), cy + s * Math.sin(a)]; }
  const pf = n => (Math.round(n * 100) / 100).toString();
  function bracketPath(cx, cy, s) {
    const v5 = vert(cx, cy, s, 5), v4 = vert(cx, cy, s, 4), v3 = vert(cx, cy, s, 3), v2 = vert(cx, cy, s, 2);
    return `M${pf(v5[0])} ${pf(v5[1])} L${pf(v4[0])} ${pf(v4[1])} L${pf(v3[0])} ${pf(v3[1])} L${pf(v2[0])} ${pf(v2[1])}`;
  }
  const VOFF = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];
  const vKey = (X, Y) => X + ',' + Y;
  const vXY = (X, Y) => ({ x: X * W_STEP / 2, y: Y * HEXR / 2 });
  function hexVerts(col, row) { const X0 = 2 * col + (row & 1), Y0 = 3 * row; return VOFF.map(([dx, dy]) => [X0 + dx, Y0 + dy]); }
  const eKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  /* ── the word's real ink (orv-hex canvasInk, verbatim but for the face) ── */
  const INKC = new Map();
  function canvasInk(text, px) {
    const key = px + '|' + text;
    if (INKC.has(key)) return INKC.get(key);
    const cv = canvasInk.cv || (canvasInk.cv = root.document.createElement('canvas'));
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const font = px + 'px ' + KNOBS.font;
    ctx.font = font;
    const advance = ctx.measureText(text).width;
    const padX = Math.ceil(px), padY = Math.ceil(px * 1.5);
    const w = Math.ceil(advance) + padX * 2, h = padY * 2;
    cv.width = w; cv.height = h;
    ctx.clearRect(0, 0, w, h); ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
    ctx.fillText(text, padX, padY);
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    const m = maxX < 0 ? { left: 0, bottom: -1, w: Math.max(1, Math.round(advance)), asc: Math.round(px * 0.7) }
                       : { left: minX - padX, bottom: maxY - padY, w: maxX - minX + 1, asc: padY - minY };
    INKC.set(key, m);
    return m;
  }
  function stand(word, px, col, row) {
    const ink = canvasInk(word, px), { cx, cy } = hexCenter(col, row);
    const x = Math.round(cx - H_INSET - ink.left), y = Math.round(cy - ink.bottom);
    const box = { x0: x + ink.left, x1: x + ink.left + ink.w, y0: y - ink.asc, y1: y + ink.bottom + 1 };
    return { word, px, col, row, cx, cy, x, y, box };
  }
  const firstCol = (row, minX) => Math.ceil((minX + W_STEP / 2 - ((row & 1) ? W_STEP / 2 : 0)) / W_STEP - 1e-9);
  const colFrom = (row, x) => Math.ceil((x + W_STEP / 2 - ((row & 1) ? W_STEP / 2 : 0)) / W_STEP - 1e-9);

  /* ── the colour: the Magic's name law into THE 23 (magic.html hashIdx), the three dark golds kept off ── */
  const WHEEL = ['#FF7A12', '#FF12A1', '#FA12FF', '#9212FF', '#2A12FF', '#126EFF', '#12D6FF', '#12FFC2', '#12FF5A', '#22FF12', '#8AFF12', '#F2FF12'];
  function colourOf(name) {   // the Magic's name law, into the phone's own twelve
    let h = 0; const s = String(name == null ? '' : name);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return WHEEL[Math.abs(h) % WHEEL.length];
  }

  /* ── reading the pages' own index (the brain's index.json): who stands where ── */
  function readWorld(ix) {
    const scenes = Array.isArray(ix && ix.scenes) ? ix.scenes : [];
    const locOfScene = new Map(scenes.map(s => [s.number, String(s.location || '').trim()]));
    const placeOrder = [];
    scenes.forEach(s => { const l = String(s.location || '').trim(); if (l && !placeOrder.includes(l)) placeOrder.push(l); });
    Object.keys((ix && ix.locations) || {}).forEach(l => { if (!placeOrder.includes(l)) placeOrder.push(l); });
    const chars = (ix && ix.characters) || {};
    const people = Object.keys(chars).sort((a, b) => ((chars[b].dialogue_lines || 0) - (chars[a].dialogue_lines || 0)) ||
                                                    ((chars[a].first_appearance || 0) - (chars[b].first_appearance || 0)) || (a < b ? -1 : 1));
    const where = {}, who = {};
    placeOrder.forEach(l => { who[l] = []; });
    people.forEach(p => {
      where[p] = [];
      (chars[p].scenes || []).forEach(n => {
        const l = locOfScene.get(n);
        if (l && !where[p].includes(l)) where[p].push(l);
        if (l && who[l] && !who[l].includes(p)) who[l].push(p);
      });
    });
    const sceneCount = l => scenes.filter(s => String(s.location || '').trim() === l).length;
    return { places: placeOrder, people, where, who, chars, sceneCount };
  }

  /* ═══ THE LAYOUT — pure: (the world, the width) → where every word stands. Same inputs, same places. ═══ */
  function layout(W, width) {
    const OX = KNOBS.margin.x + W_STEP / 2, OY = KNOBS.margin.y;
    const minX = -OX + KNOBS.margin.x, maxX = width - OX - KNOBS.right;
    const items = [], caps = [];
    let row = 0;
    function band(cap, names, kind) {
      if (!names.length) return;
      const c0 = firstCol(row, minX), cc = hexCenter(c0, row);
      caps.push({ word: cap, x: Math.round(cc.cx - H_INSET), y: Math.round(cc.cy - V_STEP * 1.1) });
      let col = c0;
      names.forEach(name => {
        let it = stand(name, KNOBS.px, col, row);
        if (it.box.x1 > maxX && col > firstCol(row, minX)) { row += KNOBS.rowStep; col = firstCol(row, minX); it = stand(name, KNOBS.px, col, row); }
        it.kind = kind; it.id = kind + ':' + name; it.name = name;
        items.push(it);
        col = colFrom(row, it.box.x1 + KNOBS.gapPx);
      });
      row += KNOBS.rowStep;
    }
    band('where', W.places, 'place');
    row += KNOBS.bandGap - KNOBS.rowStep + 1;
    band('who', W.people, 'person');
    const height = Math.ceil(row * V_STEP + OY + 6);
    return { width, height, ox: OX, oy: OY, minX, maxX, items, caps };
  }

  /* ── a line walks the honeycomb's edges from one word's bracket to each of its partners' (orv-hex trace, ported) ── */
  function trace(L, from, targets) {
    const cols = L.items.map(it => it.col), rows = L.items.map(it => it.row);
    const cMin = Math.min.apply(null, cols) - KNOBS.pad, cMax = Math.max.apply(null, cols) + KNOBS.pad;
    const rMin = -1, rMax = Math.max.apply(null, rows) + 1;
    const xLo = L.minX, xHi = L.maxX + KNOBS.right - 0.5, yLo = -L.oy + 1, yHi = L.height - L.oy - 1;
    const inside = (X, Y) => { const p = vXY(X, Y); return p.x >= xLo - 0.01 && p.x <= xHi + 0.01 && p.y >= yLo && p.y <= yHi; };
    const adj = new Map(), edges = new Map();
    for (let r = rMin; r <= rMax; r++) for (let c = cMin; c <= cMax; c++) {
      const vs = hexVerts(c, r);
      for (let k = 0; k < 6; k++) {
        const [X1, Y1] = vs[k], [X2, Y2] = vs[(k + 1) % 6];
        if (!inside(X1, Y1) || !inside(X2, Y2)) continue;
        const a = vKey(X1, Y1), b = vKey(X2, Y2), ek = eKey(a, b);
        if (edges.has(ek)) continue;
        edges.set(ek, { a, b, p: vXY(X1, Y1), q: vXY(X2, Y2) });
        (adj.get(a) || adj.set(a, []).get(a)).push(b);
        (adj.get(b) || adj.set(b, []).get(b)).push(a);
      }
    }
    const bracketEdges = it => { const v = hexVerts(it.col, it.row).map(([X, Y]) => vKey(X, Y)); return [eKey(v[5], v[4]), eKey(v[4], v[3]), eKey(v[3], v[2])]; };
    const marks = new Map();
    L.items.forEach(it => bracketEdges(it).forEach(e => marks.set(e, it.id)));
    const crosses = (p, q, b) => {
      for (let s = 0; s <= 8; s++) {
        const x = p.x + (q.x - p.x) * s / 8, y = p.y + (q.y - p.y) * s / 8;
        if (x >= b.x0 - 1 && x <= b.x1 + 1 && y >= b.y0 - 1 && y <= b.y1 + 1) return true;
      }
      return false;
    };
    const inked = new Map();
    edges.forEach((e, k) => { inked.set(k, L.items.some(it => crosses(e.p, e.q, it.box))); });
    const used = new Set(), out = [];
    const gv = hexVerts(from.col, from.row);
    const sources = [5, 4, 3, 2].map(k => vKey(gv[k][0], gv[k][1])).filter(k => adj.has(k));
    targets.forEach(t => {
      const tv = hexVerts(t.col, t.row), goal = new Set([5, 4, 3, 2].map(k => vKey(tv[k][0], tv[k][1])));
      const own = new Set(bracketEdges(from).concat(bracketEdges(t)));
      const cost = (a, b) => {
        const k = eKey(a, b);
        if (used.has(k)) return KNOBS.trunk;
        return (inked.get(k) || (marks.has(k) && !own.has(k))) ? KNOBS.avoid : 1;
      };
      const path = dijkstra(adj, sources, goal, cost);
      if (path) for (let j = 1; j < path.length; j++) used.add(eKey(path[j - 1], path[j]));
      out.push({ to: t.id, pts: (path || []).map(k => { const [X, Y] = k.split(',').map(Number); return vXY(X, Y); }) });
    });
    return out;
  }
  function dijkstra(adj, sources, targets, cost) {   // orv-hex's, verbatim: ties broken by push order, so the same board walks the same way
    const dist = new Map(), prev = new Map(), heap = [];
    let seq = 0, hit = null;
    const less = (a, b) => a.d < b.d || (a.d === b.d && a.s < b.s);
    const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
    sources.forEach(s => { dist.set(s, 0); push({ k: s, d: 0, s: seq++ }); });
    while (heap.length) {
      const cur = pop();
      if (cur.d > dist.get(cur.k)) continue;
      if (targets.has(cur.k)) { hit = cur.k; break; }
      for (const n of adj.get(cur.k) || []) {
        const nd = cur.d + cost(cur.k, n);
        if (nd < (dist.has(n) ? dist.get(n) : Infinity) - 1e-9) { dist.set(n, nd); prev.set(n, cur.k); push({ k: n, d: nd, s: seq++ }); }
      }
    }
    if (hit == null) return null;
    const path = []; let k = hit;
    while (k != null) { path.unshift(k); k = prev.get(k); }
    return path;
  }

  /* ── the greys (the room's own, read live so light and dark both hold) ── */
  const rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim()); const v = m ? parseInt(m[1], 16) : 0x454545; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  function greys() {
    const cs = root.getComputedStyle(root.document.documentElement), v = n => (cs.getPropertyValue(n) || '').trim();
    const bg = v('--ground') || '#454545', dim = v('--dim') || '#a9a9a9';
    return { bed: mix(bg, dim, KNOBS.bed * 1.4), dim, faint: v('--faint') || dim, ink: v('--ink') || '#f2f2f2' };
  }

  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    const n = root.document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(k => { if (attrs[k] != null) n.setAttribute(k, String(attrs[k])); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function bedPath(L) {
    const cMin = firstCol(0, L.minX) - 1, cMax = Math.ceil((L.maxX + L.ox) / W_STEP) + 1;
    const rMax = Math.ceil((L.height - L.oy) / V_STEP) + 1, seen = new Set();
    let d = '';
    for (let r = -1; r <= rMax; r++) for (let c = cMin; c <= cMax; c++) {
      const vs = hexVerts(c, r);
      for (let k = 0; k < 6; k++) {
        const a = vs[k], b = vs[(k + 1) % 6], key = eKey(vKey(a[0], a[1]), vKey(b[0], b[1]));
        if (seen.has(key)) continue; seen.add(key);
        const p = vXY(a[0], a[1]), q = vXY(b[0], b[1]);
        if (p.x < L.minX - W_STEP || q.x < L.minX - W_STEP || p.x > L.maxX + W_STEP || q.x > L.maxX + W_STEP) continue;
        d += 'M' + pf(p.x) + ' ' + pf(p.y) + 'L' + pf(q.x) + ' ' + pf(q.y);
      }
    }
    return d;
  }

  /* ═══ the drawing ═══ */
  const STATE = { book: null, ix: null, W: null, sel: null, host: null, ro: null, lastW: 0 };
  function partnersOf(W, it) { return it.kind === 'place' ? (W.who[it.name] || []).map(n => 'person:' + n) : (W.where[it.name] || []).map(n => 'place:' + n); }
  function factsOf(W, it) {
    const beats = (W.beats || []).filter(b => it.kind === 'place' ? b.place === it.name : b.who.includes(it.name)).map(b => b.text);
    const head = it.kind === 'place' ? it.name + ((W.who[it.name] || []).length ? ' · ' + W.who[it.name].join(', ') : '')
                                     : it.name + ((W.where[it.name] || []).length ? ' · ' + W.where[it.name].join(', ') : '');
    return [head].concat(beats);
  }
  function render() {
    const host = STATE.host, W = STATE.W;
    if (!host || !W) return;
    const width = Math.max(200, Math.floor(host.clientWidth - 4));
    STATE.lastW = width;
    const L = layout(W, width), G = greys();
    host.textContent = '';
    const wrap = root.document.createElement('div'); wrap.className = 'sky';
    const svg = el('svg', { width: L.width, height: L.height, viewBox: '0 0 ' + L.width + ' ' + L.height, role: 'group',
                            'aria-label': 'the constellation: the places and the people; tap a word to see what it touches' });
    svg.style.cssText = 'display:block;overflow:hidden;font-family:' + KNOBS.font + ';-webkit-user-select:none;user-select:none;-webkit-font-smoothing:none';
    const defs = el('defs', {}, svg);
    const crisp = el('filter', { id: 'skyCrisp', filterUnits: 'userSpaceOnUse', x: -L.ox - 6, y: -L.oy - 6, width: L.width + 12, height: L.height + 12,
                                 'color-interpolation-filters': 'sRGB' }, defs);
    el('feFuncA', { type: 'discrete', tableValues: '0 1' }, el('feComponentTransfer', {}, crisp));
    const g0 = el('g', { transform: 'translate(' + pf(L.ox) + ' ' + pf(L.oy) + ')' }, svg);
    el('path', { d: bedPath(L), fill: 'none', stroke: G.bed, 'stroke-width': 1, 'shape-rendering': 'crispEdges', 'pointer-events': 'none' }, g0);
    L.caps.forEach(c => { el('text', { x: c.x, y: c.y, 'font-size': KNOBS.capPx, fill: G.faint, 'pointer-events': 'none', 'letter-spacing': '0.08em' }, g0).textContent = c.word; });
    const sel = STATE.sel && L.items.find(it => it.id === STATE.sel);
    const touched = new Set(sel ? partnersOf(W, sel).concat([sel.id]) : []);
    if (sel) {
      const targets = L.items.filter(it => touched.has(it.id) && it.id !== sel.id);
      const lines = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pointer-events': 'none', filter: 'url(#skyCrisp)' }, g0);
      trace(L, sel, targets).forEach(T => {
        if (T.pts.length > 1) el('polyline', { points: T.pts.map(p => pf(p.x) + ',' + pf(p.y)).join(' '), stroke: colourOf(sel.name), 'stroke-width': KNOBS.line.w }, lines);
      });
    }
    L.items.forEach(it => {
      const on = sel && it.id === sel.id, quiet = sel && !touched.has(it.id);
      const g = el('g', { class: 'w-word', 'data-id': it.id, tabindex: 0, role: 'button', 'aria-pressed': on ? 'true' : 'false', opacity: quiet ? KNOBS.quiet : 1 }, g0);
      g.style.cursor = 'pointer';
      el('rect', { x: Math.min(it.box.x0, it.cx - HEXR) - 2, y: it.box.y0 - 3, width: Math.max(it.box.x1, it.cx) - Math.min(it.box.x0, it.cx - HEXR) + 4,
                   height: Math.max(it.box.y1, it.cy + HEXR) - it.box.y0 + 5, fill: 'transparent' }, g);
      el('path', { d: bracketPath(it.cx, it.cy, HEXR), fill: 'none', stroke: on ? G.ink : G.dim, 'stroke-width': on ? KNOBS.mark.wSel : KNOBS.mark.w,
                   'stroke-opacity': on || (sel && touched.has(it.id)) ? 1 : KNOBS.mark.opacity, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'shape-rendering': 'crispEdges' }, g);
      el('text', { x: it.x, y: it.y, 'font-size': it.px, fill: (sel && touched.has(it.id)) ? colourOf(it.name) : G.ink, 'pointer-events': 'none' }, g).textContent = it.word;
      const flip = () => { STATE.sel = on ? null : it.id; render(); };
      g.addEventListener('click', flip);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
    wrap.appendChild(svg);
    const facts = root.document.createElement('div'); facts.className = 'sky-facts';
    (sel ? factsOf(W, sel) : [W.title || '', 'tap a word to see what it touches']).forEach((t, i) => { if (!t) return; const p = root.document.createElement('p'); p.textContent = t; if (i === 0 && sel) p.className = 'h'; facts.appendChild(p); });
    wrap.appendChild(facts);
    host.appendChild(wrap);
  }

  /* from the link's "sq" part: {title, c: [people], l: [places], s: [[placeIndex, [personIndex, …], "the beat, in the tape's words"], …]} */
  function fromSq(sq) {
    const people = (sq.c || []).map(String), places = (sq.l || []).map(String), where = {}, who = {}, beats = [];
    places.forEach(l => { who[l] = []; }); people.forEach(p => { where[p] = []; });
    (sq.s || []).forEach(([li, ci, text]) => { const l = places[li]; if (l == null) return; const ws = (ci || []).map(i => people[i]).filter(Boolean);
      ws.forEach(p => { if (!where[p].includes(l)) where[p].push(l); if (!who[l].includes(p)) who[l].push(p); });
      beats.push({ place: l, who: ws, text: String(text || '') }); });
    return { title: String(sq.title || ''), places, people, where, who, beats, chars: {}, sceneCount: l => beats.filter(b => b.place === l).length };
  }
  /* draw(host, sq): the constellation into host */
  async function draw(host, sq) {
    STATE.host = host;
    if (!sq || !Array.isArray(sq.c)) { host.textContent = ''; const p = root.document.createElement('p'); p.className = 'sky-facts'; p.textContent = 'his constellation comes with your link'; host.appendChild(p); return; }
    if (STATE.book !== sq) { STATE.book = sq; STATE.sel = null; STATE.W = fromSq(sq); }
    if (root.document.fonts && root.document.fonts.load) { try { await root.document.fonts.load(KNOBS.px + 'px ' + KNOBS.font, 'A'); INKC.clear(); } catch (e) {} }
    render();
    if (!STATE.ro && root.ResizeObserver) {
      let t = 0;
      STATE.ro = new root.ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => {
        if (STATE.host && STATE.host.querySelector('.sky') && Math.abs(STATE.host.clientWidth - 4 - STATE.lastW) > 2) render(); }, 120); });
      STATE.ro.observe(host);
    }
  }
  root.SKY = { draw, colourOf, layout, KNOBS };
})(window);
