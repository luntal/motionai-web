export const MOTIONAI_STORAGE_ROOT = 'motionai';
export const MOTIONAI_ACTIVE_USER_STORAGE_KEY = 'motionai.active-user-id';
export const MOTIONAI_EXAM_PASSWORD = 'moki';
export const MOTIONAI_DOZENT_USER_ID = 'DozentIn';
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
    if (!sectionName || sectionName.startsWith('users.') || EXCLUDED_MOTIONAI_DEFAULT_KEYS.has(key)) {
      return;
    }
    nextBucket[sectionName] = value;
  });

  return nextBucket;
}

const MOTIONAI_DEFAULTS_APPLIED_SECTION = 'defaults-applied-at';
const MOTIONAI_DEFAULTS_DECLINED_SECTION = 'defaults-declined-at';

// Personal data that a defaults update must never overwrite.
function isMotionAiPreservedSectionOnReset(section) {
  return section === 'calibration-sets'
    || section === 'calibration-pose-sets'
    || section === 'callibration_date'
    || section.startsWith('exam.results');
}

// The defaults file carries its version as settings-panel-state.createdAt (written by exportDefaults).
export function getMotionAiDefaultsStamp(snapshot) {
  const stamp = snapshot && snapshot['motionai.settings-panel-state'] && snapshot['motionai.settings-panel-state'].createdAt;
  return typeof stamp === 'string' && Number.isFinite(Date.parse(stamp)) ? stamp : null;
}

// Returns the file's stamp when it is newer than what this user applied and was not declined yet.
export function getMotionAiPendingDefaultsStamp(userId, snapshot) {
  const stamp = getMotionAiDefaultsStamp(snapshot);
  if (!stamp) {
    return null;
  }

  const bucket = getMotionAiUserStorageBucket(userId);
  if (bucket[MOTIONAI_DEFAULTS_DECLINED_SECTION] === stamp) {
    return null;
  }
  const applied = bucket[MOTIONAI_DEFAULTS_APPLIED_SECTION];
  if (typeof applied === 'string' && Date.parse(applied) >= Date.parse(stamp)) {
    return null;
  }
  return stamp;
}

export function declineMotionAiDefaultsUpdate(userId, stamp) {
  const bucket = getMotionAiUserStorageBucket(userId);
  bucket[MOTIONAI_DEFAULTS_DECLINED_SECTION] = stamp;
  setMotionAiUserStorageBucket(userId, bucket);
}

export function ensureMotionAiUserStorage(userId = 'default', snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const normalizedUserId = normalizeMotionAiUserId(userId, 'default');
  const bucket = getMotionAiUserStorageBucket(normalizedUserId);
  if (bucket && Object.keys(bucket).length > 0) {
    return bucket;
  }

  const nextBucket = buildMotionAiUserBucketFromSnapshot(snapshot);
  const stamp = getMotionAiDefaultsStamp(snapshot);
  if (stamp) {
    nextBucket[MOTIONAI_DEFAULTS_APPLIED_SECTION] = stamp;
  }
  setMotionAiUserStorageBucket(normalizedUserId, nextBucket);
  return nextBucket;
}

// Replaces everything the defaults file defines but keeps calibration sets and exam results.
export function resetMotionAiUserStorageToDefaults(userId = getMotionAiActiveUserId(), snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const normalizedUserId = normalizeMotionAiUserId(userId, 'default');
  const previousBucket = getMotionAiUserStorageBucket(normalizedUserId);
  const nextBucket = buildMotionAiUserBucketFromSnapshot(snapshot);
  Object.entries(previousBucket).forEach(([section, value]) => {
    if (isMotionAiPreservedSectionOnReset(section)) {
      nextBucket[section] = value;
    }
  });
  const stamp = getMotionAiDefaultsStamp(snapshot);
  if (stamp) {
    nextBucket[MOTIONAI_DEFAULTS_APPLIED_SECTION] = stamp;
  }
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

export function isMotionAiExamPasswordCorrect(value) {
  return typeof value === 'string' && value === MOTIONAI_EXAM_PASSWORD;
}

export function ensureMotionAiDozentUser(snapshot = DEFAULT_MOTIONAI_STORAGE) {
  const registry = getMotionAiUserRegistry();
  const hasDozentUser = registry.some((entry) => entry && entry.id === MOTIONAI_DOZENT_USER_ID);

  if (!hasDozentUser) {
    registry.push({
      id: MOTIONAI_DOZENT_USER_ID,
      label: 'DozentIn',
      createdAt: new Date().toISOString()
    });
    setMotionAiUserRegistry(registry);
  }

  ensureMotionAiUserStorage(MOTIONAI_DOZENT_USER_ID, snapshot);
  return getMotionAiUserRegistry();
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

  // The mentor account exists permanently and is protected by the exam password.
  if (!registry.some((entry) => entry && entry.id === MOTIONAI_DOZENT_USER_ID)) {
    registry.push({
      id: MOTIONAI_DOZENT_USER_ID,
      label: 'DozentIn',
      createdAt: new Date().toISOString()
    });
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

export function deleteMotionAiUser(userId) {
  const normalizedId = normalizeMotionAiUserId(userId, null);
  if (!normalizedId || normalizedId === 'default' || normalizedId === MOTIONAI_DOZENT_USER_ID) {
    return false;
  }

  const registry = getMotionAiUserRegistry().filter((entry) => entry && entry.id !== normalizedId);
  setMotionAiUserRegistry(registry);

  try {
    localStorage.removeItem(getMotionAiUserStorageBucketKey(normalizedId));
  } catch (error) {
    // Ignore storage failures.
  }

  setMotionAiActiveUserId('default');
  return true;
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

// Reads of the listed sections for the active user are served from another user's bucket (and writes are dropped).
let presetReadRedirect = null;

export function setMotionAiPresetReadRedirect(sourceUserId, sectionNames = []) {
  presetReadRedirect = sourceUserId
    ? { userId: normalizeMotionAiUserId(sourceUserId, 'default'), sections: new Set(sectionNames) }
    : null;
}

function isMotionAiSectionRedirected(section, userId) {
  return Boolean(presetReadRedirect)
    && presetReadRedirect.sections.has(section)
    && normalizeMotionAiUserId(userId, 'default') === getMotionAiActiveUserId();
}

export function getMotionAiBucketValue(storageKey, fallback = null, userId = getMotionAiActiveUserId()) {
  const sectionName = typeof storageKey === 'string' ? storageKey.trim() : '';
  if (!sectionName) {
    return fallback;
  }

  const normalizedKey = sectionName.replace(/^motionai\./, '');
  const bucket = getMotionAiUserStorageBucket(isMotionAiSectionRedirected(normalizedKey, userId) ? presetReadRedirect.userId : userId);
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

  // While redirected (exam on the shared Prüfung) these sections are read-only, so nobody's stored data is touched.
  if (isMotionAiSectionRedirected(normalizedSection, safeUserId)) {
    return value;
  }

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

const EXCLUDED_MOTIONAI_DEFAULT_KEYS = new Set([
  'motionai.calibration-sets',
  'motionai.exam.results',
  'motionai.defaults-applied-at',
  'motionai.defaults-declined-at'
]);

export function filterMotionAiDefaultExportSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }

  const nextSnapshot = {};
  Object.entries(snapshot).forEach(([key, value]) => {
    if (EXCLUDED_MOTIONAI_DEFAULT_KEYS.has(String(key))) {
      return;
    }
    nextSnapshot[key] = value;
  });

  return nextSnapshot;
}

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
  const nextSnapshot = filterMotionAiDefaultExportSnapshot(snapshot && typeof snapshot === 'object' ? snapshot : {});

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

const MOTIONAI_DEFAULTS_FILE = './motionai-defaults.json';
const MOTIONAI_DOZENT_DEFAULTS_FILE = './motionai-d.json';

async function fetchMotionAiDefaultsFile(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json || typeof json !== 'object') {
    throw new Error('Defaults file is not a JSON object');
  }
  return filterMotionAiDefaultExportSnapshot(json);
}

// DozentIn reads its own defaults file; every other user reads the standard one.
export async function fetchMotionAiDefaultsSnapshot(userId = getMotionAiActiveUserId()) {
  const files = normalizeMotionAiUserId(userId, 'default') === MOTIONAI_DOZENT_USER_ID
    ? [MOTIONAI_DOZENT_DEFAULTS_FILE, MOTIONAI_DEFAULTS_FILE]
    : [MOTIONAI_DEFAULTS_FILE];

  for (const url of files) {
    try {
      return await fetchMotionAiDefaultsFile(url);
    } catch (error) {
      console.warn(`Could not load ${url}.`, error);
    }
  }

  console.warn('Falling back to embedded default snapshot.');
  return DEFAULT_MOTIONAI_STORAGE;
}

// Returns deep copies of the requested 'motionai.<section>' entries from the active user's defaults file (undefined if absent).
export async function fetchMotionAiDefaultsSections(sectionNames = []) {
  const snapshot = normalizeMotionAiBucketSnapshot(await fetchMotionAiDefaultsSnapshot());
  const sections = {};
  sectionNames.forEach((name) => {
    const value = snapshot[`${MOTIONAI_STORAGE_ROOT}.${name}`];
    sections[name] = typeof value === 'undefined' ? undefined : JSON.parse(JSON.stringify(value));
  });
  return sections;
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
    const fullKey = `${MOTIONAI_STORAGE_ROOT}.${sectionName}`;
    if (EXCLUDED_MOTIONAI_DEFAULT_KEYS.has(fullKey)) {
      return;
    }
    snapshot[fullKey] = value;
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
