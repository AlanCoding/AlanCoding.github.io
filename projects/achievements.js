import { ScoreRepository, formatSeconds } from './minesweeper/scripts/scoreboard.js';

const MINESWEEPER_DIFFICULTIES = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'expert', label: 'Advanced' },
];

const WORD_JUMBLE_STORAGE_KEY = 'word_jumble_power_stats_v1';
const BASKETBALL_COOKIE = 'rapid_fire_runs_level1_v1';

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

function parseBasketballHistory() {
  const cookieValue = readCookie(BASKETBALL_COOKIE);
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
  const statsContainer = document.getElementById('basketballStats');
  const emptyState = document.getElementById('basketballEmpty');
  const bestEl = document.getElementById('basketballBest');
  const bestDateEl = document.getElementById('basketballBestDate');
  const runsEl = document.getElementById('basketballRuns');
  const records = parseBasketballHistory();
  if (!statsContainer || !bestEl || !bestDateEl || !runsEl) {
    return;
  }
  runsEl.textContent = String(records.length);
  if (records.length === 0) {
    bestEl.textContent = '—';
    bestDateEl.textContent = '—';
    if (emptyState) {
      emptyState.hidden = false;
    }
    return;
  }
  if (emptyState) {
    emptyState.hidden = true;
  }
  const best = records[0];
  bestEl.textContent = `${best.score}`;
  const date = new Date(best.timestamp);
  bestDateEl.textContent = Number.isNaN(date.getTime()) ? best.timestamp : date.toLocaleString();
}

function setupMinesweeperManagement(repo) {
  const downloadBtn = document.getElementById('manageDownloadScores');
  const importInput = document.getElementById('manageImportScores');
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

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const payload = repo.exportScores();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'minesweeper-scores.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Scores downloaded to your device.');
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
        repo.mergeScores(text);
        renderMinesweeperSummary(repo);
        setMessage('Scores imported successfully.', 'success');
      } catch (error) {
        setMessage('Unable to import scores. Try a valid minesweeper JSON export.', 'error');
      } finally {
        event.target.value = '';
      }
    });
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
    writeCookie(BASKETBALL_COOKIE, '', -1);
    renderBasketballSummary();
    if (messageEl) {
      messageEl.textContent = 'Rapid Fire run history cleared.';
    }
  });
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
  setupMinesweeperManagement(repo);
  setupWordJumbleManagement();
  setupBasketballManagement();
});
