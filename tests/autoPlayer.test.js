import test from 'node:test';
import assert from 'node:assert/strict';

import { MinesweeperGame, GameStatus, MINE } from '../old/minesweeper/scripts/game.js';
import { AutoPlayer, RandomAutoPlayer, applyAutoAction } from '../old/minesweeper/scripts/autoPlayer.js';

const layout = [
  [MINE, 1, 0, 1, MINE],
  [1, 1, 0, 1, 1],
  [0, 0, 0, 0, 0],
  [1, 1, 0, 1, 1],
  [MINE, 1, 0, 1, MINE],
];

test('auto player can cruise through a handcrafted board', async () => {
  const game = new MinesweeperGame(5, 5, 5);
  game.loadLayout(layout);
  const auto = new AutoPlayer(game, { delayMs: 0 });
  await auto.play(async action => {
    applyAutoAction(game, action);
  });
  assert.equal(game.status, GameStatus.WON);
});

test('random auto player finishes the simplest safe board without flagging', async () => {
  const game = new MinesweeperGame(1, 1, 0);
  const auto = new RandomAutoPlayer(game, { delayMs: 0, rng: () => 0 });
  await auto.play(async action => {
    applyAutoAction(game, action);
  });
  assert.equal(game.status, GameStatus.WON);
  assert.equal(game.flagged[0][0], false);
});
