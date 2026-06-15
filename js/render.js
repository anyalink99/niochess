import { S, N, GLYPH, FILES, lerp, clamp } from './state.js';
import { occMap, legalMoves } from './engine.js';
import { T } from './i18n.js';

const grid = document.getElementById('grid');
const layer = document.getElementById('layer');
const frame = document.querySelector('.board-frame');
const bannerEl = document.getElementById('banner');
const bTitle = document.getElementById('bTitle');
const bSub = document.getElementById('bSub');
const cntW = document.getElementById('cntW');
const cntB = document.getElementById('cntB');
const cntMove = document.getElementById('cntMove');

const els = new Map();
const EMPTY = new Set();
let shownKey;
let lastCounts;
let lastFlip;

export function recalc() {
  S.SQ = frame.getBoundingClientRect().width / N;
}

export function buildCells() {
  grid.innerHTML = '';
  for (let r = 0; r < N; r++) {
    for (let f = 0; f < N; f++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + f) % 2 ? 'dark' : 'light');
      cell.dataset.f = f;
      cell.dataset.r = r;
      if (r === 7) cell.innerHTML += `<span class="lbl file">${FILES[f]}</span>`;
      if (f === 0) cell.innerHTML += `<span class="lbl rank">${8 - r}</span>`;
      grid.appendChild(cell);
    }
  }
}

function overlayText() {
  if (S.result) {
    if (S.result === 'draw') return [T.resDraw, T.subKing];
    const net = S.mode === 'host' || S.mode === 'guest';
    if (net) {
      const win = S.result === S.myColor;
      const sub = S.overReason === 'surrender' ? (win ? T.subSurrOpp : T.subSurrSelf) : T.subKing;
      return [win ? T.resWin : T.resLose, sub];
    }
    const title = S.result === 'white' ? T.resWhite : T.resBlack;
    return [title, S.overReason === 'surrender' ? T.subSurr : T.subKing];
  }
  if (S.banner) return T.banner[S.banner];
  return null;
}

function renderOverlay() {
  const key = (S.result || '') + '|' + (S.overReason || '') + '|' + (S.banner || '') + '|' + S.myColor + '|' + S.mode;
  if (key === shownKey) return;
  shownKey = key;
  const txt = overlayText();
  if (!txt) {
    bannerEl.classList.remove('show');
    return;
  }
  bTitle.textContent = txt[0];
  bSub.textContent = txt[1];
  bannerEl.classList.add('show');
}

export function render(now) {
  if (lastFlip !== S.flip) {
    frame.classList.toggle('flip', !!S.flip);
    lastFlip = S.flip;
  }

  const sel = S.selectedId != null
    ? S.pieces.find(p => p.id === S.selectedId && p.state === 'idle')
    : null;
  const m = sel ? occMap() : null;
  const targets = sel ? new Set(legalMoves(sel, m).map(t => t[0] + ',' + t[1])) : EMPTY;

  for (const cell of grid.children) {
    const f = +cell.dataset.f;
    const r = +cell.dataset.r;
    const key = f + ',' + r;
    cell.classList.toggle('sel', !!sel && sel.file === f && sel.rank === r);
    const isTarget = targets.has(key);
    cell.classList.toggle('tgt', isTarget);
    cell.classList.toggle('cap', isTarget && !!m && m.has(key));
    cell.classList.toggle('over', !!S.drag && isTarget && S.dragTo === key);
  }

  let nW = 0;
  let nB = 0;
  let nMove = 0;
  const seen = new Set();
  for (const p of S.pieces) {
    seen.add(p.id);
    if (p.color === 'white') nW++; else nB++;
    if (p.state === 'moving') nMove++;

    let el = els.get(p.id);
    if (!el) {
      el = document.createElement('div');
      el.innerHTML = '<span class="g"></span><span class="bar"><i></i></span>';
      el._g = el.querySelector('.g');
      el._bar = el.querySelector('.bar i');
      el._cls = el._glow = el._glyph = el._tf = el._bw = '';
      layer.appendChild(el);
      els.set(p.id, el);
    }

    const dragging = S.drag && S.drag.id === p.id;
    const cls = 'piece ' + p.color + (p.state === 'moving' ? ' moving' : '') + (dragging ? ' drag' : '');
    if (cls !== el._cls) { el.className = cls; el._cls = cls; }

    const glow = p.color === 'white' ? 'var(--glow-w)' : 'var(--glow-b)';
    if (glow !== el._glow) { el.style.setProperty('--glow', glow); el._glow = glow; }

    const glyph = GLYPH[p.type];
    if (glyph !== el._glyph) { el._g.textContent = glyph; el._glyph = glyph; }

    let x, y;
    if (dragging) {
      x = S.drag.x;
      y = S.drag.y;
    } else if (p.state === 'idle') {
      x = p.file * S.SQ;
      y = p.rank * S.SQ;
    } else {
      const t = clamp((now - p.start) / p.dur, 0, 1);
      x = lerp(p.fromFile, p.toFile, t) * S.SQ;
      y = lerp(p.fromRank, p.toRank, t) * S.SQ;
      const sx = 'scaleX(' + t + ')';
      if (sx !== el._bw) { el._bar.style.transform = sx; el._bw = sx; }
    }
    const tf = `translate(${x}px, ${y}px)`;
    if (tf !== el._tf) { el.style.transform = tf; el._tf = tf; }
  }

  for (const [id, el] of els) {
    if (!seen.has(id)) {
      el.remove();
      els.delete(id);
    }
  }

  const counts = nW + '|' + nB + '|' + nMove;
  if (counts !== lastCounts) {
    cntW.textContent = nW;
    cntB.textContent = nB;
    cntMove.textContent = nMove;
    lastCounts = counts;
  }

  renderOverlay();
}
