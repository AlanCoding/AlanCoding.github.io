export function setupUI(root, { onStart, onToggle }) {
  const startButton = root.querySelector('[data-action="start"]');
  const toggleButton = root.querySelector('[data-action="toggle"]');
  const fpsEl = root.querySelector('[data-stat="fps"]');
  const alphaEl = root.querySelector('[data-stat="alpha"]');
  const resEl = root.querySelector('[data-stat="resolution"]');

  let running = false;

  function setRunning(value) {
    running = value;
    toggleButton.textContent = running ? 'Pause' : 'Resume';
    toggleButton.setAttribute('aria-pressed', running ? 'true' : 'false');
  }

  function handleStart() {
    const started = onStart();
    if (started === false) {
      return;
    }
    startButton.disabled = true;
    startButton.setAttribute('aria-disabled', 'true');
    toggleButton.hidden = false;
    setRunning(true);
  }

  function handleToggle() {
    setRunning(!running);
    onToggle(running);
  }

  function handleKey(event) {
    if (event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
      if (startButton.disabled) {
        handleToggle();
      } else {
        handleStart();
      }
    }
  }

  startButton.addEventListener('click', handleStart);
  toggleButton.addEventListener('click', handleToggle);
  document.addEventListener('keydown', handleKey);

  return {
    updateStats({ fps, alpha, resolution }) {
      if (typeof fps === 'number') {
        fpsEl.textContent = fps.toFixed(0);
      }
      if (typeof alpha === 'number') {
        alphaEl.textContent = alpha.toFixed(2);
      }
      if (resolution) {
        resEl.textContent = `${resolution}×${resolution}`;
      }
    },
    setRunning,
    teardown() {
      startButton.removeEventListener('click', handleStart);
      toggleButton.removeEventListener('click', handleToggle);
      document.removeEventListener('keydown', handleKey);
    }
  };
}
