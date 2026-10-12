import { initApp } from './app.js';
import {
  fetchMotionAiDefaultsSnapshot,
  getMotionAiActiveUserId,
  getMotionAiUserRegistry,
  getMotionAiUserStorageBucket,
  getMotionAiUserStorageSnapshot,
  installMotionAiStorageBridge,
  MOTIONAI_DOZENT_USER_ID,
  resetMotionAiUserStorageToDefaults
} from './defaultSettings.js';

// Exported defaults always start with preset slot 1 selected (0-based except the square-exercise slots, which are 1-based) and Bearbeiten switched off.
function resetSelectedPresetSlots(snapshot) {
  const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

  ['motionai.figure-selected-presets', 'motionai.dynamic-figure-selected-presets'].forEach((key) => {
    if (isObject(snapshot[key])) {
      Object.keys(snapshot[key]).forEach((levelKey) => {
        snapshot[key][levelKey] = 0;
      });
    }
  });

  [
    ['motionai.exercise-field-presets', 'selectedSlot', 0],
    ['motionai.hand-independence-presets', 'selectedSlot', 0],
    ['motionai.consistency-presets', 'selectedSlot', 0],
    ['motionai.square-exercise-presets', 'selectedPresetSlot', 1]
  ].forEach(([key, slotField, firstSlot]) => {
    if (!isObject(snapshot[key])) {
      return;
    }
    Object.values(snapshot[key]).forEach((levelBucket) => {
      if (isObject(levelBucket) && Object.prototype.hasOwnProperty.call(levelBucket, slotField)) {
        levelBucket[slotField] = firstSlot;
      }
    });
  });

  // Bearbeiten mode: the global toggle and every stored point edit flag start switched off.
  const visibility = snapshot['motionai.levelSettingsVisibility'];
  if (isObject(visibility)) {
    ['visible', 'value'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(visibility, field)) {
        visibility[field] = false;
      }
    });
  } else if (Object.prototype.hasOwnProperty.call(snapshot, 'motionai.levelSettingsVisibility')) {
    snapshot['motionai.levelSettingsVisibility'] = false;
  }
  const disablePointEditMode = (node) => {
    if (Array.isArray(node)) {
      node.forEach(disablePointEditMode);
    } else if (isObject(node)) {
      Object.keys(node).forEach((key) => {
        if (key === 'pointEditMode') {
          node[key] = false;
        } else {
          disablePointEditMode(node[key]);
        }
      });
    }
  };
  disablePointEditMode(snapshot);

  const pointSettings = snapshot['motionai.square-exercise-panel-settings-points'];
  if (isObject(pointSettings) && Object.prototype.hasOwnProperty.call(pointSettings, 'pointSelectedSlot')) {
    pointSettings.pointSelectedSlot = 1;
  }
}

if (typeof window !== 'undefined') {
  installMotionAiStorageBridge();

  window.exportDefaults = () => {
    const snapshot = JSON.parse(JSON.stringify(getMotionAiUserStorageSnapshot(getMotionAiActiveUserId())));
    resetSelectedPresetSlots(snapshot);
    const settingsState = snapshot['motionai.settings-panel-state'];
    const exportedAt = new Date().toISOString();

    if (settingsState && typeof settingsState === 'object') {
      settingsState.createdAt = exportedAt;
    } else {
      snapshot['motionai.settings-panel-state'] = { createdAt: exportedAt };
    }

    const payload = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getMotionAiActiveUserId() === MOTIONAI_DOZENT_USER_ID ? 'motionai-d.json' : 'motionai-defaults.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    console.log('MotionAI defaults exported:', payload);
    return payload;
  };

  window.exportExams = () => {
    const registry = getMotionAiUserRegistry();
    const exportedAt = new Date().toISOString();
    const users = registry.map((userEntry) => {
      const userId = userEntry && typeof userEntry.id === 'string' ? userEntry.id : 'default';
      const userBucket = getMotionAiUserStorageBucket(userId) || {};
      const resultsByLevel = {};

      Object.entries(userBucket).forEach(([sectionName, value]) => {
        const normalizedSection = String(sectionName || '').replace(/^motionai\./, '');
        if (!normalizedSection.startsWith('exam.results.level.')) {
          return;
        }

        const levelKey = normalizedSection.replace(/^exam\.results\.level\./, '');
        if (typeof value !== 'undefined') {
          resultsByLevel[levelKey] = value;
        }
      });

      return {
        userId,
        label: userEntry && typeof userEntry.label === 'string' ? userEntry.label : userId,
        results: resultsByLevel
      };
    });

    const payload = JSON.stringify({ exportedAt, users }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'motionai-exams.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    console.log('MotionAI exam exports generated:', payload);
    return payload;
  };

  window.loadDefaultSettings = (file) => {
    if (!file) {
      console.warn('loadDefaultSettings(file) expects a JSON object or a JSON file path.');
      return false;
    }

    let snapshot = file;

    if (typeof file === 'string') {
      try {
        snapshot = JSON.parse(file);
      } catch (error) {
        console.warn('Failed to parse default settings JSON string.');
        return false;
      }
    }

    if (!snapshot || typeof snapshot !== 'object') {
      console.warn('Default settings must be a JSON object.');
      return false;
    }

    resetMotionAiUserStorageToDefaults(getMotionAiActiveUserId(), snapshot);
    console.log('MotionAI defaults loaded from snapshot.');
    return true;
  };

  window.resetToDefaultSettings = async () => {
    const confirmed = window.confirm('Möchtest du wirklich alle Parameter und Presets auf die Werkseinstellung zurücksetzen?');
    if (!confirmed) {
      return false;
    }

    try {
      const snapshot = await fetchMotionAiDefaultsSnapshot();
      const success = window.loadDefaultSettings(snapshot);
      if (success) {
        window.location.reload();
      }
      return success;
    } catch (error) {
      console.error('Failed to load motionai defaults:', error);
      window.alert('Die Werkseinstellung konnte nicht geladen werden.');
      return false;
    }
  };
}

initApp();
