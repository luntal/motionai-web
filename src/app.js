import {
  createNavigationUI,
  onChapterChange,
  onLevelChange,
  clearHoverDescription,
  setLevelActive,
  setActiveLevel,
  setHoverHelpEnabled,
  uiState,
  attachPanelHoverHelp,
  registerHoverHelp
} from './ui.js';
import {
  startTracking,
  onLandmarksUpdate,
  onPoseUpdate,
  setStabilizationEnabled,
  setLandmarkDrawingEnabled,
  setSilhouetteEnabled,
  setEyeOverlayEnabled,
  setSilhouetteOpacity,
  setVideoSofteningEnabled,
  setVideoSofteningStyle,
  getVideoSofteningStyle,
  onCanvasResize
} from './tracking.js';
import { LevelManager } from './levels.js';
import { DEFAULT_MOTIONAI_STORAGE } from './defaultSettings.js';
import { getLevelCountForChapter, uiElementDescriptions } from './constants.js';

function normalizeHelpKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function getUiDescriptionForSection(sectionName, key) {
  const section = uiElementDescriptions[sectionName];
  if (!section) {
    return undefined;
  }

  if (section[key]) {
    return section[key];
  }

  const normalizedKey = normalizeHelpKey(key);
  const matchingKey = Object.keys(section).find((candidate) => normalizeHelpKey(candidate) === normalizedKey);
  return matchingKey ? section[matchingKey] : undefined;
}

function bindUiDescription(element, sectionName, key) {
  if (!(element instanceof Element)) {
    return element;
  }

  const description = getUiDescriptionForSection(sectionName, key);
  if (!description) {
    return element;
  }

  element.dataset.help = description;
  element.setAttribute('aria-label', description);
  element.setAttribute('title', description);
  return element;
}

function bindUiGroupDescription(elements, sectionName, key) {
  const description = getUiDescriptionForSection(sectionName, key);
  if (!description) {
    return;
  }

  elements.forEach((element) => {
    if (!(element instanceof Element)) {
      return;
    }
    element.dataset.help = description;
    element.setAttribute('aria-label', description);
    element.setAttribute('title', description);
  });
}

function bindFigurePanelDescriptions(panel, sectionName) {
  if (!panel || !sectionName) {
    return;
  }

  const controls = [
    ['Groesse', panel.querySelector('.figure-size-label')],
    ['Dynamiklinien', panel.querySelectorAll('.figure-dynamics-toggle')[0]],
    ['Zählzeiten', panel.querySelectorAll('.figure-dynamics-toggle')[1]],
    ['x', panel.querySelectorAll('.figure-size-wrap')[1]],
    ['y', panel.querySelectorAll('.figure-size-wrap')[2]],
    ['BPM', panel.querySelectorAll('.figure-size-wrap')[3]],
    ['Linearität', panel.querySelectorAll('.figure-size-wrap')[4]],
    ['Übergangslänge', panel.querySelectorAll('.figure-size-wrap')[5]],
    ['Stroke', panel.querySelectorAll('.figure-size-wrap')[6]],
    ['weichHart', panel.querySelectorAll('.figure-mode-option')],
    ['Hand', panel.querySelectorAll('.figure-side-option')]
  ];

  controls.forEach(([key, target]) => {
    if (!target) {
      return;
    }
    if (target instanceof NodeList) {
      bindUiGroupDescription([...target], sectionName, key);
      return;
    }
    bindUiDescription(target, sectionName, key);
  });

  const radioGroup = panel.querySelector('.figure-mode-group');
  if (radioGroup) {
    const radioInputs = radioGroup.querySelectorAll('input');
    bindUiGroupDescription([...radioInputs], sectionName, 'weichHart');
  }

  const sideGroup = panel.querySelector('.figure-side-group');
  if (sideGroup) {
    const sideInputs = sideGroup.querySelectorAll('input');
    bindUiGroupDescription([...sideInputs], sectionName, 'Hand');
  }

  attachPanelHoverHelp(panel);
}

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

  const presetPanel = document.createElement('div');
  presetPanel.className = 'dynamic-figure-presets';
  const presetTitle = document.createElement('div');
  presetTitle.className = 'figure-size-label';
  presetTitle.textContent = 'Presets';
  const presetSlots = document.createElement('div');
  presetSlots.className = 'figure-preset-slots dynamic-figure-preset-slots';
  const presetSaveButton = document.createElement('button');
  presetSaveButton.type = 'button';
  presetSaveButton.className = 'dynamic-figure-preset-action';
  presetSaveButton.textContent = 'Speichern';
  presetSaveButton.title = 'Aktuelle Parameter in einem Preset-Slot speichern';
  const presetResetButton = document.createElement('button');
  presetResetButton.type = 'button';
  presetResetButton.className = 'dynamic-figure-preset-action';
  presetResetButton.textContent = 'Zurücksetzen';
  presetResetButton.title = 'Aktuelle Übung auf die Werkseinstellungen zurücksetzen';
  const presetActions = document.createElement('div');
  presetActions.className = 'dynamic-figure-preset-actions';
  presetActions.appendChild(presetSaveButton);
  presetActions.appendChild(presetResetButton);
  presetPanel.appendChild(presetTitle);
  presetPanel.appendChild(presetSlots);
  presetPanel.appendChild(presetActions);
  const presetDivider = createPanelDivider();
  const motionDistanceToggle = document.createElement('label');
  motionDistanceToggle.className = 'figure-dynamics-toggle';
  const motionDistanceInput = document.createElement('input');
  motionDistanceInput.type = 'checkbox';
  motionDistanceInput.checked = storedFigureSettings.motionDistanceVisible === true;
  motionDistanceToggle.append(motionDistanceInput, document.createTextNode('Distanzdiagramm'));
  const motionDistanceStrictnessWrap = document.createElement('label');
  motionDistanceStrictnessWrap.className = 'figure-size-wrap';
  const motionDistanceStrictnessLabel = document.createElement('div');
  motionDistanceStrictnessLabel.className = 'figure-size-label';
  motionDistanceStrictnessLabel.textContent = 'Strenge';
  const motionDistanceStrictnessSlider = document.createElement('input');
  motionDistanceStrictnessSlider.type = 'range';
  motionDistanceStrictnessSlider.min = '0';
  motionDistanceStrictnessSlider.max = '100';
  motionDistanceStrictnessSlider.step = '1';
  motionDistanceStrictnessSlider.value = String(Number.isFinite(Number(storedFigureSettings.motionDistanceStrictness))
    ? Math.min(100, Math.max(0, Number(storedFigureSettings.motionDistanceStrictness)))
    : 100);
  const motionDistanceStrictnessValue = document.createElement('div');
  motionDistanceStrictnessValue.className = 'figure-size-value';
  motionDistanceStrictnessValue.textContent = `${motionDistanceStrictnessSlider.value}%`;
  motionDistanceStrictnessSlider.addEventListener('input', () => {
    const next = Number(motionDistanceStrictnessSlider.value);
    motionDistanceStrictnessValue.textContent = `${next}%`;
    managerRef?.setMotionDistanceStrictness(next);
    persistFigureSettings();
  });
  motionDistanceStrictnessWrap.append(
    motionDistanceStrictnessLabel,
    motionDistanceStrictnessSlider,
    motionDistanceStrictnessValue
  );
  const motionMetricsPanel = document.createElement('div');
  motionMetricsPanel.className = 'motion-distance-metrics';
  const motionMetricsTitle = document.createElement('div');
  motionMetricsTitle.className = 'figure-panel-section-title';
  motionMetricsTitle.textContent = 'Bewertung';
  motionMetricsPanel.appendChild(motionMetricsTitle);
  const motionMetricRows = {};
  const metricLabels = { score: 'Gesamtscore', pathScore: 'Bahnabstand', timingScore: 'Timing', directionScore: 'Richtung' };
  Object.entries(metricLabels).forEach(([key, label]) => {
    const row = document.createElement('div');
    row.className = 'motion-distance-metric-row';
    const labelNode = document.createElement('span');
    labelNode.textContent = label;
    const valueNode = document.createElement('span');
    valueNode.textContent = 'L - | R -';
    row.append(labelNode, valueNode);
    motionMetricsPanel.appendChild(row);
    motionMetricRows[key] = valueNode;
  });
  const updateMotionMetrics = () => {
    const summary = managerRef?.getMotionDistanceSummary?.();
    if (!summary) return;
    Object.keys(motionMetricRows).forEach((key) => {
      const format = (hand) => {
        const current = summary[hand]?.current?.[key];
        const average = summary[hand]?.average?.[key];
        return `${current == null ? '-' : current.toFixed(0)} / ${average == null ? '-' : average.toFixed(0)}`;
      };
      motionMetricRows[key].textContent = `L ${format('left')} | R ${format('right')}`;
    });
  };
  motionDistanceInput.addEventListener('change', () => {
    if (managerRef) {
      managerRef.setMotionDistanceVisible(motionDistanceInput.checked);
    }
    persistFigureSettings();
  });

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

  const normalizeFigureXValue = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return 0.25;
    }
    if (next >= 0 && next <= 1) {
      return Math.min(1, Math.max(0, next));
    }
    return Math.min(1, Math.max(0, Math.abs(next) / 300));
  };

  const offsetWrap = document.createElement('div');
  offsetWrap.className = 'figure-size-wrap';

  const offsetLabel = document.createElement('div');
  offsetLabel.className = 'figure-size-label';
  offsetLabel.textContent = 'X';

  const offsetSlider = document.createElement('input');
  offsetSlider.type = 'range';
  offsetSlider.min = '0';
  offsetSlider.max = '1';
  offsetSlider.step = '0.01';
  offsetSlider.value = String(normalizeFigureXValue(storedFigureSettings.figureHorizontalOffset ?? initialManager?.figureHorizontalOffset ?? 0.25));

  const offsetValue = document.createElement('div');
  offsetValue.className = 'figure-size-value';
  offsetValue.textContent = `${Number(offsetSlider.value).toFixed(2)}`;

  offsetSlider.addEventListener('input', () => {
    const next = Math.min(1, Math.max(0, Number(offsetSlider.value)));
    offsetSlider.value = String(next);
    offsetValue.textContent = `${next.toFixed(2)}`;
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

  const normalizeFigureYValue = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return 0.5;
    }
    if (next >= 0 && next <= 1) {
      return Math.min(1, Math.max(0, next));
    }
    return Math.min(1, Math.max(0, (next + 300) / 600));
  };

  const ySlider = document.createElement('input');
  ySlider.type = 'range';
  ySlider.min = '0';
  ySlider.max = '1';
  ySlider.step = '0.01';
  ySlider.value = String(normalizeFigureYValue(storedFigureSettings.figureYPosition ?? initialManager?.figureYPosition ?? 0.5));

  const yValue = document.createElement('div');
  yValue.className = 'figure-size-value';
  yValue.textContent = `${Number(ySlider.value).toFixed(2)}`;

  ySlider.addEventListener('input', () => {
    const next = Math.min(1, Math.max(0, Number(ySlider.value)));
    ySlider.value = String(next);
    yValue.textContent = `${next.toFixed(2)}`;
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
  let motionMetricsInterval = null;

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
        figureCountTimesVisible: countTimesToggle.checked,
        motionDistanceVisible: motionDistanceInput.checked,
        motionDistanceStrictness: Number(motionDistanceStrictnessSlider.value)
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
  panel.appendChild(presetDivider);
  panel.appendChild(presetPanel);
  panel.appendChild(createPanelDivider());
  panel.appendChild(motionDistanceToggle);
  panel.appendChild(motionDistanceStrictnessWrap);
  panel.appendChild(motionMetricsPanel);
  radioGroup.style.marginTop = '0.45rem';
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

  bindUiGroupDescription([dynamicsWrap, dynamicsToggle], 'Grundfiguren', 'Dynamiklinien');
  bindUiGroupDescription([countTimesWrap, countTimesToggle], 'Grundfiguren', 'Zählzeiten');
  bindUiGroupDescription([sizeWrap, sizeLabel, sizeSlider], 'Grundfiguren', 'Groesse');
  bindUiGroupDescription([offsetWrap, offsetLabel, offsetSlider], 'Grundfiguren', 'x');
  bindUiGroupDescription([yWrap, yLabel, ySlider], 'Grundfiguren', 'y');
  bindUiGroupDescription([tempoWrap, tempoLabel, tempoSlider], 'Grundfiguren', 'BPM');
  bindUiGroupDescription([hardLinearityWrap, hardLinearityLabel, hardLinearitySlider], 'Grundfiguren', 'Linearität');
  bindUiGroupDescription([softTransitionWrap, softTransitionLabel, softTransitionSlider], 'Grundfiguren', 'Übergangslänge');
  bindUiGroupDescription([strokeWrap, strokeLabel, strokeSlider], 'Grundfiguren', 'Stroke');
  const variantOptions = [...radioGroup.querySelectorAll('label, input')];
  bindUiGroupDescription(variantOptions, 'Grundfiguren', 'weichHart');
  const sideOptions = [...sideGroup.querySelectorAll('label, input')];
  bindUiGroupDescription(sideOptions, 'Grundfiguren', 'Hand');
  bindUiDescription(motionDistanceToggle, 'Grundfiguren', 'Distanzdiagramm');
  bindUiDescription(motionDistanceStrictnessWrap, 'Grundfiguren', 'DistanzStrenge');
  bindUiDescription(motionMetricsPanel, 'Grundfiguren', 'Bewertungsmetriken');
  attachPanelHoverHelp(panel);
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
      managerRef.setMotionDistanceVisible(motionDistanceInput.checked);
      managerRef.setMotionDistanceStrictness(Number(motionDistanceStrictnessSlider.value));
      updateMotionMetrics();
      if (!motionMetricsInterval) motionMetricsInterval = window.setInterval(updateMotionMetrics, 100);
      sizeSlider.value = String(managerRef.figureScale ?? 1 / 3);
      sizeValue.textContent = `${Number(sizeSlider.value).toFixed(2)}x`;
      strokeSlider.value = String(managerRef.figureStrokeWidth ?? 0.5);
      strokeValue.textContent = `${Number(strokeSlider.value).toFixed(2)}px`;
      offsetValue.textContent = `${Number(offsetSlider.value).toFixed(2)}`;
      yValue.textContent = `${Number(ySlider.value).toFixed(2)}`;
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
      figureCountTimesVisible: countTimesToggle.checked,
      motionDistanceVisible: motionDistanceInput.checked,
      motionDistanceStrictness: Number(motionDistanceStrictnessSlider.value)
    };
  }

  function setSettings(settings = {}) {
    const numericControls = [
      [sizeSlider, sizeValue, settings.figureScale, (value) => `${value.toFixed(2)}x`],
      [strokeSlider, strokeValue, settings.figureStrokeWidth, (value) => `${value.toFixed(2)}px`],
      [offsetSlider, offsetValue, normalizeFigureXValue(settings.figureHorizontalOffset), (value) => `${value.toFixed(2)}`],
      [ySlider, yValue, normalizeFigureYValue(settings.figureYPosition), (value) => `${value.toFixed(2)}`],
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
    if (typeof settings.motionDistanceVisible === 'boolean') {
      motionDistanceInput.checked = settings.motionDistanceVisible;
    }
    if (Number.isFinite(Number(settings.motionDistanceStrictness))) {
      motionDistanceStrictnessSlider.value = String(Math.min(100, Math.max(0, Number(settings.motionDistanceStrictness))));
      motionDistanceStrictnessValue.textContent = `${motionDistanceStrictnessSlider.value}%`;
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
      managerRef.setMotionDistanceVisible(motionDistanceInput.checked);
      managerRef.setMotionDistanceStrictness(Number(motionDistanceStrictnessSlider.value));
    }
    persistFigureSettings();
  }

  const presetStorageKey = 'motionai.figure-presets';
  const selectedPresetStorageKey = 'motionai.figure-selected-presets';
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

  function getFactoryPreset(slot) {
    const ratio = slot / (presetCount - 1);
    return {
      ...getSettings(),
      figureScale: 0.2 + ratio * 0.8,
      figureStrokeWidth: 0.01 + ratio * 0.49,
      figureHorizontalOffset: 0.08 + ratio * 0.6,
      figureYPosition: 0.15 + ratio * 0.7,
      figureTempoBpm: 30 + ratio * 90,
      figureHardLinearity: ratio * 100,
      figureSoftTransitionPercent: ratio * 50,
      figureDynamicsVisible: false,
      figureCountTimesVisible: false,
      figureVariant: selectedVariant || 'soft',
      figureSide: selectedSide || 'left'
    };
  }

  function getPreset(level, slot) {
    if (!Number.isInteger(level)) {
      return getFactoryPreset(slot);
    }
    const levelData = presetData[String(level)] || {};
    return levelData[String(slot)] || getFactoryPreset(slot);
  }

  function applyPreset(slot) {
    if (!Number.isInteger(currentLevel)) {
      return;
    }

    selectedPreset = Number.isInteger(slot) && slot >= 0 && slot < presetCount ? slot : 0;
    selectedPresetByLevel[String(currentLevel)] = selectedPreset;
    persistSelectedPresets();
    renderPresetSlots();

    const preset = getPreset(currentLevel, selectedPreset);
    setSettings(preset);
    setVariant(preset.figureVariant || selectedVariant);
  }

  function renderPresetSlots() {
    const presetSlots = panel.querySelector('.figure-preset-slots');
    if (!presetSlots) {
      return;
    }

    presetSlots.innerHTML = '';
    for (let slot = 0; slot < presetCount; slot += 1) {
      const option = document.createElement('label');
      option.className = 'dynamic-figure-preset-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'figure-preset';
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

    const requestedSlot = window.prompt(
      'In welchem Preset-Slot sollen die aktuellen Parameterwerte für diese Übung gespeichert werden? (1-8)',
      String(selectedPreset + 1)
    );
    const slot = Number(requestedSlot) - 1;
    if (!Number.isInteger(slot) || slot < 0 || slot >= presetCount) {
      return;
    }

    presetData[String(currentLevel)] ||= {};
    presetData[String(currentLevel)][String(slot)] = {
      ...getSettings(),
      figureVariant: selectedVariant,
      figureSide: selectedSide
    };
    selectedPreset = slot;
    selectedPresetByLevel[String(currentLevel)] = slot;
    persistPresets();
    persistSelectedPresets();
    renderPresetSlots();
  });

  presetResetButton.addEventListener('click', () => {
    if (!Number.isInteger(currentLevel)) {
      return;
    }

    delete presetData[String(currentLevel)];
    selectedPreset = 0;
    selectedPresetByLevel[String(currentLevel)] = 0;
    persistPresets();
    persistSelectedPresets();
    renderPresetSlots();
    setSettings(getFactoryPreset(0));
  });

  function setLevel(level) {
    currentLevel = Number.isInteger(level) ? level : null;
    if (currentLevel !== null) {
      const storedSlot = Number(selectedPresetByLevel[String(currentLevel)]);
      selectedPreset = Number.isInteger(storedSlot) && storedSlot >= 0 && storedSlot < presetCount
        ? storedSlot
        : 0;
    }
    renderPresetSlots();
    if (currentLevel !== null) {
      applyPreset(selectedPreset);
    }
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
    setLevel,
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

  const inheritedPresetPanel = basePanel.panel.querySelector('.dynamic-figure-presets');
  if (inheritedPresetPanel) {
    const inheritedDivider = inheritedPresetPanel.previousElementSibling;
    if (inheritedDivider && inheritedDivider.classList.contains('figure-panel-divider')) {
      inheritedDivider.remove();
    }
    inheritedPresetPanel.remove();
  }

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
  presetDivider.style.marginBottom = '0.35rem';

  const titleNode = basePanel.panel.querySelector('.figure-side-panel-title');
  if (titleNode) {
    const existingDividerAfterTitle = titleNode.nextElementSibling;
    if (existingDividerAfterTitle && existingDividerAfterTitle.classList.contains('figure-panel-divider')) {
      existingDividerAfterTitle.remove();
    }
    basePanel.panel.insertBefore(presetDivider, titleNode.nextSibling);
    basePanel.panel.insertBefore(presetPanel, titleNode.nextSibling);
  }

  const pointPanel = document.createElement('div');
  pointPanel.className = 'dynamic-figure-point-controls';
  const pointTitle = document.createElement('div');
  pointTitle.className = 'figure-panel-section-title';
  pointTitle.textContent = 'Eck. Höhen (Dynamikebenen)';
  pointPanel.appendChild(pointTitle);
  basePanel.panel.appendChild(pointPanel);

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
      figureYPosition: ratio,
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
    selectedPreset = Number.isInteger(slot) && slot >= 0 && slot < presetCount ? slot : 0;
    selectedPresetByLevel[String(currentLevel)] = selectedPreset;
    persistSelectedPresets();
    renderPresetSlots();
    const preset = getPreset(currentLevel, selectedPreset);
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
    if (!Number.isInteger(currentLevel)) {
      return;
    }
    presetData = {};
    selectedPreset = 0;
    selectedPresetByLevel[String(currentLevel)] = 0;
    persistPresets();
    persistSelectedPresets();
    renderPresetSlots();
    applyPreset(0);
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

const sanitizeExerciseFieldStrikeCount = (value) => {
  const next = Number(value);
  return [2, 3, 4].includes(next) ? next : 2;
};

const getExerciseFieldLevelStrikeCount = (level) => {
  const normalizedLevel = Number.isInteger(Number(level)) ? Number(level) : 0;
  const valueByLevel = [2, 3, 4];
  return sanitizeExerciseFieldStrikeCount(valueByLevel[Math.max(0, Math.min(2, normalizedLevel))] ?? 2);
};

function createExerciseFieldPanel() {
  const panel = document.createElement('aside');
  panel.className = 'figure-side-panel hidden exercise-field-panel';
  const storageKey = 'motionai.exercise-field-panel-settings';
  const presetsKey = 'motionai.exercise-field-presets';
  let managerRef = null;

  const sanitizeStrikeCount = (value) => sanitizeExerciseFieldStrikeCount(value);

  const getExerciseLevelStrikeCount = (level) => getExerciseFieldLevelStrikeCount(level);

  const readPresetMap = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(presetsKey) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch (error) {
      return {};
    }
  };

  const sanitizeAssignmentBeat = (value, strikeCount = 2) => {
    const next = Number(value);
    const normalized = [2, 3, 4].includes(Number(strikeCount)) ? Number(strikeCount) : 2;
    if (!Number.isFinite(next)) {
      return 1;
    }
    return Math.max(1, Math.min(normalized, Math.round(next)));
  };

  const sanitizeExerciseFieldStrikePositions = (value, strikeCountOverride = null) => {
    const next = value && typeof value === 'object' ? value : { left: [], right: [] };
    const left = Array.isArray(next.left) ? next.left : [];
    const right = Array.isArray(next.right) ? next.right : [];
    const preferredCount = Number.isFinite(Number(strikeCountOverride))
      ? Number(strikeCountOverride)
      : (left.length || right.length || 2);
    const count = Math.max(2, Math.min(4, sanitizeStrikeCount(preferredCount)));
    const normalizePoint = (point, fallbackX = 0, fallbackY = 0) => ({
      x: Number.isFinite(Number(point && point.x)) ? Number(point.x) : fallbackX,
      y: Number.isFinite(Number(point && point.y)) ? Number(point.y) : fallbackY
    });

    return {
      left: Array.from({ length: count }, (_, index) => normalizePoint(left[index], 0, 0)),
      right: Array.from({ length: count }, (_, index) => normalizePoint(right[index], 0, 0))
    };
  };

  const EXERCISE_FIELD_STRIKE_RADIUS_MIN = 20;
  const EXERCISE_FIELD_STRIKE_RADIUS_MAX = 60;

  const clampExerciseFieldStrikeRadius = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return EXERCISE_FIELD_STRIKE_RADIUS_MIN;
    }
    return Math.min(EXERCISE_FIELD_STRIKE_RADIUS_MAX, Math.max(EXERCISE_FIELD_STRIKE_RADIUS_MIN, next));
  };

  const readSavedSettings = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const enabled = stored.enabled;
      const scale = Number(stored.scale);
      const xOffset = Number(stored.xOffset);
      const strikeCount = Number(stored.strikeCount);
      const strikeRadius = Number(stored.strikeRadius);
      const fieldSide = stored.fieldSide === 'right' ? 'right' : 'left';
      const fieldVertical = stored.fieldVertical === 'bottom' ? 'bottom' : 'top';
      const fieldBeat = sanitizeAssignmentBeat(stored.fieldBeat, strikeCount || 2);
      const mode = stored.mode === 'tempo' ? 'tempo' : 'free';
      const bpm = Number(stored.tempoBpm);
      const metronomeEnabled = typeof stored.metronomeEnabled === 'boolean' ? stored.metronomeEnabled : false;
      return {
        enabled: typeof enabled === 'boolean' ? enabled : true,
        scale: Number.isFinite(scale) ? Math.min(1.25, Math.max(0.25, scale)) : 1,
        xOffset: Number.isFinite(xOffset) ? Math.min(1, Math.max(0, xOffset)) : 0,
        strikeCount: sanitizeStrikeCount(strikeCount),
        strikeRadius: clampExerciseFieldStrikeRadius(strikeRadius),
        fieldSide,
        fieldVertical,
        fieldBeat,
        mode,
        tempoBpm: Number.isFinite(bpm) ? Math.min(180, Math.max(30, bpm)) : 60,
        metronomeEnabled,
        strikePositions: sanitizeExerciseFieldStrikePositions(stored.strikePositions, sanitizeStrikeCount(strikeCount))
      };
    } catch (error) {
      return {
        enabled: true,
        scale: 1,
        xOffset: 0,
        strikeCount: 2,
        strikeRadius: EXERCISE_FIELD_STRIKE_RADIUS_MIN,
        fieldSide: 'left',
        fieldVertical: 'top',
        fieldBeat: 1,
        mode: 'free',
        tempoBpm: 60,
        metronomeEnabled: false,
        strikePositions: { left: [], right: [] }
      };
    }
  };

  const isPresetRunning = () => uiState.activeChapter === 6
    && Number.isInteger(uiState.activeLevel)
    && uiState.activeLevel >= 0
    && uiState.activeLevel <= 2;

  const getCurrentState = () => {
    const currentStrikeCount = Number.isFinite(Number(managerRef?.exerciseFieldStrikeCount))
      ? Number(managerRef.exerciseFieldStrikeCount)
      : getExerciseLevelStrikeCount(uiState.activeLevel ?? 0);
    return {
      enabled: isPresetRunning() || Boolean(toggleInput.checked),
      scale: Number(sizeSlider.value),
      xOffset: Number(xOffsetSlider.value),
      strikeCount: sanitizeStrikeCount(currentStrikeCount),
      strikeRadius: Number(circleSizeSlider.value),
      fieldSide: fieldSideInputs.find((input) => input.checked)?.value || 'left',
      fieldVertical: fieldVerticalInputs.find((input) => input.checked)?.value || 'top',
      fieldBeat: sanitizeAssignmentBeat(fieldBeatInputs.find((input) => input.checked)?.value ?? 1, sanitizeStrikeCount(currentStrikeCount)),
      mode: selectedMode === 'tempo' ? 'tempo' : 'free',
      tempoBpm: Number(challengeTempoSlider.value),
      metronomeEnabled: Boolean(metronomeToggle.checked),
      strikePositions: managerRef && managerRef.exerciseFieldStrikePositions ? {
        left: (managerRef.exerciseFieldStrikePositions.left || []).map((point) => ({ x: Number(point.x), y: Number(point.y) })),
        right: (managerRef.exerciseFieldStrikePositions.right || []).map((point) => ({ x: Number(point.x), y: Number(point.y) }))
      } : { left: [], right: [] }
    };
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(getCurrentState()));
    } catch (error) {
      // no-op: localStorage limits or privacy modes may block this safely
    }
  };

  const syncCircleSliderRange = () => {
    circleSizeSlider.min = String(EXERCISE_FIELD_STRIKE_RADIUS_MIN);
    circleSizeSlider.max = String(EXERCISE_FIELD_STRIKE_RADIUS_MAX);
  };

  const syncAssignmentBeatInputs = (strikeCount) => {
    const canonicalLevelStrikeCount = uiState.activeChapter === 6 && Number.isInteger(uiState.activeLevel)
      ? getExerciseFieldLevelStrikeCount(uiState.activeLevel)
      : null;
    const normalizedStrikeCount = sanitizeStrikeCount(canonicalLevelStrikeCount ?? strikeCount);
    const selectedBeat = sanitizeAssignmentBeat(
      fieldBeatInputs.find((input) => input.checked)?.value ?? 1,
      normalizedStrikeCount
    );

    fieldBeatGroup.innerHTML = '';
    fieldBeatInputs.length = 0;

    for (let value = 1; value <= normalizedStrikeCount; value += 1) {
      const option = document.createElement('label');
      option.className = 'figure-mode-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'exercise-field-assignment-beat';
      input.value = String(value);
      input.checked = value === selectedBeat;
      option.appendChild(input);
      option.appendChild(document.createTextNode(String(value)));
      fieldBeatGroup.appendChild(option);
      fieldBeatInputs.push(input);

      input.addEventListener('change', () => {
        if (!input.checked) {
          return;
        }
        const nextBeat = sanitizeAssignmentBeat(
          input.value,
          sanitizeStrikeCount(Number(managerRef?.exerciseFieldStrikeCount) || getExerciseLevelStrikeCount(uiState.activeLevel ?? 0))
        );
        managerRef?.setExerciseFieldAssignment?.({
          side: fieldSideInputs.find((item) => item.checked)?.value || 'left',
          vertical: fieldVerticalInputs.find((item) => item.checked)?.value || 'top',
          beatIndex: nextBeat
        });
        saveSettings();
      });
      bindUiDescription(option, 'Einsätze geben', 'Einsatz');
      bindUiDescription(input, 'Einsätze geben', 'Einsatz');
    }

    const currentBeatValue = sanitizeAssignmentBeat(
      fieldBeatInputs.find((input) => input.checked)?.value ?? selectedBeat,
      normalizedStrikeCount
    );
    fieldBeatInputs.forEach((input) => {
      input.checked = Number(input.value) === currentBeatValue;
    });
  };

  const setControlsFromState = (state) => {
    const safeState = state && typeof state === 'object' ? state : {};
    const forceVisible = isPresetRunning();
    const enabled = forceVisible || (typeof safeState.enabled === 'boolean' ? safeState.enabled : true);
    const scale = Number.isFinite(Number(safeState.scale)) ? Number(safeState.scale) : 1;
    const xOffset = Number.isFinite(Number(safeState.xOffset)) ? Number(safeState.xOffset) : 0;
    const strikeCount = uiState.activeChapter === 6 && Number.isInteger(uiState.activeLevel)
      ? getExerciseFieldLevelStrikeCount(uiState.activeLevel)
      : sanitizeStrikeCount(safeState.strikeCount ?? 2);
    const strikeRadius = clampExerciseFieldStrikeRadius(safeState.strikeRadius ?? EXERCISE_FIELD_STRIKE_RADIUS_MIN);
    const fieldSide = safeState.fieldSide === 'right' ? 'right' : 'left';
    const fieldVertical = safeState.fieldVertical === 'bottom' ? 'bottom' : 'top';
    const fieldBeat = sanitizeAssignmentBeat(safeState.fieldBeat ?? 1, strikeCount);
    const nextMode = safeState.mode === 'tempo' ? 'tempo' : 'free';
    const nextTempoBpm = Number.isFinite(Number(safeState.tempoBpm))
      ? Math.min(180, Math.max(30, Number(safeState.tempoBpm)))
      : 60;
    const nextMetronomeEnabled = typeof safeState.metronomeEnabled === 'boolean' ? safeState.metronomeEnabled : false;
    const strikePositions = sanitizeExerciseFieldStrikePositions(safeState.strikePositions, strikeCount);

    selectedMode = nextMode;
    challengeTempoSlider.value = String(nextTempoBpm);
    toggleInput.checked = Boolean(enabled);
    syncMetronomeUi(nextMetronomeEnabled);
    sizeSlider.value = String(Math.min(1.25, Math.max(0.25, scale)));
    xOffsetSlider.value = String(Math.min(1, Math.max(0, xOffset)));
    syncCircleSliderRange();
    circleSizeSlider.value = String(clampExerciseFieldStrikeRadius(strikeRadius));
    syncAssignmentBeatInputs(strikeCount);
    fieldSideInputs.forEach((input) => {
      input.checked = input.value === fieldSide;
    });
    fieldVerticalInputs.forEach((input) => {
      input.checked = input.value === fieldVertical;
    });
    fieldBeatInputs.forEach((input) => {
      input.checked = Number(input.value) === fieldBeat;
    });
    challengeModeInputs.forEach((input) => {
      input.checked = input.value === selectedMode;
    });
    challengeTempoValue.textContent = `${Math.round(Number(challengeTempoSlider.value))} bpm`;
    updateExerciseFieldModeUi();
    updateSizeValue();
    updateXOffsetValue();
    updateCircleSizeValue();

    managerRef?.setExerciseFieldVisible?.(Boolean(enabled));
    managerRef?.setExerciseFieldScale?.(Number(sizeSlider.value));
    managerRef?.setExerciseFieldXOffset?.(Number(xOffsetSlider.value));
    managerRef?.setExerciseFieldStrikeCount?.(strikeCount);
    managerRef?.setExerciseFieldStrikeRadius?.(Number(circleSizeSlider.value));
    managerRef?.setExerciseFieldAssignment?.({
      side: fieldSide,
      vertical: fieldVertical,
      beatIndex: fieldBeat
    });
    managerRef?.setExerciseFieldChallengeMode?.(selectedMode);
    managerRef?.setExerciseFieldTempoBpm?.(Number(challengeTempoSlider.value));
    managerRef?.setExerciseFieldMetronomeEnabled?.(nextMetronomeEnabled);
    managerRef?.setExerciseFieldStrikePositions?.(strikePositions);
  };

  const title = document.createElement('div');
  title.className = 'figure-side-panel-title';
  title.textContent = 'Einsatzfelder';
  panel.appendChild(title);

  const presetPanel = document.createElement('div');
  presetPanel.className = 'hand-independence-preset-panel';
  const presetHeader = document.createElement('div');
  presetHeader.className = 'hand-independence-preset-header';
  const presetTitle = document.createElement('div');
  presetTitle.className = 'figure-panel-section-title';
  presetTitle.textContent = 'Presets';
  const presetSlots = document.createElement('div');
  presetSlots.className = 'figure-preset-slots dynamic-figure-preset-slots';
  const presetActions = document.createElement('div');
  presetActions.className = 'dynamic-figure-preset-actions';
  const presetSaveButton = document.createElement('button');
  presetSaveButton.type = 'button';
  presetSaveButton.className = 'dynamic-figure-preset-action';
  presetSaveButton.textContent = 'Speichern';
  presetSaveButton.title = 'Aktuelle Einstellungen im Preset-Slot für diese Übung speichern';
  const presetResetButton = document.createElement('button');
  presetResetButton.type = 'button';
  presetResetButton.className = 'dynamic-figure-preset-action';
  presetResetButton.textContent = 'Zurücksetzen';
  presetResetButton.title = 'Die Presets für diese Übung auf Werkseinstellungen zurücksetzen';
  presetHeader.append(presetTitle);
  presetActions.append(presetSaveButton, presetResetButton);
  presetPanel.append(presetHeader, presetSlots, presetActions);
  panel.appendChild(presetPanel);

  let selectedPresetSlot = 0;
  const getPresetBucketForLevel = (exerciseLevel = uiState.activeLevel ?? 0) => {
    const safeLevel = Number.isInteger(Number(exerciseLevel)) ? Math.max(0, Math.min(2, Number(exerciseLevel))) : 0;
    const presets = readPresetMap();
    const bucket = presets[String(safeLevel)] || {};
    if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
      const slotKeys = ['0', '1', '2', '3'];
      const hasSlotData = slotKeys.some((key) => Object.prototype.hasOwnProperty.call(bucket, key));
      if (hasSlotData || Object.prototype.hasOwnProperty.call(bucket, 'selectedSlot')) {
        return bucket;
      }
      if (Object.prototype.hasOwnProperty.call(bucket, 'enabled') || Object.prototype.hasOwnProperty.call(bucket, 'scale') || Object.prototype.hasOwnProperty.call(bucket, 'strikeCount')) {
        return { selectedSlot: 0, '0': { ...bucket } };
      }
    }
    const nextBucket = { selectedSlot: 0 };
    presets[String(safeLevel)] = nextBucket;
    localStorage.setItem(presetsKey, JSON.stringify(presets));
    return nextBucket;
  };

  const renderPresetSlots = () => {
    const exerciseLevel = Number.isInteger(Number(uiState.activeLevel)) ? Math.max(0, Math.min(2, Number(uiState.activeLevel))) : 0;
    const presetBucket = getPresetBucketForLevel(exerciseLevel);
    const activeSlot = Number.isInteger(Number(presetBucket.selectedSlot)) ? Number(presetBucket.selectedSlot) : 0;
    selectedPresetSlot = Math.max(0, Math.min(3, activeSlot));
    presetSlots.innerHTML = '';
    for (let slot = 0; slot < 4; slot += 1) {
      const option = document.createElement('label');
      option.className = 'dynamic-figure-preset-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'exercise-field-preset';
      input.value = String(slot);
      input.checked = slot === selectedPresetSlot;
      input.addEventListener('change', () => {
        if (!input.checked) {
          return;
        }
        const currentExerciseLevel = Number.isInteger(Number(uiState.activeLevel)) ? Math.max(0, Math.min(2, Number(uiState.activeLevel))) : 0;
        const currentBucket = getPresetBucketForLevel(currentExerciseLevel);
        selectedPresetSlot = slot;
        currentBucket.selectedSlot = slot;
        const presets = readPresetMap();
        presets[String(currentExerciseLevel)] = currentBucket;
        localStorage.setItem(presetsKey, JSON.stringify(presets));
        const nextPreset = currentBucket[String(slot)];
        if (nextPreset && typeof nextPreset === 'object') {
          setControlsFromState(nextPreset);
        }
      });
      const caption = document.createElement('span');
      caption.textContent = String(slot + 1);
      option.append(input, caption);
      presetSlots.appendChild(option);
    }
  };

  presetSaveButton.addEventListener('click', () => {
    const savedSlot = savePresetFromPrompt();
    if (Number.isInteger(savedSlot)) {
      selectedPresetSlot = savedSlot;
      renderPresetSlots();
    }
  });

  presetResetButton.addEventListener('click', () => {
    const exerciseLevel = Number.isInteger(Number(uiState.activeLevel)) ? Math.max(0, Math.min(2, Number(uiState.activeLevel))) : 0;
    const presets = readPresetMap();
    presets[String(exerciseLevel)] = { selectedSlot: 0 };
    selectedPresetSlot = 0;
    localStorage.setItem(presetsKey, JSON.stringify(presets));
    renderPresetSlots();
  });

  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = readSavedSettings().enabled;
  toggleInput.style.display = 'none';
  toggleInput.setAttribute('aria-hidden', 'true');
  let selectedMode = readSavedSettings().mode === 'tempo' ? 'tempo' : 'free';

  const challengeModeWrap = document.createElement('div');
  challengeModeWrap.className = 'figure-side-group';
  const challengeModeTitle = document.createElement('div');
  challengeModeTitle.className = 'figure-size-label';
  challengeModeTitle.textContent = 'Modus';
  const challengeModeGroup = document.createElement('div');
  challengeModeGroup.className = 'figure-mode-group';
  const challengeModeInputs = ['free', 'tempo'].map((value) => {
    const option = document.createElement('label');
    option.className = 'figure-mode-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'exercise-field-challenge-mode';
    input.value = value;
    input.checked = selectedMode === value;
    const modeKey = value === 'free' ? 'ModusFrei' : 'ModusFestesTempo';
    bindUiDescription(input, 'Einsätze geben', modeKey);
    bindUiDescription(option, 'Einsätze geben', modeKey);
    option.appendChild(input);
    option.appendChild(document.createTextNode(value === 'free' ? 'Frei' : 'Festes Tempo'));
    challengeModeGroup.appendChild(option);
    return input;
  });
  const updateExerciseFieldModeUi = () => {
    challengeTempoWrap.style.display = selectedMode === 'tempo' ? '' : 'none';
    if (selectedMode === 'tempo') {
      challengeTempoWrap.style.display = '';
    } else {
      challengeTempoWrap.style.display = 'none';
    }
  };
  challengeModeWrap.appendChild(challengeModeTitle);
  challengeModeWrap.appendChild(challengeModeGroup);
  panel.appendChild(challengeModeWrap);

  const challengeTempoWrap = document.createElement('div');
  challengeTempoWrap.className = 'figure-size-wrap';
  const challengeTempoLabel = document.createElement('div');
  challengeTempoLabel.className = 'figure-size-label';
  challengeTempoLabel.textContent = 'Tempo';
  const challengeTempoSlider = document.createElement('input');
  challengeTempoSlider.type = 'range';
  challengeTempoSlider.min = '30';
  challengeTempoSlider.max = '180';
  challengeTempoSlider.step = '1';
  challengeTempoSlider.value = String(readSavedSettings().tempoBpm ?? 60);
  const challengeTempoValue = document.createElement('div');
  challengeTempoValue.className = 'figure-size-value';
  challengeTempoValue.textContent = `${Math.round(Number(challengeTempoSlider.value))} bpm`;
  challengeTempoWrap.appendChild(challengeTempoLabel);
  challengeTempoWrap.appendChild(challengeTempoSlider);
  challengeTempoWrap.appendChild(challengeTempoValue);
  panel.appendChild(challengeTempoWrap);
  challengeTempoWrap.style.display = selectedMode === 'tempo' ? '' : 'none';

  const metronomeWrap = document.createElement('div');
  metronomeWrap.className = 'figure-size-wrap';
  const metronomeLabel = document.createElement('div');
  metronomeLabel.className = 'figure-size-label';
  metronomeLabel.textContent = 'Metronom';

  const metronomeToggle = document.createElement('input');
  metronomeToggle.type = 'hidden';
  metronomeToggle.checked = Boolean(readSavedSettings().metronomeEnabled ?? false);

  const metronomeGroup = document.createElement('div');
  metronomeGroup.className = 'figure-mode-group';
  metronomeGroup.style.gridColumn = '1 / -1';

  const metronomeOffOption = document.createElement('button');
  metronomeOffOption.type = 'button';
  metronomeOffOption.className = 'figure-mode-option';
  metronomeOffOption.setAttribute('aria-pressed', String(!metronomeToggle.checked));
  metronomeOffOption.textContent = 'Aus';
  metronomeGroup.appendChild(metronomeOffOption);

  const metronomeOnOption = document.createElement('button');
  metronomeOnOption.type = 'button';
  metronomeOnOption.className = 'figure-mode-option';
  metronomeOnOption.setAttribute('aria-pressed', String(metronomeToggle.checked));
  metronomeOnOption.textContent = 'An';
  metronomeGroup.appendChild(metronomeOnOption);

  const metronomeOffInput = document.createElement('input');
  metronomeOffInput.type = 'hidden';
  metronomeOffInput.name = 'exercise-field-metronome';
  metronomeOffInput.value = 'off';
  metronomeOffInput.checked = !metronomeToggle.checked;
  metronomeOffOption.appendChild(metronomeOffInput);

  const metronomeOnInput = document.createElement('input');
  metronomeOnInput.type = 'hidden';
  metronomeOnInput.name = 'exercise-field-metronome';
  metronomeOnInput.value = 'on';
  metronomeOnInput.checked = metronomeToggle.checked;
  metronomeOnOption.appendChild(metronomeOnInput);

  const syncMetronomeUi = (enabled) => {
    metronomeToggle.checked = Boolean(enabled);
    metronomeOffInput.checked = !Boolean(enabled);
    metronomeOnInput.checked = Boolean(enabled);
    metronomeOffOption.setAttribute('aria-pressed', String(!Boolean(enabled)));
    metronomeOnOption.setAttribute('aria-pressed', String(Boolean(enabled)));
    metronomeOffOption.style.outline = !Boolean(enabled) ? '2px solid currentColor' : 'none';
    metronomeOnOption.style.outline = Boolean(enabled) ? '2px solid currentColor' : 'none';
  };

  metronomeWrap.appendChild(metronomeLabel);
  metronomeWrap.appendChild(metronomeGroup);
  panel.appendChild(metronomeWrap);
  bindUiDescription(metronomeLabel, 'Einsätze geben', 'Metronom');
  bindUiDescription(metronomeOffOption, 'Einsätze geben', 'Metronom');
  bindUiDescription(metronomeOnOption, 'Einsätze geben', 'Metronom');

  const sizeWrap = document.createElement('div');
  sizeWrap.className = 'figure-size-wrap';

  const sizeDivider = document.createElement('div');
  sizeDivider.style.gridColumn = '1 / -1';
  sizeDivider.style.gridRow = '1';
  sizeDivider.style.borderTop = '1px solid rgba(180, 220, 255, 0.35)';
  sizeDivider.style.marginBottom = '8px';
  sizeDivider.style.marginTop = '2px';
  sizeDivider.style.height = '0';

  const sizeLabel = document.createElement('div');
  sizeLabel.className = 'figure-size-label';
  sizeLabel.textContent = 'Grösse Einsatzfeld';
  sizeLabel.style.gridColumn = '1';
  sizeLabel.style.gridRow = '2';

  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '0.25';
  sizeSlider.max = '1.25';
  sizeSlider.step = '0.05';
  sizeSlider.value = String(readSavedSettings().scale);
  sizeSlider.style.gridColumn = '1 / -1';
  sizeSlider.style.gridRow = '3';

  const sizeValue = document.createElement('div');
  sizeValue.className = 'figure-size-value';
  sizeValue.textContent = '1.00x';
  sizeValue.style.gridColumn = '2';
  sizeValue.style.gridRow = '2';

  sizeWrap.appendChild(sizeDivider);
  sizeWrap.appendChild(sizeLabel);
  sizeWrap.appendChild(sizeSlider);
  sizeWrap.appendChild(sizeValue);
  panel.appendChild(sizeWrap);
  bindUiDescription(sizeLabel, 'Einsätze geben', 'Grösse Einsatzfeld');
  bindUiDescription(sizeSlider, 'Einsätze geben', 'Grösse Einsatzfeld');

  const xOffsetWrap = document.createElement('div');
  xOffsetWrap.className = 'figure-size-wrap';

  const xOffsetLabel = document.createElement('div');
  xOffsetLabel.className = 'figure-size-label';
  xOffsetLabel.textContent = 'X-Offset';

  const xOffsetSlider = document.createElement('input');
  xOffsetSlider.type = 'range';
  xOffsetSlider.min = '0';
  xOffsetSlider.max = '1';
  xOffsetSlider.step = '0.01';
  xOffsetSlider.value = String(readSavedSettings().xOffset ?? 0);

  const xOffsetValue = document.createElement('div');
  xOffsetValue.className = 'figure-size-value';
  xOffsetValue.textContent = '0.00';

  xOffsetWrap.appendChild(xOffsetLabel);
  xOffsetWrap.appendChild(xOffsetSlider);
  xOffsetWrap.appendChild(xOffsetValue);
  panel.appendChild(xOffsetWrap);
  bindUiDescription(xOffsetLabel, 'Einsätze geben', 'xOffset');
  bindUiDescription(xOffsetSlider, 'Einsätze geben', 'xOffset');

  const circleSizeWrap = document.createElement('div');
  circleSizeWrap.className = 'figure-size-wrap';

  const circleSizeLabel = document.createElement('div');
  circleSizeLabel.className = 'figure-size-label';
  circleSizeLabel.textContent = 'Kreisgröße';

  const currentCircleRadius = clampExerciseFieldStrikeRadius(readSavedSettings().strikeRadius ?? EXERCISE_FIELD_STRIKE_RADIUS_MIN);
  const circleSizeSlider = document.createElement('input');
  circleSizeSlider.type = 'range';
  circleSizeSlider.min = String(EXERCISE_FIELD_STRIKE_RADIUS_MIN);
  circleSizeSlider.max = String(EXERCISE_FIELD_STRIKE_RADIUS_MAX);
  circleSizeSlider.step = '1';
  circleSizeSlider.value = String(currentCircleRadius);

  const circleSizeValue = document.createElement('div');
  circleSizeValue.className = 'figure-size-value';
  circleSizeValue.textContent = `${currentCircleRadius}px`;

  circleSizeWrap.appendChild(circleSizeLabel);
  circleSizeWrap.appendChild(circleSizeSlider);
  circleSizeWrap.appendChild(circleSizeValue);
  panel.appendChild(circleSizeWrap);
  bindUiDescription(circleSizeLabel, 'Einsätze geben', 'Kreisgröße');
  bindUiDescription(circleSizeSlider, 'Einsätze geben', 'Kreisgröße');

  const fieldSideWrap = document.createElement('div');
  fieldSideWrap.className = 'figure-side-group';
  const fieldSideTitle = document.createElement('div');
  fieldSideTitle.className = 'figure-size-label';
  fieldSideTitle.textContent = 'Seite';
  fieldSideWrap.appendChild(fieldSideTitle);
  const fieldSideGroup = document.createElement('div');
  fieldSideGroup.className = 'figure-mode-group';
  const fieldSideInputs = ['left', 'right'].map((value) => {
    const option = document.createElement('label');
    option.className = 'figure-mode-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'exercise-field-side';
    input.value = value;
    input.checked = (readSavedSettings().fieldSide || 'left') === value;
    option.appendChild(input);
    option.appendChild(document.createTextNode(value === 'left' ? 'links' : 'rechts'));
    fieldSideGroup.appendChild(option);
    return input;
  });
  fieldSideWrap.appendChild(fieldSideGroup);
  panel.appendChild(fieldSideWrap);
  bindUiDescription(fieldSideTitle, 'Einsätze geben', 'Seite');
  fieldSideInputs.forEach((input) => bindUiDescription(input, 'Einsätze geben', 'Seite'));
  bindUiGroupDescription([...fieldSideGroup.querySelectorAll('label, input')], 'Einsätze geben', 'Seite');

  const fieldVerticalWrap = document.createElement('div');
  fieldVerticalWrap.className = 'figure-side-group';
  const fieldVerticalTitle = document.createElement('div');
  fieldVerticalTitle.className = 'figure-size-label';
  fieldVerticalTitle.textContent = 'Position';
  fieldVerticalWrap.appendChild(fieldVerticalTitle);
  const fieldVerticalGroup = document.createElement('div');
  fieldVerticalGroup.className = 'figure-mode-group';
  const fieldVerticalInputs = ['top', 'bottom'].map((value) => {
    const option = document.createElement('label');
    option.className = 'figure-mode-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'exercise-field-vertical';
    input.value = value;
    input.checked = (readSavedSettings().fieldVertical || 'top') === value;
    option.appendChild(input);
    option.appendChild(document.createTextNode(value === 'top' ? 'oben' : 'unten'));
    fieldVerticalGroup.appendChild(option);
    return input;
  });
  fieldVerticalWrap.appendChild(fieldVerticalGroup);
  panel.appendChild(fieldVerticalWrap);
  bindUiDescription(fieldVerticalTitle, 'Einsätze geben', 'Position');
  fieldVerticalInputs.forEach((input) => bindUiDescription(input, 'Einsätze geben', 'Position'));
  bindUiGroupDescription([...fieldVerticalGroup.querySelectorAll('label, input')], 'Einsätze geben', 'Position');

  const fieldBeatWrap = document.createElement('div');
  fieldBeatWrap.className = 'figure-side-group';
  const fieldBeatTitle = document.createElement('div');
  fieldBeatTitle.className = 'figure-size-label';
  fieldBeatTitle.textContent = 'Einsatz';
  fieldBeatWrap.appendChild(fieldBeatTitle);
  const fieldBeatGroup = document.createElement('div');
  fieldBeatGroup.className = 'figure-mode-group';
  const fieldBeatInputs = [];
  fieldBeatWrap.appendChild(fieldBeatGroup);
  panel.appendChild(fieldBeatWrap);
  bindUiDescription(fieldBeatTitle, 'Einsätze geben', 'Einsatz');
  bindUiGroupDescription([...fieldBeatGroup.querySelectorAll('label, input')], 'Einsätze geben', 'Einsatz');
  syncAssignmentBeatInputs(readSavedSettings().strikeCount || 2);

  const updateSizeValue = () => {
    const next = Number(sizeSlider.value);
    sizeValue.textContent = `${Number.isFinite(next) ? next.toFixed(2) : '1.00'}x`;
  };

  const updateXOffsetValue = () => {
    const next = Number(xOffsetSlider.value);
    xOffsetValue.textContent = Number.isFinite(next) ? next.toFixed(2) : '0.00';
  };

  const updateCircleSizeValue = () => {
    const next = Number(circleSizeSlider.value);
    circleSizeValue.textContent = Number.isFinite(next) ? `${Math.round(next)}px` : '12px';
  };

  challengeModeInputs.forEach((input) => {
    input.addEventListener('pointerdown', () => {
      if (!input.checked && input.value === 'tempo' && metronomeOnInput.checked) {
        managerRef?.resumeExerciseFieldMetronomeAudio?.();
      }
    });

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }

      const nextMode = input.value === 'tempo' ? 'tempo' : 'free';
      const metronomeWasOn = metronomeOnInput.checked;
      selectedMode = nextMode;
      updateExerciseFieldModeUi();

      if (nextMode === 'tempo' && metronomeWasOn) {
        managerRef?.resumeExerciseFieldMetronomeAudio?.();
      }

      managerRef?.setExerciseFieldChallengeMode?.(selectedMode);
      saveSettings();
    });
  });

  challengeTempoSlider.addEventListener('input', () => {
    const nextBpm = Number.isFinite(Number(challengeTempoSlider.value))
      ? Math.min(180, Math.max(30, Number(challengeTempoSlider.value)))
      : 60;
    challengeTempoSlider.value = String(nextBpm);
    challengeTempoValue.textContent = `${Math.round(nextBpm)} bpm`;
    managerRef?.setExerciseFieldTempoBpm?.(nextBpm);
    saveSettings();
  });

  const activateMetronomeButton = (enabled) => {
    syncMetronomeUi(enabled);
    if (enabled) {
      managerRef?.resumeExerciseFieldMetronomeAudio?.();
    }
    managerRef?.setExerciseFieldMetronomeEnabled?.(enabled);
    saveSettings();
  };

  metronomeOffOption.addEventListener('click', () => {
    activateMetronomeButton(false);
  });

  metronomeOnOption.addEventListener('click', () => {
    activateMetronomeButton(true);
    if (selectedMode === 'tempo') {
      managerRef?.resumeExerciseFieldMetronomeAudio?.();
      managerRef?.setExerciseFieldMetronomeEnabled?.(true);
      managerRef?.setExerciseFieldChallengeMode?.('tempo');
    }
  });

  toggleInput.addEventListener('change', () => {
    const visible = toggleInput.checked;
    managerRef?.setExerciseFieldVisible?.(visible);
    saveSettings();
  });

  sizeSlider.addEventListener('input', () => {
    updateSizeValue();
    managerRef?.setExerciseFieldScale?.(Number(sizeSlider.value));
    saveSettings();
  });

  xOffsetSlider.addEventListener('input', () => {
    updateXOffsetValue();
    managerRef?.setExerciseFieldXOffset?.(Number(xOffsetSlider.value));
    saveSettings();
  });

  circleSizeSlider.addEventListener('input', () => {
    const minimum = EXERCISE_FIELD_STRIKE_RADIUS_MIN;
    const maximum = EXERCISE_FIELD_STRIKE_RADIUS_MAX;
    const currentValue = Number(circleSizeSlider.value);
    const nextValue = Math.min(maximum, Math.max(minimum, currentValue));
    circleSizeSlider.value = String(nextValue);
    updateCircleSizeValue();
    managerRef?.setExerciseFieldStrikeRadius?.(nextValue);
    saveSettings();
  });

  fieldSideInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      managerRef?.setExerciseFieldAssignment?.({
        side: input.value,
        vertical: fieldVerticalInputs.find((item) => item.checked)?.value || 'top',
        beatIndex: sanitizeAssignmentBeat(fieldBeatInputs.find((item) => item.checked)?.value ?? 1, sanitizeStrikeCount(Number(managerRef?.exerciseFieldStrikeCount) || getExerciseLevelStrikeCount(uiState.activeLevel ?? 0)))
      });
      saveSettings();
    });
  });

  fieldVerticalInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      managerRef?.setExerciseFieldAssignment?.({
        side: fieldSideInputs.find((item) => item.checked)?.value || 'left',
        vertical: input.value,
        beatIndex: sanitizeAssignmentBeat(fieldBeatInputs.find((item) => item.checked)?.value ?? 1, sanitizeStrikeCount(Number(managerRef?.exerciseFieldStrikeCount) || getExerciseLevelStrikeCount(uiState.activeLevel ?? 0)))
      });
      saveSettings();
    });
  });

  const applyPreset = (exerciseLevel = uiState.activeLevel ?? 0, slotOverride = null) => {
    const normalizedLevel = Number.isInteger(Number(exerciseLevel)) ? Math.max(0, Math.min(2, Number(exerciseLevel))) : 0;
    const presetBucket = getPresetBucketForLevel(normalizedLevel);
    const normalizedSlot = Number.isInteger(Number(slotOverride)) ? Number(slotOverride) : Number(presetBucket.selectedSlot);
    const activeSlot = Number.isInteger(normalizedSlot) && normalizedSlot >= 0 && normalizedSlot <= 3 ? normalizedSlot : 0;
    const preset = presetBucket[String(activeSlot)] || {};
    const currentSettings = readSavedSettings();
    const fallbackStrikeCount = getExerciseLevelStrikeCount(normalizedLevel);
    const strikeCount = fallbackStrikeCount;
    const savedStrikePositions = sanitizeExerciseFieldStrikePositions(
      preset.strikePositions ?? currentSettings.strikePositions,
      strikeCount
    );
    const nextState = {
      enabled: typeof preset.enabled === 'boolean' ? preset.enabled : currentSettings.enabled,
      scale: Number.isFinite(Number(preset.scale)) ? Number(preset.scale) : currentSettings.scale,
      xOffset: Number.isFinite(Number(preset.xOffset)) ? Number(preset.xOffset) : currentSettings.xOffset,
      strikeCount,
      strikeRadius: Number.isFinite(Number(preset.strikeRadius)) ? Number(preset.strikeRadius) : currentSettings.strikeRadius,
      fieldSide: preset.fieldSide === 'right' ? 'right' : 'left',
      fieldVertical: preset.fieldVertical === 'bottom' ? 'bottom' : 'top',
      fieldBeat: sanitizeAssignmentBeat(preset.fieldBeat ?? currentSettings.fieldBeat ?? 1, strikeCount),
      mode: preset.mode === 'tempo' ? 'tempo' : 'free',
      tempoBpm: Number.isFinite(Number(preset.tempoBpm)) ? Math.min(180, Math.max(30, Number(preset.tempoBpm))) : (Number.isFinite(Number(currentSettings.tempoBpm)) ? Number(currentSettings.tempoBpm) : 60),
      metronomeEnabled: typeof preset.metronomeEnabled === 'boolean' ? preset.metronomeEnabled : (typeof currentSettings.metronomeEnabled === 'boolean' ? currentSettings.metronomeEnabled : false),
      strikePositions: savedStrikePositions
    };

    setControlsFromState(nextState);
    selectedPresetSlot = activeSlot;
    renderPresetSlots();
    return true;
  };

  const savePresetFromPrompt = () => {
    const requestedSlot = window.prompt('In welchen Preset-Slot möchten Sie die aktuellen Einstellungen speichern? (1-4)', String(selectedPresetSlot + 1));
    const slot = Number(requestedSlot);
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
      return null;
    }

    const exerciseLevel = Number.isInteger(Number(uiState.activeLevel)) ? Math.max(0, Math.min(2, Number(uiState.activeLevel))) : 0;
    const presetBucket = getPresetBucketForLevel(exerciseLevel);
    const presetIndex = slot - 1;
    presetBucket[String(presetIndex)] = getCurrentState();
    presetBucket.selectedSlot = presetIndex;
    const presets = readPresetMap();
    presets[String(exerciseLevel)] = presetBucket;
    localStorage.setItem(presetsKey, JSON.stringify(presets));
    selectedPresetSlot = presetIndex;
    renderPresetSlots();
    return presetIndex;
  };

  const resetPresets = async () => {
    const confirmed = window.confirm('Möchtest du die Presets für das Kapitel „Einsätze geben“ wirklich auf die Werkseinstellungen zurücksetzen?');
    if (!confirmed) {
      return false;
    }

    try {
      const response = await fetch('./motionai-defaults.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const defaults = json && typeof json === 'object' ? json : {};
      const nextPanelSettings = defaults['motionai.exercise-field-panel-settings'] || {
        enabled: true,
        scale: 1,
        xOffset: 0,
        strikeCount: 2,
        strikeRadius: 12,
        fieldSide: 'left',
        fieldVertical: 'top',
        fieldBeat: 1,
        mode: 'free',
        tempoBpm: 60,
        metronomeEnabled: false
      };
      const nextPresets = defaults['motionai.exercise-field-presets'] || {};
      const activeExerciseLevel = Number.isInteger(uiState?.activeLevel) && uiState.activeLevel >= 0 && uiState.activeLevel <= 2
        ? uiState.activeLevel
        : 0;
      const resetBucket = { selectedSlot: 0 };
      const defaultsBucket = nextPresets[String(activeExerciseLevel)] || { selectedSlot: 0 };
      const activePreset = defaultsBucket[String(Number(defaultsBucket.selectedSlot ?? 0))] || defaultsBucket['0'] || nextPanelSettings || {};

      localStorage.setItem(storageKey, JSON.stringify({
        enabled: typeof nextPanelSettings.enabled === 'boolean' ? nextPanelSettings.enabled : true,
        scale: Number.isFinite(Number(nextPanelSettings.scale)) ? Number(nextPanelSettings.scale) : 1,
        xOffset: Number.isFinite(Number(nextPanelSettings.xOffset)) ? Number(nextPanelSettings.xOffset) : 0,
        strikeCount: sanitizeStrikeCount(nextPanelSettings.strikeCount ?? 2),
        strikeRadius: Number.isFinite(Number(nextPanelSettings.strikeRadius)) ? Number(nextPanelSettings.strikeRadius) : 12,
        fieldSide: nextPanelSettings.fieldSide === 'right' ? 'right' : 'left',
        fieldVertical: nextPanelSettings.fieldVertical === 'bottom' ? 'bottom' : 'top',
        fieldBeat: sanitizeAssignmentBeat(nextPanelSettings.fieldBeat ?? 1, sanitizeStrikeCount(nextPanelSettings.strikeCount ?? 2)),
        mode: nextPanelSettings.mode === 'tempo' ? 'tempo' : 'free',
        tempoBpm: Number.isFinite(Number(nextPanelSettings.tempoBpm)) ? Math.min(180, Math.max(30, Number(nextPanelSettings.tempoBpm))) : 60
      }));
      const nextPresetMap = readPresetMap();
      nextPresetMap[String(activeExerciseLevel)] = { ...resetBucket, ...defaultsBucket, selectedSlot: 0 };
      localStorage.setItem(presetsKey, JSON.stringify(nextPresetMap));

      setControlsFromState({
        enabled: typeof activePreset.enabled === 'boolean' ? activePreset.enabled : true,
        scale: Number.isFinite(Number(activePreset.scale)) ? Number(activePreset.scale) : 1,
        xOffset: Number.isFinite(Number(activePreset.xOffset)) ? Number(activePreset.xOffset) : 0,
        strikeCount: sanitizeStrikeCount(activePreset.strikeCount ?? 2),
        strikeRadius: Number.isFinite(Number(activePreset.strikeRadius)) ? Number(activePreset.strikeRadius) : 12,
        fieldSide: activePreset.fieldSide === 'right' ? 'right' : 'left',
        fieldVertical: activePreset.fieldVertical === 'bottom' ? 'bottom' : 'top',
        fieldBeat: sanitizeAssignmentBeat(activePreset.fieldBeat ?? 1, sanitizeStrikeCount(activePreset.strikeCount ?? 2)),
        mode: activePreset.mode === 'tempo' ? 'tempo' : 'free',
        tempoBpm: Number.isFinite(Number(activePreset.tempoBpm)) ? Math.min(180, Math.max(30, Number(activePreset.tempoBpm))) : 60,
        strikePositions: sanitizeExerciseFieldStrikePositions(activePreset.strikePositions || {}, sanitizeStrikeCount(activePreset.strikeCount ?? 2))
      });
      applyPreset(activeExerciseLevel, 0);
      window.alert('Die Presets für das Kapitel „Einsätze geben“ wurden auf die Werkseinstellungen zurückgesetzt.');
      return true;
    } catch (error) {
      console.error('Failed to load exercise field defaults:', error);
      window.alert('Die Werkseinstellungen für das Kapitel „Einsätze geben“ konnten nicht geladen werden.');
      return false;
    }
  };

  attachPanelHoverHelp(panel);

  return {
    panel,
    isEnabled: () => Boolean(toggleInput.checked),
    setVisible: (visible) => {
      panel.classList.toggle('hidden', !visible);
    },
    setLevelManager: (manager) => {
      managerRef = manager || null;
      if (!managerRef) {
        return;
      }
      const savedSettings = readSavedSettings();
      const restoredScale = Number.isFinite(savedSettings.scale) ? savedSettings.scale : 1;
      const restoredOffset = Number.isFinite(savedSettings.xOffset) ? savedSettings.xOffset : 0;
      const restoredEnabled = typeof savedSettings.enabled === 'boolean' ? savedSettings.enabled : true;
      const restoredStrikeCount = uiState.activeChapter === 6 && Number.isInteger(uiState.activeLevel)
        ? getExerciseFieldLevelStrikeCount(uiState.activeLevel)
        : sanitizeStrikeCount(savedSettings.strikeCount ?? 2);
      const restoredStrikeRadius = clampExerciseFieldStrikeRadius(savedSettings.strikeRadius ?? EXERCISE_FIELD_STRIKE_RADIUS_MIN);
      const restoredFieldSide = savedSettings.fieldSide === 'right' ? 'right' : 'left';
      const restoredFieldVertical = savedSettings.fieldVertical === 'bottom' ? 'bottom' : 'top';
      const restoredFieldBeat = sanitizeAssignmentBeat(savedSettings.fieldBeat, restoredStrikeCount);

      const liveExerciseFieldScale = Number.isFinite(Number(managerRef.exerciseFieldScale))
        ? Number(managerRef.exerciseFieldScale)
        : restoredScale;
      const liveExerciseFieldXOffset = Number.isFinite(Number(managerRef.exerciseFieldXOffset))
        ? Number(managerRef.exerciseFieldXOffset)
        : restoredOffset;
      const liveExerciseFieldVisible = typeof managerRef.exerciseFieldVisible === 'boolean'
        ? managerRef.exerciseFieldVisible
        : restoredEnabled;
      const liveExerciseFieldStrikeRadius = clampExerciseFieldStrikeRadius(Number.isFinite(Number(managerRef.exerciseFieldStrikeRadius))
        ? Number(managerRef.exerciseFieldStrikeRadius)
        : restoredStrikeRadius);

      managerRef.setExerciseFieldScale?.(Math.min(1.25, Math.max(0.25, liveExerciseFieldScale)));
      managerRef.setExerciseFieldXOffset?.(Math.min(1, Math.max(0, liveExerciseFieldXOffset)));
      managerRef.setExerciseFieldVisible?.(liveExerciseFieldVisible);
      managerRef.setExerciseFieldStrikeCount?.(restoredStrikeCount);
      managerRef.setExerciseFieldStrikeRadius?.(liveExerciseFieldStrikeRadius);
      managerRef.setExerciseFieldAssignment?.({
        side: restoredFieldSide,
        vertical: restoredFieldVertical,
        beatIndex: restoredFieldBeat
      });

      const value = Number.isFinite(Number(savedSettings.scale))
        ? Number(savedSettings.scale)
        : Number(managerRef.exerciseFieldScale);
      const enabled = typeof savedSettings.enabled === 'boolean'
        ? savedSettings.enabled
        : Boolean(managerRef.exerciseFieldVisible);
      const offset = Number.isFinite(Number(savedSettings.xOffset))
        ? Number(savedSettings.xOffset)
        : Number(managerRef.exerciseFieldXOffset);
      const strikeRadiusValue = clampExerciseFieldStrikeRadius(Number.isFinite(Number(savedSettings.strikeRadius)) ? Number(savedSettings.strikeRadius) : Number(managerRef.exerciseFieldStrikeRadius));
      const mode = savedSettings.mode === 'tempo' ? 'tempo' : 'free';
      selectedMode = mode;
      challengeTempoSlider.value = String(Number.isFinite(Number(savedSettings.tempoBpm)) ? Math.min(180, Math.max(30, Number(savedSettings.tempoBpm))) : 60);
      challengeTempoValue.textContent = `${Math.round(Number(challengeTempoSlider.value))} bpm`;

      sizeSlider.value = String(Math.min(1.25, Math.max(0.25, value)));
      updateSizeValue();
      xOffsetSlider.value = String(Math.min(1, Math.max(0, offset)));
      updateXOffsetValue();
      syncCircleSliderRange();
      circleSizeSlider.value = String(clampExerciseFieldStrikeRadius(strikeRadiusValue));
      updateCircleSizeValue();
      toggleInput.checked = Boolean(enabled);
      challengeModeInputs.forEach((input) => {
        input.checked = input.value === selectedMode;
      });
      syncAssignmentBeatInputs(restoredStrikeCount);
      fieldSideInputs.forEach((input) => {
        input.checked = input.value === restoredFieldSide;
      });
      fieldVerticalInputs.forEach((input) => {
        input.checked = input.value === restoredFieldVertical;
      });
      fieldBeatInputs.forEach((input) => {
        input.checked = Number(input.value) === restoredFieldBeat;
      });
      managerRef.setExerciseFieldScale?.(Number(sizeSlider.value));
      managerRef.setExerciseFieldVisible?.(true);
      managerRef.setExerciseFieldXOffset?.(Number(xOffsetSlider.value));
      managerRef.setExerciseFieldStrikeCount?.(restoredStrikeCount);
      managerRef.setExerciseFieldStrikeRadius?.(Number(circleSizeSlider.value));
      managerRef.setExerciseFieldAssignment?.({
        side: restoredFieldSide,
        vertical: restoredFieldVertical,
        beatIndex: restoredFieldBeat
      });
      managerRef.setExerciseFieldChallengeMode?.(selectedMode);
      managerRef.setExerciseFieldTempoBpm?.(Number(challengeTempoSlider.value));
      managerRef.setExerciseFieldStrikePositions?.(savedSettings.strikePositions || { left: [], right: [] });
      saveSettings();
    },
    setToggle: (enabled) => {
      toggleInput.checked = Boolean(enabled);
      managerRef?.setExerciseFieldVisible?.(toggleInput.checked);
      saveSettings();
    },
    getChallengeMetrics: () => managerRef?.getExerciseFieldMetrics?.() || {
      mode: selectedMode,
      tempoBpm: Number(challengeTempoSlider.value),
      accuracy: 0,
      activeIndex: 0,
      strikeCount: sanitizeStrikeCount(Number(managerRef?.exerciseFieldStrikeCount) || getExerciseLevelStrikeCount(uiState.activeLevel ?? 0))
    },
    setScale: (value) => {
      const next = Number(value);
      const clamped = Number.isFinite(next) ? Math.min(1.25, Math.max(0.25, next)) : 1;
      sizeSlider.value = String(clamped);
      updateSizeValue();
      managerRef?.setExerciseFieldScale?.(clamped);
      saveSettings();
    },
    setXOffset: (value) => {
      const next = Number(value);
      const clamped = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 0;
      xOffsetSlider.value = String(clamped);
      updateXOffsetValue();
      managerRef?.setExerciseFieldXOffset?.(clamped);
      saveSettings();
    },
    setStrikeCount: (value) => {
      const canonicalLevelStrikeCount = uiState.activeChapter === 6 && Number.isInteger(uiState.activeLevel)
        ? getExerciseFieldLevelStrikeCount(uiState.activeLevel)
        : null;
      const nextValue = sanitizeStrikeCount(canonicalLevelStrikeCount ?? value);
      syncAssignmentBeatInputs(nextValue);
      managerRef?.setExerciseFieldStrikeCount?.(nextValue);
      saveSettings();
    },
    setStrikeRadius: (value) => {
      const nextValue = Number(value);
      const clamped = clampExerciseFieldStrikeRadius(Number.isFinite(nextValue) ? nextValue : EXERCISE_FIELD_STRIKE_RADIUS_MIN);
      syncCircleSliderRange();
      circleSizeSlider.value = String(clamped);
      updateCircleSizeValue();
      managerRef?.setExerciseFieldStrikeRadius?.(clamped);
      saveSettings();
    },
    applyPreset,
    savePresetFromPrompt,
    resetPresets
  };
}

function createSquareExercisePanel() {
  const panel = document.createElement('aside');
  panel.className = 'figure-side-panel hidden square-exercise-panel';
  const storageKey = 'motionai.square-exercise-panel-settings';
  let managerRef = null;
  let settings = {};
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    settings = stored && typeof stored === 'object' ? stored : {};
  } catch (error) {
    settings = {};
  }

  let selectedHandMode = ['right', 'left', 'both'].includes(settings.handMode) ? settings.handMode : 'right';
  let selectedResolution = Number.isFinite(Number(settings.resolution))
    ? Math.min(1.0, Math.max(0.55, Number(settings.resolution)))
    : 1.0;
  let selectedGridResolution = Number.isFinite(Number(settings.gridResolution))
    ? Math.max(8, Math.min(24, Math.round(Number(settings.gridResolution) / 2) * 2))
    : 8;
  let selectedCenterDistance = Number.isFinite(Number(settings.centerDistance))
    ? Math.min(1.0, Math.max(0.1, Number(settings.centerDistance)))
    : 0.5;
  let selectedShape = ['0', '1', '2', '3', '4', '5'].includes(settings.shape) ? settings.shape : '0';
  let selectedSyncMode = ['asynchronous', 'synchronous'].includes(settings.syncMode) ? settings.syncMode : 'asynchronous';
  let selectedAlternatingScale = ['chromatic', 'major', 'pentatonic'].includes(settings.alternatingScale) ? settings.alternatingScale : 'chromatic';
  let selectedAlternatingStartNote = Number.isFinite(Number(settings.alternatingStartNote))
    ? Math.max(36, Math.min(60, Math.round(Number(settings.alternatingStartNote))))
    : 36;
  let selectedAlternatingVolume = Number.isFinite(Number(settings.alternatingVolume))
    ? Math.max(0, Math.min(1, Number(settings.alternatingVolume)))
    : 0;
  let selectedActiveTouchFadeEnabled = typeof settings.activeTouchFadeEnabled === 'boolean'
    ? settings.activeTouchFadeEnabled
    : true;
  let selectedAlternatingFrequencyModulation = Boolean(settings.alternatingFrequencyModulation);
  let selectedAlternatingAxisSwap = Boolean(settings.alternatingAxisSwap);
  let pointEditMode = Boolean(settings.pointEditMode);
  let pointSequence = Array.isArray(settings.pointSequence) ? settings.pointSequence : [];
  let pointSequenceMode = ['independent', 'sequential', 'simultaneous'].includes(settings.pointSequenceMode)
    ? settings.pointSequenceMode
    : (typeof settings.pointSequenceMode === 'boolean' ? (settings.pointSequenceMode ? 'sequential' : 'independent') : 'sequential');
  let pointSymmetryMode = Boolean(settings.pointSymmetryMode);
  let pointPalindromMode = Boolean(settings.pointPalindromMode || settings.pointPalindromeMode);

  const normalizePointSequenceMode = (value) => {
    if (['independent', 'sequential', 'simultaneous'].includes(value)) {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'sequential' : 'independent';
    }
    return 'sequential';
  };

  const normalizePointSlot = (value) => {
    const next = Number(value);
    if (!Number.isInteger(next)) {
      return 1;
    }
    if (next >= 1 && next <= 8) {
      return next;
    }
    if (next >= 0 && next <= 7) {
      return next + 1;
    }
    return 1;
  };

  let pointSelectedSlot = normalizePointSlot(settings.pointSelectedSlot);
  let pointSelectedHand = ['left', 'right', 'auto'].includes(settings.pointHand) ? settings.pointHand : 'right';
  let pointSavedSlots = {};

  const pointStorageKey = 'motionai.point-exercise-saved-slots';
  const pointSessionStorageKey = `${storageKey}-points`;

  const debugPointPresetLog = (label, payload) => {
    console.log(`[Point Preset Debug] ${label}`, JSON.parse(JSON.stringify(payload)));
  };

  const sanitizePointSequence = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized = [];
    const seen = new Set();
    value.forEach((point) => {
      if (!point || !Number.isFinite(Number(point.row)) || !Number.isFinite(Number(point.col))) {
        return;
      }
      const row = Number(point.row);
      const col = Number(point.col);
      const hand = ['left', 'right'].includes(point.hand) ? point.hand : (pointSelectedHand === 'auto' ? 'right' : pointSelectedHand);
      const key = `${row}:${col}:${hand}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      normalized.push({ row, col, hand });
    });
    return normalized;
  };

  const restoreAbsolutePointSequence = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }
    const restored = [];
    const seen = new Set();
    value.forEach((point) => {
      if (!point || !Number.isFinite(Number(point.row)) || !Number.isFinite(Number(point.col))) {
        return;
      }
      const row = Number(point.row);
      const col = Number(point.col);
      const hand = ['left', 'right', 'auto'].includes(point.hand) ? point.hand : pointSelectedHand;
      const key = `${row}:${col}:${hand}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      restored.push({ row, col, hand });
    });
    return restored;
  };

  const resolvePointPresetSequence = (value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === 'object') {
      if (Array.isArray(value.sequence)) {
        return value.sequence;
      }
      if (Array.isArray(value.points)) {
        return value.points;
      }
    }
    return [];
  };

  const normalizePointPresetEntry = (value) => {
    if (Array.isArray(value)) {
      return {
        sequence: restoreAbsolutePointSequence(value),
        gridResolution: selectedGridResolution,
        resolution: selectedResolution,
        hand: pointSelectedHand,
        sequentialMode: pointSequenceMode,
        palindromMode: pointPalindromMode
      };
    }
    if (value && typeof value === 'object') {
      const sequence = restoreAbsolutePointSequence(resolvePointPresetSequence(value));
      const gridResolution = Number.isFinite(Number(value.gridResolution))
        ? Math.max(8, Math.min(24, Math.round(Number(value.gridResolution) / 2) * 2))
        : selectedGridResolution;
      const resolution = Number.isFinite(Number(value.resolution))
        ? Math.min(1.0, Math.max(0.55, Number(value.resolution)))
        : selectedResolution;
      const hand = ['left', 'right', 'auto'].includes(value.hand) ? value.hand : pointSelectedHand;
      const sequentialMode = normalizePointSequenceMode(typeof value.sequentialMode === 'boolean' || typeof value.sequentialMode === 'string' ? value.sequentialMode : (typeof value.sequenceMode === 'boolean' || typeof value.sequenceMode === 'string' ? value.sequenceMode : pointSequenceMode));
      const palindromMode = typeof value.palindromMode === 'boolean'
        ? value.palindromMode
        : (typeof value.palindromeMode === 'boolean' ? value.palindromeMode : pointPalindromMode);
      return { sequence, gridResolution, resolution, hand, sequentialMode, palindromMode };
    }
    return { sequence: [], gridResolution: selectedGridResolution, resolution: selectedResolution, hand: pointSelectedHand, sequentialMode: pointSequenceMode, palindromMode: pointPalindromMode };
  };

  const readStoredPointSlots = () => {
    try {
      const storedSlots = JSON.parse(localStorage.getItem(pointStorageKey) || '{}');
      if (storedSlots && typeof storedSlots === 'object') {
        return Object.fromEntries(
          Object.entries(storedSlots).map(([key, value]) => [normalizePointSlot(key), normalizePointPresetEntry(value)])
        );
      }
    } catch (error) {
      return {};
    }
    return {};
  };

  const readStoredPointPanelState = () => {
    try {
      const storedState = JSON.parse(localStorage.getItem(pointSessionStorageKey) || '{}');
      if (storedState && typeof storedState === 'object') {
        return storedState;
      }
    } catch (error) {
      return {};
    }
    return {};
  };

  pointSavedSlots = readStoredPointSlots();
  const storedPointPanelState = readStoredPointPanelState();
  if (Number.isInteger(Number(storedPointPanelState.pointSelectedSlot))) {
    pointSelectedSlot = normalizePointSlot(storedPointPanelState.pointSelectedSlot);
  }
  if (typeof storedPointPanelState.pointEditMode === 'boolean') {
    pointEditMode = storedPointPanelState.pointEditMode;
  }
  if (['left', 'right', 'auto'].includes(storedPointPanelState.pointSelectedHand)) {
    pointSelectedHand = storedPointPanelState.pointSelectedHand;
  }
  if (Array.isArray(storedPointPanelState.pointSequence)) {
    pointSequence = sanitizePointSequence(storedPointPanelState.pointSequence);
  }
  if (typeof storedPointPanelState.pointSequenceMode === 'boolean' || typeof storedPointPanelState.pointSequenceMode === 'string') {
    pointSequenceMode = normalizePointSequenceMode(storedPointPanelState.pointSequenceMode);
  }
  if (typeof storedPointPanelState.pointSymmetryMode === 'boolean') {
    pointSymmetryMode = storedPointPanelState.pointSymmetryMode;
  }
  if (typeof storedPointPanelState.pointPalindromMode === 'boolean' || typeof storedPointPanelState.pointPalindromeMode === 'boolean') {
    pointPalindromMode = Boolean(storedPointPanelState.pointPalindromMode ?? storedPointPanelState.pointPalindromeMode);
  }
  const savedSelectedPreset = normalizePointPresetEntry(pointSavedSlots[pointSelectedSlot]);
  const savedSelectedSequence = resolvePointPresetSequence(savedSelectedPreset);
  if (!pointEditMode && savedSelectedSequence.length > 0) {
    pointSequence = sanitizePointSequence(savedSelectedSequence);
  }

  const persistPointState = () => {
    try {
      localStorage.setItem(pointStorageKey, JSON.stringify(pointSavedSlots));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
    try {
      localStorage.setItem(pointSessionStorageKey, JSON.stringify({
        pointEditMode,
        pointSelectedSlot,
        pointSelectedHand,
        pointSequenceMode,
        pointSymmetryMode,
        pointPalindromMode,
        pointSequence: sanitizePointSequence(pointSequence)
      }));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  };

  const persistSettings = () => {
    const snapshot = {
      shape: selectedShape,
      handMode: selectedHandMode,
      syncMode: selectedSyncMode,
      resolution: selectedResolution,
      gridResolution: selectedGridResolution,
      centerDistance: selectedCenterDistance,
      alternatingScale: selectedAlternatingScale,
      alternatingStartNote: selectedAlternatingStartNote,
      alternatingVolume: selectedAlternatingVolume,
      activeTouchFadeEnabled: selectedActiveTouchFadeEnabled,
      alternatingFrequencyModulation: selectedAlternatingFrequencyModulation,
      alternatingAxisSwap: selectedAlternatingAxisSwap
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  };

  const title = document.createElement('div');
  title.className = 'figure-side-panel-title';
  title.textContent = 'Ziffern';
  panel.appendChild(title);

  const shapeTitle = document.createElement('div');
  shapeTitle.className = 'figure-panel-section-title';
  shapeTitle.textContent = 'Form';
  panel.appendChild(shapeTitle);

  const shapeGroup = document.createElement('div');
  shapeGroup.className = 'figure-mode-group';

  const shapeOptions = Array.from({ length: 6 }, (_, index) => ({
    value: String(index),
    label: String(index)
  }));

  shapeOptions.forEach(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-side-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'square-exercise-shape';
    input.value = value;
    input.checked = value === selectedShape;

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      selectedShape = value;
      persistSettings();
      managerRef?.setSquareExerciseShape(selectedShape);
    });

    const caption = document.createElement('span');
    caption.textContent = label;
    option.appendChild(input);
    option.appendChild(caption);
    shapeGroup.appendChild(option);
  });
  panel.appendChild(shapeGroup);

  bindUiGroupDescription([...shapeGroup.querySelectorAll('label, input')], 'Eingewöhnung', 'Form');

  const handSection = document.createElement('div');
  handSection.className = 'figure-panel-section';

  const handTitle = document.createElement('div');
  handTitle.className = 'figure-panel-section-title';
  handTitle.textContent = 'Hand';

  const handGroup = document.createElement('div');
  handGroup.className = 'figure-mode-group';

  handSection.appendChild(handTitle);
  handSection.appendChild(handGroup);
  panel.appendChild(handSection);
  bindUiGroupDescription([handTitle, ...handGroup.querySelectorAll('label, input')], 'Eingewöhnung', 'Hand');

  const handOptions = [
    { value: 'right', label: 'Rechte Hand' },
    { value: 'left', label: 'Linke Hand' },
    { value: 'both', label: 'Beide Hände' }
  ];

  const syncSection = document.createElement('div');
  syncSection.className = 'figure-panel-section';

  const syncTitle = document.createElement('div');
  syncTitle.className = 'figure-panel-section-title';
  syncTitle.textContent = 'Synchronität';
  syncTitle.hidden = true;

  const syncGroup = document.createElement('div');
  syncGroup.className = 'figure-mode-group';
  syncGroup.hidden = true;

  syncSection.appendChild(syncTitle);
  syncSection.appendChild(syncGroup);
  bindUiGroupDescription([syncTitle, ...syncGroup.querySelectorAll('label, input')], 'Eingewöhnung', 'Synchronität');

  const syncOptions = [
    { value: 'asynchronous', label: 'Asynchron' },
    { value: 'synchronous', label: 'Synchron' }
  ];

  syncOptions.forEach(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-side-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'square-exercise-sync-mode';
    input.value = value;
    input.checked = value === selectedSyncMode;

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      selectedSyncMode = value;
      persistSettings();
      managerRef?.setSquareExerciseSyncMode(selectedSyncMode);
    });

    const caption = document.createElement('span');
    caption.textContent = label;
    option.appendChild(input);
    option.appendChild(caption);
    syncGroup.appendChild(option);
  });

  handOptions.forEach(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-side-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'square-exercise-hand';
    input.value = value;
    input.checked = value === selectedHandMode;

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      selectedHandMode = value;
      if (selectedHandMode !== 'both') {
        selectedSyncMode = 'asynchronous';
      }
      updateSyncVisibility();
      persistSettings();
      managerRef?.setSquareExerciseHandMode(selectedHandMode);
      managerRef?.setSquareExerciseSyncMode(selectedSyncMode);
    });

    const caption = document.createElement('span');
    caption.textContent = label;
    option.appendChild(input);
    option.appendChild(caption);
    handGroup.appendChild(option);
  });

  const updateSyncVisibility = () => {
    const isBoth = selectedHandMode === 'both';
    syncTitle.hidden = !isBoth;
    syncGroup.hidden = !isBoth;
    syncSection.hidden = !isBoth;

    handTitle.hidden = false;
    handGroup.hidden = false;

    if (!isBoth && selectedSyncMode !== 'asynchronous') {
      selectedSyncMode = 'asynchronous';
      syncGroup.querySelectorAll('input[name="square-exercise-sync-mode"]').forEach((radio) => {
        radio.checked = radio.value === 'asynchronous';
      });
    }
  };

  panel.appendChild(syncSection);

  const pointSection = document.createElement('div');
  pointSection.className = 'figure-panel-section points-panel-section';
  pointSection.hidden = true;

  const pointToggleWrap = document.createElement('label');
  pointToggleWrap.className = 'figure-dynamics-toggle';
  const pointToggleInput = document.createElement('input');
  pointToggleInput.type = 'checkbox';
  pointToggleInput.checked = pointEditMode;
  pointToggleWrap.appendChild(pointToggleInput);
  pointToggleWrap.appendChild(document.createTextNode('Bearbeiten'));
  pointToggleWrap.classList.toggle('is-active', pointEditMode);
  pointSection.appendChild(pointToggleWrap);
  bindUiGroupDescription([pointToggleWrap], 'Eingewöhnung', 'Bearbeiten');

  const pointSequenceModeTitle = document.createElement('div');
  pointSequenceModeTitle.className = 'figure-point-group-label';
  pointSequenceModeTitle.textContent = 'Berührungslogik';
  pointSequenceModeTitle.hidden = !pointEditMode;
  pointSection.appendChild(pointSequenceModeTitle);

  const pointSequenceModeRow = document.createElement('div');
  pointSequenceModeRow.className = 'figure-point-hand-row';
  pointSequenceModeRow.hidden = !pointEditMode;

  const pointSequenceModeOptions = [
    { value: 'independent', label: 'Unabhängig' },
    { value: 'sequential', label: 'Nacheinander' },
    { value: 'simultaneous', label: 'Gleichzeitig' }
  ];

  const pointSequenceModeInputs = pointSequenceModeOptions.map(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-point-hand-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'point-exercise-sequence-mode';
    input.value = value;
    input.checked = pointSequenceMode === value;
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      pointSequenceMode = normalizePointSequenceMode(value);
      updatePointPresetInfo();
      persistPointState();
      managerRef?.setPointExerciseSequentialMode?.(pointSequenceMode);
    });
    option.appendChild(input);
    const labelNode = document.createElement('span');
    labelNode.textContent = label;
    option.appendChild(labelNode);
    pointSequenceModeRow.appendChild(option);
    return input;
  });

  pointSection.appendChild(pointSequenceModeRow);
  bindUiGroupDescription([...pointSequenceModeRow.querySelectorAll('label, input')], 'Eingewöhnung', 'Nacheinander');

  const pointHandGroupLabel = document.createElement('div');
  pointHandGroupLabel.className = 'figure-point-group-label';
  pointHandGroupLabel.textContent = 'Hand';
  pointHandGroupLabel.hidden = !pointEditMode;
  pointSection.appendChild(pointHandGroupLabel);

  const pointHandRow = document.createElement('div');
  pointHandRow.className = 'figure-point-hand-row';
  pointHandRow.hidden = !pointEditMode;

  const pointHandOptions = ['right', 'left', 'auto'].map((handValue) => {
    const option = document.createElement('label');
    option.className = 'figure-point-hand-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'point-exercise-hand';
    input.value = handValue;
    input.checked = pointSelectedHand === handValue;
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      pointSelectedHand = handValue;
      persistPointState();
      managerRef?.setPointExerciseHand?.(pointSelectedHand);
      renderPointList();
    });
    option.appendChild(input);
    const label = document.createElement('span');
    label.textContent = handValue === 'left' ? 'Links' : handValue === 'auto' ? 'Auto' : 'Rechts';
    option.appendChild(label);
    pointHandRow.appendChild(option);
    return input;
  });
  pointSection.appendChild(pointHandRow);
  bindUiGroupDescription([...pointHandRow.querySelectorAll('label, input')], 'Eingewöhnung', 'HandBearbeiten');

  const pointSymmetryWrap = document.createElement('label');
  pointSymmetryWrap.className = 'figure-dynamics-toggle';
  const pointSymmetryInput = document.createElement('input');
  pointSymmetryInput.type = 'checkbox';
  pointSymmetryInput.checked = pointSymmetryMode;
  pointSymmetryWrap.appendChild(pointSymmetryInput);
  pointSymmetryWrap.appendChild(document.createTextNode('Symmetrie'));
  pointSymmetryWrap.hidden = !pointEditMode;
  pointSection.appendChild(pointSymmetryWrap);
  bindUiGroupDescription([pointSymmetryWrap, pointSymmetryInput], 'Eingewöhnung', 'Symmetrie');
  pointSymmetryInput.addEventListener('change', () => {
    pointSymmetryMode = pointSymmetryInput.checked;
    persistPointState();
    managerRef?.setPointExerciseSymmetryMode?.(pointSymmetryMode);
  });

  const pointPalindromWrap = document.createElement('label');
  pointPalindromWrap.className = 'figure-dynamics-toggle';
  const pointPalindromInput = document.createElement('input');
  pointPalindromInput.type = 'checkbox';
  pointPalindromInput.checked = pointPalindromMode;
  pointPalindromWrap.appendChild(pointPalindromInput);
  pointPalindromWrap.appendChild(document.createTextNode('Palindrom'));
  pointPalindromWrap.hidden = !pointEditMode;
  pointSection.appendChild(pointPalindromWrap);
  bindUiGroupDescription([pointPalindromWrap, pointPalindromInput], 'Eingewöhnung', 'Palindrom');
  pointPalindromInput.addEventListener('change', () => {
    pointPalindromMode = pointPalindromInput.checked;
    updatePointPresetInfo();
    persistPointState();
    managerRef?.setPointExercisePalindromMode?.(pointPalindromMode);
    managerRef?.setPointExerciseSequentialMode?.(pointSequenceMode);
  });

  const pointPresetTitle = document.createElement('div');
  pointPresetTitle.className = 'figure-panel-section-title';
  pointPresetTitle.textContent = 'Presets';
  pointPresetTitle.hidden = pointEditMode;
  pointSection.appendChild(pointPresetTitle);
  bindUiGroupDescription([pointPresetTitle], 'Eingewöhnung', 'Presets');

  const pointSlotRow = document.createElement('div');
  pointSlotRow.className = 'figure-point-slot-grid';
  pointSlotRow.hidden = pointEditMode;

  const pointPresetInfo = document.createElement('div');
  pointPresetInfo.className = 'figure-point-preset-info';
  pointPresetInfo.hidden = pointEditMode;
  bindUiGroupDescription([pointPresetInfo], 'Eingewöhnung', 'Presetinfo');

  const updatePointPresetInfo = () => {
    const motionLogic = pointSequenceMode === 'independent'
      ? 'unabhängig'
      : pointSequenceMode === 'sequential'
        ? 'nacheinander'
        : 'gleichzeitig';
    const movementDirection = pointPalindromMode ? 'Palindrom' : 'vorwärts';
    pointPresetInfo.textContent = [
      'Presetinfo',
      `Bewegungslogik: ${motionLogic}`,
      `Bewegungsrichtung: ${movementDirection}`
    ].join('\n');
  };

  const loadPointPresetIntoCurrentSequence = (slotNumber, { force = false } = {}) => {
    const normalizedSlot = normalizePointSlot(slotNumber);
    const savedPreset = pointSavedSlots[normalizedSlot] || { sequence: [], gridResolution: selectedGridResolution, resolution: selectedResolution, hand: pointSelectedHand };
    const presetEntry = normalizePointPresetEntry(savedPreset);
    const savedPattern = restoreAbsolutePointSequence(presetEntry.sequence);
    debugPointPresetLog(`load slot ${normalizedSlot}`, {
      slot: normalizedSlot,
      savedPreset,
      presetEntry,
      sequence: savedPattern
    });
    if ((force || !pointEditMode) && savedPattern.length > 0) {
      pointSelectedHand = ['left', 'right', 'auto'].includes(presetEntry.hand) ? presetEntry.hand : pointSelectedHand;
      pointSequence = savedPattern.map((item) => ({
        row: Number(item.row),
        col: Number(item.col),
        hand: ['left', 'right', 'auto'].includes(item.hand) ? item.hand : pointSelectedHand
      }));
      pointSequenceMode = normalizePointSequenceMode(presetEntry.sequentialMode);
      pointPalindromMode = Boolean(presetEntry.palindromMode ?? false);
      pointHandOptions.forEach((radio) => {
        radio.checked = radio.value === pointSelectedHand;
      });
      pointSequenceModeInputs.forEach((radio) => {
        radio.checked = radio.value === pointSequenceMode;
      });
      pointPalindromInput.checked = pointPalindromMode;
      updatePointPresetInfo();
      managerRef?.setPointExerciseHand?.(pointSelectedHand);
      managerRef?.setPointExerciseSequentialMode?.(pointSequenceMode);
      managerRef?.setPointExercisePalindromMode?.(pointPalindromMode);
      setGridResolution(presetEntry.gridResolution);
      setResolution(presetEntry.resolution);
      persistSettings();
      managerRef?.setSquareExerciseGridResolution(presetEntry.gridResolution);
      managerRef?.setSquareExerciseResolution(presetEntry.resolution);
      managerRef?.setPointExerciseSequence(pointSequence);
      renderPointList();
      return true;
    }
    return false;
  };

  const pointSlotLabels = Array.from({ length: 8 }, (_, slotIndex) => {
    const slotNumber = slotIndex + 1;
    const option = document.createElement('label');
    option.className = 'figure-point-slot-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'point-exercise-slot';
    input.value = String(slotNumber);
    input.checked = pointSelectedSlot === slotNumber;
    option.appendChild(input);
    const label = document.createElement('span');
    label.textContent = String(slotNumber);
    option.appendChild(label);
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      pointSelectedSlot = normalizePointSlot(slotNumber);
      loadPointPresetIntoCurrentSequence(pointSelectedSlot);
      persistPointState();
      managerRef?.setPointExerciseSelectedSlot(pointSelectedSlot);
      renderPointList();
    });
    pointSlotRow.appendChild(option);
    return input;
  });
  pointSection.appendChild(pointSlotRow);
  pointSection.appendChild(pointPresetInfo);
  bindUiGroupDescription([...pointSlotRow.querySelectorAll('label, input')], 'Eingewöhnung', 'Presets');

  const pointActions = document.createElement('div');
  pointActions.className = 'figure-point-action-row';
  pointActions.hidden = !pointEditMode;

  const clearTemporaryPointSequence = () => {
    pointSequence = [];
    renderPointList();
    persistPointState();
    managerRef?.setPointExerciseSequence([]);
  };

  const pointResetButton = document.createElement('button');
  pointResetButton.type = 'button';
  pointResetButton.className = 'figure-point-action';
  pointResetButton.textContent = 'Reset';
  pointResetButton.addEventListener('click', () => {
    clearTemporaryPointSequence();
  });

  const pointSaveDialog = document.createElement('div');
  pointSaveDialog.className = 'figure-point-slot-dialog hidden';
  pointSaveDialog.setAttribute('role', 'dialog');
  pointSaveDialog.setAttribute('aria-modal', 'true');

  const pointSaveDialogCard = document.createElement('div');
  pointSaveDialogCard.className = 'figure-point-slot-dialog-card';

  const pointSaveDialogTitle = document.createElement('div');
  pointSaveDialogTitle.className = 'figure-point-slot-dialog-title';
  pointSaveDialogTitle.textContent = 'Folge speichern';

  const pointSaveDialogText = document.createElement('div');
  pointSaveDialogText.className = 'figure-point-slot-dialog-text';
  pointSaveDialogText.textContent = 'In welchen Slot 1-8 möchten Sie die aktuelle Folge speichern?';

  const pointSaveDialogInput = document.createElement('input');
  pointSaveDialogInput.type = 'number';
  pointSaveDialogInput.min = '1';
  pointSaveDialogInput.max = '8';
  pointSaveDialogInput.step = '1';
  pointSaveDialogInput.value = String(pointSelectedSlot);
  pointSaveDialogInput.className = 'figure-point-slot-dialog-input';

  const pointSaveDialogActions = document.createElement('div');
  pointSaveDialogActions.className = 'figure-point-slot-dialog-actions';

  const pointSaveDialogCancel = document.createElement('button');
  pointSaveDialogCancel.type = 'button';
  pointSaveDialogCancel.className = 'figure-point-action';
  pointSaveDialogCancel.textContent = 'Abbrechen';

  const pointSaveDialogConfirm = document.createElement('button');
  pointSaveDialogConfirm.type = 'button';
  pointSaveDialogConfirm.className = 'figure-point-action primary';
  pointSaveDialogConfirm.textContent = 'Speichern';

  pointSaveDialogActions.appendChild(pointSaveDialogCancel);
  pointSaveDialogActions.appendChild(pointSaveDialogConfirm);

  const closePointSaveDialog = () => {
    pointSaveDialog.classList.add('hidden');
    pointSaveDialogInput.value = String(pointSelectedSlot);
  };

  const validatePointSaveForSequenceMode = () => {
    const normalizedSequenceMode = normalizePointSequenceMode(pointSequenceModeInputs.find((radio) => radio.checked)?.value || pointSequenceMode);
    const leftPointCount = sanitizePointSequence(pointSequence).filter((point) => point.hand === 'left').length;
    const rightPointCount = sanitizePointSequence(pointSequence).filter((point) => point.hand === 'right').length;

    if (normalizedSequenceMode === 'simultaneous' && leftPointCount !== rightPointCount) {
      window.alert('Im Modus gleichzeitig müssen für linke und rechte Hand dieselbe Anzahl an Punkten ausgewählt sein. Speichern nicht möglich.');
      return false;
    }
    return true;
  };

  pointSaveDialogCancel.addEventListener('click', closePointSaveDialog);
  pointSaveDialog.addEventListener('click', (event) => {
    if (event.target === pointSaveDialog) {
      closePointSaveDialog();
    }
  });

  pointSaveDialogConfirm.addEventListener('click', () => {
    const slotNumber = Number.parseInt(pointSaveDialogInput.value, 10);
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 8) {
      window.alert('Bitte wählen Sie einen gültigen Slot von 1 bis 8.');
      return;
    }

    const normalizedSequenceMode = normalizePointSequenceMode(pointSequenceModeInputs.find((radio) => radio.checked)?.value || pointSequenceMode);
    if (!validatePointSaveForSequenceMode()) {
      return;
    }

    const nextPresetEntry = {
      sequence: sanitizePointSequence(pointSequence),
      gridResolution: selectedGridResolution,
      resolution: selectedResolution,
      hand: pointSelectedHand,
      sequentialMode: pointSequenceMode,
      palindromMode: pointPalindromMode
    };

    pointSelectedSlot = slotNumber;
    pointSequenceMode = normalizedSequenceMode;
    pointSymmetryMode = pointSymmetryInput.checked;
    pointSavedSlots[pointSelectedSlot] = nextPresetEntry;
    debugPointPresetLog(`save slot ${pointSelectedSlot}`, {
      slot: pointSelectedSlot,
      preset: nextPresetEntry,
      sequence: nextPresetEntry.sequence
    });
    pointSlotLabels.forEach((radio) => {
      radio.checked = Number(radio.value) === pointSelectedSlot;
    });
    persistPointState();
    managerRef?.setPointExerciseSelectedSlot(pointSelectedSlot);
    managerRef?.setPointExerciseSavedSlots(pointSavedSlots);
    managerRef?.setPointExerciseSequentialMode?.(pointSequenceMode);
    managerRef?.setPointExerciseSymmetryMode?.(pointSymmetryMode);
    renderPointList();
    closePointSaveDialog();
  });

  pointSaveDialogCard.appendChild(pointSaveDialogTitle);
  pointSaveDialogCard.appendChild(pointSaveDialogText);
  pointSaveDialogCard.appendChild(pointSaveDialogInput);
  pointSaveDialogCard.appendChild(pointSaveDialogActions);
  pointSaveDialog.appendChild(pointSaveDialogCard);
  document.body.appendChild(pointSaveDialog);

  const pointSaveButton = document.createElement('button');
  pointSaveButton.type = 'button';
  pointSaveButton.className = 'figure-point-action primary';
  pointSaveButton.textContent = 'Speichern';
  pointSaveButton.addEventListener('click', () => {
    if (pointSequence.length === 0) {
      window.alert('Bitte erst eine Folge mit Punkten anlegen.');
      return;
    }

    if (!validatePointSaveForSequenceMode()) {
      return;
    }

    pointSaveDialogInput.value = String(pointSelectedSlot);
    pointSaveDialog.classList.remove('hidden');
  });

  pointActions.appendChild(pointResetButton);
  pointActions.appendChild(pointSaveButton);
  pointSection.appendChild(pointActions);
  bindUiGroupDescription([pointResetButton], 'Eingewöhnung', 'Reset');
  bindUiGroupDescription([pointSaveButton], 'Eingewöhnung', 'Speichern');

  const pointListWrap = document.createElement('div');
  pointListWrap.className = 'figure-point-list';
  pointListWrap.hidden = !pointEditMode;
  pointSection.appendChild(pointListWrap);
  bindUiGroupDescription([pointListWrap], 'Eingewöhnung', 'Liste');

  const updatePointPanelVisibility = () => {
    const showPresetRow = !pointEditMode;
    const showEditActions = pointEditMode;

    pointSequenceModeTitle.hidden = !pointEditMode;
    pointSequenceModeTitle.style.display = pointEditMode ? '' : 'none';
    pointSequenceModeRow.hidden = !pointEditMode;
    pointSequenceModeRow.style.display = pointEditMode ? '' : 'none';
    pointSequenceModeInputs.forEach((radio) => {
      radio.checked = radio.value === pointSequenceMode;
    });

    pointSymmetryWrap.hidden = !pointEditMode;
    pointSymmetryWrap.style.display = pointEditMode ? '' : 'none';
    pointSymmetryInput.checked = pointSymmetryMode;

    pointPalindromWrap.hidden = !pointEditMode;
    pointPalindromWrap.style.display = pointEditMode ? '' : 'none';
    pointPalindromInput.checked = pointPalindromMode;

    pointHandGroupLabel.hidden = !pointEditMode;
    pointHandGroupLabel.style.display = pointEditMode ? '' : 'none';
    pointHandRow.hidden = !pointEditMode;
    pointHandRow.style.display = pointEditMode ? '' : 'none';
    pointHandOptions.forEach((radio) => {
      radio.hidden = !pointEditMode;
      radio.style.display = pointEditMode ? '' : 'none';
      if (radio.parentElement) {
        radio.parentElement.hidden = !pointEditMode;
        radio.parentElement.style.display = pointEditMode ? '' : 'none';
      }
    });

    pointPresetTitle.hidden = pointEditMode;
    pointPresetTitle.style.display = showPresetRow ? '' : 'none';

    pointSlotRow.hidden = pointEditMode;
    pointSlotRow.style.display = showPresetRow ? '' : 'none';
    pointPresetInfo.hidden = pointEditMode;
    pointPresetInfo.style.display = showPresetRow ? '' : 'none';
    updatePointPresetInfo();
    pointSlotLabels.forEach((radio) => {
      radio.hidden = pointEditMode;
      radio.style.display = showPresetRow ? '' : 'none';
      if (radio.parentElement) {
        radio.parentElement.hidden = pointEditMode;
        radio.parentElement.style.display = showPresetRow ? '' : 'none';
      }
    });

    pointActions.hidden = !showEditActions;
    pointActions.style.display = showEditActions ? '' : 'none';
    pointListWrap.hidden = !showEditActions;
    pointListWrap.style.display = showEditActions ? '' : 'none';
    pointToggleInput.checked = pointEditMode;
    pointToggleWrap.classList.toggle('is-active', pointEditMode);
  };

  const renderPointList = () => {
    pointListWrap.innerHTML = '';
    if (pointSequence.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'figure-point-empty';
      empty.textContent = 'Keine Punkte gespeichert.';
      pointListWrap.appendChild(empty);
      return;
    }

    const activeIndex = Number.isInteger(managerRef?.pointExerciseCurrentIndex)
      ? Math.max(0, Math.min(pointSequence.length - 1, managerRef.pointExerciseCurrentIndex))
      : 0;

    pointSequence.forEach((point, index) => {
      const item = document.createElement('div');
      item.className = 'figure-point-item';
      if (index === activeIndex) {
        item.classList.add('is-active');
      }
      const sideLabel = point.hand === 'left' ? 'Links' : 'Rechts';
      item.textContent = `${index + 1}. ${sideLabel} · Zeile ${point.row + 1}, Spalte ${point.col + 1}`;
      pointListWrap.appendChild(item);
    });
  };

  pointToggleInput.addEventListener('change', () => {
    pointEditMode = pointToggleInput.checked;
    if (pointEditMode) {
      pointSequence = [];
      renderPointList();
      managerRef?.setPointExerciseSequence([]);
    }
    updatePointPanelVisibility();
    persistPointState();
    managerRef?.setPointExerciseEditMode(pointEditMode);
    if (!pointEditMode) {
      loadPointPresetIntoCurrentSequence(pointSelectedSlot, { force: true });
    }
    managerRef?.setPointExerciseSequentialMode?.(pointSequenceMode);
  });

  pointSequenceModeInputs.forEach((radio) => {
    radio.checked = radio.value === pointSequenceMode;
  });

  updatePointPanelVisibility();
  renderPointList();
  panel.appendChild(pointSection);

  const divider = document.createElement('div');
  divider.className = 'figure-panel-divider';
  panel.appendChild(divider);

  const resolutionWrap = document.createElement('label');
  resolutionWrap.className = 'figure-size-wrap';

  const resolutionLabel = document.createElement('div');
  resolutionLabel.className = 'figure-size-label';
  resolutionLabel.textContent = 'Kreisdurchmesser';

  const resolutionSlider = document.createElement('input');
  resolutionSlider.type = 'range';
  resolutionSlider.min = '0.55';
  resolutionSlider.max = '1.0';
  resolutionSlider.step = '0.05';
  resolutionSlider.value = String(selectedResolution);

  const resolutionValue = document.createElement('div');
  resolutionValue.className = 'figure-size-value';
  resolutionValue.textContent = `${Number(resolutionSlider.value).toFixed(2)}x`;

  const setResolution = (value) => {
    const next = Math.min(1.0, Math.max(0.55, Number(value)));
    selectedResolution = next;
    resolutionSlider.value = String(next);
    resolutionValue.textContent = `${next.toFixed(2)}x`;
  };

  resolutionSlider.addEventListener('input', () => {
    const next = Number(resolutionSlider.value);
    setResolution(next);
    persistSettings();
    managerRef?.setSquareExerciseResolution(next);
  });

  resolutionWrap.appendChild(resolutionLabel);
  resolutionWrap.appendChild(resolutionSlider);
  resolutionWrap.appendChild(resolutionValue);
  bindUiGroupDescription([resolutionLabel, resolutionSlider, resolutionValue], 'Eingewöhnung', 'Kreisdurchmesser');
  panel.appendChild(resolutionWrap);

  const gridResolutionWrap = document.createElement('label');
  gridResolutionWrap.className = 'figure-size-wrap';

  const gridResolutionLabel = document.createElement('div');
  gridResolutionLabel.className = 'figure-size-label';
  gridResolutionLabel.textContent = 'Grid-Auflösung';

  const gridResolutionSlider = document.createElement('input');
  gridResolutionSlider.type = 'range';
  gridResolutionSlider.min = '8';
  gridResolutionSlider.max = '24';
  gridResolutionSlider.step = '2';
  gridResolutionSlider.value = String(selectedGridResolution);

  const gridResolutionValue = document.createElement('div');
  gridResolutionValue.className = 'figure-size-value';
  gridResolutionValue.textContent = `${Number(gridResolutionSlider.value)}x`;

  const setGridResolution = (value) => {
    const next = Math.max(8, Math.min(24, Math.round(Number(value) / 2) * 2));
    selectedGridResolution = next;
    gridResolutionSlider.value = String(next);
    gridResolutionValue.textContent = `${next}x`;
  };

  gridResolutionSlider.addEventListener('input', () => {
    const next = Number(gridResolutionSlider.value);
    setGridResolution(next);
    persistSettings();
    managerRef?.setSquareExerciseGridResolution(next);
  });

  gridResolutionWrap.appendChild(gridResolutionLabel);
  gridResolutionWrap.appendChild(gridResolutionSlider);
  gridResolutionWrap.appendChild(gridResolutionValue);
  bindUiGroupDescription([gridResolutionLabel, gridResolutionSlider, gridResolutionValue], 'Eingewöhnung', 'GridAuflösung');
  panel.appendChild(gridResolutionWrap);

  const alternatingScaleWrap = document.createElement('div');
  alternatingScaleWrap.className = 'figure-size-wrap';
  alternatingScaleWrap.hidden = true;

  const alternatingScaleLabel = document.createElement('div');
  alternatingScaleLabel.className = 'figure-size-label';
  alternatingScaleLabel.textContent = 'Skala';

  const alternatingScaleGroup = document.createElement('div');
  alternatingScaleGroup.className = 'figure-mode-group';

  const alternatingScaleOptions = [
    { value: 'chromatic', label: 'Chromatisch' },
    { value: 'major', label: 'Dur' },
    { value: 'pentatonic', label: 'Pentatonik' }
  ];

  const alternatingScaleInputs = alternatingScaleOptions.map(({ value, label }) => {
    const option = document.createElement('label');
    option.className = 'figure-side-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'alternating-scale';
    input.value = value;
    input.checked = selectedAlternatingScale === value;

    const text = document.createElement('span');
    text.textContent = label;

    option.appendChild(input);
    option.appendChild(text);
    alternatingScaleGroup.appendChild(option);

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      selectedAlternatingScale = value;
      persistSettings();
      managerRef?.setAlternatingExerciseScaleMode?.(value);
    });

    return input;
  });

  alternatingScaleWrap.appendChild(alternatingScaleLabel);
  alternatingScaleWrap.appendChild(alternatingScaleGroup);
  panel.appendChild(alternatingScaleWrap);

  const alternatingFmWrap = document.createElement('label');
  alternatingFmWrap.className = 'figure-size-wrap';
  alternatingFmWrap.hidden = true;

  const alternatingFmCheckbox = document.createElement('input');
  alternatingFmCheckbox.type = 'checkbox';
  alternatingFmCheckbox.checked = selectedAlternatingFrequencyModulation;

  const alternatingFmLabel = document.createElement('div');
  alternatingFmLabel.className = 'figure-size-label';
  alternatingFmLabel.textContent = 'FM';

  const alternatingFmValue = document.createElement('div');
  alternatingFmValue.className = 'figure-size-value';
  alternatingFmValue.textContent = selectedAlternatingFrequencyModulation ? 'An' : 'Aus';

  alternatingFmCheckbox.addEventListener('change', () => {
    selectedAlternatingFrequencyModulation = alternatingFmCheckbox.checked;
    alternatingFmValue.textContent = selectedAlternatingFrequencyModulation ? 'An' : 'Aus';
    persistSettings();
    managerRef?.setAlternatingExerciseFrequencyModulation?.(selectedAlternatingFrequencyModulation);
  });

  alternatingFmWrap.appendChild(alternatingFmLabel);
  alternatingFmWrap.appendChild(alternatingFmCheckbox);
  alternatingFmWrap.appendChild(alternatingFmValue);
  panel.appendChild(alternatingFmWrap);

  const alternatingAxisSwapWrap = document.createElement('label');
  alternatingAxisSwapWrap.className = 'figure-size-wrap';
  alternatingAxisSwapWrap.hidden = true;

  const alternatingAxisSwapCheckbox = document.createElement('input');
  alternatingAxisSwapCheckbox.type = 'checkbox';
  alternatingAxisSwapCheckbox.checked = selectedAlternatingAxisSwap;

  const alternatingAxisSwapLabel = document.createElement('div');
  alternatingAxisSwapLabel.className = 'figure-size-label';
  alternatingAxisSwapLabel.textContent = 'Achsen tauschen';

  const alternatingAxisSwapValue = document.createElement('div');
  alternatingAxisSwapValue.className = 'figure-size-value';
  alternatingAxisSwapValue.textContent = selectedAlternatingAxisSwap ? 'Y=Ton' : 'X=Ton';

  alternatingAxisSwapCheckbox.addEventListener('change', () => {
    selectedAlternatingAxisSwap = alternatingAxisSwapCheckbox.checked;
    alternatingAxisSwapValue.textContent = selectedAlternatingAxisSwap ? 'Y=Ton' : 'X=Ton';
    persistSettings();
    managerRef?.setAlternatingExerciseAxisSwap?.(selectedAlternatingAxisSwap);
  });

  alternatingAxisSwapWrap.appendChild(alternatingAxisSwapLabel);
  alternatingAxisSwapWrap.appendChild(alternatingAxisSwapCheckbox);
  alternatingAxisSwapWrap.appendChild(alternatingAxisSwapValue);
  panel.appendChild(alternatingAxisSwapWrap);

  const alternatingStartNoteWrap = document.createElement('label');
  alternatingStartNoteWrap.className = 'figure-size-wrap';
  alternatingStartNoteWrap.hidden = true;

  const alternatingStartNoteLabel = document.createElement('div');
  alternatingStartNoteLabel.className = 'figure-size-label';
  alternatingStartNoteLabel.textContent = 'Startnote';

  const alternatingStartNoteSlider = document.createElement('input');
  alternatingStartNoteSlider.type = 'range';
  alternatingStartNoteSlider.min = '36';
  alternatingStartNoteSlider.max = '60';
  alternatingStartNoteSlider.step = '1';
  alternatingStartNoteSlider.value = String(selectedAlternatingStartNote);

  const alternatingStartNoteValue = document.createElement('div');
  alternatingStartNoteValue.className = 'figure-size-value';
  alternatingStartNoteValue.textContent = String(selectedAlternatingStartNote);

  const setAlternatingStartNote = (value) => {
    const next = Math.max(36, Math.min(60, Math.round(Number(value) || 36)));
    selectedAlternatingStartNote = next;
    alternatingStartNoteSlider.value = String(next);
    alternatingStartNoteValue.textContent = String(next);
    persistSettings();
    managerRef?.setAlternatingExerciseStartNote?.(next);
  };

  alternatingStartNoteSlider.addEventListener('input', () => {
    setAlternatingStartNote(alternatingStartNoteSlider.value);
  });

  alternatingStartNoteWrap.appendChild(alternatingStartNoteLabel);
  alternatingStartNoteWrap.appendChild(alternatingStartNoteSlider);
  alternatingStartNoteWrap.appendChild(alternatingStartNoteValue);
  panel.appendChild(alternatingStartNoteWrap);

  const centerDistanceWrap = document.createElement('label');
  centerDistanceWrap.className = 'figure-size-wrap';

  const centerDistanceLabel = document.createElement('div');
  centerDistanceLabel.className = 'figure-size-label';
  centerDistanceLabel.textContent = 'Abstand zum Mittelpunkt';

  const centerDistanceSlider = document.createElement('input');
  centerDistanceSlider.type = 'range';
  centerDistanceSlider.min = '0.1';
  centerDistanceSlider.max = '1.0';
  centerDistanceSlider.step = '0.05';
  centerDistanceSlider.value = String(selectedCenterDistance);

  const centerDistanceValue = document.createElement('div');
  centerDistanceValue.className = 'figure-size-value';
  centerDistanceValue.textContent = Number(centerDistanceSlider.value).toFixed(2);

  const setCenterDistance = (value) => {
    const next = Math.min(1.0, Math.max(0.1, Number(value)));
    selectedCenterDistance = next;
    centerDistanceSlider.value = String(next);
    centerDistanceValue.textContent = next.toFixed(2);
  };

  centerDistanceSlider.addEventListener('input', () => {
    const next = Number(centerDistanceSlider.value);
    setCenterDistance(next);
    persistSettings();
    managerRef?.setSquareExerciseCenterDistance(next);
  });

  centerDistanceWrap.appendChild(centerDistanceLabel);
  centerDistanceWrap.appendChild(centerDistanceSlider);
  centerDistanceWrap.appendChild(centerDistanceValue);
  bindUiGroupDescription([centerDistanceLabel, centerDistanceSlider, centerDistanceValue], 'Eingewöhnung', 'AbstandZumMittelpunkt');
  panel.appendChild(centerDistanceWrap);

  const alternatingVolumeWrap = document.createElement('label');
  alternatingVolumeWrap.className = 'figure-size-wrap';
  alternatingVolumeWrap.hidden = true;

  const alternatingVolumeLabel = document.createElement('div');
  alternatingVolumeLabel.className = 'figure-size-label';
  alternatingVolumeLabel.textContent = 'Lautstärke';

  const alternatingVolumeSlider = document.createElement('input');
  alternatingVolumeSlider.type = 'range';
  alternatingVolumeSlider.min = '0';
  alternatingVolumeSlider.max = '1';
  alternatingVolumeSlider.step = '0.05';
  alternatingVolumeSlider.value = '0';

  const alternatingVolumeValue = document.createElement('div');
  alternatingVolumeValue.className = 'figure-size-value';
  alternatingVolumeValue.textContent = '0.00';

  const setAlternatingVolume = (value) => {
    const next = Math.max(0, Math.min(1, Number(value) || 0));
    selectedAlternatingVolume = next;
    alternatingVolumeSlider.value = String(next);
    alternatingVolumeValue.textContent = next.toFixed(2);
    persistSettings();
    managerRef?.setAlternatingExerciseVolume?.(next);
  };

  alternatingVolumeSlider.addEventListener('input', () => {
    setAlternatingVolume(alternatingVolumeSlider.value);
  });

  alternatingVolumeWrap.appendChild(alternatingVolumeLabel);
  alternatingVolumeWrap.appendChild(alternatingVolumeSlider);
  alternatingVolumeWrap.appendChild(alternatingVolumeValue);
  panel.appendChild(alternatingVolumeWrap);

  const activeTouchFadeWrap = document.createElement('label');
  activeTouchFadeWrap.className = 'figure-size-wrap';
  activeTouchFadeWrap.hidden = true;

  const activeTouchFadeLabel = document.createElement('div');
  activeTouchFadeLabel.className = 'figure-size-label';
  activeTouchFadeLabel.textContent = 'Kontakt-Fade';

  const activeTouchFadeCheckbox = document.createElement('input');
  activeTouchFadeCheckbox.type = 'checkbox';
  activeTouchFadeCheckbox.checked = selectedActiveTouchFadeEnabled;

  const activeTouchFadeValue = document.createElement('div');
  activeTouchFadeValue.className = 'figure-size-value';
  activeTouchFadeValue.textContent = selectedActiveTouchFadeEnabled ? 'An' : 'Aus';

  const setActiveTouchFadeEnabled = (value) => {
    const next = Boolean(value);
    selectedActiveTouchFadeEnabled = next;
    activeTouchFadeCheckbox.checked = next;
    activeTouchFadeValue.textContent = next ? 'An' : 'Aus';
    persistSettings();
    managerRef?.setActiveTouchFadeEnabled?.(next);
  };

  activeTouchFadeCheckbox.addEventListener('change', () => {
    setActiveTouchFadeEnabled(activeTouchFadeCheckbox.checked);
  });

  activeTouchFadeWrap.appendChild(activeTouchFadeLabel);
  activeTouchFadeWrap.appendChild(activeTouchFadeCheckbox);
  activeTouchFadeWrap.appendChild(activeTouchFadeValue);
  bindUiGroupDescription([activeTouchFadeLabel, activeTouchFadeCheckbox, activeTouchFadeValue], 'Eingewöhnung', 'KontaktFade');
  panel.appendChild(activeTouchFadeWrap);

  const sharedChapter1Controls = [
    resolutionWrap,
    gridResolutionWrap,
    centerDistanceWrap
  ];
  const squareOnlyChapter1Controls = [
    shapeTitle,
    shapeGroup,
    handSection,
    syncSection
  ];
  const pointOnlyChapter1Controls = [pointSection];

  const setChapter1ExerciseMode = (mode) => {
    const isPoints = mode === 'points';
    const isSymmetric = mode === 'symmetric';
    const isAlternating = mode === 'alternating';
    const isBlank = mode === 'blank';
    const isFreeMovement = mode === 'free-movement';
    const isFreeMovementExercise = isFreeMovement || (uiState.activeChapter === 1 && Number.isInteger(uiState.activeLevel) && uiState.activeLevel === 2);
    const hideUnusedSquareControls = isSymmetric || isPoints || isAlternating || isBlank || isFreeMovement;
    const sharedControlsForMode = isAlternating
      ? [resolutionWrap, gridResolutionWrap, alternatingScaleWrap, alternatingFmWrap, alternatingAxisSwapWrap, alternatingStartNoteWrap, alternatingVolumeWrap]
      : isBlank
        ? []
        : [resolutionWrap, gridResolutionWrap, centerDistanceWrap, ...(isFreeMovementExercise ? [activeTouchFadeWrap] : [])];

    if (centerDistanceWrap) {
      const shouldShowCenterDistance = !isAlternating && !isBlank && !isFreeMovement;
      centerDistanceWrap.hidden = !shouldShowCenterDistance;
      centerDistanceWrap.style.display = shouldShowCenterDistance ? '' : 'none';
    }
    if (alternatingScaleWrap) {
      alternatingScaleWrap.hidden = !isAlternating;
      alternatingScaleWrap.style.display = isAlternating ? '' : 'none';
    }
    if (alternatingFmWrap) {
      alternatingFmWrap.hidden = !isAlternating;
      alternatingFmWrap.style.display = isAlternating ? '' : 'none';
    }
    if (alternatingAxisSwapWrap) {
      alternatingAxisSwapWrap.hidden = !isAlternating;
      alternatingAxisSwapWrap.style.display = isAlternating ? '' : 'none';
    }
    if (alternatingStartNoteWrap) {
      alternatingStartNoteWrap.hidden = !isAlternating;
      alternatingStartNoteWrap.style.display = isAlternating ? '' : 'none';
    }
    if (alternatingVolumeWrap) {
      alternatingVolumeWrap.hidden = !isAlternating;
      alternatingVolumeWrap.style.display = isAlternating ? '' : 'none';
    }
    if (activeTouchFadeWrap) {
      const shouldShowFadeToggle = isFreeMovement && !isAlternating && !isBlank && !isSymmetric && !isPoints;
      activeTouchFadeWrap.hidden = !shouldShowFadeToggle;
      activeTouchFadeWrap.style.display = shouldShowFadeToggle ? '' : 'none';
    }
    if (resolutionWrap) {
      resolutionWrap.hidden = isBlank;
      resolutionWrap.style.display = isBlank ? 'none' : '';
    }
    if (gridResolutionWrap) {
      gridResolutionWrap.hidden = isBlank;
      gridResolutionWrap.style.display = isBlank ? 'none' : '';
    }

    squareOnlyChapter1Controls.forEach((element) => {
      if (element) {
        element.hidden = hideUnusedSquareControls;
      }
    });
    pointOnlyChapter1Controls.forEach((element) => {
      if (element) {
        element.hidden = !isPoints;
      }
    });
    sharedChapter1Controls.forEach((element) => {
      if (element) {
        element.hidden = !sharedControlsForMode.includes(element);
      }
    });

    if (shapeTitle) {
      shapeTitle.hidden = hideUnusedSquareControls;
      shapeTitle.style.display = hideUnusedSquareControls ? 'none' : '';
    }
    if (shapeGroup) {
      shapeGroup.hidden = hideUnusedSquareControls;
      shapeGroup.style.display = hideUnusedSquareControls ? 'none' : 'flex';
    }
    if (handSection) {
      handSection.hidden = hideUnusedSquareControls;
      handSection.style.display = hideUnusedSquareControls ? 'none' : '';
    }
    if (syncSection) {
      syncSection.hidden = hideUnusedSquareControls;
      syncSection.style.display = hideUnusedSquareControls ? 'none' : '';
    }

    const handTitleNode = handSection?.querySelector('.figure-panel-section-title');
    const handGroupNode = handSection?.querySelector('.figure-mode-group');
    const syncTitleNode = syncSection?.querySelector('.figure-panel-section-title');
    const syncGroupNode = syncSection?.querySelector('.figure-mode-group');

    if (handTitleNode) {
      handTitleNode.hidden = hideUnusedSquareControls;
      handTitleNode.style.display = hideUnusedSquareControls ? 'none' : '';
    }
    if (handGroupNode) {
      handGroupNode.hidden = hideUnusedSquareControls;
      handGroupNode.style.display = hideUnusedSquareControls ? 'none' : 'flex';
    }
    if (syncTitleNode) {
      syncTitleNode.hidden = hideUnusedSquareControls;
      syncTitleNode.style.display = hideUnusedSquareControls ? 'none' : '';
    }
    if (syncGroupNode) {
      syncGroupNode.hidden = hideUnusedSquareControls;
      syncGroupNode.style.display = hideUnusedSquareControls ? 'none' : 'flex';
    }

    panel.querySelectorAll('input[name="square-exercise-shape"]').forEach((input) => {
      const option = input.closest('label');
      if (option) {
        option.hidden = hideUnusedSquareControls;
        option.style.display = hideUnusedSquareControls ? 'none' : 'flex';
      }
    });
    panel.querySelectorAll('input[name="square-exercise-hand"]').forEach((input) => {
      const option = input.closest('label');
      if (option) {
        option.hidden = hideUnusedSquareControls;
        option.style.display = hideUnusedSquareControls ? 'none' : 'flex';
      }
    });
    panel.querySelectorAll('input[name="square-exercise-sync-mode"]').forEach((input) => {
      const option = input.closest('label');
      if (option) {
        option.hidden = hideUnusedSquareControls;
        option.style.display = hideUnusedSquareControls ? 'none' : 'flex';
      }
    });

    if (title) {
      title.hidden = false;
      title.style.display = '';
      title.textContent = isFreeMovement ? 'Freie Bewegung' : isPoints ? 'Punkte' : isSymmetric ? 'Symmetrisch' : isAlternating ? 'Alternierend' : 'Ziffern';
    }
  };

  setChapter1ExerciseMode('square');
  attachPanelHoverHelp(panel);

  return {
    panel,
    setVisible: (visible) => panel.classList.toggle('hidden', !visible),
    setResolution,
    setGridResolution,
    renderPointList,
    syncPointState: ({ sequence, slot, editMode, savedSlots, symmetryMode, palindromMode, palindromeMode }) => {
      pointSequence = sanitizePointSequence(sequence);
      pointSelectedSlot = normalizePointSlot(slot);
      pointEditMode = Boolean(editMode);
      pointSymmetryMode = typeof symmetryMode === 'boolean' ? symmetryMode : pointSymmetryMode;
      pointPalindromMode = typeof palindromMode === 'boolean' ? palindromMode : (typeof palindromeMode === 'boolean' ? palindromeMode : pointPalindromMode);
      pointSavedSlots = savedSlots && typeof savedSlots === 'object'
        ? Object.fromEntries(Object.entries(savedSlots).map(([key, value]) => [normalizePointSlot(key), normalizePointPresetEntry(value)]))
        : pointSavedSlots;
      managerRef?.setPointExerciseSymmetryMode?.(pointSymmetryMode);
      managerRef?.setPointExercisePalindromMode?.(pointPalindromMode);
      if (['left', 'right', 'auto'].includes(pointSelectedHand)) {
        pointHandOptions.forEach((radio) => {
          radio.checked = radio.value === pointSelectedHand;
        });
      }
      pointSymmetryInput.checked = pointSymmetryMode;
      pointPalindromInput.checked = pointPalindromMode;
      pointPalindromWrap.hidden = !pointEditMode;
      pointPalindromWrap.style.display = pointEditMode ? '' : 'none';
      updatePointPresetInfo();
      updatePointPanelVisibility();
      pointSlotLabels.forEach((radio) => {
        radio.checked = Number(radio.value) === pointSelectedSlot;
      });
      renderPointList();
    },
    setExerciseMode: (mode) => {
      setChapter1ExerciseMode(mode);
    },
    setTitle: (nextTitle) => {
      const normalizedTitle = typeof nextTitle === 'string' ? nextTitle.trim() : '';
      if (!normalizedTitle) {
        title.hidden = true;
        title.style.display = 'none';
        title.textContent = '';
        return;
      }
      title.hidden = false;
      title.style.display = '';
      title.textContent = normalizedTitle;
    },
    setLevelManager: (manager) => {
      managerRef = manager || null;
      if (managerRef) {
        const activeShape = managerRef.squareExerciseShape || selectedShape;
        const activeDistance = Number.isFinite(managerRef.squareExerciseCenterDistance)
          ? managerRef.squareExerciseCenterDistance
          : selectedCenterDistance;
        const activeHandMode = ['right', 'left', 'both'].includes(settings.handMode)
          ? settings.handMode
          : selectedHandMode;
        const activeSyncMode = ['asynchronous', 'synchronous'].includes(settings.syncMode)
          ? settings.syncMode
          : selectedSyncMode;
        const activeAlternatingScale = ['chromatic', 'major', 'pentatonic'].includes(managerRef.alternatingExerciseScaleMode)
          ? managerRef.alternatingExerciseScaleMode
          : (['chromatic', 'major', 'pentatonic'].includes(settings.alternatingScale) ? settings.alternatingScale : selectedAlternatingScale);
        const activeAlternatingStartNote = Number.isFinite(Number(managerRef.alternatingExerciseStartNote))
          ? Math.max(36, Math.min(60, Math.round(Number(managerRef.alternatingExerciseStartNote))))
          : selectedAlternatingStartNote;
        const activeAlternatingVolume = Number.isFinite(Number(managerRef.alternatingExerciseVolume))
          ? Math.max(0, Math.min(1, Number(managerRef.alternatingExerciseVolume)))
          : selectedAlternatingVolume;
        const activeTouchFadeEnabled = typeof managerRef.activeTouchFadeEnabled === 'boolean'
          ? managerRef.activeTouchFadeEnabled
          : selectedActiveTouchFadeEnabled;
        const activeAlternatingFrequencyModulation = typeof managerRef.alternatingExerciseFrequencyModulation === 'boolean'
          ? managerRef.alternatingExerciseFrequencyModulation
          : Boolean(settings.alternatingFrequencyModulation ?? selectedAlternatingFrequencyModulation);
        const activeAlternatingAxisSwap = typeof managerRef.alternatingExerciseAxisSwap === 'boolean'
          ? managerRef.alternatingExerciseAxisSwap
          : Boolean(settings.alternatingAxisSwap ?? selectedAlternatingAxisSwap);
        selectedShape = activeShape;
        selectedCenterDistance = activeDistance;
        selectedHandMode = activeHandMode;
        selectedSyncMode = activeSyncMode;
        selectedAlternatingScale = activeAlternatingScale;
        selectedAlternatingStartNote = activeAlternatingStartNote;
        selectedAlternatingVolume = activeAlternatingVolume;
        selectedActiveTouchFadeEnabled = activeTouchFadeEnabled;
        selectedAlternatingFrequencyModulation = activeAlternatingFrequencyModulation;
        selectedAlternatingAxisSwap = activeAlternatingAxisSwap;
        pointEditMode = Boolean(managerRef.pointExerciseEditMode || pointEditMode);
        pointSymmetryMode = typeof managerRef.pointExerciseSymmetryMode === 'boolean'
          ? managerRef.pointExerciseSymmetryMode
          : pointSymmetryMode;
        pointPalindromMode = typeof managerRef.pointExercisePalindromMode === 'boolean'
          ? managerRef.pointExercisePalindromMode
          : pointPalindromMode;
        managerRef.setPointExerciseSymmetryMode?.(pointSymmetryMode);
        managerRef.setPointExercisePalindromMode?.(pointPalindromMode);
        pointSavedSlots = managerRef.pointExerciseSavedSlots && typeof managerRef.pointExerciseSavedSlots === 'object'
          ? Object.fromEntries(Object.entries(managerRef.pointExerciseSavedSlots).map(([key, value]) => [normalizePointSlot(key), normalizePointPresetEntry(value)]))
          : pointSavedSlots;
        if (Object.keys(pointSavedSlots).length === 0) {
          pointSavedSlots = readStoredPointSlots();
        }
        pointSelectedSlot = normalizePointSlot(managerRef.pointExerciseSelectedSlot || pointSelectedSlot);
        if (['left', 'right', 'auto'].includes(pointSelectedHand)) {
          managerRef.setPointExerciseHand(pointSelectedHand);
        }
        if (typeof managerRef.pointExerciseEditMode === 'boolean') {
          pointEditMode = Boolean(managerRef.pointExerciseEditMode);
        }
        if (typeof managerRef.pointExerciseSequentialMode === 'boolean' || typeof managerRef.pointExerciseSequentialMode === 'string') {
          pointSequenceMode = normalizePointSequenceMode(managerRef.pointExerciseSequentialMode);
        }
        const selectedSavedPreset = pointSavedSlots[pointSelectedSlot];
        const selectedSavedEntry = normalizePointPresetEntry(selectedSavedPreset);
        const selectedSavedSequence = restoreAbsolutePointSequence(selectedSavedEntry.sequence);
        if (['left', 'right', 'auto'].includes(selectedSavedEntry.hand)) {
          pointSelectedHand = selectedSavedEntry.hand;
        }
        if (['left', 'right', 'auto'].includes(pointSelectedHand)) {
          managerRef.setPointExerciseHand(pointSelectedHand);
        }
        pointSequenceMode = normalizePointSequenceMode(selectedSavedEntry.sequentialMode);
        pointPalindromMode = Boolean(selectedSavedEntry.palindromMode ?? false);
        if (typeof managerRef.pointExerciseSequentialMode === 'boolean' || typeof managerRef.pointExerciseSequentialMode === 'string') {
          pointSequenceMode = normalizePointSequenceMode(managerRef.pointExerciseSequentialMode);
        }
        if (typeof managerRef.pointExercisePalindromMode === 'boolean') {
          pointPalindromMode = managerRef.pointExercisePalindromMode;
        }
        const restoredPointSequence = (!pointEditMode && selectedSavedSequence.length > 0)
          ? restoreAbsolutePointSequence(selectedSavedSequence)
          : restoreAbsolutePointSequence(managerRef.pointExerciseSequence || pointSequence);
        pointSequence = restoredPointSequence;
        if (!pointEditMode && selectedSavedSequence.length > 0) {
          setGridResolution(selectedSavedEntry.gridResolution);
          setResolution(selectedSavedEntry.resolution);
        }

        shapeOptions.forEach(({ value }) => {
          const radio = panel.querySelector(`input[name="square-exercise-shape"][value="${value}"]`);
          if (radio) {
            radio.checked = value === activeShape;
          }
        });
        panel.querySelectorAll('input[name="square-exercise-hand"]').forEach((radio) => {
          radio.checked = radio.value === selectedHandMode;
        });
        panel.querySelectorAll('input[name="square-exercise-sync-mode"]').forEach((radio) => {
          radio.checked = radio.value === selectedSyncMode;
        });
        alternatingScaleInputs.forEach((input) => {
          input.checked = input.value === selectedAlternatingScale;
        });
        setAlternatingStartNote(selectedAlternatingStartNote);
        setAlternatingVolume(selectedAlternatingVolume);
        setActiveTouchFadeEnabled(selectedActiveTouchFadeEnabled);
        alternatingFmCheckbox.checked = selectedAlternatingFrequencyModulation;
        alternatingFmValue.textContent = selectedAlternatingFrequencyModulation ? 'An' : 'Aus';
        alternatingAxisSwapCheckbox.checked = selectedAlternatingAxisSwap;
        alternatingAxisSwapValue.textContent = selectedAlternatingAxisSwap ? 'Y=Ton' : 'X=Ton';
        managerRef?.setAlternatingExerciseVolume?.(selectedAlternatingVolume);
        managerRef?.setActiveTouchFadeEnabled?.(selectedActiveTouchFadeEnabled);
        managerRef?.setAlternatingExerciseFrequencyModulation?.(selectedAlternatingFrequencyModulation);
        managerRef?.setAlternatingExerciseAxisSwap?.(selectedAlternatingAxisSwap);
        updatePointPanelVisibility();
        pointSlotLabels.forEach((radio) => {
          radio.checked = Number(radio.value) === pointSelectedSlot;
        });
        setCenterDistance(selectedCenterDistance);
        updateSyncVisibility();
        renderPointList();
        managerRef.setSquareExerciseShape(selectedShape);
        managerRef.setSquareExerciseHandMode(selectedHandMode);
        managerRef.setSquareExerciseSyncMode(selectedSyncMode);
        const currentPointPreset = normalizePointPresetEntry(pointSavedSlots[pointSelectedSlot]);
        managerRef.setSquareExerciseResolution(currentPointPreset.resolution || selectedResolution);
        managerRef.setSquareExerciseGridResolution(currentPointPreset.gridResolution || selectedGridResolution);
        managerRef.setSquareExerciseCenterDistance(selectedCenterDistance);
        managerRef.setAlternatingExerciseScaleMode?.(selectedAlternatingScale);
        managerRef.setAlternatingExerciseStartNote?.(selectedAlternatingStartNote);
        managerRef.setAlternatingExerciseFrequencyModulation?.(selectedAlternatingFrequencyModulation);
        managerRef.setAlternatingExerciseAxisSwap?.(selectedAlternatingAxisSwap);
        managerRef.setPointExerciseSavedSlots(pointSavedSlots);
        managerRef.setPointExerciseEditMode(pointEditMode);
        managerRef.setPointExerciseSelectedSlot(pointSelectedSlot);
        managerRef.setPointExerciseSequentialMode(pointSequenceMode);
        managerRef.setPointExerciseSequence(pointSequence);
        if (!pointEditMode && pointSelectedSlot) {
          const selectedPreset = normalizePointPresetEntry(pointSavedSlots[pointSelectedSlot]);
          if (selectedPreset.sequence.length > 0) {
            pointSequence = restoreAbsolutePointSequence(selectedPreset.sequence);
            setGridResolution(selectedPreset.gridResolution);
            setResolution(selectedPreset.resolution);
            managerRef.setPointExerciseSequence(pointSequence);
          }
        }
      }
    }
  };
}

function createHandIndependencePanel() {
  const panel = document.createElement('aside');
  panel.className = 'figure-side-panel hidden hand-independence-panel';
  const storageKey = 'motionai.hand-independence-panel-settings';
  const presetKey = 'motionai.hand-independence-presets';
  let managerRef = null;
  let motionMetricsInterval = null;
  let settings = {};
  let presets = {};
  try {
    const storedSettings = JSON.parse(localStorage.getItem(storageKey) || '{}');
    settings = storedSettings && typeof storedSettings === 'object' ? storedSettings : {};
  } catch (error) { settings = {}; }
  settings.sharedX = settings.sharedX ?? 0;
  settings.motionDistanceVisible = settings.motionDistanceVisible === true;
  settings.motionDistanceStrictness = Number.isFinite(Number(settings.motionDistanceStrictness))
    ? Math.min(100, Math.max(0, Number(settings.motionDistanceStrictness)))
    : 100;
  if (typeof settings.countTimesVisible !== 'boolean' && typeof settings.countVisible === 'boolean') {
    settings.countTimesVisible = settings.countVisible;
  }
  if (typeof settings.countVisible !== 'boolean' && typeof settings.countTimesVisible === 'boolean') {
    settings.countVisible = settings.countTimesVisible;
  }
  try {
    const storedPresets = JSON.parse(localStorage.getItem(presetKey) || '{}');
    presets = storedPresets && typeof storedPresets === 'object' ? storedPresets : {};
  } catch (error) { presets = {}; }

  const title = document.createElement('div');
  title.className = 'figure-side-panel-title';
  title.textContent = 'Handunabhängigkeit';

  const presetPanel = document.createElement('div');
  presetPanel.className = 'hand-independence-preset-panel';
  const presetHeader = document.createElement('div');
  presetHeader.className = 'hand-independence-preset-header';
  const presetTitle = document.createElement('div');
  presetTitle.className = 'figure-panel-section-title';
  presetTitle.textContent = 'Presets';
  const presetSlots = document.createElement('div');
  presetSlots.className = 'figure-preset-slots dynamic-figure-preset-slots';
  const presetActions = document.createElement('div');
  presetActions.className = 'dynamic-figure-preset-actions';
  const presetSaveButton = document.createElement('button');
  presetSaveButton.type = 'button';
  presetSaveButton.className = 'dynamic-figure-preset-action';
  presetSaveButton.textContent = 'Speichern';
  presetSaveButton.title = 'Aktuelle Einstellungen im Preset-Slot für diese Übung speichern';
  const presetResetButton = document.createElement('button');
  presetResetButton.type = 'button';
  presetResetButton.className = 'dynamic-figure-preset-action';
  presetResetButton.textContent = 'Zurücksetzen';
  presetResetButton.title = 'Die Presets für diese Übung auf Werkseinstellungen zurücksetzen';
  presetHeader.appendChild(presetTitle);
  presetActions.append(presetSaveButton, presetResetButton);
  presetPanel.append(presetHeader, presetSlots, presetActions);

  panel.append(title, presetPanel);

  const motionDistanceDivider = document.createElement('div');
  motionDistanceDivider.className = 'figure-panel-divider';
  const motionDistanceToggle = document.createElement('label');
  motionDistanceToggle.className = 'figure-dynamics-toggle';
  const motionDistanceInput = document.createElement('input');
  motionDistanceInput.type = 'checkbox';
  motionDistanceInput.checked = settings.motionDistanceVisible;
  motionDistanceToggle.append(motionDistanceInput, document.createTextNode('Distanzdiagramm'));
  const motionDistanceStrictnessWrap = document.createElement('label');
  motionDistanceStrictnessWrap.className = 'figure-size-wrap';
  const motionDistanceStrictnessLabel = document.createElement('div');
  motionDistanceStrictnessLabel.className = 'figure-size-label';
  motionDistanceStrictnessLabel.textContent = 'Strenge';
  const motionDistanceStrictnessSlider = document.createElement('input');
  motionDistanceStrictnessSlider.type = 'range';
  motionDistanceStrictnessSlider.min = '0';
  motionDistanceStrictnessSlider.max = '100';
  motionDistanceStrictnessSlider.step = '1';
  motionDistanceStrictnessSlider.value = String(settings.motionDistanceStrictness);
  const motionDistanceStrictnessValue = document.createElement('div');
  motionDistanceStrictnessValue.className = 'figure-size-value';
  motionDistanceStrictnessValue.textContent = `${settings.motionDistanceStrictness}%`;
  motionDistanceStrictnessSlider.addEventListener('input', () => {
    const next = Number(motionDistanceStrictnessSlider.value);
    settings.motionDistanceStrictness = next;
    motionDistanceStrictnessValue.textContent = `${next}%`;
    managerRef?.setMotionDistanceStrictness(next);
    persist();
  });
  motionDistanceStrictnessWrap.append(
    motionDistanceStrictnessLabel,
    motionDistanceStrictnessSlider,
    motionDistanceStrictnessValue
  );
  const motionMetricsPanel = document.createElement('div');
  motionMetricsPanel.className = 'motion-distance-metrics';
  const motionMetricsTitle = document.createElement('div');
  motionMetricsTitle.className = 'figure-panel-section-title';
  motionMetricsTitle.textContent = 'Bewertung';
  motionMetricsPanel.appendChild(motionMetricsTitle);
  const motionMetricRows = {};
  const metricLabels = { score: 'Gesamtscore', pathScore: 'Bahnabstand', timingScore: 'Timing', directionScore: 'Richtung' };
  Object.entries(metricLabels).forEach(([key, label]) => {
    const row = document.createElement('div');
    row.className = 'motion-distance-metric-row';
    const labelNode = document.createElement('span');
    labelNode.textContent = label;
    const valueNode = document.createElement('span');
    valueNode.textContent = 'L - | R -';
    row.append(labelNode, valueNode);
    motionMetricsPanel.appendChild(row);
    motionMetricRows[key] = valueNode;
  });
  const updateMotionMetrics = () => {
    const summary = managerRef?.getMotionDistanceSummary?.();
    if (!summary) return;
    Object.keys(motionMetricRows).forEach((key) => {
      const format = (hand) => {
        const current = summary[hand]?.current?.[key];
        const average = summary[hand]?.average?.[key];
        return `${current == null ? '-' : current.toFixed(0)} / ${average == null ? '-' : average.toFixed(0)}`;
      };
      motionMetricRows[key].textContent = `L ${format('left')} | R ${format('right')}`;
    });
  };
  motionDistanceInput.addEventListener('change', () => {
    settings.motionDistanceVisible = motionDistanceInput.checked;
    managerRef?.setMotionDistanceVisible(motionDistanceInput.checked);
    persist();
  });
  panel.append(motionDistanceDivider, motionDistanceToggle, motionDistanceStrictnessWrap, motionMetricsPanel);

  let selectedPresetSlot = 0;

  const getPresetBucketForLevel = (figureLevel = settings.figureLevel) => {
    const safeLevel = Number.isInteger(Number(figureLevel)) ? Number(figureLevel) : 0;
    const value = presets[String(safeLevel)];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  };

  function renderPresetSlots() {
    const figureLevel = Number.isInteger(Number(settings.figureLevel)) ? Number(settings.figureLevel) : 0;
    const presetBucket = getPresetBucketForLevel(figureLevel);
    const activeSlot = Number.isInteger(Number(presetBucket.selectedSlot))
      ? Number(presetBucket.selectedSlot)
      : selectedPresetSlot;
    selectedPresetSlot = Math.max(0, Math.min(3, activeSlot));
    presetSlots.innerHTML = '';
    for (let slot = 0; slot < 4; slot += 1) {
      const option = document.createElement('label');
      option.className = 'dynamic-figure-preset-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'hand-independence-preset';
      input.value = String(slot);
      input.checked = slot === selectedPresetSlot;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        selectedPresetSlot = slot;
        const bucket = getPresetBucketForLevel(settings.figureLevel);
        bucket.selectedSlot = slot;
        presets[String(settings.figureLevel)] = bucket;
        persist();
        const nextPreset = bucket[String(slot)];
        if (nextPreset && typeof nextPreset === 'object') {
          apply(nextPreset);
        }
      });
      const caption = document.createElement('span');
      caption.textContent = String(slot + 1);
      option.append(input, caption);
      presetSlots.appendChild(option);
    }
  }

  presetSaveButton.addEventListener('click', () => {
    const savedSlot = savePresetFromPrompt();
    if (Number.isInteger(savedSlot)) {
      selectedPresetSlot = savedSlot;
      renderPresetSlots();
    }
  });

  presetResetButton.addEventListener('click', () => {
    const figureLevel = Number.isInteger(Number(settings.figureLevel)) ? Number(settings.figureLevel) : 0;
    presets[String(figureLevel)] = {};
    selectedPresetSlot = 0;
    localStorage.setItem(presetKey, JSON.stringify(presets));
    renderPresetSlots();
  });

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

  const capturePresetSnapshot = () => {
    const activeVariant = variantGroup.querySelector('input:checked')?.value || settings.variant || 'hard';
    const activeVariation = variationGroup.querySelector('input:checked')?.value || String(settings.figureVariation ?? 1);
    const presetSnapshot = {
      figureLevel: Number.isInteger(Number(settings.figureLevel)) ? Number(settings.figureLevel) : 0,
      figureVariation: Number(activeVariation) === 2 ? 2 : 1,
      variant: activeVariant,
      reverse: Boolean(controls.reverse?.checked ?? settings.reverse ?? false),
      dynamicsVisible: Boolean(dynamicsInput.checked),
      countTimesVisible: Boolean(countInput.checked),
      motionDistanceVisible: Boolean(motionDistanceInput.checked),
      motionDistanceStrictness: Number(motionDistanceStrictnessSlider.value ?? settings.motionDistanceStrictness ?? 100),
      tempoRatio: ratioSelect.value || settings.tempoRatio || '1:1',
      shape: select.value || settings.shape || 'line',
      scale: Number(controls.scale?.value ?? settings.scale ?? managerRef?.handIndependenceFigureScale ?? 1 / 3),
      strokeWidth: Number(controls.strokeWidth?.value ?? settings.strokeWidth ?? managerRef?.handIndependenceFigureStrokeWidth ?? 0.4),
      sharedX: Number(controls.sharedX?.value ?? settings.sharedX ?? managerRef?.handIndependenceFigureX ?? 0),
      sharedY: Number(controls.sharedY?.value ?? settings.sharedY ?? managerRef?.handIndependenceFigureY ?? 0.5),
      sharedTempoBpm: Number(controls.sharedTempoBpm?.value ?? settings.sharedTempoBpm ?? managerRef?.handIndependenceSharedTempoBpm ?? 60),
      figureHardLinearity: Number(controls.figureHardLinearity?.value ?? settings.figureHardLinearity ?? managerRef?.handIndependenceFigureHardLinearity ?? 10),
      figureSoftTransitionPercent: Number(controls.figureSoftTransitionPercent?.value ?? settings.figureSoftTransitionPercent ?? managerRef?.handIndependenceFigureSoftTransitionPercent ?? 0),
      length: Number(controls.length?.value ?? settings.length ?? managerRef?.handIndependenceShapeLength ?? 12),
      width: Number(controls.width?.value ?? settings.width ?? managerRef?.handIndependenceShapeWidth ?? 8),
      height: Number(controls.height?.value ?? settings.height ?? managerRef?.handIndependenceShapeHeight ?? 8),
      rotation: Number(controls.rotation?.value ?? settings.rotation ?? managerRef?.handIndependenceShapeRotation ?? 0),
      cornerHeights: Array.from({ length: 8 }, (_, index) => Number(managerRef?.handIndependenceFigureCornerHeights?.[index] ?? settings[`corner${index}`] ?? 0))
    };

    Object.assign(settings, presetSnapshot);
    return presetSnapshot;
  };
  const addToggle = (key, label) => {
    const wrap = document.createElement('label'); wrap.className = 'figure-dynamics-toggle';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => { settings[key] = input.checked; managerRef?.setHandIndependenceReverse(input.checked); persist(); });
    wrap.append(input, document.createTextNode(label)); panel.appendChild(wrap); controls[key] = input;
    return wrap;
  };

  const reverseToggleWrap = addToggle('reverse', 'Umkehren');
  bindUiGroupDescription([reverseToggleWrap, controls.reverse], 'Handunabhängigkeit', 'Umkehren');
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
  bindUiGroupDescription([dynamicsToggle, dynamicsInput], 'Handunabhängigkeit', 'Dynamiklinien');
  addRange('strokeWidth', 'Stroke', 0.01, 0.5, 0.01);
  bindUiGroupDescription([controlWraps.strokeWidth], 'Handunabhängigkeit', 'Stroke');
  addRange('sharedY', 'Y', 0, 1, 0.01);
  bindUiGroupDescription([controlWraps.sharedY], 'Handunabhängigkeit', 'y');
  addRange('sharedX', 'X', 0, 1, 0.01);
  bindUiGroupDescription([controlWraps.sharedX], 'Handunabhängigkeit', 'x');
  addDivider();
  const tempoRatioTitle = document.createElement('div');
  tempoRatioTitle.className = 'figure-panel-section-title';
  tempoRatioTitle.textContent = 'Tempo';
  panel.appendChild(tempoRatioTitle);
  addRange('sharedTempoBpm', 'BPM', 30, 120, 1);
  bindUiGroupDescription([controlWraps.sharedTempoBpm], 'Handunabhängigkeit', 'BPMSlider');
  const ratioSelect = document.createElement('select');
  ratioSelect.className = 'hand-independence-tempo-ratio';
  ['1:1', '2:1', '3:1', '1:2', '1:3', '0.5:1', '1:0.5', '0.25:1', '1:0.25', '0.125:1', '1:0.125'].forEach((ratio) => {
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
  const taktgebungDivider = document.createElement('div');
  taktgebungDivider.className = 'figure-panel-divider';
  panel.appendChild(taktgebungDivider);

  const taktgebungTitle = document.createElement('div');
  taktgebungTitle.className = 'figure-panel-section-title hand-independence-taktgebung-title';
  taktgebungTitle.textContent = 'Taktgebung';
  panel.appendChild(taktgebungTitle);

  const variationGroup = document.createElement('div');
  variationGroup.className = 'figure-mode-group hand-independence-figure-variation-group';
  const variationInputs = {};
  ['1', '2'].forEach((variation) => {
    const label = document.createElement('label');
    label.className = 'figure-mode-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'hand-independence-figure-variation';
    input.value = variation;
    input.checked = String(settings.figureVariation ?? 1) === variation;
    variationInputs[variation] = input;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      settings.figureVariation = Number(input.value);
      managerRef?.setHandIndependenceFigureVariation(Number(input.value));
      persist();
    });
    label.append(input, document.createTextNode(`Variation ${variation}`));
    variationGroup.appendChild(label);
  });
  panel.appendChild(variationGroup);
  const updateFigureVariationVisibility = () => {
    const activeLevel = Number.isInteger(Number(settings.figureLevel)) ? Number(settings.figureLevel) : 0;
    variationGroup.classList.toggle('hand-independence-figure-variation-hidden', activeLevel === 0);
  };
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
  bindUiGroupDescription([...variationGroup.querySelectorAll('label, input')], 'Handunabhängigkeit', 'Variation');
  bindUiGroupDescription([...variantGroup.querySelectorAll('label, input')], 'Handunabhängigkeit', 'weichHart');
  const countToggle = document.createElement('label');
  countToggle.className = 'figure-dynamics-toggle';
  const countInput = document.createElement('input');
  countInput.type = 'checkbox';
  countInput.checked = Boolean(settings.countTimesVisible);
  controls.countTimesVisible = countInput;
  countInput.addEventListener('change', () => {
    settings.countTimesVisible = countInput.checked;
    managerRef?.setHandIndependenceCountTimesVisible(countInput.checked);
    persist();
  });
  countToggle.append(countInput, document.createTextNode('Zählzeiten'));
  panel.appendChild(countToggle);
  bindUiGroupDescription([countToggle, countInput], 'Handunabhängigkeit', 'Zählzeiten');
  const syncCountTimesState = () => {
    const next = Boolean(countInput.checked);
    settings.countTimesVisible = next;
    managerRef?.setHandIndependenceCountTimesVisible(next);
    countInput.checked = next;
  };
  addRange('scale', 'Größe', 0.2, 1, 0.01);
  bindUiGroupDescription([controlWraps.scale], 'Handunabhängigkeit', 'Größe');
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
  bindUiGroupDescription([controlWraps.figureHardLinearity], 'Handunabhängigkeit', 'Linearität');
  addRange('figureSoftTransitionPercent', 'Übergangslänge', 0, 50, 1);
  bindUiGroupDescription([controlWraps.figureSoftTransitionPercent], 'Handunabhängigkeit', 'Übergangslänge');
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
  bindUiGroupDescription([select], 'Handunabhängigkeit', 'Gegensatz');
  addRange('length', 'Länge', 1, 50, 0.1);
  bindUiGroupDescription([controlWraps.length], 'Handunabhängigkeit', 'Länge');
  addRange('width', 'Breite', 1, 50, 0.1);
  bindUiGroupDescription([controlWraps.width], 'Handunabhängigkeit', 'Breite');
  addRange('height', 'Höhe', 1, 50, 0.1);
  bindUiGroupDescription([controlWraps.height], 'Handunabhängigkeit', 'Höhe');
  addRange('rotation', 'Rotation', -180, 180, 1);
  bindUiGroupDescription([controlWraps.rotation], 'Handunabhängigkeit', 'Rotation');
  updateShapeControlVisibility();

  bindUiGroupDescription([title], 'Handunabhängigkeit', 'Taktgebung');
  bindUiGroupDescription([tempoRatioTitle], 'Handunabhängigkeit', 'Geschwindigkeitsverhältnis');
  bindUiGroupDescription([ratioSelect], 'Handunabhängigkeit', 'Geschwindigkeitsverhältnis');
  bindUiDescription(motionDistanceToggle, 'Handunabhängigkeit', 'Distanzdiagramm');
  bindUiDescription(motionDistanceStrictnessWrap, 'Handunabhängigkeit', 'DistanzStrenge');
  bindUiDescription(motionMetricsPanel, 'Handunabhängigkeit', 'Bewertungsmetriken');
  attachPanelHoverHelp(panel);

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
      const figureLevel = Math.max(0, Math.min(3, Number(safeNext.figureLevel)));
      settings.figureLevel = figureLevel;
      selectedPresetSlot = Number(getPresetBucketForLevel(settings.figureLevel).selectedSlot ?? 0);
      renderPresetSlots();
    }
    if (Number.isInteger(Number(safeNext.figureVariation))) {
      settings.figureVariation = Number(safeNext.figureVariation) === 2 ? 2 : 1;
      Object.entries(variationInputs).forEach(([variation, input]) => {
        input.checked = Number(variation) === settings.figureVariation;
      });
    }
    if (typeof safeNext.countTimesVisible === 'boolean') {
      settings.countTimesVisible = safeNext.countTimesVisible;
      settings.countVisible = safeNext.countTimesVisible;
    } else if (typeof safeNext.countVisible === 'boolean') {
      settings.countTimesVisible = safeNext.countVisible;
      settings.countVisible = safeNext.countVisible;
    }
    if (typeof settings.countTimesVisible === 'boolean') {
      countInput.checked = Boolean(settings.countTimesVisible);
    }
    Object.entries(safeNext).forEach(([key, value]) => {
      const control = controls[key];
      if (control && control.type === 'range') control.value = String(value);
      if (control && control.type === 'checkbox') control.checked = Boolean(value);
      if (control && control.tagName === 'SELECT') control.value = String(value);
    });
    if (typeof settings.countTimesVisible === 'boolean') {
      countInput.checked = Boolean(settings.countTimesVisible);
    }
    if (safeNext.variant) managerRef?.setHandIndependenceVariant(safeNext.variant);
    if (Number.isInteger(Number(safeNext.figureVariation))) {
      managerRef?.setHandIndependenceFigureVariation(Number(safeNext.figureVariation));
    }
    if (Number.isInteger(Number(safeNext.figureLevel))) {
      managerRef?.setHandIndependenceFigureLevel(Number(safeNext.figureLevel));
    }
    if (typeof safeNext.reverse === 'boolean') managerRef?.setHandIndependenceReverse(safeNext.reverse);
    if (typeof safeNext.dynamicsVisible === 'boolean') managerRef?.setHandIndependenceDynamicsVisible(safeNext.dynamicsVisible);
    if (typeof safeNext.countTimesVisible === 'boolean') managerRef?.setHandIndependenceCountTimesVisible(safeNext.countTimesVisible);
    if (typeof safeNext.motionDistanceVisible === 'boolean') managerRef?.setMotionDistanceVisible(safeNext.motionDistanceVisible);
    if (Number.isFinite(Number(safeNext.motionDistanceStrictness))) {
      settings.motionDistanceStrictness = Math.min(100, Math.max(0, Number(safeNext.motionDistanceStrictness)));
      motionDistanceStrictnessSlider.value = String(settings.motionDistanceStrictness);
      motionDistanceStrictnessValue.textContent = `${settings.motionDistanceStrictness}%`;
      managerRef?.setMotionDistanceStrictness(settings.motionDistanceStrictness);
    }
    if (safeNext.tempoRatio) managerRef?.setHandIndependenceTempoRatio(safeNext.tempoRatio);
    if (Array.isArray(safeNext.cornerHeights)) {
      safeNext.cornerHeights.forEach((value, index) => {
        const nextValue = Number(value);
        if (Number.isFinite(nextValue)) {
          managerRef?.setHandIndependenceFigureCornerHeight(index, nextValue);
          settings[`corner${index}`] = nextValue;
          const control = controls[`corner${index}`];
          if (control) {
            control.value = String(nextValue);
          }
        }
      });
    }
    Object.entries(safeNext).forEach(([key, value]) => {
      if (key !== 'variant' && key !== 'reverse' && key !== 'cornerHeights') {
        managerRef?.setHandIndependenceFigureParameter(key, value);
        managerRef?.setHandIndependenceShapeParameter(key, value);
      }
    });
    updateShapeControlVisibility();
    updateFigureMotionControlVisibility();
    updateFigureVariationVisibility();
    rebuildCornerControls(settings.figureLevel);
    persist();
  }
  function savePresetFromPrompt() {
    const requestedSlot = window.prompt('In welchen Preset-Slot sollen die aktuellen Einstellungen gespeichert werden? (1-4)', String(selectedPresetSlot + 1));
    const slot = Number(requestedSlot) - 1;
    if (!Number.isInteger(slot) || slot < 0 || slot >= 4) {
      return null;
    }
    const figureLevel = Number.isInteger(Number(settings.figureLevel)) ? Number(settings.figureLevel) : 0;
    const presetBucket = getPresetBucketForLevel(figureLevel);
    const presetSnapshot = capturePresetSnapshot();
    presetBucket[String(slot)] = presetSnapshot;
    presetBucket.selectedSlot = slot;
    presets[String(figureLevel)] = presetBucket;
    selectedPresetSlot = slot;
    localStorage.setItem(presetKey, JSON.stringify(presets));
    renderPresetSlots();
    return slot;
  }
  function resetPresets() {
    const figureLevel = Number.isInteger(Number(settings.figureLevel)) ? Number(settings.figureLevel) : 0;
    presets[String(figureLevel)] = {};
    selectedPresetSlot = 0;
    localStorage.setItem(presetKey, JSON.stringify(presets));
    renderPresetSlots();
  }
  function rebuildCornerControls(figureLevelOverride = settings.figureLevel) {
    updateFigureVariationVisibility();
    cornerPanel.replaceChildren();
    Object.keys(controls)
      .filter((key) => key.startsWith('corner'))
      .forEach((key) => delete controls[key]);

    const figureLevel = Number.isInteger(Number(figureLevelOverride))
      ? Math.max(0, Math.min(3, Number(figureLevelOverride)))
      : 0;
    const handIndependenceBeatCounts = [1, 2, 3, 4];
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
        const nextValue = Number(input.value);
        settings[`corner${pointIndex}`] = nextValue;
        managerRef?.setHandIndependenceFigureCornerHeight(pointIndex, nextValue);
      });
    }
  }

  return {
    panel,
    setVisible: (visible) => panel.classList.toggle('hidden', !visible),
    setLevelManager: (manager) => {
      managerRef = manager || null;
      apply(settings);
      renderPresetSlots();
      syncCountTimesState();
      managerRef?.setMotionDistanceVisible(motionDistanceInput.checked);
      managerRef?.setMotionDistanceStrictness(Number(motionDistanceStrictnessSlider.value));
      updateMotionMetrics();
      if (!motionMetricsInterval) motionMetricsInterval = window.setInterval(updateMotionMetrics, 100);
    },
    setLevel: () => {
      updateFigureVariationVisibility();
      rebuildCornerControls();
    },
    applyPreset: (level) => {
      const figureLevel = Number.isInteger(Number(level)) ? Math.max(0, Math.min(3, Number(level))) : Number(settings.figureLevel ?? 0);
      const presetBucket = getPresetBucketForLevel(figureLevel);
      const activeSlot = Number.isInteger(Number(presetBucket.selectedSlot)) ? Number(presetBucket.selectedSlot) : 0;
      selectedPresetSlot = Math.max(0, Math.min(3, activeSlot));
      settings.figureLevel = figureLevel;
      managerRef?.setHandIndependenceFigureLevel(figureLevel);
      const preset = presetBucket[String(selectedPresetSlot)];
      if (preset && typeof preset === 'object') {
        apply(preset);
      } else {
        apply({ figureLevel });
      }
      renderPresetSlots();
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
  registerHoverHelp(visibilityToggle, uiElementDescriptions.Einstellungen['Einstellungen']);
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

  let stabilizationEnabled = false;
  let landmarkDrawingVisible = true;
  let silhouetteVisible = false;
  let eyesVisible = false;
  let silhouetteOpacityValue = 0.2;
  let videoSofteningEnabled = true;
  let videoSofteningBlurPx = 5;
  let videoSofteningBrightness = 0.75;
  let poseWarningLandmarksVisible = false;

  const hoverHelpToggleButton = document.createElement('button');
  hoverHelpToggleButton.type = 'button';
  hoverHelpToggleButton.className = 'tracking-controls-button';

  const settingsStorageKey = 'motionai.settings-panel-state';

  function readSavedSettings() {
    try {
      const stored = localStorage.getItem(settingsStorageKey);
      if (!stored) {
        return {};
      }
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function readPersistedCalibrationIndex() {
    try {
      const stored = localStorage.getItem(settingsStorageKey);
      if (!stored) {
        return null;
      }
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      const candidate = Number(parsed.calibrationSetIndex);
      return Number.isInteger(candidate) ? candidate : null;
    } catch (error) {
      return null;
    }
  }

  function getDefaultCreatedAtValue() {
    const saved = readSavedSettings();
    const candidate = saved && typeof saved.createdAt === 'string' ? saved.createdAt : DEFAULT_MOTIONAI_STORAGE['motionai.settings-panel-state'].createdAt;
    if (!candidate) {
      return null;
    }

    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) {
      return candidate;
    }

    return parsed.toISOString();
  }

  function getCreatedAtDisplayText() {
    const raw = getDefaultCreatedAtValue();
    if (!raw) {
      return 'Erstellungsdatum: –';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return `Erstellungsdatum: ${raw}`;
    }

    return `Erstellungsdatum: ${date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })}`;
  }

  function persistSettingsState() {
    try {
      const snapshot = {
        model: modelSelect.value,
        cameraEnabled,
        cameraDeviceId: cameraSelect.value || null,
        resolutionPreset,
        hoverHelpEnabled: uiState.hoverHelpEnabled,
        playbackMode: selectedPlaybackMode,
        calibrationSetIndex: selectedCalibrationSetIndex,
        calibrationStrictness: Number(calibrationStrictnessSlider.value),
        stabilizationEnabled,
        landmarkDrawingVisible,
        silhouetteVisible,
        eyesVisible,
        silhouetteOpacity: silhouetteOpacityValue,
        videoSofteningEnabled,
        videoSofteningBlurPx,
        videoSofteningBrightness,
        poseWarningLandmarksVisible,
        createdAt: getDefaultCreatedAtValue()
      };
      localStorage.setItem(settingsStorageKey, JSON.stringify(snapshot));
      if (defaultCreatedAtText) {
        defaultCreatedAtText.textContent = getCreatedAtDisplayText();
      }
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  }

  function updateCameraToggleLabel() {
    cameraToggleButton.textContent = cameraEnabled ? 'Camera: ON' : 'Camera: OFF';
    cameraToggleButton.setAttribute('aria-pressed', String(cameraEnabled));
  }

  function updateResolutionToggleLabel() {
    resolutionToggleButton.textContent = `Resolution: ${resolutionPreset.toUpperCase()}`;
    resolutionToggleButton.setAttribute('aria-pressed', String(resolutionPreset === 'high'));
  }

  function updateHoverHelpToggleLabel() {
    hoverHelpToggleButton.textContent = uiState.hoverHelpEnabled ? 'Info Box: ON' : 'Info Box: OFF';
    hoverHelpToggleButton.setAttribute('aria-pressed', String(uiState.hoverHelpEnabled));
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

  const playbackModes = ['one', 'repeat', 'autoplay'];
  let selectedPlaybackMode = 'one';
  let selectedCalibrationSetIndex = null;

  const savedSettings = readSavedSettings();
  const savedModel = typeof savedSettings.model === 'string' ? savedSettings.model : trackingController.getCurrentModel();
  const savedCameraEnabled = typeof savedSettings.cameraEnabled === 'boolean' ? savedSettings.cameraEnabled : true;
  const savedResolutionPreset = savedSettings.resolutionPreset === 'low' || savedSettings.resolutionPreset === 'high'
    ? savedSettings.resolutionPreset
    : (trackingController.getResolutionPreset() === 'low' ? 'low' : 'high');
  const savedHoverHelpEnabled = typeof savedSettings.hoverHelpEnabled === 'boolean' ? savedSettings.hoverHelpEnabled : false;
  const savedPlaybackMode = playbackModes.includes(savedSettings.playbackMode) ? savedSettings.playbackMode : 'one';
  const savedCalibrationStrictness = Number.isFinite(Number(savedSettings.calibrationStrictness))
    ? Number(savedSettings.calibrationStrictness)
    : 60;
  const savedStabilizationEnabled = typeof savedSettings.stabilizationEnabled === 'boolean' ? savedSettings.stabilizationEnabled : false;
  const savedLandmarkDrawingVisible = typeof savedSettings.landmarkDrawingVisible === 'boolean' ? savedSettings.landmarkDrawingVisible : true;
  const savedSilhouetteVisible = typeof savedSettings.silhouetteVisible === 'boolean' ? savedSettings.silhouetteVisible : false;
  const savedEyesVisible = typeof savedSettings.eyesVisible === 'boolean' ? savedSettings.eyesVisible : false;
  const savedSilhouetteOpacity = Number.isFinite(Number(savedSettings.silhouetteOpacity))
    ? Math.min(1, Math.max(0, Number(savedSettings.silhouetteOpacity)))
    : 0.2;
  const savedVideoSofteningEnabled = typeof savedSettings.videoSofteningEnabled === 'boolean' ? savedSettings.videoSofteningEnabled : true;
  const savedVideoSofteningBlurPx = Number.isFinite(Number(savedSettings.videoSofteningBlurPx))
    ? Math.min(20, Math.max(2, Number(savedSettings.videoSofteningBlurPx)))
    : 5;
  const savedVideoSofteningBrightness = Number.isFinite(Number(savedSettings.videoSofteningBrightness))
    ? Math.min(0.9, Math.max(0.2, Number(savedSettings.videoSofteningBrightness)))
    : 0.75;
  const savedPoseWarningLandmarksVisible = typeof savedSettings.poseWarningLandmarksVisible === 'boolean'
    ? savedSettings.poseWarningLandmarksVisible
    : false;

  cameraEnabled = savedCameraEnabled;
  resolutionPreset = savedResolutionPreset;
  selectedPlaybackMode = savedPlaybackMode;
  calibrationStrictnessSlider.value = String(savedCalibrationStrictness);
  stabilizationEnabled = savedStabilizationEnabled;
  landmarkDrawingVisible = savedLandmarkDrawingVisible;
  silhouetteVisible = savedSilhouetteVisible;
  eyesVisible = savedEyesVisible;
  silhouetteOpacityValue = savedSilhouetteOpacity;
  videoSofteningEnabled = savedVideoSofteningEnabled;
  videoSofteningBlurPx = savedVideoSofteningBlurPx;
  videoSofteningBrightness = savedVideoSofteningBrightness;
  poseWarningLandmarksVisible = savedPoseWarningLandmarksVisible;
  uiState.hoverHelpEnabled = savedHoverHelpEnabled;
  modelSelect.value = savedModel;

  if (savedCameraEnabled && savedSettings.cameraDeviceId) {
    cameraSelect.value = savedSettings.cameraDeviceId;
  }

  const calibrationStrictnessValue = document.createElement('div');
  calibrationStrictnessValue.className = 'tracking-controls-inline-value';
  calibrationStrictnessValue.textContent = '60%';

  const stabilizationButton = document.createElement('button');
  stabilizationButton.type = 'button';
  stabilizationButton.className = 'tracking-controls-button';

  const landmarkDrawingButton = document.createElement('button');
  landmarkDrawingButton.type = 'button';
  landmarkDrawingButton.className = 'tracking-controls-button';

  const silhouetteButton = document.createElement('button');
  silhouetteButton.type = 'button';
  silhouetteButton.className = 'tracking-controls-button';
  const eyesButton = document.createElement('button');
  eyesButton.type = 'button';
  eyesButton.className = 'tracking-controls-button';
  const silhouetteStorageKey = 'motionai.silhouette-enabled';
  const silhouetteOpacityStorageKey = 'motionai.silhouette-opacity';

  try {
    const storedSilhouette = localStorage.getItem(silhouetteStorageKey);
    if (storedSilhouette !== null) {
      silhouetteVisible = storedSilhouette === 'true';
    }

    const storedSilhouetteOpacity = localStorage.getItem(silhouetteOpacityStorageKey);
    if (storedSilhouetteOpacity !== null) {
      const parsed = Number(storedSilhouetteOpacity);
      silhouetteOpacityValue = Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.2;
    }
  } catch (error) {
    silhouetteVisible = false;
    silhouetteOpacityValue = 0.2;
  }

  const silhouetteOpacityLabel = document.createElement('label');
  silhouetteOpacityLabel.textContent = 'Deckkraft';
  silhouetteOpacityLabel.className = 'tracking-controls-label';

  const silhouetteOpacityValueLabel = document.createElement('div');
  silhouetteOpacityValueLabel.className = 'tracking-controls-inline-value';
  silhouetteOpacityValueLabel.textContent = Number(silhouetteOpacityValue).toFixed(2);

  const silhouetteOpacityRow = document.createElement('div');
  silhouetteOpacityRow.className = 'tracking-controls-row';
  silhouetteOpacityRow.appendChild(silhouetteOpacityLabel);
  silhouetteOpacityRow.appendChild(silhouetteOpacityValueLabel);

  const silhouetteOpacitySlider = document.createElement('input');
  silhouetteOpacitySlider.type = 'range';
  silhouetteOpacitySlider.min = '0';
  silhouetteOpacitySlider.max = '1';
  silhouetteOpacitySlider.step = '0.01';
  silhouetteOpacitySlider.value = String(silhouetteOpacityValue);
  silhouetteOpacitySlider.className = 'tracking-controls-range';
  silhouetteOpacitySlider.title = 'Deckkraft der Silhouette';

  function persistSilhouetteOpacitySetting() {
    try {
      localStorage.setItem(silhouetteOpacityStorageKey, String(silhouetteOpacityValue));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  }

  function updateSilhouetteOpacityControl() {
    const minOpacity = Math.max(0, silhouetteOpacityValue * 0.4);
    const maxOpacity = Math.max(silhouetteOpacityValue, 0.2);

    silhouetteOpacitySlider.min = String(minOpacity);
    silhouetteOpacitySlider.max = String(maxOpacity);
    silhouetteOpacitySlider.value = String(Math.min(maxOpacity, Math.max(minOpacity, silhouetteOpacityValue)));
    silhouetteOpacityValueLabel.textContent = Number(silhouetteOpacityValue).toFixed(2);
    setSilhouetteOpacity(silhouetteOpacityValue);
    persistSilhouetteOpacitySetting();
  }

  const videoCanvas = document.getElementById('canvas');
  const videoSofteningStorageKey = 'motionai.video-softening-enabled';
  const videoSofteningSettingsStorageKey = 'motionai.video-softening-settings';
  const videoSofteningButton = document.createElement('button');
  videoSofteningButton.type = 'button';
  videoSofteningButton.className = 'tracking-controls-button';

  try {
    const raw = localStorage.getItem(videoSofteningStorageKey);
    if (raw !== null) {
      videoSofteningEnabled = raw === 'true';
    }

    const settingsRaw = localStorage.getItem(videoSofteningSettingsStorageKey);
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (Number.isFinite(Number(parsed.blurPx))) {
        videoSofteningBlurPx = Math.min(20, Math.max(2, Number(parsed.blurPx)));
      }
      if (Number.isFinite(Number(parsed.brightness))) {
        videoSofteningBrightness = Math.min(0.9, Math.max(0.2, Number(parsed.brightness)));
      }
    }
  } catch (error) {
    videoSofteningEnabled = true;
    videoSofteningBlurPx = 5;
    videoSofteningBrightness = 0.75;
  }

  function persistVideoSofteningSettings() {
    try {
      localStorage.setItem(videoSofteningStorageKey, String(videoSofteningEnabled));
      localStorage.setItem(videoSofteningSettingsStorageKey, JSON.stringify({
        blurPx: videoSofteningBlurPx,
        brightness: videoSofteningBrightness
      }));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  }

  function updateVideoSofteningLabel() {
    videoSofteningButton.textContent = videoSofteningEnabled ? 'Weichzeichnen: ON' : 'Weichzeichnen: OFF';
    videoSofteningButton.setAttribute('aria-pressed', String(videoSofteningEnabled));
    if (videoCanvas) {
      videoCanvas.style.filter = 'none';
      videoCanvas.style.transition = 'filter 180ms ease';
    }
    setVideoSofteningEnabled(videoSofteningEnabled);
    setVideoSofteningStyle(videoSofteningBlurPx, videoSofteningBrightness);
    persistVideoSofteningSettings();
  }

  const poseWarningLandmarksButton = document.createElement('button');
  poseWarningLandmarksButton.type = 'button';
  poseWarningLandmarksButton.className = 'tracking-controls-button';
  let levelManagerRef = null;

  const videoSofteningDivider = document.createElement('div');
  videoSofteningDivider.className = 'figure-panel-divider';

  const blurLabel = document.createElement('label');
  blurLabel.textContent = 'Blur';
  blurLabel.className = 'tracking-controls-label';

  const blurSlider = document.createElement('input');
  blurSlider.type = 'range';
  blurSlider.min = '2';
  blurSlider.max = '20';
  blurSlider.step = '1';
  blurSlider.value = String(videoSofteningBlurPx);
  blurSlider.className = 'tracking-controls-range';

  const blurValue = document.createElement('div');
  blurValue.className = 'tracking-controls-inline-value';
  blurValue.textContent = `${videoSofteningBlurPx}px`;

  const brightnessLabel = document.createElement('label');
  brightnessLabel.textContent = 'Brightness';
  brightnessLabel.className = 'tracking-controls-label';

  const brightnessSlider = document.createElement('input');
  brightnessSlider.type = 'range';
  brightnessSlider.min = '0.2';
  brightnessSlider.max = '0.9';
  brightnessSlider.step = '0.05';
  brightnessSlider.value = String(videoSofteningBrightness);
  brightnessSlider.className = 'tracking-controls-range';

  const brightnessValue = document.createElement('div');
  brightnessValue.className = 'tracking-controls-inline-value';
  brightnessValue.textContent = videoSofteningBrightness.toFixed(2);

  function updateVideoSofteningControls() {
    blurSlider.value = String(videoSofteningBlurPx);
    brightnessSlider.value = String(videoSofteningBrightness);
    blurValue.textContent = `${videoSofteningBlurPx}px`;
    brightnessValue.textContent = Number(videoSofteningBrightness).toFixed(2);
    blurSlider.disabled = !videoSofteningEnabled;
    brightnessSlider.disabled = !videoSofteningEnabled;
    setVideoSofteningStyle(videoSofteningBlurPx, videoSofteningBrightness);
  }

  const modeLabel = document.createElement('div');
  modeLabel.textContent = 'Playback';
  modeLabel.className = 'tracking-controls-label';

  const modeGroup = document.createElement('div');
  modeGroup.className = 'tracking-controls-radio-group';

  let calibrationSetChangeHandler = null;
  let calibrationStrictnessChangeHandler = null;

  selectedPlaybackMode = savedPlaybackMode;

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

    const persistedIndex = readPersistedCalibrationIndex();
    const hasPersisted = Number.isInteger(persistedIndex) && persistedIndex >= 0 && persistedIndex < poseSets.length;
    const parsedCurrent = Number(currentValue);
    const hasCurrent = Number.isInteger(parsedCurrent) && parsedCurrent >= 0 && parsedCurrent < poseSets.length;
    selectedCalibrationSetIndex = hasPersisted ? persistedIndex : (hasCurrent ? parsedCurrent : poseSets.length - 1);
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

  function persistSilhouetteSetting() {
    try {
      localStorage.setItem(silhouetteStorageKey, String(silhouetteVisible));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  }

  function updateSilhouetteLabel() {
    silhouetteButton.textContent = silhouetteVisible ? 'Silhouette: ON' : 'Silhouette: OFF';
    silhouetteButton.setAttribute('aria-pressed', String(silhouetteVisible));
    eyesButton.disabled = !silhouetteVisible;
    if (!silhouetteVisible) {
      eyesVisible = false;
      setEyeOverlayEnabled(false);
    } else {
      setEyeOverlayEnabled(eyesVisible);
    }
    updateEyesLabel();
    persistSilhouetteSetting();
  }

  function updateEyesLabel() {
    eyesButton.textContent = eyesVisible ? 'Augen: ON' : 'Augen: OFF';
    eyesButton.setAttribute('aria-pressed', String(eyesVisible));
    eyesButton.disabled = !silhouetteVisible;
  }

  silhouetteOpacitySlider.addEventListener('input', () => {
    const nextOpacity = Number(silhouetteOpacitySlider.value);
    const safeNext = Number.isFinite(nextOpacity) ? Math.min(Number(silhouetteOpacitySlider.max), Math.max(Number(silhouetteOpacitySlider.min), nextOpacity)) : 0.2;
    silhouetteOpacityValue = safeNext;
    updateSilhouetteOpacityControl();
  });

  const restoreDefaultsButton = document.createElement('button');
  restoreDefaultsButton.type = 'button';
  restoreDefaultsButton.className = 'tracking-controls-button';
  restoreDefaultsButton.textContent = 'Werkseinstellung';
  restoreDefaultsButton.addEventListener('click', async () => {
    const confirmed = window.confirm('Möchtest du wirklich alle Parameter und Presets auf die Werkseinstellung zurücksetzen?');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('./motionai-defaults.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const success = window.loadDefaultSettings(json);
      if (success) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to load motionai defaults:', error);
      window.alert('Die Werkseinstellung konnte nicht geladen werden.');
    }
  });

  const defaultCreatedAtText = document.createElement('div');
  defaultCreatedAtText.className = 'tracking-controls-inline-value';
  defaultCreatedAtText.textContent = getCreatedAtDisplayText();
  defaultCreatedAtText.style.marginTop = '0.25rem';
  defaultCreatedAtText.style.opacity = '0.8';

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
    persistSettingsState();
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
    persistSettingsState();
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
    persistSettingsState();
  });

  resolutionToggleButton.addEventListener('click', async () => {
    const nextPreset = resolutionPreset === 'high' ? 'low' : 'high';
    resolutionToggleButton.disabled = true;
    await trackingController.setResolutionPreset(nextPreset);
    resolutionPreset = trackingController.getResolutionPreset();
    updateResolutionToggleLabel();
    resolutionToggleButton.disabled = false;
    persistSettingsState();
  });

  hoverHelpToggleButton.addEventListener('click', () => {
    setHoverHelpEnabled(!uiState.hoverHelpEnabled);
    updateHoverHelpToggleLabel();
    persistSettingsState();
  });

  calibrationSetSelect.addEventListener('change', () => {
    const value = Number(calibrationSetSelect.value);
    selectedCalibrationSetIndex = Number.isInteger(value) ? value : null;
    if (calibrationSetChangeHandler) {
      calibrationSetChangeHandler(selectedCalibrationSetIndex);
    }
    persistSettingsState();
  });

  calibrationStrictnessSlider.addEventListener('input', () => {
    const value = Number(calibrationStrictnessSlider.value);
    setCalibrationStrictness(value);
    if (calibrationStrictnessChangeHandler) {
      calibrationStrictnessChangeHandler(value);
    }
    persistSettingsState();
  });

  stabilizationButton.addEventListener('click', () => {
    stabilizationEnabled = !stabilizationEnabled;
    setStabilizationEnabled(stabilizationEnabled);
    updateStabilizationLabel();
    persistSettingsState();
  });

  landmarkDrawingButton.addEventListener('click', () => {
    landmarkDrawingVisible = !landmarkDrawingVisible;
    setLandmarkDrawingEnabled(landmarkDrawingVisible);
    updateLandmarkDrawingLabel();
    persistSettingsState();
  });

  silhouetteButton.addEventListener('click', () => {
    silhouetteVisible = !silhouetteVisible;
    if (!silhouetteVisible) {
      eyesVisible = false;
    }
    setSilhouetteEnabled(silhouetteVisible);
    setEyeOverlayEnabled(silhouetteVisible && eyesVisible);
    updateSilhouetteLabel();
    persistSettingsState();
  });

  eyesButton.addEventListener('click', () => {
    if (!silhouetteVisible) {
      return;
    }
    eyesVisible = !eyesVisible;
    setEyeOverlayEnabled(eyesVisible);
    updateEyesLabel();
    persistSettingsState();
  });

  videoSofteningButton.addEventListener('click', () => {
    videoSofteningEnabled = !videoSofteningEnabled;
    updateVideoSofteningLabel();
    updateVideoSofteningControls();
    persistSettingsState();
  });

  blurSlider.addEventListener('input', () => {
    videoSofteningBlurPx = Number(blurSlider.value);
    blurValue.textContent = `${videoSofteningBlurPx}px`;
    setVideoSofteningStyle(videoSofteningBlurPx, videoSofteningBrightness);
    persistVideoSofteningSettings();
    persistSettingsState();
  });

  brightnessSlider.addEventListener('input', () => {
    videoSofteningBrightness = Number(brightnessSlider.value);
    brightnessValue.textContent = Number(videoSofteningBrightness).toFixed(2);
    setVideoSofteningStyle(videoSofteningBlurPx, videoSofteningBrightness);
    persistVideoSofteningSettings();
    persistSettingsState();
  });

  poseWarningLandmarksButton.addEventListener('click', () => {
    poseWarningLandmarksVisible = !poseWarningLandmarksVisible;
    if (levelManagerRef) {
      levelManagerRef.setPoseWarningLandmarksEnabled(poseWarningLandmarksVisible);
    }
    updatePoseWarningLandmarksLabel();
    persistSettingsState();
  });

  trackingController.onModelChange((modelName) => {
    modelSelect.value = modelName;
    persistSettingsState();
  });

  trackingController.onCameraChange((deviceId) => {
    cameraEnabled = Boolean(deviceId);
    if (deviceId) {
      cameraSelect.value = deviceId;
    }
    updateCameraToggleLabel();
    persistSettingsState();
  });

  setStabilizationEnabled(stabilizationEnabled);
  setLandmarkDrawingEnabled(landmarkDrawingVisible);
  setSilhouetteEnabled(silhouetteVisible);
  setEyeOverlayEnabled(silhouetteVisible && eyesVisible);
  setSilhouetteOpacity(silhouetteOpacityValue);
  if (levelManagerRef) {
    levelManagerRef.setPoseWarningLandmarksEnabled(poseWarningLandmarksVisible);
  }
  updateStabilizationLabel();
  updateLandmarkDrawingLabel();
  updateSilhouetteLabel();
  updateEyesLabel();
  updateSilhouetteOpacityControl();
  updateVideoSofteningLabel();
  updateVideoSofteningControls();
  updatePoseWarningLandmarksLabel();
  updateCameraToggleLabel();
  updateResolutionToggleLabel();
  updateHoverHelpToggleLabel();
  updateToggleLabel();

  visibilityToggle.addEventListener('click', () => {
    setSettingsVisible(!setupMenuVisible);
  });

  settingsCloseButton.addEventListener('click', () => {
    setSettingsVisible(false);
  });

  settingsHeader.appendChild(settingsTitle);
  settingsHeader.appendChild(settingsCloseButton);

  bindUiGroupDescription([modelLabel, modelSelect], 'Einstellungen', 'Model');
  bindUiGroupDescription([cameraLabel, cameraSelect], 'Einstellungen', 'Camera');
  bindUiGroupDescription([cameraToggleButton], 'Einstellungen', 'Camera: ON');
  bindUiGroupDescription([resolutionToggleButton], 'Einstellungen', 'Resolution');
  bindUiGroupDescription([hoverHelpToggleButton], 'Einstellungen', 'Info Box');
  bindUiGroupDescription([calibrationSetLabel, calibrationSetSelect], 'Einstellungen', 'Calibration Sets');
  bindUiGroupDescription([calibrationStrictnessLabel, calibrationStrictnessSlider], 'Einstellungen', 'Calibration Strictness');
  bindUiGroupDescription([modeLabel, ...modeGroup.querySelectorAll('label, input')], 'Einstellungen', 'Playback');
  bindUiGroupDescription([stabilizationButton], 'Einstellungen', 'Stabilization');
  bindUiGroupDescription([landmarkDrawingButton], 'Einstellungen', 'Landmarks');
  bindUiGroupDescription([silhouetteButton], 'Einstellungen', 'Silhouette');
  bindUiGroupDescription([eyesButton], 'Einstellungen', 'Silhouette');
  bindUiGroupDescription([silhouetteOpacityLabel, silhouetteOpacityValueLabel, silhouetteOpacitySlider], 'Einstellungen', 'Silhouette Deckkraft');
  bindUiGroupDescription([restoreDefaultsButton], 'Einstellungen', 'Werkseinstellung');
  bindUiGroupDescription([videoSofteningButton], 'Einstellungen', 'Weichzeichnen');
  bindUiGroupDescription([blurLabel, blurSlider], 'Einstellungen', 'Weichzeichnen');
  bindUiGroupDescription([brightnessLabel, brightnessSlider], 'Einstellungen', 'Weichzeichnen');
  bindUiGroupDescription([poseWarningLandmarksButton], 'Einstellungen', 'Pose Warning Landmarks');

  container.appendChild(settingsHeader);
  container.appendChild(modelLabel);
  container.appendChild(modelSelect);
  container.appendChild(cameraLabel);
  container.appendChild(cameraSelect);
  container.appendChild(cameraToggleButton);
  container.appendChild(resolutionToggleButton);
  container.appendChild(hoverHelpToggleButton);
  container.appendChild(calibrationSetLabel);
  container.appendChild(calibrationSetSelect);
  container.appendChild(calibrationStrictnessLabel);
  container.appendChild(calibrationStrictnessSlider);
  container.appendChild(calibrationStrictnessValue);
  container.appendChild(modeLabel);
  container.appendChild(modeGroup);
  container.appendChild(stabilizationButton);
  container.appendChild(landmarkDrawingButton);
  container.appendChild(silhouetteButton);
  container.appendChild(eyesButton);
  container.appendChild(silhouetteOpacityRow);
  container.appendChild(silhouetteOpacitySlider);
  container.appendChild(restoreDefaultsButton);
  container.appendChild(defaultCreatedAtText);
  container.appendChild(poseWarningLandmarksButton);
  container.appendChild(videoSofteningDivider);
  container.appendChild(videoSofteningButton);
  container.appendChild(blurLabel);
  container.appendChild(blurSlider);
  container.appendChild(blurValue);
  container.appendChild(brightnessLabel);
  container.appendChild(brightnessSlider);
  container.appendChild(brightnessValue);

  settingsSection.appendChild(container);
  attachPanelHoverHelp(container);

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
  const loadingOverlayTitle = document.createElement('div');
  loadingOverlayTitle.className = 'video-loading-title';
  const loadingOverlaySubtitle = document.createElement('div');
  loadingOverlaySubtitle.className = 'video-loading-subtitle';
  loadingOverlay.appendChild(loadingOverlayTitle);
  loadingOverlay.appendChild(loadingOverlaySubtitle);
  stageFrame.appendChild(loadingOverlay);

  let hasReceivedInitialLandmarks = false;

  function setLoadingOverlayState(state) {
    const states = {
      loading: {
        title: 'Video lädt...',
        subtitle: 'Bitte kurz warten...'
      },
      paused: {
        title: 'Video pausiert',
        subtitle: 'Die App hat keinen Fokus mehr. Beim Wiederkommen wird das Video erneut geladen.'
      }
    };

    const config = states[state] || states.loading;
    loadingOverlayTitle.textContent = config.title;
    loadingOverlaySubtitle.textContent = config.subtitle;
    loadingOverlay.style.display = 'flex';
  }

  function updateLoadingOverlay() {
    const pageHidden = document.visibilityState === 'hidden';
    const streamExists = Boolean(videoElement.srcObject);
    const streamReady = streamExists && videoElement.readyState >= 2;
    const videoPaused = !streamReady && streamExists && videoElement.paused;
    const focusLost = !document.hasFocus() && !pageHidden;
    const shouldShow = pageHidden || focusLost || videoPaused || !streamReady || !hasReceivedInitialLandmarks;

    if (pageHidden || focusLost) {
      setLoadingOverlayState('paused');
      return;
    }

    if (videoPaused) {
      setLoadingOverlayState('paused');
      return;
    }

    if (shouldShow) {
      setLoadingOverlayState('loading');
      return;
    }

    loadingOverlay.style.display = 'none';
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
  videoElement.addEventListener('pause', () => {
    if (document.visibilityState !== 'hidden') {
      setLoadingOverlayState('paused');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      setLoadingOverlayState('paused');
    } else if (!document.hasFocus()) {
      setLoadingOverlayState('paused');
    } else {
      setLoadingOverlayState('loading');
    }
    updateLoadingOverlay();
  });

  document.addEventListener('focus', () => {
    setLoadingOverlayState('loading');
    updateLoadingOverlay();
  });

  document.addEventListener('blur', () => {
    setLoadingOverlayState('paused');
    updateLoadingOverlay();
  });
  videoElement.addEventListener('canplay', updateLoadingOverlay);
  videoElement.addEventListener('playing', updateLoadingOverlay);
  updateLoadingOverlay();

  const trackingController = startTracking(videoElement, canvasElement, { initialModel: 'pose' });
  const controls = createTrackingControls(trackingController);
  const figurePanel = createFigureModePanel(null);
  const dynamicFigurePanel = createDynamicFigureModePanel();
  const handIndependencePanel = createHandIndependencePanel();
  const squareExercisePanel = createSquareExercisePanel();
  const exerciseFieldPanel = createExerciseFieldPanel();
  document.body.appendChild(figurePanel.panel);
  document.body.appendChild(dynamicFigurePanel.panel);
  document.body.appendChild(handIndependencePanel.panel);
  document.body.appendChild(squareExercisePanel.panel);
  document.body.appendChild(exerciseFieldPanel.panel);

  const levelCanvas = document.createElement('canvas');
  levelCanvas.className = 'level-overlay';
  levelCanvas.style.pointerEvents = 'none';
  levelCanvas.style.position = 'absolute';
  levelCanvas.style.left = '0';
  levelCanvas.style.top = '0';
  levelCanvas.style.width = '100%';
  levelCanvas.style.height = '100%';
  stageFrame.appendChild(levelCanvas);

  const syncLevelCanvasPointerState = () => {
    const exerciseFieldActive = uiState.activeChapter === 6
      && Number.isInteger(uiState.activeLevel)
      && uiState.activeLevel >= 0
      && uiState.activeLevel <= 2;
    levelCanvas.style.pointerEvents = exerciseFieldActive ? 'auto' : 'none';
  };

  const levelManager = new LevelManager(levelCanvas);
  levelCanvas.addEventListener('pointerdown', (event) => {
    if (uiState.activeChapter !== 6 || uiState.activeLevel === null || !levelManager.exerciseFieldVisible) {
      return;
    }

    const rect = levelCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (levelCanvas.width / rect.width);
    const y = (event.clientY - rect.top) * (levelCanvas.height / rect.height);
    const didDrag = levelManager.beginExerciseFieldDrag(x, y);
    if (didDrag) {
      event.preventDefault();
    }
  });
  levelCanvas.addEventListener('pointermove', (event) => {
    if (!levelManager.exerciseFieldDrag) {
      return;
    }

    const rect = levelCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (levelCanvas.width / rect.width);
    const y = (event.clientY - rect.top) * (levelCanvas.height / rect.height);
    levelManager.updateExerciseFieldDrag(x, y);
  });
  window.addEventListener('pointerup', () => {
    levelManager.endExerciseFieldDrag();
  });
  canvasElement.addEventListener('pointerdown', (event) => {
    if (uiState.activeChapter !== 1
      || uiState.activeLevel !== 1
      || !levelManager.pointExerciseEditMode
      || levelManager.exerciseFieldVisible) {
      return;
    }

    const rect = canvasElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvasElement.width / rect.width);
    const y = (event.clientY - rect.top) * (canvasElement.height / rect.height);
    const didAdd = levelManager.addPointToSequenceAtPosition(x, y);
    if (didAdd) {
      squareExercisePanel.syncPointState({
        sequence: levelManager.pointExerciseSequence,
        slot: levelManager.pointExerciseSelectedSlot,
        editMode: levelManager.pointExerciseEditMode,
        savedSlots: levelManager.pointExerciseSavedSlots
      });
    }
  });

  const syncChapter1GridResolution = (value) => {
    const next = Math.max(8, Math.min(24, Math.round(Number(value) / 2) * 2));
    squareExercisePanel.setGridResolution(next);
    levelManager.setSquareExerciseGridResolution(next);
    levelManager.setSymmetricExerciseGridResolution(next);
  };
  const syncChapter1Resolution = (value) => {
    const next = Math.min(1.0, Math.max(0.55, Number(value)));
    squareExercisePanel.setResolution(next);
    levelManager.setSquareExerciseResolution(next);
    levelManager.setSymmetricExerciseResolution(next);
  };

  figurePanel.setLevelManager(levelManager);
  squareExercisePanel.setLevelManager({
    setSquareExerciseShape: (value) => levelManager.setSquareExerciseShape(value),
    setSquareExerciseHandMode: (value) => levelManager.setSquareExerciseHandMode(value),
    setSquareExerciseSyncMode: (value) => levelManager.setSquareExerciseSyncMode(value),
    setSquareExerciseResolution: (value) => {
      syncChapter1Resolution(value);
    },
    setSquareExerciseGridResolution: (value) => {
      syncChapter1GridResolution(value);
    },
    setSquareExerciseCenterDistance: (value) => {
      levelManager.setSquareExerciseCenterDistance(value);
    },
    setAlternatingExerciseScaleMode: (value) => {
      levelManager.setAlternatingExerciseScaleMode(value);
    },
    setAlternatingExerciseStartNote: (value) => {
      levelManager.setAlternatingExerciseStartNote(value);
    },
    setAlternatingExerciseFrequencyModulation: (value) => {
      levelManager.setAlternatingExerciseFrequencyModulation(value);
    },
    setAlternatingExerciseAxisSwap: (value) => {
      levelManager.setAlternatingExerciseAxisSwap(value);
    },
    setAlternatingExerciseVolume: (value) => {
      levelManager.setAlternatingExerciseVolume(value);
    },
    setActiveTouchFadeEnabled: (value) => {
      levelManager.setActiveTouchFadeEnabled(value);
    },
    alternatingExerciseScaleMode: levelManager.alternatingScaleMode,
    alternatingExerciseStartNote: levelManager.alternatingExerciseStartNote,
    alternatingExerciseFrequencyModulation: levelManager.alternatingExerciseFrequencyModulation,
    alternatingExerciseAxisSwap: levelManager.alternatingExerciseAxisSwap,
    activeTouchFadeEnabled: levelManager.activeTouchFadeEnabled,
    pointExerciseEditMode: levelManager.pointExerciseEditMode,
    pointExerciseSelectedSlot: levelManager.pointExerciseSelectedSlot,
    pointExerciseSequence: levelManager.pointExerciseSequence,
    pointExerciseSavedSlots: levelManager.pointExerciseSavedSlots,
    setPointExerciseEditMode: (value) => levelManager.setPointExerciseEditMode(value),
    setPointExerciseHand: (value) => levelManager.setPointExerciseHand(value),
    setPointExerciseSymmetryMode: (value) => levelManager.setPointExerciseSymmetryMode(value),
    setPointExercisePalindromMode: (value) => levelManager.setPointExercisePalindromMode(value),
    setPointExerciseSequentialMode: (value) => levelManager.setPointExerciseSequentialMode(value),
    setPointExerciseSelectedSlot: (value) => levelManager.setPointExerciseSelectedSlot(value),
    setPointExerciseSequence: (value) => levelManager.setPointExerciseSequence(value),
    setPointExerciseSavedSlots: (value) => levelManager.setPointExerciseSavedSlots(value)
  });
  exerciseFieldPanel.setLevelManager({
    get exerciseFieldVisible() { return levelManager.exerciseFieldVisible; },
    get exerciseFieldScale() { return levelManager.exerciseFieldScale; },
    get exerciseFieldXOffset() { return levelManager.exerciseFieldXOffset; },
    get exerciseFieldStrikeCount() { return levelManager.exerciseFieldStrikeCount; },
    get exerciseFieldStrikeRadius() { return levelManager.exerciseFieldStrikeRadius; },
    get exerciseFieldStrikePositions() { return levelManager.exerciseFieldStrikePositions; },
    get exerciseFieldChallengeMode() { return levelManager.exerciseFieldChallengeMode; },
    get exerciseFieldTempoBpm() { return levelManager.exerciseFieldTempoBpm; },
    getExerciseFieldMetrics: () => levelManager.getExerciseFieldMetrics(),
    resumeExerciseFieldMetronomeAudio: () => levelManager.resumeExerciseFieldMetronomeAudio(),
    setExerciseFieldVisible: (value) => levelManager.setExerciseFieldVisible(value),
    setExerciseFieldScale: (value) => levelManager.setExerciseFieldScale(value),
    setExerciseFieldXOffset: (value) => levelManager.setExerciseFieldXOffset(value),
    setExerciseFieldStrikeCount: (value) => levelManager.setExerciseFieldStrikeCount(value),
    setExerciseFieldStrikeRadius: (value) => levelManager.setExerciseFieldStrikeRadius(value),
    setExerciseFieldAssignment: (assignment) => levelManager.setExerciseFieldAssignment(assignment),
    setExerciseFieldChallengeMode: (mode) => levelManager.setExerciseFieldChallengeMode(mode),
    setExerciseFieldTempoBpm: (value) => levelManager.setExerciseFieldTempoBpm(value),
    setExerciseFieldMetronomeEnabled: (enabled) => levelManager.setExerciseFieldMetronomeEnabled(enabled),
    setExerciseFieldStrikePositions: (positions) => levelManager.setExerciseFieldStrikePositions(positions)
  });
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
    setMotionDistanceVisible: (value) => levelManager.setMotionDistanceVisible(value),
    setMotionDistanceStrictness: (value) => levelManager.setMotionDistanceStrictness(value),
    getMotionDistanceSummary: () => levelManager.getMotionDistanceSummary(),
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
    setHandIndependenceFigureVariation: (value) => levelManager.setHandIndependenceFigureVariation(value),
    setHandIndependenceReverse: (value) => levelManager.setHandIndependenceReverse(value),
    setHandIndependenceDynamicsVisible: (value) => levelManager.setHandIndependenceDynamicsVisible(value),
    setHandIndependenceCountTimesVisible: (value) => levelManager.setHandIndependenceCountTimesVisible(value),
    setMotionDistanceVisible: (value) => levelManager.setMotionDistanceVisible(value),
    setMotionDistanceStrictness: (value) => levelManager.setMotionDistanceStrictness(value),
    getMotionDistanceSummary: () => levelManager.getMotionDistanceSummary(),
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

  const chapter1ExerciseTitles = ['Ziffern', 'Punkte', 'Alternierend', 'Parallele Linien', 'Kreis'];

  const getChapter1ExercisePanelVisibility = (level) => {
    if (!Number.isInteger(level) || uiState.activeChapter !== 1) {
      return { square: false, symmetric: false, points: false };
    }

    if (level === 1) {
      return { square: false, symmetric: false, points: true };
    }

    if ([3, 4].includes(level)) {
      return { square: false, symmetric: false, points: false };
    }

    if ([0, 2].includes(level)) {
      return { square: true, symmetric: false, points: false };
    }

    return { square: true, symmetric: false, points: false };
  };

  onChapterChange((chapter) => {
    levelManager.setChapter(chapter);
    syncLevelCanvasPointerState();
    const isFigureChapter = chapter === 3;
    const isDynamicFigureChapter = chapter === 4;
    const isHandIndependenceChapter = chapter === 5;
    const exerciseVisibility = getChapter1ExercisePanelVisibility(uiState.activeLevel);
    const showSquareExercisePanel = chapter === 1 && exerciseVisibility.square;
    const showSymmetricExercisePanel = chapter === 1 && exerciseVisibility.symmetric;
    const showPointsExercisePanel = chapter === 1 && exerciseVisibility.points;
    const showExerciseFieldPanel = chapter === 6 && Number.isInteger(uiState.activeLevel) && uiState.activeLevel >= 0 && uiState.activeLevel <= 2;
    const selectedSquareMode = showPointsExercisePanel
      ? 'points'
      : showSymmetricExercisePanel
        ? 'symmetric'
        : (chapter === 1 && Number.isInteger(uiState.activeLevel) && uiState.activeLevel === 2)
          ? 'free-movement'
          : 'square';
    figurePanel.setVisible(isFigureChapter);
    dynamicFigurePanel.setVisible(isDynamicFigureChapter);
    handIndependencePanel.setVisible(isHandIndependenceChapter);
    squareExercisePanel.setVisible(showSquareExercisePanel || showSymmetricExercisePanel || showPointsExercisePanel || chapter === 1 && uiState.activeLevel !== null);
    squareExercisePanel.setExerciseMode(selectedSquareMode);
    exerciseFieldPanel.setVisible(showExerciseFieldPanel);
    if (!showExerciseFieldPanel) {
      levelManager.setExerciseFieldVisible(false);
    } else {
      levelManager.setExerciseFieldVisible(true);
    }
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
    syncLevelCanvasPointerState();
    if (level !== null) {
      setLevelActive(true);
      clearHoverDescription();
    } else {
      setLevelActive(false);
    }

    const exerciseVisibility = getChapter1ExercisePanelVisibility(level);
    const showSquareExercisePanel = uiState.activeChapter === 1 && exerciseVisibility.square;
    const showSymmetricExercisePanel = uiState.activeChapter === 1 && exerciseVisibility.symmetric;
    const showPointsExercisePanel = uiState.activeChapter === 1 && exerciseVisibility.points;
    const blankChapter1ExercisePanel = uiState.activeChapter === 1 && Number.isInteger(level) && [3, 4].includes(level);
    const freeMovementExercisePanel = uiState.activeChapter === 1 && Number.isInteger(level) && level === 2;
    const alternatingExercisePanel = uiState.activeChapter === 1 && Number.isInteger(level) && level === 2 && false;
    const showExerciseFieldPanel = uiState.activeChapter === 6 && Number.isInteger(level) && level >= 0 && level <= 2;
    const squareExerciseTitle = uiState.activeChapter === 1 && Number.isInteger(level) && level >= 0 && level < chapter1ExerciseTitles.length
      ? chapter1ExerciseTitles[level]
      : 'Ziffern';
    if (uiState.activeChapter === 1) {
      squareExercisePanel.setTitle(squareExerciseTitle);
    }

    if (uiState.activeChapter === 6) {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(false);
      squareExercisePanel.setVisible(false);
      exerciseFieldPanel.setVisible(showExerciseFieldPanel);
      if (Number.isInteger(level) && level >= 0 && level <= 2) {
        const nextStrikeCount = getExerciseFieldLevelStrikeCount(level);
        exerciseFieldPanel.setStrikeCount(nextStrikeCount);
        exerciseFieldPanel.applyPreset(level, null);
        exerciseFieldPanel.setStrikeCount(nextStrikeCount);
      }
      if (!showExerciseFieldPanel) {
        levelManager.setExerciseFieldVisible(false);
      } else {
        levelManager.setExerciseFieldVisible(true);
      }
      return;
    }

    if (uiState.activeChapter === 3) {
      figurePanel.setVisible(level !== null);
      figurePanel.setTitle(level !== null && level >= 4 ? 'extended' : 'basic');
      figurePanel.setLevel(level);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(false);
      squareExercisePanel.setVisible(false);
    } else if (uiState.activeChapter === 4) {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(level !== null);
      dynamicFigurePanel.setTitle('dynamic');
      dynamicFigurePanel.setLevel(level);
      handIndependencePanel.setVisible(false);
      squareExercisePanel.setVisible(false);
    } else if (uiState.activeChapter === 5) {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(level !== null);
      handIndependencePanel.applyPreset(level);
      handIndependencePanel.setLevel();
      squareExercisePanel.setVisible(false);
    } else if (uiState.activeChapter === 1) {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(false);
      squareExercisePanel.setVisible(showSquareExercisePanel || showSymmetricExercisePanel || showPointsExercisePanel || blankChapter1ExercisePanel || !!level);
      squareExercisePanel.setExerciseMode(
        blankChapter1ExercisePanel
          ? 'blank'
          : showPointsExercisePanel
            ? 'points'
            : showSymmetricExercisePanel
              ? 'symmetric'
              : freeMovementExercisePanel
                ? 'free-movement'
                : alternatingExercisePanel
                  ? 'alternating'
                  : 'square'
      );
    } else {
      figurePanel.setVisible(false);
      dynamicFigurePanel.setVisible(false);
      handIndependencePanel.setVisible(false);
      squareExercisePanel.setVisible(false);
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
  document.addEventListener('exercise-field-save-preset', () => {
    const savedSlot = exerciseFieldPanel.savePresetFromPrompt();
    if (Number.isInteger(savedSlot)) {
      setActiveLevel(savedSlot);
    }
  });
  document.addEventListener('exercise-field-reset-presets', () => {
    exerciseFieldPanel.resetPresets();
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
