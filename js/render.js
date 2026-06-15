import { S, N, GLYPH, FILES, lerp, clamp } from './state.js';
import { occMap, legalMoves } from './engine.js';

const grid = document.getElementById('grid');
const layer = document.getElementById('layer');
const frame = document.querySelector('.board-frame');
const els = new Map();
let shownBanner;

const BANNER_TEXT = {
  start: ['niochess', 'Нажми «Новая партия», чтобы начать.'],
  white: ['Белые победили', 'Чёрный король съеден.'],
  black: ['Чёрные победили', 'Белый король съеден.'],
  draw: ['Ничья', 'Оба короля пали разом.'],
  left: ['Соперник вышел', 'Соединение разорвано.'],
};

export function recalc() {
  S.SQ = frame.getBoundingClientRect().width / N;
}

export function buildCells(onCell) {
  grid.innerHTML = '';
  for (let r = 0; r < N; r++) {
    for (let f = 0; f < N; f++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + f) % 2 ? 'dark' : 'light');
      cell.dataset.f = f;
      cell.dataset.r = r;
      if (r === 7) cell.innerHTML += `<span class="lbl file">${FILES[f]}</span>`;
      if (f === 0) cell.innerHTML += `<span class="lbl rank">${8 - r}</span>`;
      cell.addEventListener('click', () => onCell(f, r));
      grid.appendChild(cell);
    }
  }
}

function renderBanner() {
  if (S.banner === shownBanner) return;
  shownBanner = S.banner;
  const el = document.getElementById('banner');
  if (!S.banner) {
    el.classList.remove('show');
    return;
  }
  const [title, sub] = BANNER_TEXT[S.banner] || ['', ''];
  document.getElementById('bTitle').textContent = title;
  document.getElementById('bSub').textContent = sub;
  el.classList.add('show');
}

export function render(now) {
  const sel = S.selectedId != null
    ? S.pieces.find(p => p.id === S.selectedId && p.state === 'idle')
    : null;
  const m = occMap();
  const targets = new Set((sel ? legalMoves(sel, m) : []).map(t => t[0] + ',' + t[1]));

  for (const cell of grid.children) {
    const f = +cell.dataset.f;
    const r = +cell.dataset.r;
    const key = f + ',' + r;
    cell.classList.toggle('sel', !!sel && sel.file === f && sel.rank === r);
    const isTarget = targets.has(key);
    cell.classList.toggle('tgt', isTarget);
    cell.classList.toggle('cap', isTarget && m.has(key));
  }

  const seen = new Set();
  for (const p of S.pieces) {
    seen.add(p.id);
    let el = els.get(p.id);
    if (!el) {
      el = document.createElement('div');
      el.innerHTML = '<span class="g"></span><span class="bar"><i></i></span>';
      layer.appendChild(el);
      els.set(p.id, el);
    }
    el.className = 'piece ' + p.color + (p.state === 'moving' ? ' moving' : '');
    el.style.setProperty('--glow', p.color === 'white' ? 'var(--glow-w)' : 'var(--glow-b)');
    el.querySelector('.g').textContent = GLYPH[p.type];

    let x, y;
    if (p.state === 'idle') {
      x = p.file * S.SQ;
      y = p.rank * S.SQ;
    } else {
      const t = clamp((now - p.start) / p.dur, 0, 1);
      x = lerp(p.fromFile, p.toFile, t) * S.SQ;
      y = lerp(p.fromRank, p.toRank, t) * S.SQ;
      el.querySelector('.bar i').style.width = t * 100 + '%';
    }
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  for (const [id, el] of els) {
    if (!seen.has(id)) {
      el.remove();
      els.delete(id);
    }
  }

  document.getElementById('cntW').textContent = S.pieces.filter(p => p.color === 'white').length;
  document.getElementById('cntB').textContent = S.pieces.filter(p => p.color === 'black').length;
  document.getElementById('cntMove').textContent = S.pieces.filter(p => p.state === 'moving').length;
  renderBanner();
}
