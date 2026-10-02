/* ═══ share.js — THE SHARE, THE SAVE ═══
   His word, 2026-10-01: "double tap opens it and that's your qr code, with orv in the center. that's the share/save"

   · The kingdom travels INSIDE the link, after the # (#k=<b64url(deflate-raw(json))>): a phone never sends what is after
     the # to any server, so the kingdom is never on the web. Nothing here is stored anywhere but the phone.
   · The QR is drawn module by module; Orv stands in its centre, one module per pixel (two when the code is big), on a
     white field one module wide, his own 19 colours, never redrawn (orv/orv3.json).
   · The strongest error correction (H, then Q, M, L) that keeps the code at version 25 or under, so a phone can read it
     off another phone and Orv can still stand in the middle.
   · It is an <img>: on the phone, hold it to Save to Photos (the save); "share" hands the link to the phone's own share
     sheet; "copy" puts it on the clipboard.
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
  async function decode(s) {
    const out = await new Response(new Blob([unb64u(s)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    if (out.byteLength > 1e6) throw new Error('too big to be a kingdom');
    return JSON.parse(new TextDecoder().decode(out));
  }
  /* THE .INKLING FILE (his word: "that's the endocer for the .inkling file"): the same kingdom the code carries, as a file.
     Made by "save", read by "open" (index.html hands it to the same safe import as a scanned code). */
  function inklingFile(link) {
    const m = /#k=([A-Za-z0-9_-]+)/.exec(link), code = m ? m[1] : '', day = new Date().toLocaleDateString('en-CA');   // his own day, not the world's (YYYY-MM-DD)
    const text = JSON.stringify({ inkling: 1, made: new Date().toISOString(), link, code }, null, 1) + '\n';
    return new File([text], 'kingdom-' + day + '.inkling', { type: 'application/octet-stream' });
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
     pixels switch every beat to four of its own colours, two bits a pixel, 19 bytes a beat (which beat · how many · 16
     bytes of the kingdom · a check), round and round while Orv idles beside it. Another phone's camera ("read") catches the
     beats in any order until it holds them all, then checks the whole (crc16) before anything is taken in. ═══ */
  const FOUR = ['#FF0000', '#70B300', '#00A0FF', '#A640BF'];          // red · green · blue · magenta: the crown's four farthest apart
  const HUES = [0, 82, 202, 285];                                     // their hues, for the camera's eye
  const CK = { beatMs: 180, group: 8, chunk: 15, ground: '#1c1c1c', minSat: 0.32, minVal: 0.22, tilts: [0, 2, -2, 4, -4, 6, -6] };   // a beat: which · how many · 15 bytes · a two-byte check
  let CC = null;
  async function crownCells() { if (CC) return CC; const d = await (await fetch('./crown.json?v=' + (root.INK_V || ''))).json();
    CC = { w: d.w, h: d.h, cells: d.cells.map(x => [x[0], x[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]) }; return CC; }
  function crc16(bytes) { let c = 0xFFFF; for (let n = 0; n < bytes.length; n++) { c ^= bytes[n] << 8; for (let i = 0; i < 8; i++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c; }
  function crc8(bytes, n) { let c = 0; for (let k = 0; k < n; k++) { c ^= bytes[k]; for (let i = 0; i < 8; i++) c = (c & 0x80) ? ((c << 1) ^ 0x07) & 0xFF : (c << 1) & 0xFF; } return c; }
  /* the kingdom → its beats */
  function beats(link) {
    const m = /#k=([A-Za-z0-9_-]+)/.exec(link); if (!m) throw new Error('no kingdom in the link');
    const body = unb64u(m[1]), crc = crc16(body), all = new Uint8Array(6 + body.length);
    all.set([0x49, 0x4B, body.length >> 8, body.length & 255, crc >> 8, crc & 255]); all.set(body, 6);
    const N = Math.ceil(all.length / CK.chunk), P = Math.ceil(N / CK.group); if (N + P > 255) throw new Error('the kingdom is too big for the crown');
    const pay = []; for (let k = 0; k < N; k++) { const x = new Uint8Array(CK.chunk); x.set(all.subarray(k * CK.chunk, (k + 1) * CK.chunk)); pay.push(x); }
    for (let g = 0; g < P; g++) { const x = new Uint8Array(CK.chunk); for (let k = g * CK.group; k < Math.min(N, (g + 1) * CK.group); k++) for (let i = 0; i < CK.chunk; i++) x[i] ^= pay[k][i]; pay.push(x); }   // a spare for every eight
    return pay.map((x, k) => { const f = new Uint8Array(19); f[0] = k; f[1] = N; f.set(x, 2); const c = crc16(f.subarray(0, 17)); f[17] = c >> 8; f[18] = c & 255; return f; });
  }
  const colourAt = (f, cell) => { const bit = cell * 2, b = f[bit >> 3]; return (b >> (6 - (bit & 7))) & 3; };   // two bits a pixel, high first
  /* one beat of the crown, drawn at (X, Y), S px a pixel */
  function paintBeat(g, K, f, X, Y, S) { K.cells.forEach(([r, c], n) => { g.fillStyle = FOUR[colourAt(f, n)]; g.fillRect(X + c * S, Y + r * S, S, S); }); }

  /* THE CAMERA'S EYE: one picture → a beat, or null. The crown is found as the box of vivid pixels in the middle of the view;
     each of its 76 cells is read at its centre (a small average) and named by its hue. */
  function hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx]; }
  function seeBeat(D, W, H, K) {
    /* the crown is the vivid band around the middle: rows (then columns) are counted, and the band grows outward over the
       crown's own empty rows but never across a wider gap (Orv idles a good way beneath) */
    const vivid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, v = hsv(D[i], D[i + 1], D[i + 2]); if (v[1] > CK.minSat && v[2] > CK.minVal) vivid[y * W + x] = 1; }
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
    const f = new Uint8Array(19), rad = Math.max(0, Math.floor(Math.min(cw, ch) * 0.2));
    for (let n = 0; n < K.cells.length; n++) { const [r, c] = K.cells[n], cx = Math.round(x0 + (c + 0.5) * cw), cy = Math.round(y0 + (r + 0.5) * ch);
      let R = 0, G = 0, B = 0, k = 0;
      for (let yy = cy - rad; yy <= cy + rad; yy++) for (let xx = cx - rad; xx <= cx + rad; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = (yy * W + xx) * 4; R += D[i]; G += D[i + 1]; B += D[i + 2]; k++; }
      const v = hsv(R / k, G / k, B / k); if (v[1] < CK.minSat * 0.7) return null;   // a pixel not lit: caught between beats
      let best = 0, bd = 999; HUES.forEach((h, q) => { const dd = Math.min(Math.abs(v[0] - h), 360 - Math.abs(v[0] - h)); if (dd < bd) { bd = dd; best = q; } });
      const bit = n * 2; f[bit >> 3] |= best << (6 - (bit & 7)); }
    if (crc16(f.subarray(0, 17)) !== ((f[17] << 8) | f[18]) || !f[1] || f[0] >= f[1] + Math.ceil(f[1] / CK.group)) return null;
    return f;
  }
  /* one look through the camera: the middle of the view, taken down to a small picture, read */
  const LOOK = { c: null };
  function look(src, vw, vh, K) {
    const side = Math.min(vw, vh) * 0.86, cw = side * (K.w / K.h) * 1.18, sx = (vw - cw) / 2, sy = (vh - side) / 2;   // a little wider than the crown
    const W = 240, H = Math.round(W * side / cw);
    const c = LOOK.c || (LOOK.c = root.document.createElement('canvas')); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    for (const t of CK.tilts) {   // phones are never held quite straight: a few small tilts are tried
      g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.translate(W / 2, H / 2); g.rotate(-t * Math.PI / 180); g.translate(-W / 2, -H / 2);
      g.drawImage(src, sx, sy, cw, side, 0, 0, W, H); g.restore();
      const f = seeBeat(g.getImageData(0, 0, W, H).data, W, H, K); if (f) return f; }
    return null;
  }
  /* beats gathered → the kingdom code, once all are held and the whole checks */
  function gather() {
    const got = {}; let N = 0;
    const best = k => { const g = got[k]; if (!g) return null; return Object.keys(g).sort((a, b) => g[b] - g[a])[0].split(',').map(Number); };
    const data = () => { const out = []; for (let k = 0; k < N; k++) out[k] = best(k);
      for (let g = 0; g < Math.ceil(N / CK.group); g++) { const lo = g * CK.group, hi = Math.min(N, lo + CK.group), miss = [];
        for (let k = lo; k < hi; k++) if (!out[k]) miss.push(k);
        const sp = miss.length === 1 ? best(N + g) : null;
        if (sp) { const x = sp.slice(); for (let k = lo; k < hi; k++) if (k !== miss[0]) for (let i = 0; i < CK.chunk; i++) x[i] ^= out[k][i]; out[miss[0]] = x; } }   // rebuilt, never seen
      return out; };
    return { add(f) { N = f[1]; const k = f[0], key = Array.from(f.subarray(2, 17)).join(','); const g = got[k] || (got[k] = {}); g[key] = (g[key] || 0) + 1; },
      have() { return N ? data().filter(Boolean).length : 0; }, total() { return N; },
      code() { if (!N) return null; const d = data(); for (let k = 0; k < N; k++) if (!d[k]) return null;
        const all = new Uint8Array(N * CK.chunk); d.forEach((x, k) => all.set(x, k * CK.chunk));
        if (all[0] !== 0x49 || all[1] !== 0x4B) return null; const len = (all[2] << 8) | all[3], body = all.slice(6, 6 + len);
        return crc16(body) === ((all[4] << 8) | all[5]) ? b64u(body) : null; } };
  }

  function css() {
    if (root.document.getElementById('inkShareCss')) return;
    const s = root.document.createElement('style'); s.id = 'inkShareCss';
    s.textContent = '#inkShare{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
      'background:rgba(20,20,20,.45);-webkit-backdrop-filter:blur(9px) brightness(.4);backdrop-filter:blur(9px) brightness(.4);padding:24px 18px calc(env(safe-area-inset-bottom) + 24px)}' +
      '#inkShare canvas{image-rendering:pixelated}#inkShare .card{box-shadow:0 10px 34px rgba(0,0,0,.6)}' +   /* a picture, opened */
      '#inkShare .cap{font-family:"W95FA",ui-monospace,monospace;font-size:13px;color:#d0d0d0;text-align:center;max-width:86vw}' +
      '#inkShare .words{display:flex;gap:26px}#inkShare .words button{all:unset;cursor:pointer;font-family:"Dogica",ui-monospace,monospace;font-size:14px;color:#f2f2f2}' +
      '#inkEye{position:fixed;inset:0;z-index:61;background:#000;display:flex;align-items:center;justify-content:center}#inkEye video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '#inkEye .aim{position:absolute;width:62vmin;height:78vmin;max-width:440px;max-height:560px}#inkEye .aim i{position:absolute;width:22px;height:22px;border-color:#f2f2f2;border-style:solid;opacity:.85}' +
      '#inkEye .aim i:nth-child(1){left:0;top:0;border-width:3px 0 0 3px}#inkEye .aim i:nth-child(2){right:0;top:0;border-width:3px 3px 0 0}#inkEye .aim i:nth-child(3){left:0;bottom:0;border-width:0 0 3px 3px}#inkEye .aim i:nth-child(4){right:0;bottom:0;border-width:0 3px 3px 0}' +
      '#inkEye .say{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 34px);text-align:center;font-family:"Dogica",ui-monospace,monospace;font-size:13px;color:#f2f2f2;text-shadow:0 1px 3px #000}';
    root.document.head.appendChild(s);
  }
  /* show(link, {from, onRead}): the crown sends the kingdom, beat after beat, while Orv idles beside it; tap to close */
  async function show(link, o) {
    o = o || {}; css();
    let v = root.document.getElementById('inkShare'); if (v) { v._close && v._close(); }
    v = root.document.createElement('div'); v.id = 'inkShare'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'your kingdom, sent by the crown; tap to close');
    const cv = root.document.createElement('canvas'), oc = root.document.createElement('canvas'), cap = root.document.createElement('div'); cap.className = 'cap'; cv.className = 'card';
    cap.textContent = o.cap || 'your kingdom, sent by the crown · on the other phone: double-tap its crown, then read · tap to close';
    const words = root.document.createElement('div'); words.className = 'words';
    const word = (t, fn) => { const b = root.document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = e => { e.stopPropagation(); fn(); }; words.appendChild(b); return b; };
    if (o.onRead) word('read', () => { v._close(); read(o.onRead); });
    v.append(cv, oc, cap, words);
    let timer = 0; const t0 = Date.now();
    const under = root.document.getElementById('crownSky'); if (under) under.style.visibility = 'hidden';   // the app's own crown never shows through to a camera
    v._close = () => { clearInterval(timer); v.remove(); if (under) under.style.visibility = ''; };
    v.addEventListener('click', () => { if (Date.now() - t0 > 450) v._close(); });
    root.document.body.appendChild(v);
    try {
      const K = await crownCells(), F = beats(link), O = await orv();
      const S = Math.max(5, Math.floor(Math.min(root.innerWidth * 0.46 / K.w, root.innerHeight * 0.3 / K.h))), pad = S * 2;   // a picture's size; a dark margin the camera can tell from the world
      cv.width = K.w * S + pad * 2; cv.height = K.h * S + pad * 2;
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      const os = Math.max(2, Math.floor(S * 0.4)); if (O) { oc.width = O.w * os; oc.height = (O.h + 1) * os; }   // Orv, outside the picture
      const og = oc.getContext('2d'); og.imageSmoothingEnabled = false;
      let order = [], n = 0;
      const shuffle = () => { order = F.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const k = (Math.random() * (i + 1)) | 0; const t = order[i]; order[i] = order[k]; order[k] = t; } };
      const paint = () => { if (n % F.length === 0) shuffle();   // a new order every round: no beat hides in the same blind spot twice
        g.fillStyle = CK.ground; g.fillRect(0, 0, cv.width, cv.height); paintBeat(g, K, F[order[n % F.length]], pad, pad, S);
        if (O) { const lift = Math.sin(Date.now() / 1000 * Math.PI * 2 / 3.6) > 0.35 ? 1 : 0; og.clearRect(0, 0, oc.width, oc.height);
          O.frames[0].forEach((row, y) => Array.from(row).forEach((ch, x) => { const hx = O.pal[ch]; if (!hx) return; og.fillStyle = hx; og.fillRect(x * os, (y + 1 - lift) * os, os, os); })); } };
      paint();
      if (o.from && cv.animate) { const r = cv.getBoundingClientRect(), dx = o.from[0] - (r.left + r.width / 2), dy = o.from[1] - (r.top + r.height / 2);
        cv.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.1)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'steps(6)' }); }
      timer = setInterval(() => { n++; paint(); }, CK.beatMs);
      v.dataset.beats = F.length;
    } catch (e) { cap.textContent = (e && e.message) || 'the crown would not send'; }
    return v;
  }
  /* read(onCode): this phone's camera reads another phone's crown */
  async function read(onCode) {
    css(); const K = await crownCells();
    const eye = root.document.createElement('div'); eye.id = 'inkEye';
    const video = root.document.createElement('video'); video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
    const aim = root.document.createElement('div'); aim.className = 'aim'; aim.innerHTML = '<i></i><i></i><i></i><i></i>';
    const say = root.document.createElement('div'); say.className = 'say'; say.textContent = 'hold the crown inside the corners';
    eye.append(video, aim, say); root.document.body.appendChild(eye);
    let stream = null, raf = 0, done = false;
    const stop = () => { done = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); eye.remove(); };
    eye.addEventListener('click', stop);   // tap to give up
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
    catch (e) { say.textContent = 'the camera would not open (' + ((e && e.name) || 'refused') + ')'; setTimeout(stop, 2600); return; }
    video.srcObject = stream; try { await video.play(); } catch (e) {}
    const G = gather();
    const next = () => { if (done) return; if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(step); else raf = requestAnimationFrame(step); };   // each camera frame, once
    const step = () => { if (done) return;
      if (video.videoWidth) {
        const f = look(video, video.videoWidth, video.videoHeight, K);
        if (f) { G.add(f); say.textContent = 'reading the crown: ' + G.have() + ' / ' + G.total();
          const code = G.code(); if (code) { say.textContent = 'the kingdom is in'; setTimeout(() => { stop(); onCode(code); }, 500); return; } } }
      next(); };
    next();
  }

  root.INKSHARE = { encode, decode, show, read, beats, paintBeat, seeBeat, look, gather, crownCells, inklingFile, readInkling, saveFile, KNOBS, CK };
})(window);
