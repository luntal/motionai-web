import { createNavigationUI } from './ui.js';
import { startTracking, setStabilizationEnabled } from './tracking.js';

function createStabilizationToggle() {
  const container = document.createElement('div');
  container.className = 'toggle-overlay';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'toggle-overlay-button';
  let enabled = true;

  function updateLabel() {
    button.textContent = enabled ? 'Stabilization: ON' : 'Stabilization: OFF';
    button.setAttribute('aria-pressed', String(enabled));
  }

  button.addEventListener('click', () => {
    enabled = !enabled;
    setStabilizationEnabled(enabled);
    updateLabel();
  });

  updateLabel();
  container.appendChild(button);
  document.body.appendChild(container);
}

export function initApp() {
  const videoElement = document.getElementById('video');
  const canvasElement = document.getElementById('canvas');

  createNavigationUI();
  createStabilizationToggle();
  startTracking(videoElement, canvasElement);
}
