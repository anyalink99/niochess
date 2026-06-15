export const N = 8;

export const GLYPH = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
};

export const BACK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
export const FILES = 'abcdefgh';

export const AI = {
  captureBias: 0.7,
  snipeBias: 0.6,
  reactMin: 1000,
  reactMax: 3000,
  moveMin: 600,
  moveMax: 1500,
};

export const S = {
  pieces: [],
  nextId: 1,
  selectedId: null,
  result: null,
  banner: 'start',
  started: false,
  SQ: 0,
  mode: 'local',
  net: null,
  netTab: true,
  myColor: 'white',
  flip: false,
  coordWhite: null,
  drag: null,
  travel: 10000,
  flightLimit: 16,
  aiOn: true,
  aiNextRandom: 0,
  aiReactAt: null,
  lastSnap: 0,
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const inB = (f, r) => f >= 0 && f < N && r >= 0 && r < N;

export const rng = (a, b) => {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return lo + Math.random() * (hi - lo);
};
