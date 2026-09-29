export const MOTIONAI_STORAGE_ROOT = 'motionai';
export const MOTIONAI_ACTIVE_USER_STORAGE_KEY = 'motionai.active-user-id';
export const MOTIONAI_STORAGE_LEGACY_ALIASES = {
  callibration_date: 'motionai.calibration-sets',
  'motionai.callibration_date': 'motionai.calibration-sets',
  'motionai.calibration_date': 'motionai.calibration-sets'
};

export function normalizeMotionAiUserId(value, fallback = 'default') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().replace(/^motionai\.users\./, '').replace(/^motionai\./, '');
  const cleaned = normalized.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || fallback;
}

export function canonicalizeMotionAiStorageKey(storageKey) {
  if (typeof storageKey !== 'string') {
    return storageKey;
  }

  const trimmedKey = storageKey.trim();
  if (!trimmedKey) {
    return trimmedKey;
  }

  const legacyAlias = MOTIONAI_STORAGE_LEGACY_ALIASES[trimmedKey];
  if (legacyAlias) {
    return legacyAlias;
  }

  if (trimmedKey.startsWith(`${MOTIONAI_STORAGE_ROOT}.`)) {
    return trimmedKey;
  }

  if (trimmedKey.startsWith(`${MOTIONAI_STORAGE_ROOT}.users.`)) {
    return trimmedKey;
  }

  return `${MOTIONAI_STORAGE_ROOT}.${trimmedKey}`;
}

export function getMotionAiStorageKey(sectionName, userId = null) {
  const section = typeof sectionName === 'string' ? sectionName.trim() : '';
  const sectionValue = section ? section.replace(/^motionai\./, '') : '';
  const normalizedUserId = userId === null || typeof userId === 'undefined'
    ? null
    : normalizeMotionAiUserId(String(userId), null);

  if (!sectionValue) {
    if (normalizedUserId) {
      return `${MOTIONAI_STORAGE_ROOT}.users.${normalizedUserId}`;
    }
    return MOTIONAI_STORAGE_ROOT;
  }

  if (normalizedUserId) {
    return `${MOTIONAI_STORAGE_ROOT}.users.${normalizedUserId}.${sectionValue}`;
  }

  return `${MOTIONAI_STORAGE_ROOT}.${sectionValue}`;
}

// Resolved once per page load and never refreshed: switching the active user only
// takes effect after the caller reloads the page. Without this cache, a user
// switch followed by a reload races with residual blur/visibilitychange handlers
// (e.g. camera teardown) still running in the old page, which would then read the
// already-updated active user id and persist the OLD session's in-memory values
// into the NEW user's bucket.
let cachedActiveUserId = null;

export function getMotionAiActiveUserId() {
  if (cachedActiveUserId) {
    return cachedActiveUserId;
  }

  try {
    const value = localStorage.getItem(MOTIONAI_ACTIVE_USER_STORAGE_KEY);
    cachedActiveUserId = normalizeMotionAiUserId(value, 'default');
  } catch (error) {
    cachedActiveUserId = 'default';
  }

  return cachedActiveUserId;
}

export function setMotionAiActiveUserId(userId = 'default') {
  try {
    // Intentionally do not update cachedActiveUserId: this page instance must
    // keep operating as the user it started as until an actual reload happens.
    localStorage.setItem(MOTIONAI_ACTIVE_USER_STORAGE_KEY, normalizeMotionAiUserId(userId, 'default'));
    return true;
  } catch (error) {
    return false;
  }
}

export function getMotionAiUserStorageBucketKey(userId = getMotionAiActiveUserId()) {
  return `${MOTIONAI_STORAGE_ROOT}.users.${normalizeMotionAiUserId(userId, 'default')}`;
}

export function getMotionAiUserStorageBucket(userId = getMotionAiActiveUserId()) {
  const bucketKey = getMotionAiUserStorageBucketKey(userId);
  try {
    const raw = localStorage.getItem(bucketKey);
    if (raw === null || raw === '') {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

export function setMotionAiUserStorageBucket(userId = getMotionAiActiveUserId(), bucket = {}) {
  const nextBucket = bucket && typeof bucket === 'object' ? bucket : {};
  try {
    localStorage.setItem(getMotionAiUserStorageBucketKey(userId), JSON.stringify(nextBucket));
    return nextBucket;
  } catch (error) {
    return nextBucket;
  }
}

export function normalizeMotionAiBucketSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }

  const normalized = {};
  Object.entries(snapshot).forEach(([key, value]) => {
    const canonicalKey = canonicalizeMotionAiStorageKey(key);
    normalized[canonicalKey] = value;
  });

  return normalized;
}

export function buildMotionAiUserBucketFromSnapshot(snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const nextBucket = {};
  const normalizedSnapshot = normalizeMotionAiBucketSnapshot(snapshot || {});

  Object.entries(normalizedSnapshot).forEach(([key, value]) => {
    const sectionName = key.replace(new RegExp(`^${MOTIONAI_STORAGE_ROOT}\.`), '');
    if (!sectionName || sectionName.startsWith('users.')) {
      return;
    }
    nextBucket[sectionName] = value;
  });

  return nextBucket;
}

export function ensureMotionAiUserStorage(userId = 'default', snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const normalizedUserId = normalizeMotionAiUserId(userId, 'default');
  const bucket = getMotionAiUserStorageBucket(normalizedUserId);
  if (bucket && Object.keys(bucket).length > 0) {
    return bucket;
  }

  const nextBucket = buildMotionAiUserBucketFromSnapshot(snapshot);
  setMotionAiUserStorageBucket(normalizedUserId, nextBucket);
  return nextBucket;
}

// Unlike ensureMotionAiUserStorage, this always overwrites the user's bucket,
// used for an explicit "Werkseinstellung" reset rather than first-time seeding.
export function resetMotionAiUserStorageToDefaults(userId = getMotionAiActiveUserId(), snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const normalizedUserId = normalizeMotionAiUserId(userId, 'default');
  const nextBucket = buildMotionAiUserBucketFromSnapshot(snapshot);
  setMotionAiUserStorageBucket(normalizedUserId, nextBucket);
  return nextBucket;
}

export function ensureMotionAiDefaultUserStorage(snapshot = DEFAULT_MOTIONAI_STORAGE) {
  return ensureMotionAiUserStorage('default', snapshot);
}

export const MOTIONAI_USER_REGISTRY_STORAGE_KEY = 'motionai.user-registry';

function slugifyMotionAiUserLabel(label) {
  const slug = String(label || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'user';
}

export function getMotionAiUserRegistry() {
  let registry;
  try {
    const raw = localStorage.getItem(MOTIONAI_USER_REGISTRY_STORAGE_KEY);
    registry = raw ? JSON.parse(raw) : [];
  } catch (error) {
    registry = [];
  }

  if (!Array.isArray(registry)) {
    registry = [];
  }

  // 'default' always exists (it's seeded at boot) even if never explicitly registered.
  if (!registry.some((entry) => entry && entry.id === 'default')) {
    registry = [{ id: 'default', label: 'Default', createdAt: new Date().toISOString() }, ...registry];
  }

  return registry;
}

export function setMotionAiUserRegistry(registry) {
  try {
    localStorage.setItem(MOTIONAI_USER_REGISTRY_STORAGE_KEY, JSON.stringify(Array.isArray(registry) ? registry : []));
  } catch (error) {
    // Ignore storage failures.
  }
}

export function registerMotionAiUser(userId, label) {
  const normalizedId = normalizeMotionAiUserId(userId, null);
  if (!normalizedId) {
    return getMotionAiUserRegistry();
  }

  const registry = getMotionAiUserRegistry();
  if (registry.some((entry) => entry.id === normalizedId)) {
    return registry;
  }

  registry.push({ id: normalizedId, label: label || normalizedId, createdAt: new Date().toISOString() });
  setMotionAiUserRegistry(registry);
  return registry;
}

// Creates a brand-new, isolated user: derives a unique id from the display
// label, seeds its bucket from the given defaults snapshot, and registers it.
export function createMotionAiUser(label, snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const trimmedLabel = typeof label === 'string' ? label.trim() : '';
  if (!trimmedLabel) {
    return null;
  }

  const registry = getMotionAiUserRegistry();
  const baseId = slugifyMotionAiUserLabel(trimmedLabel);
  let candidateId = baseId;
  let suffix = 2;
  while (registry.some((entry) => entry.id === candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  ensureMotionAiUserStorage(candidateId, snapshot);
  registerMotionAiUser(candidateId, trimmedLabel);

  return { id: candidateId, label: trimmedLabel };
}

export function getMotionAiBucketValue(storageKey, fallback = null, userId = getMotionAiActiveUserId()) {
  const sectionName = typeof storageKey === 'string' ? storageKey.trim() : '';
  if (!sectionName) {
    return fallback;
  }

  const normalizedKey = sectionName.replace(/^motionai\./, '');
  const bucket = getMotionAiUserStorageBucket(userId);
  if (bucket && Object.prototype.hasOwnProperty.call(bucket, normalizedKey)) {
    return bucket[normalizedKey];
  }

  // No shared/global fallback here: falling back to a root-level key would leak
  // one user's value to every other user that hasn't set this key yet.
  return fallback;
}

export function setMotionAiBucketValue(storageKey, value, userId = getMotionAiActiveUserId()) {
  const sectionName = typeof storageKey === 'string' ? storageKey.trim() : '';
  if (!sectionName) {
    return value;
  }

  const normalizedSection = sectionName.replace(/^motionai\./, '');
  const safeUserId = normalizeMotionAiUserId(userId, 'default');

  // Write only into the user's own bucket; never mirror into a shared root key,
  // otherwise every user's writes would clobber a single shared value.
  const bucket = getMotionAiUserStorageBucket(safeUserId);
  bucket[normalizedSection] = value;
  setMotionAiUserStorageBucket(safeUserId, bucket);

  return value;
}

export function installMotionAiStorageBridge() {
  if (typeof window === 'undefined' || typeof Storage === 'undefined') {
    return false;
  }

  const storageProto = Object.getPrototypeOf(localStorage);
  if (storageProto && storageProto.__motionaiStorageBridgeInstalled) {
    return true;
  }

  const nativeGetItem = storageProto.getItem.bind(localStorage);
  const nativeSetItem = storageProto.setItem.bind(localStorage);
  const nativeRemoveItem = storageProto.removeItem.bind(localStorage);

  storageProto.getItem = function getItemPatched(key) {
    const canonicalKey = canonicalizeMotionAiStorageKey(key);
    const canonicalValue = nativeGetItem(canonicalKey);
    if (canonicalValue !== null) {
      return canonicalValue;
    }

    if (canonicalKey === key) {
      return null;
    }

    const legacyValue = nativeGetItem(key);
    if (legacyValue !== null && canonicalKey !== key) {
      nativeSetItem(canonicalKey, legacyValue);
      nativeRemoveItem(key);
    }

    return legacyValue;
  };

  storageProto.setItem = function setItemPatched(key, value) {
    return nativeSetItem(canonicalizeMotionAiStorageKey(key), value);
  };

  storageProto.removeItem = function removeItemPatched(key) {
    return nativeRemoveItem(canonicalizeMotionAiStorageKey(key));
  };

  storageProto.__motionaiStorageBridgeInstalled = true;
  return true;
}

export const DEFAULT_MOTIONAI_STORAGE = {
  'motionai.calibration-sets': [],
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
    poseWarningLandmarksVisible: false,
    createdAt: '2026-09-09T00:00:00.000Z'
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
    figureSide: 'left',
    motionDistanceScoreWeights: { path: 45, timing: 30, direction: 25 }
  },
  'motionai.figure-presets': {},
  'motionai.figure-selected-presets': {},
  'motionai.dynamic-figure-presets': {},
  'motionai.dynamic-figure-selected-presets': {},
  'motionai.hand-independence-panel-settings': {
    reverse: false,
    dynamicsVisible: false,
    dynamicVisible: false,
    countVisible: false,
    countTimesVisible: false
  },
  'motionai.dynamic-range-panel-settings': {
    dynamicRangeGuideVisible: false
  },
  'motionai.hand-independence-presets': {},
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
    const keysToRemove = new Set();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('motionai.') || key === 'callibration_date') {
        keysToRemove.add(key);
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

export async function fetchMotionAiDefaultsSnapshot() {
  try {
    const response = await fetch('./motionai-defaults.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    return json && typeof json === 'object' ? json : DEFAULT_MOTIONAI_STORAGE;
  } catch (error) {
    console.warn('Falling back to embedded default snapshot because motionai-defaults.json could not be loaded.', error);
    return DEFAULT_MOTIONAI_STORAGE;
  }
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

// Flat 'motionai.<section>' shaped snapshot of a single user's bucket, matching
// the top-level shape expected by motionai-defaults.json for export/reset.
export function getMotionAiUserStorageSnapshot(userId = getMotionAiActiveUserId()) {
  const bucket = getMotionAiUserStorageBucket(userId);
  const snapshot = {};

  Object.entries(bucket).forEach(([sectionName, value]) => {
    snapshot[`${MOTIONAI_STORAGE_ROOT}.${sectionName}`] = value;
  });

  return snapshot;
}

export const MOTIONAI_DEFAULTS_INITIALIZED_KEY = 'motionai.defaults-initialized';

export function hasMotionAiDefaultsInitialized() {
  try {
    return localStorage.getItem(MOTIONAI_DEFAULTS_INITIALIZED_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

export function markMotionAiDefaultsInitialized() {
  try {
    localStorage.setItem(MOTIONAI_DEFAULTS_INITIALIZED_KEY, 'true');
  } catch (error) {
    // Ignore storage failures.
  }
}

export function clearMotionAiDefaultsInitialized() {
  try {
    localStorage.removeItem(MOTIONAI_DEFAULTS_INITIALIZED_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
}

export function shouldInitializeMotionAiDefaults() {
  return !hasMotionAiDefaultsInitialized() && !hasMotionAiStorageState();
}

export function hasMotionAiStorageState() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('motionai.') && key !== MOTIONAI_DEFAULTS_INITIALIZED_KEY) {
        return true;
      }
    }
  } catch (error) {
    return false;
  }

  return false;
}
