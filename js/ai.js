import { S, AI, rng, isPlaying } from './state.js';
import { occMap, legalMoves, startMove } from './engine.js';

export function aiTick(now) {
  if (!isPlaying() || !S.aiOn) return;

  const m = occMap();
  const king = S.pieces.find(p => p.color === 'black' && p.type === 'king' && p.state === 'idle');
  const threat = king && S.pieces.some(p =>
    p.color === 'white' && p.state === 'moving' && p.toFile === king.file && p.toRank === king.rank);

  if (threat) {
    if (S.aiReactAt == null) S.aiReactAt = now + rng(AI.reactMin, AI.reactMax);
    if (now >= S.aiReactAt) {
      kingEscape(king, m);
      S.aiReactAt = null;
    }
  } else {
    S.aiReactAt = null;
  }

  if (now >= S.aiNextRandom) {
    S.aiNextRandom = now + rng(AI.moveMin, AI.moveMax);
    aiAct(m);
  }
}

function aiAct(m) {
  if (clearLanding(m)) return;
  if (snipeKing(m)) return;
  if (Math.random() < AI.snipeBias && snipe(m)) return;
  aiRandomMove(m);
}

function clearLanding(m) {
  const incoming = new Set(
    S.pieces.filter(p => p.color === 'black' && p.state === 'moving').map(p => p.toFile + ',' + p.toRank)
  );
  if (!incoming.size) return false;
  const blocker = S.pieces.find(p =>
    p.state === 'idle' && p.color === 'black' && incoming.has(p.file + ',' + p.rank));
  if (!blocker) return false;
  const moves = legalMoves(blocker, m).filter(([F, R]) => !incoming.has(F + ',' + R));
  if (!moves.length) return false;
  const mv = moves[(Math.random() * moves.length) | 0];
  return startMove(blocker, mv[0], mv[1]);
}

function reacher(m, f, r) {
  for (const p of S.pieces) {
    if (p.state !== 'idle' || p.color !== 'black') continue;
    if (legalMoves(p, m).some(([F, R]) => F === f && R === r)) return p;
  }
  return null;
}

function snipeKing(m) {
  const k = S.pieces.find(p => p.color === 'white' && p.type === 'king' && p.state === 'moving');
  if (!k) return false;
  const s = reacher(m, k.toFile, k.toRank);
  return s ? startMove(s, k.toFile, k.toRank) : false;
}

function snipe(m) {
  const order = { king: 9, queen: 5, rook: 4, bishop: 3, knight: 3, pawn: 1 };
  const movers = S.pieces
    .filter(p => p.color === 'white' && p.state === 'moving')
    .sort((a, b) => (order[b.type] || 0) - (order[a.type] || 0));
  for (const mv of movers) {
    const s = reacher(m, mv.toFile, mv.toRank);
    if (s) return startMove(s, mv.toFile, mv.toRank);
  }
  return false;
}

function kingEscape(king, m) {
  if (!king || king.state !== 'idle') return;
  const moves = legalMoves(king, m);
  if (!moves.length) return;
  const incoming = new Set(
    S.pieces.filter(p => p.color === 'white' && p.state === 'moving').map(p => p.toFile + ',' + p.toRank)
  );
  const safe = moves.filter(([F, R]) => !incoming.has(F + ',' + R));
  const pool = safe.length ? safe : moves;
  const mv = pool[(Math.random() * pool.length) | 0];
  startMove(king, mv[0], mv[1]);
}

function aiRandomMove(m) {
  const movers = S.pieces
    .filter(p => p.state === 'idle' && p.color === 'black')
    .map(p => ({ p, moves: legalMoves(p, m) }))
    .filter(x => x.moves.length);
  if (!movers.length) return;

  const caps = [];
  for (const x of movers) {
    for (const mv of x.moves) {
      if (m.has(mv[0] + ',' + mv[1])) caps.push({ p: x.p, mv });
    }
  }

  let p, mv;
  if (caps.length && Math.random() < AI.captureBias) {
    const c = caps[(Math.random() * caps.length) | 0];
    p = c.p;
    mv = c.mv;
  } else {
    const x = movers[(Math.random() * movers.length) | 0];
    p = x.p;
    mv = x.moves[(Math.random() * x.moves.length) | 0];
  }
  startMove(p, mv[0], mv[1]);
}
