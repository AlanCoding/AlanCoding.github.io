import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeWordJumbleEntries,
  normalizeBasketballEntries,
  normalizeBasketballEntry,
  collectAllGameData,
  applyImportedData,
} from '../../../projects/achievements.js';
import { ScoreRepository } from '../../../projects/minesweeper/scripts/scoreboard.js';

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

test('normalizeWordJumbleEntries keeps valid scores sorted by strength', () => {
  const entries = [
    { word: 'Galaxy', count: 11, updatedAt: '2024-03-01T12:00:00.000Z' },
    { word: 'asteroid', count: 11, updatedAt: '2024-02-01T12:00:00.000Z' },
    { word: '  ', count: 99 },
    { word: 'orbit', count: '7', updatedAt: '2024-01-01T12:00:00.000Z' },
    { word: 'probe', count: -3 },
    { word: 'lander', count: 3, updatedAt: '' },
  ];

  const normalized = normalizeWordJumbleEntries(entries);

  assert.equal(normalized.length, 5);
  assert.deepEqual(
    normalized.map(item => item.word),
    ['galaxy', 'asteroid', 'orbit', 'lander', 'probe'],
  );
  assert.equal(normalized[0].count, 11);
  assert.ok(normalized[0].updatedAt > normalized[1].updatedAt);
  assert.equal(normalized.at(-1).count, 0);
});

test('normalizeBasketballEntries filters invalid data and sorts by score then recency', () => {
  const entries = [
    { score: 12, timestamp: '2024-03-01T10:00:00.000Z' },
    { score: '8', timestamp: '2024-04-01T08:00:00.000Z' },
    { score: 12, timestamp: 'invalid-date' },
    { score: 'nan', timestamp: '2024-01-01T00:00:00.000Z' },
  ];

  const normalized = normalizeBasketballEntries(entries);

  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].score, 12);
  assert.equal(normalized[1].score, 12);
  assert.ok(normalized[0].timestamp >= normalized[1].timestamp);
  assert.equal(normalized[2].score, 8);
});

test('normalizeBasketballEntry enforces numeric scores and ISO timestamps', () => {
  const cleaned = normalizeBasketballEntry({ score: '21.9', timestamp: '2024-05-01T01:02:03.000Z' });
  assert.deepEqual(cleaned, { score: 21, timestamp: '2024-05-01T01:02:03.000Z' });

  assert.equal(normalizeBasketballEntry({ score: 'oops' }), null);
  assert.equal(
    normalizeBasketballEntry({ score: 5, timestamp: 123 }),
    null,
  );
});

test('collectAllGameData captures cross-game progress in a portable payload', () => {
  const repo = new ScoreRepository(new MemoryStorage(), 'lm_scores');
  repo.recordWin('human', 'beginner', 'Beginner', 42, 'Scout');
  repo.recordLoss('auto', 'beginner', 'Beginner', 'Solver');

  const wordStorage = new MemoryStorage();
  wordStorage.setItem('word_jumble_power_stats_v1', JSON.stringify([
    { word: 'nebula', display: 'Nebula', count: 6, updatedAt: '2024-02-01T00:00:00.000Z' },
  ]));

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { localStorage: wordStorage };
  const cookieJar = { value: '' };
  globalThis.document = {
    getElementById: () => null,
  };
  Object.defineProperty(globalThis.document, 'cookie', {
    configurable: true,
    get() {
      return cookieJar.value;
    },
    set(value) {
      cookieJar.value = cookieJar.value ? `${cookieJar.value}; ${value}` : value;
    },
  });

  globalThis.document.cookie = `rapid_fire_runs_level1_v1=${encodeURIComponent(
    JSON.stringify([{ score: 13, timestamp: '2024-03-01T10:00:00.000Z' }]),
  )}`;

  const payload = collectAllGameData(repo);

  assert.equal(payload.games.wordJumble.length, 1);
  assert.equal(payload.games.basketball.level1.length, 1);
  assert.ok(payload.games.minesweeper);
  assert.equal(payload.games.minesweeper.human.beginner.entries.length, 1);

  if (previousWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = previousWindow;
  }
  if (previousDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = previousDocument;
  }
});

test('applyImportedData hydrates leaderboards and client storage', () => {
  const repo = new ScoreRepository(new MemoryStorage(), 'lm_scores');

  const wordStorage = new MemoryStorage();
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { localStorage: wordStorage };
  const cookieJar = { value: '' };
  globalThis.document = {
    getElementById: () => null,
  };
  Object.defineProperty(globalThis.document, 'cookie', {
    configurable: true,
    get() {
      return cookieJar.value;
    },
    set(value) {
      cookieJar.value = cookieJar.value ? `${cookieJar.value}; ${value}` : value;
    },
  });

  const importData = {
    games: {
      minesweeper: {
        version: 4,
        human: {
          beginner: {
            label: 'Beginner',
            wins: 1,
            losses: 0,
            entries: [
              { seconds: 33, recordedAt: '2024-02-02T00:00:00.000Z', name: 'Scout' },
            ],
          },
        },
        auto: {},
        players: {
          human: {
            scout: {
              name: 'Scout',
              difficulties: { beginner: { wins: 1, losses: 0 } },
            },
          },
          auto: {},
        },
      },
      wordJumble: [
        { word: 'galaxy', display: 'Galaxy', count: 12, updatedAt: '2024-03-01T00:00:00.000Z' },
      ],
      basketball: {
        level1: [
          { score: 19, timestamp: '2024-03-05T12:00:00.000Z' },
        ],
      },
    },
  };

  applyImportedData(repo, importData);

  const leaderboard = repo.getLeaderboard('human', 'beginner', 'Beginner');
  assert.equal(leaderboard.wins, 1);
  assert.equal(leaderboard.entries[0].seconds, 33);

  const savedWordData = JSON.parse(wordStorage.getItem('word_jumble_power_stats_v1'));
  assert.equal(savedWordData.length, 1);

  assert.ok(globalThis.document.cookie.includes('rapid_fire_runs_level1_v1'));

  if (previousWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = previousWindow;
  }
  if (previousDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = previousDocument;
  }
});
