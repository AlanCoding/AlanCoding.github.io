const STORAGE_KEY = 'minesweeper_scores_v2';

const defaultStorage = (() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  const memoryStore = new Map();
  return {
    getItem(key) {
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    setItem(key, value) {
      memoryStore.set(key, String(value));
    },
    removeItem(key) {
      memoryStore.delete(key);
    },
  };
})();

function sortScores(entries) {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.seconds === b.seconds) {
        return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      }
      return a.seconds - b.seconds;
    });
}

function normalizeEntry(entry) {
  return {
    difficulty: entry.difficulty,
    seconds: Number(entry.seconds),
    recordedAt: entry.recordedAt ?? new Date().toISOString(),
  };
}

export class ScoreRepository {
  constructor(storage = defaultStorage, storageKey = STORAGE_KEY) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  _loadRaw() {
    const payload = this.storage.getItem(this.storageKey);
    if (!payload) {
      return { human: [], auto: [] };
    }
    try {
      const parsed = JSON.parse(payload);
      return {
        human: Array.isArray(parsed.human) ? parsed.human.map(normalizeEntry) : [],
        auto: Array.isArray(parsed.auto) ? parsed.auto.map(normalizeEntry) : [],
      };
    } catch (err) {
      return { human: [], auto: [] };
    }
  }

  _saveRaw(data) {
    this.storage.setItem(this.storageKey, JSON.stringify(data));
  }

  getScores(mode = 'human') {
    const data = this._loadRaw();
    return sortScores(data[mode]).slice(0, 10);
  }

  addScore(mode, difficulty, seconds) {
    const data = this._loadRaw();
    const updated = sortScores([
      ...data[mode],
      normalizeEntry({ difficulty, seconds }),
    ]).slice(0, 10);
    const next = {
      ...data,
      [mode]: updated,
    };
    this._saveRaw(next);
    return updated;
  }

  mergeScores(payload) {
    const data = this._loadRaw();
    const incoming = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const merged = {
      human: sortScores([
        ...data.human,
        ...(Array.isArray(incoming.human) ? incoming.human.map(normalizeEntry) : []),
      ]).slice(0, 10),
      auto: sortScores([
        ...data.auto,
        ...(Array.isArray(incoming.auto) ? incoming.auto.map(normalizeEntry) : []),
      ]).slice(0, 10),
    };
    this._saveRaw(merged);
    return merged;
  }

  exportScores() {
    const data = this._loadRaw();
    return JSON.stringify(data, null, 2);
  }

  clear() {
    this.storage.removeItem(this.storageKey);
  }
}

export function formatSeconds(seconds) {
  return `${seconds.toFixed(2)}s`;
}
