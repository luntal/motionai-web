import {
  createNavigationUI,
  onChapterChange,
  onLevelChange,
  clearHoverDescription,
  setLevelActive,
  setActiveLevel,
  uiState
} from './ui.js';
import { startTracking, onLandmarksUpdate, onPoseUpdate, setStabilizationEnabled, setLandmarkDrawingEnabled, onCanvasResize } from './tracking.js';
import { LevelManager } from './levels.js';
import { getLevelCountForChapter } from './constants.js';

function createFigureModePanel(initialManager) {
  const figureSettingsStorageKey = 'motionai.figure-panel-settings';
  let storedFigureSettings = {};
  try {
    const stored = localStorage.getItem(figureSettingsStorageKey);
    storedFigureSettings = stored ? JSON.parse(stored) : {};
  } catch (error) {
    storedFigureSettings = {};
  }

  const panel = document.createElement('aside');
  panel.className = 'figure-side-panel hidden';

  const title = document.createElement('div');
  title.className = 'figure-side-panel-title';
  title.textContent = 'Grundfigur';

  const radioGroup = document.createElement('div');
  radioGroup.className = 'figure-mode-group';

  const sideGroup = document.createElement('div');
  sideGroup.className = 'figure-side-group';

  const radioDivider = document.createElement('div');
  radioDivider.className = 'figure-radio-divider';

  const sizeWrap = document.createElement('div');
  sizeWrap.className = 'figure-size-wrap';

  const sizeLabel = document.createElement('div');
  sizeLabel.className = 'figure-size-label';
  sizeLabel.textContent = 'Größe';

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '0.2';
  sizeSlider.max = '1.0';
  sizeSlider.step = '0.01';
  sizeSlider.value = String(storedFigureSettings.figureScale ?? initialManager?.figureScale ?? 1 / 3);

  const sizeValue = document.createElement('div');
  sizeValue.className = 'figure-size-value';
  sizeValue.textContent = `${Number(sizeSlider.value).toFixed(2)}x`;

  sizeSlider.addEventListener('input', () => {
    const next = Number(sizeSlider.value);
    sizeValue.textContent = `${next.toFixed(2)}x`;
    if (managerRef) {
      managerRef.setFigureScale(next);
    }
    persistFigureSettings();
  });

  const strokeWrap = document.createElement('div');
  strokeWrap.className = 'figure-size-wrap';

  const strokeLabel = document.createElement('div');
  strokeLabel.className = 'figure-size-label';
  strokeLabel.textContent = 'Stroke';

  const offsetWrap = document.createElement('div');
  offsetWrap.className = 'figure-size-wrap';

  const offsetLabel = document.createElement('div');
  offsetLabel.className = 'figure-size-label';
  offsetLabel.textContent = 'Offset';

  const offsetSlider = document.createElement('input');
  offsetSlider.type = 'range';
  offsetSlider.min = '50';
  offsetSlider.max = '300';
  offsetSlider.step = '5';
  offsetSlider.value = String(storedFigureSettings.figureHorizontalOffset ?? initialManager?.figureHorizontalOffset ?? 50);

  const offsetValue = document.createElement('div');
  offsetValue.className = 'figure-size-value';
  offsetValue.textContent = `${Number(offsetSlider.value).toFixed(0)}px`;

  offsetSlider.addEventListener('input', () => {
    const next = Number(offsetSlider.value);
    offsetValue.textContent = `${next.toFixed(0)}px`;
    if (managerRef) {
      managerRef.setFigureHorizontalOffset(next);
    }
    persistFigureSettings();
  });

  const yWrap = document.createElement('div');
  yWrap.className = 'figure-size-wrap';

  const yLabel = document.createElement('div');
  yLabel.className = 'figure-size-label';
  yLabel.textContent = 'Y';

  const ySlider = document.createElement('input');
  ySlider.type = 'range';
  ySlider.min = '-300';
  ySlider.max = '300';
  ySlider.step = '5';
  ySlider.value = String(storedFigureSettings.figureYPosition ?? initialManager?.figureYPosition ?? 0);

  const yValue = document.createElement('div');
  yValue.className = 'figure-size-value';
  yValue.textContent = `${Number(ySlider.value).toFixed(0)}px`;

  ySlider.addEventListener('input', () => {
    const next = Number(ySlider.value);
    yValue.textContent = `${next.toFixed(0)}px`;
    if (managerRef) {
      managerRef.setFigureYPosition(next);
    }
    persistFigureSettings();
  });

  const tempoWrap = document.createElement('div');
  tempoWrap.className = 'figure-size-wrap';

  const tempoLabel = document.createElement('div');
  tempoLabel.className = 'figure-size-label';
  tempoLabel.textContent = 'BPM';

  const tempoSlider = document.createElement('input');
  tempoSlider.type = 'range';
  tempoSlider.min = '30';
  tempoSlider.max = '120';
  tempoSlider.step = '1';
  tempoSlider.value = String(storedFigureSettings.figureTempoBpm ?? initialManager?.figureTempoBpm ?? 60);

  const tempoValue = document.createElement('div');
  tempoValue.className = 'figure-size-value';
  tempoValue.textContent = `${Number(tempoSlider.value).toFixed(0)} bpm`;

  tempoSlider.addEventListener('input', () => {
    const next = Number(tempoSlider.value);
    tempoValue.textContent = `${next.toFixed(0)} bpm`;
    if (managerRef) {
      managerRef.setFigureTempoBpm(next);
    }
    persistFigureSettings();
  });

  const hardLinearityWrap = document.createElement('div');
  hardLinearityWrap.className = 'figure-size-wrap';

  const hardLinearityLabel = document.createElement('div');
  hardLinearityLabel.className = 'figure-size-label';
  hardLinearityLabel.textContent = 'Linearität';

  const hardLinearitySlider = document.createElement('input');
  hardLinearitySlider.type = 'range';
  hardLinearitySlider.min = '0';
  hardLinearitySlider.max = '100';
  hardLinearitySlider.step = '1';
  hardLinearitySlider.value = String(storedFigureSettings.figureHardLinearity ?? initialManager?.figureHardLinearity ?? 10);

  const hardLinearityValue = document.createElement('div');
  hardLinearityValue.className = 'figure-size-value';
  hardLinearityValue.textContent = `${Number(hardLinearitySlider.value).toFixed(0)}%`;

  hardLinearitySlider.addEventListener('input', () => {
    const next = Number(hardLinearitySlider.value);
    hardLinearityValue.textContent = `${next.toFixed(0)}%`;
    if (managerRef) {
      managerRef.setFigureHardLinearity(next);
    }
    persistFigureSettings();
  });

  const softTransitionWrap = document.createElement('div');
  softTransitionWrap.className = 'figure-size-wrap';

  const softTransitionLabel = document.createElement('div');
  softTransitionLabel.className = 'figure-size-label';
  softTransitionLabel.textContent = 'Übergangslänge';

  const softTransitionSlider = document.createElement('input');
  softTransitionSlider.type = 'range';
  softTransitionSlider.min = '0';
  softTransitionSlider.max = '50';
  softTransitionSlider.step = '1';
  softTransitionSlider.value = String(storedFigureSettings.figureSoftTransitionPercent ?? initialManager?.figureSoftTransitionPercent ?? 0);

  const softTransitionValue = document.createElement('div');
  softTransitionValue.className = 'figure-size-value';
  softTransitionValue.textContent = `${Number(softTransitionSlider.value).toFixed(0)}%`;

  softTransitionSlider.addEventListener('input', () => {
    const next = Number(softTransitionSlider.value);
    softTransitionValue.textContent = `${next.toFixed(0)}%`;
    if (managerRef) {
      managerRef.setFigureSoftTransitionPercent(next);
    }
    persistFigureSettings();
  });

  const dynamicsWrap = document.createElement('label');
  dynamicsWrap.className = 'figure-dynamics-toggle';

  const dynamicsToggle = document.createElement('input');
  dynamicsToggle.type = 'checkbox';
  dynamicsToggle.checked = Boolean(storedFigureSettings.figureDynamicsVisible);

  const dynamicsText = document.createElement('span');
  dynamicsText.textContent = 'Dynamiklinien';
  dynamicsWrap.appendChild(dynamicsToggle);
  dynamicsWrap.appendChild(dynamicsText);

  dynamicsToggle.addEventListener('change', () => {
    if (managerRef) {
      managerRef.setFigureDynamicsVisible(dynamicsToggle.checked);
    }
    persistFigureSettings();
  });

  const countTimesWrap = document.createElement('label');
  countTimesWrap.className = 'figure-dynamics-toggle';

  const countTimesToggle = document.createElement('input');
  countTimesToggle.type = 'checkbox';
  countTimesToggle.checked = Boolean(storedFigureSettings.figureCountTimesVisible);

  const countTimesText = document.createElement('span');
  countTimesText.textContent = 'Zählzeiten';
  countTimesWrap.appendChild(countTimesToggle);
  countTimesWrap.appendChild(countTimesText);

  countTimesToggle.addEventListener('change', () => {
    if (managerRef) {
      managerRef.setFigureCountTimesVisible(countTimesToggle.checked);
    }
    persistFigureSettings();
  });

  const strokeSlider = document.createElement('input');
  strokeSlider.type = 'range';
  strokeSlider.min = '0.01';
  strokeSlider.max = '0.5';
  strokeSlider.step = '0.01';
  strokeSlider.value = String(storedFigureSettings.figureStrokeWidth ?? initialManager?.figureStrokeWidth ?? 0.5);

  const strokeValue = document.createElement('div');
  strokeValue.className = 'figure-size-value';
  strokeValue.textContent = `${Number(strokeSlider.value).toFixed(1)}px`;

  strokeSlider.addEventListener('input', () => {
    const next = Number(strokeSlider.value);
    strokeValue.textContent = `${next.toFixed(2)}px`;
    if (managerRef) {
      managerRef.setFigureStrokeWidth(next);
    }
    persistFigureSettings();
  });

  sizeWrap.appendChild(sizeLabel);
  sizeWrap.appendChild(sizeSlider);
  sizeWrap.appendChild(sizeValue);

  strokeWrap.appendChild(strokeLabel);
  strokeWrap.appendChild(strokeSlider);
  strokeWrap.appendChild(strokeValue);

  const variants = [
    { value: 'soft', label: 'Weich' },
    { value: 'hard', label: 'Hart' }
  ];

  const handSides = [
    { value: 'left', label: 'Links' },
    { value: 'right', label: 'Rechts' },
    { value: 'both', label: 'Beidhändig' }
  ];

  let selectedVariant = storedFigureSettings.figureVariant === 'hard' ? 'hard' : 'soft';
  let selectedSide = ['left', 'right', 'both'].includes(storedFigureSettings.figureSide)
    ? storedFigureSettings.figureSide
    : 'left';
  let managerRef = initialManager || null;

  function persistFigureSettings() {
    try {
      localStorage.setItem(figureSettingsStorageKey, JSON.stringify({
        figureVariant: selectedVariant,
        figureSide: selectedSide,
        figureScale: Number(sizeSlider.value),
        figureStrokeWidth: Number(strokeSlider.value),
        figureHorizontalOffset: Number(offsetSlider.value),
        figureYPosition: Number(ySlider.value),
        figureTempoBpm: Number(tempoSlider.value),
        figureHardLinearity: Number(hardLinearitySlider.value),
        figureSoftTransitionPercent: Number(softTransitionSlider.value),
        figureDynamicsVisible: dynamicsToggle.checked,
        figureCountTimesVisible: countTimesToggle.checked
      }));
    } catch (error) {
      return;
    }
  }

  variants.forEach(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-mode-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'figure-mode';
    input.value = value;
    input.checked = value === selectedVariant;

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      selectedVariant = value;
      updateMotionControlVisibility();
      persistFigureSettings();
      if (managerRef) {
        managerRef.setFigureVariant(selectedVariant);
      }
    });

    const caption = document.createElement('span');
    caption.textContent = label;

    option.appendChild(input);
    option.appendChild(caption);
    radioGroup.appendChild(option);
  });

  handSides.forEach(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-side-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'figure-side';
    input.value = value;
    input.checked = value === selectedSide;

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      selectedSide = value;
      persistFigureSettings();
      if (managerRef) {
        managerRef.setFigureSide(selectedSide);
      }
    });

    const caption = document.createElement('span');
    caption.textContent = label;

    option.appendChild(input);
    option.appendChild(caption);
    sideGroup.appendChild(option);
  });

  offsetWrap.appendChild(offsetLabel);
  offsetWrap.appendChild(offsetSlider);
  offsetWrap.appendChild(offsetValue);

  yWrap.appendChild(yLabel);
  yWrap.appendChild(ySlider);
  yWrap.appendChild(yValue);

  tempoWrap.appendChild(tempoLabel);
  tempoWrap.appendChild(tempoSlider);
  tempoWrap.appendChild(tempoValue);

  hardLinearityWrap.appendChild(hardLinearityLabel);
  hardLinearityWrap.appendChild(hardLinearitySlider);
  hardLinearityWrap.appendChild(hardLinearityValue);

  softTransitionWrap.appendChild(softTransitionLabel);
  softTransitionWrap.appendChild(softTransitionSlider);
  softTransitionWrap.appendChild(softTransitionValue);

  panel.appendChild(title);
  panel.appendChild(radioGroup);
  panel.appendChild(radioDivider);
  panel.appendChild(sideGroup);
  panel.appendChild(sizeWrap);
  panel.appendChild(strokeWrap);
  panel.appendChild(offsetWrap);
  panel.appendChild(yWrap);
  panel.appendChild(tempoWrap);
  panel.appendChild(hardLinearityWrap);
  panel.appendChild(softTransitionWrap);
  panel.appendChild(dynamicsWrap);
  panel.appendChild(countTimesWrap);

  function updateMotionControlVisibility() {
    const isHard = selectedVariant === 'hard';
    hardLinearityWrap.hidden = !isHard;
    softTransitionWrap.hidden = isHard;
  }

  function setVisible(visible) {
    panel.classList.toggle('hidden', !visible);
  }

  function setLevelManager(manager) {
    managerRef = manager || null;
    if (managerRef) {
      managerRef.setFigureScale(Number(sizeSlider.value));
      managerRef.setFigureStrokeWidth(Number(strokeSlider.value));
      managerRef.setFigureHorizontalOffset(Number(offsetSlider.value));
      managerRef.setFigureYPosition(Number(ySlider.value));
      managerRef.setFigureTempoBpm(Number(tempoSlider.value));
      managerRef.setFigureHardLinearity(Number(hardLinearitySlider.value));
      managerRef.setFigureSoftTransitionPercent(Number(softTransitionSlider.value));
      managerRef.setFigureDynamicsVisible(dynamicsToggle.checked);
      managerRef.setFigureCountTimesVisible(countTimesToggle.checked);
      sizeSlider.value = String(managerRef.figureScale ?? 1 / 3);
      sizeValue.textContent = `${Number(sizeSlider.value).toFixed(2)}x`;
      strokeSlider.value = String(managerRef.figureStrokeWidth ?? 0.5);
      strokeValue.textContent = `${Number(strokeSlider.value).toFixed(2)}px`;
      offsetValue.textContent = `${Number(offsetSlider.value).toFixed(0)}px`;
      yValue.textContent = `${Number(ySlider.value).toFixed(0)}px`;
      tempoValue.textContent = `${Number(tempoSlider.value).toFixed(0)} bpm`;
      hardLinearityValue.textContent = `${Number(hardLinearitySlider.value).toFixed(0)}%`;
      softTransitionValue.textContent = `${Number(softTransitionSlider.value).toFixed(0)}%`;
      setVariant(selectedVariant);
      setSide(selectedSide);
      persistFigureSettings();
    }
  }

  function setVariant(variant) {
    const safe = variant === 'hard' ? 'hard' : 'soft';
    selectedVariant = safe;
    updateMotionControlVisibility();
    const radios = radioGroup.querySelectorAll('input[name="figure-mode"]');
    radios.forEach((radio) => {
      radio.checked = radio.value === safe;
    });
    if (managerRef) {
      managerRef.setFigureVariant(safe);
    }
    persistFigureSettings();
  }

  function setSide(side) {
    const safe = side === 'right' ? 'right' : side === 'both' ? 'both' : 'left';
    selectedSide = safe;
    const radios = sideGroup.querySelectorAll('input[name="figure-side"]');
    radios.forEach((radio) => {
      radio.checked = radio.value === safe;
    });
    if (managerRef) {
      managerRef.setFigureSide(safe);
    }
    persistFigureSettings();
  }

  return { panel, setVisible, setVariant, setSide, setLevelManager, getVariant: () => selectedVariant, getSide: () => selectedSide };
}

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

  const resolutionToggleButton = document.createElement('button');
  resolutionToggleButton.type = 'button';
  resolutionToggleButton.className = 'tracking-controls-button';
  let resolutionPreset = trackingController.getResolutionPreset() === 'low' ? 'low' : 'high';

  function updateCameraToggleLabel() {
    cameraToggleButton.textContent = cameraEnabled ? 'Camera: ON' : 'Camera: OFF';
    cameraToggleButton.setAttribute('aria-pressed', String(cameraEnabled));
  }

  function updateResolutionToggleLabel() {
    resolutionToggleButton.textContent = `Resolution: ${resolutionPreset.toUpperCase()}`;
    resolutionToggleButton.setAttribute('aria-pressed', String(resolutionPreset === 'high'));
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

  resolutionToggleButton.addEventListener('click', async () => {
    const nextPreset = resolutionPreset === 'high' ? 'low' : 'high';
    resolutionToggleButton.disabled = true;
    await trackingController.setResolutionPreset(nextPreset);
    resolutionPreset = trackingController.getResolutionPreset();
    updateResolutionToggleLabel();
    resolutionToggleButton.disabled = false;
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
  updateResolutionToggleLabel();
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
  container.appendChild(resolutionToggleButton);
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

  function setStageAspectRatio(stageEl, width, height) {
    if (!stageEl || !width || !height) {
      return;
    }
    stageEl.style.setProperty('--video-aspect-ratio', `${width} / ${height}`);
  }

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
  const figurePanel = createFigureModePanel(null);
  document.body.appendChild(figurePanel.panel);

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
  figurePanel.setLevelManager(levelManager);
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
    setStageAspectRatio(stageFrame, canvasElement.width, canvasElement.height);
    levelCanvas.width = canvasElement.width;
    levelCanvas.height = canvasElement.height;
    levelManager.resize(canvasElement.width, canvasElement.height);
  }

  window.addEventListener('resize', resizeOverlays);

  onCanvasResize((width, height) => {
    setStageAspectRatio(stageFrame, width, height);
    levelCanvas.width = width;
    levelCanvas.height = height;
    levelManager.resize(width, height);
  });

  resizeOverlays();

  onChapterChange((chapter) => {
    levelManager.setChapter(chapter);
    const isFigureChapter = chapter === 3;
    figurePanel.setVisible(isFigureChapter);
    if (!isFigureChapter) {
      return;
    }
    figurePanel.setVariant(levelManager.figureVariant || 'soft');
  });

  onLevelChange((level) => {
    levelManager.setLevel(level);
    if (level !== null) {
      setLevelActive(true);
      clearHoverDescription();
    } else {
      setLevelActive(false);
    }

    if (uiState.activeChapter === 3) {
      figurePanel.setVisible(level !== null);
    } else {
      figurePanel.setVisible(false);
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
