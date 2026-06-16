import { S } from './state.js';
import { setupBoard } from './engine.js';
import { broadcast } from './net.js';

export function showStart() {
  setupBoard();
  S.started = false;
  S.banner = 'start';
  S.overReason = null;
  S.flip = false;
  S.myColor = 'white';
  S.rateStatus = null;
  S.rateValue = null;
}

export function startGame() {
  S.overReason = null;
  S.banner = null;
  S.reported = false;
  S.reportInFlight = false;
  S.reportRetryAt = 0;
  S.reportTries = 0;
  S.rateStatus = null;
  S.rateValue = null;
  if (S.mode === 'host') {
    S.coordWhite = S.coordWhite == null ? Math.random() < 0.5 : !S.coordWhite;
    S.myColor = S.coordWhite ? 'white' : 'black';
    S.flip = S.myColor === 'black';
    S.matchId = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    setupBoard();
    S.started = true;
    broadcast(performance.now());
  } else {
    S.myColor = 'white';
    S.flip = false;
    S.matchId = null;
    setupBoard();
    S.started = true;
    S.aiNextRandom = performance.now() + 800;
    S.aiReactAt = null;
  }
}
