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
    return JSON.parse(new TextDecoder().decode(out));
  }
  let ORV = null;
  async function orv() { if (ORV) return ORV; try { ORV = await (await fetch('./orv/orv3.json')).json(); } catch (e) { ORV = null; } return ORV; }

  /* the code, drawn: returns a canvas */
  async function draw(link) {
    const QR = (await import('./vendor/qrcode.js')).default;
    let q = null, level = null;
    for (const cap of [KNOBS.maxVersion, KNOBS.lastVersion]) {   // the strongest correction that stays small enough; then anything that fits
      for (const L of KNOBS.levels) { try { const t = QR.create(link, { errorCorrectionLevel: L }); if (t.version <= cap) { q = t; level = L; break; } } catch (e) {} }
      if (q) break; }
    if (!q) throw new Error('the kingdom is too big for one code');
    const n = q.modules.size, Z = KNOBS.quiet, total = n + Z * 2;
    const m = Math.max(3, Math.ceil(900 / total));   // drawn large; the page scales it down crisp
    const cv = root.document.createElement('canvas'); cv.width = cv.height = total * m;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000000';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.modules.get(r, c)) g.fillRect((c + Z) * m, (r + Z) * m, m, m);
    const O = await orv();
    if (O) {
      const k = q.version >= KNOBS.orvBig ? 2 : 1, rows = O.frames[0], w = O.w * k, h = O.h * k;
      const c0 = Z + Math.floor((n - w) / 2), r0 = Z + Math.floor((n - h) / 2);
      g.fillStyle = '#FFFFFF'; g.fillRect((c0 - 1) * m, (r0 - 1) * m, (w + 2) * m, (h + 2) * m);   // one module of white round him
      rows.forEach((row, y) => Array.from(row).forEach((ch, x) => { const hx = O.pal[ch]; if (!hx) return; g.fillStyle = hx; g.fillRect((c0 + x * k) * m, (r0 + y * k) * m, k * m, k * m); }));
    }
    return { canvas: cv, version: q.version, level, size: n };
  }

  function css() {
    if (root.document.getElementById('inkShareCss')) return;
    const s = root.document.createElement('style'); s.id = 'inkShareCss';
    s.textContent = '#inkShare{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;' +
      'background:rgba(40,40,40,.96);padding:24px 18px calc(env(safe-area-inset-bottom) + 24px)}' +
      '#inkShare img{width:min(90vw,72vh);height:auto;image-rendering:pixelated;-webkit-touch-callout:default}' +   /* as big as the screen allows: a phone camera reads it off a Mac too */
      '#inkShare .cap{font-family:"W95FA",ui-monospace,monospace;font-size:13px;color:var(--dim,#a9a9a9);text-align:center;max-width:86vw}' +
      '#inkShare .words{display:flex;gap:26px}#inkShare .words button{all:unset;cursor:pointer;font-family:"Dogica",ui-monospace,monospace;font-size:14px;color:var(--ink,#f2f2f2)}';
    root.document.head.appendChild(s);
  }
  /* show(link, {cap}): the share/save sheet */
  async function show(link, o) {
    o = o || {}; css();
    let v = root.document.getElementById('inkShare'); if (v) v.remove();
    v = root.document.createElement('div'); v.id = 'inkShare'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-label', 'your kingdom as a code');
    const img = root.document.createElement('img'); img.alt = 'a QR code with Orv in its centre: this kingdom';
    const cap = root.document.createElement('div'); cap.className = 'cap'; cap.textContent = o.cap || 'scan it to carry this kingdom · hold it to keep it';
    const words = root.document.createElement('div'); words.className = 'words';
    const word = (t, fn) => { const b = root.document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = e => { e.stopPropagation(); fn(); }; words.appendChild(b); return b; };
    if (navigator.share) word('share', () => navigator.share({ title: 'my kingdom', url: link }).catch(() => {}));
    const cp = word('copy', async () => { try { await navigator.clipboard.writeText(link); cp.textContent = 'copied'; } catch (e) { prompt('the link', link); } });
    word('close', () => v.remove());
    v.append(img, cap, words);
    v.addEventListener('click', e => { if (e.target === v) v.remove(); });
    root.document.body.appendChild(v);
    try { const d = await draw(link); img.src = d.canvas.toDataURL('image/png'); img.dataset.version = d.version; img.dataset.level = d.level; }
    catch (e) { cap.textContent = (e && e.message) || 'the code would not draw'; }
    return v;
  }
  root.INKSHARE = { encode, decode, draw, show, KNOBS };
})(window);
