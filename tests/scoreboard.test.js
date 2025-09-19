import test from 'node:test';
import assert from 'node:assert/strict';

import { ScoreRepository } from '../old/minesweeper/scripts/scoreboard.js';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }
}

test('scores are sorted and trimmed to a top ten', () => {
  const repo = new ScoreRepository(new MemoryStorage(), 'scores');
  for (let i = 0; i < 14; i += 1) {
    repo.addScore('human', 'Beginner', 20 - i);
  }
  const scores = repo.getScores('human');
  assert.equal(scores.length, 10);
  assert.ok(scores.every((entry, index, arr) => index === 0 || entry.seconds >= arr[index - 1].seconds));
});

test('import merges both leaderboards without losing the champs', () => {
  const storage = new MemoryStorage();
  const repo = new ScoreRepository(storage, 'scores');
  repo.addScore('human', 'Beginner', 15);
  repo.addScore('auto', 'Expert', 10);
  const payload = JSON.stringify({
    human: [
      { difficulty: 'Intermediate', seconds: 12 },
      { difficulty: 'Beginner', seconds: 8 },
    ],
    auto: [
      { difficulty: 'Beginner', seconds: 9 },
    ],
  });
  repo.mergeScores(payload);
  const human = repo.getScores('human');
  const auto = repo.getScores('auto');
  assert.equal(human[0].seconds, 8);
  assert.equal(auto[0].seconds, 9);
});
