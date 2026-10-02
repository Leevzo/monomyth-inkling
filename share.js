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

  /* ═══ THE THRONE (his word, 2026-10-01: "build the throne using the corwn, you an switch as many pixels as you need. just the
     crown, not a qr"). The kingdom written in crowns: the very bytes a #k= link carries, as base-6 digits, one digit to a crown
     cell, each cell switched to one of the crown's own six colours; as many crowns as it takes, laid out square, Orv standing
     in the middle crown's place. A picture of it (the saved one) is read back by readThrone. ═══ */
  const SIX = ['#FF0000', '#FF8000', '#70B300', '#2D8686', '#00A0FF', '#A640BF'];   // the crown's six, a digit each (0–5)
  const TK = { cell: 6, margin: 3, gap: 1, ground: '#454545', min: 3 };            // px a cell, cells of margin and gap, the ground
  let CC = null;
  async function crownCells() { if (CC) return CC; const d = await (await fetch('./crown.json?v=' + (root.INK_V || ''))).json();
    CC = { w: d.w, h: d.h, cells: d.cells.map(x => [x[0], x[1], String(x[2]).toUpperCase()]).sort((a, b) => a[0] - b[0] || a[1] - b[1]) }; return CC; }
  function crc16(bytes) { let c = 0xFFFF; for (let n = 0; n < bytes.length; n++) { c ^= bytes[n] << 8; for (let i = 0; i < 8; i++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c; }
  const toDigits = bytes => { const out = []; for (let i = 0; i < bytes.length; i += 2) { let v = (bytes[i] << 8) | (i + 1 < bytes.length ? bytes[i + 1] : 0); for (let k = 0; k < 7; k++) { out.push(v % 6); v = Math.floor(v / 6); } } return out; };
  const fromDigits = (d, n, at) => { const out = new Uint8Array(n); for (let j = 0; j < n; j += 2) { let v = 0; for (let k = 6; k >= 0; k--) v = v * 6 + (d[at + (j / 2) * 7 + k] || 0); out[j] = (v >> 8) & 255; if (j + 1 < n) out[j + 1] = v & 255; } return out; };
  const slotsFor = (C) => { const all = []; for (let i = 0; i < C * C; i++) all.push(i); const mid = Math.floor(C * C / 2); return { data: all.filter(i => i !== mid), mid }; };
  function layout(C, K) { return { cols: C * K.w + (C - 1) * TK.gap, rows: C * K.h + (C - 1) * TK.gap, at: i => [Math.floor(i / C) * (K.h + TK.gap), (i % C) * (K.w + TK.gap)] }; }
  /* the encoder: link → the throne, drawn */
  async function draw(link) {
    const K = await crownCells(), m = /#k=([A-Za-z0-9_-]+)/.exec(link); if (!m) throw new Error('no kingdom in the link');
    const body = unb64u(m[1]), crc = crc16(body), head = new Uint8Array([0x49, 0x4B, body.length >> 8, body.length & 255, crc >> 8, crc & 255]);
    const bytes = new Uint8Array(head.length + body.length); bytes.set(head); bytes.set(body, head.length);
    const digits = toDigits(bytes), per = K.cells.length, need = Math.ceil(digits.length / per);
    let C = TK.min; while (C * C - 1 < need || C % 2 === 0) C++;   // always odd, so Orv stands at the very middle
    const L = layout(C, K), S = slotsFor(C), px = TK.cell, Z = TK.margin;
    const cv = root.document.createElement('canvas'); cv.width = (L.cols + Z * 2) * px; cv.height = (L.rows + Z * 2) * px;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = TK.ground; g.fillRect(0, 0, cv.width, cv.height);
    let k = 0; const cells = [];
    S.data.forEach(slot => { const [r0, c0] = L.at(slot); K.cells.forEach(([r, c, hex]) => { const dgt = k < digits.length ? digits[k] : -1; k++;
      g.fillStyle = dgt >= 0 ? SIX[dgt] : hex; g.fillRect((Z + c0 + c) * px, (Z + r0 + r) * px, px, px); cells.push([Z + r0 + r, Z + c0 + c]); }); });
    const O = await orv(), [mr, mc] = L.at(S.mid);
    const orvAt = (gg, lift) => { if (!O) return; gg.fillStyle = TK.ground; gg.fillRect((Z + mc) * px, (Z + mr) * px, K.w * px, K.h * px);
      const ox = Z + mc + Math.floor((K.w - O.w) / 2), oy = Z + mr + Math.floor((K.h - O.h) / 2) - lift;
      O.frames[0].forEach((row, y) => Array.from(row).forEach((ch, x) => { const hx = O.pal[ch]; if (!hx) return; gg.fillStyle = hx; gg.fillRect((ox + x) * px, (oy + y) * px, px, px); })); };
    orvAt(g, 0);
    return { canvas: cv, crowns: C * C - 1, size: C, m: px, dark: cells, orvAt, version: 'throne ' + C + '×' + C, level: digits.length + ' digits' };
  }
  /* the decoder: a picture of a throne → its kingdom code (null if it is not one) */
  async function readThrone(src) {
    const K = await crownCells();
    const bmp = src instanceof Blob ? await createImageBitmap(src) : src;
    const cv = root.document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height; const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0); const D = g.getImageData(0, 0, cv.width, cv.height).data, W = cv.width, H = cv.height;
    const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], GR = rgb(TK.ground), P = SIX.map(rgb);
    const far = (i, c) => Math.abs(D[i] - c[0]) + Math.abs(D[i + 1] - c[1]) + Math.abs(D[i + 2] - c[2]);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;   // the throne's own extent: everything that is not the ground
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { const i = (y * W + x) * 4; if (far(i, GR) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    for (let C = TK.min; C <= 24; C++) {
      const L = layout(C, K), cw = bw / L.cols, ch = bh / L.rows; if (Math.abs(cw - ch) / cw > 0.08 || cw < 1) continue;
      const S = slotsFor(C), digits = [];
      S.data.forEach(slot => { const [r0, c0] = L.at(slot); K.cells.forEach(([r, c]) => {
        const x = x0 + (c0 + c + 0.5) * cw, y = y0 + (r0 + r + 0.5) * ch, rad = Math.max(0, Math.floor(Math.min(cw, ch) * 0.22));   // the cell's own middle, averaged
        let R = 0, G = 0, B = 0, n = 0;
        for (let yy = Math.round(y) - rad; yy <= Math.round(y) + rad; yy++) for (let xx = Math.round(x) - rad; xx <= Math.round(x) + rad; xx++) {
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = (yy * W + xx) * 4; R += D[i]; G += D[i + 1]; B += D[i + 2]; n++; }
        R /= n || 1; G /= n || 1; B /= n || 1;
        let best = 0, bd = Infinity; P.forEach((p, k) => { const d = Math.abs(R - p[0]) + Math.abs(G - p[1]) + Math.abs(B - p[2]); if (d < bd) { bd = d; best = k; } }); digits.push(best); }); });
      const head = fromDigits(digits, 6, 0); if (head[0] !== 0x49 || head[1] !== 0x4B) continue;
      const len = (head[2] << 8) | head[3], all = fromDigits(digits, 6 + len + ((6 + len) % 2), 0), body = all.slice(6, 6 + len);
      if (crc16(body) !== ((head[4] << 8) | head[5])) continue;
      return b64u(body);
    }
    return null;
  }

  function css() {
    if (root.document.getElementById('inkShareCss')) return;
    const s = root.document.createElement('style'); s.id = 'inkShareCss';
    s.textContent = '#inkShare{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;' +
      'background:rgba(20,20,20,.38);-webkit-backdrop-filter:blur(9px) brightness(.55);backdrop-filter:blur(9px) brightness(.55);padding:24px 18px calc(env(safe-area-inset-bottom) + 24px)}' +
      '#inkShare .pic{position:relative;width:min(90vw,72vh);line-height:0;box-shadow:0 10px 34px rgba(0,0,0,.55)}' +   /* a picture, opened */
      '#inkShare .pic img,#inkShare .pic canvas{width:100%;height:auto;image-rendering:pixelated}' +
      '#inkShare .pic img{-webkit-touch-callout:default}#inkShare .pic canvas{position:absolute;left:0;top:0;pointer-events:none}' +
      '#inkShare .cap{font-family:"W95FA",ui-monospace,monospace;font-size:13px;color:#d0d0d0;text-align:center;max-width:86vw}' +
      '#inkShare .words{display:flex;gap:26px}#inkShare .words button{all:unset;cursor:pointer;font-family:"Dogica",ui-monospace,monospace;font-size:14px;color:#f2f2f2}';
    root.document.head.appendChild(s);
  }
  const TWINKLE = ['#FF0000', '#FF8000', '#70B300', '#2D8686', '#00A0FF', '#A640BF'];   // the crown's six
  /* show(link, {cap, from: [x, y]}): the share/save. It opens out of the crown (from) like a picture; everything under it blurs
     and dims; its dark pixels twinkle in the crown's colours while Orv breathes in its heart; one tap closes it. A still copy
     lies under the twinkle, so a long press keeps the code (the encoder of the .inkling). */
  async function show(link, o) {
    o = o || {}; css();
    let v = root.document.getElementById('inkShare'); if (v) { v._close && v._close(); }
    v = root.document.createElement('div'); v.id = 'inkShare'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'your kingdom as a code; tap to close');
    const pic = root.document.createElement('div'); pic.className = 'pic';
    const img = root.document.createElement('img'); img.alt = 'the throne: your kingdom written in crowns, Orv in the middle';
    const tw = root.document.createElement('canvas'); pic.append(img, tw);
    const cap = root.document.createElement('div'); cap.className = 'cap'; cap.textContent = o.cap || 'your kingdom, written in crowns · hold it to keep the picture · open reads one back · tap to close';
    const words = root.document.createElement('div'); words.className = 'words';
    const word = (t, fn) => { const b = root.document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = e => { e.stopPropagation(); fn(); }; words.appendChild(b); return b; };
    if (navigator.share) word('share', () => navigator.share({ title: 'my kingdom', url: link }).catch(() => {}));
    word('save', () => saveFile(link));   // the .inkling file
    if (o.onOpen) word('open', () => { v._close(); o.onOpen(); });   // read a .inkling file
    const cp = word('copy', async () => { try { await navigator.clipboard.writeText(link); cp.textContent = 'copied'; } catch (e) { prompt('the link', link); } });
    v.append(pic, cap, words);
    let timer = 0; const t0 = Date.now();
    v._close = () => { clearInterval(timer); v.remove(); };
    v.addEventListener('click', () => { if (Date.now() - t0 > 450) v._close(); });   // tap again to close (the double-tap's own click never does)
    root.document.body.appendChild(v);
    try {
      const d = await draw(link); img.src = d.canvas.toDataURL('image/png'); img.dataset.version = d.version; img.dataset.level = d.level;
      tw.width = d.canvas.width; tw.height = d.canvas.height; const g = tw.getContext('2d'); g.imageSmoothingEnabled = false;
      if (o.from && pic.animate) { const r = pic.getBoundingClientRect(), dx = o.from[0] - (r.left + r.width / 2), dy = o.from[1] - (r.top + r.height / 2);
        pic.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.1)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'steps(6)' }); }   // it opens out of the crown, a click at a time
      const lit = []; let step = 0;
      const paint = () => { g.drawImage(d.canvas, 0, 0);
        for (let i = lit.length - 1; i >= 0; i--) { const L = lit[i]; if (--L.life <= 0) { lit.splice(i, 1); continue; } g.globalAlpha = 0.45; g.fillStyle = '#FFFFFF'; g.fillRect(L.x * d.m, L.y * d.m, d.m, d.m); g.globalAlpha = 1; }   // a crown cell catching the light
        const t = Date.now() / 1000, lift = Math.sin(t * Math.PI * 2 / 3.6) > 0.35 ? 1 : 0;   // Orv's breath, one module
        d.orvAt(g, lift); };
      const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      paint();
      if (!reduce) timer = setInterval(() => { step++;
        const add = Math.max(1, Math.round(d.dark.length * 0.006));
        for (let i = 0; i < add; i++) { const p = d.dark[(Math.random() * d.dark.length) | 0]; lit.push({ y: p[0], x: p[1], c: TWINKLE[(step + i) % TWINKLE.length], life: 3 + ((Math.random() * 5) | 0) }); }
        paint(); }, 110);
    } catch (e) { cap.textContent = (e && e.message) || 'the code would not draw'; }
    return v;
  }
  root.INKSHARE = { encode, decode, draw, show, inklingFile, readInkling, readThrone, saveFile, KNOBS };
})(window);
