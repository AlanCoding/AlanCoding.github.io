const STORAGE_KEY = 'minesweeper_scores_v2';
const STORAGE_VERSION = 3;
const MODES = ['human', 'auto'];

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

function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : 'human';
}

function normalizeDifficultyKey(value) {
  if (!value && value !== 0) {
    return 'unknown';
  }
  const key = String(value).trim().toLowerCase();
  if (!key) {
    return 'unknown';
  }
  if (key === 'advanced') {
    return 'expert';
  }
  return key;
}

function fallbackLabelForKey(key) {
  switch (key) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'expert':
      return 'Advanced';
    case 'unknown':
      return 'Unknown';
    default: {
      if (!key) {
        return 'Unknown';
      }
      return key
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
  }
}

function normalizeDifficultyLabel(key, label) {
  if (!label) {
    return fallbackLabelForKey(key);
  }
  const normalized = normalizeDifficultyKey(label);
  if (normalized === 'unknown') {
    return fallbackLabelForKey(key);
  }
  if (normalized === 'expert') {
    return 'Advanced';
  }
  if (normalized === key) {
    return fallbackLabelForKey(key);
  }
  return String(label);
}

function createEmptyBoard(label = '') {
  return {
    label,
    entries: [],
    wins: 0,
    losses: 0,
  };
}

function createEmptyData() {
  return {
    version: STORAGE_VERSION,
    human: {},
    auto: {},
  };
}

function normalizeEntry(entry = {}) {
  const secondsNumber = Number(entry.seconds);
  const seconds = Number.isFinite(secondsNumber) ? secondsNumber : 0;
  let recordedAt = entry.recordedAt;
  if (recordedAt) {
    const date = new Date(recordedAt);
    if (!Number.isNaN(date.getTime())) {
      recordedAt = date.toISOString();
    } else {
      recordedAt = new Date().toISOString();
    }
  } else {
    recordedAt = new Date().toISOString();
  }
  return {
    seconds,
    recordedAt,
  };
}

function sortEntries(entries) {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.seconds === b.seconds) {
        return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
      }
      return a.seconds - b.seconds;
    });
}

function normalizeModeData(rawMode) {
  const normalized = {};

  const ensureBoard = (key, label = null) => {
    const board = normalized[key] ?? createEmptyBoard();
    if (!normalized[key]) {
      normalized[key] = board;
    }
    if (label) {
      board.label = normalizeDifficultyLabel(key, label);
    } else if (!board.label) {
      board.label = fallbackLabelForKey(key);
    }
    return board;
  };

  const addEntriesToBoard = (key, label, entries) => {
    const board = ensureBoard(key, label);
    entries.forEach(entry => {
      board.entries.push(normalizeEntry(entry));
    });
  };

  if (Array.isArray(rawMode)) {
    rawMode.forEach(entry => {
      const key = normalizeDifficultyKey(entry?.difficulty ?? 'unknown');
      const label = normalizeDifficultyLabel(key, entry?.difficulty);
      addEntriesToBoard(key, label, [entry]);
    });
  } else if (rawMode && typeof rawMode === 'object') {
    Object.entries(rawMode).forEach(([rawKey, value]) => {
      const key = normalizeDifficultyKey(rawKey);
      if (Array.isArray(value)) {
        value.forEach(entry => {
          const label = normalizeDifficultyLabel(key, entry?.difficulty ?? rawKey);
          addEntriesToBoard(key, label, [entry]);
        });
        return;
      }
      if (!value || typeof value !== 'object') {
        ensureBoard(key);
        return;
      }
      const board = ensureBoard(key, value.label ?? value.difficulty ?? rawKey);
      const wins = Number(value.wins);
      if (Number.isFinite(wins) && wins >= 0) {
        board.wins = wins;
      }
      const losses = Number(value.losses);
      if (Number.isFinite(losses) && losses >= 0) {
        board.losses = losses;
      }
      const entryGroups = [];
      if (Array.isArray(value.entries)) {
        entryGroups.push(value.entries);
      }
      if (Array.isArray(value.scores)) {
        entryGroups.push(value.scores);
      }
      if (entryGroups.length === 0 && value.seconds !== undefined) {
        entryGroups.push([value]);
      }
      entryGroups.forEach(group => {
        addEntriesToBoard(key, board.label, group);
      });
    });
  }

  Object.entries(normalized).forEach(([key, board]) => {
    board.label = normalizeDifficultyLabel(key, board.label);
    board.entries = sortEntries(board.entries).slice(0, 10);
    if (!Number.isFinite(board.wins) || board.wins < board.entries.length) {
      board.wins = board.entries.length;
    }
    if (!Number.isFinite(board.losses) || board.losses < 0) {
      board.losses = 0;
    }
  });

  return normalized;
}

function cloneBoard(board) {
  return {
    label: board.label,
    wins: board.wins,
    losses: board.losses,
    entries: board.entries.map(entry => ({ ...entry })),
  };
}

function cloneMode(modeData = {}) {
  const clone = {};
  Object.entries(modeData).forEach(([key, board]) => {
    clone[key] = cloneBoard(board);
  });
  return clone;
}

export class ScoreRepository {
  constructor(storage = defaultStorage, storageKey = STORAGE_KEY) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  _loadRaw() {
    const payload = this.storage.getItem(this.storageKey);
    if (!payload) {
      return createEmptyData();
    }
    try {
      const parsed = JSON.parse(payload);
      const data = createEmptyData();
      data.version = Number.isFinite(parsed?.version) ? parsed.version : STORAGE_VERSION;
      MODES.forEach(mode => {
        data[mode] = normalizeModeData(parsed?.[mode]);
      });
      return data;
    } catch (err) {
      return createEmptyData();
    }
  }

  _saveRaw(data) {
    const payload = {
      version: STORAGE_VERSION,
    };
    MODES.forEach(mode => {
      payload[mode] = {};
      Object.entries(data[mode] ?? {}).forEach(([key, board]) => {
        payload[mode][key] = {
          label: normalizeDifficultyLabel(key, board.label),
          wins: board.wins,
          losses: board.losses,
          entries: sortEntries(board.entries ?? []).slice(0, 10).map(entry => ({ ...entry })),
        };
      });
    });
    this.storage.setItem(this.storageKey, JSON.stringify(payload));
  }

  _ensureBoard(data, mode, difficultyKey, label = null) {
    const safeMode = normalizeMode(mode);
    const key = normalizeDifficultyKey(difficultyKey);
    if (!data[safeMode]) {
      data[safeMode] = {};
    }
    if (!data[safeMode][key]) {
      data[safeMode][key] = createEmptyBoard();
    }
    const board = data[safeMode][key];
    const normalizedLabel = normalizeDifficultyLabel(key, label ?? board.label);
    board.label = normalizedLabel;
    if (!Array.isArray(board.entries)) {
      board.entries = [];
    }
    if (!Number.isFinite(board.wins)) {
      board.wins = 0;
    }
    if (!Number.isFinite(board.losses)) {
      board.losses = 0;
    }
    return board;
  }

  getLeaderboard(mode = 'human', difficultyKey, label = null) {
    const data = this._loadRaw();
    const board = this._ensureBoard(data, mode, difficultyKey, label);
    return cloneBoard(board);
  }

  getAllLeaderboards() {
    const data = this._loadRaw();
    return {
      version: data.version ?? STORAGE_VERSION,
      human: cloneMode(data.human),
      auto: cloneMode(data.auto),
    };
  }

  recordWin(mode, difficultyKey, label, seconds) {
    const data = this._loadRaw();
    const board = this._ensureBoard(data, mode, difficultyKey, label);
    const nextEntries = sortEntries([
      ...board.entries,
      normalizeEntry({ seconds }),
    ]).slice(0, 10);
    board.entries = nextEntries;
    board.wins += 1;
    this._saveRaw(data);
    return cloneBoard(board);
  }

  recordLoss(mode, difficultyKey, label) {
    const data = this._loadRaw();
    const board = this._ensureBoard(data, mode, difficultyKey, label);
    board.losses += 1;
    this._saveRaw(data);
    return cloneBoard(board);
  }

  clearLeaderboard(mode, difficultyKey, label = null) {
    const data = this._loadRaw();
    const board = this._ensureBoard(data, mode, difficultyKey, label);
    board.entries = [];
    board.wins = 0;
    board.losses = 0;
    this._saveRaw(data);
    return cloneBoard(board);
  }

  mergeScores(payload) {
    const data = this._loadRaw();
    const incomingRaw = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const incoming = createEmptyData();
    MODES.forEach(mode => {
      incoming[mode] = normalizeModeData(incomingRaw?.[mode]);
    });
    MODES.forEach(mode => {
      Object.entries(incoming[mode]).forEach(([key, board]) => {
        const target = this._ensureBoard(data, mode, key, board.label);
        target.entries = sortEntries([...target.entries, ...board.entries]).slice(0, 10);
        target.wins += board.wins;
        target.losses += board.losses;
      });
    });
    this._saveRaw(data);
    return this.getAllLeaderboards();
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
