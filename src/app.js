import { createNavigationUI, onChapterChange, onLevelChange, clearHoverDescription, setLevelActive, setActiveLevel } from './ui.js';
import { startTracking, onLandmarksUpdate, onPoseUpdate, setStabilizationEnabled, setLandmarkDrawingEnabled, onCanvasResize } from './tracking.js';
import { LevelManager } from './levels.js';
import { getLevelCountForChapter } from './constants.js';

function createTrackingControls(trackingController) {
  const settingsSection = document.createElement('div');
  settingsSection.className = 'settings-navigation';

  const visibilityToggle = document.createElement('button');
  visibilityToggle.type = 'button';
  visibilityToggle.className = 'setup-menu-toggle';

  const gearIcon = document.createElement('span');
  gearIcon.className = 'setup-menu-toggle-icon';
  gearIcon.textContent = '⚙';
  visibilityToggle.appendChild(gearIcon);

  visibilityToggle.setAttribute('aria-label', 'Einstellungen');
  visibilityToggle.title = 'Einstellungen';
  let setupMenuVisible = false;

  function updateToggleLabel() {
    visibilityToggle.setAttribute('aria-pressed', String(setupMenuVisible));
    visibilityToggle.classList.toggle('active', setupMenuVisible);
  }

  function setSettingsVisible(nextVisible) {
    setupMenuVisible = nextVisible;
    container.classList.toggle('collapsed', !setupMenuVisible);
    updateToggleLabel();
  }

  const container = document.createElement('div');
  container.className = 'tracking-controls-overlay settings-panel collapsed';

  const settingsHeader = document.createElement('div');
  settingsHeader.className = 'settings-panel-header';

  const settingsTitle = document.createElement('div');
  settingsTitle.className = 'settings-section-title';
  settingsTitle.textContent = 'Einstellungen';

  const settingsCloseButton = document.createElement('button');
  settingsCloseButton.type = 'button';
  settingsCloseButton.className = 'settings-close-button';

  const closeIcon = document.createElement('span');
  closeIcon.className = 'settings-close-icon';
  closeIcon.textContent = '×';
  settingsCloseButton.appendChild(closeIcon);

  settingsCloseButton.setAttribute('aria-label', 'Einstellungen schließen');

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

  const cameraToggleButton = document.createElement('button');
  cameraToggleButton.type = 'button';
  cameraToggleButton.className = 'tracking-controls-button';
  let cameraEnabled = true;

  function updateCameraToggleLabel() {
    cameraToggleButton.textContent = cameraEnabled ? 'Camera: ON' : 'Camera: OFF';
    cameraToggleButton.setAttribute('aria-pressed', String(cameraEnabled));
  }

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

  const poseWarningLandmarksButton = document.createElement('button');
  poseWarningLandmarksButton.type = 'button';
  poseWarningLandmarksButton.className = 'tracking-controls-button';
  let poseWarningLandmarksVisible = false;
  let levelManagerRef = null;

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

  function updatePoseWarningLandmarksLabel() {
    poseWarningLandmarksButton.textContent = poseWarningLandmarksVisible ? 'Pose Warning Landmarks: ON' : 'Pose Warning Landmarks: OFF';
    poseWarningLandmarksButton.setAttribute('aria-pressed', String(poseWarningLandmarksVisible));
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
    cameraEnabled = true;
    await trackingController.setCamera(cameraSelect.value);
    cameraSelect.disabled = false;
    updateCameraToggleLabel();
  });

  cameraToggleButton.addEventListener('click', async () => {
    cameraEnabled = !cameraEnabled;

    if (cameraEnabled) {
      cameraSelect.disabled = true;
      await trackingController.setCamera(cameraSelect.value || null);
      cameraSelect.disabled = false;
    } else {
      trackingController.setCameraEnabled(false);
    }

    updateCameraToggleLabel();
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

  poseWarningLandmarksButton.addEventListener('click', () => {
    poseWarningLandmarksVisible = !poseWarningLandmarksVisible;
    if (levelManagerRef) {
      levelManagerRef.setPoseWarningLandmarksEnabled(poseWarningLandmarksVisible);
    }
    updatePoseWarningLandmarksLabel();
  });

  trackingController.onModelChange((modelName) => {
    modelSelect.value = modelName;
  });

  trackingController.onCameraChange((deviceId) => {
    cameraEnabled = Boolean(deviceId);
    if (deviceId) {
      cameraSelect.value = deviceId;
    }
    updateCameraToggleLabel();
  });

  setStabilizationEnabled(stabilizationEnabled);
  setLandmarkDrawingEnabled(landmarkDrawingVisible);
  if (levelManagerRef) {
    levelManagerRef.setPoseWarningLandmarksEnabled(poseWarningLandmarksVisible);
  }
  updateStabilizationLabel();
  updateLandmarkDrawingLabel();
  updatePoseWarningLandmarksLabel();
  updateCameraToggleLabel();
  updateToggleLabel();

  visibilityToggle.addEventListener('click', () => {
    setSettingsVisible(!setupMenuVisible);
  });

  settingsCloseButton.addEventListener('click', () => {
    setSettingsVisible(false);
  });

  settingsHeader.appendChild(settingsTitle);
  settingsHeader.appendChild(settingsCloseButton);
  container.appendChild(settingsHeader);
  container.appendChild(modelLabel);
  container.appendChild(modelSelect);
  container.appendChild(cameraLabel);
  container.appendChild(cameraSelect);
  container.appendChild(cameraToggleButton);
  container.appendChild(calibrationSetLabel);
  container.appendChild(calibrationSetSelect);
  container.appendChild(calibrationStrictnessLabel);
  container.appendChild(calibrationStrictnessSlider);
  container.appendChild(calibrationStrictnessValue);
  container.appendChild(modeLabel);
  container.appendChild(modeGroup);
  container.appendChild(stabilizationButton);
  container.appendChild(landmarkDrawingButton);
  container.appendChild(poseWarningLandmarksButton);

  settingsSection.appendChild(container);

  const sidebar = document.querySelector('.left-navigation');
  const headerActions = document.querySelector('.nav-header-actions');

  if (headerActions) {
    headerActions.appendChild(visibilityToggle);
  } else if (sidebar) {
    sidebar.appendChild(visibilityToggle);
  }

  if (sidebar) {
    sidebar.appendChild(settingsSection);
  } else {
    document.body.appendChild(settingsSection);
  }

  container.classList.add('collapsed');
  updateToggleLabel();

  refreshCameraList();

  return {
    getPlaybackMode: () => selectedPlaybackMode,
    setCalibrationPoseSets,
    setCalibrationSetChangeHandler,
    setCalibrationStrictness,
    setCalibrationStrictnessChangeHandler,
    setLevelManager: (manager) => {
      levelManagerRef = manager;
      if (levelManagerRef) {
        levelManagerRef.setPoseWarningLandmarksEnabled(poseWarningLandmarksVisible);
      }
    }
  };
}

export function initApp() {
  const videoElement = document.getElementById('video');
  const canvasElement = document.getElementById('canvas');

  createNavigationUI();

  const stageShell = document.createElement('div');
  stageShell.className = 'video-stage-shell';
  canvasElement.parentNode.insertBefore(stageShell, canvasElement);

  const stageFrame = document.createElement('div');
  stageFrame.className = 'video-stage-frame';
  stageShell.appendChild(stageFrame);
  stageFrame.appendChild(canvasElement);

  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'video-loading-overlay';
  loadingOverlay.innerHTML = `
    <div class="video-loading-title">Video lädt...</div>
    <div class="video-loading-subtitle">Bitte kurz warten...</div>
  `;
  stageFrame.appendChild(loadingOverlay);

  let hasReceivedInitialLandmarks = false;

  function updateLoadingOverlay() {
    const streamReady = Boolean(videoElement.srcObject) && videoElement.readyState >= 2;
    const shouldShow = !streamReady || !hasReceivedInitialLandmarks;
    loadingOverlay.style.display = shouldShow ? 'flex' : 'none';
  }

  onPoseUpdate((poseLandmarks) => {
    if (Array.isArray(poseLandmarks) && poseLandmarks.length > 0) {
      hasReceivedInitialLandmarks = true;
      updateLoadingOverlay();
    }
  });

  onLandmarksUpdate((hands) => {
    if (Array.isArray(hands) && hands.length > 0) {
      hasReceivedInitialLandmarks = true;
      updateLoadingOverlay();
    }
  });

  videoElement.addEventListener('loadeddata', updateLoadingOverlay);
  videoElement.addEventListener('canplay', updateLoadingOverlay);
  videoElement.addEventListener('playing', updateLoadingOverlay);
  updateLoadingOverlay();

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
  stageFrame.appendChild(levelCanvas);

  const levelManager = new LevelManager(levelCanvas);
  controls.setLevelManager(levelManager);
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
    levelCanvas.width = canvasElement.width;
    levelCanvas.height = canvasElement.height;
    levelManager.resize(canvasElement.width, canvasElement.height);
  }

  window.addEventListener('resize', resizeOverlays);

  onCanvasResize((width, height) => {
    levelCanvas.width = width;
    levelCanvas.height = height;
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
