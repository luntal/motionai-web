import { createNavigationUI, onChapterChange, onLevelChange, clearHoverDescription, setLevelActive, setActiveLevel } from './ui.js';
import { startTracking, onLandmarksUpdate, onPoseUpdate, setStabilizationEnabled, setLandmarkDrawingEnabled, onCanvasResize } from './tracking.js';
import { LevelManager } from './levels.js';
import { getLevelCountForChapter } from './constants.js';

function createTrackingControls(trackingController) {
  const container = document.createElement('div');
  container.className = 'tracking-controls-overlay';

  const visibilityToggle = document.createElement('button');
  visibilityToggle.type = 'button';
  visibilityToggle.className = 'setup-menu-toggle';
  let setupMenuVisible = false;

  function updateToggleLabel() {
    visibilityToggle.textContent = setupMenuVisible ? 'Hide Setup' : 'Show Setup';
    visibilityToggle.setAttribute('aria-pressed', String(setupMenuVisible));
  }

  const modelLabel = document.createElement('label');
  modelLabel.textContent = 'Model';
  modelLabel.className = 'tracking-controls-label';

  const modelSelect = document.createElement('select');
  modelSelect.className = 'tracking-controls-select';
  modelSelect.innerHTML = `
    <option value="hands">Hands</option>
    <option value="pose">Pose</option>
  `;

  const cameraLabel = document.createElement('label');
  cameraLabel.textContent = 'Camera';
  cameraLabel.className = 'tracking-controls-label';

  const cameraSelect = document.createElement('select');
  cameraSelect.className = 'tracking-controls-select';

  const calibrationSetLabel = document.createElement('label');
  calibrationSetLabel.textContent = 'Calibration Sets';
  calibrationSetLabel.className = 'tracking-controls-label';

  const calibrationSetSelect = document.createElement('select');
  calibrationSetSelect.className = 'tracking-controls-select';
  calibrationSetSelect.disabled = true;

  const calibrationStrictnessLabel = document.createElement('label');
  calibrationStrictnessLabel.textContent = 'Calibration Strictness';
  calibrationStrictnessLabel.className = 'tracking-controls-label';

  const calibrationStrictnessSlider = document.createElement('input');
  calibrationStrictnessSlider.type = 'range';
  calibrationStrictnessSlider.min = '20';
  calibrationStrictnessSlider.max = '100';
  calibrationStrictnessSlider.step = '5';
  calibrationStrictnessSlider.value = '60';
  calibrationStrictnessSlider.className = 'tracking-controls-range';

  const calibrationStrictnessValue = document.createElement('div');
  calibrationStrictnessValue.className = 'tracking-controls-inline-value';
  calibrationStrictnessValue.textContent = '60%';

  const stabilizationButton = document.createElement('button');
  stabilizationButton.type = 'button';
  stabilizationButton.className = 'tracking-controls-button';
  let stabilizationEnabled = false;

  const landmarkDrawingButton = document.createElement('button');
  landmarkDrawingButton.type = 'button';
  landmarkDrawingButton.className = 'tracking-controls-button';
  let landmarkDrawingVisible = true;

  const modeLabel = document.createElement('div');
  modeLabel.textContent = 'Playback';
  modeLabel.className = 'tracking-controls-label';

  const modeGroup = document.createElement('div');
  modeGroup.className = 'tracking-controls-radio-group';

  const playbackModes = ['one', 'repeat', 'autoplay'];
  let selectedPlaybackMode = 'one';
  let selectedCalibrationSetIndex = null;
  let calibrationSetChangeHandler = null;
  let calibrationStrictnessChangeHandler = null;

  function createModeOption(mode) {
    const label = document.createElement('label');
    label.className = 'tracking-controls-radio-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'level-playback-mode';
    input.value = mode;
    input.checked = mode === selectedPlaybackMode;

    input.addEventListener('change', () => {
      if (input.checked) {
        selectedPlaybackMode = mode;
      }
    });

    const text = document.createElement('span');
    text.textContent = mode;

    label.appendChild(input);
    label.appendChild(text);
    modeGroup.appendChild(label);
  }

  playbackModes.forEach((mode) => createModeOption(mode));

  function formatCalibrationSetOption(entry, index) {
    if (!entry || !entry.timestamp) {
      return `Set ${index + 1}`;
    }

    const formattedDate = new Date(entry.timestamp).toLocaleString();
    const baseName = entry.name || 'callibration_date';
    return `${baseName} - ${formattedDate}`;
  }

  function setCalibrationPoseSets(poseSets = []) {
    const currentValue = calibrationSetSelect.value;
    calibrationSetSelect.innerHTML = '';

    if (!Array.isArray(poseSets) || poseSets.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No saved calibration yet';
      calibrationSetSelect.appendChild(option);
      calibrationSetSelect.disabled = true;
      selectedCalibrationSetIndex = null;
      if (calibrationSetChangeHandler) {
        calibrationSetChangeHandler(null);
      }
      return;
    }

    calibrationSetSelect.disabled = false;
    poseSets.forEach((entry, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = formatCalibrationSetOption(entry, index);
      calibrationSetSelect.appendChild(option);
    });

    const parsedCurrent = Number(currentValue);
    const hasCurrent = Number.isInteger(parsedCurrent) && parsedCurrent >= 0 && parsedCurrent < poseSets.length;
    selectedCalibrationSetIndex = hasCurrent ? parsedCurrent : poseSets.length - 1;
    calibrationSetSelect.value = String(selectedCalibrationSetIndex);
    if (calibrationSetChangeHandler) {
      calibrationSetChangeHandler(selectedCalibrationSetIndex);
    }
  }

  function setCalibrationSetChangeHandler(handler) {
    calibrationSetChangeHandler = typeof handler === 'function' ? handler : null;
    if (calibrationSetChangeHandler) {
      calibrationSetChangeHandler(selectedCalibrationSetIndex);
    }
  }

  function setCalibrationStrictness(value) {
    const next = Number(value);
    const safe = Number.isFinite(next) ? Math.max(20, Math.min(100, next)) : 60;
    calibrationStrictnessSlider.value = String(safe);
    calibrationStrictnessValue.textContent = `${Math.round(safe)}%`;
  }

  function setCalibrationStrictnessChangeHandler(handler) {
    calibrationStrictnessChangeHandler = typeof handler === 'function' ? handler : null;
    if (calibrationStrictnessChangeHandler) {
      calibrationStrictnessChangeHandler(Number(calibrationStrictnessSlider.value));
    }
  }

  function updateStabilizationLabel() {
    stabilizationButton.textContent = stabilizationEnabled ? 'Stabilization: ON' : 'Stabilization: OFF';
    stabilizationButton.setAttribute('aria-pressed', String(stabilizationEnabled));
  }

  function updateLandmarkDrawingLabel() {
    landmarkDrawingButton.textContent = landmarkDrawingVisible ? 'Landmarks: ON' : 'Landmarks: OFF';
    landmarkDrawingButton.setAttribute('aria-pressed', String(landmarkDrawingVisible));
  }

  async function refreshCameraList() {
    const cameras = await trackingController.listAvailableCameras();
    const activeDeviceId = trackingController.getCurrentDeviceId();

    cameraSelect.innerHTML = '';

    if (cameras.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No camera detected';
      cameraSelect.appendChild(option);
      cameraSelect.disabled = true;
      return;
    }

    cameraSelect.disabled = false;
    cameras.forEach((camera, index) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.textContent = camera.label || `Camera ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    const hasActiveCamera = cameras.some((camera) => camera.deviceId === activeDeviceId);
    if (hasActiveCamera) {
      cameraSelect.value = activeDeviceId;
    } else if (cameras[0]) {
      cameraSelect.value = cameras[0].deviceId;
      await trackingController.setCamera(cameras[0].deviceId);
    }
  }

  modelSelect.value = trackingController.getCurrentModel();

  modelSelect.addEventListener('change', async () => {
    modelSelect.disabled = true;
    await trackingController.setModel(modelSelect.value);
    modelSelect.value = trackingController.getCurrentModel();
    modelSelect.disabled = false;
  });

  cameraSelect.addEventListener('change', async () => {
    if (!cameraSelect.value) {
      return;
    }

    cameraSelect.disabled = true;
    await trackingController.setCamera(cameraSelect.value);
    cameraSelect.disabled = false;
  });

  calibrationSetSelect.addEventListener('change', () => {
    const value = Number(calibrationSetSelect.value);
    selectedCalibrationSetIndex = Number.isInteger(value) ? value : null;
    if (calibrationSetChangeHandler) {
      calibrationSetChangeHandler(selectedCalibrationSetIndex);
    }
  });

  calibrationStrictnessSlider.addEventListener('input', () => {
    const value = Number(calibrationStrictnessSlider.value);
    setCalibrationStrictness(value);
    if (calibrationStrictnessChangeHandler) {
      calibrationStrictnessChangeHandler(value);
    }
  });

  stabilizationButton.addEventListener('click', () => {
    stabilizationEnabled = !stabilizationEnabled;
    setStabilizationEnabled(stabilizationEnabled);
    updateStabilizationLabel();
  });

  landmarkDrawingButton.addEventListener('click', () => {
    landmarkDrawingVisible = !landmarkDrawingVisible;
    setLandmarkDrawingEnabled(landmarkDrawingVisible);
    updateLandmarkDrawingLabel();
  });

  trackingController.onModelChange((modelName) => {
    modelSelect.value = modelName;
  });

  trackingController.onCameraChange((deviceId) => {
    if (deviceId) {
      cameraSelect.value = deviceId;
    }
  });

  setStabilizationEnabled(stabilizationEnabled);
  setLandmarkDrawingEnabled(landmarkDrawingVisible);
  updateStabilizationLabel();
  updateLandmarkDrawingLabel();
  updateToggleLabel();

  visibilityToggle.addEventListener('click', () => {
    setupMenuVisible = !setupMenuVisible;
    container.classList.toggle('collapsed', !setupMenuVisible);
    updateToggleLabel();
  });

  container.appendChild(modelLabel);
  container.appendChild(modelSelect);
  container.appendChild(cameraLabel);
  container.appendChild(cameraSelect);
  container.appendChild(calibrationSetLabel);
  container.appendChild(calibrationSetSelect);
  container.appendChild(calibrationStrictnessLabel);
  container.appendChild(calibrationStrictnessSlider);
  container.appendChild(calibrationStrictnessValue);
  container.appendChild(modeLabel);
  container.appendChild(modeGroup);
  container.appendChild(stabilizationButton);
  container.appendChild(landmarkDrawingButton);
  container.appendChild(visibilityToggle);
  document.body.appendChild(container);
  container.classList.add('collapsed');
  updateToggleLabel();

  refreshCameraList();

  return {
    getPlaybackMode: () => selectedPlaybackMode,
    setCalibrationPoseSets,
    setCalibrationSetChangeHandler,
    setCalibrationStrictness,
    setCalibrationStrictnessChangeHandler
  };
}

export function initApp() {
  const videoElement = document.getElementById('video');
  const canvasElement = document.getElementById('canvas');

  createNavigationUI();
  const trackingController = startTracking(videoElement, canvasElement, { initialModel: 'pose' });
  const controls = createTrackingControls(trackingController);

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
  controls.setCalibrationPoseSets(levelManager.getCalibrationPoseSets());
  controls.setCalibrationSetChangeHandler((index) => {
    levelManager.setSelectedCalibrationPoseSet(index);
  });
  controls.setCalibrationStrictness(levelManager.getCalibrationComparisonStrictness());
  controls.setCalibrationStrictnessChangeHandler((value) => {
    levelManager.setCalibrationComparisonStrictness(value);
  });
  levelManager.onCalibrationPoseSetsChange((poseSets) => {
    controls.setCalibrationPoseSets(poseSets);
  });

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

    const playbackMode = controls.getPlaybackMode();

    if (playbackMode === 'repeat') {
      setActiveLevel(level);
      return;
    }

    if (playbackMode === 'autoplay') {
      const nextLevel = level + 1;
      if (nextLevel < getLevelCountForChapter(chapter)) {
        setActiveLevel(nextLevel);
      } else {
        setActiveLevel(null);
      }
      return;
    }

    setActiveLevel(null);
  });

  onLandmarksUpdate((hands) => levelManager.updateHands(hands));
  onPoseUpdate((poseLandmarks) => levelManager.updatePose(poseLandmarks));
}
