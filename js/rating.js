const API_BASE = '';
const ID_KEY = 'niochess:id';

export const ratingEnabled = () => !!API_BASE;

function loadId() {
  try {
    return JSON.parse(localStorage.getItem(ID_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function saveId(id) {
  try {
    localStorage.setItem(ID_KEY, JSON.stringify(id));
  } catch (e) {
  }
}

function randSecret() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getNick() {
  const id = loadId();
  return id ? id.nick : '';
}

export async function claim(nick) {
  if (!ratingEnabled()) return { error: 'disabled' };
  const id = loadId();
  const secret = id && id.nick === nick ? id.secret : randSecret();
  const res = await fetch(API_BASE + '/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nick, secret }),
  }).then(r => r.json()).catch(() => ({ error: 'network' }));
  if (res && res.ok) saveId({ nick, secret });
  return res;
}

export function report(matchId, outcome) {
  if (!ratingEnabled()) return;
  const id = loadId();
  if (!id || !matchId) return;
  fetch(API_BASE + '/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, nick: id.nick, secret: id.secret, outcome }),
  }).catch(() => {});
}

export async function top(n = 50) {
  if (!ratingEnabled()) return [];
  const res = await fetch(API_BASE + '/top?n=' + n)
    .then(r => r.json())
    .catch(() => ({ top: [] }));
  return res.top || [];
}
