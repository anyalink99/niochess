const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const NICK_RE = /^[A-Za-z0-9_-]{2,16}$/;
const START = 1000;
const K = 24;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function expected(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function getPlayer(env, nick) {
  return env.DB.prepare('SELECT * FROM players WHERE nick = ?').bind(nick).first();
}

async function claim(request, env) {
  const { nick, secret } = await request.json();
  if (!NICK_RE.test(nick || '') || !secret) return json({ error: 'bad nick or secret' }, 400);
  const hash = await sha256(secret);
  const p = await getPlayer(env, nick);
  if (!p) {
    await env.DB.prepare(
      'INSERT INTO players (nick, secret_hash, rating, updated_at) VALUES (?, ?, ?, ?)'
    ).bind(nick, hash, START, Date.now()).run();
    return json({ ok: true, nick, rating: START, wins: 0, losses: 0, draws: 0, games: 0 });
  }
  if (p.secret_hash !== hash) return json({ error: 'nick taken' }, 409);
  return json({ ok: true, nick, rating: p.rating, wins: p.wins, losses: p.losses, draws: p.draws, games: p.games });
}

async function report(request, env) {
  const { matchId, nick, secret, outcome } = await request.json();
  if (!matchId || !NICK_RE.test(nick || '') || !secret) return json({ error: 'bad payload' }, 400);
  if (!['win', 'loss', 'draw'].includes(outcome)) return json({ error: 'bad outcome' }, 400);

  const p = await getPlayer(env, nick);
  if (!p || p.secret_hash !== (await sha256(secret))) return json({ error: 'auth' }, 403);

  await env.DB.prepare(
    "INSERT INTO matches (id, status, created_at) VALUES (?, 'pending', ?) ON CONFLICT(id) DO NOTHING"
  ).bind(matchId, Date.now()).run();

  let m = await env.DB.prepare('SELECT * FROM matches WHERE id = ?').bind(matchId).first();

  if (m.a_nick == null || m.a_nick === nick) {
    await env.DB.prepare('UPDATE matches SET a_nick = ?, a_outcome = ? WHERE id = ?')
      .bind(nick, outcome, matchId).run();
  } else if (m.b_nick == null || m.b_nick === nick) {
    await env.DB.prepare('UPDATE matches SET b_nick = ?, b_outcome = ? WHERE id = ?')
      .bind(nick, outcome, matchId).run();
  } else {
    return json({ ok: true, status: 'full' });
  }

  m = await env.DB.prepare('SELECT * FROM matches WHERE id = ?').bind(matchId).first();
  if (m.status !== 'pending' || !m.a_nick || !m.b_nick || m.a_nick === m.b_nick) {
    return json({ ok: true, status: m.status });
  }

  const consistent =
    (m.a_outcome === 'win' && m.b_outcome === 'loss') ||
    (m.a_outcome === 'loss' && m.b_outcome === 'win') ||
    (m.a_outcome === 'draw' && m.b_outcome === 'draw');
  if (!consistent) {
    await env.DB.prepare("UPDATE matches SET status = 'rejected' WHERE id = ? AND status = 'pending'").bind(matchId).run();
    return json({ ok: false, status: 'rejected' });
  }

  const claimed = await env.DB.prepare("UPDATE matches SET status = 'rated' WHERE id = ? AND status = 'pending'").bind(matchId).run();
  if (!claimed.meta.changes) return json({ ok: true, status: 'already' });

  const a = await getPlayer(env, m.a_nick);
  const b = await getPlayer(env, m.b_nick);
  if (!a || !b) return json({ ok: false, status: 'missing-player' });

  const sa = m.a_outcome === 'win' ? 1 : m.a_outcome === 'draw' ? 0.5 : 0;
  const sb = 1 - sa;
  const ea = expected(a.rating, b.rating);
  const ra = Math.round(a.rating + K * (sa - ea));
  const rb = Math.round(b.rating + K * (sb - (1 - ea)));

  const upd = (pl, newR, s) => env.DB.prepare(
    'UPDATE players SET rating = ?, games = games + 1, wins = wins + ?, losses = losses + ?, draws = draws + ?, updated_at = ? WHERE nick = ?'
  ).bind(newR, s === 1 ? 1 : 0, s === 0 ? 1 : 0, s === 0.5 ? 1 : 0, Date.now(), pl.nick);

  await env.DB.batch([upd(a, ra, sa), upd(b, rb, sb)]);
  return json({ ok: true, status: 'rated', rating: nick === a.nick ? ra : rb });
}

async function top(url, env) {
  const n = Math.min(parseInt(url.searchParams.get('n') || '50', 10) || 50, 100);
  const rows = await env.DB.prepare(
    'SELECT nick, rating, wins, losses, draws, games FROM players WHERE games > 0 ORDER BY rating DESC LIMIT ?'
  ).bind(n).all();
  return json({ top: rows.results || [] });
}

async function me(url, env) {
  const p = await getPlayer(env, url.searchParams.get('nick') || '');
  if (!p) return json({ error: 'not found' }, 404);
  return json({ nick: p.nick, rating: p.rating, wins: p.wins, losses: p.losses, draws: p.draws, games: p.games });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/claim') return await claim(request, env);
      if (request.method === 'POST' && url.pathname === '/report') return await report(request, env);
      if (request.method === 'GET' && url.pathname === '/top') return await top(url, env);
      if (request.method === 'GET' && url.pathname === '/me') return await me(url, env);
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
};
