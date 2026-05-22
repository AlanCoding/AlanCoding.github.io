import {
  ALANBUCKS_BUNDLES,
  DLC_KEYS,
  DLC_PRICES,
  beginInstall,
  creditAlanbucks,
  getInstallProgress,
  isInstalled,
  loadSharedState,
  saveSharedState,
  syncInstallCompletion,
} from './shared-state.js?v=2';

function formatAlanbucks(amount) {
  return `${amount.toLocaleString()} alanbucks`;
}

function syncStatusText(state, dlcKey, statusEl) {
  syncInstallCompletion(state, dlcKey);
  const install = state.dlc.installs[dlcKey];
  if (install.installed) {
    statusEl.textContent = 'Installed.';
    return;
  }
  if (install.startedAt) {
    statusEl.textContent = `Installing… ${Math.round(getInstallProgress(state, dlcKey) * 100)}%`;
    return;
  }
  statusEl.textContent = `Price: ${formatAlanbucks(DLC_PRICES[dlcKey])}`;
}

function renderHubPage() {
  const balance = document.getElementById('alanbucksBalance');
  const battleStatus = document.getElementById('battleStatus');
  const harborStatus = document.getElementById('harborStatus');
  if (!balance || !battleStatus || !harborStatus) {
    return false;
  }
  const state = loadSharedState();
  syncInstallCompletion(state, DLC_KEYS.battle);
  syncInstallCompletion(state, DLC_KEYS.harbor);
  balance.textContent = formatAlanbucks(state.meta.alanbucks);
  syncStatusText(state, DLC_KEYS.battle, battleStatus);
  syncStatusText(state, DLC_KEYS.harbor, harborStatus);
  return true;
}

function renderCheckoutPage() {
  const form = document.getElementById('alanbucksCheckout');
  if (!form) {
    return false;
  }
  const bundleSelect = document.getElementById('alanbucksBundle');
  const balance = document.getElementById('alanbucksBalance');
  const message = document.getElementById('checkoutMessage');
  const state = loadSharedState();
  balance.textContent = formatAlanbucks(state.meta.alanbucks);

  ALANBUCKS_BUNDLES.forEach(amount => {
    const option = document.createElement('option');
    option.value = String(amount);
    option.textContent = formatAlanbucks(amount);
    bundleSelect.appendChild(option);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(bundleSelect.value || ALANBUCKS_BUNDLES[0]);
    const next = loadSharedState();
    creditAlanbucks(next, amount);
    balance.textContent = formatAlanbucks(next.meta.alanbucks);
    message.textContent = `${formatAlanbucks(amount)} were credited locally to your ledger. Processing succeeded with unusual confidence.`;
    form.reset();
    bundleSelect.value = String(ALANBUCKS_BUNDLES[0]);
  });
  bundleSelect.value = String(ALANBUCKS_BUNDLES[0]);
  return true;
}

function wireInstallPage(dlcKey) {
  const installButton = document.getElementById('installButton');
  if (!installButton) {
    return false;
  }
  const balance = document.getElementById('alanbucksBalance');
  const status = document.getElementById('installStatus');
  const playLink = document.getElementById('playLink');
  const addFundsLink = document.getElementById('addFundsLink');

  function render() {
    const state = loadSharedState();
    syncInstallCompletion(state, dlcKey);
    balance.textContent = formatAlanbucks(state.meta.alanbucks);
    const install = state.dlc.installs[dlcKey];
    if (install.installed) {
      status.textContent = 'Installed and ready.';
      installButton.disabled = true;
      installButton.textContent = 'Installed';
      playLink.hidden = false;
      addFundsLink.hidden = true;
      return;
    }
    if (install.startedAt) {
      const percent = Math.round(getInstallProgress(state, dlcKey) * 100);
      status.textContent = `Installing… ${percent}%`;
      installButton.disabled = true;
      installButton.textContent = 'Installing…';
      playLink.hidden = true;
      addFundsLink.hidden = true;
      window.setTimeout(render, 500);
      return;
    }
    const price = DLC_PRICES[dlcKey];
    status.textContent = `Price: ${formatAlanbucks(price)}`;
    const canAfford = state.meta.alanbucks >= price;
    installButton.disabled = false;
    installButton.textContent = 'Install DLC';
    playLink.hidden = true;
    addFundsLink.hidden = canAfford;
  }

  installButton.addEventListener('click', () => {
    const state = loadSharedState();
    const price = DLC_PRICES[dlcKey];
    if (state.meta.alanbucks < price) {
      status.textContent = `You need ${formatAlanbucks(price)} to install this DLC, and you currently have ${formatAlanbucks(state.meta.alanbucks)}.`;
      addFundsLink.hidden = false;
      return;
    }
    if (beginInstall(state, dlcKey)) {
      status.textContent = 'Installing… 0%';
      render();
    }
  });

  render();
  return true;
}

function initStorePage() {
  if (renderCheckoutPage()) {
    return;
  }
  const explicitDlcKey = document.querySelector('[data-dlc-key]')?.getAttribute('data-dlc-key');
  if (explicitDlcKey === DLC_KEYS.battle || explicitDlcKey === DLC_KEYS.harbor) {
    wireInstallPage(explicitDlcKey);
    return;
  }
  renderHubPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStorePage);
} else {
  initStorePage();
}
