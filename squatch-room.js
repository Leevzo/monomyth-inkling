/* Squatch's room — the writing inkling. Pure functions. No network. No key.
   The page keeps one drawer. The log is append-only: a cut is written down, never erased.
   Replay of the script events rebuilds the page. */
(function (root) {
  'use strict';

  var WHEEL = ['#FF7A12', '#FF12A1', '#FA12FF', '#9212FF', '#2A12FF', '#126EFF', '#12D6FF', '#12FFC2', '#12FF5A', '#22FF12', '#8AFF12', '#F2FF12'];
  var TEXT = ['#12D6FF', '#12FFC2', '#12FF5A', '#22FF12', '#8AFF12', '#F2FF12'];

  /* his mouth, from the tape he spoke the morning of 2026-10-03. The aside he struck ("this story seems pretty cool") stays out. */
  var OPENING = "I'm Squatch. The Squatch, actually, because there's only one. I'm an inkling, which means I have one purpose. To make you the writer of this story. And to make this story written by you. Who's your protagonist?";

  var ETHOS = {
    squatch: 'To make you the writer of this story, and to make this story written by you.',
    orv: 'To do everything in my power to help you be the hero of this story. Whatever you are afraid of, more often than not there is a dragon on the other side.',
    lunafreya: 'To help you find the object of your quest. You describe the territory.',
    kairos: 'Dump every thought. A mess is fine. Quantize, categorize, find the connections, and put you at the center.'
  };

  function hashOf(name) {
    var h = 0, s = String(name == null ? '' : name), i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function colourOf(name) { return WHEEL[hashOf(name) % WHEEL.length]; }
  function textOf(name) { return TEXT[hashOf(name) % TEXT.length]; }

  function blank(now) {
    return {
      v: 1,
      title: "Squatches Don't Smoke",
      script: '',
      scene: null,
      chat: [{ who: 'squatch', text: OPENING, at: now || 0 }],
      open: false,
      notes: { '*': [] },
      session: '',
      log: [{ t: now || 0, kind: 'said', who: 'squatch', text: OPENING }]
    };
  }

  /* the smallest change between two pages. Replay is s = s[0:at] + put + s[at+cut.length:] */
  function diff(prev, next) {
    prev = String(prev); next = String(next);
    var a = 0, p = prev.length, n = next.length, b = 0;
    while (a < p && a < n && prev.charAt(a) === next.charAt(a)) a++;
    while (b < p - a && b < n - a && prev.charAt(p - 1 - b) === next.charAt(n - 1 - b)) b++;
    return { at: a, cut: prev.slice(a, p - b), put: next.slice(a, n - b) };
  }

  function applyScript(state, next, now) {
    next = String(next);
    if (next === state.script) return false;
    var d = diff(state.script, next);
    var have = state.script.slice(d.at, d.at + d.cut.length);
    if (have !== d.cut) {
      state.log.push({ t: now, kind: 'script-whole', text: next });
    } else if (d.put || d.cut) {
      state.log.push({ t: now, kind: 'script', at: d.at, put: d.put, cut: d.cut });
    }
    state.script = next;
    return true;
  }

  function replay(log, start) {
    var s = start || '', i, e, have;
    for (i = 0; i < log.length; i++) {
      e = log[i];
      if (e.kind === 'script-whole') { s = String(e.text || ''); continue; }
      if (e.kind !== 'script') continue;
      have = s.slice(e.at, e.at + String(e.cut || '').length);
      if (have !== String(e.cut || '')) return null;
      s = s.slice(0, e.at) + String(e.put || '') + s.slice(e.at + String(e.cut || '').length);
    }
    return s;
  }

  function isScene(line) {
    return /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i.test(line);
  }
  function placeOf(heading) {
    var s = heading.replace(/^(INT\.?\/EXT\.?|INT|EXT|EST|I\/E)\.?\s*/i, '');
    var cut = s.split(/\s+-\s+/);
    return (cut[0] || s || heading).trim();
  }
  function isCue(line) {
    var t = line.trim();
    if (!t || t.length > 40 || /[.!?]$/.test(t)) return false;
    if (isScene(t) || /^(CUT TO:|FADE|SMASH|DISSOLVE)/i.test(t)) return false;
    var letters = t.replace(/[^A-Za-z]/g, '');
    return letters.length > 0 && letters === letters.toUpperCase();
  }

  /* fountain, the plain kind. A scene keeps its heading, its place, the people who speak in it, and the first action line. */
  function parse(script) {
    var lines = String(script || '').split('\n');
    var scenes = [], people = [], places = [], cur = null, i, raw, t, name;
    function add(list, n) { if (n && list.indexOf(n) < 0) list.push(n); }
    for (i = 0; i < lines.length; i++) {
      raw = lines[i]; t = raw.trim();
      if (!t) continue;
      if (isScene(t)) {
        cur = { line: i, heading: t, place: placeOf(t), people: [], beat: '' };
        scenes.push(cur);
        add(places, cur.place);
        continue;
      }
      if (!cur) continue;
      if (/^CAST\b/i.test(t)) {
        t.replace(/^CAST:?\s*/i, '').split(',').forEach(function (n) {
          n = n.trim().toUpperCase();
          if (!n) return;
          if (cur.people.indexOf(n) < 0) cur.people.push(n);
          add(people, n);
        });
        continue;
      }
      if (isCue(t)) {
        name = t.replace(/\s*\(.*\)\s*$/, '').trim();
        if (cur.people.indexOf(name) < 0) cur.people.push(name);
        add(people, name);
        continue;
      }
      if (!cur.beat && !/^\(.*\)$/.test(t)) cur.beat = t;
    }
    return { scenes: scenes, people: people, places: places };
  }

  function toSky(parsed, title) {
    var placeAt = {}, personAt = {}, s = [], i, sc, ci;
    parsed.places.forEach(function (p, n) { placeAt[p] = n; });
    parsed.people.forEach(function (p, n) { personAt[p] = n; });
    for (i = 0; i < parsed.scenes.length; i++) {
      sc = parsed.scenes[i];
      ci = sc.people.map(function (n) { return personAt[n]; }).filter(function (n) { return n != null; });
      s.push([placeAt[sc.place], ci, sc.beat || sc.heading]);
    }
    return { title: title || '', c: parsed.people.slice(), l: parsed.places.slice(), s: s };
  }

  function chunk(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    var dot = t.search(/[.!?](\s|$)/);
    var line = dot >= 0 ? t.slice(0, dot + 1) : t;
    return line.length > 84 ? line.slice(0, 81) + '…' : line;
  }

  function say(state, text, now) {
    text = String(text || '').trim();
    if (!text) return false;
    state.chat.push({ who: 'king', text: text, at: now });
    state.session += (state.session ? '\n\n' : '') + text;
    state.log.push({ t: now, kind: 'said', who: 'king', text: text });
    state.log.push({ t: now, kind: 'session', text: text });
    state.open = false;
    return true;
  }

  function note(state, key, text, now, voiceId) {
    text = String(text || '').trim();
    if (!text && !voiceId) return false;
    if (!state.notes[key]) state.notes[key] = [];
    var item = { id: now + ':' + state.log.length, at: now, text: text };
    if (voiceId) item.voice = voiceId;
    state.notes[key].push(item);
    state.log.push({ t: now, kind: 'note', scene: key, text: text, voice: voiceId || null });
    return item;
  }

  function sceneKey(sc) { return sc.line + ':' + sc.heading; }

  /* the page, cut on the scene headings. Joining the pieces gives the script back, preamble included. */
  function spans(script) {
    var lines = String(script || '').split('\n');
    var parsed = parse(script);
    if (!parsed.scenes.length) return { preamble: String(script || ''), scenes: [], people: [], places: [] };
    var first = parsed.scenes[0].line;
    var scenes = parsed.scenes.map(function (sc, i) {
      var end = i + 1 < parsed.scenes.length ? parsed.scenes[i + 1].line : lines.length;
      return {
        key: sceneKey(sc), heading: sc.heading, place: sc.place, people: sc.people.slice(),
        beat: sc.beat, line: sc.line, text: lines.slice(sc.line, end).join('\n')
      };
    });
    return { preamble: lines.slice(0, first).join('\n'), scenes: scenes, people: parsed.people, places: parsed.places };
  }
  function joinSpans(sp) {
    var body = sp.scenes.map(function (s) { return s.text; }).join('\n');
    return sp.preamble ? sp.preamble + '\n' + body : body;
  }

  /* one scene, as much as a guest is allowed to hold. Other scenes keep their headings and lose their words. */
  function scenePack(script, title, key) {
    var sp = spans(script);
    var sc = null, i;
    for (i = 0; i < sp.scenes.length; i++) if (sp.scenes[i].key === key) sc = sp.scenes[i];
    if (!sc && sp.scenes.length) sc = sp.scenes[0];
    var skyScript = sc ? sc.text : '';
    var sky = skyFrom(skyScript, title || '');
    return {
      title: title || '',
      scene: sc ? { key: sc.key, heading: sc.heading, place: sc.place, people: sc.people, beat: sc.beat, text: sc.text } : null,
      story: sp.scenes.map(function (s) {
        var line = plotOf(s.text).map(function (p) { return (p.who ? p.who + ' — ' : '') + p.text; }).join('\n');
        return { key: s.key, heading: s.heading, place: s.place, people: s.people, beat: s.key === (sc && sc.key) ? line : '', open: !!(sc && s.key === sc.key) };
      }),
      sky: sky
    };
  }

  var NOT_A_NAME = { no: 1, yes: 1, ok: 1, oh: 1, ah: 1, hi: 1, excellent: 1, well: 1, the: 1 };

  /* the ear wraps a sentence and sometimes a word. Join it back before anyone is named. */
  function unwrap(text) {
    var WORD = { a: 1, an: 1, as: 1, at: 1, be: 1, by: 1, do: 1, go: 1, he: 1, if: 1, in: 1, is: 1, it: 1, me: 1, my: 1, no: 1, of: 1, on: 1, or: 1, so: 1, to: 1, up: 1, we: 1, am: 1, the: 1, and: 1, but: 1, for: 1, you: 1, his: 1, her: 1, our: 1, not: 1, get: 1, all: 1, out: 1, one: 1, has: 1, was: 1, are: 1, can: 1, its: 1, let: 1, who: 1, how: 1, did: 1, him: 1, she: 1, too: 1, now: 1, see: 1 };
    var lines = String(text || '').replace(/\r/g, '').split('\n'), out = [], i, raw, t, prev, last;
    for (i = 0; i < lines.length; i++) {
      raw = lines[i]; t = raw.trim();
      if (!t) { out.push(''); continue; }
      if (!out.length || out[out.length - 1] === '') { out.push(t); continue; }
      if (/^([A-Z][a-z'-]{1,28})\.$/.test(t)) { out.push(t); continue; }
      prev = out[out.length - 1];
      if (/^[,.;:]$/.test(t)) { out[out.length - 1] = prev + t; continue; }
      if (/[.!?]["']?$/.test(prev)) { out.push(t); continue; }
      last = prev.split(/\s+/).pop();
      if (last && last.length <= 3 && !WORD[last.toLowerCase()] && /^[a-z]/.test(t)) { out[out.length - 1] = prev + t; continue; }
      if (/^\s/.test(raw) && !/^([A-Z][a-z'-]{1,28})\.$/.test(t) || /^[a-z]/.test(t) || /[,:;]$/.test(prev)) {
        out[out.length - 1] = prev + ' ' + t;
        continue;
      }
      out.push(t);
    }
    return out.join('\n');
  }

  /* a spoken tape, one scene. Repeated "Name." lines are speakers. A chain of names
     ("Jarvis. Kairos. Tag.") and "I am Name" count too. A place is never invented.
     A name with no line of his own is a cast line, not an empty cue. */
  function namesOfTape(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n'), counts = {}, first = '', names = {}, i, t, m, bits, b;
    function take(n) { if (n && !NOT_A_NAME[n.toLowerCase()]) names[n.toUpperCase()] = 1; }
    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      m = t.match(/^([A-Z][a-z'-]{1,28})\.$/);
      if (!m || NOT_A_NAME[m[1].toLowerCase()]) continue;
      counts[m[1]] = (counts[m[1]] || 0) + 1;
      if (!first) first = m[1];
    }
    Object.keys(counts).forEach(function (n) { if (counts[n] >= 2 || n === first) take(n); });
    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      m = t.match(/\bI am ([A-Z][a-z'-]{2,28})\b/);
      if (m) take(m[1]);
      m = t.match(/^([A-Z][a-z'-]{2,28})\.\s+\S/);
      if (m && !/^The$/i.test(t.slice(0, m.index || 0).trim())) take(m[1]);
      bits = [];
      var re = /\b([A-Z][a-z'-]{1,28})\./g, found;
      while ((found = re.exec(t))) {
        var before = t.slice(Math.max(0, found.index - 5), found.index);
        if (/\b(The|A)\s$/i.test(before)) continue;
        bits.push(found[1]);
      }
      if (bits.length >= 2) for (b = 0; b < bits.length; b++) take(bits[b]);
    }
    return Object.keys(names);
  }
  function fromTape(text) {
    var names = {}, list, lines, out, i, t, m, prev, cued, silent;
    text = unwrap(text);
    list = namesOfTape(text);
    list.forEach(function (n) { names[n] = 1; });
    lines = String(text || '').split('\n');
    out = ['INT. (THE TAPE)', ''];
    prev = ''; cued = {};
    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      if (!t) { if (out[out.length - 1] !== '') out.push(''); prev = ''; continue; }
      if (t === prev) continue;
      prev = t;
      m = t.match(/^([A-Z][a-z'-]{1,28})\.$/);
      if (m && names[m[1].toUpperCase()]) { out.push('', m[1].toUpperCase()); cued[m[1].toUpperCase()] = 1; continue; }
      out.push(t);
    }
    silent = list.filter(function (n) { return !cued[n]; });
    if (silent.length) out.splice(2, 0, 'CAST ' + silent.join(', '), '');
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /* a turn's plot: each question it asks, in order. If it asks nothing, its first sentence. */
  function beatsOf(speech) {
    var parts = String(speech || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [], i, p, qs = [], cut;
    for (i = 0; i < parts.length; i++) {
      p = parts[i].replace(/\s+/g, ' ').trim();
      if (p && /\?\s*$/.test(p) && p.split(/\s+/).length > 1 && qs[qs.length - 1] !== p) qs.push(p.length > 140 ? p.slice(0, 137) + '…' : p);
    }
    if (qs.length) return qs;
    cut = (parts[0] || speech || '').replace(/\s+/g, ' ').trim();
    return cut ? [cut.length > 140 ? cut.slice(0, 137) + '…' : cut] : [];
  }

  /* the plot, in order: each time someone speaks, one line. The constellation is the same list. */
  function plotOf(script) {
    var lines = String(script || '').split('\n'), parsed = parse(script), plot = [], si, sc, end, i, t, who, buf;
    function flush(place, heading) {
      var speech = buf.join(' ').replace(/\s+/g, ' ').trim(), bits, n;
      buf = [];
      if (!speech) return;
      bits = beatsOf(speech);
      for (n = 0; n < bits.length; n++) plot.push({ who: who, place: place, heading: heading, text: bits[n], speech: speech });
    }
    for (si = 0; si < parsed.scenes.length; si++) {
      sc = parsed.scenes[si];
      end = si + 1 < parsed.scenes.length ? parsed.scenes[si + 1].line : lines.length;
      who = ''; buf = [];
      for (i = sc.line + 1; i < end; i++) {
        t = lines[i].trim();
        if (!t || /^CAST\b/i.test(t)) continue;
        if (isCue(t)) { flush(sc.place, sc.heading); who = t.replace(/\s*\(.*\)\s*$/, '').trim(); continue; }
        if (/^\(.*\)$/.test(t)) continue;
        buf.push(t);
      }
      flush(sc.place, sc.heading);
    }
    return plot;
  }

  function skyFrom(script, title) {
    var parsed = parse(script), plot = plotOf(script), sky = toSky(parsed, title), placeAt = {}, personAt = {}, facts = {}, i, b;
    sky.l.forEach(function (p, n) { placeAt[p] = n; });
    sky.c.forEach(function (p, n) { personAt[p] = n; });
    if (plot.length) {
      sky.s = plot.map(function (b) {
        var who = b.who && personAt[b.who] != null ? [personAt[b.who]] : [];
        return [placeAt[b.place], who, (b.who ? b.who + '. ' : '') + b.text];
      });
    }
    for (i = 0; i < plot.length; i++) {
      b = plot[i];
      if (!b.who) continue;
      ((b.speech || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).forEach(function (p) {
        p = p.trim();
        if (!/purpose|writer of this story|\bI am\b|^I'm [A-Z]/.test(p)) return;
        facts[b.who] = facts[b.who] || [];
        if (facts[b.who].indexOf(p) < 0) facts[b.who].push(p);
      });
    }
    if (Object.keys(facts).length) sky.f = facts;
    return sky;
  }

  /* a hearing, or a page already written. One script, its plot, its sky. */
  function construct(text) {
    var raw = String(text || '').replace(/^\uFEFF/, '').trim();
    var script = /^(INT|EXT|EST|I\/E)\b/m.test(raw) ? raw : fromTape(raw);
    var parsed = parse(script);
    return { script: script, plot: plotOf(script), sky: skyFrom(script, ''), people: parsed.people, places: parsed.places };
  }

  function cleanNotes(notes) {
    var out = { '*': [] }, k;
    if (!notes || typeof notes !== 'object') return out;
    for (k in notes) if (Object.prototype.hasOwnProperty.call(notes, k) && Array.isArray(notes[k])) out[k] = notes[k];
    if (!out['*']) out['*'] = [];
    return out;
  }

  function pid(now) {
    return 'p' + (now || Date.now()).toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* a project is one script. The people are not inside it. */
  function project(now, title) {
    var p = blank(now);
    p.id = pid(now);
    p.title = title == null ? '' : title;
    return p;
  }

  function spoken(script) {
    var lines = String(script || '').split('\n'), out = {}, i, t, who = '';
    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      if (!t) continue;
      if (isScene(t) || /^CAST\b/i.test(t)) { who = ''; continue; }
      if (isCue(t)) { who = t.replace(/\s*\(.*\)\s*$/, '').trim(); continue; }
      if (who && !/^\(.*\)$/.test(t) && !out[who]) out[who] = t;
    }
    return out;
  }

  function cleanPerson(p) {
    p = p || {};
    return {
      notes: Array.isArray(p.notes) ? p.notes : [],
      projects: Array.isArray(p.projects) ? p.projects.filter(function (x) { return typeof x === 'string'; }) : [],
      lines: Array.isArray(p.lines) ? p.lines.filter(function (x) { return typeof x === 'string'; }) : []
    };
  }

  /* names found in a project are added to the people. A name that leaves a page stays in the book. */
  function remember(shelf, project) {
    if (!shelf.people) shelf.people = {};
    var said = spoken(project.script);
    parse(project.script).people.forEach(function (name) {
      var p = shelf.people[name] || (shelf.people[name] = { notes: [], projects: [], lines: [] });
      if (p.projects.indexOf(project.id) < 0) p.projects.push(project.id);
      if (said[name] && p.lines.indexOf(said[name]) < 0) p.lines.push(said[name]);
    });
    return shelf;
  }

  function mergePerson(shelf, name, src) {
    src = cleanPerson(src);
    var d = shelf.people[name] || (shelf.people[name] = { notes: [], projects: [], lines: [] });
    src.lines.forEach(function (l) { if (d.lines.indexOf(l) < 0) d.lines.push(l); });
    src.notes.forEach(function (n) { d.notes.push(n); });
    src.projects.forEach(function (id) { if (d.projects.indexOf(id) < 0) d.projects.push(id); });
  }

  function cleanProject(p, now) {
    if (!p || typeof p.script !== 'string' || !Array.isArray(p.log) || !Array.isArray(p.chat)) return null;
    return {
      id: typeof p.id === 'string' && p.id ? p.id : pid(now),
      title: typeof p.title === 'string' ? p.title : '',
      script: p.script,
      scene: typeof p.scene === 'string' ? p.scene : null,
      chat: p.chat.filter(function (m) { return m && (m.who === 'king' || m.who === 'squatch') && typeof m.text === 'string'; }),
      open: !!p.open,
      notes: cleanNotes(p.notes),
      session: typeof p.session === 'string' ? p.session : '',
      log: p.log
    };
  }

  function freshShelf(now) {
    var p = blank(now);
    p.id = pid(now);
    return { v: 2, current: p.id, people: {}, projects: [p] };
  }

  function shelfFrom(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.v === 2 && Array.isArray(raw.projects)) {
      var projects = raw.projects.map(function (p) { return cleanProject(p); }).filter(Boolean);
      if (!projects.length) return null;
      var people = {}, k;
      if (raw.people && typeof raw.people === 'object') {
        for (k in raw.people) if (Object.prototype.hasOwnProperty.call(raw.people, k)) people[k] = cleanPerson(raw.people[k]);
      }
      var current = projects.some(function (p) { return p.id === raw.current; }) ? raw.current : projects[0].id;
      var shelf = { v: 2, current: current, people: people, projects: projects };
      projects.forEach(function (p) { remember(shelf, p); });
      return shelf;
    }
    var one = unpack(raw);
    if (!one) return null;
    one.id = pid();
    var migrated = { v: 2, current: one.id, people: {}, projects: [one] };
    remember(migrated, one);
    return migrated;
  }

  /* a brought copy becomes its own project. An id already on the shelf is not copied again. People are added, never dropped. */
  function takeIn(shelf, raw) {
    var incoming = shelfFrom(raw);
    if (!incoming) return null;
    var have = {}, added = [];
    shelf.projects.forEach(function (p) { have[p.id] = 1; });
    incoming.projects.forEach(function (p) {
      if (have[p.id]) return;
      shelf.projects.push(p);
      added.push(p.id);
      remember(shelf, p);
    });
    Object.keys(incoming.people).forEach(function (n) { mergePerson(shelf, n, incoming.people[n]); });
    if (added.length) shelf.current = added[0];
    return { added: added };
  }

  function pack(state) {
    return {
      v: 1,
      inkling: 'squatch',
      ethos: ETHOS,
      title: state.title,
      script: state.script,
      scene: state.scene,
      chat: state.chat,
      open: state.open,
      notes: state.notes,
      session: state.session,
      log: state.log
    };
  }

  function packShelf(shelf) {
    return { v: 2, inkling: 'squatch', ethos: ETHOS, current: shelf.current, people: shelf.people, projects: shelf.projects };
  }

  function unpack(raw) {
    if (!raw || raw.v !== 1 || typeof raw.script !== 'string' || !Array.isArray(raw.log) || !Array.isArray(raw.chat)) return null;
    return {
      v: 1,
      title: typeof raw.title === 'string' && raw.title ? raw.title : "Squatches Don't Smoke",
      script: raw.script,
      scene: typeof raw.scene === 'string' ? raw.scene : null,
      chat: raw.chat.filter(function (m) { return m && (m.who === 'king' || m.who === 'squatch') && typeof m.text === 'string'; }),
      open: !!raw.open,
      notes: cleanNotes(raw.notes),
      session: typeof raw.session === 'string' ? raw.session : '',
      log: raw.log
    };
  }

  var api = {
    OPENING: OPENING, ETHOS: ETHOS, WHEEL: WHEEL,
    hashOf: hashOf, colourOf: colourOf, textOf: textOf,
    blank: blank, diff: diff, applyScript: applyScript, replay: replay,
    parse: parse, toSky: toSky, chunk: chunk, say: say, note: note, sceneKey: sceneKey,
    spans: spans, joinSpans: joinSpans, scenePack: scenePack, fromTape: fromTape,
    plotOf: plotOf, skyFrom: skyFrom, construct: construct,
    pack: pack, unpack: unpack, project: project, freshShelf: freshShelf, shelfFrom: shelfFrom,
    packShelf: packShelf, remember: remember, takeIn: takeIn
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SquatchRoom = api;
})(typeof window !== 'undefined' ? window : globalThis);
