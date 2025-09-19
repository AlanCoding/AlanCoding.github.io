import { MinesweeperGame, GameStatus, MINE } from './game.js';
import { ScoreRepository, formatSeconds } from './scoreboard.js';
import { AutoPlayer } from './autoPlayer.js';

const difficulties = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
  expert: { rows: 16, cols: 30, mines: 99, label: 'Expert' },
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
    autoPlayerFactory = game => new AutoPlayer(game),
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
  }

  init() {
    this._cacheElements();
    this._bindEvents();
    this._selectDifficulty('beginner');
    this._renderScoreboards();
  }

  _cacheElements() {
    this.boardContainer = this.document.getElementById('boardDiv');
    this.mineCountEl = this.document.getElementById('mCount');
    this.tileCountEl = this.document.getElementById('tCount');
    this.statusEl = this.document.getElementById('statusMessage');
    this.timerEl = this.document.getElementById('timer');
    this.faceImg = this.document.getElementById('theSmiley');
    this.playerList = this.document.getElementById('playerScores');
    this.autoList = this.document.getElementById('autoScores');
    this.downloadBtn = this.document.getElementById('downloadScores');
    this.importInput = this.document.getElementById('importScores');
    this.autoBtn = this.document.getElementById('autoButton');
    this.difficultyButtons = Array.from(this.document.querySelectorAll('[data-difficulty]'));
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
    this.autoBtn.addEventListener('click', () => {
      this._startAutoPlay();
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
    const difficulty = this.difficulties[this.currentDifficultyKey].label;
    const seconds = this.game.getElapsedTimeSeconds();
    this.scoreRepository.addScore(mode === 'auto' ? 'auto' : 'human', difficulty, seconds);
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
    this._renderScoreList(this.playerList, this.scoreRepository.getScores('human'));
    this._renderScoreList(this.autoList, this.scoreRepository.getScores('auto'));
  }

  _renderScoreList(container, scores) {
    container.innerHTML = '';
    if (scores.length === 0) {
      const li = this.document.createElement('li');
      li.textContent = 'No scores yet — go make history!';
      container.appendChild(li);
      return;
    }
    scores.forEach(entry => {
      const li = this.document.createElement('li');
      li.textContent = `${entry.difficulty}: ${formatSeconds(entry.seconds)}`;
      container.appendChild(li);
    });
  }

  async _startAutoPlay() {
    if (this.autoRunning) {
      return;
    }
    this.mode = 'auto';
    this.autoRunning = true;
    this.autoAbort = false;
    this._selectDifficulty(this.currentDifficultyKey, { preserveAuto: true });
    this._setStatus('Auto pilot engaged. Watching the magic happen.');
    const autoPlayer = this.autoPlayerFactory(this.game);
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
        this.mode = 'human';
        return;
      }
      throw error;
    }
    if (this.game.status !== GameStatus.WON) {
      this._setStatus('Auto pilot tapped out. Maybe next time.');
    }
    this.autoRunning = false;
    this.mode = 'human';
  }

  _resetAutoState() {
    if (this.autoRunning) {
      this.autoAbort = true;
    } else {
      this.autoAbort = false;
    }
    this.autoRunning = false;
    this.mode = 'human';
  }
}
