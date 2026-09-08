export const DEFAULT_MOTIONAI_STORAGE = {
  'motionai.settings-panel-state': {
    model: 'pose',
    cameraEnabled: true,
    cameraDeviceId: null,
    resolutionPreset: 'high',
    hoverHelpEnabled: false,
    playbackMode: 'one',
    calibrationSetIndex: null,
    calibrationStrictness: 60,
    stabilizationEnabled: false,
    landmarkDrawingVisible: true,
    silhouetteVisible: false,
    silhouetteOpacity: 0.2,
    videoSofteningEnabled: true,
    videoSofteningBlurPx: 5,
    videoSofteningBrightness: 0.75,
    poseWarningLandmarksVisible: false
  },
  'motionai.silhouette-enabled': false,
  'motionai.silhouette-opacity': 0.2,
  'motionai.video-softening-enabled': true,
  'motionai.video-softening-settings': {
    blurPx: 5,
    brightness: 0.75
  },
  'motionai.figure-panel-settings': {
    figureScale: 0.33,
    figureHorizontalOffset: 0.25,
    figureVerticalOffset: 0.5,
    figureDynamicsVisible: false,
    figureCountTimesVisible: false,
    figureStroke: 0.5,
    figureSoftTransitionPercent: 50,
    figureMode: 'soft',
    figureSide: 'left'
  },
  'motionai.figure-presets': {},
  'motionai.figure-selected-presets': {},
  'motionai.dynamic-figure-presets': {},
  'motionai.dynamic-figure-selected-presets': {},
  'motionai.hand-independence-panel-settings': {
    reverse: false,
    dynamicVisible: false,
    countVisible: false,
    countTimesVisible: false
  },
  'motionai.exercise-field-panel-settings': {
    enabled: true,
    scale: 1,
    xOffset: 0,
    strikeCount: 2,
    strikeRadius: 20,
    fieldSide: 'left',
    fieldVertical: 'top',
    fieldBeat: 1,
    mode: 'free',
    tempoBpm: 60,
    metronomeEnabled: false,
    strikePositions: { left: [], right: [] }
  },
  'motionai.exercise-field-presets': {
    '0': { enabled: true, scale: 1, xOffset: 0, strikeCount: 2, strikeRadius: 20, fieldSide: 'left', fieldVertical: 'top', fieldBeat: 1, mode: 'free', tempoBpm: 60, metronomeEnabled: false, strikePositions: { left: [], right: [] } },
    '1': { enabled: true, scale: 1, xOffset: 0, strikeCount: 2, strikeRadius: 20, fieldSide: 'left', fieldVertical: 'top', fieldBeat: 1, mode: 'free', tempoBpm: 60, metronomeEnabled: false, strikePositions: { left: [], right: [] } },
    '2': { enabled: true, scale: 1, xOffset: 0, strikeCount: 2, strikeRadius: 20, fieldSide: 'left', fieldVertical: 'top', fieldBeat: 1, mode: 'free', tempoBpm: 60, metronomeEnabled: false, strikePositions: { left: [], right: [] } },
    '3': { enabled: true, scale: 1, xOffset: 0, strikeCount: 2, strikeRadius: 20, fieldSide: 'left', fieldVertical: 'top', fieldBeat: 1, mode: 'free', tempoBpm: 60, metronomeEnabled: false, strikePositions: { left: [], right: [] } },
    '4': { enabled: true, scale: 1, xOffset: 0, strikeCount: 2, strikeRadius: 20, fieldSide: 'left', fieldVertical: 'top', fieldBeat: 1, mode: 'free', tempoBpm: 60, metronomeEnabled: false, strikePositions: { left: [], right: [] } }
  }
};

export function clearMotionAiStorageState() {
  try {
    const keysToRemove = [];
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('motionai.')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // Ignore storage failures.
  }
}

export function applyDefaultStorageSnapshot(snapshot = {}) {
  const nextSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};

  clearMotionAiStorageState();

  Object.entries(nextSnapshot).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      return;
    }

    try {
      const serialized = typeof value === 'string'
        ? value
        : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      // Ignore quota or storage failures.
    }
  });
}

export function getMotionAiStorageEntries() {
  const entries = {};

  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('motionai.')) {
        continue;
      }

      try {
        const rawValue = localStorage.getItem(key);
        entries[key] = rawValue === null ? null : rawValue;
      } catch (error) {
        entries[key] = null;
      }
    }
  } catch (error) {
    return entries;
  }

  return entries;
}

export function getMotionAiStorageSnapshot() {
  const entries = getMotionAiStorageEntries();
  const snapshot = {};

  Object.entries(entries).forEach(([key, value]) => {
    if (value === null) {
      return;
    }

    try {
      const parsed = JSON.parse(value);
      snapshot[key] = parsed;
    } catch (error) {
      snapshot[key] = value;
    }
  });

  return snapshot;
}

export function hasMotionAiStorageState() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('motionai.')) {
        return true;
      }
    }
  } catch (error) {
    return false;
  }

  return false;
}
