import { S, clamp } from './state.js';
import { occMap, legalMoves, startMove } from './engine.js';
import { startGame } from './game.js';
import { T } from './i18n.js';

const TRYSTERO = 'https://esm.sh/trystero@0.25.2/nostr';
const APP_ID = 'niochess-v1';

function setStatus(msg, cls) {
  const el = document.getElementById('netStatus');
  el.textContent = msg;
  el.className = 'netStatus' + (cls ? ' ' + cls : '');
}

export function snapshot(now) {
  return {
    over: S.result,
    wy: S.overReason,
    cw: S.coordWhite,
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
  S.coordWhite = d.cw;
  S.myColor = d.cw ? 'black' : 'white';
  S.flip = S.myColor === 'black';
  S.result = d.over;
  S.overReason = d.wy || null;
}

function hostHandleMove(d) {
  if (S.mode !== 'host' || S.result) return;
  const guestColor = S.myColor === 'white' ? 'black' : 'white';
  const p = S.pieces.find(x => x.id === d.id && x.state === 'idle' && x.color === guestColor);
  if (!p) return;
  const m = occMap();
  if (legalMoves(p, m).some(([F, R]) => F === d.f && R === d.r)) startMove(p, d.f, d.r);
}

function hostHandleSurrender() {
  if (S.mode !== 'host' || S.result) return;
  S.overReason = 'surrender';
  S.result = S.myColor;
}

function peerJoin(pid) {
  if (!S.net || S.net.peerId) return;
  S.net.peerId = pid;
  const host = S.net.selfId < pid;
  S.mode = host ? 'host' : 'guest';
  S.selectedId = null;

  if (host) {
    startGame();
    const msg = S.myColor === 'white' ? T.netConnectedWhite : T.netConnectedBlack;
    setStatus(msg, 'ok');
  } else {
    S.pieces = [];
    S.result = null;
    S.overReason = null;
    S.banner = null;
    S.started = true;
    setStatus(T.netConnected, 'ok');
  }
}

function peerLeave() {
  S.banner = 'left';
  setStatus(T.netLeft, 'err');
}

export function leaveNet() {
  if (!S.net) return;
  try {
    if (S.net.room && S.net.room.leave) S.net.room.leave();
  } catch (e) {
  }
  S.net = null;
}

export async function connect(code) {
  if (!code) {
    setStatus(T.netNoCode, 'err');
    return;
  }

  const btn = document.getElementById('connectBtn');
  btn.disabled = true;
  setStatus(T.netLoading);
  S.coordWhite = null;

  let mod;
  try {
    mod = await import(TRYSTERO);
  } catch (e) {
    setStatus(T.netLoadFail, 'err');
    btn.disabled = false;
    return;
  }

  try {
    const { joinRoom, selfId } = mod;
    const room = joinRoom({ appId: APP_ID }, code);
    const moveAction = room.makeAction('mv');
    const stateAction = room.makeAction('st');
    const surrAction = room.makeAction('sr');

    const safeSend = action => d => {
      try {
        const r = action.send(d);
        if (r && r.catch) r.catch(() => {});
      } catch (e) {
      }
    };

    S.net = {
      room,
      selfId,
      peerId: null,
      sendMove: safeSend(moveAction),
      sendState: safeSend(stateAction),
      sendSurrender: safeSend(surrAction),
    };

    moveAction.onMessage = d => hostHandleMove(d);
    stateAction.onMessage = d => guestApply(d);
    surrAction.onMessage = () => hostHandleSurrender();
    room.onPeerJoin = pid => peerJoin(pid);
    room.onPeerLeave = () => peerLeave();

    setStatus(T.netWaiting(code));
  } catch (e) {
    setStatus(T.netError(e.message), 'err');
    btn.disabled = false;
  }
}
