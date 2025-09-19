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

test('recordWin keeps top ten scores per difficulty and tracks wins', () => {
  const repo = new ScoreRepository(new MemoryStorage(), 'scores');
  for (let i = 0; i < 14; i += 1) {
    repo.recordWin('human', 'beginner', 'Beginner', 20 - i);
  }
  const leaderboard = repo.getLeaderboard('human', 'beginner', 'Beginner');
  assert.equal(leaderboard.entries.length, 10);
  assert.equal(leaderboard.wins, 14);
  assert.equal(leaderboard.losses, 0);
  assert.ok(
    leaderboard.entries.every((entry, index, arr) => index === 0 || entry.seconds >= arr[index - 1].seconds),
  );
  assert.ok(leaderboard.entries.every(entry => typeof entry.recordedAt === 'string'));
});

test('mergeScores combines legacy payloads and accumulates stats', () => {
  const storage = new MemoryStorage();
  const repo = new ScoreRepository(storage, 'scores');
  repo.recordWin('human', 'beginner', 'Beginner', 15);
  repo.recordLoss('human', 'beginner', 'Beginner');
  repo.recordWin('auto', 'beginner', 'Beginner', 11);
  const payload = JSON.stringify({
    human: [
      { difficulty: 'Intermediate', seconds: 12 },
      { difficulty: 'Beginner', seconds: 8 },
    ],
    auto: {
      Beginner: {
        wins: 2,
        losses: 1,
        entries: [{ seconds: 9, recordedAt: '2024-01-01T00:00:00.000Z' }],
      },
    },
  });
  repo.mergeScores(payload);
  const humanBeginner = repo.getLeaderboard('human', 'beginner', 'Beginner');
  const humanIntermediate = repo.getLeaderboard('human', 'intermediate', 'Intermediate');
  const autoBeginner = repo.getLeaderboard('auto', 'beginner', 'Beginner');

  assert.equal(humanBeginner.entries[0].seconds, 8);
  assert.equal(humanBeginner.wins, 2);
  assert.equal(humanBeginner.losses, 1);

  assert.equal(humanIntermediate.entries[0].seconds, 12);
  assert.equal(humanIntermediate.wins, 1);

  assert.equal(autoBeginner.entries[0].seconds, 9);
  assert.equal(autoBeginner.wins, 3);
  assert.equal(autoBeginner.losses, 1);
});
