import { S } from './state.js';
import { setupBoard } from './engine.js';
import { broadcast } from './net.js';

export function showStart() {
  setupBoard();
  S.started = false;
  S.banner = 'start';
}

export function startGame() {
  setupBoard();
  S.started = true;
  S.banner = null;
  S.aiNextRandom = performance.now() + 800;
  S.aiReactAt = null;
  if (S.mode === 'host') broadcast(performance.now());
}
