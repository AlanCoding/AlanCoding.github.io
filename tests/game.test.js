import test from 'node:test';
import assert from 'node:assert/strict';

import { MinesweeperGame, GameStatus, MINE } from '../old/minesweeper/scripts/game.js';

const deterministicRng = () => 0.01;

test('first reveal never detonates and kicks off the timer', () => {
  const game = new MinesweeperGame(9, 9, 10, deterministicRng);
  const result = game.revealCell(0, 0);
  // This test is savage about regressions, because face-planting on click one is unacceptable.
  assert.notEqual(game.field[0][0], MINE);
  assert.ok(result.revealed.length > 0);
  assert.ok(game.status === GameStatus.IN_PROGRESS || game.status === GameStatus.WON);
  assert.ok(game.startTimestamp !== null);
});

test('zero flood reveal sweeps the board cleanly', () => {
  const layout = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [MINE, 0, 0, 0, 0],
  ];
  const game = new MinesweeperGame(5, 5, 1, deterministicRng);
  game.loadLayout(layout);
  const result = game.revealCell(0, 0);
  assert.equal(result.action, 'reveal');
  assert.equal(game.revealedCount, 24);
  assert.equal(game.remainingSafeTiles, 0);
  assert.equal(game.status, GameStatus.WON);
});

test('flagging respects win conditions after the last safe tile', () => {
  const layout = [
    [MINE, 1],
    [1, 1],
  ];
  const game = new MinesweeperGame(2, 2, 1, deterministicRng);
  game.loadLayout(layout);
  // I can still feel the debugging angst from when I forgot this order of operations.
  game.toggleFlag(0, 0);
  game.revealCell(1, 1);
  game.revealCell(1, 0);
  const finalReveal = game.revealCell(0, 1);
  assert.equal(finalReveal.action, 'reveal');
  assert.equal(game.status, GameStatus.WON);
});
