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

  /* the code, drawn: returns the still canvas and what the twinkle needs */
  async function draw(link) {
    const QR = (await import('./vendor/qrcode.js')).default;
    let q = null, level = null;
    for (const cap of [KNOBS.maxVersion, KNOBS.lastVersion]) {   // the strongest correction that stays small enough; past that, the smallest code that fits
      for (const L of (cap === KNOBS.lastVersion ? KNOBS.levels.slice().reverse() : KNOBS.levels)) { try { const t = QR.create(link, { errorCorrectionLevel: L }); if (t.version <= cap) { q = t; level = L; break; } } catch (e) {} }
      if (q) break; }
    if (!q) throw new Error('the kingdom is too big for one code');
    const n = q.modules.size, Z = KNOBS.quiet, total = n + Z * 2;
    const m = Math.max(3, Math.ceil(900 / total));   // drawn large; the page scales it down crisp
    const cv = root.document.createElement('canvas'); cv.width = cv.height = total * m;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000000';
    const dark = [];
    const O = await orv(), k = O && q.version >= KNOBS.orvBig ? 2 : 1;
    const fw = O ? O.w * k + 2 : 0, fh = O ? O.h * k + 2 : 0, fc = Z + Math.floor((n - (fw - 2)) / 2) - 1, fr = Z + Math.floor((n - (fh - 2)) / 2) - 1;
    const inField = (r, c) => O && c + Z >= fc && c + Z < fc + fw && r + Z >= fr && r + Z < fr + fh;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.modules.get(r, c)) { g.fillRect((c + Z) * m, (r + Z) * m, m, m); if (!inField(r, c)) dark.push([r + Z, c + Z]); }
    const orvAt = (gg, lift) => { if (!O) return; gg.fillStyle = '#FFFFFF'; gg.fillRect(fc * m, fr * m, fw * m, fh * m);   // one module of white round him
      O.frames[0].forEach((row, y) => Array.from(row).forEach((ch, x) => { const hx = O.pal[ch]; if (!hx) return; gg.fillStyle = hx; gg.fillRect((fc + 1 + x * k) * m, (fr + 1 - lift + y * k) * m, k * m, k * m); })); };
    orvAt(g, 0);
    return { canvas: cv, version: q.version, level, size: n, m, dark, orvAt };
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
    const img = root.document.createElement('img'); img.alt = 'a QR code with Orv in its centre: your .inkling';
    const tw = root.document.createElement('canvas'); pic.append(img, tw);
    const cap = root.document.createElement('div'); cap.className = 'cap'; cap.textContent = o.cap || 'your .inkling · scan it to carry this kingdom · save it as a file · tap to close';
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
        for (let i = lit.length - 1; i >= 0; i--) { const L = lit[i]; if (--L.life <= 0) { lit.splice(i, 1); continue; } g.fillStyle = L.c; g.fillRect(L.x * d.m, L.y * d.m, d.m, d.m); }
        const t = Date.now() / 1000, lift = Math.sin(t * Math.PI * 2 / 3.6) > 0.35 ? 1 : 0;   // Orv's breath, one module
        d.orvAt(g, lift); };
      const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      paint();
      if (!reduce) timer = setInterval(() => { step++;
        const add = Math.max(1, Math.round(d.dark.length * 0.012));
        for (let i = 0; i < add; i++) { const p = d.dark[(Math.random() * d.dark.length) | 0]; lit.push({ y: p[0], x: p[1], c: TWINKLE[(step + i) % TWINKLE.length], life: 3 + ((Math.random() * 5) | 0) }); }
        paint(); }, 110);
    } catch (e) { cap.textContent = (e && e.message) || 'the code would not draw'; }
    return v;
  }
  root.INKSHARE = { encode, decode, draw, show, inklingFile, readInkling, saveFile, KNOBS };
})(window);
