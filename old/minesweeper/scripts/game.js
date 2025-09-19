export const GameStatus = {
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  WON: 'won',
  LOST: 'lost',
};

const MINE = -1;

const neighborOffsets = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const defaultRng = () => Math.random();

export class MinesweeperGame {
  constructor(rows, cols, mineCount, rng = defaultRng) {
    if (rows <= 0 || cols <= 0) {
      throw new Error('Board must have positive size');
    }
    if (mineCount >= rows * cols) {
      throw new Error('Mine count must leave at least one safe tile');
    }
    this._rng = rng;
    this._initialRows = rows;
    this._initialCols = cols;
    this._initialMineCount = mineCount;
    this.reset(rows, cols, mineCount);
  }

  reset(rows = this._initialRows, cols = this._initialCols, mineCount = this._initialMineCount) {
    this.rows = rows;
    this.cols = cols;
    this.totalMines = mineCount;
    this.field = Array.from({ length: rows }, () => Array(cols).fill(0));
    this.revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
    this.flagged = Array.from({ length: rows }, () => Array(cols).fill(false));
    this.minesPlaced = false;
    this.status = GameStatus.READY;
    this.revealedCount = 0;
    this.remainingMines = this.totalMines;
    this.startTimestamp = null;
    this.endTimestamp = null;
  }

  get remainingSafeTiles() {
    return this.rows * this.cols - this.totalMines - this.revealedCount;
  }

  isInBounds(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getCellState(row, col) {
    if (!this.isInBounds(row, col)) {
      throw new Error('Cell out of bounds');
    }
    return {
      value: this.field[row][col],
      revealed: this.revealed[row][col],
      flagged: this.flagged[row][col],
    };
  }

  toggleFlag(row, col) {
    if (!this.isInBounds(row, col)) {
      throw new Error('Cell out of bounds');
    }
    if (this.status === GameStatus.LOST || this.status === GameStatus.WON) {
      return { changed: false };
    }
    if (this.revealed[row][col]) {
      return { changed: false };
    }
    this.flagged[row][col] = !this.flagged[row][col];
    this.remainingMines += this.flagged[row][col] ? -1 : 1;
    return { changed: true, flagged: this.flagged[row][col] };
  }

  revealCell(row, col) {
    if (!this.isInBounds(row, col)) {
      throw new Error('Cell out of bounds');
    }
    if (this.status === GameStatus.LOST || this.status === GameStatus.WON) {
      return { action: 'noop', revealed: [] };
    }
    if (!this.minesPlaced) {
      this._placeMines(row, col);
    }
    if (this.status === GameStatus.READY) {
      this.status = GameStatus.IN_PROGRESS;
      this.startTimestamp = Date.now();
    }
    if (this.flagged[row][col]) {
      return { action: 'noop', reason: 'flagged', revealed: [] };
    }
    if (this.revealed[row][col]) {
      return this.chordCell(row, col);
    }
    const revealed = this._revealFlood([{ row, col }]);
    if (this.field[row][col] === MINE) {
      this.status = GameStatus.LOST;
      this.endTimestamp = Date.now();
      return { action: 'mine', revealed };
    }
    if (this.remainingSafeTiles === 0) {
      this.status = GameStatus.WON;
      this.endTimestamp = Date.now();
    }
    return { action: 'reveal', revealed };
  }

  chordCell(row, col) {
    if (!this.isInBounds(row, col)) {
      throw new Error('Cell out of bounds');
    }
    if (!this.revealed[row][col]) {
      return { action: 'noop', revealed: [] };
    }
    const cellValue = this.field[row][col];
    if (cellValue <= 0) {
      return { action: 'noop', revealed: [] };
    }
    const neighbors = this._getNeighborCoords(row, col);
    let flaggedCount = 0;
    const hiddenNeighbors = [];
    neighbors.forEach(([r, c]) => {
      if (this.flagged[r][c]) {
        flaggedCount += 1;
      } else if (!this.revealed[r][c]) {
        hiddenNeighbors.push({ row: r, col: c });
      }
    });
    if (flaggedCount !== cellValue) {
      return { action: 'noop', revealed: [] };
    }
    const revealed = this._revealFlood(hiddenNeighbors);
    if (revealed.some(cell => cell.value === MINE)) {
      this.status = GameStatus.LOST;
      this.endTimestamp = Date.now();
      return { action: 'mine', revealed };
    }
    if (this.remainingSafeTiles === 0) {
      this.status = GameStatus.WON;
      this.endTimestamp = Date.now();
    }
    return { action: 'reveal', revealed };
  }

  _revealFlood(startCells) {
    const queue = [...startCells];
    const revealed = [];
    while (queue.length > 0) {
      const { row, col } = queue.shift();
      if (!this.isInBounds(row, col)) {
        continue;
      }
      if (this.revealed[row][col]) {
        continue;
      }
      if (this.flagged[row][col]) {
        continue;
      }
      this.revealed[row][col] = true;
      const value = this.field[row][col];
      revealed.push({ row, col, value });
      if (value === MINE) {
        // stop expanding further; a mine ends the game
        break;
      }
      this.revealedCount += 1;
      if (value === 0) {
        const neighbors = this._getNeighborCoords(row, col);
        neighbors.forEach(([r, c]) => {
          if (!this.revealed[r][c] && !this.flagged[r][c]) {
            queue.push({ row: r, col: c });
          }
        });
      }
    }
    return revealed;
  }

  _placeMines(safeRow, safeCol) {
    const forbidden = new Set();
    this._getNeighborCoords(safeRow, safeCol, true).forEach(([r, c]) => {
      forbidden.add(`${r},${c}`);
    });
    forbidden.add(`${safeRow},${safeCol}`);
    const available = [];
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const key = `${r},${c}`;
        if (!forbidden.has(key)) {
          available.push([r, c]);
        }
      }
    }
    if (available.length < this.totalMines) {
      throw new Error('Not enough cells to place mines');
    }
    let minesToPlace = this.totalMines;
    while (minesToPlace > 0) {
      const index = Math.floor(this._rng() * available.length);
      const [r, c] = available.splice(index, 1)[0];
      this.field[r][c] = MINE;
      minesToPlace -= 1;
    }
    this._recalculateNumbers();
    this.minesPlaced = true;
  }

  _recalculateNumbers() {
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        if (this.field[r][c] === MINE) {
          continue;
        }
        let count = 0;
        this._getNeighborCoords(r, c).forEach(([nr, nc]) => {
          if (this.field[nr][nc] === MINE) {
            count += 1;
          }
        });
        this.field[r][c] = count;
      }
    }
  }

  _getNeighborCoords(row, col, includeSelf = false) {
    const coords = [];
    if (includeSelf) {
      coords.push([row, col]);
    }
    for (const [dr, dc] of neighborOffsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (this.isInBounds(nr, nc)) {
        coords.push([nr, nc]);
      }
    }
    return coords;
  }

  loadLayout(layout) {
    const rows = layout.length;
    const cols = layout[0].length;
    this.reset(rows, cols, 0);
    let mineCount = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (layout[r][c] === MINE) {
          this.field[r][c] = MINE;
          mineCount += 1;
        } else {
          this.field[r][c] = 0;
        }
      }
    }
    this.totalMines = mineCount;
    this.remainingMines = mineCount;
    this._recalculateNumbers();
    this.minesPlaced = true;
    this.status = GameStatus.READY;
  }

  getElapsedTimeSeconds() {
    if (this.startTimestamp == null) {
      return 0;
    }
    const end = this.endTimestamp ?? Date.now();
    return (end - this.startTimestamp) / 1000;
  }
}

export { MINE };
