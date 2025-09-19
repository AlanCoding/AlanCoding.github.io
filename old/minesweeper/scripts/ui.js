import { MinesweeperGame, GameStatus, MINE } from './game.js';
import { ScoreRepository, formatSeconds } from './scoreboard.js';
import { AutoPlayer, RandomAutoPlayer, SleepyAutoPlayer } from './autoPlayer.js';

const difficulties = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
  expert: { rows: 16, cols: 30, mines: 99, label: 'Advanced' },
};

const FACE_IMAGES = {
  smile: 'minesweeper/smile.png',
  frown: 'minesweeper/frown.png',
  glasses: 'minesweeper/glasses.png',
  wink: 'minesweeper/wink.png',
  smug: 'minesweeper/smug.png',
  huh: 'minesweeper/huh.png',
  uncertain: 'minesweeper/uncertain.png',
};

const TILE_IMAGES = {
  hidden: 'minesweeper/tile.png',
  flag: 'minesweeper/flag.png',
  mine: 'minesweeper/mine.png',
  exploded: 'minesweeper/blown.png',
  zero: 'minesweeper/grey.png',
};

const AUTO_STRATEGIES = {
  solver: {
    label: 'Constraint Solver',
    persona: {
      name: 'Professor Gridlock',
      page: 'minesweeper/ai-solver.html',
    },
    create: game => new AutoPlayer(game),
  },
  sleepy: {
    label: 'Sleepy Constraint Solver',
    persona: {
      name: 'Rookie Cartographer',
      page: 'minesweeper/ai-sleepy.html',
    },
    create: game => new SleepyAutoPlayer(game),
  },
  random: {
    label: 'Random Explorer',
    persona: {
      name: 'Captain Scatter',
      page: 'minesweeper/ai-random.html',
    },
    create: game => new RandomAutoPlayer(game),
  },
};

const DEFAULT_AUTO_STRATEGY = 'solver';

function imageForValue(value) {
  if (value === MINE) {
    return TILE_IMAGES.mine;
  }
  if (value === 0) {
    return TILE_IMAGES.zero;
  }
  return `minesweeper/${value}.png`;
}

export class MinesweeperUI {
  constructor(doc, {
    difficultyConfig = difficulties,
    scoreRepository = new ScoreRepository(),
    autoPlayerFactory = (game, strategyKey = DEFAULT_AUTO_STRATEGY) => {
      const strategy = AUTO_STRATEGIES[strategyKey] ?? AUTO_STRATEGIES[DEFAULT_AUTO_STRATEGY];
      return strategy.create(game);
    },
  } = {}) {
    this.document = doc;
    this.difficulties = difficultyConfig;
    this.scoreRepository = scoreRepository;
    this.autoPlayerFactory = autoPlayerFactory;
    this.currentDifficultyKey = 'beginner';
    this.game = null;
    this.cellElements = [];
    this.timerId = null;
    this.mode = 'human';
    this.autoRunning = false;
    this.autoPlayer = null;
    this.autoAbort = false;
    this.autoStopping = false;
    this.gameUsedAuto = false;
    this.lastAutoStrategyKey = DEFAULT_AUTO_STRATEGY;
    this.leaderboardUi = { human: new Map(), auto: new Map() };
  }

  init() {
    this._cacheElements();
    this._buildScoreboardLayout();
    this._bindEvents();
    this._selectDifficulty('beginner');
    this._renderScoreboards();
    this._updateAutoUI();
  }

  _cacheElements() {
    this.boardContainer = this.document.getElementById('boardDiv');
    this.mineCountEl = this.document.getElementById('mCount');
    this.tileCountEl = this.document.getElementById('tCount');
    this.statusEl = this.document.getElementById('statusMessage');
    this.timerEl = this.document.getElementById('timer');
    this.faceImg = this.document.getElementById('theSmiley');
    this.downloadBtn = this.document.getElementById('downloadScores');
    this.importInput = this.document.getElementById('importScores');
    this.autoBtn = this.document.getElementById('autoButton');
    this.autoStrategySelect = this.document.getElementById('autoStrategy');
    this.autoIndicator = this.document.getElementById('autoIndicator');
    this.autoIndicatorText = this.autoIndicator?.querySelector('.auto-text') ?? null;
    this.personaLink = this.document.getElementById('personaLink');
    this.playerNameInput = this.document.getElementById('playerName');
    this.scoreboardContainer = this.document.getElementById('leaderboardContainer');
    this.playerStatsContainer = this.document.getElementById('playerStats');
    this.difficultyButtons = Array.from(this.document.querySelectorAll('[data-difficulty]'));
  }

  _buildScoreboardLayout() {
    if (!this.scoreboardContainer) {
      this.leaderboardUi = { human: new Map(), auto: new Map() };
      return;
    }
    this.scoreboardContainer.innerHTML = '';
    this.leaderboardUi = { human: new Map(), auto: new Map() };
    const sections = [
      { mode: 'human', title: 'User Leaderboards' },
      { mode: 'auto', title: 'Auto Leaderboards' },
    ];
    sections.forEach(sectionConfig => {
      const section = this.document.createElement('section');
      section.className = 'mode-section';
      section.dataset.mode = sectionConfig.mode;
      const heading = this.document.createElement('h2');
      heading.textContent = sectionConfig.title;
      section.appendChild(heading);
      Object.entries(this.difficulties).forEach(([difficultyKey, config]) => {
        const board = this.document.createElement('div');
        board.className = 'difficulty-board';
        board.dataset.mode = sectionConfig.mode;
        board.dataset.difficulty = difficultyKey;

        const header = this.document.createElement('div');
        header.className = 'board-header';
        const titleEl = this.document.createElement('h3');
        titleEl.textContent = config.label;
        header.appendChild(titleEl);

        const clearBtn = this.document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'clear-leaderboard';
        clearBtn.dataset.mode = sectionConfig.mode;
        clearBtn.dataset.difficulty = difficultyKey;
        clearBtn.dataset.label = config.label;
        clearBtn.textContent = 'Clear';
        header.appendChild(clearBtn);

        board.appendChild(header);

        const statsEl = this.document.createElement('div');
        statsEl.className = 'board-stats';
        statsEl.textContent = 'Games Played: 0 — Win Rate: 0.00';
        board.appendChild(statsEl);

        const list = this.document.createElement('ol');
        list.className = 'score-list';
        board.appendChild(list);

        section.appendChild(board);
        this.leaderboardUi[sectionConfig.mode].set(difficultyKey, {
          container: board,
          titleEl,
          statsEl,
          listEl: list,
          clearButton: clearBtn,
        });
      });
      this.scoreboardContainer.appendChild(section);
    });
  }

  _bindEvents() {
    this.faceImg.addEventListener('click', () => {
      this.mode = 'human';
      this._resetAutoState();
      this._selectDifficulty(this.currentDifficultyKey);
    });
    this.difficultyButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.mode = 'human';
        this._resetAutoState();
        this._selectDifficulty(button.dataset.difficulty);
      });
    });
    this.downloadBtn.addEventListener('click', () => {
      this._downloadScores();
    });
    this.importInput.addEventListener('change', event => {
      this._importScores(event);
    });
    if (this.scoreboardContainer) {
      this.scoreboardContainer.addEventListener('click', event => {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') {
          return;
        }
        const button = target.closest('.clear-leaderboard');
        if (!button) {
          return;
        }
        const { mode, difficulty, label } = button.dataset;
        if (!mode || !difficulty) {
          return;
        }
        const difficultyLabel = label ?? this.difficulties[difficulty]?.label ?? difficulty;
        this.scoreRepository.clearLeaderboard(mode, difficulty, difficultyLabel);
        this._renderScoreboards();
        const modeLabel = mode === 'auto' ? 'Auto' : 'User';
        this._setStatus(`${modeLabel} ${difficultyLabel} leaderboard cleared.`);
      });
    }
    if (this.autoStrategySelect) {
      this.autoStrategySelect.addEventListener('change', () => {
        if (this.autoRunning) {
          return;
        }
        const strategy = this._getStrategyConfig();
        this._setStatus(`Strategy primed: ${strategy.label} ready for deployment.`);
        this._updatePersonaLink();
      });
    }
    this.autoBtn.addEventListener('click', () => {
      if (this.autoRunning && !this.autoStopping) {
        this._stopAutoPlay();
      } else if (!this.autoRunning) {
        this._startAutoPlay();
      }
    });
  }

  _selectDifficulty(key, { preserveAuto = false } = {}) {
    const config = this.difficulties[key];
    if (!config) {
      throw new Error(`Unknown difficulty: ${key}`);
    }
    this.currentDifficultyKey = key;
    this.difficultyButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.difficulty === key);
    });
    this.game = new MinesweeperGame(config.rows, config.cols, config.mines);
    if (!preserveAuto) {
      this._resetAutoState();
      this.gameUsedAuto = false;
    }
    this._stopTimer();
    this._buildBoard();
    this._updateCounts();
    this._setStatus('Ready to map some mines.');
    this._setFace('smile');
    this._updateTimerDisplay();
  }

  _buildBoard() {
    this.boardContainer.innerHTML = '';
    this.cellElements = [];
    const table = this.document.createElement('table');
    table.className = 'board';
    for (let r = 0; r < this.game.rows; r += 1) {
      const rowEl = this.document.createElement('tr');
      const rowCells = [];
      this.cellElements.push(rowCells);
      for (let c = 0; c < this.game.cols; c += 1) {
        const cellEl = this.document.createElement('td');
        const button = this.document.createElement('button');
        button.className = 'tile';
        button.dataset.row = String(r);
        button.dataset.col = String(c);
        button.addEventListener('click', event => this._onCellClick(event));
        button.addEventListener('contextmenu', event => this._onCellContext(event));
        button.addEventListener('dblclick', event => this._onCellClick(event));
        cellEl.appendChild(button);
        rowEl.appendChild(cellEl);
        rowCells.push(button);
        this._setTileState(r, c, 'hidden');
      }
      table.appendChild(rowEl);
    }
    this.boardContainer.appendChild(table);
  }

  _onCellClick(event) {
    event.preventDefault();
    if (this.autoRunning) {
      return;
    }
    const { row, col } = this._eventToCoords(event);
    const result = this.game.revealCell(row, col);
    this._applyRevealResult(result);
  }

  _onCellContext(event) {
    event.preventDefault();
    if (this.autoRunning) {
      return;
    }
    const { row, col } = this._eventToCoords(event);
    const result = this.game.toggleFlag(row, col);
    if (result.changed) {
      this._setTileState(row, col, result.flagged ? 'flagged' : 'hidden');
      this._updateCounts();
      this._setFace(result.flagged ? 'glasses' : 'smug');
    }
  }

  _eventToCoords(event) {
    const button = event.currentTarget;
    return {
      row: Number(button.dataset.row),
      col: Number(button.dataset.col),
    };
  }

  _applyRevealResult(result, { fromAuto = false, guessed = false } = {}) {
    if (!result) {
      return;
    }
    result.revealed.forEach(cell => {
      if (cell.value === MINE) {
        this._setTileState(cell.row, cell.col, 'exploded');
      } else {
        this._setTileState(cell.row, cell.col, 'revealed', cell.value);
      }
    });
    this._updateCounts();
    if (this.game.status === GameStatus.IN_PROGRESS && !this.timerId) {
      this._startTimer();
    }
    this._updateTimerDisplay();
    if (result.action === 'mine') {
      this._handleLoss();
      return;
    }
    if (this.game.status === GameStatus.WON) {
      if (result.action === 'noop') {
        return;
      }
      this._handleWin(fromAuto ? 'auto' : this.mode);
    } else if (guessed) {
      this._setFace('uncertain');
    } else if (result.revealed.length > 0 && result.revealed.every(cell => cell.value === 0)) {
      this._setFace('huh');
    } else {
      this._setFace('smile');
    }
  }

  _handleLoss() {
    this._stopTimer();
    this._setFace('frown');
    this._setStatus('You tripped a mine. The crowd gasps.');
    const difficultyConfig = this.difficulties[this.currentDifficultyKey];
    const difficultyLabel = difficultyConfig?.label ?? this.currentDifficultyKey;
    const leaderboardMode = this._getLeaderboardMode();
    const playerName = this._getResultName(leaderboardMode);
    this.scoreRepository.recordLoss(leaderboardMode, this.currentDifficultyKey, difficultyLabel, playerName);
    this._renderScoreboards();
    for (let r = 0; r < this.game.rows; r += 1) {
      for (let c = 0; c < this.game.cols; c += 1) {
        if (this.game.field[r][c] === MINE && !this.game.revealed[r][c]) {
          this._setTileState(r, c, 'mine');
        }
        if (this.game.flagged[r][c] && this.game.field[r][c] !== MINE) {
          this._markWrongFlag(r, c);
        }
      }
    }
  }

  _handleWin(mode) {
    this._stopTimer();
    this._setFace('wink');
    this._setStatus('Victory! The townsfolk throw confetti.');
    const difficultyConfig = this.difficulties[this.currentDifficultyKey];
    const difficultyLabel = difficultyConfig?.label ?? this.currentDifficultyKey;
    const seconds = this.game.getElapsedTimeSeconds();
    const leaderboardMode = this._getLeaderboardMode(mode);
    const playerName = this._getResultName(leaderboardMode);
    this.scoreRepository.recordWin(leaderboardMode, this.currentDifficultyKey, difficultyLabel, seconds, playerName);
    this._renderScoreboards();
  }

  _setTileState(row, col, state, value = null) {
    const tile = this.cellElements[row][col];
    tile.className = 'tile';
    tile.dataset.state = state;
    switch (state) {
      case 'hidden':
        tile.style.backgroundImage = `url(${TILE_IMAGES.hidden})`;
        tile.dataset.revealed = 'false';
        tile.classList.remove('wrong-flag');
        delete tile.dataset.value;
        break;
      case 'flagged':
        tile.style.backgroundImage = `url(${TILE_IMAGES.flag})`;
        tile.dataset.revealed = 'false';
        tile.classList.remove('wrong-flag');
        delete tile.dataset.value;
        break;
      case 'mine':
        tile.style.backgroundImage = `url(${TILE_IMAGES.mine})`;
        tile.dataset.revealed = 'true';
        break;
      case 'exploded':
        tile.style.backgroundImage = `url(${TILE_IMAGES.exploded})`;
        tile.dataset.revealed = 'true';
        break;
      case 'revealed':
        tile.style.backgroundImage = `url(${imageForValue(value)})`;
        tile.dataset.revealed = 'true';
        tile.dataset.value = String(value);
        break;
      default:
        break;
    }
  }

  _markWrongFlag(row, col) {
    const tile = this.cellElements[row][col];
    tile.style.backgroundImage = `url(${TILE_IMAGES.flag})`;
    tile.classList.add('wrong-flag');
  }

  _updateCounts() {
    this.mineCountEl.textContent = String(this.game.remainingMines);
    this.tileCountEl.textContent = String(this.game.remainingSafeTiles);
  }

  _startTimer() {
    if (this.timerId) {
      return;
    }
    this.timerId = setInterval(() => this._updateTimerDisplay(), 100);
  }

  _stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this._updateTimerDisplay();
  }

  _updateTimerDisplay() {
    this.timerEl.textContent = formatSeconds(this.game.getElapsedTimeSeconds());
  }

  _setStatus(message) {
    this.statusEl.textContent = message;
  }

  _setFace(faceKey) {
    const face = FACE_IMAGES[faceKey] ?? FACE_IMAGES.smile;
    this.faceImg.src = face;
  }

  _downloadScores() {
    const payload = this.scoreRepository.exportScores();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = 'minesweeper-scores.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async _importScores(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      this.scoreRepository.mergeScores(text);
      this._renderScoreboards();
      this._setStatus('Scores imported and merged. Leaderboard updated.');
    } catch (err) {
      this._setStatus('Import failed. That file gave me bad vibes.');
    } finally {
      event.target.value = '';
    }
  }

  _renderScoreboards() {
    if (!this.leaderboardUi) {
      return;
    }
    Object.entries(this.leaderboardUi).forEach(([mode, difficultyMap]) => {
      difficultyMap.forEach((elements, difficultyKey) => {
        const config = this.difficulties[difficultyKey];
        const fallbackLabel = config?.label ?? difficultyKey;
        const board = this.scoreRepository.getLeaderboard(mode, difficultyKey, fallbackLabel);
        const boardLabel = board.label ?? fallbackLabel;
        if (elements.titleEl) {
          elements.titleEl.textContent = boardLabel;
        }
        if (elements.clearButton) {
          elements.clearButton.dataset.label = boardLabel;
        }
        const totalGames = board.wins + board.losses;
        const winRate = totalGames === 0 ? 0 : board.wins / totalGames;
        elements.statsEl.textContent = `Games Played: ${totalGames} — Win Rate: ${winRate.toFixed(2)}`;
        elements.listEl.innerHTML = '';
        if (board.entries.length === 0) {
          const empty = this.document.createElement('li');
          empty.className = 'empty-state';
          empty.textContent = 'No wins recorded yet.';
          elements.listEl.appendChild(empty);
          return;
        }
        board.entries.forEach(entry => {
          const item = this.document.createElement('li');
          const timeSpan = this.document.createElement('span');
          timeSpan.className = 'score-time';
          timeSpan.textContent = formatSeconds(entry.seconds);
          const nameSpan = this.document.createElement('span');
          nameSpan.className = 'score-name';
          nameSpan.textContent = `leaderboard name: ${entry.name}`;
          const recordedTime = this.document.createElement('time');
          recordedTime.className = 'score-recorded';
          recordedTime.dateTime = entry.recordedAt;
          recordedTime.textContent = this._formatRecordedAt(entry.recordedAt);
          item.appendChild(timeSpan);
          item.appendChild(this.document.createTextNode(' — '));
          item.appendChild(nameSpan);
          item.appendChild(this.document.createTextNode(' — '));
          item.appendChild(recordedTime);
          elements.listEl.appendChild(item);
        });
      });
    });
    this._renderPlayerStats();
  }

  _renderPlayerStats() {
    if (!this.playerStatsContainer || typeof this.scoreRepository?.getPlayerStats !== 'function') {
      return;
    }
    const stats = this.scoreRepository.getPlayerStats();
    this.playerStatsContainer.innerHTML = '';
    const heading = this.document.createElement('h2');
    heading.textContent = 'Leaderboard name stats';
    this.playerStatsContainer.appendChild(heading);
    const description = this.document.createElement('p');
    description.textContent = 'Wins and losses by leaderboard name for each difficulty.';
    this.playerStatsContainer.appendChild(description);
    const difficultyEntries = Object.entries(this.difficulties);
    const modeSections = [
      { mode: 'human', title: 'Human competitors' },
      { mode: 'auto', title: 'AI competitors' },
    ];
    modeSections.forEach(sectionConfig => {
      const section = this.document.createElement('div');
      section.className = 'player-mode-stats';
      const modeHeading = this.document.createElement('h3');
      modeHeading.textContent = sectionConfig.title;
      section.appendChild(modeHeading);
      const players = stats?.[sectionConfig.mode]
        ? Object.values(stats[sectionConfig.mode])
        : [];
      if (!players || players.length === 0) {
        const empty = this.document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No games recorded yet.';
        section.appendChild(empty);
        this.playerStatsContainer.appendChild(section);
        return;
      }
      players.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      const table = this.document.createElement('table');
      table.className = 'player-stats-table';
      const thead = this.document.createElement('thead');
      const headerRow = this.document.createElement('tr');
      const nameHeader = this.document.createElement('th');
      nameHeader.scope = 'col';
      nameHeader.textContent = 'Leaderboard name';
      headerRow.appendChild(nameHeader);
      difficultyEntries.forEach(([difficultyKey, config]) => {
        const th = this.document.createElement('th');
        th.scope = 'col';
        th.dataset.difficulty = difficultyKey;
        th.textContent = config.label;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = this.document.createElement('tbody');
      players.forEach(player => {
        const row = this.document.createElement('tr');
        const nameCell = this.document.createElement('th');
        nameCell.scope = 'row';
        nameCell.textContent = player.name;
        row.appendChild(nameCell);
        difficultyEntries.forEach(([difficultyKey]) => {
          const cell = this.document.createElement('td');
          const record = player.difficulties?.[difficultyKey] ?? { wins: 0, losses: 0 };
          const wins = Number.isFinite(record.wins) ? record.wins : 0;
          const losses = Number.isFinite(record.losses) ? record.losses : 0;
          cell.dataset.difficulty = difficultyKey;
          cell.textContent = `${wins}-${losses}`;
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      section.appendChild(table);
      this.playerStatsContainer.appendChild(section);
    });
  }

  _getPlayerName() {
    if (!this.playerNameInput) {
      return 'anonymous';
    }
    const value = this.playerNameInput.value ?? '';
    const trimmed = value.trim();
    return trimmed || 'anonymous';
  }

  _getStrategyPersonaName(strategyKey = this._getSelectedStrategyKey()) {
    const strategy = this._getStrategyConfig(strategyKey);
    if (strategy.persona?.name) {
      return strategy.persona.name;
    }
    return strategy.label;
  }

  _getResultName(mode = this._getLeaderboardMode()) {
    if (mode === 'auto') {
      const strategyKey = this.lastAutoStrategyKey ?? this._getSelectedStrategyKey();
      return this._getStrategyPersonaName(strategyKey);
    }
    return this._getPlayerName();
  }

  _updatePersonaLink(strategyKey = this._getSelectedStrategyKey()) {
    if (!this.personaLink) {
      return;
    }
    const strategy = this._getStrategyConfig(strategyKey);
    if (!strategy.persona) {
      this.personaLink.hidden = true;
      return;
    }
    this.personaLink.hidden = false;
    this.personaLink.href = strategy.persona.page;
    this.personaLink.textContent = `Meet ${strategy.persona.name}`;
    this.personaLink.setAttribute('aria-label', `Learn about ${strategy.label}`);
  }

  _formatRecordedAt(isoString) {
    if (!isoString) {
      return '';
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  _getLeaderboardMode(mode = this.mode) {
    if (this.gameUsedAuto || mode === 'auto') {
      return 'auto';
    }
    return 'human';
  }

  async _startAutoPlay() {
    if (this.autoRunning) {
      return;
    }
    const shouldResetForAuto =
      !this.game ||
      this.game.status === GameStatus.LOST ||
      this.game.status === GameStatus.WON;
    if (shouldResetForAuto) {
      this._selectDifficulty(this.currentDifficultyKey, { preserveAuto: true });
    }
    this.gameUsedAuto = true;
    this.mode = 'auto';
    this.autoRunning = true;
    this.autoAbort = false;
    this.autoStopping = false;
    const strategyKey = this._getSelectedStrategyKey();
    const strategy = this._getStrategyConfig(strategyKey);
    this.lastAutoStrategyKey = strategyKey;
    this._setStatus(`Auto pilot engaged with ${strategy.label}. Watching the magic happen.`);
    this._updateAutoUI();
    let autoPlayer = this.autoPlayerFactory(this.game, strategyKey);
    if (!autoPlayer) {
      autoPlayer = strategy.create(this.game);
    }
    this.autoPlayer = autoPlayer;
    try {
      await autoPlayer.play(async action => {
        if (this.autoAbort) {
          const error = new Error('AUTO_ABORT');
          error.name = 'AutoAbortError';
          throw error;
        }
        if (action.type === 'flag') {
          const result = this.game.toggleFlag(action.row, action.col);
          if (result.changed) {
            this._setTileState(action.row, action.col, result.flagged ? 'flagged' : 'hidden');
            this._updateCounts();
          }
          return;
        }
        if (action.type === 'reveal') {
          const outcome = this.game.revealCell(action.row, action.col);
          this._applyRevealResult(outcome, { fromAuto: true, guessed: action.guess });
        }
      });
    } catch (error) {
      if (error.name === 'AutoAbortError') {
        this._setStatus('Auto pilot cancelled. Manual control restored.');
        this.autoRunning = false;
        this.autoAbort = false;
        this.autoStopping = false;
        this.autoPlayer = null;
        this.mode = 'human';
        this._updateAutoUI();
        return;
      }
      this.autoRunning = false;
      this.autoStopping = false;
      this.autoPlayer = null;
      this.mode = 'human';
      this._updateAutoUI();
      throw error;
    }
    if (this.game.status !== GameStatus.WON) {
      this._setStatus('Auto pilot tapped out. Maybe next time.');
    }
    this.autoRunning = false;
    this.autoAbort = false;
    this.autoStopping = false;
    this.autoPlayer = null;
    this.mode = 'human';
    this._updateAutoUI();
  }

  _resetAutoState() {
    if (this.autoRunning) {
      this._stopAutoPlay({ quiet: true });
      return;
    }
    this.autoAbort = false;
    this.autoRunning = false;
    this.autoStopping = false;
    this.mode = 'human';
    this._updateAutoUI();
  }

  _stopAutoPlay({ quiet = false } = {}) {
    if (!this.autoRunning || this.autoStopping) {
      return;
    }
    this.autoAbort = true;
    this.autoStopping = true;
    this.mode = 'human';
    if (!quiet) {
      this._setStatus('Auto pilot disengaging. Manual control incoming.');
    }
    this._updateAutoUI();
  }

  _getSelectedStrategyKey() {
    if (!this.autoStrategySelect) {
      return DEFAULT_AUTO_STRATEGY;
    }
    return this.autoStrategySelect.value || DEFAULT_AUTO_STRATEGY;
  }

  _getStrategyConfig(key = this._getSelectedStrategyKey()) {
    return AUTO_STRATEGIES[key] ?? AUTO_STRATEGIES[DEFAULT_AUTO_STRATEGY];
  }

  _updateAutoUI() {
    const indicator = this.autoIndicator;
    const textEl = this.autoIndicatorText;
    let indicatorState = 'off';
    let indicatorText = 'Auto Pilot Off';
    if (this.autoRunning) {
      if (this.autoStopping) {
        indicatorState = 'stopping';
        indicatorText = 'Auto Pilot Pausing';
      } else {
        indicatorState = 'on';
        indicatorText = 'Auto Pilot On';
      }
    }
    if (indicator) {
      indicator.dataset.state = indicatorState;
    }
    if (textEl) {
      textEl.textContent = indicatorText;
    }
    if (this.autoBtn) {
      if (this.autoRunning) {
        this.autoBtn.textContent = this.autoStopping ? 'Stopping...' : 'Stop Auto Pilot';
        this.autoBtn.disabled = this.autoStopping;
        this.autoBtn.classList.toggle('active', !this.autoStopping);
      } else {
        this.autoBtn.textContent = 'Auto Pilot';
        this.autoBtn.disabled = false;
        this.autoBtn.classList.remove('active');
      }
    }
    if (this.autoStrategySelect) {
      this.autoStrategySelect.disabled = this.autoRunning;
    }
    this._updatePersonaLink();
  }
}
