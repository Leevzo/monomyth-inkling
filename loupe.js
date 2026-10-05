/* ══════════════════════════════════════════════════════════════════════════
   ⟡ THE LOUPE — the Forge's naming glass.
   Hold it over any program in the kingdom and every piece of the screen tells
   you what it is called, what it is made of, and which token painted it — so
   the King can instruct the machine in the machine's own words.

   ONE FILE. NO DEPENDENCIES. Works two ways:
     ① drop it in:   <script src="loupe.js"></script>   (before </body>)
     ② carry it in:  the bookmarklet on forge/index.html — no edit to the app

   IT LIVES IN A SHADOW ROOT so no program's CSS can touch it, and no part of
   it can be mistaken for the program itself.

   CONTROLS
     the ⟡ tab, bottom-left   ·  or  ⌥L        open / close the glass
     hover                                     name the piece under the cursor
     click                                     PIN it (clicks are held while
                                               the glass is open — the program
                                               cannot be operated by accident)
     G                                         the grid
     B                                         the box-model paint
     ↑ / ↓                                     walk to the parent / first child
     C                                         copy the whole reading
     Esc                                       unpin, then close
   ══════════════════════════════════════════════════════════════════════════ */
(() => {
  if (window.__loupe) { window.__loupe.toggle(); return; }

  /* ── the glass's own room, sealed from the program ── */
  const host = document.createElement('div');
  host.setAttribute('data-loupe', 'host');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  const root = host.attachShadow({ mode: 'open' });
  document.documentElement.appendChild(host);

  root.innerHTML = `
  <style>
    :host{ all:initial }
    *{ box-sizing:border-box; margin:0; font-family:ui-monospace,Menlo,Consolas,monospace }
    .tab{ position:fixed; left:10px; bottom:10px; pointer-events:auto; cursor:pointer;
          background:#1D1E20; color:#E9E9E6; border:2px solid #E9E9E6; padding:5px 9px;
          font-size:11px; font-weight:800; letter-spacing:.16em; box-shadow:2px 2px 0 rgba(0,0,0,.5) }
    .tab.on{ background:#E9E9E6; color:#1D1E20 }

    /* the grid */
    .grid{ position:fixed; inset:0; display:none;
           background:
             repeating-linear-gradient(to right, rgba(120,200,255,.30) 0 1px, transparent 1px 64px),
             repeating-linear-gradient(to bottom, rgba(120,200,255,.30) 0 1px, transparent 1px 64px),
             repeating-linear-gradient(to right, rgba(120,200,255,.11) 0 1px, transparent 1px 8px),
             repeating-linear-gradient(to bottom, rgba(120,200,255,.11) 0 1px, transparent 1px 8px) }
    .grid.on{ display:block }

    /* THE OUTLINE — dotted, never a slab of colour. The content box wears
       marching ants so the eye reads it as a SELECTION, not a stain. */
    .lay{ position:fixed; display:none; pointer-events:none; background-color:transparent }
    .lay.on{ display:block }
    .m{ border:1px dashed rgba(246,178,107,.70) }
    .b{ border:1px dashed rgba(233,233,230,.45) }
    .p{ border:1px dotted rgba(140,214,160,.80) }
    .c{ --a:rgba(150,205,255,.95);
        background-image:
          repeating-linear-gradient(90deg,var(--a) 0 5px,transparent 5px 10px),
          repeating-linear-gradient(90deg,var(--a) 0 5px,transparent 5px 10px),
          repeating-linear-gradient(0deg,var(--a) 0 5px,transparent 5px 10px),
          repeating-linear-gradient(0deg,var(--a) 0 5px,transparent 5px 10px);
        background-size:100% 1px,100% 1px,1px 100%,1px 100%;
        background-position:0 0,0 100%,0 0,100% 0;
        background-repeat:no-repeat;
        animation:ants .6s linear infinite }
    @keyframes ants{ to{ background-position:10px 0,-10px 100%,0 -10px,100% 10px } }

    /* THE NUMBERS — a crosshair and a readout that ride the cursor everywhere */
    .cross{ position:fixed; display:none; background:rgba(150,205,255,.28) }
    .cross.on{ display:block }
    .cx{ left:0; width:100%; height:1px } .cy{ top:0; width:1px; height:100% }
    .read{ position:fixed; display:none; background:#1D1E20; color:#E9E9E6;
           border:1px solid rgba(150,205,255,.85); padding:2px 6px; white-space:nowrap;
           font-size:10.5px; font-weight:800; letter-spacing:.06em; line-height:1.35 }
    .read.on{ display:block }
    .read i{ display:block; font-style:normal; color:#8E8F92; font-weight:400; letter-spacing:.03em }

    /* the size badge that rides the piece */
    .badge{ position:fixed; display:none; background:#1D1E20; color:#E9E9E6; border:1px solid #E9E9E6;
            font-size:10px; font-weight:800; letter-spacing:.08em; padding:2px 5px; white-space:nowrap }
    .badge.on{ display:block }

    /* the reading */
    .panel{ position:fixed; top:12px; right:12px; width:378px; max-height:calc(100vh - 24px);
            display:none; flex-direction:column; pointer-events:auto; overflow:hidden;
            background:#1D1E20; color:#E9E9E6; border:2px solid #E9E9E6;
            box-shadow:3px 3px 0 rgba(0,0,0,.55); font-size:11.5px; line-height:1.45 }
    .panel.on{ display:flex } .panel.left{ right:auto; left:12px }

    .head{ flex:none; display:flex; align-items:center; gap:8px; padding:7px 9px;
           border-bottom:2px solid #E9E9E6; background:#28292C;
           cursor:grab; user-select:none; touch-action:none }
    .head:active{ cursor:grabbing }
    .head::before{ content:'⠿'; color:#66676A; font-size:12px; letter-spacing:-1px }
    .plain{ font-weight:800; letter-spacing:.10em; font-size:12px; text-transform:uppercase }
    .pin{ margin-left:auto; font-size:9px; letter-spacing:.14em; font-weight:800; color:#1D1E20;
          background:#F6B26B; padding:2px 6px; display:none }
    .pin.on{ display:block }

    .body{ overflow:auto; padding:8px 9px 12px; -webkit-overflow-scrolling:touch }
    .sel{ font-size:13px; font-weight:800; color:#7FD4CE; word-break:break-all; margin-bottom:2px }
    .note{ color:#8E8F92; font-size:10.5px; margin-bottom:8px }

    h4{ font-size:9px; font-weight:800; letter-spacing:.20em; color:#8E8F92; margin:11px 0 4px;
        border-bottom:1px solid #3A3B3E; padding-bottom:3px }
    table{ border-collapse:collapse; width:100% }
    td{ padding:1.5px 0; vertical-align:top; font-size:11px }
    td.k{ color:#8E8F92; width:80px; white-space:nowrap; padding-right:8px }
    .tok{ color:#C9A227; font-weight:800 }
    .sw{ display:inline-block; width:9px; height:9px; border:1px solid #8E8F92; margin-right:5px;
         vertical-align:-1px }
    .rule{ color:#7FD4CE; word-break:break-all; font-size:10.5px; padding:1px 0 }
    .crumbs{ display:flex; flex-wrap:wrap; gap:3px; margin-top:3px }
    .crumb{ pointer-events:auto; cursor:pointer; border:1px solid #3A3B3E; background:transparent;
            color:#8E8F92; font-size:9.5px; padding:1px 5px; font-family:inherit }
    .crumb:hover{ color:#E9E9E6; border-color:#E9E9E6 }
    .crumb.self{ color:#7FD4CE; border-color:#7FD4CE }

    .foot{ flex:none; display:flex; gap:5px; padding:7px 9px; border-top:2px solid #E9E9E6; background:#28292C }
    .act{ pointer-events:auto; cursor:pointer; flex:1; background:transparent; color:#E9E9E6;
          border:2px solid #3A3B3E; font-family:inherit; font-size:9.5px; font-weight:800;
          letter-spacing:.12em; padding:4px 2px }
    .act:hover{ border-color:#E9E9E6; box-shadow:2px 2px 0 #3A3B3E }
    .act.hot{ border-color:#7FD4CE; color:#7FD4CE }
    .keys{ padding:5px 9px; background:#161718; color:#66676A; font-size:9px; letter-spacing:.10em;
           border-top:1px solid #3A3B3E; flex:none }
  </style>

  <div class="grid"></div>
  <div class="lay m"></div><div class="lay b"></div><div class="lay p"></div><div class="lay c"></div>
  <div class="badge"></div>
  <div class="cross cx"></div><div class="cross cy"></div>
  <div class="read"></div>
  <button class="tab">⟡ LOUPE</button>

  <div class="panel">
    <div class="head"><span class="plain">—</span><span class="pin">PINNED</span></div>
    <div class="body"></div>
    <div class="foot">
      <button class="act" data-do="copy">COPY</button>
      <button class="act" data-do="grid">GRID</button>
      <button class="act" data-do="box">BOX</button>
      <button class="act" data-do="num">123</button>
    </div>
    <div class="keys">drag the ⠿ bar anywhere · dbl-click it to reset · ⌥L close · click pin
      · ↑↓ walk · G grid · B box · N numbers · C copy · Esc</div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const tab = $('.tab'), panel = $('.panel'), grid = $('.grid'), badge = $('.badge');
  const layM = $('.lay.m'), layB = $('.lay.b'), layP = $('.lay.p'), layC = $('.lay.c');
  const plainEl = $('.plain'), pinEl = $('.pin'), bodyEl = $('.body'), head = $('.head');
  const crossX = $('.cx'), crossY = $('.cy'), readEl = $('.read');

  let on = false, pinned = false, target = null, showBox = true;
  let trace = true, moved = false, drag = null, mx = 0, my = 0;

  /* ══════ NAMING — what a person would call this piece ══════ */
  function plainName(el) {
    const t = el.tagName.toLowerCase();
    const cls = ' ' + (el.className && el.className.baseVal !== undefined
      ? el.className.baseVal : String(el.className || '')) + ' ';
    const cs = getComputedStyle(el);
    const has = (w) => cls.toLowerCase().includes(w);

    if (t === 'canvas') return 'a canvas — drawn by code, not CSS';
    if (t === 'svg' || t === 'path' || t === 'img') return 'an image';
    if (t === 'textarea' || (t === 'input' && !/button|submit|checkbox|radio/.test(el.type || ''))) return 'a text field';
    if (el.isContentEditable) return 'an editable area';
    if (t === 'button' || el.getAttribute('role') === 'button' || has('btn') || has('chip')) return 'a button';
    if (t === 'select') return 'a dropdown';
    if (t === 'a') return 'a link';
    if (/^h[1-6]$/.test(t)) return 'a heading';
    if (t === 'p') return 'a paragraph';
    if (t === 'li') return 'a list row';
    if (t === 'ul' || t === 'ol') return 'a list';
    if (t === 'nav' || has('menu')) return 'the menu column';
    if (t === 'aside' || has('outline') || has('sidebar')) return 'a side column';
    if (t === 'header') return 'the top bar';
    if (t === 'footer') return 'the bottom bar';
    if (t === 'main' || has('main')) return 'the main area';
    if (has('overlay') || has('modal') || has('sheet')) return 'an overlay';
    if (cs.position === 'fixed') return 'a fixed piece — it does not scroll';
    if (cs.position === 'absolute') return 'a floating piece';
    if (cs.display.includes('flex')) return 'a row/column box';
    if (cs.display.includes('grid')) return 'a grid box';
    if (cs.display === 'inline' || cs.display === 'inline-block') return 'an inline piece';
    return 'a block';
  }

  function selectorOf(el) {
    const t = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const raw = el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '');
    const cls = raw.trim() ? '.' + raw.trim().split(/\s+/).slice(0, 4).join('.') : '';
    return t + id + cls;
  }

  /* ══════ THE TOKENS — which --custom-property painted this ══════ */
  let TOKENS = null;
  function tokenNames() {
    if (TOKENS) return TOKENS;
    const names = new Set();
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }  /* cross-origin sheet */
      const walk = (list) => {
        for (const r of Array.from(list || [])) {
          if (r.style) for (let i = 0; i < r.style.length; i++) {
            const p = r.style[i]; if (p.startsWith('--')) names.add(p);
          }
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(rules);
    }
    TOKENS = Array.from(names);
    return TOKENS;
  }

  const probe = document.createElement('span');
  const normCache = new Map();
  function normalize(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (normCache.has(v)) return normCache.get(v);
    probe.style.color = ''; probe.style.color = v;
    let out = probe.style.color ? v : v;                 /* non-colour values pass through */
    if (probe.style.color) {
      document.documentElement.appendChild(probe);
      out = getComputedStyle(probe).color;
      probe.remove();
    }
    normCache.set(v, out);
    return out;
  }

  /** every token on this element that carries this exact value — more than one
   *  means they are aliases, which is worth knowing before you change either */
  function tokensFor(el, value) {
    if (!value) return [];
    const want = normalize(value), wantRaw = String(value).trim();
    const cs = getComputedStyle(el), hits = [];
    for (const name of tokenNames()) {
      const tv = cs.getPropertyValue(name).trim();
      if (!tv) continue;
      if (tv === wantRaw || normalize(tv) === want) hits.push(name);
    }
    return hits;
  }
  const tokenFor = (el, v) => tokensFor(el, v)[0] || null;

  function paint(value, el) {
    const toks = tokensFor(el, value);
    const swatch = /rgb|#|hsl/.test(String(value))
      ? `<i class="sw" style="background:${value}"></i>` : '';
    const names = toks.map((t) => `var(${t})`).join(' = ');
    return swatch + (names ? `<span class="tok">${names}</span> ${value}` : String(value));
  }

  /* ══════ THE RULES that actually reach this element ══════ */
  function rulesFor(el) {
    const hits = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      const walk = (list) => {
        for (const r of Array.from(list || [])) {
          if (r.selectorText) {
            for (const part of r.selectorText.split(',')) {
              const s = part.trim();
              try { if (s && el.matches(s)) { hits.push(s); break; } } catch (e) { /* :hover etc */ }
            }
          }
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(rules);
    }
    return Array.from(new Set(hits)).slice(-8);
  }

  function pathOf(el) {
    const chain = []; let n = el;
    while (n && n.nodeType === 1 && n !== document.documentElement) { chain.unshift(n); n = n.parentElement; }
    return chain.slice(-7);
  }

  /* ══════ THE READING ══════ */
  function px(v) { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : v; }
  function quad(cs, a, b, c, d) {
    const v = [a, b, c, d].map((k) => px(cs.getPropertyValue(k)));
    return v.every((x) => x === v[0]) ? v[0] + 'px' : v.map((x) => x + 'px').join(' ');
  }

  let lastReading = '';
  function read(el) {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const rows = (title, pairs) =>
      `<h4>${title}</h4><table>` +
      pairs.filter((p) => p[1] !== '' && p[1] != null)
           .map((p) => `<tr><td class="k">${p[0]}</td><td>${p[1]}</td></tr>`).join('') +
      `</table>`;

    const sel = selectorOf(el);
    const bw = quad(cs, 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width');
    const border = parseFloat(cs.borderTopWidth) > 0
      ? `${bw} ${cs.borderTopStyle} ${paint(cs.borderTopColor, el)}` : 'none';

    const html =
      `<div class="sel">${sel}</div>` +
      `<div class="note">${Math.round(r.width)} × ${Math.round(r.height)} · ${cs.display}${
        cs.position !== 'static' ? ' · ' + cs.position : ''}</div>` +

      rows('BOX', [
        ['padding', quad(cs, 'padding-top', 'padding-right', 'padding-bottom', 'padding-left')],
        ['margin', quad(cs, 'margin-top', 'margin-right', 'margin-bottom', 'margin-left')],
        ['border', border],
        ['radius', cs.borderRadius === '0px' ? '0 (square)' : cs.borderRadius],
        ['gap', cs.gap && cs.gap !== 'normal' ? cs.gap : ''],
        ['shadow', cs.boxShadow !== 'none' ? cs.boxShadow : ''],
      ]) +

      rows('COLOUR', [
        ['text', paint(cs.color, el)],
        ['background', cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? paint(cs.backgroundColor, el) : 'transparent'],
        ['image', cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 90) + '…' : ''],
        ['opacity', cs.opacity !== '1' ? cs.opacity : ''],
      ]) +

      rows('TYPE', [
        ['family', cs.fontFamily.split(',')[0].replace(/"/g, '')],
        ['size', cs.fontSize],
        ['weight', cs.fontWeight],
        ['spacing', cs.letterSpacing === 'normal' ? '' : cs.letterSpacing],
        ['line', cs.lineHeight],
        ['case', cs.textTransform !== 'none' ? cs.textTransform : ''],
      ]) +

      (parseFloat(cs.transitionDuration) > 0 || parseFloat(cs.animationDuration) > 0
        ? rows('MOTION', [
            ['transition', parseFloat(cs.transitionDuration) > 0 ? cs.transition : ''],
            ['animation', parseFloat(cs.animationDuration) > 0 ? cs.animation : ''],
          ]) : '') +

      `<h4>THE RULES THAT REACH IT</h4>` +
      (rulesFor(el).map((s) => `<div class="rule">${s}</div>`).join('') ||
        `<div class="rule" style="color:#8E8F92">none — styled inline or by code</div>`) +

      `<h4>WHERE IT SITS</h4><div class="crumbs">` +
      pathOf(el).map((n, i, a) =>
        `<button class="crumb${n === el ? ' self' : ''}" data-i="${i}">${selectorOf(n)}</button>`
      ).join('') + `</div>`;

    bodyEl.innerHTML = html;
    plainEl.textContent = plainName(el);

    const chain = pathOf(el);
    bodyEl.querySelectorAll('.crumb').forEach((b) => {
      b.addEventListener('click', (e) => { e.stopPropagation(); select(chain[+b.dataset.i], true); });
    });

    /* the paste-ready reading */
    lastReading = [
      `${sel} — ${plainName(el)}`,
      `  box     ${Math.round(r.width)}×${Math.round(r.height)} · padding ${cs.padding} · margin ${cs.margin} · border ${border.replace(/<[^>]+>/g, '')} · radius ${cs.borderRadius}`,
      `  colour  text ${tokenFor(el, cs.color) ? 'var(' + tokenFor(el, cs.color) + ') ' : ''}${cs.color} · background ${cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : (tokenFor(el, cs.backgroundColor) ? 'var(' + tokenFor(el, cs.backgroundColor) + ') ' : '') + cs.backgroundColor}`,
      `  type    ${cs.fontFamily.split(',')[0].replace(/"/g, '')} ${cs.fontSize} / ${cs.fontWeight}${cs.letterSpacing !== 'normal' ? ' · spacing ' + cs.letterSpacing : ''}`,
      `  rules   ${rulesFor(el).join('  ·  ') || '(none)'}`,
      `  path    ${pathOf(el).map(selectorOf).join(' > ')}`,
    ].join('\n');
  }

  /* ══════ THE PAINT — margin / border / padding / content ══════ */
  function highlight(el) {
    if (!showBox) { [layM, layB, layP, layC, badge].forEach((n) => n.classList.remove('on')); return; }
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const n = (k) => parseFloat(cs.getPropertyValue(k)) || 0;
    const put = (node, x, y, w, h) => {
      node.style.left = x + 'px'; node.style.top = y + 'px';
      node.style.width = Math.max(0, w) + 'px'; node.style.height = Math.max(0, h) + 'px';
      node.classList.add('on');
    };
    const mt = n('margin-top'), mr = n('margin-right'), mb = n('margin-bottom'), ml = n('margin-left');
    const bt = n('border-top-width'), br = n('border-right-width'), bb = n('border-bottom-width'), bl = n('border-left-width');
    const pt = n('padding-top'), pr = n('padding-right'), pb = n('padding-bottom'), pl = n('padding-left');

    put(layM, r.left - ml, r.top - mt, r.width + ml + mr, r.height + mt + mb);
    put(layB, r.left, r.top, r.width, r.height);
    put(layP, r.left + bl, r.top + bt, r.width - bl - br, r.height - bt - bb);
    put(layC, r.left + bl + pl, r.top + bt + pt, r.width - bl - br - pl - pr, r.height - bt - bb - pt - pb);

    badge.textContent = `${selectorOf(el)}  ${Math.round(r.width)}×${Math.round(r.height)}`;
    badge.classList.add('on');
    const above = r.top > 26;
    badge.style.left = Math.max(4, Math.min(r.left, innerWidth - 320)) + 'px';
    badge.style.top = (above ? r.top - 20 : r.bottom + 4) + 'px';

    /* the panel steps aside so it never covers what you are reading — but once
       the King has moved it by hand, it stays exactly where he put it */
    if (!moved) panel.classList.toggle('left', r.left + r.width / 2 > innerWidth * 0.55);
  }

  /* ══════ THE NUMBERS — they follow the cursor whether pinned or not ══════ */
  function traceAt(x, y) {
    mx = x; my = y;
    if (!on || !trace) { [crossX, crossY, readEl].forEach((n) => n.classList.remove('on')); return; }
    crossX.style.top = Math.round(y) + 'px';
    crossY.style.left = Math.round(x) + 'px';
    crossX.classList.add('on'); crossY.classList.add('on');

    let inside = '';
    if (target) {
      const r = target.getBoundingClientRect();
      inside = `<i>+${Math.round(x - r.left)}, +${Math.round(y - r.top)} in ${
        Math.round(r.width)}×${Math.round(r.height)} ${selectorOf(target)}</i>`;
    }
    readEl.innerHTML = `${Math.round(x)} · ${Math.round(y)}` +
      `<i>page ${Math.round(x + scrollX)}, ${Math.round(y + scrollY)}</i>` + inside;
    readEl.classList.remove('on'); readEl.classList.add('on');   /* measure after paint */
    const w = readEl.offsetWidth, h = readEl.offsetHeight;
    readEl.style.left = (x + 14 + w > innerWidth ? x - 14 - w : x + 14) + 'px';
    readEl.style.top = (y + 16 + h > innerHeight ? y - 16 - h : y + 16) + 'px';
  }

  function select(el, doPin) {
    if (!el || el === target && !doPin) return;
    target = el; read(el); highlight(el);
    if (doPin) { pinned = true; pinEl.classList.add('on'); }
  }

  /* ══════ THE HANDS ══════ */
  function under(e) {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    for (const el of els) { if (!el.closest('[data-loupe]') && el !== host) return el; }
    return null;
  }
  const onMove = (e) => {
    const overGlass = e.target.closest && e.target.closest('[data-loupe]');
    if (on && !pinned && !drag && !overGlass) { const el = under(e); if (el) select(el); }
    traceAt(e.clientX, e.clientY);   /* last, so the offsets read against the piece just picked */
  };
  const onDown = (e) => {
    if (!on || e.target.closest('[data-loupe]')) return;
    e.preventDefault(); e.stopPropagation();
    const el = under(e); if (el) { pinned = false; select(el, true); }
  };
  const eat = (e) => { if (on && !e.target.closest('[data-loupe]')) { e.preventDefault(); e.stopPropagation(); } };

  const onKey = (e) => {
    if (e.altKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); toggle(); return; }
    if (!on) return;
    const t = e.target;
    if (t && (t.isContentEditable || /input|textarea|select/i.test(t.tagName))) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); if (pinned) { pinned = false; pinEl.classList.remove('on'); } else toggle(); }
    else if (k === 'g') { e.preventDefault(); grid.classList.toggle('on'); syncActs(); }
    else if (k === 'b') { e.preventDefault(); showBox = !showBox; if (target) highlight(target); syncActs(); }
    else if (k === 'n') { e.preventDefault(); trace = !trace; traceAt(mx, my); syncActs(); }
    else if (k === 'c') { e.preventDefault(); copy(); }
    else if (e.key === 'ArrowUp' && target && target.parentElement) { e.preventDefault(); select(target.parentElement, true); }
    else if (e.key === 'ArrowDown' && target && target.firstElementChild) { e.preventDefault(); select(target.firstElementChild, true); }
  };

  function copy() {
    const btn = root.querySelector('[data-do="copy"]');
    const done = (ok) => { btn.textContent = ok ? 'COPIED ✓' : 'BLOCKED'; setTimeout(() => (btn.textContent = 'COPY'), 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(lastReading).then(() => done(true), () => done(false));
    else done(false);
  }

  function syncActs() {
    root.querySelector('[data-do="grid"]').classList.toggle('hot', grid.classList.contains('on'));
    root.querySelector('[data-do="box"]').classList.toggle('hot', showBox);
    root.querySelector('[data-do="num"]').classList.toggle('hot', trace);
  }

  /* ══════ THE PANEL GOES WHERE HE PUTS IT ══════ */
  head.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    const r = panel.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    try { head.setPointerCapture(e.pointerId); } catch (x) { /* older engines */ }
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag) return;
    e.preventDefault();
    moved = true; panel.classList.remove('left');
    const w = panel.offsetWidth, h = panel.offsetHeight;
    panel.style.right = 'auto';
    panel.style.left = Math.max(2, Math.min(innerWidth - w - 2, e.clientX - drag.dx)) + 'px';
    panel.style.top = Math.max(2, Math.min(innerHeight - h - 2, e.clientY - drag.dy)) + 'px';
  });
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    try { head.releasePointerCapture(e.pointerId); } catch (x) { /* already gone */ }
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
  head.addEventListener('dblclick', (e) => {         /* back to the corner */
    e.preventDefault(); e.stopPropagation();
    moved = false; panel.style.left = ''; panel.style.top = ''; panel.style.right = '';
  });

  root.querySelector('.foot').addEventListener('click', (e) => {
    const b = e.target.closest('.act'); if (!b) return;
    if (b.dataset.do === 'copy') copy();
    if (b.dataset.do === 'grid') { grid.classList.toggle('on'); syncActs(); }
    if (b.dataset.do === 'box') { showBox = !showBox; if (target) highlight(target); syncActs(); }
    if (b.dataset.do === 'num') { trace = !trace; traceAt(mx, my); syncActs(); }
  });
  tab.addEventListener('click', toggle);

  function toggle() {
    on = !on;
    tab.classList.toggle('on', on);
    panel.classList.toggle('on', on);
    tab.textContent = on ? '⟡ INSPECTING' : '⟡ LOUPE';
    if (on) {
      addEventListener('mousemove', onMove, true);
      addEventListener('mousedown', onDown, true);
      addEventListener('click', eat, true);
      addEventListener('pointerdown', eat, true);
    } else {
      removeEventListener('mousemove', onMove, true);
      removeEventListener('mousedown', onDown, true);
      removeEventListener('click', eat, true);
      removeEventListener('pointerdown', eat, true);
      pinned = false; target = null; drag = null; pinEl.classList.remove('on');
      [layM, layB, layP, layC, badge, crossX, crossY, readEl].forEach((n) => n.classList.remove('on'));
      grid.classList.remove('on');
    }
    syncActs();
  }

  addEventListener('keydown', onKey, true);
  addEventListener('scroll', () => { if (on && target) highlight(target); }, true);
  addEventListener('resize', () => { if (on && target) highlight(target); });

  syncActs();
  window.__loupe = { toggle, get on() { return on; } };
})();
