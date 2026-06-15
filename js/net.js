import { S, clamp } from './state.js';
import { occMap, legalMoves, startMove } from './engine.js';
import { startGame } from './game.js';

const TRYSTERO = 'https://esm.sh/trystero/nostr';
const APP_ID = 'niochess-v1';

function setStatus(msg, cls) {
  const el = document.getElementById('netStatus');
  el.textContent = msg;
  el.className = 'netStatus' + (cls ? ' ' + cls : '');
}

export function snapshot(now) {
  return {
    over: S.result,
    ps: S.pieces.map(p =>
      p.state === 'idle'
        ? { i: p.id, c: p.color, k: p.type, s: 0, f: p.file, r: p.rank }
        : {
            i: p.id, c: p.color, k: p.type, s: 1,
            ff: p.fromFile, fr: p.fromRank, tf: p.toFile, tr: p.toRank,
            pr: clamp((now - p.start) / p.dur, 0, 1), d: p.dur,
          }
    ),
  };
}

export function broadcast(now) {
  if (S.net) S.net.sendState(snapshot(now));
  S.lastSnap = now;
}

function guestApply(d) {
  const now = performance.now();
  S.pieces = d.ps.map(o =>
    o.s === 0
      ? { id: o.i, color: o.c, type: o.k, state: 'idle', file: o.f, rank: o.r }
      : {
          id: o.i, color: o.c, type: o.k, state: 'moving',
          fromFile: o.ff, fromRank: o.fr, toFile: o.tf, toRank: o.tr,
          dur: o.d, start: now - o.pr * o.d,
        }
  );
  S.result = d.over;
  S.banner = d.over || null;
}

function hostHandleMove(d) {
  if (S.mode !== 'host' || S.result) return;
  const p = S.pieces.find(x => x.id === d.id && x.state === 'idle' && x.color === 'black');
  if (!p) return;
  const m = occMap();
  if (legalMoves(p, m).some(([F, R]) => F === d.f && R === d.r)) startMove(p, d.f, d.r);
}

function peerJoin(pid) {
  if (!S.net || S.net.peerId) return;
  S.net.peerId = pid;
  const host = S.net.selfId < pid;
  S.mode = host ? 'host' : 'guest';
  S.selectedId = null;

  if (host) {
    startGame();
  } else {
    S.pieces = [];
    S.result = null;
    S.banner = null;
    S.started = true;
  }

  setStatus('Соединено. Ты играешь ' + (host ? 'белыми (хост).' : 'чёрными.'), 'ok');
  document.getElementById('aiSwitch').classList.add('hidden');
  document.getElementById('aiPanel').classList.add('hidden');
}

function peerLeave() {
  S.banner = 'left';
  setStatus('Соперник отключился.', 'err');
}

export function leaveNet() {
  if (!S.net) return;
  try {
    if (S.net.room && S.net.room.leave) S.net.room.leave();
  } catch (e) {
    // ignore
  }
  S.net = null;
}

export async function connect(code) {
  if (!code) {
    setStatus('Введите код комнаты.', 'err');
    return;
  }

  const btn = document.getElementById('connectBtn');
  btn.disabled = true;
  setStatus('Загрузка P2P-модуля…');

  let mod;
  try {
    mod = await import(TRYSTERO);
  } catch (e) {
    setStatus('Не удалось загрузить P2P. Открой страницу через локальный сервер.', 'err');
    btn.disabled = false;
    return;
  }

  try {
    const { joinRoom, selfId } = mod;
    const room = joinRoom({ appId: APP_ID }, code);
    const [sendMove, onMove] = room.makeAction('mv');
    const [sendState, onState] = room.makeAction('st');

    S.net = { room, sendMove, sendState, selfId, peerId: null };
    onMove(d => hostHandleMove(d));
    onState(d => guestApply(d));
    room.onPeerJoin(pid => peerJoin(pid));
    room.onPeerLeave(() => peerLeave());

    setStatus('Ожидание соперника… код: ' + code);
  } catch (e) {
    setStatus('Ошибка: ' + e.message, 'err');
    btn.disabled = false;
  }
}
