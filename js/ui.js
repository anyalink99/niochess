import { S, AI, isPlaying } from './state.js';
import { occMap, idleAt, legalMoves, startMove, resolveArrivals } from './engine.js';
import { aiTick } from './ai.js';
import { connect, broadcast, leaveNet } from './net.js';
import { startGame, showStart } from './game.js';
import { render, recalc, buildCells, resetPieceEls } from './render.js';
import { T, applyI18n } from './i18n.js';
import * as rating from './rating.js';

const $ = id => document.getElementById(id);
const frame = document.querySelector('.board-frame');

const LS_KEY = 'niochess:settings';
const PERSIST = ['travel', 'flight', 'aCap', 'aSnipe', 'aReactMin', 'aReactMax', 'aMoveMin', 'aMoveMax'];

function loadSettings() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch (e) {
    data = {};
  }
  PERSIST.forEach(id => { if (data[id] != null) $(id).value = data[id]; });
  if (typeof data.ai === 'boolean') $('ai').checked = data.ai;
  S.showBar = data.bar !== false;
  S.showHints = data.hints !== false;
  S.moveMode = data.mode || 'both';
  $('optBar').checked = S.showBar;
  $('optHints').checked = S.showHints;
  applyMoveSeg();
}

function saveSettings() {
  const data = { ai: $('ai').checked, bar: S.showBar, hints: S.showHints, mode: S.moveMode };
  PERSIST.forEach(id => { data[id] = $(id).value; });
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
  }
}

function applyMoveSeg() {
  document.querySelectorAll('#moveSeg .seg-opt')
    .forEach(b => b.classList.toggle('is-on', b.dataset.mode === S.moveMode));
}

function openModal() { $('modal').classList.add('open'); }
function closeModal() { $('modal').classList.remove('open'); }
function closeLb() { $('lbModal').classList.remove('open'); }

function renderLeaderboard(rows) {
  const list = $('lbList');
  list.innerHTML = '';
  if (!rows.length) { list.textContent = T.lbEmpty; return; }
  rows.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'lbRow';
    row.innerHTML = '<span class="pos"></span><span class="n"></span><span class="r"></span>';
    row.querySelector('.pos').textContent = i + 1;
    row.querySelector('.n').textContent = r.nick;
    row.querySelector('.r').textContent = r.rating;
    list.appendChild(row);
  });
}

async function openLb() {
  $('lbModal').classList.add('open');
  renderLeaderboard([]);
  renderLeaderboard(await rating.top(50));
}

function setupRating() {
  if (!rating.ratingEnabled()) return;
  $('ratingBox').classList.remove('hidden');
  $('nickInput').value = rating.getNick();
  $('nickSave').addEventListener('click', async () => {
    const res = await rating.claim($('nickInput').value.trim());
    const ok = res && res.ok;
    $('nickStatus').textContent = ok ? '✓ ' + res.rating : (res && res.error) || 'error';
    $('nickStatus').className = 'netStatus ' + (ok ? 'ok' : 'err');
  });
  $('lbBtn').addEventListener('click', openLb);
  $('lbClose').addEventListener('click', closeLb);
  $('lbModal').addEventListener('click', e => { if (e.target === $('lbModal')) closeLb(); });
}

function canControl(p) {
  if (S.mode === 'local') return S.aiOn ? p.color === 'white' : true;
  return p.color === S.myColor;
}

let drag = null;

function pointerSquare(cx, cy) {
  const rect = frame.getBoundingClientRect();
  const sq = rect.width / 8;
  let col = Math.floor((cx - rect.left) / sq);
  let row = Math.floor((cy - rect.top) / sq);
  col = col < 0 ? 0 : col > 7 ? 7 : col;
  row = row < 0 ? 0 : row > 7 ? 7 : row;
  return { f: S.flip ? 7 - col : col, r: S.flip ? 7 - row : row };
}

function setDragPos(cx, cy) {
  const rect = frame.getBoundingClientRect();
  const sq = rect.width / 8;
  const px = cx - rect.left;
  const py = cy - rect.top;
  const x = S.flip ? rect.width - px - sq / 2 : px - sq / 2;
  const y = S.flip ? rect.height - py - sq / 2 : py - sq / 2;
  S.drag = { id: drag.id, x, y };
}

function doMove(piece, f, r) {
  if (S.mode === 'guest') S.net.sendMove({ id: piece.id, f, r });
  else startMove(piece, f, r);
}

function onPointerDown(e) {
  if (!isPlaying()) return;
  e.preventDefault();
  const { f, r } = pointerSquare(e.clientX, e.clientY);
  const m = occMap();
  const sel = S.selectedId != null
    ? S.pieces.find(p => p.id === S.selectedId && p.state === 'idle')
    : null;

  if (S.moveMode !== 'drag' && sel && legalMoves(sel, m).some(([F, R]) => F === f && R === r)) {
    doMove(sel, f, r);
    S.selectedId = null;
    return;
  }

  const here = idleAt(f, r);
  if (here && canControl(here)) {
    S.selectedId = here.id;
    if (S.moveMode !== 'tap') {
      drag = { id: here.id, moved: false };
      S.dragTo = f + ',' + r;
      setDragPos(e.clientX, e.clientY);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }
  } else {
    S.selectedId = null;
  }
}

function onPointerMove(e) {
  if (!drag) return;
  drag.moved = true;
  const { f, r } = pointerSquare(e.clientX, e.clientY);
  S.dragTo = f + ',' + r;
  setDragPos(e.clientX, e.clientY);
}

function onPointerUp(e) {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  const d = drag;
  drag = null;
  S.drag = null;
  S.dragTo = null;
  if (!d || !d.moved) return;
  const piece = S.pieces.find(p => p.id === d.id && p.state === 'idle');
  if (!piece) return;
  const { f, r } = pointerSquare(e.clientX, e.clientY);
  const m = occMap();
  if (legalMoves(piece, m).some(([F, R]) => F === f && R === r)) {
    doMove(piece, f, r);
    S.selectedId = null;
  } else if (!(f === piece.file && r === piece.rank)) {
    S.selectedId = null;
  }
}

function loop(now) {
  if (S.mode === 'local') {
    resolveArrivals(now);
    aiTick(now);
  } else if (S.mode === 'host') {
    resolveArrivals(now);
    if (now - S.lastSnap >= 70) broadcast(now);
  }
  render(now);
  syncPanel();
  maybeReport();
  requestAnimationFrame(loop);
}

function maybeReport() {
  if (!rating.ratingEnabled() || S.reported || !S.matchId || !S.result) return;
  if (S.mode !== 'host' && S.mode !== 'guest') return;
  if (S.reportInFlight || performance.now() < S.reportRetryAt) return;
  const myNick = rating.getNick();
  if (!myNick) { S.rateStatus = 'nonick'; return; }
  if (S.oppNick && S.oppNick === myNick) { S.rateStatus = 'samenick'; return; }
  S.reportInFlight = true;
  S.rateStatus = 'sending';
  const mid = S.matchId;
  const outcome = S.result === 'draw' ? 'draw' : (S.result === S.myColor ? 'win' : 'loss');
  rating.report(mid, outcome).then(res => {
    S.reportInFlight = false;
    if (S.matchId !== mid) return;
    onReportResult(res, mid);
  });
}

function onReportResult(res, mid) {
  const st = res && res.status;
  if (st === 'rated') {
    S.reported = true;
    S.rateStatus = 'rated';
    S.rateValue = res.rating != null ? res.rating : null;
  } else if (st === 'rejected') {
    S.reported = true;
    S.rateStatus = 'rejected';
  } else if (st === 'pending' || st === 'already' || st === 'full') {
    S.reported = true;
    S.rateStatus = 'pending';
    pollRated(mid, 0);
  } else if (st === 'nonick') {
    S.rateStatus = 'nonick';
  } else {
    S.reportTries += 1;
    S.rateStatus = 'error';
    if (S.reportTries < 3) S.reportRetryAt = performance.now() + 4000;
    else S.reported = true;
  }
}

function pollRated(mid, tries) {
  if (tries >= 8 || S.matchId !== mid) return;
  setTimeout(async () => {
    if (S.matchId !== mid) return;
    const ms = await rating.matchStatus(mid);
    if (S.matchId !== mid) return;
    if (ms && ms.status === 'rated') {
      const meR = await rating.me();
      if (S.matchId !== mid) return;
      S.rateStatus = 'rated';
      S.rateValue = meR && meR.rating != null ? meR.rating : null;
    } else if (ms && ms.status === 'rejected') {
      S.rateStatus = 'rejected';
    } else {
      pollRated(mid, tries + 1);
    }
  }, 2500);
}

function syncTravel() {
  S.travel = +$('travel').value;
  $('ttLabel').textContent = (S.travel / 1000).toFixed(1) + ' ' + T.sec;
}

function syncFlight() {
  S.flightLimit = +$('flight').value;
  $('flLabel').textContent = String(S.flightLimit);
}

function bindAiPanel() {
  const upd = () => {
    AI.captureBias = +$('aCap').value;
    $('lCap').textContent = (+$('aCap').value).toFixed(2);
    AI.snipeBias = +$('aSnipe').value;
    $('lSnipe').textContent = (+$('aSnipe').value).toFixed(2);
    AI.reactMin = +$('aReactMin').value * 1000;
    AI.reactMax = +$('aReactMax').value * 1000;
    $('lReact').textContent =
      (+$('aReactMin').value).toFixed(1) + '–' + (+$('aReactMax').value).toFixed(1) + ' ' + T.sec;
    AI.moveMin = +$('aMoveMin').value * 1000;
    AI.moveMax = +$('aMoveMax').value * 1000;
    $('lMove').textContent =
      (+$('aMoveMin').value).toFixed(1) + '–' + (+$('aMoveMax').value).toFixed(1) + ' ' + T.sec;
  };
  ['aCap', 'aSnipe', 'aReactMin', 'aReactMax', 'aMoveMin', 'aMoveMax']
    .forEach(id => $(id).addEventListener('input', upd));
  upd();
}

let lastPanelSig;
function syncPanel() {
  const playing = isPlaying();
  const sig = (playing ? 1 : 0) | (S.netTab ? 2 : 0);
  if (sig === lastPanelSig) return;
  lastPanelSig = sig;
  $('settings').classList.toggle('collapsed', playing);
  $('surrenderBtn').classList.toggle('collapsed', !playing);
  $('netBox').classList.toggle('collapsed', !S.netTab);
  $('aiGroup').classList.toggle('collapsed', S.netTab);
  $('tabNet').classList.toggle('is-on', S.netTab);
  $('tabLocal').classList.toggle('is-on', !S.netTab);
}

function surrender() {
  if (!isPlaying()) return;
  S.overReason = 'surrender';
  if (S.mode === 'host') {
    S.result = S.myColor === 'white' ? 'black' : 'white';
    broadcast(performance.now());
  } else if (S.mode === 'guest') {
    S.net.sendSurrender(1);
    S.result = S.myColor === 'white' ? 'black' : 'white';
  } else {
    S.result = S.myColor === 'white' ? 'black' : 'white';
  }
}

function closeDrawer() {
  $('panel').classList.remove('open');
  $('scrim').classList.remove('open');
}

function toggleDrawer() {
  $('panel').classList.toggle('open');
  $('scrim').classList.toggle('open');
}

function selectLocal() {
  S.netTab = false;
  leaveNet();
  S.mode = 'local';
  showStart();
}

function selectNet() {
  S.netTab = true;
  leaveNet();
  S.mode = 'local';
  showStart();
}

function wireControls() {
  $('travel').addEventListener('input', syncTravel);
  $('flight').addEventListener('input', syncFlight);
  $('ai').addEventListener('change', () => { S.aiOn = $('ai').checked; });
  $('genCode').addEventListener('click', () => {
    $('code').value = Math.random().toString(36).slice(2, 7);
  });
  $('connectBtn').addEventListener('click', () => connect($('code').value.trim().toLowerCase()));
  $('resetBtn').addEventListener('click', () => { if (S.mode !== 'guest') startGame(); });
  $('surrenderBtn').addEventListener('click', surrender);
  $('bBtn').addEventListener('click', () => {
    if (S.banner === 'left') { leaveNet(); selectNet(); return; }
    if (S.result && S.mode === 'guest') return;
    startGame();
  });
  $('tabLocal').addEventListener('click', selectLocal);
  $('tabNet').addEventListener('click', selectNet);
  $('burger').addEventListener('click', toggleDrawer);
  $('scrim').addEventListener('click', closeDrawer);
  frame.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', recalc);

  $('gear').addEventListener('click', openModal);
  $('modalClose').addEventListener('click', closeModal);
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeLb(); } });
  $('optBar').addEventListener('change', () => { S.showBar = $('optBar').checked; resetPieceEls(); saveSettings(); });
  $('optHints').addEventListener('change', () => { S.showHints = $('optHints').checked; saveSettings(); });
  document.querySelectorAll('#moveSeg .seg-opt').forEach(b =>
    b.addEventListener('click', () => { S.moveMode = b.dataset.mode; applyMoveSeg(); saveSettings(); }));

  PERSIST.forEach(id => $(id).addEventListener('input', saveSettings));
  $('ai').addEventListener('change', saveSettings);
}

function initAccordion() {
  if (window.Kit && window.Kit.accordion) {
    window.Kit.accordion('#rulesAcc', { single: true });
  } else {
    const item = document.querySelector('#rulesAcc .k-accordion__item');
    if (item) item.classList.add('is-expanded');
  }
}

function init() {
  applyI18n();
  buildCells();
  recalc();
  loadSettings();
  S.aiOn = $('ai').checked;
  syncTravel();
  syncFlight();
  bindAiPanel();
  wireControls();
  setupRating();
  S.netTab = true;
  showStart();
  initAccordion();
  requestAnimationFrame(loop);
}

init();
