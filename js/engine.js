import { N, BACK, S, inB } from './state.js';

export const occMap = () => {
  const m = new Map();
  for (const p of S.pieces) if (p.state === 'idle') m.set(p.file + ',' + p.rank, p);
  return m;
};

export const idleAt = (f, r) =>
  S.pieces.find(p => p.state === 'idle' && p.file === f && p.rank === r) || null;

export const movingCount = color =>
  S.pieces.filter(p => p.state === 'moving' && p.color === color).length;

export function legalMoves(p, m) {
  const res = [];
  const me = p.color;
  const f = p.file;
  const r = p.rank;
  const enemy = (F, R) => {
    const o = m.get(F + ',' + R);
    return o && o.color !== me;
  };
  const empty = (F, R) => !m.get(F + ',' + R);
  const slide = dirs => {
    for (const [df, dr] of dirs) {
      let F = f + df;
      let R = r + dr;
      while (inB(F, R)) {
        const o = m.get(F + ',' + R);
        if (!o) {
          res.push([F, R]);
        } else {
          if (o.color !== me) res.push([F, R]);
          break;
        }
        F += df;
        R += dr;
      }
    }
  };

  if (p.type === 'pawn') {
    const dir = me === 'white' ? -1 : 1;
    const start = me === 'white' ? 6 : 1;
    if (inB(f, r + dir) && empty(f, r + dir)) {
      res.push([f, r + dir]);
      if (r === start && empty(f, r + 2 * dir)) res.push([f, r + 2 * dir]);
    }
    for (const df of [-1, 1]) {
      if (inB(f + df, r + dir) && enemy(f + df, r + dir)) res.push([f + df, r + dir]);
    }
  } else if (p.type === 'knight') {
    for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
      if (inB(f + df, r + dr) && (empty(f + df, r + dr) || enemy(f + df, r + dr))) {
        res.push([f + df, r + dr]);
      }
    }
  } else if (p.type === 'king') {
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (!df && !dr) continue;
        if (inB(f + df, r + dr) && (empty(f + df, r + dr) || enemy(f + df, r + dr))) {
          res.push([f + df, r + dr]);
        }
      }
    }
  } else if (p.type === 'rook') {
    slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
  } else if (p.type === 'bishop') {
    slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  } else if (p.type === 'queen') {
    slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
  }
  return res;
}

export function startMove(p, f, r) {
  if (movingCount(p.color) >= S.flightLimit) return false;
  p.fromFile = p.file;
  p.fromRank = p.rank;
  p.toFile = f;
  p.toRank = r;
  p.start = performance.now();
  p.dur = S.travel;
  p.state = 'moving';
  return true;
}

export function settle(p, f, r) {
  p.state = 'idle';
  p.file = f;
  p.rank = r;
  delete p.fromFile;
  delete p.fromRank;
  delete p.toFile;
  delete p.toRank;
  delete p.start;
  if (p.type === 'pawn' && ((p.color === 'white' && r === 0) || (p.color === 'black' && r === 7))) {
    p.type = 'queen';
  }
}

export function resolveArrivals(now) {
  const arrived = S.pieces.filter(p => p.state === 'moving' && now - p.start >= p.dur);
  if (!arrived.length) return;

  const groups = new Map();
  for (const p of arrived) {
    const k = p.toFile + ',' + p.toRank;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }

  const kill = new Set();
  for (const [k, list] of groups) {
    const [tf, tr] = k.split(',').map(Number);
    const occ = idleAt(tf, tr);
    const colors = new Set(list.map(p => p.color));

    if (colors.size === 2) {
      list.forEach(p => kill.add(p.id));
      if (occ) kill.add(occ.id);
    } else {
      const col = list[0].color;
      if (occ && occ.color === col) {
        list.forEach(p => kill.add(p.id));
      } else {
        if (occ) kill.add(occ.id);
        list.sort((a, b) => a.id - b.id);
        settle(list[0], tf, tr);
        for (let i = 1; i < list.length; i++) kill.add(list[i].id);
      }
    }
  }

  if (kill.size) S.pieces = S.pieces.filter(p => !kill.has(p.id));
  checkEnd();
}

export function checkEnd() {
  const w = S.pieces.some(p => p.color === 'white' && p.type === 'king');
  const b = S.pieces.some(p => p.color === 'black' && p.type === 'king');
  if (w && b) return;
  S.result = !w && !b ? 'draw' : w ? 'white' : 'black';
  S.overReason = 'king';
}

export function setupBoard() {
  S.pieces = [];
  S.nextId = 1;
  S.selectedId = null;
  S.result = null;
  const add = (color, type, f, r) =>
    S.pieces.push({ id: S.nextId++, color, type, file: f, rank: r, state: 'idle' });
  for (let f = 0; f < N; f++) {
    add('black', BACK[f], f, 0);
    add('black', 'pawn', f, 1);
    add('white', 'pawn', f, 6);
    add('white', BACK[f], f, 7);
  }
}
