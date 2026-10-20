import {
  blockMotionAiBucketWrites,
  ensureMotionAiUserStorage,
  fetchMotionAiDefaultsSnapshot,
  getMotionAiBucketValue,
  getMotionAiUserStorageBucket,
  initMotionAiActiveUser,
  MOTIONAI_DOZENT_USER_ID,
  registerMotionAiUser,
  removeMotionAiUserStorageBucket,
  setMotionAiBucketChangeListener,
  setMotionAiBucketValue,
  setMotionAiUserStorageBucket
} from './defaultSettings.js';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const SETTINGS_VERSION = 1;
const SETTINGS_SAVE_DELAY_MS = 1500;
const MAX_SETTINGS_BYTES = 1024 * 1024;
const EXAM_PAGE_SIZE = 100;
const EXAM_MAX_PAGES = 20;
const MAX_LOCAL_RESULTS_PER_LEVEL = 12;
const EXAM_LEVELS = [0, 1, 2, 3, 4];
const EXAM_RESULTS_SECTION = 'exam.results';

export const EXAM_SYNC = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed'
};

export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/* ---------------------------------------------------------------- state */

let csrfToken = null;
let csrfPromise = null;
let currentUser = null;
let activeLocalUserId = null;
let sessionGeneration = 0;
let unauthorizedHandler = null;
let unauthorizedHandling = false;
const examSyncListeners = new Set();

export function getAuthenticatedUser() {
  return currentUser;
}

export function getActiveLocalUserId() {
  return activeLocalUserId;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

export function onExamSyncChange(listener) {
  examSyncListeners.add(listener);
  return () => examSyncListeners.delete(listener);
}

function notifyExamSyncChange(levelIndex) {
  examSyncListeners.forEach((listener) => {
    try {
      listener(levelIndex);
    } catch (error) {
      console.error('Exam sync listener failed:', error);
    }
  });
}

/* ------------------------------------------------------------- toast UI */

let toastElement = null;
let toastTimer = null;

export function showBackendMessage(message, kind = 'error', durationMs = 6000) {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }
  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.setAttribute('role', 'status');
    Object.assign(toastElement.style, {
      position: 'fixed',
      left: '12px',
      bottom: '12px',
      maxWidth: '360px',
      padding: '10px 14px',
      borderRadius: '10px',
      font: '13px system-ui, sans-serif',
      color: '#fff',
      zIndex: '10001',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
    });
    document.body.appendChild(toastElement);
  }
  toastElement.style.background = kind === 'error' ? 'rgba(160, 40, 40, 0.95)' : 'rgba(30, 110, 70, 0.95)';
  toastElement.textContent = message;
  toastElement.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastElement.style.display = 'none';
  }, durationMs);
}

/* ------------------------------------------------------------ API client */

export async function getCsrfToken({ force = false } = {}) {
  if (csrfToken && !force) {
    return csrfToken;
  }
  if (!csrfPromise || force) {
    const generation = sessionGeneration;
    const pending = (async () => {
      const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
      if (!response.ok) {
        throw await buildApiError(response);
      }
      const body = await response.json();
      if (!body || typeof body.csrf_token !== 'string' || !body.csrf_token) {
        throw new ApiError('Ungültige Serverantwort (CSRF-Token fehlt).', response.status);
      }
      if (generation === sessionGeneration) {
        csrfToken = body.csrf_token;
      }
      return body.csrf_token;
    })();
    csrfPromise = pending;
    pending.then(
      () => { if (csrfPromise === pending) csrfPromise = null; },
      () => { if (csrfPromise === pending) csrfPromise = null; }
    );
  }
  return csrfPromise;
}

function clearCsrfToken() {
  csrfToken = null;
  csrfPromise = null;
}

async function buildApiError(response) {
  const body = await response.json().catch(() => null);
  const detail = body && typeof body.detail === 'string' ? body.detail : null;
  return new ApiError(detail || `HTTP-Fehler ${response.status}`, response.status, detail);
}

export async function apiRequest(path, options = {}) {
  const { skipAuthHandling = false, ...fetchOptions } = options;
  const method = String(fetchOptions.method || 'GET').toUpperCase();
  const isWrite = !SAFE_METHODS.includes(method);
  const needsCsrf = isWrite && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register');

  const send = async () => {
    const headers = new Headers(fetchOptions.headers || {});
    let body = fetchOptions.body;
    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      if (typeof body !== 'string') {
        body = JSON.stringify(body);
      }
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
    if (needsCsrf) {
      headers.set('X-CSRF-Token', await getCsrfToken());
    }
    return fetch(path, { ...fetchOptions, method, headers, body, credentials: 'same-origin' });
  };

  let response = await send();

  // A rejected CSRF check never reaches the handler, so one retry with a fresh token is safe.
  if (response.status === 403 && needsCsrf) {
    const probe = await response.clone().json().catch(() => null);
    if (probe && typeof probe.detail === 'string' && probe.detail.includes('CSRF')) {
      clearCsrfToken();
      await getCsrfToken({ force: true });
      response = await send();
    }
  }

  if (response.status === 401 && !skipAuthHandling) {
    handleUnauthorized();
  }
  if (!response.ok) {
    throw await buildApiError(response);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function handleUnauthorized() {
  if (!currentUser || unauthorizedHandling || !unauthorizedHandler) {
    return;
  }
  unauthorizedHandling = true;
  Promise.resolve()
    .then(() => unauthorizedHandler())
    .catch((error) => console.error('Unauthorized handler failed:', error))
    .finally(() => { unauthorizedHandling = false; });
}

/* ------------------------------------------------------------------ auth */

export async function getCurrentUser() {
  try {
    return await apiRequest('/api/auth/me', { skipAuthHandling: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

async function establishSession(user) {
  sessionGeneration += 1;
  clearCsrfToken();
  currentUser = user;
  await getCsrfToken({ force: true });
  return user;
}

export async function login(email, password) {
  const user = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthHandling: true
  });
  return establishSession(user);
}

export async function register(email, password) {
  const user = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password },
    skipAuthHandling: true
  });
  return establishSession(user);
}

/* -------------------------------------------------------- settings sync */

export async function loadSettings() {
  try {
    const body = await apiRequest('/api/settings');
    return body && typeof body.settings === 'object' ? body.settings : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveSettings(settings, requestOptions = {}) {
  return apiRequest('/api/settings', { method: 'PUT', body: { settings }, ...requestOptions });
}

const settingsSync = {
  active: false,
  timer: null,
  inFlight: false,
  dirty: false,
  lastSavedJson: null
};

function isExamResultSection(section) {
  return section === EXAM_RESULTS_SECTION || section.startsWith(`${EXAM_RESULTS_SECTION}.`);
}

// Exam results live in /api/exams, everything else belongs to the settings document.
function buildSettingsDocument(localUserId) {
  const bucket = getMotionAiUserStorageBucket(localUserId);
  const filtered = {};
  Object.entries(bucket).forEach(([section, value]) => {
    if (!isExamResultSection(section)) {
      filtered[section] = value;
    }
  });
  return { version: SETTINGS_VERSION, bucket: filtered };
}

function scheduleSettingsSave(delay = SETTINGS_SAVE_DELAY_MS) {
  if (!settingsSync.active) {
    return;
  }
  settingsSync.dirty = true;
  clearTimeout(settingsSync.timer);
  settingsSync.timer = setTimeout(runSettingsSave, delay);
}

// Only one request is ever in flight and each run serializes the newest state, so older snapshots can never overwrite newer ones.
async function runSettingsSave() {
  settingsSync.timer = null;
  if (!settingsSync.active || settingsSync.inFlight || !settingsSync.dirty) {
    return;
  }
  const generation = sessionGeneration;
  const localUserId = activeLocalUserId;
  const doc = buildSettingsDocument(localUserId);
  const json = JSON.stringify(doc);
  if (json === settingsSync.lastSavedJson) {
    settingsSync.dirty = false;
    return;
  }
  if (new TextEncoder().encode(json).length > MAX_SETTINGS_BYTES) {
    settingsSync.dirty = false;
    showBackendMessage('Die Einstellungen überschreiten 1 MiB und können nicht auf dem Server gespeichert werden.');
    return;
  }

  settingsSync.inFlight = true;
  settingsSync.dirty = false;
  try {
    await saveSettings(doc);
    if (generation === sessionGeneration) {
      settingsSync.lastSavedJson = json;
    }
  } catch (error) {
    if (generation === sessionGeneration) {
      settingsSync.dirty = true;
      if (!(error instanceof ApiError && error.status === 401)) {
        showBackendMessage(`Einstellungen konnten nicht gespeichert werden: ${describeError(error)}`);
      }
    }
  } finally {
    settingsSync.inFlight = false;
  }

  if (generation === sessionGeneration && settingsSync.active && settingsSync.dirty && !settingsSync.timer) {
    // Newer changes arrived while saving; failed saves are retried with a longer pause.
    const failed = settingsSync.lastSavedJson !== json;
    settingsSync.timer = setTimeout(runSettingsSave, failed ? 15000 : SETTINGS_SAVE_DELAY_MS);
  }
}

export async function flushSettings() {
  if (!settingsSync.active) {
    return true;
  }
  clearTimeout(settingsSync.timer);
  settingsSync.timer = null;
  settingsSync.dirty = true;
  while (settingsSync.inFlight) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  await runSettingsSave();
  return !settingsSync.dirty;
}

function startSettingsSync(localUserId, { initialSavePending }) {
  stopSettingsSync();
  settingsSync.active = true;
  settingsSync.lastSavedJson = initialSavePending ? null : JSON.stringify(buildSettingsDocument(localUserId));
  setMotionAiBucketChangeListener((changedUserId) => {
    if (changedUserId === activeLocalUserId) {
      scheduleSettingsSave();
    }
  });
  if (initialSavePending) {
    scheduleSettingsSave();
  }
}

function stopSettingsSync() {
  settingsSync.active = false;
  clearTimeout(settingsSync.timer);
  settingsSync.timer = null;
  settingsSync.dirty = false;
  setMotionAiBucketChangeListener(null);
}

if (typeof document !== 'undefined') {
  // Best-effort save when the tab is hidden or closed; the cached CSRF token keeps this synchronous enough for keepalive.
  const flushOnHide = () => {
    if (!settingsSync.active || !csrfToken || (!settingsSync.dirty && !settingsSync.timer)) {
      return;
    }
    const doc = buildSettingsDocument(activeLocalUserId);
    const json = JSON.stringify(doc);
    if (json === settingsSync.lastSavedJson) {
      return;
    }
    const body = JSON.stringify({ settings: doc });
    if (body.length > 60000) {
      return;
    }
    fetch('/api/settings', {
      method: 'PUT',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body
    }).then((response) => {
      if (response.ok) {
        settingsSync.lastSavedJson = json;
        settingsSync.dirty = false;
      }
    }).catch(() => {});
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushOnHide();
    }
  });
  window.addEventListener('pagehide', flushOnHide);
}

/* ---------------------------------------------------------------- exams */

export async function loadExams() {
  const all = [];
  for (let page = 0; page < EXAM_MAX_PAGES; page += 1) {
    const rows = await apiRequest(`/api/exams/me?limit=${EXAM_PAGE_SIZE}&offset=${page * EXAM_PAGE_SIZE}`);
    if (!Array.isArray(rows)) {
      throw new ApiError('Ungültige Serverantwort (Prüfungsliste).');
    }
    all.push(...rows);
    if (rows.length < EXAM_PAGE_SIZE) {
      break;
    }
  }
  return all;
}

export async function saveExam(examType, score, result) {
  return apiRequest('/api/exams', {
    method: 'POST',
    body: { exam_type: examType, score: Number.isFinite(score) ? score : null, result }
  });
}

export function getExamType(levelIndex) {
  return `exam-level-${levelIndex}`;
}

function parseExamLevel(examType) {
  const match = /^exam-level-(\d+)$/.exec(String(examType || ''));
  if (!match) {
    return null;
  }
  const level = Number(match[1]);
  return EXAM_LEVELS.includes(level) ? level : null;
}

function getExamResultsSection(levelIndex) {
  return `${EXAM_RESULTS_SECTION}.level.${levelIndex}`;
}

function readLocalResults(localUserId, levelIndex) {
  const stored = getMotionAiBucketValue(getExamResultsSection(levelIndex), [], localUserId);
  return Array.isArray(stored) ? stored : [];
}

// Local-only fields (sync state, server id) are never part of the stored result document.
function toServerResult(entry, levelIndex) {
  const { syncStatus, serverId, syncUncertain, ...result } = entry;
  return { ...result, examLevel: levelIndex };
}

function rowToLocalEntry(row) {
  const result = row && typeof row.result === 'object' && row.result ? row.result : {};
  const { examLevel, ...rest } = result;
  return {
    ...rest,
    id: rest.id ?? row.id,
    timestamp: rest.timestamp || row.completed_at || row.created_at,
    totalScore: Number.isFinite(Number(rest.totalScore)) ? Number(rest.totalScore) : Number(row.score) || 0,
    tasks: Array.isArray(rest.tasks) ? rest.tasks : [],
    serverId: row.id,
    syncStatus: EXAM_SYNC.SYNCED
  };
}

function sortByTimestampDesc(entries) {
  return entries.sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0));
}

async function reconcileExamsFromServer(localUserId) {
  const rows = await loadExams();
  const serverByLevel = new Map(EXAM_LEVELS.map((level) => [level, []]));
  rows.forEach((row) => {
    const level = parseExamLevel(row.exam_type);
    if (level !== null) {
      serverByLevel.get(level).push(rowToLocalEntry(row));
    }
  });

  EXAM_LEVELS.forEach((level) => {
    const serverEntries = serverByLevel.get(level);
    const serverIds = new Set(serverEntries.map((entry) => String(entry.id)));
    const unsynced = readLocalResults(localUserId, level)
      .filter((entry) => entry && entry.syncStatus !== EXAM_SYNC.SYNCED && !serverIds.has(String(entry.id)))
      .map((entry) => ({
        ...entry,
        syncStatus: entry.syncStatus === EXAM_SYNC.SYNCING ? EXAM_SYNC.FAILED : (entry.syncStatus || EXAM_SYNC.PENDING),
        syncUncertain: entry.syncUncertain || entry.syncStatus === EXAM_SYNC.SYNCING
      }));
    const merged = sortByTimestampDesc([...unsynced, ...serverEntries]);
    // Unsynced results are never trimmed away; only already stored ones are limited.
    const keep = merged.filter((entry, index) => entry.syncStatus !== EXAM_SYNC.SYNCED || index < MAX_LOCAL_RESULTS_PER_LEVEL);
    setMotionAiBucketValue(getExamResultsSection(level), keep, localUserId);
  });
}

function updateLocalEntry(localUserId, levelIndex, entryId, patch) {
  const results = readLocalResults(localUserId, levelIndex);
  const index = results.findIndex((entry) => entry && String(entry.id) === String(entryId));
  if (index === -1) {
    return false;
  }
  results[index] = { ...results[index], ...patch };
  setMotionAiBucketValue(getExamResultsSection(levelIndex), results, localUserId);
  return true;
}

let examSyncChain = Promise.resolve();

// Serialized so a result is never posted twice by overlapping sync runs.
export function syncExamResults(levelIndex = null) {
  const run = examSyncChain.then(() => doSyncExamResults(levelIndex));
  examSyncChain = run.catch(() => {});
  return run;
}

async function doSyncExamResults(levelIndexFilter) {
  const generation = sessionGeneration;
  const localUserId = activeLocalUserId;
  if (!currentUser || !localUserId) {
    return false;
  }
  const levels = levelIndexFilter === null ? EXAM_LEVELS : [levelIndexFilter];
  const stillCurrent = () => generation === sessionGeneration && localUserId === activeLocalUserId;
  let allOk = true;
  let serverRowsCache = null;

  for (const level of levels) {
    const candidates = readLocalResults(localUserId, level)
      .filter((entry) => entry && entry.syncStatus !== EXAM_SYNC.SYNCED);

    for (const entry of candidates) {
      if (!stillCurrent()) {
        return false;
      }
      updateLocalEntry(localUserId, level, entry.id, { syncStatus: EXAM_SYNC.SYNCING });
      notifyExamSyncChange(level);

      try {
        let alreadyStored = null;
        if (entry.syncUncertain) {
          // The earlier attempt may have reached the server: look before posting again.
          serverRowsCache = serverRowsCache || await loadExams();
          alreadyStored = serverRowsCache.find((row) => row.exam_type === getExamType(level)
            && row.result && String(row.result.id) === String(entry.id)) || null;
        }
        const stored = alreadyStored || await saveExam(getExamType(level), Number(entry.totalScore), toServerResult(entry, level));
        if (!stillCurrent()) {
          return false;
        }
        updateLocalEntry(localUserId, level, entry.id, {
          syncStatus: EXAM_SYNC.SYNCED,
          serverId: stored.id,
          syncUncertain: false
        });
      } catch (error) {
        if (!stillCurrent()) {
          return false;
        }
        allOk = false;
        const definitelyRejected = error instanceof ApiError && error.status >= 400 && error.status < 500;
        updateLocalEntry(localUserId, level, entry.id, {
          syncStatus: EXAM_SYNC.FAILED,
          syncUncertain: !definitelyRejected
        });
        if (!(error instanceof ApiError && error.status === 401)) {
          showBackendMessage(`Prüfungsergebnis konnte nicht gespeichert werden: ${describeError(error)} Es bleibt lokal erhalten und wird erneut versucht.`);
        }
      }
      notifyExamSyncChange(level);
    }
  }
  return allOk;
}

export function hasUnsyncedExamResults() {
  if (!activeLocalUserId) {
    return false;
  }
  return EXAM_LEVELS.some((level) => readLocalResults(activeLocalUserId, level)
    .some((entry) => entry && entry.syncStatus !== EXAM_SYNC.SYNCED));
}

/* -------------------------------------------------- session lifecycle */

function describeError(error) {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return 'Zu viele Anfragen, bitte später erneut versuchen.';
    }
    if (error.status >= 500) {
      return 'Serverfehler.';
    }
    return error.detail || error.message;
  }
  return 'Keine Verbindung zum Server.';
}

export function describeAuthError(error, mode) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'E-Mail oder Passwort ist falsch.';
    if (error.status === 409) return 'Diese E-Mail-Adresse ist bereits registriert.';
    if (error.status === 400 || error.status === 422) {
      return mode === 'register'
        ? 'Bitte eine gültige E-Mail-Adresse und ein Passwort mit 12 bis 128 Zeichen angeben.'
        : 'Bitte E-Mail-Adresse und Passwort prüfen.';
    }
  }
  return describeError(error);
}

export function getLocalUserIdForAccount(user) {
  return user.role === 'admin' ? MOTIONAI_DOZENT_USER_ID : `u-${user.id}`;
}

// Loads the account's settings and exam results into the local cache and starts background syncing.
export async function activateUserSession(user) {
  const localUserId = getLocalUserIdForAccount(user);
  activeLocalUserId = localUserId;
  initMotionAiActiveUser(localUserId);
  registerMotionAiUser(localUserId, user.email);

  const previousBucket = getMotionAiUserStorageBucket(localUserId);
  const preserved = {};
  Object.entries(previousBucket).forEach(([section, value]) => {
    if (isExamResultSection(section)) {
      preserved[section] = value;
    }
  });

  const serverSettings = await loadSettings();
  const serverBucket = serverSettings && serverSettings.bucket && typeof serverSettings.bucket === 'object'
    ? serverSettings.bucket
    : null;

  if (serverBucket) {
    setMotionAiUserStorageBucket(localUserId, { ...serverBucket, ...preserved });
  } else {
    removeMotionAiUserStorageBucket(localUserId);
    const defaults = await fetchMotionAiDefaultsSnapshot(localUserId);
    ensureMotionAiUserStorage(localUserId, defaults);
    setMotionAiUserStorageBucket(localUserId, { ...getMotionAiUserStorageBucket(localUserId), ...preserved });
  }

  try {
    await reconcileExamsFromServer(localUserId);
  } catch (error) {
    showBackendMessage(`Prüfungsergebnisse konnten nicht geladen werden: ${describeError(error)}`);
  }

  startSettingsSync(localUserId, { initialSavePending: !serverBucket });
  syncExamResults().catch(() => {});
}

// After an expired session the same account may log in again and continue; the cache is kept for that case.
export async function resumeUserSession(user) {
  if (!currentUser || currentUser.id !== user.id) {
    return false;
  }
  scheduleSettingsSave(0);
  syncExamResults().catch(() => {});
  return true;
}

export async function logout({ force = false } = {}) {
  if (!force) {
    const settingsSaved = await flushSettings().catch(() => false);
    const resultsSaved = await syncExamResults().catch(() => false);
    if (!settingsSaved || !resultsSaved || hasUnsyncedExamResults()) {
      const proceed = window.confirm('Einige Daten konnten noch nicht auf dem Server gespeichert werden und gehen beim Abmelden verloren. Trotzdem abmelden?');
      if (!proceed) {
        return false;
      }
    }
  }

  stopSettingsSync();
  sessionGeneration += 1;
  const localUserId = activeLocalUserId;
  try {
    await apiRequest('/api/auth/logout', { method: 'POST', skipAuthHandling: true });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) {
      showBackendMessage(`Abmelden fehlgeschlagen: ${describeError(error)}`);
      if (!force) {
        // Keep working as before; resume syncing for the still valid session.
        startSettingsSync(localUserId, { initialSavePending: true });
        return false;
      }
    }
  }

  // Residual handlers of this page must not write the old user's data back after the wipe.
  blockMotionAiBucketWrites();
  if (localUserId) {
    removeMotionAiUserStorageBucket(localUserId);
  }
  clearCsrfToken();
  currentUser = null;
  activeLocalUserId = null;
  window.location.reload();
  return true;
}
