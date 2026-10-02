/* ═══ share.js — THE SHARE, THE SAVE ═══
   His word, 2026-10-01: "double tap opens it and that's your qr code, with orv in the center. that's the share/save"

   · The kingdom travels INSIDE the link, after the # (#k=<b64url(deflate-raw(json))>): a phone never sends what is after
     the # to any server, so the kingdom is never on the web. Nothing here is stored anywhere but the phone.
   · The QR is drawn module by module; Orv stands in its centre, one module per pixel (two when the code is big), on a
     white field one module wide, his own 19 colours, never redrawn (orv/orv3.json).
   · The strongest error correction (H, then Q, M, L) that keeps the code at version 25 or under, so a phone can read it
     off another phone and Orv can still stand in the middle.
   · Its words, as they stand (2026-10-02): "read" opens this phone's camera on another phone's crown; "save" hands the whole
     drawer to the phone's own share sheet as one .inkling satchel (Files, iCloud Drive, AirDrop); "open" reads one back.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KNOBS = { side: 340, quiet: 4, levels: ['H', 'Q', 'M', 'L'], maxVersion: 25 /* a phone reads this from a phone */, lastVersion: 40,
                  orvBig: 99 /* version at which Orv would stand two modules a pixel (off: one is enough) */ };
  const b64u = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function encode(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    const out = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return b64u(new Uint8Array(out));
  }
  async function decode(s) {   // read in pieces, and stopped at a megabyte: a bad link can never swell inside the phone
    if (String(s).length > 1.5e6) throw new Error('too big to be a kingdom');
    const rd = new Blob([unb64u(s)]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(), parts = []; let n = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; if ((n += value.length) > 1e6) { try { rd.cancel(); } catch (e) {} throw new Error('too big to be a kingdom'); } parts.push(value); }
    return JSON.parse(new TextDecoder().decode(await new Blob(parts).arrayBuffer()));
  }
  /* THE .INKLING FILE (his word: "that's the endocer for the .inkling file"): the same kingdom the code carries, as a file.
     Made by "save", read by "open" (index.html hands it to the same safe import as a scanned code). */
  function inklingFile(link) {
    const m = /#k=([A-Za-z0-9_-]+)/.exec(link), code = m ? m[1] : '', day = new Date().toLocaleDateString('en-CA');   // his own day, not the world's (YYYY-MM-DD)
    const text = JSON.stringify({ inkling: 1, made: new Date().toISOString(), link, code }, null, 1) + '\n';
    return new File([text], 'kingdom-' + day + '.inkling', { type: 'text/plain' });   // the share sheet takes text
  }
  function readInkling(text) {   // a .inkling file (or any text holding a kingdom link) → its code, or null
    try { const o = JSON.parse(text); if (o && typeof o.code === 'string' && /^[A-Za-z0-9_-]+$/.test(o.code)) return o.code; if (o && o.link) text = String(o.link); } catch (e) {}
    const m = /#k=([A-Za-z0-9_-]+)/.exec(String(text)); return m ? m[1] : null;
  }
  async function saveFile(link) {
    const f = inklingFile(link);
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: f.name }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = root.document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; root.document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  let ORV = null;
  async function orv() { if (ORV) return ORV; try { ORV = await (await fetch('./orv/orv3.json?v=' + (root.INK_V || ''))).json(); } catch (e) { ORV = null; } return ORV; }

  /* ═══ THE CROWN CODE (his words, 2026-10-01: "qr code is encoded in the crown, it twinkles in different colors as orv does
     his idle animation" … "build the throne using the corwn, you an switch as many pixels as you need. just the crown, not a
     qr" … "it will only be display and read with camera"). The kingdom is sent by the crown itself: one big crown whose 76
     pixels switch every beat to four of its own colours, two bits a pixel, 19 bytes a beat (which beat · how many · 15
     bytes of the kingdom · a check), round and round while Orv idles beside it. Another phone's camera ("read") catches the
     beats in any order until it holds them all, then checks the whole (crc16) before anything is taken in. ═══ */
  const FOUR = ['#FF0000', '#70B300', '#00A0FF', '#A640BF'];          // red · green · blue · magenta: the crown's four farthest apart
  const HUES = [0, 82, 202, 285];                                     // their hues, for the camera's eye
  const CK = { lens: [117, 100, 133], most: 230, chunk: 15, ground: '#1c1c1c', minSat: 0.32, minVal: 0.22, tilts: [0, 2, -2, 4, -4, 6, -6] };   // a beat: which · how many · 15 bytes · a two-byte check
  let CC = null;
  async function crownCells() { if (CC) return CC; const d = await (await fetch('./crown.json?v=' + (root.INK_V || ''))).json();
    CC = { w: d.w, h: d.h, cells: d.cells.map(x => [x[0], x[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]) }; return CC; }
  function crc16(bytes) { let c = 0xFFFF; for (let n = 0; n < bytes.length; n++) { c ^= bytes[n] << 8; for (let i = 0; i < 8; i++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c; }
  /* THE FOUNTAIN (a reader worked out the stall at 141 of 149, 2026-10-02: the coupon collector — the last few beats always take
     longest, and no shuffle can fix it). The kingdom's N chunks are sent as 255 beats: beats 0..N-1 are the chunks themselves
     (the very beats sent before), and every other beat is a spare of everything, the mix of a half of all the chunks, drawn
     the same way on both phones. ANY N different beats (a few more at worst) rebuild the whole. Same 19-byte beat. */
  function rng(seed, N) { let a = (Math.imul(seed + 1, 0x9E3779B1) ^ Math.imul(N, 0x85EBCA77)) >>> 0;   // mulberry32: both phones draw the same mix
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; }; }
  function mix(seed, N) { const m = new Uint8Array((N + 7) >> 3);
    if (seed < N) { m[seed >> 3] |= 1 << (seed & 7); return m; }   // the chunks themselves
    const r = rng(seed, N); let on = 0;
    for (let i = 0; i < N; i += 32) { const w = r(); for (let b = 0; b < 32 && i + b < N; b++) if ((w >>> b) & 1) { m[(i + b) >> 3] |= 1 << ((i + b) & 7); on++; } }
    if (on < 2) { m.fill(0); m[0] |= 1; m[(N - 1) >> 3] |= 1 << ((N - 1) & 7); } return m; }   // never a lone spare
  /* the kingdom → its beats */
  function beats(link) {
    const m = /#k=([A-Za-z0-9_-]+)/.exec(link); if (!m) throw new Error('no kingdom in the link');
    const body = unb64u(m[1]), crc = crc16(body), all = new Uint8Array(6 + body.length);
    all.set([0x49, 0x4B, body.length >> 8, body.length & 255, crc >> 8, crc & 255]); all.set(body, 6);
    const N = Math.ceil(all.length / CK.chunk); if (N > CK.most) throw new Error('the kingdom is too big for the crown');
    const pay = []; for (let k = 0; k < N; k++) { const x = new Uint8Array(CK.chunk); x.set(all.subarray(k * CK.chunk, (k + 1) * CK.chunk)); pay.push(x); }
    return Array.from({ length: 255 }, (_, sd) => { const mk = mix(sd, N), x = new Uint8Array(CK.chunk);
      for (let k = 0; k < N; k++) if ((mk[k >> 3] >> (k & 7)) & 1) for (let i = 0; i < CK.chunk; i++) x[i] ^= pay[k][i];
      const f = new Uint8Array(19); f[0] = sd; f[1] = N; f.set(x, 2); const c = crc16(f.subarray(0, 17)); f[17] = c >> 8; f[18] = c & 255; return f; });
  }
  const colourAt = (f, cell) => { const bit = cell * 2, b = f[bit >> 3]; return (b >> (6 - (bit & 7))) & 3; };   // two bits a pixel, high first
  /* one beat of the crown, drawn at (X, Y), S px a pixel */
  function paintBeat(g, K, f, X, Y, S) { K.cells.forEach(([r, c], n) => { g.fillStyle = FOUR[colourAt(f, n)]; g.fillRect(X + c * S, Y + r * S, S, S); }); }

  /* THE CAMERA'S EYE: one picture → a beat, or null. The crown is found as the box of vivid pixels in the middle of the view;
     each of its 76 cells is read at its centre (a small average) and named by its hue. */
  function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx]; }
  const Z0 = crc16(new Uint8Array(17)), MEND = new Map();   // the syndrome of each one-pixel mistake (76 pixels × 3 wrong colours, every one its own)
  for (let n = 0; n < 76; n++) for (let w = 1; w < 4; w++) { const e = new Uint8Array(19), b = n * 2; e[b >> 3] = w << (6 - (b & 7)); MEND.set(crc16(e.subarray(0, 17)) ^ Z0 ^ ((e[17] << 8) | e[18]), [n, w]); }
  const put = (f, n, q) => { const b = n * 2; f[b >> 3] = (f[b >> 3] & ~(3 << (6 - (b & 7)))) | (q << (6 - (b & 7))); };
  const good = f => crc16(f.subarray(0, 17)) === ((f[17] << 8) | f[18]) && f[1] > 0 && f[1] <= CK.most && f[0] < 255;
  const EYE = { tint: null };
  function seeBeat(D, W, H, K) {
    /* the crown is the vivid band around the middle: rows (then columns) are counted, and the band grows outward over the
       crown's own empty rows but never across a wider gap (Orv idles a good way beneath) */
    const vivid = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < W * H; p++, i += 4) { const r = D[i], g = D[i + 1], b = D[i + 2], mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
      vivid[p] = mx > CK.minVal * 255 && mx - mn > CK.minSat * mx ? 1 : 0; }
    const band = (count, n, mid, tol) => { let a = mid, b = mid; while (a > 0 && count(a) === 0 && mid - a < tol) a--; if (count(a) === 0) { a = mid; while (b < n - 1 && count(b) === 0 && b - mid < tol) b++; a = b; }
      if (count(a) === 0) return null; let lo = a, hi = a, gap = 0;
      for (let k = a - 1; k >= 0; k--) { if (count(k)) { lo = k; gap = 0; } else if (++gap > tol) break; }
      gap = 0; for (let k = a + 1; k < n; k++) { if (count(k)) { hi = k; gap = 0; } else if (++gap > tol) break; }
      return [lo, hi]; };
    const rowN = y => { let c = 0; for (let x = 0; x < W; x++) c += vivid[y * W + x]; return c > 1 ? c : 0; };
    const ry = band(rowN, H, Math.floor(H / 2), Math.round(H * 0.07)); if (!ry) return null;
    const colN = x => { let c = 0; for (let y = ry[0]; y <= ry[1]; y++) c += vivid[y * W + x]; return c > 1 ? c : 0; };
    const rx = band(colN, W, Math.floor(W / 2), Math.round(W * 0.07)); if (!rx) return null;
    const x0 = rx[0], x1 = rx[1], y0 = ry[0], y1 = ry[1];
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cw = bw / K.w, ch = bh / K.h;
    if (cw < 2 || Math.abs((bw / bh) / (K.w / K.h) - 1) > 0.22) return null;   // not the crown's own shape
    const seen = [], rad = Math.max(0, Math.floor(Math.min(cw, ch) * 0.2));
    for (let n = 0; n < K.cells.length; n++) { const [r, c] = K.cells[n], cx = Math.round(x0 + (c + 0.5) * cw), cy = Math.round(y0 + (r + 0.5) * ch);
      let R = 0, G = 0, B = 0, k = 0;
      for (let yy = cy - rad; yy <= cy + rad; yy++) for (let xx = cx - rad; xx <= cx + rad; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = (yy * W + xx) * 4; R += D[i]; G += D[i + 1]; B += D[i + 2]; k++; }
      seen.push(hsv(R / k, G / k, B / k)); }
    const unknown = []; seen.forEach((v, n) => { if (v[1] < CK.minSat * 0.7) unknown.push(n); });
    if (unknown.length > 2) return null;   // many unlit: a picture caught between beats
    for (const tint of [...new Set([EYE.tint == null ? 0 : EYE.tint, 0, 15, -15, 30, -30])]) {   // the tint that worked last, then the rest (cheap: the picture is read once)
      const g0 = new Uint8Array(19), doubt = [];
      seen.forEach((v, n) => { if (unknown.includes(n)) return;
        const d = HUES.map(h => Math.abs(((v[0] - tint - h) % 360 + 540) % 360 - 180)), o = [0, 1, 2, 3].sort((a, b) => d[a] - d[b]);
        put(g0, n, o[0]); doubt.push([d[o[1]] - d[o[0]], n]); });
      const tries = unknown.length === 0 ? [[]] : unknown.length === 1 ? [[0], [1], [2], [3]] : [0, 1, 2, 3].flatMap(a => [0, 1, 2, 3].map(b => [a, b]));
      for (const t of tries) { const g = g0.slice(); unknown.forEach((n, i) => put(g, n, t[i])); if (good(g)) { EYE.tint = tint; return g; } }
      if (!unknown.length) { const mend = MEND.get(crc16(g0.subarray(0, 17)) ^ ((g0[17] << 8) | g0[18]));   // one pixel seen wrong leaves its own mark
        const unsure = doubt.sort((a, b) => a[0] - b[0]).slice(0, 2).map(x => x[1]);
        if (mend && unsure.includes(mend[0])) { const g = g0.slice(), b = mend[0] * 2; g[b >> 3] ^= mend[1] << (6 - (b & 7)); if (good(g)) { EYE.tint = tint; return g; } } }
    }
    return null;
  }
  /* one look through the camera: the middle of the view, taken down to a small picture, read */
  const LOOK = { c: null };
  function look(src, vw, vh, K) {
    const side = Math.min(vw, vh) * 0.86, cw = side * (K.w / K.h) * 1.18, sx = (vw - cw) / 2, sy = (vh - side) / 2;   // a little wider than the crown
    const W = 320, H = Math.round(W * side / cw);   // more of the picture kept: a crown held a hand-span away still has its pixels
    const c = LOOK.c || (LOOK.c = root.document.createElement('canvas')); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    const k = look.k = ((look.k || 0) + 1) % (CK.tilts.length - 1), tilts = [look.hit || 0, look.hit ? 0 : CK.tilts[1 + k]];   // not all seven every frame: the phone keeps up
    for (const t of tilts) {   // phones are never held quite straight: the straight look, and one small tilt a frame in turn
      g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.translate(W / 2, H / 2); g.rotate(-t * Math.PI / 180); g.translate(-W / 2, -H / 2);
      g.drawImage(src, sx, sy, cw, side, 0, 0, W, H); g.restore();
      const f = seeBeat(g.getImageData(0, 0, W, H).data, W, H, K); if (f) { look.hit = t; return f; } }
    if (look.hit && Math.random() < 0.2) look.hit = 0;   // now and then let go of the old tilt
    return null;
  }
  /* beats gathered → the kingdom code: each new beat is reduced against the ones held (Gaussian elimination over GF(2)); when
     the held beats span all N chunks the whole is solved and checked (its own crc) before anything is taken in */
  function solver(N, plain) {
    let rank = 0; const piv = [], seen = new Set();
    return { N, plain,
      add(f) { if (seen.has(f[0]) || (plain && f[0] >= N)) return false; seen.add(f[0]);
        const m = mix(f[0], N), x = f.slice(2, 17);
        for (let c = 0; c < N; c++) { if (!((m[c >> 3] >> (c & 7)) & 1)) continue;
          const p = piv[c]; if (!p) { piv[c] = [m, x]; rank++; return true; }
          for (let i = 0; i < m.length; i++) m[i] ^= p[0][i]; for (let i = 0; i < CK.chunk; i++) x[i] ^= p[1][i]; }
        return false; },
      rank() { return rank; },
      code() { if (rank < N) return null;
        const P = piv.map(p => [p[0].slice(), p[1].slice()]);
        for (let c = N - 1; c >= 0; c--) { const [m, x] = P[c];
          for (let j = c + 1; j < N; j++) if ((m[j >> 3] >> (j & 7)) & 1) { const q = P[j]; for (let i = 0; i < m.length; i++) m[i] ^= q[0][i]; for (let i = 0; i < CK.chunk; i++) x[i] ^= q[1][i]; } }
        const all = new Uint8Array(N * CK.chunk); for (let k = 0; k < N; k++) all.set(P[k][1], k * CK.chunk);
        if (all[0] !== 0x49 || all[1] !== 0x4B) return null; const len = (all[2] << 8) | all[3], body = all.slice(6, 6 + len);
        return crc16(body) === ((all[4] << 8) | all[5]) ? b64u(body) : null; } };
  }
  /* beats gathered → the kingdom code. Each kingdom size has its own solver (a stray beat of another size, the app's idle crown
     caught before the double-tap, can never lock the read). A solver that holds every chunk but whose whole will not check (an
     older crown's spares, or one beat misread) starts over; every other start reads only the plain beats, which every build sends
     the same. No wrong kingdom can ever come in: the whole is checked (its own crc) before anything is taken. */
  function gather() {
    const S = new Map(); let tries = 0, got = null;
    const best = () => { let b = null; S.forEach(v => { if (!b || v.rank() / v.N > b.rank() / b.N) b = v; }); return b; };
    return {
      add(f) { const N = f[1]; let v = S.get(N); if (!v) { if (S.size >= 8) { let low = null; S.forEach(w => { if (!low || w.rank() < low.rank()) low = w; }); S.delete(low.N); } v = solver(N, false); S.set(N, v); }
        v.add(f); if (v.rank() === N && !got) { got = v.code(); if (!got) { tries++; S.set(N, solver(N, tries % 2 === 1)); return 'again'; } } return true; },
      have() { const b = best(); return b ? b.rank() : 0; }, total() { const b = best(); return b ? b.N : 0; }, tries() { return tries; },
      code() { return got; } };
  }

  function css() {
    if (root.document.getElementById('inkShareCss')) return;
    const s = root.document.createElement('style'); s.id = 'inkShareCss';
    s.textContent = '#inkShare{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
      'background:rgba(20,20,20,.45);-webkit-backdrop-filter:blur(9px) brightness(.4);backdrop-filter:blur(9px) brightness(.4);padding:calc(env(safe-area-inset-top) + 16px) 18px calc(env(safe-area-inset-bottom) + 24px);justify-content:safe center;overflow:auto}' +
      '#inkShare canvas{image-rendering:pixelated}#inkShare .card{box-shadow:0 10px 34px rgba(0,0,0,.6)}' +   /* a picture, opened */
      '#inkShare .cap{font-family:"W95FA",ui-monospace,monospace;font-size:13px;color:#d0d0d0;text-align:center;max-width:86vw}' +
      '#inkShare .words{display:flex;gap:26px}#inkShare .words button{all:unset;cursor:pointer;font-family:"Dogica",ui-monospace,monospace;font-size:14px;color:#f2f2f2}' +
      '#inkEye{position:fixed;inset:0;z-index:61;background:#000;display:flex;align-items:center;justify-content:center}#inkEye video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '#inkEye .aim{position:absolute;width:44vmin;height:56vmin;max-width:320px;max-height:400px}#inkEye .aim i{position:absolute;width:22px;height:22px;border-color:#f2f2f2;border-style:solid;opacity:.85}' +
      '#inkEye .aim i:nth-child(1){left:0;top:0;border-width:3px 0 0 3px}#inkEye .aim i:nth-child(2){right:0;top:0;border-width:3px 3px 0 0}#inkEye .aim i:nth-child(3){left:0;bottom:0;border-width:0 0 3px 3px}#inkEye .aim i:nth-child(4){right:0;bottom:0;border-width:0 3px 3px 0}' +
      '#inkEye .say{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 34px);text-align:center;font-family:"Dogica",ui-monospace,monospace;font-size:13px;color:#f2f2f2;text-shadow:0 1px 3px #000}';
    root.document.head.appendChild(s);
  }
  /* both screens stay awake while the crown speaks (a read outlasts a 30-second Auto-Lock, and touching the sender would close it) */
  async function awake() { try { return navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) { return null; } }
  /* show(link, {from, onRead, onSave, onOpen}): the crown sends the kingdom, beat after beat, while Orv idles beside it; tap to close */
  async function show(link, o) {
    o = o || {}; css();
    let v = root.document.getElementById('inkShare'); if (v) { v._close && v._close(); }
    v = root.document.createElement('div'); v.id = 'inkShare'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'your kingdom, sent by the crown; tap to close');
    const cv = root.document.createElement('canvas'), oc = root.document.createElement('canvas'), cap = root.document.createElement('div'); cap.className = 'cap'; cv.className = 'card';
    cap.textContent = o.cap || 'your kingdom, sent by the crown · on the other phone: double-tap its crown, then read · tap to close';
    const words = root.document.createElement('div'); words.className = 'words';
    const word = (t, fn) => { const b = root.document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = e => { e.stopPropagation(); fn(); }; words.appendChild(b); return b; };
    if (o.onRead) word('read', () => { v._close(); read(o.onRead); });
    if (o.onSave) word('save', () => o.onSave());   // the whole drawer, off the phone (the share sheet needs this very tap)
    if (o.onOpen) word('open', () => { v._close(); o.onOpen(); });
    v.append(cv, oc, cap, words);
    const t0 = Date.now(), closers = [];
    const under = root.document.getElementById('crownSky'); if (under) under.style.visibility = 'hidden';   // the app's own crown never shows through to a camera
    let lock = null, raf = 0; const back = async () => { if (root.document.visibilityState === 'visible' && v.isConnected) lock = await awake(); };   // iOS lets the lock go when the app is left
    v._close = () => { cancelAnimationFrame(raf); v.remove(); if (under) under.style.visibility = ''; try { lock && lock.release(); } catch (e) {} root.document.removeEventListener('visibilitychange', back); closers.forEach(fn => fn()); };
    v.addEventListener('click', () => { if (Date.now() - t0 > 450) v._close(); });
    root.document.body.appendChild(v); awake().then(l => { if (!v.isConnected) { try { l && l.release(); } catch (e) {} } else lock = l; }); root.document.addEventListener('visibilitychange', back);
    try {
      const K = await crownCells(), F = beats(link), O = await orv();
      let S = 5, pad = 5, os = 2; const g = cv.getContext('2d'), og = oc.getContext('2d');
      const size = () => { S = Math.max(5, Math.floor(Math.min(root.innerWidth * 0.86 / K.w, root.innerHeight * 0.5 / K.h))); pad = S;   // as wide as the screen: a phone's lens cannot focus closer than a hand-span
        cv.width = K.w * S + pad * 2; cv.height = K.h * S + pad * 2; g.imageSmoothingEnabled = false;
        os = Math.max(2, Math.floor(S * 0.3)); if (O) { oc.width = O.w * os; oc.height = (O.h + 1) * os; oc.style.marginTop = (S * 4) + 'px'; } og.imageSmoothingEnabled = false; };   // Orv, well clear of the crown's foot
      size(); const onTurn = () => { size(); paint(); }; root.addEventListener('resize', onTurn); closers.push(() => root.removeEventListener('resize', onTurn));   // the phone turned: the card fits again
      let order = [], n = 0;
      const shuffle = () => { order = F.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const k = (Math.random() * (i + 1)) | 0; const t = order[i]; order[i] = order[k]; order[k] = t; } };
      const paint = () => { if (n % F.length === 0) shuffle();   // a new order every round: no beat hides in the same blind spot twice
        g.fillStyle = CK.ground; g.fillRect(0, 0, cv.width, cv.height); paintBeat(g, K, F[order[n % F.length]], pad, pad, S);
        if (O) { const lift = Math.sin(Date.now() / 1000 * Math.PI * 2 / 3.6) > 0.35 ? 1 : 0; og.clearRect(0, 0, oc.width, oc.height);
          O.frames[0].forEach((row, y) => Array.from(row).forEach((ch, x) => { const hx = O.pal[ch]; if (!hx) return; og.fillStyle = hx; og.fillRect(x * os, (y + 1 - lift) * os, os, os); })); } };
      paint();
      if (o.from && cv.animate) { const r = cv.getBoundingClientRect(), dx = o.from[0] - (r.left + r.width / 2), dy = o.from[1] - (r.top + r.height / 2);
        cv.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.1)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'steps(6)' }); }
      let due = 0; const tick = now => { if (!v.isConnected) return; if (now >= due) { n++; paint(); due = now + CK.lens[n % CK.lens.length] - 4; } raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);   // on the screen's own clock, the lengths varied so no camera's rate can lock onto them
      v.dataset.beats = F.length; if (F[0][1] > 180) cap.textContent += ' · the crown is ' + Math.round(F[0][1] / CK.most * 100) + '% full';
    } catch (e) { cap.textContent = (e && e.message) || 'the crown would not send'; }
    return v;
  }
  /* read(onCode): this phone's camera reads another phone's crown */
  async function read(onCode) {
    css(); const K = await crownCells(); EYE.tint = null;
    const eye = root.document.createElement('div'); eye.id = 'inkEye';
    const video = root.document.createElement('video'); video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
    const aim = root.document.createElement('div'); aim.className = 'aim'; aim.innerHTML = '<i></i><i></i><i></i><i></i>';
    const say = root.document.createElement('div'); say.className = 'say'; say.textContent = 'hold the crown a hand-span away, inside the corners';
    eye.append(video, aim, say); root.document.body.appendChild(eye);
    let stream = null, raf = 0, done = false, lock = null; awake().then(l => { if (done) { try { l && l.release(); } catch (e) {} } else lock = l; });
    const stop = () => { done = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); eye.remove(); try { lock && lock.release(); } catch (e) {} };
    eye.addEventListener('click', stop);   // tap to give up
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false }); }
    catch (e) { say.textContent = 'the camera would not open (' + ((e && e.name) || 'refused') + ')'; setTimeout(stop, 2600); return; }
    if (done) { stream.getTracks().forEach(t => t.stop()); return; }   // given up while the camera was still coming: its light goes out
    video.srcObject = stream; try { await video.play(); } catch (e) {}
    const G = gather();
    const next = () => { if (done) return; if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(step); else raf = requestAnimationFrame(step); };   // each camera frame, once
    const step = () => { if (done) return;
      if (video.videoWidth) {
        const f = look(video, video.videoWidth, video.videoHeight, K);
        if (f) { const r = G.add(f); say.textContent = r === 'again' ? 'reading again (an older crown, or a beat misread)' : 'reading the crown: ' + G.have() + ' / ' + G.total();   // the rank: it only runs backwards when it starts over, and says so
          const code = G.code(); if (code) { say.textContent = 'the kingdom is in'; setTimeout(() => { stop(); onCode(code); }, 500); return; } } }
      next(); };
    next();
  }

  root.INKSHARE = { encode, decode, show, read, beats, paintBeat, seeBeat, look, gather, crownCells, inklingFile, readInkling, saveFile, KNOBS, CK };
})(window);
