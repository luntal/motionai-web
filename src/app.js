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

function createFigureModePanel(initialManager, options = {}) {
  const figureSettingsStorageKey = options.settingsKey || 'motionai.figure-panel-settings';
  const initialTitle = options.initialTitle || 'Grundfigur';
  const defaultVariant = options.defaultVariant || 'soft';
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
  title.textContent = initialTitle;

  function setTitle(nextTitle) {
    title.textContent = nextTitle === 'extended'
      ? 'Erweiterte Dirigierfiguren'
      : nextTitle === 'dynamic'
        ? 'Dynamikebenen'
        : 'Grundfigur';
  }

  const radioGroup = document.createElement('div');
  radioGroup.className = 'figure-mode-group';

  const sideGroup = document.createElement('div');
  sideGroup.className = 'figure-side-group';

  const createPanelDivider = () => {
    const divider = document.createElement('div');
    divider.className = 'figure-panel-divider';
    return divider;
  };

  const movementTitle = document.createElement('div');
  movementTitle.className = 'figure-panel-section-title';
  movementTitle.textContent = 'Bewegungen';

  const arrangementTitle = document.createElement('div');
  arrangementTitle.className = 'figure-panel-section-title';
  arrangementTitle.textContent = 'Anordnung';

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
  offsetLabel.textContent = 'X';

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

  let selectedVariant = storedFigureSettings.figureVariant === 'hard'
    ? 'hard'
    : storedFigureSettings.figureVariant === 'soft'
      ? 'soft'
      : defaultVariant;
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
  panel.appendChild(createPanelDivider());
  panel.appendChild(sideGroup);
  panel.appendChild(createPanelDivider());
  panel.appendChild(dynamicsWrap);
  panel.appendChild(countTimesWrap);
  panel.appendChild(createPanelDivider());
  panel.appendChild(arrangementTitle);
  panel.appendChild(sizeWrap);
  panel.appendChild(offsetWrap);
  panel.appendChild(yWrap);
  panel.appendChild(createPanelDivider());
  panel.appendChild(movementTitle);
  panel.appendChild(tempoWrap);
  panel.appendChild(hardLinearityWrap);
  panel.appendChild(softTransitionWrap);
  panel.appendChild(createPanelDivider());
  panel.appendChild(strokeWrap);
  panel.appendChild(createPanelDivider());

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

  function getSettings() {
    return {
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
    };
  }

  function setSettings(settings = {}) {
    const numericControls = [
      [sizeSlider, sizeValue, settings.figureScale, (value) => `${value.toFixed(2)}x`],
      [strokeSlider, strokeValue, settings.figureStrokeWidth, (value) => `${value.toFixed(2)}px`],
      [offsetSlider, offsetValue, settings.figureHorizontalOffset, (value) => `${value.toFixed(0)}px`],
      [ySlider, yValue, settings.figureYPosition, (value) => `${value.toFixed(0)}px`],
      [tempoSlider, tempoValue, settings.figureTempoBpm, (value) => `${value.toFixed(0)} bpm`],
      [hardLinearitySlider, hardLinearityValue, settings.figureHardLinearity, (value) => `${value.toFixed(0)}%`],
      [softTransitionSlider, softTransitionValue, settings.figureSoftTransitionPercent, (value) => `${value.toFixed(0)}%`]
    ];
    numericControls.forEach(([slider, valueElement, next, format]) => {
      if (Number.isFinite(Number(next))) {
        const value = Number(next);
        slider.value = String(value);
        valueElement.textContent = format(value);
      }
    });
    if (typeof settings.figureDynamicsVisible === 'boolean') {
      dynamicsToggle.checked = settings.figureDynamicsVisible;
    }
    if (typeof settings.figureCountTimesVisible === 'boolean') {
      countTimesToggle.checked = settings.figureCountTimesVisible;
    }
    setVariant(settings.figureVariant || selectedVariant);
    setSide(settings.figureSide || selectedSide);
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
    }
    persistFigureSettings();
  }

  return {
    panel,
    setVisible,
    setTitle,
    setVariant,
    setSide,
    getSettings,
    setSettings,
    setLevelManager,
    getVariant: () => selectedVariant,
    getSide: () => selectedSide
  };
}

function createDynamicFigureModePanel() {
  const basePanel = createFigureModePanel(null, {
    settingsKey: 'motionai.dynamic-figure-panel-settings',
    initialTitle: 'Dynamikebenen',
    defaultVariant: 'hard'
  });
  const pointPanel = document.createElement('div');
  pointPanel.className = 'dynamic-figure-point-controls';
  const pointTitle = document.createElement('div');
  pointTitle.className = 'figure-panel-section-title';
  pointTitle.textContent = 'Eck. Höhen (Dynamikebenen)';
  pointPanel.appendChild(pointTitle);
  basePanel.panel.appendChild(pointPanel);

  let managerRef = null;
  const presetStorageKey = 'motionai.dynamic-figure-presets';
  const selectedPresetStorageKey = 'motionai.dynamic-figure-selected-presets';
  const presetCount = 8;
  let currentLevel = null;
  let selectedPreset = 0;
  let presetData = {};
  let selectedPresetByLevel = {};

  try {
    const stored = localStorage.getItem(presetStorageKey);
    presetData = stored ? JSON.parse(stored) : {};
  } catch (error) {
    presetData = {};
  }
  try {
    const stored = localStorage.getItem(selectedPresetStorageKey);
    selectedPresetByLevel = stored ? JSON.parse(stored) : {};
  } catch (error) {
    selectedPresetByLevel = {};
  }

  const presetPanel = document.createElement('div');
  presetPanel.className = 'dynamic-figure-presets';
  const presetTitle = document.createElement('div');
  presetTitle.className = 'figure-size-label';
  presetTitle.textContent = 'Presets';
  const presetSlots = document.createElement('div');
  presetSlots.className = 'dynamic-figure-preset-slots';
  const presetSaveButton = document.createElement('button');
  presetSaveButton.type = 'button';
  presetSaveButton.className = 'dynamic-figure-preset-action';
  presetSaveButton.textContent = 'Speichern';
  presetSaveButton.title = 'Aktuelle Panelwerte in einem Preset speichern';
  const presetResetButton = document.createElement('button');
  presetResetButton.type = 'button';
  presetResetButton.className = 'dynamic-figure-preset-action';
  presetResetButton.textContent = 'Zurücksetzen';
  presetResetButton.title = 'Alle Presets auf die Werkseinstellungen zurücksetzen';
  const presetActions = document.createElement('div');
  presetActions.className = 'dynamic-figure-preset-actions';
  presetActions.appendChild(presetSaveButton);
  presetActions.appendChild(presetResetButton);
  presetPanel.appendChild(presetTitle);
  presetPanel.appendChild(presetSlots);
  presetPanel.appendChild(presetActions);
  const presetDivider = document.createElement('div');
  presetDivider.className = 'figure-panel-divider';
  basePanel.panel.appendChild(presetDivider);
  basePanel.panel.appendChild(presetPanel);

  function persistPresets() {
    try {
      localStorage.setItem(presetStorageKey, JSON.stringify(presetData));
    } catch (error) {
      return;
    }
  }

  function persistSelectedPresets() {
    try {
      localStorage.setItem(selectedPresetStorageKey, JSON.stringify(selectedPresetByLevel));
    } catch (error) {
      return;
    }
  }

  function getPointCount(level = currentLevel) {
    return Number.isInteger(level) && level >= 0 && level <= 3 ? (level + 1) * 2 : 0;
  }

  function getFactoryPreset(slot, level) {
    const ratio = slot / (presetCount - 1);
    const settings = {
      ...basePanel.getSettings(),
      figureVariant: 'hard',
      figureScale: 0.2 + ratio * 0.8,
      figureStrokeWidth: 0.01 + ratio * 0.49,
      figureHorizontalOffset: 50 + ratio * 250,
      figureYPosition: -300 + ratio * 600,
      figureTempoBpm: 30 + ratio * 90,
      figureHardLinearity: ratio * 100,
      figureSoftTransitionPercent: ratio * 50,
      figureDynamicsVisible: false,
      figureCountTimesVisible: false,
      dynamicFigureCornerHeights: Array.from({ length: getPointCount(level) }, () => -25 + ratio * 50)
    };
    return settings;
  }

  function getPreset(level, slot) {
    const levelData = presetData[String(level)] || {};
    return levelData[String(slot)] || getFactoryPreset(slot, level);
  }

  function applyPreset(slot) {
    if (!Number.isInteger(currentLevel)) {
      return;
    }
    selectedPreset = slot;
    selectedPresetByLevel[String(currentLevel)] = slot;
    persistSelectedPresets();
    const preset = getPreset(currentLevel, slot);
    const variant = preset.figureVariant === 'soft' ? 'soft' : 'hard';
    basePanel.setSettings(preset);
    basePanel.setVariant(variant);
    managerRef?.setDynamicFigureCornerHeights(preset.dynamicFigureCornerHeights || []);
    setLevel(currentLevel, false);
  }

  function renderPresetSlots() {
    presetSlots.innerHTML = '';
    for (let slot = 0; slot < presetCount; slot += 1) {
      const option = document.createElement('label');
      option.className = 'dynamic-figure-preset-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'dynamic-figure-preset';
      input.value = String(slot);
      input.checked = slot === selectedPreset;
      input.addEventListener('change', () => {
        if (input.checked) {
          applyPreset(slot);
        }
      });
      const caption = document.createElement('span');
      caption.textContent = String(slot + 1);
      option.appendChild(input);
      option.appendChild(caption);
      presetSlots.appendChild(option);
    }
  }

  presetSaveButton.addEventListener('click', () => {
    if (!Number.isInteger(currentLevel)) {
      return;
    }
    const requestedSlot = window.prompt('In welchem Preset-Slot soll gespeichert werden? (1-8)', String(selectedPreset + 1));
    const slot = Number(requestedSlot) - 1;
    if (!Number.isInteger(slot) || slot < 0 || slot >= presetCount) {
      return;
    }
    presetData[String(currentLevel)] ||= {};
    const panelSettings = basePanel.getSettings();
    presetData[String(currentLevel)][String(slot)] = {
      ...panelSettings,
      figureVariant: panelSettings.figureVariant === 'soft' ? 'soft' : 'hard',
      dynamicFigureCornerHeights: managerRef?.dynamicFigureCornerHeights?.slice(0, getPointCount()) || []
    };
    selectedPreset = slot;
    selectedPresetByLevel[String(currentLevel)] = slot;
    persistPresets();
    persistSelectedPresets();
    renderPresetSlots();
  });

  presetResetButton.addEventListener('click', () => {
    presetData = {};
    persistPresets();
    applyPreset(selectedPreset);
  });

  function setLevel(level, applySelectedPreset = true) {
    pointPanel.querySelectorAll('.dynamic-figure-point-wrap').forEach((element) => element.remove());
    currentLevel = level;
    if (Number.isInteger(level)) {
      const storedSlot = Number(selectedPresetByLevel[String(level)]);
      selectedPreset = Number.isInteger(storedSlot) && storedSlot >= 0 && storedSlot < presetCount
        ? storedSlot
        : 0;
    }
    const pointCount = getPointCount(level);
    for (let index = 0; index < pointCount; index += 1) {
      const wrap = document.createElement('label');
      wrap.className = 'figure-size-wrap dynamic-figure-point-wrap';

      const label = document.createElement('div');
      label.className = 'figure-size-label';
      const isBeatPoint = index % 2 === 0;
      label.textContent = `${isBeatPoint ? 'Zählzeit' : 'Zwischenpunkt'} ${Math.floor(index / 2) + 1}`;
      label.classList.add(isBeatPoint ? 'dynamic-figure-beat-label' : 'dynamic-figure-between-label');
      wrap.classList.add(isBeatPoint ? 'dynamic-figure-beat-point' : 'dynamic-figure-between-point');

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '-25';
      slider.max = '25';
      slider.step = '0.1';
      slider.value = String(managerRef?.dynamicFigureCornerHeights?.[index] ?? 0);

      const value = document.createElement('div');
      value.className = 'figure-size-value';
      value.textContent = `${Number(slider.value).toFixed(1)}`;

      slider.addEventListener('input', () => {
        const next = Number(slider.value);
        value.textContent = next.toFixed(1);
        managerRef?.setDynamicFigureCornerHeight(index, next);
      });

      wrap.appendChild(label);
      wrap.appendChild(slider);
      wrap.appendChild(value);
      pointPanel.appendChild(wrap);
    }
    if (applySelectedPreset && Number.isInteger(level)) {
      applyPreset(selectedPreset);
    }
  }

  function setLevelManager(manager) {
    managerRef = manager || null;
    basePanel.setLevelManager(managerRef);
    renderPresetSlots();
  }

  return {
    ...basePanel,
    setLevelManager,
    setLevel,
    applyPreset
  };
}

function createHandIndependencePanel() {
  const panel = document.createElement('aside');
  panel.className = 'figure-side-panel hidden hand-independence-panel';
  const storageKey = 'motionai.hand-independence-panel-settings';
  const presetKey = 'motionai.hand-independence-presets';
  let managerRef = null;
  let settings = {};
  let presets = {};
  try {
    const storedSettings = JSON.parse(localStorage.getItem(storageKey) || '{}');
    settings = storedSettings && typeof storedSettings === 'object' ? storedSettings : {};
  } catch (error) { settings = {}; }
  try {
    const storedPresets = JSON.parse(localStorage.getItem(presetKey) || '{}');
    presets = storedPresets && typeof storedPresets === 'object' ? storedPresets : {};
  } catch (error) { presets = {}; }

  const title = document.createElement('div');
  title.className = 'figure-side-panel-title';
  title.textContent = 'Handunabhängigkeit';
  panel.appendChild(title);

  let selectedPresetSlot = 0;

  const createSection = (label) => {
    const heading = document.createElement('div');
    heading.className = 'figure-panel-section-title';
    heading.textContent = label;
    panel.appendChild(heading);
  };
  const addDivider = () => {
    const divider = document.createElement('div');
    divider.className = 'figure-panel-divider';
    panel.appendChild(divider);
  };
  const controls = {};
  const controlWraps = {};
  const addRange = (key, label, min, max, step, group, target = panel) => {
    const wrap = document.createElement('label');
    wrap.className = 'figure-size-wrap';
    const caption = document.createElement('div');
    caption.className = 'figure-size-label';
    caption.textContent = label;
    const input = document.createElement('input');
    input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
    input.value = String(settings[key] ?? (min + max) / 2);
    const value = document.createElement('div');
    value.className = 'figure-size-value'; value.textContent = input.value;
    input.addEventListener('input', () => {
      settings[key] = Number(input.value); value.textContent = input.value;
      managerRef?.setHandIndependenceFigureParameter(key, Number(input.value));
      managerRef?.setHandIndependenceShapeParameter(key, Number(input.value));
      persist();
    });
    wrap.append(caption, input, value); target.appendChild(wrap); controls[key] = input; controlWraps[key] = wrap;
    return group;
  };
  const addToggle = (key, label) => {
    const wrap = document.createElement('label'); wrap.className = 'figure-dynamics-toggle';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => { settings[key] = input.checked; managerRef?.setHandIndependenceReverse(input.checked); persist(); });
    wrap.append(input, document.createTextNode(label)); panel.appendChild(wrap); controls[key] = input;
  };

  addToggle('reverse', 'Umkehren');
  const dynamicsToggle = document.createElement('label');
  dynamicsToggle.className = 'figure-dynamics-toggle';
  const dynamicsInput = document.createElement('input');
  dynamicsInput.type = 'checkbox';
  dynamicsInput.checked = Boolean(settings.dynamicsVisible);
  dynamicsInput.addEventListener('change', () => {
    settings.dynamicsVisible = dynamicsInput.checked;
    managerRef?.setHandIndependenceDynamicsVisible(dynamicsInput.checked);
    persist();
  });
  dynamicsToggle.append(dynamicsInput, document.createTextNode('Dynamiklinien'));
  panel.appendChild(dynamicsToggle);
  addRange('strokeWidth', 'Stroke', 0.01, 0.5, 0.01);
  addRange('sharedY', 'Y', -200, 200, 0.1);
  addRange('sharedX', 'X', -100, 100, 0.1);
  addDivider();
  const tempoRatioTitle = document.createElement('div');
  tempoRatioTitle.className = 'figure-panel-section-title';
  tempoRatioTitle.textContent = 'Tempo';
  panel.appendChild(tempoRatioTitle);
  addRange('sharedTempoBpm', 'BPM', 30, 120, 1);
  const ratioSelect = document.createElement('select');
  ratioSelect.className = 'hand-independence-tempo-ratio';
  ['1:1', '2:1', '3:1', '1:2', '1:3', '0.5:1', '1:0.5'].forEach((ratio) => {
    const option = document.createElement('option');
    option.value = ratio;
    option.textContent = ratio;
    ratioSelect.appendChild(option);
  });
  ratioSelect.value = settings.tempoRatio || '1:1';
  ratioSelect.addEventListener('change', () => {
    settings.tempoRatio = ratioSelect.value;
    managerRef?.setHandIndependenceTempoRatio(ratioSelect.value);
    persist();
  });
  panel.appendChild(ratioSelect);
  controls.tempoRatio = ratioSelect;
  addDivider();
  createSection('Taktgebung');
  const figureSelect = document.createElement('select');
  figureSelect.className = 'hand-independence-figure-select';
  ['Einserfigur', 'Zweierfigur', 'Dreierfigur', 'Viererfigur', 'Vierviertel', 'Dreiviertel', 'Zweiviertel'].forEach((figureName, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = figureName;
    figureSelect.appendChild(option);
  });
  figureSelect.value = String(Number(settings.figureLevel ?? 0));
  figureSelect.addEventListener('change', () => {
    settings.figureLevel = Number(figureSelect.value);
    managerRef?.setHandIndependenceFigureLevel(settings.figureLevel);
    rebuildCornerControls(settings.figureLevel);
    persist();
  });
  panel.appendChild(figureSelect);
  controls.figureLevel = figureSelect;
  const variantGroup = document.createElement('div'); variantGroup.className = 'figure-mode-group';
  const variantInputs = {};
  ['soft', 'hard'].forEach((variant) => {
    const label = document.createElement('label'); label.className = 'figure-mode-option';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'hand-independence-variant'; input.value = variant;
    input.checked = (settings.variant || 'hard') === variant;
    variantInputs[variant] = input;
    input.addEventListener('change', () => { if (input.checked) { settings.variant = variant; managerRef?.setHandIndependenceVariant(variant); persist(); } });
    label.append(input, document.createTextNode(variant === 'soft' ? 'Weich' : 'Hart')); variantGroup.appendChild(label);
  });
  panel.appendChild(variantGroup);
  const countToggle = document.createElement('label');
  countToggle.className = 'figure-dynamics-toggle';
  const countInput = document.createElement('input');
  countInput.type = 'checkbox';
  countInput.checked = Boolean(settings.countTimesVisible);
  countInput.addEventListener('change', () => {
    settings.countTimesVisible = countInput.checked;
    managerRef?.setHandIndependenceCountTimesVisible(countInput.checked);
    persist();
  });
  countToggle.append(countInput, document.createTextNode('Zählzeiten'));
  panel.appendChild(countToggle);
  addRange('scale', 'Größe', 0.2, 1, 0.01);
  const updateFigureMotionControlVisibility = () => {
    if (controlWraps.figureHardLinearity) {
      controlWraps.figureHardLinearity.classList.toggle(
        'hand-independence-figure-motion-control-hidden',
        settings.variant !== 'hard'
      );
    }
    if (controlWraps.figureSoftTransitionPercent) {
      controlWraps.figureSoftTransitionPercent.classList.toggle(
        'hand-independence-figure-motion-control-hidden',
        settings.variant === 'hard'
      );
    }
  };
  addRange('figureHardLinearity', 'Linearität', 0, 100, 1);
  addRange('figureSoftTransitionPercent', 'Übergangslänge', 0, 50, 1);
  variantGroup.addEventListener('change', () => {
    updateFigureMotionControlVisibility();
    persist();
  });
  const cornerPanel = document.createElement('div');
  cornerPanel.className = 'dynamic-figure-point-controls';
  panel.appendChild(cornerPanel);
  updateFigureMotionControlVisibility();

  addDivider();
  createSection('Gegensatz');
  const select = document.createElement('select');
  [['line', 'Linie'], ['circle', 'Kreis'], ['square', 'Viereck'], ['L', 'L']].forEach(([value, label]) => {
    const option = document.createElement('option'); option.value = value; option.textContent = label; select.appendChild(option);
  });
  select.value = settings.shape || 'line';
  const updateShapeControlVisibility = () => {
    const shape = select.value;
    const visibleControls = shape === 'line'
      ? ['length', 'rotation']
      : ['width', 'height', 'rotation'];
    ['length', 'width', 'height', 'rotation'].forEach((key) => {
      if (controlWraps[key]) {
        controlWraps[key].classList.toggle(
          'hand-independence-shape-control-hidden',
          !visibleControls.includes(key)
        );
      }
    });
  };
  select.addEventListener('change', () => {
    settings.shape = select.value;
    managerRef?.setHandIndependenceShapeParameter('shape', select.value);
    updateShapeControlVisibility();
    updateFigureMotionControlVisibility();
    persist();
  });
  panel.appendChild(select); controls.shape = select;
  addRange('length', 'Länge', 1, 50, 0.1);
  addRange('width', 'Breite', 1, 50, 0.1);
  addRange('height', 'Höhe', 1, 50, 0.1);
  addRange('rotation', 'Rotation', -180, 180, 1);
  updateShapeControlVisibility();

  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch (error) { return; } }
  function apply(next) {
    const safeNext = next && typeof next === 'object' ? next : {};
    settings = { ...settings, ...safeNext };
    const selectedVariant = safeNext.variant === 'hard' || settings.variant === 'hard'
      ? 'hard'
      : 'soft';
    settings.variant = selectedVariant;
    Object.entries(variantInputs).forEach(([variant, input]) => {
      input.checked = variant === selectedVariant;
    });
    if (Number.isInteger(Number(safeNext.figureLevel))) {
      const figureLevel = Math.max(0, Math.min(6, Number(safeNext.figureLevel)));
      settings.figureLevel = figureLevel;
      figureSelect.value = String(figureLevel);
    }
    Object.entries(safeNext).forEach(([key, value]) => {
      const control = controls[key];
      if (control && control.type === 'range') control.value = String(value);
      if (control && control.type === 'checkbox') control.checked = Boolean(value);
      if (control && control.tagName === 'SELECT') control.value = String(value);
    });
    if (safeNext.variant) managerRef?.setHandIndependenceVariant(safeNext.variant);
    if (Number.isInteger(Number(safeNext.figureLevel))) {
      managerRef?.setHandIndependenceFigureLevel(Number(safeNext.figureLevel));
    }
    if (typeof safeNext.reverse === 'boolean') managerRef?.setHandIndependenceReverse(safeNext.reverse);
    if (typeof safeNext.dynamicsVisible === 'boolean') managerRef?.setHandIndependenceDynamicsVisible(safeNext.dynamicsVisible);
    if (typeof safeNext.countTimesVisible === 'boolean') managerRef?.setHandIndependenceCountTimesVisible(safeNext.countTimesVisible);
    if (safeNext.tempoRatio) managerRef?.setHandIndependenceTempoRatio(safeNext.tempoRatio);
    Object.entries(safeNext).forEach(([key, value]) => {
      if (key !== 'variant' && key !== 'reverse') {
        managerRef?.setHandIndependenceFigureParameter(key, value);
        managerRef?.setHandIndependenceShapeParameter(key, value);
      }
    });
    updateShapeControlVisibility();
    updateFigureMotionControlVisibility();
    rebuildCornerControls(settings.figureLevel);
    persist();
  }
  function savePresetFromPrompt() {
    const requestedSlot = window.prompt('In welchen Preset-Slot sollen die aktuellen Einstellungen gespeichert werden? (1-8)');
    const slot = Number(requestedSlot) - 1;
    if (!Number.isInteger(slot) || slot < 0 || slot >= 8) {
      return null;
    }
    presets[String(slot)] = { ...settings };
    selectedPresetSlot = slot;
    localStorage.setItem(presetKey, JSON.stringify(presets));
    return slot;
  }
  function resetPresets() {
    presets = {};
    localStorage.setItem(presetKey, '{}');
  }
  function rebuildCornerControls(figureLevelOverride = settings.figureLevel) {
    cornerPanel.replaceChildren();
    Object.keys(controls)
      .filter((key) => key.startsWith('corner'))
      .forEach((key) => delete controls[key]);

    const figureLevel = Number.isInteger(Number(figureLevelOverride))
      ? Math.max(0, Math.min(6, Number(figureLevelOverride)))
      : 0;
    const handIndependenceBeatCounts = [1, 2, 3, 4, 4, 3, 2];
    const beatCount = handIndependenceBeatCounts[figureLevel] || 1;
    const count = beatCount * 2;
    for (let displayIndex = 0; displayIndex < count; displayIndex += 1) {
      const isBeat = displayIndex < beatCount;
      const pointIndex = isBeat
        ? displayIndex * 2
        : (displayIndex - beatCount) * 2 + 1;
      addRange(
        `corner${pointIndex}`,
        `${isBeat ? 'Zählzeit' : 'Zwischenpunkt'} ${isBeat ? displayIndex + 1 : displayIndex - beatCount + 1}`,
        -25,
        25,
        0.1,
        null,
        cornerPanel
      );
      const input = controls[`corner${pointIndex}`];
      input.addEventListener('input', () => {
        managerRef?.setHandIndependenceFigureCornerHeight(pointIndex, Number(input.value));
      });
    }
  }

  return {
    panel,
    setVisible: (visible) => panel.classList.toggle('hidden', !visible),
    setLevelManager: (manager) => { managerRef = manager || null; apply(settings); },
    setLevel: rebuildCornerControls,
    applyPreset: (slot) => {
      selectedPresetSlot = Math.max(0, Math.min(7, Number(slot) || 0));
      if (presets[String(selectedPresetSlot)]) {
        apply(presets[String(selectedPresetSlot)]);
      }
    },
    savePresetFromPrompt,
    resetPresets
  };
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
  const dynamicFigurePanel = createDynamicFigureModePanel();
  const handIndependencePanel = createHandIndependencePanel();
  document.body.appendChild(figurePanel.panel);
  document.body.appendChild(dynamicFigurePanel.panel);
  document.body.appendChild(handIndependencePanel.panel);

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
  const dynamicFigureManager = {
    get figureScale() { return levelManager.dynamicFigureScale; },
    get figureStrokeWidth() { return levelManager.dynamicFigureStrokeWidth; },
    get figureHorizontalOffset() { return levelManager.dynamicFigureHorizontalOffset; },
    get figureYPosition() { return levelManager.dynamicFigureYPosition; },
    get figureTempoBpm() { return levelManager.dynamicFigureTempoBpm; },
    get figureHardLinearity() { return levelManager.dynamicFigureHardLinearity; },
    get figureSoftTransitionPercent() { return levelManager.dynamicFigureSoftTransitionPercent; },
    setFigureScale: (value) => levelManager.setDynamicFigureScale(value),
    setFigureStrokeWidth: (value) => levelManager.setDynamicFigureStrokeWidth(value),
    setFigureHorizontalOffset: (value) => levelManager.setDynamicFigureHorizontalOffset(value),
    setFigureYPosition: (value) => levelManager.setDynamicFigureYPosition(value),
    setFigureTempoBpm: (value) => levelManager.setDynamicFigureTempoBpm(value),
    setFigureHardLinearity: (value) => levelManager.setDynamicFigureHardLinearity(value),
    setFigureSoftTransitionPercent: (value) => levelManager.setDynamicFigureSoftTransitionPercent(value),
    setFigureDynamicsVisible: (value) => levelManager.setDynamicFigureDynamicsVisible(value),
    setFigureCountTimesVisible: (value) => levelManager.setDynamicFigureCountTimesVisible(value),
    setFigureVariant: (value) => levelManager.setDynamicFigureVariant(value),
    setFigureSide: (value) => levelManager.setDynamicFigureSide(value),
    setDynamicFigureCornerHeight: (index, value) => levelManager.setDynamicFigureCornerHeight(index, value),
    setDynamicFigureCornerHeights: (values) => levelManager.setDynamicFigureCornerHeights(values),
    get dynamicFigureCornerHeights() { return levelManager.dynamicFigureCornerHeights; }
  };
  dynamicFigurePanel.setLevelManager(dynamicFigureManager);
  handIndependencePanel.setLevelManager({
    setHandIndependenceVariant: (value) => levelManager.setHandIndependenceVariant(value),
    setHandIndependenceFigureLevel: (value) => levelManager.setHandIndependenceFigureLevel(value),
    setHandIndependenceReverse: (value) => levelManager.setHandIndependenceReverse(value),
    setHandIndependenceDynamicsVisible: (value) => levelManager.setHandIndependenceDynamicsVisible(value),
    setHandIndependenceCountTimesVisible: (value) => levelManager.setHandIndependenceCountTimesVisible(value),
    setHandIndependenceTempoRatio: (value) => levelManager.setHandIndependenceTempoRatio(value),
    setHandIndependenceFigureParameter: (name, value) => levelManager.setHandIndependenceFigureParameter(name, value),
    setHandIndependenceFigureCornerHeight: (index, value) => levelManager.setHandIndependenceFigureCornerHeight(index, value),
    setHandIndependenceShapeParameter: (name, value) => levelManager.setHandIndependenceShapeParameter(name, value)
  });
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
    const isDynamicFigureChapter = chapter === 4;
    const isHandIndependenceChapter = chapter === 5;
    figurePanel.setVisible(isFigureChapter);
    dynamicFigurePanel.setVisible(isDynamicFigureChapter);
    handIndependencePanel.setVisible(isHandIndependenceChapter);
    if (isDynamicFigureChapter) {
      dynamicFigurePanel.setTitle('dynamic');
      dynamicFigurePanel.setVariant(levelManager.dynamicFigureVariant || 'hard');
      dynamicFigurePanel.setLevel(null);
      return;
    }
    if (!isFigureChapter) {
      return;
    }
    figurePanel.setTitle('basic');
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
      figurePanel.setTitle(level !== null && level >= 4 ? 'extended' : 'basic');
      dynamicFigurePanel.setVisible(false);
    } else if (uiState.activeChapter === 4) {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(level !== null);
      dynamicFigurePanel.setTitle('dynamic');
      dynamicFigurePanel.setLevel(level);
      handIndependencePanel.setVisible(false);
    } else if (uiState.activeChapter === 5) {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(level !== null);
      handIndependencePanel.applyPreset(level);
      handIndependencePanel.setLevel();
    } else {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(false);
    }
  });

  document.addEventListener('hand-independence-save-preset', () => {
    const savedSlot = handIndependencePanel.savePresetFromPrompt();
    if (Number.isInteger(savedSlot)) {
      setActiveLevel(savedSlot);
    }
  });
  document.addEventListener('hand-independence-reset-presets', () => {
    handIndependencePanel.resetPresets();
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
