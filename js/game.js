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
}

export function startGame() {
  S.overReason = null;
  S.banner = null;
  if (S.mode === 'host') {
    S.coordWhite = S.coordWhite == null ? Math.random() < 0.5 : !S.coordWhite;
    S.myColor = S.coordWhite ? 'white' : 'black';
    S.flip = S.myColor === 'black';
    setupBoard();
    S.started = true;
    broadcast(performance.now());
  } else {
    S.myColor = 'white';
    S.flip = false;
    setupBoard();
    S.started = true;
    S.aiNextRandom = performance.now() + 800;
    S.aiReactAt = null;
  }
}
