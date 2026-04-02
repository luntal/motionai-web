import { createNavigationUI, onChapterChange, onLevelChange, clearHoverDescription, setLevelActive } from './ui.js';
import { startTracking, onLandmarksUpdate, setStabilizationEnabled, onCanvasResize } from './tracking.js';
import { LevelManager } from './levels.js';

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

  const levelCanvas = document.createElement('canvas');
  levelCanvas.className = 'level-overlay';
  levelCanvas.style.pointerEvents = 'none';
  levelCanvas.style.position = 'absolute';
  levelCanvas.style.left = '0';
  levelCanvas.style.top = '0';
  levelCanvas.style.width = '100%';
  levelCanvas.style.height = '100%';
  document.body.appendChild(levelCanvas);

  const levelManager = new LevelManager(levelCanvas);

  function resizeOverlays() {
    const rect = canvasElement.getBoundingClientRect();
    levelCanvas.width = canvasElement.width;
    levelCanvas.height = canvasElement.height;
    levelCanvas.style.left = `${rect.left}px`;
    levelCanvas.style.top = `${rect.top}px`;
    levelCanvas.style.width = `${rect.width}px`;
    levelCanvas.style.height = `${rect.height}px`;
    levelManager.resize(canvasElement.width, canvasElement.height);
  }

  window.addEventListener('resize', resizeOverlays);

  onCanvasResize((width, height) => {
    const rect = canvasElement.getBoundingClientRect();
    levelCanvas.width = width;
    levelCanvas.height = height;
    levelCanvas.style.left = `${rect.left}px`;
    levelCanvas.style.top = `${rect.top}px`;
    levelCanvas.style.width = `${rect.width}px`;
    levelCanvas.style.height = `${rect.height}px`;
    levelManager.resize(width, height);
  });

  resizeOverlays();

  onChapterChange((chapter) => levelManager.setChapter(chapter));
  onLevelChange((level) => {
    levelManager.setLevel(level);
    if (level !== null) {
      setLevelActive(true);
      clearHoverDescription();
    } else {
      setLevelActive(false);
    }
  });

  levelManager.setCompletionCallback((chapter, level) => {
    setLevelActive(false);
    console.log(`Chapter ${chapter + 1} level ${level + 1} completed!`);
  });

  onLandmarksUpdate((hands) => levelManager.updateHands(hands));

  startTracking(videoElement, canvasElement);
}
