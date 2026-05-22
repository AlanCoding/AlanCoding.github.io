const COOKIE_NAME = 'castle_ledger_state_v1';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const DLC_KEYS = {
  battle: 'battle_of_mastings',
  harbor: 'harbor_of_delays',
};

export const DLC_PRICES = {
  [DLC_KEYS.battle]: 900,
  [DLC_KEYS.harbor]: 1100,
};

export const ALANBUCKS_BUNDLES = [500, 1200, 3000];

export function readCookie(name) {
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAgeSeconds};path=/;SameSite=Lax`;
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeInstall(rawInstall) {
  const next = {
    installed: false,
    startedAt: null,
    completedAt: null,
  };
  if (!rawInstall || typeof rawInstall !== 'object') {
    return next;
  }
  next.installed = Boolean(rawInstall.installed);
  next.startedAt = Number.isFinite(Number(rawInstall.startedAt)) ? Number(rawInstall.startedAt) : null;
  next.completedAt = Number.isFinite(Number(rawInstall.completedAt)) ? Number(rawInstall.completedAt) : null;
  return next;
}

function normalizeBattleState(rawBattle) {
  const next = {
    introSeen: false,
    location: null,
    visited: {},
    inventory: {},
    flags: {},
    log: [],
    resources: {
      readyArrows: 2400,
      reserveArrows: 1800,
      spentVolleys: 0,
      serviceableShields: 640,
      serviceableHauberks: 280,
      remountHorses: 190,
      pigs: 14,
      ducks: 33,
      cabbageLoads: 18,
    },
    outcome: null,
  };
  if (!rawBattle || typeof rawBattle !== 'object') {
    return next;
  }
  next.introSeen = Boolean(rawBattle.introSeen);
  next.location = typeof rawBattle.location === 'string' ? rawBattle.location : null;
  next.visited = rawBattle.visited && typeof rawBattle.visited === 'object' ? rawBattle.visited : {};
  next.inventory = rawBattle.inventory && typeof rawBattle.inventory === 'object' ? rawBattle.inventory : {};
  next.flags = rawBattle.flags && typeof rawBattle.flags === 'object' ? rawBattle.flags : {};
  next.log = Array.isArray(rawBattle.log) ? rawBattle.log.slice(-18).map(entry => String(entry)) : [];
  if (rawBattle.resources && typeof rawBattle.resources === 'object') {
    Object.keys(next.resources).forEach(key => {
      const value = Number(rawBattle.resources[key]);
      if (Number.isFinite(value)) {
        next.resources[key] = value;
      }
    });
  }
  next.outcome = rawBattle.outcome === 'attacker_victory' || rawBattle.outcome === 'defender_victory' ? rawBattle.outcome : null;
  return next;
}

function normalizeHarborState(rawHarbor) {
  const next = {
    introSeen: false,
    location: null,
    visited: {},
    inventory: {},
    flags: {},
    log: [],
    counters: {
      failedLaunches: 0,
      assurancesHeard: 0,
      furiousMeetings: 0,
    },
    outcome: null,
  };
  if (!rawHarbor || typeof rawHarbor !== 'object') {
    return next;
  }
  next.introSeen = Boolean(rawHarbor.introSeen);
  next.location = typeof rawHarbor.location === 'string' ? rawHarbor.location : null;
  next.visited = rawHarbor.visited && typeof rawHarbor.visited === 'object' ? rawHarbor.visited : {};
  next.inventory = rawHarbor.inventory && typeof rawHarbor.inventory === 'object' ? rawHarbor.inventory : {};
  next.flags = rawHarbor.flags && typeof rawHarbor.flags === 'object' ? rawHarbor.flags : {};
  next.log = Array.isArray(rawHarbor.log) ? rawHarbor.log.slice(-18).map(entry => String(entry)) : [];
  if (rawHarbor.counters && typeof rawHarbor.counters === 'object') {
    Object.keys(next.counters).forEach(key => {
      const value = Number(rawHarbor.counters[key]);
      if (Number.isFinite(value)) {
        next.counters[key] = value;
      }
    });
  }
  next.outcome = rawHarbor.outcome === 'launched' ? rawHarbor.outcome : null;
  return next;
}

export function loadSharedState() {
  let parsed = {};
  const cookieValue = readCookie(COOKIE_NAME);
  if (cookieValue) {
    try {
      parsed = JSON.parse(cookieValue) || {};
    } catch (error) {
      parsed = {};
    }
  }
  const next = clone(parsed);
  if (!next.meta || typeof next.meta !== 'object') {
    next.meta = {};
  }
  next.meta.alanbucks = Number.isFinite(Number(next.meta.alanbucks)) ? Number(next.meta.alanbucks) : 0;
  if (!next.dlc || typeof next.dlc !== 'object') {
    next.dlc = {};
  }
  if (!next.dlc.installs || typeof next.dlc.installs !== 'object') {
    next.dlc.installs = {};
  }
  next.dlc.installs[DLC_KEYS.battle] = normalizeInstall(next.dlc.installs[DLC_KEYS.battle]);
  next.dlc.installs[DLC_KEYS.harbor] = normalizeInstall(next.dlc.installs[DLC_KEYS.harbor]);
  next.dlc[DLC_KEYS.battle] = normalizeBattleState(next.dlc[DLC_KEYS.battle]);
  next.dlc[DLC_KEYS.harbor] = normalizeHarborState(next.dlc[DLC_KEYS.harbor]);
  return next;
}

export function saveSharedState(state) {
  writeCookie(COOKIE_NAME, JSON.stringify(state), COOKIE_MAX_AGE);
}

export function creditAlanbucks(state, amount) {
  state.meta.alanbucks += amount;
  saveSharedState(state);
}

export function getInstallProgress(state, dlcKey, now = Date.now()) {
  const install = state.dlc.installs[dlcKey];
  if (!install || install.installed) {
    return 1;
  }
  if (!install.startedAt) {
    return 0;
  }
  const duration = 15000;
  return Math.max(0, Math.min(1, (now - install.startedAt) / duration));
}

export function syncInstallCompletion(state, dlcKey, now = Date.now()) {
  const install = state.dlc.installs[dlcKey];
  if (!install || install.installed || !install.startedAt) {
    return false;
  }
  if (getInstallProgress(state, dlcKey, now) >= 1) {
    install.installed = true;
    install.completedAt = now;
    saveSharedState(state);
    return true;
  }
  return false;
}

export function beginInstall(state, dlcKey, now = Date.now()) {
  const install = state.dlc.installs[dlcKey];
  if (!install || install.installed || install.startedAt) {
    return false;
  }
  const price = DLC_PRICES[dlcKey];
  if (state.meta.alanbucks < price) {
    return false;
  }
  state.meta.alanbucks -= price;
  install.startedAt = now;
  install.completedAt = null;
  saveSharedState(state);
  return true;
}

export function isInstalled(state, dlcKey) {
  syncInstallCompletion(state, dlcKey);
  return Boolean(state.dlc.installs[dlcKey]?.installed);
}

export function appendBattleLog(state, message) {
  const log = state.dlc[DLC_KEYS.battle].log;
  log.push(message);
  state.dlc[DLC_KEYS.battle].log = log.slice(-18);
  saveSharedState(state);
}

export function appendHarborLog(state, message) {
  const log = state.dlc[DLC_KEYS.harbor].log;
  log.push(message);
  state.dlc[DLC_KEYS.harbor].log = log.slice(-18);
  saveSharedState(state);
}
