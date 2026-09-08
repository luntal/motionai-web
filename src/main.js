import { initApp } from './app.js';
import {
  DEFAULT_MOTIONAI_STORAGE,
  applyDefaultStorageSnapshot,
  getMotionAiStorageSnapshot,
  hasMotionAiStorageState
} from './defaultSettings.js';

if (typeof window !== 'undefined') {
  const hasExistingMotionAiState = hasMotionAiStorageState();

  if (!hasExistingMotionAiState) {
    applyDefaultStorageSnapshot(DEFAULT_MOTIONAI_STORAGE);
  }

  window.exportDefaults = () => {
    const snapshot = getMotionAiStorageSnapshot();
    const payload = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'motionai-defaults.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    console.log('MotionAI defaults exported:', payload);
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

    applyDefaultStorageSnapshot(snapshot);
    console.log('MotionAI defaults loaded from snapshot.');
    return true;
  };

  window.resetToDefaultSettings = async () => {
    const confirmed = window.confirm('Möchtest du wirklich alle Parameter und Presets auf die Werkseinstellung zurücksetzen?');
    if (!confirmed) {
      return false;
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
      return success;
    } catch (error) {
      console.error('Failed to load motionai defaults:', error);
      window.alert('Die Werkseinstellung konnte nicht geladen werden.');
      return false;
    }
  };
}

initApp();
