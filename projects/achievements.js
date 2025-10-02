import { ScoreRepository, formatSeconds } from './minesweeper/scripts/scoreboard.js';

const MINESWEEPER_DIFFICULTIES = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'expert', label: 'Advanced' },
];

const WORD_JUMBLE_STORAGE_KEY = 'word_jumble_power_stats_v1';
const BASKETBALL_LEVELS = [
  { key: 'level1', label: 'Level 1', cookie: 'rapid_fire_runs_level1_v1' },
  { key: 'level2', label: 'Level 2', cookie: 'rapid_fire_runs_level2_v1' },
];
const DATA_EXPORT_VERSION = 1;
const ACHIEVEMENT_STATE_KEY = 'game_zone_achievement_state_v1';
const ACHIEVEMENTS = [
  {
    id: 'word-aeprs',
    name: 'aeprs creepers!',
    description: "Log the chilling letter combo 'aeprs' in your Word Jumble history.",
    check: facts => facts.wordEntries.some(entry => typeof entry.word === 'string' && entry.word.toLowerCase() === 'aeprs'),
  },
  {
    id: 'basketball-curry-hurry',
    name: 'Curry hurry!',
    description: 'Drop at least 180 points on Level 2 to prove a blistering 90% free throw percentage.',
    check: facts => (facts.basketball.level2?.bestScore ?? 0) >= 180,
  },
];

const achievementToastQueue = [];
let activeAchievementTimer = null;
let achievementStateMemory = null;

function renderMinesweeperSummary(repo) {
  const tbody = document.getElementById('minesweeperSummary');
  const emptyState = document.getElementById('minesweeperEmpty');
  if (!tbody) {
    return;
  }
  tbody.innerHTML = '';
  let hasWin = false;
  MINESWEEPER_DIFFICULTIES.forEach(difficulty => {
    const board = repo.getLeaderboard('human', difficulty.key, difficulty.label);
    const bestEntry = Array.isArray(board.entries) && board.entries.length > 0 ? board.entries[0] : null;
    if (bestEntry) {
      hasWin = true;
    }
    const row = document.createElement('tr');
    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    nameCell.textContent = difficulty.label;
    const timeCell = document.createElement('td');
    timeCell.textContent = bestEntry ? formatSeconds(bestEntry.seconds) : '—';
    const winsCell = document.createElement('td');
    winsCell.textContent = String(board.wins ?? 0);
    row.appendChild(nameCell);
    row.appendChild(timeCell);
    row.appendChild(winsCell);
    tbody.appendChild(row);
  });
  if (emptyState) {
    emptyState.hidden = hasWin;
  }
}

function loadWordJumbleEntries() {
  try {
    const payload = window.localStorage.getItem(WORD_JUMBLE_STORAGE_KEY);
    if (!payload) {
      return [];
    }
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

function saveWordJumbleEntries(entries) {
  try {
    window.localStorage.setItem(WORD_JUMBLE_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    // ignore storage failures
  }
}

function renderWordJumbleSummary() {
  const list = document.getElementById('wordJumbleHighlights');
  const emptyState = document.getElementById('wordJumbleEmpty');
  if (!list) {
    return;
  }
  const entries = loadWordJumbleEntries().slice();
  entries.sort((a, b) => {
    const countDiff = (b.count || 0) - (a.count || 0);
    if (countDiff !== 0) {
      return countDiff;
    }
    const timeDiff = (b.updatedAt || '').localeCompare(a.updatedAt || '');
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return (a.word || '').localeCompare(b.word || '');
  });
  const highlights = entries.slice(0, 5);
  list.innerHTML = '';
  if (highlights.length === 0) {
    if (emptyState) {
      emptyState.hidden = false;
    }
    return;
  }
  if (emptyState) {
    emptyState.hidden = true;
  }
  highlights.forEach(entry => {
    const item = document.createElement('li');
    const wordSpan = document.createElement('span');
    wordSpan.className = 'achievement-word';
    wordSpan.textContent = (entry.display || entry.word || '').toUpperCase();
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'achievement-word__score';
    scoreSpan.textContent = `${entry.count || 0} anagrams`;
    item.appendChild(wordSpan);
    item.appendChild(scoreSpan);
    list.appendChild(item);
  });
}

function parseBasketballHistory(cookieName) {
  const cookieValue = readCookie(cookieName);
  if (!cookieValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(cookieValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(entry => normalizeBasketballEntry(entry))
      .filter(Boolean)
      .sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) {
          return (b.score || 0) - (a.score || 0);
        }
        return (b.timestamp || '').localeCompare(a.timestamp || '');
      });
  } catch (error) {
    return [];
  }
}

function normalizeBasketballEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : null;
  const score = Number(entry.score);
  if (!timestamp || !Number.isFinite(score)) {
    return null;
  }
  return {
    timestamp,
    score: Math.max(0, Math.floor(score)),
  };
}

function renderBasketballSummary() {
  const tbody = document.getElementById('basketballSummary');
  const emptyState = document.getElementById('basketballEmpty');
  if (!tbody) {
    return;
  }
  tbody.innerHTML = '';
  let hasRuns = false;
  BASKETBALL_LEVELS.forEach(level => {
    const records = parseBasketballHistory(level.cookie);
    const best = records.length > 0 ? records[0] : null;
    const row = document.createElement('tr');
    const levelCell = document.createElement('th');
    levelCell.scope = 'row';
    levelCell.textContent = level.label;
    const scoreCell = document.createElement('td');
    scoreCell.textContent = best ? String(best.score) : '—';
    const dateCell = document.createElement('td');
    if (best && best.timestamp) {
      const date = new Date(best.timestamp);
      dateCell.textContent = Number.isNaN(date.getTime()) ? best.timestamp : date.toLocaleString();
    } else {
      dateCell.textContent = '—';
    }
    const runsCell = document.createElement('td');
    runsCell.textContent = String(records.length);
    row.appendChild(levelCell);
    row.appendChild(scoreCell);
    row.appendChild(dateCell);
    row.appendChild(runsCell);
    tbody.appendChild(row);
    if (records.length > 0) {
      hasRuns = true;
    }
  });
  if (emptyState) {
    emptyState.hidden = hasRuns;
  }
}

function collectAchievementFacts() {
  const wordEntries = loadWordJumbleEntries();
  const basketball = {};
  BASKETBALL_LEVELS.forEach(level => {
    const records = parseBasketballHistory(level.cookie);
    basketball[level.key] = {
      records,
      bestScore: records.length > 0 ? Number(records[0].score || 0) : 0,
    };
  });
  return { wordEntries, basketball };
}

function evaluateAchievementStates(facts) {
  return ACHIEVEMENTS.map(({ check, ...meta }) => ({
    ...meta,
    unlocked: Boolean(check(facts)),
  }));
}

function renderAchievementsSection(states) {
  const list = document.getElementById('achievementList');
  const progress = document.getElementById('achievementProgress');
  if (!list) {
    return;
  }
  list.innerHTML = '';

  const unlockedCount = states.filter(state => state.unlocked).length;
  if (progress) {
    if (states.length === 0) {
      progress.textContent = 'Achievements coming soon.';
    } else {
      progress.textContent = `You have gotten ${unlockedCount} of ${states.length} achievements.`;
    }
  }

  if (states.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'achievement-empty';
    emptyItem.textContent = 'No achievements to display just yet.';
    list.appendChild(emptyItem);
    return;
  }

  states.forEach(state => {
    const item = document.createElement('li');
    item.className = `achievement-item${state.unlocked ? ' achievement-item--unlocked' : ''}`;

    const status = document.createElement('span');
    status.className = 'achievement-item__status';
    status.textContent = state.unlocked ? '✓' : '✗';
    status.setAttribute('role', 'img');
    status.setAttribute('aria-label', state.unlocked ? 'Completed achievement' : 'Locked achievement');

    const body = document.createElement('div');
    body.className = 'achievement-item__body';

    const title = document.createElement('h3');
    title.textContent = state.name;
    const srStatus = document.createElement('span');
    srStatus.className = 'u-screen-reader-text';
    srStatus.textContent = state.unlocked ? ' (achievement completed)' : ' (achievement locked)';
    title.appendChild(srStatus);

    const description = document.createElement('p');
    description.textContent = state.description;

    body.appendChild(title);
    body.appendChild(description);

    item.appendChild(status);
    item.appendChild(body);
    list.appendChild(item);
  });
}

function refreshAchievementSection(options = {}) {
  const { announce = true } = options;
  const facts = collectAchievementFacts();
  const states = evaluateAchievementStates(facts);
  renderAchievementsSection(states);

  if (achievementStateMemory === null) {
    achievementStateMemory = loadAchievementState();
  }

  const previousState = achievementStateMemory || {};
  const nextState = {};
  const newlyUnlocked = [];

  states.forEach(state => {
    nextState[state.id] = state.unlocked;
    if (announce && state.unlocked && !previousState[state.id]) {
      newlyUnlocked.push(state);
    }
  });

  achievementStateMemory = nextState;
  saveAchievementState(nextState);

  if (announce) {
    newlyUnlocked.forEach(achievement => enqueueAchievementToast(achievement));
  }
}

function enqueueAchievementToast(achievement) {
  achievementToastQueue.push(achievement);
  if (!activeAchievementTimer) {
    showNextAchievementToast();
  }
}

function showNextAchievementToast() {
  const container = document.getElementById('achievementToastContainer');
  if (!container) {
    achievementToastQueue.length = 0;
    activeAchievementTimer = null;
    return;
  }

  if (activeAchievementTimer) {
    return;
  }

  if (achievementToastQueue.length === 0) {
    container.classList.remove('is-active');
    container.innerHTML = '';
    activeAchievementTimer = null;
    return;
  }

  const achievement = achievementToastQueue.shift();
  container.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'achievement-toast__eyebrow';
  eyebrow.textContent = 'Achievement unlocked!';

  const title = document.createElement('p');
  title.className = 'achievement-toast__title';
  title.textContent = achievement.name;

  const description = document.createElement('p');
  description.className = 'achievement-toast__body';
  description.textContent = achievement.description;

  toast.appendChild(eyebrow);
  toast.appendChild(title);
  toast.appendChild(description);

  container.appendChild(toast);
  container.classList.add('is-active');

  activeAchievementTimer = window.setTimeout(() => {
    container.classList.remove('is-active');
    container.innerHTML = '';
    activeAchievementTimer = null;
    if (achievementToastQueue.length > 0) {
      window.setTimeout(showNextAchievementToast, 250);
    }
  }, 5000);
}

function loadAchievementState() {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENT_STATE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch (error) {
    return {};
  }
}

function saveAchievementState(state) {
  try {
    window.localStorage.setItem(ACHIEVEMENT_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    // ignore persistence errors
  }
}

function setupMinesweeperManagement(repo) {
  const modeSelect = document.getElementById('manageMode');
  const difficultySelect = document.getElementById('manageDifficulty');
  const clearSelectedBtn = document.getElementById('manageClearSelected');
  const clearAllBtn = document.getElementById('manageClearAll');
  const messageEl = document.getElementById('manageMessage');

  function setMessage(text, type = 'info') {
    if (!messageEl) {
      return;
    }
    messageEl.textContent = text;
    messageEl.dataset.state = type;
  }

  if (clearSelectedBtn && modeSelect && difficultySelect) {
    clearSelectedBtn.addEventListener('click', () => {
      const mode = modeSelect.value || 'human';
      const difficultyKey = difficultySelect.value || 'beginner';
      const difficulty = MINESWEEPER_DIFFICULTIES.find(item => item.key === difficultyKey) || MINESWEEPER_DIFFICULTIES[0];
      repo.clearLeaderboard(mode, difficulty.key, difficulty.label);
      renderMinesweeperSummary(repo);
      const modeLabel = mode === 'auto' ? 'Auto' : 'Human';
      setMessage(`${modeLabel} ${difficulty.label} leaderboard cleared.`, 'warning');
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      repo.clear();
      renderMinesweeperSummary(repo);
      setMessage('All minesweeper leaderboards cleared.', 'warning');
    });
  }
}

function setupWordJumbleManagement() {
  const resetBtn = document.getElementById('manageWordReset');
  const messageEl = document.getElementById('manageWordMessage');
  if (!resetBtn) {
    return;
  }
  resetBtn.addEventListener('click', () => {
    try {
      window.localStorage.removeItem(WORD_JUMBLE_STORAGE_KEY);
    } catch (error) {
      // ignore storage removal failures
    }
    renderWordJumbleSummary();
    refreshAchievementSection();
    if (messageEl) {
      messageEl.textContent = 'Word Jumble leaderboard cleared.';
    }
  });
}

function setupBasketballManagement() {
  const resetBtn = document.getElementById('manageBasketballReset');
  const messageEl = document.getElementById('manageBasketballMessage');
  if (!resetBtn) {
    return;
  }
  resetBtn.addEventListener('click', () => {
    BASKETBALL_LEVELS.forEach(level => {
      writeCookie(level.cookie, '', -1);
    });
    renderBasketballSummary();
    refreshAchievementSection();
    if (messageEl) {
      messageEl.textContent = 'Rapid Fire run history cleared.';
    }
  });
}

function normalizeWordJumbleEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  const normalized = entries
    .map(entry => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const rawWord = typeof entry.word === 'string' ? entry.word.trim().toLowerCase() : '';
      if (!rawWord) {
        return null;
      }
      const display = typeof entry.display === 'string' && entry.display.trim() ? entry.display : entry.word;
      const countNumber = Number(entry.count);
      const count = Number.isFinite(countNumber) && countNumber > 0 ? Math.floor(countNumber) : 0;
      const updatedAt = typeof entry.updatedAt === 'string' && entry.updatedAt ? entry.updatedAt : new Date().toISOString();
      return { word: rawWord, display: display || rawWord, count, updatedAt };
    })
    .filter(Boolean);
  normalized.sort((a, b) => {
    if ((b.count || 0) !== (a.count || 0)) {
      return (b.count || 0) - (a.count || 0);
    }
    if ((b.updatedAt || '') !== (a.updatedAt || '')) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }
    return (a.word || '').localeCompare(b.word || '');
  });
  return normalized.slice(0, 50);
}

function normalizeBasketballEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map(entry => normalizeBasketballEntry(entry))
    .filter(Boolean)
    .sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    })
    .slice(0, 10);
}

function collectAllGameData(repo) {
  const payload = {
    version: DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    games: {
      minesweeper: null,
      wordJumble: [],
      basketball: {},
    },
  };
  try {
    payload.games.minesweeper = JSON.parse(repo.exportScores());
  } catch (error) {
    payload.games.minesweeper = null;
  }
  payload.games.wordJumble = loadWordJumbleEntries();
  BASKETBALL_LEVELS.forEach(level => {
    payload.games.basketball[level.key] = parseBasketballHistory(level.cookie);
  });
  return payload;
}

function applyImportedData(repo, data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import format.');
  }
  const games = data.games && typeof data.games === 'object' ? data.games : data;
  if (games.minesweeper) {
    repo.mergeScores(JSON.stringify(games.minesweeper));
  }
  if (Array.isArray(games.wordJumble)) {
    const normalized = normalizeWordJumbleEntries(games.wordJumble);
    saveWordJumbleEntries(normalized);
  }
  if (games.basketball && typeof games.basketball === 'object') {
    BASKETBALL_LEVELS.forEach(level => {
      const rawEntries = games.basketball[level.key] ?? games.basketball[level.cookie] ?? [];
      const normalized = normalizeBasketballEntries(rawEntries);
      if (normalized.length > 0) {
        writeCookie(level.cookie, JSON.stringify(normalized));
      } else {
        writeCookie(level.cookie, '', -1);
      }
    });
  }
  renderMinesweeperSummary(repo);
  renderWordJumbleSummary();
  renderBasketballSummary();
  refreshAchievementSection();
}

function setupGlobalManagement(repo) {
  const downloadBtn = document.getElementById('manageDownloadAll');
  const importInput = document.getElementById('manageImportAll');
  const messageEl = document.getElementById('manageAllMessage');

  function setMessage(text, type = 'info') {
    if (!messageEl) {
      return;
    }
    messageEl.textContent = text;
    messageEl.dataset.state = type;
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const payload = collectAllGameData(repo);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'game-zone-scores.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('All scores downloaded to your device.', 'success');
    });
  }

  if (importInput) {
    importInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        applyImportedData(repo, parsed);
        setMessage('All scores imported successfully.', 'success');
      } catch (error) {
        setMessage('Unable to import scores. Please select a valid export.', 'error');
      } finally {
        event.target.value = '';
      }
    });
  }
}

function readCookie(name) {
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, days = 365) {
  const maxAge = Math.floor(days * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAge};path=/;SameSite=Lax`;
}

document.addEventListener('DOMContentLoaded', () => {
  const repo = new ScoreRepository();
  renderMinesweeperSummary(repo);
  renderWordJumbleSummary();
  renderBasketballSummary();
  refreshAchievementSection();
  setupGlobalManagement(repo);
  setupMinesweeperManagement(repo);
  setupWordJumbleManagement();
  setupBasketballManagement();
});
