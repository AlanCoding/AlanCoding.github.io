import test from 'node:test';
import assert from 'node:assert/strict';

import { MinesweeperUI } from '../old/minesweeper/scripts/ui.js';
import { GameStatus } from '../old/minesweeper/scripts/game.js';

test('a finished game only records the winning score once', () => {
  const scoreCalls = [];
  const scoreRepository = {
    addScore(mode, difficulty, seconds) {
      scoreCalls.push({ mode, difficulty, seconds });
      return [];
    },
    getScores() {
      return [];
    },
  };

  const ui = new MinesweeperUI(
    {
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    {
      difficultyConfig: {
        test: { rows: 1, cols: 1, mines: 0, label: 'Test' },
      },
      scoreRepository,
    },
  );

  ui.currentDifficultyKey = 'test';
  ui.mode = 'human';
  ui.game = {
    status: GameStatus.WON,
    getElapsedTimeSeconds() {
      return 12.34;
    },
  };

  ui._setTileState = () => {};
  ui._updateCounts = () => {};
  ui._startTimer = () => {};
  ui._updateTimerDisplay = () => {};
  ui._setFace = () => {};
  ui._setStatus = () => {};
  ui._renderScoreboards = () => {};
  ui._stopTimer = () => {};

  ui._applyRevealResult({
    action: 'reveal',
    revealed: [{ row: 0, col: 0, value: 0 }],
  });

  assert.equal(scoreCalls.length, 1);
  assert.deepEqual(scoreCalls[0], {
    mode: 'human',
    difficulty: 'Test',
    seconds: 12.34,
  });

  ui._applyRevealResult({ action: 'noop', revealed: [] });

  assert.equal(scoreCalls.length, 1);
});
