import { GameStatus } from './game.js';

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

const keyFor = (row, col) => `${row},${col}`;

export class AutoPlayer {
  constructor(game, { delayMs = 40 } = {}) {
    this.game = game;
    this.delayMs = delayMs;
  }

  async play(applyAction = async () => {}) {
    if (this.game.status === GameStatus.LOST) {
      return { status: this.game.status };
    }
    if (this._noCellsRevealed()) {
      const { row, col } = this._chooseOpeningMove();
      await applyAction({ type: 'reveal', row, col, guess: false });
      await this._sleep();
    }
    while (this.game.status !== GameStatus.LOST && this.game.status !== GameStatus.WON) {
      const moves = this._nextMoves();
      let moved = false;
      for (const cell of moves.flags) {
        if (!this.game.flagged[cell.row][cell.col]) {
          await applyAction({ type: 'flag', row: cell.row, col: cell.col });
          moved = true;
          await this._sleep();
        }
      }
      for (const cell of moves.reveals) {
        if (!this.game.revealed[cell.row][cell.col] && !this.game.flagged[cell.row][cell.col]) {
          await applyAction({ type: 'reveal', row: cell.row, col: cell.col, guess: false });
          moved = true;
          await this._sleep();
          if (this.game.status === GameStatus.LOST || this.game.status === GameStatus.WON) {
            break;
          }
        }
      }
      if (this.game.status === GameStatus.LOST || this.game.status === GameStatus.WON) {
        break;
      }
      if (!moved) {
        const guess = moves.guess ?? this._chooseFallbackGuess();
        if (!guess) {
          break;
        }
        await applyAction({ type: 'reveal', row: guess.row, col: guess.col, guess: true });
        await this._sleep();
      }
    }
    return { status: this.game.status };
  }

  _sleep() {
    if (this.delayMs <= 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  _noCellsRevealed() {
    for (let r = 0; r < this.game.rows; r += 1) {
      for (let c = 0; c < this.game.cols; c += 1) {
        if (this.game.revealed[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  _chooseOpeningMove() {
    return {
      row: Math.floor(this.game.rows / 2),
      col: Math.floor(this.game.cols / 2),
    };
  }

  _nextMoves() {
    const reveals = new Map();
    const flags = new Map();
    const numbers = this._collectNumberCells();
    numbers.forEach(cell => {
      if (cell.hiddenNeighbors.length === 0) {
        return;
      }
      const minesNeeded = cell.value - cell.flaggedCount;
      if (minesNeeded === 0) {
        cell.hiddenNeighbors.forEach(neighbor => {
          reveals.set(keyFor(neighbor.row, neighbor.col), neighbor);
        });
      } else if (minesNeeded === cell.hiddenNeighbors.length) {
        cell.hiddenNeighbors.forEach(neighbor => {
          flags.set(keyFor(neighbor.row, neighbor.col), neighbor);
        });
      }
    });
    if (reveals.size > 0 || flags.size > 0) {
      return {
        reveals: Array.from(reveals.values()),
        flags: Array.from(flags.values()),
        guess: null,
      };
    }
    const advanced = this._analyzeWithConstraints(numbers);
    if (advanced.reveals.size > 0 || advanced.flags.size > 0) {
      return {
        reveals: Array.from(advanced.reveals.values()),
        flags: Array.from(advanced.flags.values()),
        guess: null,
      };
    }
    return {
      reveals: [],
      flags: [],
      guess: advanced.bestGuess,
    };
  }

  _collectNumberCells() {
    const result = [];
    for (let r = 0; r < this.game.rows; r += 1) {
      for (let c = 0; c < this.game.cols; c += 1) {
        if (!this.game.revealed[r][c]) {
          continue;
        }
        const value = this.game.field[r][c];
        if (value <= 0) {
          continue;
        }
        const hiddenNeighbors = [];
        let flaggedCount = 0;
        for (const [dr, dc] of neighborOffsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (!this.game.isInBounds(nr, nc)) {
            continue;
          }
          if (this.game.flagged[nr][nc]) {
            flaggedCount += 1;
          } else if (!this.game.revealed[nr][nc]) {
            hiddenNeighbors.push({ row: nr, col: nc });
          }
        }
        result.push({ row: r, col: c, value, hiddenNeighbors, flaggedCount });
      }
    }
    return result;
  }

  _analyzeWithConstraints(numbers) {
    const reveals = new Map();
    const flags = new Map();
    const guesses = [];
    const components = this._buildConstraintComponents(numbers);
    components.forEach(component => {
      const analysis = this._enumerateComponent(component);
      if (!analysis) {
        return;
      }
      analysis.safe.forEach(cell => {
        reveals.set(keyFor(cell.row, cell.col), cell);
      });
      analysis.mines.forEach(cell => {
        flags.set(keyFor(cell.row, cell.col), cell);
      });
      if (analysis.bestGuess) {
        guesses.push(analysis.bestGuess);
      }
    });
    let bestGuess = null;
    if (guesses.length > 0) {
      bestGuess = guesses.reduce((best, current) => {
        if (!best || current.probability < best.probability) {
          return current;
        }
        return best;
      }, null);
    }
    return { reveals, flags, bestGuess };
  }

  _buildConstraintComponents(numbers) {
    const constraints = [];
    const variables = new Map();
    numbers.forEach(cell => {
      if (cell.hiddenNeighbors.length === 0) {
        return;
      }
      const requirement = cell.value - cell.flaggedCount;
      if (requirement < 0) {
        return;
      }
      const entries = cell.hiddenNeighbors.map(neighbor => ({
        ...neighbor,
        key: keyFor(neighbor.row, neighbor.col),
      }));
      const constraint = {
        cells: entries.map(entry => entry.key),
        required: Math.min(requirement, entries.length),
      };
      const constraintIndex = constraints.push(constraint) - 1;
      entries.forEach(entry => {
        const existing = variables.get(entry.key) ?? {
          key: entry.key,
          row: entry.row,
          col: entry.col,
          constraints: [],
        };
        existing.constraints.push(constraintIndex);
        variables.set(entry.key, existing);
      });
    });

    const visited = new Set();
    const components = [];
    for (const [key, variable] of variables.entries()) {
      if (visited.has(key)) {
        continue;
      }
      const queue = [key];
      const componentCells = [];
      const constraintIndices = new Set();
      while (queue.length > 0) {
        const currentKey = queue.shift();
        if (visited.has(currentKey)) {
          continue;
        }
        visited.add(currentKey);
        const current = variables.get(currentKey);
        componentCells.push(current);
        current.constraints.forEach(index => {
          constraintIndices.add(index);
          constraints[index].cells.forEach(cellKey => {
            if (!visited.has(cellKey)) {
              queue.push(cellKey);
            }
          });
        });
      }
      const componentConstraints = Array.from(constraintIndices).map(index => constraints[index]);
      components.push({ cells: componentCells, constraints: componentConstraints });
    }
    return components;
  }

  _enumerateComponent(component) {
    const { cells, constraints } = component;
    if (cells.length === 0) {
      return null;
    }
    if (cells.length > 15) {
      return null;
    }
    const indexByKey = new Map();
    cells.forEach((cell, index) => {
      indexByKey.set(cell.key, index);
    });
    const normalizedConstraints = constraints
      .map(constraint => ({
        cells: constraint.cells
          .map(key => indexByKey.get(key))
          .filter(index => index !== undefined),
        required: constraint.required,
      }))
      .filter(constraint => constraint.cells.length > 0);
    if (normalizedConstraints.length === 0) {
      return {
        safe: [],
        mines: [],
        bestGuess: {
          row: cells[0].row,
          col: cells[0].col,
          probability: 0.5,
        },
      };
    }
    const totalCells = cells.length;
    const assignments = [];
    const workingAssignment = Array(totalCells).fill(0);
    const remainingRequired = normalizedConstraints.map(constraint => constraint.required);
    const remainingCells = normalizedConstraints.map(constraint => constraint.cells.length);
    const cellToConstraints = Array.from({ length: totalCells }, () => []);
    normalizedConstraints.forEach((constraint, constraintIndex) => {
      constraint.cells.forEach(cellIndex => {
        cellToConstraints[cellIndex].push(constraintIndex);
      });
    });

    const search = index => {
      if (index === totalCells) {
        if (remainingRequired.every(value => value === 0)) {
          assignments.push([...workingAssignment]);
        }
        return;
      }
      for (let guess = 0; guess <= 1; guess += 1) {
        const updates = [];
        let valid = true;
        workingAssignment[index] = guess;
        for (const constraintIndex of cellToConstraints[index]) {
          remainingCells[constraintIndex] -= 1;
          remainingRequired[constraintIndex] -= guess;
          if (
            remainingRequired[constraintIndex] < 0 ||
            remainingRequired[constraintIndex] > remainingCells[constraintIndex]
          ) {
            valid = false;
          }
          updates.push(constraintIndex);
        }
        if (valid) {
          search(index + 1);
        }
        for (const constraintIndex of updates) {
          remainingCells[constraintIndex] += 1;
          remainingRequired[constraintIndex] += guess;
        }
        if (!valid) {
          continue;
        }
      }
    };

    search(0);
    if (assignments.length === 0) {
      return null;
    }
    const mineTotals = Array(totalCells).fill(0);
    assignments.forEach(assignment => {
      assignment.forEach((value, index) => {
        mineTotals[index] += value;
      });
    });
    const total = assignments.length;
    const safe = [];
    const mines = [];
    let bestGuess = null;
    mineTotals.forEach((count, index) => {
      const probability = count / total;
      const cell = cells[index];
      if (probability === 0) {
        safe.push({ row: cell.row, col: cell.col });
      } else if (probability === 1) {
        mines.push({ row: cell.row, col: cell.col });
      } else {
        if (!bestGuess || probability < bestGuess.probability) {
          bestGuess = { row: cell.row, col: cell.col, probability };
        }
      }
    });
    return { safe, mines, bestGuess };
  }

  _chooseFallbackGuess() {
    let bestCell = null;
    let lowestRisk = Infinity;
    for (let r = 0; r < this.game.rows; r += 1) {
      for (let c = 0; c < this.game.cols; c += 1) {
        if (this.game.revealed[r][c] || this.game.flagged[r][c]) {
          continue;
        }
        const risk = this._estimateRisk(r, c);
        if (risk < lowestRisk) {
          lowestRisk = risk;
          bestCell = { row: r, col: c };
        }
      }
    }
    return bestCell;
  }

  _estimateRisk(row, col) {
    let touchingNumbers = 0;
    for (const [dr, dc] of neighborOffsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (!this.game.isInBounds(nr, nc)) {
        continue;
      }
      if (this.game.revealed[nr][nc] && this.game.field[nr][nc] > 0) {
        touchingNumbers += 1;
      }
    }
    if (touchingNumbers === 0) {
      return 0;
    }
    return touchingNumbers;
  }
}

export function applyAutoAction(game, action) {
  if (action.type === 'flag') {
    return game.toggleFlag(action.row, action.col);
  }
  if (action.type === 'reveal') {
    return game.revealCell(action.row, action.col);
  }
  throw new Error('Unknown auto action');
}
