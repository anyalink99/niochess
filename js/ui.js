import { S, AI } from './state.js';
import { occMap, idleAt, legalMoves, startMove, resolveArrivals } from './engine.js';
import { aiTick } from './ai.js';
import { connect, broadcast, leaveNet } from './net.js';
import { startGame, showStart } from './game.js';
import { render, recalc, buildCells } from './render.js';

const $ = id => document.getElementById(id);

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
}

function saveSettings() {
  const data = { ai: $('ai').checked };
  PERSIST.forEach(id => { data[id] = $(id).value; });
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

function canControl(p) {
  if (S.mode === 'local') return S.aiOn ? p.color === 'white' : true;
  if (S.mode === 'host') return p.color === 'white';
  if (S.mode === 'guest') return p.color === 'black';
  return false;
}

function onCell(f, r) {
  if (S.result || !S.started) return;
  const m = occMap();
  const sel = S.selectedId != null
    ? S.pieces.find(p => p.id === S.selectedId && p.state === 'idle')
    : null;

  if (sel && legalMoves(sel, m).some(([F, R]) => F === f && R === r)) {
    if (S.mode === 'guest') {
      S.net.sendMove({ id: sel.id, f, r });
      S.selectedId = null;
    } else if (startMove(sel, f, r)) {
      S.selectedId = null;
    }
    return;
  }

  const here = idleAt(f, r);
  S.selectedId = here && canControl(here) ? here.id : null;
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
  requestAnimationFrame(loop);
}

function syncTravel() {
  S.travel = +$('travel').value;
  $('ttLabel').textContent = (S.travel / 1000).toFixed(1) + ' c';
}

function syncFlight() {
  const v = +$('flight').value;
  S.flightLimit = v;
  $('flLabel').textContent = String(v);
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
      (+$('aReactMin').value).toFixed(1) + '–' + (+$('aReactMax').value).toFixed(1) + ' c';
    AI.moveMin = +$('aMoveMin').value * 1000;
    AI.moveMax = +$('aMoveMax').value * 1000;
    $('lMove').textContent =
      (+$('aMoveMin').value).toFixed(1) + '–' + (+$('aMoveMax').value).toFixed(1) + ' c';
  };
  ['aCap', 'aSnipe', 'aReactMin', 'aReactMax', 'aMoveMin', 'aMoveMax']
    .forEach(id => $(id).addEventListener('input', upd));
  upd();
}

function selectLocal() {
  $('tabLocal').classList.add('is-on');
  $('tabNet').classList.remove('is-on');
  $('netBox').classList.add('hidden');
  $('aiSwitch').classList.remove('hidden');
  $('aiPanel').classList.remove('hidden');
  leaveNet();
  S.mode = 'local';
  showStart();
}

function selectNet() {
  $('tabNet').classList.add('is-on');
  $('tabLocal').classList.remove('is-on');
  $('netBox').classList.remove('hidden');
  $('aiSwitch').classList.add('hidden');
  $('aiPanel').classList.add('hidden');
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
  $('bBtn').addEventListener('click', () => {
    if (S.mode === 'guest') S.banner = null;
    else startGame();
  });
  $('tabLocal').addEventListener('click', selectLocal);
  $('tabNet').addEventListener('click', selectNet);
  window.addEventListener('resize', recalc);

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
  buildCells(onCell);
  recalc();
  loadSettings();
  S.aiOn = $('ai').checked;
  syncTravel();
  syncFlight();
  bindAiPanel();
  wireControls();
  $('tabLocal').classList.add('is-on');
  $('tabNet').classList.remove('is-on');
  showStart();
  initAccordion();
  requestAnimationFrame(loop);
}

init();
