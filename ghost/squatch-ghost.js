/* SQUATCH'S GHOST — the desk that can read nothing.
   A page-less seat for the wide world: a guest at /s/<id>#<key> holds one scene, read only,
   and may send a note back. The key rides after the #, which no server ever sees; what the
   ghost stores and hands back is sealed on the King's glass before it travels. Notes open
   only for the King's own word (held hashed, never plain). Seats and notes live a month
   past their last breath, then the ghost forgets them. Nothing here can be read by anyone.

   The ghost also mirrors the page and its parts from the King's public glass, so a guest's
   seat is the same page, nothing else.

   Wake it:  npx wrangler login && npx wrangler kv namespace create SEATS
            (paste the id into wrangler.toml)  &&  npx wrangler deploy
   Then, in Squatch's settings, give the ghost's address once. */
const UPSTREAM = 'https://leevzo.github.io/monomyth-inkling';
const TTL = 30 * 86400;
const MAX_PACK = 300_000;
const MAX_NOTE = 8_000;
const MAX_NOTES = 200;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-squatch-king',
};

const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200,
  headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, CORS) });

async function kingHash(word) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(word || '')));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const goodId = id => typeof id === 'string' && /^sq1\.[\w-]{8,64}$/.test(id);

async function readBody(request, cap) {
  const len = +(request.headers.get('content-length') || 0);
  if (len > cap + 1000) return null;
  try { return await request.json(); } catch (e) { return null; }
}

async function mirror(path, type) {
  const have = typeof caches !== 'undefined' ? caches : null;
  const key = new Request(UPSTREAM + path);
  if (have) {
    const hit = await have.default.match(key);
    if (hit) return hit;
  }
  const up = await fetch(key);
  if (!up.ok) return new Response('no', { status: 404 });
  const body = await up.arrayBuffer();
  const resp = new Response(body, { headers: { 'content-type': type || up.headers.get('content-type') || 'application/octet-stream',
    'cache-control': 'public, max-age=300' } });
  if (have) await have.default.put(key, resp.clone());
  return resp;
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    const path = u.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    /* the seat itself */
    if (path === '/api/seat') {
      if (request.method === 'GET') {
        const id = u.searchParams.get('id');
        if (!goodId(id)) return json({ error: 'no such seat' }, 404);
        const seat = await env.SEATS.get('seat:' + id, 'json');
        if (!seat) return json({ error: 'no such seat' }, 404);
        return json({ rev: seat.rev, at: seat.at, data: seat.data });
      }
      if (request.method === 'PUT') {
        const body = await readBody(request, MAX_PACK);
        const id = body && body.id;
        if (!goodId(id)) return json({ error: 'the ghost refuses it' }, 400);
        if (typeof body.data !== 'string' || body.data.length > MAX_PACK || typeof body.king !== 'string' || body.king.length < 10)
          return json({ error: 'the ghost refuses it' }, 400);
        const want = await kingHash(body.king);
        const old = await env.SEATS.get('seat:' + id, 'json');
        if (old) {
          if (old.king !== want) return json({ error: 'not your seat' }, 403);
          if (body.rev != null && +body.rev !== old.rev) return json({ error: 'stale', rev: old.rev }, 409);
        }
        const rev = (old ? old.rev : 0) + 1;
        await env.SEATS.put('seat:' + id, JSON.stringify({ data: body.data, king: want, rev: rev, at: Date.now() }), { expirationTtl: TTL });
        return json({ ok: true, rev: rev });
      }
    }

    if (path === '/api/seat/note') {
      if (request.method !== 'POST') return json({ error: 'no' }, 404);
      const body = await readBody(request, MAX_NOTE + 1000);
      const id = body && body.id;
      if (!goodId(id)) return json({ error: 'no such seat' }, 404);
      if (!body || typeof body.data !== 'string' || !body.data || body.data.length > MAX_NOTE)
        return json({ error: 'the note is empty' }, 400);
      const seat = await env.SEATS.get('seat:' + id, 'json');
      if (!seat) return json({ error: 'no such seat' }, 404);
      const key = 'notes:' + id;
      const notes = (await env.SEATS.get(key, 'json')) || [];
      const n = (notes.length ? notes[notes.length - 1].n : 0) + 1;
      notes.push({ n: n, at: Date.now(), data: body.data });
      while (notes.length > MAX_NOTES) notes.shift();
      await env.SEATS.put(key, JSON.stringify(notes), { expirationTtl: TTL });
      return json({ ok: true });
    }

    if (path === '/api/seat/notes') {
      const id = u.searchParams.get('id');
      if (!goodId(id)) return json({ error: 'no such seat' }, 404);
      const seat = await env.SEATS.get('seat:' + id, 'json');
      if (!seat) return json({ error: 'no such seat' }, 404);
      const want = await kingHash(request.headers.get('x-squatch-king'));
      if (seat.king !== want) return json({ error: 'not your seat' }, 403);
      const since = +(u.searchParams.get('since') || 0);
      const notes = (await env.SEATS.get('notes:' + id, 'json')) || [];
      return json({ notes: notes.filter(n => n.n > since) });
    }

    /* the guest's page and its parts, mirrored from the King's glass */
    if (request.method === 'GET') {
      let want = path;
      if (path.startsWith('/s/') && path.length > 3) want = '/squatch.html';
      const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
      const type = Object.keys(types).find(s => want.endsWith(s)) || 'text/html; charset=utf-8';
      const page = await mirror(want, type);
      const out = new Response(page.body, { status: page.status, headers: page.headers });
      if (out.headers.get('content-type') && out.headers.get('content-type').indexOf('text/html') === 0) {
        out.headers.set('cache-control', 'no-store');
      }
      return out;
    }
    return json({ error: 'no' }, 404);
  },
};
