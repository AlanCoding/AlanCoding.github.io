(function (global) {
  'use strict';

  const STORAGE_KEY = 'game_zone_achievements_store_v1';
  const TOAST_DURATION_MS = 5000;
  const STYLE_ELEMENT_ID = 'game-achievement-toast-styles';

  const CATALOG = {
    'word-jumble': [
      {
        id: 'word-aeprs',
        name: 'aeprs creepers!',
        description: "Log the chilling letter combo 'aeprs' in your Word Jumble history.",
      },
    ],
    basketball: [
      {
        id: 'basketball-curry-hurry',
        name: 'Curry hurry!',
        description: 'Drop at least 180 points on Level 2 to prove a blistering 90% free throw percentage.',
      },
      {
        id: 'basketball-zero-hero',
        name: 'Goose Egg Gala!',
        description: 'Finish a rapid-fire run with a perfect goose egg—celebrate the art of missing every shot.',
      },
    ],
  };

  let memoryState = loadState();

  const toastQueue = [];
  let activeToastTimer = null;
  let domReady = typeof document !== 'undefined' && document.readyState !== 'loading';

  if (!domReady && typeof document !== 'undefined') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        domReady = true;
        if (toastQueue.length > 0 && !activeToastTimer) {
          showNextToast();
        }
      },
      { once: true }
    );
  }

  function loadState() {
    if (!global.localStorage) {
      return { games: {} };
    }
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { games: {} };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.games !== 'object') {
        return { games: {} };
      }
      return { games: parsed.games };
    } catch (error) {
      return { games: {} };
    }
  }

  function saveState(state) {
    if (!global.localStorage) {
      return;
    }
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // ignore persistence failures
    }
  }

  function getCatalogForGame(gameId) {
    return Array.isArray(CATALOG[gameId]) ? CATALOG[gameId] : [];
  }

  function getAchievementMeta(gameId, achievementId) {
    return getCatalogForGame(gameId).find(item => item.id === achievementId) || null;
  }

  function getAchievementState(gameId, achievementId) {
    if (!memoryState.games[gameId]) {
      memoryState.games[gameId] = {};
    }
    if (!memoryState.games[gameId][achievementId]) {
      memoryState.games[gameId][achievementId] = { unlocked: false, unlockedAt: null };
    }
    return memoryState.games[gameId][achievementId];
  }

  function ensureGameDefaults(gameId) {
    const catalog = getCatalogForGame(gameId);
    if (catalog.length === 0) {
      return;
    }
    let changed = false;
    catalog.forEach(meta => {
      const gameState = memoryState.games[gameId] || (memoryState.games[gameId] = {});
      const hadEntry = Object.prototype.hasOwnProperty.call(gameState, meta.id);
      const entry = getAchievementState(gameId, meta.id);
      if (!hadEntry) {
        changed = true;
      }
      if (typeof entry.unlocked !== 'boolean' || (entry.unlocked && typeof entry.unlockedAt !== 'string')) {
        entry.unlocked = Boolean(entry.unlocked);
        entry.unlockedAt = entry.unlocked ? entry.unlockedAt || new Date().toISOString() : null;
        changed = true;
      }
    });
    if (changed) {
      saveState(memoryState);
    }
  }

  Object.keys(CATALOG).forEach(ensureGameDefaults);

  function setStatus(gameId, achievementId, unlocked, options = {}) {
    const meta = getAchievementMeta(gameId, achievementId);
    if (!meta) {
      return false;
    }
    const silent = Boolean(options.silent);
    const entry = getAchievementState(gameId, achievementId);
    const nextValue = Boolean(unlocked);
    if (entry.unlocked === nextValue) {
      return entry.unlocked;
    }
    entry.unlocked = nextValue;
    entry.unlockedAt = nextValue ? new Date().toISOString() : null;
    saveState(memoryState);
    if (nextValue && !silent) {
      enqueueToast(meta);
    }
    return entry.unlocked;
  }

  function resetGame(gameId) {
    const catalog = getCatalogForGame(gameId);
    if (catalog.length === 0) {
      return;
    }
    let changed = false;
    catalog.forEach(meta => {
      const entry = getAchievementState(gameId, meta.id);
      if (entry.unlocked || entry.unlockedAt) {
        entry.unlocked = false;
        entry.unlockedAt = null;
        changed = true;
      }
    });
    if (changed) {
      saveState(memoryState);
    }
  }

  function isUnlocked(gameId, achievementId) {
    const entry = getAchievementState(gameId, achievementId);
    return Boolean(entry.unlocked);
  }

  function getAllStates() {
    const states = [];
    Object.keys(CATALOG).forEach(gameId => {
      getCatalogForGame(gameId).forEach(meta => {
        const entry = getAchievementState(gameId, meta.id);
        states.push({
          gameId,
          id: meta.id,
          name: meta.name,
          description: meta.description,
          unlocked: Boolean(entry.unlocked),
          unlockedAt: entry.unlocked ? entry.unlockedAt : null,
        });
      });
    });
    return states;
  }

  function getCatalog() {
    const clone = {};
    Object.keys(CATALOG).forEach(gameId => {
      clone[gameId] = getCatalogForGame(gameId).map(item => ({ ...item }));
    });
    return clone;
  }

  function ensureToastStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = `
.achievement-toast-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 4vh 1rem 1rem;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
  z-index: 1000;
}

.achievement-toast-container.is-active {
  opacity: 1;
}

.achievement-toast {
  max-width: min(420px, 92vw);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(14, 116, 144, 0.92));
  color: #fff;
  padding: 1.1rem 1.35rem;
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.32);
  border: 1px solid rgba(191, 219, 254, 0.4);
  backdrop-filter: blur(12px);
}

.achievement-toast__eyebrow {
  margin: 0 0 0.35rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.9);
}

.achievement-toast__title {
  margin: 0 0 0.35rem;
  font-size: 1.4rem;
}

.achievement-toast__body {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.92);
}
`;
    document.head.appendChild(style);
  }

  function ensureToastContainer() {
    if (typeof document === 'undefined' || !document.body) {
      return null;
    }
    let container = document.getElementById('achievementToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'achievementToastContainer';
      container.className = 'achievement-toast-container';
      container.setAttribute('aria-live', 'assertive');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    ensureToastStyles();
    return container;
  }

  function enqueueToast(meta) {
    toastQueue.push(meta);
    if (domReady) {
      showNextToast();
    }
  }

  function showNextToast() {
    if (activeToastTimer || toastQueue.length === 0) {
      return;
    }
    const container = ensureToastContainer();
    if (!container) {
      return;
    }

    const achievement = toastQueue.shift();
    container.innerHTML = '';
    container.classList.add('is-active');

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

    activeToastTimer = global.setTimeout(() => {
      activeToastTimer = null;
      if (toastQueue.length === 0) {
        container.classList.remove('is-active');
        container.innerHTML = '';
      }
      showNextToast();
    }, TOAST_DURATION_MS);
  }

  global.gameAchievements = {
    getCatalog,
    getAllStates,
    isUnlocked,
    setStatus,
    resetGame,
  };
})(typeof window !== 'undefined' ? window : this);
