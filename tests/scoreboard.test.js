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

test('recordWin keeps top ten scores and tallies player stats', () => {
  const repo = new ScoreRepository(new MemoryStorage(), 'scores');
  for (let i = 0; i < 14; i += 1) {
    repo.recordWin('human', 'beginner', 'Beginner', 20 - i, 'Alan');
  }
  let leaderboard = repo.getLeaderboard('human', 'beginner', 'Beginner');
  assert.equal(leaderboard.entries.length, 10);
  assert.equal(leaderboard.wins, 14);
  assert.equal(leaderboard.losses, 0);
  assert.ok(leaderboard.entries.every(entry => entry.name === 'Alan'));
  assert.ok(
    leaderboard.entries.every((entry, index, arr) => index === 0 || entry.seconds >= arr[index - 1].seconds),
  );
  assert.ok(leaderboard.entries.every(entry => typeof entry.recordedAt === 'string'));
  assert.equal(leaderboard.entries[0].name, 'Alan');

  repo.recordLoss('human', 'beginner', 'Beginner', 'Alan');
  leaderboard = repo.getLeaderboard('human', 'beginner', 'Beginner');
  assert.equal(leaderboard.losses, 1);

  const stats = repo.getPlayerStats();
  const humanPlayers = Object.values(stats.human);
  assert.equal(humanPlayers.length, 1);
  assert.equal(humanPlayers[0].name, 'Alan');
  assert.equal(humanPlayers[0].difficulties.beginner.wins, 14);
  assert.equal(humanPlayers[0].difficulties.beginner.losses, 1);
});

test('mergeScores combines legacy payloads and accumulates stats', () => {
  const storage = new MemoryStorage();
  const repo = new ScoreRepository(storage, 'scores');
  repo.recordWin('human', 'beginner', 'Beginner', 15, 'Existing Human');
  repo.recordLoss('human', 'beginner', 'Beginner', 'Existing Human');
  repo.recordWin('auto', 'beginner', 'Beginner', 11, 'Professor Gridlock');
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
    players: {
      human: {
        champion: {
          name: 'Champion',
          difficulties: {
            beginner: { wins: 3, losses: 2 },
          },
        },
      },
      auto: {
        thinker: {
          name: 'Thinker Bot',
          difficulties: {
            beginner: { wins: 1, losses: 4 },
          },
        },
      },
    },
  });
  repo.mergeScores(payload);
  const humanBeginner = repo.getLeaderboard('human', 'beginner', 'Beginner');
  const humanIntermediate = repo.getLeaderboard('human', 'intermediate', 'Intermediate');
  const autoBeginner = repo.getLeaderboard('auto', 'beginner', 'Beginner');

  assert.equal(humanBeginner.entries[0].seconds, 8);
  assert.equal(humanBeginner.entries[0].name, 'anonymous');
  assert.equal(humanBeginner.wins, 2);
  assert.equal(humanBeginner.losses, 1);

  assert.equal(humanIntermediate.entries[0].seconds, 12);
  assert.equal(humanIntermediate.wins, 1);

  assert.equal(autoBeginner.entries[0].seconds, 9);
  assert.equal(autoBeginner.entries[0].name, 'anonymous');
  assert.equal(autoBeginner.wins, 3);
  assert.equal(autoBeginner.losses, 1);

  const stats = repo.getPlayerStats();
  const existingHuman = Object.values(stats.human).find(player => player.name === 'Existing Human');
  assert.ok(existingHuman);
  assert.equal(existingHuman.difficulties.beginner.wins, 1);
  assert.equal(existingHuman.difficulties.beginner.losses, 1);

  const champion = Object.values(stats.human).find(player => player.name === 'Champion');
  assert.ok(champion);
  assert.equal(champion.difficulties.beginner.wins, 3);
  assert.equal(champion.difficulties.beginner.losses, 2);

  const professor = Object.values(stats.auto).find(player => player.name === 'Professor Gridlock');
  assert.ok(professor);
  assert.equal(professor.difficulties.beginner.wins, 1);
  assert.equal(professor.difficulties.beginner.losses, 0);

  const thinker = Object.values(stats.auto).find(player => player.name === 'Thinker Bot');
  assert.ok(thinker);
  assert.equal(thinker.difficulties.beginner.wins, 1);
  assert.equal(thinker.difficulties.beginner.losses, 4);
});
