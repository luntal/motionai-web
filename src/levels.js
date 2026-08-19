import { basicFigurePaths, extendedFigurePaths } from './constants.js';

export class LevelManager {
  constructor(overlayCanvas) {
    this.canvas = overlayCanvas;
    this.ctx = overlayCanvas.getContext('2d');
    this.chapter = 0;
    this.level = null;
    this.active = false;
    this.targets = [];
    this.nextTarget = 0;
    this.rightTip = null;
    this.leftTip = null;
    this.completed = false;
    this.grid = [];
    this.circleScales = [];
    this.touchRadius = 30;
    this.completionCallback = null;
    this.calibrationActive = false;
    this.poseLandmarks = [];
    this.calibrationScore = 0;
    this.calibrationAligned = false;
    this.calibrationSuccess = false;
    this.calibrationAlignedSince = 0;
    this.calibrationMetrics = null;
    this.calibrationPoseSetsStorageKey = 'callibration_date';
    this.calibrationPoseSets = this.loadCalibrationPoseSets();
    this.selectedCalibrationPoseSetIndex = this.calibrationPoseSets.length > 0
      ? this.calibrationPoseSets.length - 1
      : null;
    this.calibrationPoseSetListeners = [];
    this.calibrationSnapshotBuffer = [];
    this.calibrationCaptureActive = false;
    this.calibrationSavedInCurrentHighWindow = false;
    this.calibrationLastSnapshotAt = 0;
    this.calibrationSnapshotIntervalMs = 120;
    this.calibrationCaptureThreshold = 0.9;
    this.calibrationMinSnapshots = 8;
    this.calibrationSaveFeedbackText = '';
    this.calibrationSaveFeedbackUntilMs = 0;
    this.calibrationComparisonStrictnessPercent = 60;
    this.poseAlignmentStatus = {
      available: false,
      aligned: false,
      score: 0,
      setName: ''
    };
    this.poseWarningLandmarksVisible = false;
    this.calibrationAnimationStart = performance.now();
    this.calibrationInfoEl = null;
    this.poseAlignmentInfoEl = null;
    this.consistencyActive = false;
    this.consistencyInfoEl = null;
    this.consistencyScoreHistory = [];
    this.consistencyAccuracy = 0;
    this.consistencyAnimationStart = performance.now();
    this.consistencyPhase = 0;
    this.consistencyLastTickMs = performance.now();
    this.consistencyTempoBpm = 100;
    this.consistencyStrictnessPercent = 100;
    this.consistencyMotionBlendPercent = 0;
    this.gridRows = 12;
    this.gridCols = 16;
    this.targetIndexByCircle = new Map();
    this.renderQueued = false;
    this.figureVariant = 'soft';
    this.figureScale = 1 / 3;
    this.figureStrokeWidth = 0.4;
    this.figureSide = 'left';
    this.figureHorizontalOffset = 50;
    this.figureYPosition = 0;
    this.figureTempoBpm = 60;
    this.figureDynamicsVisible = false;
    this.figureCountTimesVisible = false;
    this.figureHardLinearity = 10;
    this.figureSoftTransitionPercent = 0;
    this.figureAnimationStart = performance.now();
    this.figureActive = false;
    this.dynamicFigureVariant = 'hard';
    this.dynamicFigureScale = 1 / 3;
    this.dynamicFigureStrokeWidth = 0.4;
    this.dynamicFigureSide = 'left';
    this.dynamicFigureHorizontalOffset = 50;
    this.dynamicFigureYPosition = 0;
    this.dynamicFigureTempoBpm = 60;
    this.dynamicFigureDynamicsVisible = false;
    this.dynamicFigureCountTimesVisible = false;
    this.dynamicFigureHardLinearity = 10;
    this.dynamicFigureSoftTransitionPercent = 0;
    this.dynamicFigureCornerHeights = Array(8).fill(0);
    this.dynamicFigureCornerHeightsByLevel = this.loadDynamicFigureCornerHeights();
    this.dynamicFigureAnimationStart = performance.now();
    this.dynamicFigureActive = false;
    this.scaledCalibrationCache = {
      set: null,
      width: 0,
      height: 0,
      landmarks: []
    };
    this.createCalibrationInfoPanel();
    this.createPoseAlignmentInfoPanel();
    this.createConsistencyInfoPanel();
    this.buildGrid();
  }

  setSelectedCalibrationPoseSet(index) {
    if (!Number.isInteger(index)) {
      this.selectedCalibrationPoseSetIndex = null;
      this.invalidateScaledCalibrationCache();
      return;
    }

    if (index < 0 || index >= this.calibrationPoseSets.length) {
      this.selectedCalibrationPoseSetIndex = null;
      this.invalidateScaledCalibrationCache();
      return;
    }

    this.selectedCalibrationPoseSetIndex = index;
    this.invalidateScaledCalibrationCache();
  }

  invalidateScaledCalibrationCache() {
    this.scaledCalibrationCache = {
      set: null,
      width: 0,
      height: 0,
      landmarks: []
    };
  }

  getSelectedCalibrationPoseSetIndex() {
    return this.selectedCalibrationPoseSetIndex;
  }

  setCalibrationComparisonStrictness(percent) {
    const next = Number(percent);
    if (!Number.isFinite(next)) {
      return;
    }

    this.calibrationComparisonStrictnessPercent = Math.max(20, Math.min(100, next));
  }

  getCalibrationComparisonStrictness() {
    return this.calibrationComparisonStrictnessPercent;
  }

  setPoseWarningLandmarksEnabled(enabled) {
    this.poseWarningLandmarksVisible = Boolean(enabled);
    if (this.canvas && this.canvas.width && this.canvas.height) {
      this.render();
    }
  }

  getPoseWarningLandmarksEnabled() {
    return this.poseWarningLandmarksVisible;
  }

  getSelectedCalibrationPoseSet() {
    if (!Number.isInteger(this.selectedCalibrationPoseSetIndex)) {
      return null;
    }

    return this.calibrationPoseSets[this.selectedCalibrationPoseSetIndex] || null;
  }

  inferReferenceDimensionsFromLandmarks(landmarks) {
    if (!Array.isArray(landmarks) || landmarks.length === 0) {
      return null;
    }

    let maxX = 0;
    let maxY = 0;
    landmarks.forEach((landmark) => {
      if (!landmark) {
        return;
      }
      if (Number.isFinite(landmark.x)) {
        maxX = Math.max(maxX, landmark.x);
      }
      if (Number.isFinite(landmark.y)) {
        maxY = Math.max(maxY, landmark.y);
      }
    });

    const presets = [
      { width: 640, height: 360 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ];

    const viablePresets = presets.filter((preset) => (
      maxX <= preset.width * 1.05 && maxY <= preset.height * 1.05
    ));

    if (viablePresets.length === 0) {
      return null;
    }

    let best = viablePresets[0];
    let bestScore = (best.width - maxX) + (best.height - maxY);
    for (let i = 1; i < viablePresets.length; i += 1) {
      const candidate = viablePresets[i];
      const score = (candidate.width - maxX) + (candidate.height - maxY);
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return best;
  }

  normalizeCalibrationPoseSetEntry(entry) {
    if (!entry || !Array.isArray(entry.landmarks)) {
      return null;
    }

    const landmarks = entry.landmarks.map((landmark) => {
      if (!landmark) {
        return null;
      }

      return {
        x: Number.isFinite(landmark.x) ? landmark.x : 0,
        y: Number.isFinite(landmark.y) ? landmark.y : 0,
        z: Number.isFinite(landmark.z) ? landmark.z : 0,
        visibility: typeof landmark.visibility === 'number' ? landmark.visibility : 1
      };
    });

    let referenceWidth = Number(entry.referenceWidth);
    let referenceHeight = Number(entry.referenceHeight);
    const hasReferenceDimensions = referenceWidth > 0 && referenceHeight > 0;

    if (!hasReferenceDimensions) {
      const inferred = this.inferReferenceDimensionsFromLandmarks(landmarks);
      if (inferred) {
        referenceWidth = inferred.width;
        referenceHeight = inferred.height;
      }
    }

    return {
      ...entry,
      landmarks,
      referenceWidth: referenceWidth > 0 ? referenceWidth : null,
      referenceHeight: referenceHeight > 0 ? referenceHeight : null
    };
  }

  getCalibrationLandmarksForCanvas(calibrationSet) {
    if (!calibrationSet || !Array.isArray(calibrationSet.landmarks) || calibrationSet.landmarks.length === 0) {
      return [];
    }

    const targetWidth = Number(this.canvas?.width);
    const targetHeight = Number(this.canvas?.height);
    const cached = this.scaledCalibrationCache;
    if (
      cached
      && cached.set === calibrationSet
      && cached.width === targetWidth
      && cached.height === targetHeight
      && Array.isArray(cached.landmarks)
    ) {
      return cached.landmarks;
    }

    const referenceWidth = Number(calibrationSet.referenceWidth);
    const referenceHeight = Number(calibrationSet.referenceHeight);
    const coordinateValues = calibrationSet.landmarks
      .filter(Boolean)
      .flatMap((landmark) => [Math.abs(Number(landmark.x)), Math.abs(Number(landmark.y))]);
    const hasNormalizedCoordinates = coordinateValues.length > 0
      && Math.max(...coordinateValues) <= 1.5;

    if (hasNormalizedCoordinates && targetWidth > 0 && targetHeight > 0) {
      const normalized = calibrationSet.landmarks.map((landmark) => {
        if (!landmark) {
          return null;
        }

        return {
          ...landmark,
          x: landmark.x * targetWidth,
          y: landmark.y * targetHeight
        };
      });
      this.scaledCalibrationCache = {
        set: calibrationSet,
        width: targetWidth,
        height: targetHeight,
        landmarks: normalized
      };
      return normalized;
    }

    if (!(referenceWidth > 0 && referenceHeight > 0) || !(targetWidth > 0 && targetHeight > 0)) {
      const passthrough = calibrationSet.landmarks.map((landmark) => (landmark ? { ...landmark } : null));
      this.scaledCalibrationCache = {
        set: calibrationSet,
        width: targetWidth,
        height: targetHeight,
        landmarks: passthrough
      };
      return passthrough;
    }

    const scaleX = targetWidth / referenceWidth;
    const scaleY = targetHeight / referenceHeight;

    const scaled = calibrationSet.landmarks.map((landmark) => {
      if (!landmark) {
        return null;
      }

      return {
        ...landmark,
        x: landmark.x * scaleX,
        y: landmark.y * scaleY
      };
    });

    this.scaledCalibrationCache = {
      set: calibrationSet,
      width: targetWidth,
      height: targetHeight,
      landmarks: scaled
    };

    return scaled;
  }

  onCalibrationPoseSetsChange(handler) {
    if (typeof handler !== 'function') {
      return;
    }

    this.calibrationPoseSetListeners.push(handler);
    handler(this.getCalibrationPoseSets());
  }

  emitCalibrationPoseSetsChange() {
    const snapshot = this.getCalibrationPoseSets();
    this.calibrationPoseSetListeners.forEach((listener) => listener(snapshot));
  }

  getCalibrationPoseSets() {
    return this.calibrationPoseSets.map((entry) => ({
      ...entry,
      landmarks: Array.isArray(entry.landmarks)
        ? entry.landmarks.map((landmark) => ({ ...landmark }))
        : []
    }));
  }

  loadCalibrationPoseSets() {
    try {
      const raw = localStorage.getItem(this.calibrationPoseSetsStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((entry) => entry && Array.isArray(entry.landmarks))
        .map((entry) => this.normalizeCalibrationPoseSetEntry(entry))
        .filter((entry) => entry)
        .slice(-10);
    } catch (error) {
      console.warn('Failed to load calibration pose sets:', error);
      return [];
    }
  }

  persistCalibrationPoseSets() {
    try {
      localStorage.setItem(this.calibrationPoseSetsStorageKey, JSON.stringify(this.calibrationPoseSets));
    } catch (error) {
      console.warn('Failed to persist calibration pose sets:', error);
    }
  }

  averageLandmarkSnapshots(snapshots) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return [];
    }

    const maxLength = snapshots.reduce((max, sample) => Math.max(max, sample.length), 0);
    const means = [];

    for (let index = 0; index < maxLength; index += 1) {
      let xSum = 0;
      let ySum = 0;
      let zSum = 0;
      let vSum = 0;
      let count = 0;
      let visibilityCount = 0;

      snapshots.forEach((sample) => {
        const landmark = sample[index];
        if (!landmark) {
          return;
        }

        xSum += landmark.x;
        ySum += landmark.y;
        zSum += landmark.z || 0;
        count += 1;

        if (typeof landmark.visibility === 'number') {
          vSum += landmark.visibility;
          visibilityCount += 1;
        }
      });

      if (count === 0) {
        continue;
      }

      means.push({
        x: xSum / count,
        y: ySum / count,
        z: zSum / count,
        visibility: visibilityCount > 0 ? vSum / visibilityCount : 1
      });
    }

    return means;
  }

  finalizeCalibrationSnapshotCapture() {
    if (!this.calibrationCaptureActive) {
      return;
    }

    const snapshots = this.calibrationSnapshotBuffer;
    this.calibrationCaptureActive = false;
    this.calibrationSnapshotBuffer = [];
    this.calibrationLastSnapshotAt = 0;

    if (!Array.isArray(snapshots) || snapshots.length < this.calibrationMinSnapshots) {
      return;
    }

    const averagedLandmarks = this.averageLandmarkSnapshots(snapshots);
    if (averagedLandmarks.length === 0) {
      return;
    }

    const entry = {
      name: 'callibration_date',
      timestamp: Date.now(),
      landmarks: averagedLandmarks,
      referenceWidth: this.canvas?.width || null,
      referenceHeight: this.canvas?.height || null
    };

    this.calibrationPoseSets.push(entry);
    if (this.calibrationPoseSets.length > 10) {
      this.calibrationPoseSets = this.calibrationPoseSets.slice(-10);
    }

    if (!Number.isInteger(this.selectedCalibrationPoseSetIndex)
      || this.selectedCalibrationPoseSetIndex >= this.calibrationPoseSets.length) {
      this.selectedCalibrationPoseSetIndex = this.calibrationPoseSets.length - 1;
    }

    const savedAt = new Date(entry.timestamp).toLocaleString();
    this.calibrationSaveFeedbackText = `Kallibrierung abgeschlossen: ${entry.name} (${savedAt})`;
    this.calibrationSaveFeedbackUntilMs = performance.now() + 5000;
    this.calibrationSuccess = true;

    this.invalidateScaledCalibrationCache();

    this.persistCalibrationPoseSets();
    this.emitCalibrationPoseSetsChange();
  }

  updateCalibrationSnapshotCapture(nowMs = performance.now()) {
    const holdElapsed = this.calibrationAlignedSince ? nowMs - this.calibrationAlignedSince : 0;
    const stableHoldReached = this.calibrationAlignedSince > 0 && holdElapsed >= 3000;
    const canCapture = this.calibrationActive
      && this.chapter === 0
      && this.level === 0
      && this.calibrationAligned
      && stableHoldReached
      && this.calibrationScore >= this.calibrationCaptureThreshold
      && Array.isArray(this.poseLandmarks)
      && this.poseLandmarks.length > 0;

    if (!canCapture) {
      if (this.calibrationCaptureActive && !stableHoldReached) {
        this.finalizeCalibrationSnapshotCapture();
      }
      this.calibrationSavedInCurrentHighWindow = false;
      return;
    }

    if (this.calibrationSavedInCurrentHighWindow) {
      return;
    }

    if (!this.calibrationCaptureActive) {
      this.calibrationCaptureActive = true;
      this.calibrationSnapshotBuffer = [];
      this.calibrationLastSnapshotAt = 0;
    }

    if (nowMs - this.calibrationLastSnapshotAt < this.calibrationSnapshotIntervalMs) {
      return;
    }

    const snapshot = this.poseLandmarks.map((landmark) => ({ ...landmark }));
    this.calibrationSnapshotBuffer.push(snapshot);
    this.calibrationLastSnapshotAt = nowMs;

    if (this.calibrationSnapshotBuffer.length >= this.calibrationMinSnapshots) {
      this.finalizeCalibrationSnapshotCapture();
      this.calibrationSavedInCurrentHighWindow = true;
    }
  }

  createRectFromPair(a, b, padX, padY) {
    if (!a || !b) {
      return null;
    }

    const minX = Math.min(a.x, b.x) - padX;
    const maxX = Math.max(a.x, b.x) + padX;
    const minY = Math.min(a.y, b.y) - padY;
    const maxY = Math.max(a.y, b.y) + padY;

    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    };
  }

  evaluatePoseAlignmentAgainstCalibration() {
    const calibrationSet = this.getSelectedCalibrationPoseSet();
    const calibrationLandmarks = this.getCalibrationLandmarksForCanvas(calibrationSet);
    if (!calibrationSet || calibrationLandmarks.length === 0) {
      return { available: false, aligned: false, score: 0, setName: '' };
    }

    if (!Array.isArray(this.poseLandmarks) || this.poseLandmarks.length === 0) {
      return { available: false, aligned: false, score: 0, setName: calibrationSet.name || '' };
    }

    const coreIndices = [11, 12, 23, 24];
    const headIndices = [2, 5];
    const requiredIndices = [...coreIndices, ...headIndices];
    const strictnessFactor = 100 / Math.max(1, this.calibrationComparisonStrictnessPercent);

    if (requiredIndices.some((index) => !calibrationLandmarks[index] || !this.poseLandmarks[index])) {
      return { available: false, aligned: false, score: 0, setName: calibrationSet.name || '' };
    }

    const refLeftEye = calibrationLandmarks[2];
    const refRightEye = calibrationLandmarks[5];
    const refLeftShoulder = calibrationLandmarks[11];
    const refRightShoulder = calibrationLandmarks[12];
    const refLeftHip = calibrationLandmarks[23];
    const refRightHip = calibrationLandmarks[24];
    const shoulderSpan = this.distance(refLeftShoulder, refRightShoulder);
    const hipSpan = this.distance(refLeftHip, refRightHip);
    const headSpan = this.distance(refLeftEye, refRightEye);
    const bodyScale = Math.max(36, (shoulderSpan + hipSpan) / 2);
    const baseTolerance = Math.max(16, bodyScale * 0.18 * strictnessFactor);
    const headTolerance = baseTolerance * 1.6;

    let weightedSum = 0;
    let weightTotal = 0;
    const computeWeightedScore = (index, tolerance, weight) => {
      const live = this.poseLandmarks[index];
      const ref = calibrationLandmarks[index];
      const distance = this.distance(live, ref);
      const score = Math.max(0, 1 - distance / tolerance);
      weightedSum += score * weight;
      weightTotal += weight;
    };

    coreIndices.forEach((index) => computeWeightedScore(index, baseTolerance, 1.15));
    headIndices.forEach((index) => computeWeightedScore(index, headTolerance, 0.75));

    const score = weightTotal > 0 ? weightedSum / weightTotal : 0;

    const headRect = this.createRectFromPair(
      refLeftEye,
      refRightEye,
      Math.max(12, headSpan * 0.2 * strictnessFactor),
      Math.max(16, headSpan * 0.12 * strictnessFactor)
    );
    const shoulderRect = this.createRectFromPair(
      refLeftShoulder,
      refRightShoulder,
      Math.max(14, shoulderSpan * 0.2 * strictnessFactor),
      Math.max(18, bodyScale * 0.11 * strictnessFactor)
    );
    const hipRect = this.createRectFromPair(
      refLeftHip,
      refRightHip,
      Math.max(14, hipSpan * 0.2 * strictnessFactor),
      Math.max(18, bodyScale * 0.11 * strictnessFactor)
    );

    const shoulderInside = Boolean(shoulderRect)
      && this.isPointInRect(this.poseLandmarks[11], shoulderRect)
      && this.isPointInRect(this.poseLandmarks[12], shoulderRect);
    const hipInside = Boolean(hipRect)
      && this.isPointInRect(this.poseLandmarks[23], hipRect)
      && this.isPointInRect(this.poseLandmarks[24], hipRect);
    const aligned = shoulderInside && hipInside;

    return {
      available: true,
      aligned,
      score,
      setName: calibrationSet.name || 'callibration_date',
      headRect,
      shoulderRect,
      hipRect
    };
  }

  createCalibrationInfoPanel() {
    const panel = document.createElement('div');
    panel.className = 'calibration-info-panel';
    panel.innerHTML = '<h3>Kallibrierung</h3><p>Warte auf Pose-Daten...</p>';
    panel.style.display = 'none';
    document.body.appendChild(panel);
    this.calibrationInfoEl = panel;
  }

  createPoseAlignmentInfoPanel() {
    const panel = document.createElement('div');
    panel.className = 'pose-alignment-info-panel';
    panel.innerHTML = '<h3>Pose Warnung</h3><p>Außerhalb der Kallibrierung.</p>';
    panel.style.display = 'none';
    document.body.appendChild(panel);
    this.poseAlignmentInfoEl = panel;
  }

  setPoseAlignmentPanelVisible(visible) {
    if (!this.poseAlignmentInfoEl) {
      return;
    }
    this.poseAlignmentInfoEl.style.display = visible ? 'block' : 'none';
  }

  updatePoseAlignmentPanelPosition() {
    if (!this.poseAlignmentInfoEl) {
      return;
    }

    const viewportWidth = window.innerWidth;
    const leftNavWidth = 220;
    const rightPanelWidth = 270;
    const centerX = leftNavWidth + (viewportWidth - leftNavWidth - rightPanelWidth) / 2;
    const bottomOffset = 28;

    this.poseAlignmentInfoEl.style.left = `${centerX}px`;
    this.poseAlignmentInfoEl.style.right = 'auto';
    this.poseAlignmentInfoEl.style.top = 'auto';
    this.poseAlignmentInfoEl.style.bottom = `${bottomOffset}px`;
    this.poseAlignmentInfoEl.style.transform = 'translateX(-50%)';
  }

  updatePoseAlignmentPanelContent(status) {
    if (!this.poseAlignmentInfoEl || !status || !status.available || status.aligned) {
      return;
    }

    const scorePercent = Math.round(status.score * 100);
    this.poseAlignmentInfoEl.innerHTML = `
      <div class="pose-warning-header">
        <h3>Pose Warnung</h3>
      </div>
      <div class="pose-warning-body">
        <p>Körper außerhalb der Kallibrierungsgrenzen.</p>
        <div class="pose-warning-row"><span>Set</span><strong>${status.setName || 'callibration_date'}</strong></div>
        <div class="pose-warning-row"><span>Übereinstimmung</span><strong>${scorePercent}%</strong></div>
      </div>
    `;
  }

  setCalibrationPanelVisible(visible) {
    if (!this.calibrationInfoEl) {
      return;
    }
    this.calibrationInfoEl.style.display = visible ? 'block' : 'none';
  }

  updateCalibrationPanelPosition() {
    if (!this.calibrationInfoEl) {
      return;
    }

    this.calibrationInfoEl.style.left = 'auto';
    this.calibrationInfoEl.style.right = '12px';
    this.calibrationInfoEl.style.top = '18px';
  }

  updateCalibrationPanelContent() {
    if (!this.calibrationInfoEl) {
      return;
    }

    if (this.level === 0) {
      const countdownSeconds = this.calibrationAligned && this.calibrationAlignedSince
        ? Math.max(0, 3 - (performance.now() - this.calibrationAlignedSince) / 1000)
        : 0;
      const countdownText = this.calibrationAligned && !this.calibrationSuccess
        ? `<div class="calibration-score-row"><span>Countdown</span><strong>${countdownSeconds.toFixed(1)}s</strong></div>`
        : '';
      const activeCalibration = this.getSelectedCalibrationPoseSet();
      const activeCalibrationLabel = activeCalibration
        ? `${activeCalibration.name || 'callibration_date'} vom ${new Date(activeCalibration.timestamp || Date.now()).toLocaleString()}`
        : 'Keine aktive Kalibrierung ausgewählt';

      this.calibrationInfoEl.classList.toggle('success', this.calibrationSuccess);
      const successSummary = this.calibrationSuccess
        ? `
          <p class="calibration-status">Kalibrierung gespeichert.</p>
          <p class="calibration-hint"><strong>Aktive Kalibrierung:</strong> ${activeCalibrationLabel}</p>
          <p class="calibration-hint">Die aktive Kalibrierung kann in den Einstellungen geändert werden.</p>
        `
        : `
          <p class="calibration-status">${this.calibrationAligned ? 'Winkel und Haltung korrekt - halte die Position.' : 'Ausrichtung noch unvollständig.'}</p>
          <p class="calibration-hint"><strong>Aktive Kalibrierung:</strong> ${activeCalibrationLabel}</p>
          <p class="calibration-hint">Die aktive Kalibrierung kann in den Einstellungen geändert werden.</p>
        `;

      this.calibrationInfoEl.innerHTML = `
        <h3>Kallibrierung - Oberkörper</h3>
        <p>Bitte circa 1,5 m von der Kamera entfernt stehen, die Kamera auf Brusthöhe und gerade ausgerichtet positionieren. Am besten eignet sich eine feste Laptop- oder Webcam-Position.</p>
        <h4>Neukalibrierung:</h4>
        <ol>
          <li>Stelle dein Gesicht in das rote Augen-Rechteck.</li>
          <li>Richte die Hüfte in das untere grüne Rechteck aus.</li>
          <li>Die gestrichelte vertikale Mittellinie dient als Orientierung für die Körpermitte, der Oberkörper soll senkrecht ausgerichtet sein.</li>
          <li>Sobald Kopf und Hüfte korrekt sind, erscheint das orangefarbene Schulter-Rechteck.</li>
          <li>Lege die Arme so an, dass der Schulterwinkel etwa 45° und der Ellenbogenwinkel etwa 180° beträgt.</li>
          <li>Halte die Stellung stabil, bis der Countdown auf 0 läuft und die Linien grün werden.</li>
        </ol>
        ${countdownText}
        ${successSummary}
      `;
      return;
    }

    if (this.level === 1) {
      this.calibrationInfoEl.classList.remove('success');
      this.calibrationInfoEl.innerHTML = `
        <h3>Kallibrierung - forte</h3>
        <p>Folge den großen Referenz-Linien mit beiden Händen spiegelbildlich.</p>
        <p class="calibration-status">Pfad: Oben nach unten, dann nach innen und zurück.</p>
        <p><strong>Wirkungsbereich:</strong> tief (Gürtelhöhe), fern (ausgestreckt) und weit (voneinander entfernt).</p>
        <p class="calibration-hint">Die Punkte laufen als visuelle Bewegungsführung.</p>
      `;
      return;
    }

    if (this.level === 2) {
      this.calibrationInfoEl.classList.remove('success');
      this.calibrationInfoEl.innerHTML = `
        <h3>Kallibrierung - piano</h3>
        <p>Folge demselben Bewegungsmuster in einer kleineren Form zur Bildmitte.</p>
        <p class="calibration-status">Pfad: Kompakt, kontrolliert und symmetrisch.</p>
        <p><strong>Wirkungsbereich:</strong> hoch (unter den Augen), nah (am Gesicht) und zusammen.</p>
        <p class="calibration-hint">Die Punkte zeigen den kleineren Bewegungsraum.</p>
      `;
      return;
    }

    const scorePercent = Math.round(this.calibrationScore * 100);
    const stateText = this.calibrationSuccess ? 'Perfekt ausgerichtet!' : 'Noch nicht stabil ausgerichtet';
    const hintText = this.calibrationSuccess
      ? 'Sehr gut. Du bist zentriert und passend positioniert.'
      : 'Augen zur oberen Linie, Hüfte zur unteren Linie, Arme als symmetrisches Dreieck.';
    const feedbackText = performance.now() < this.calibrationSaveFeedbackUntilMs
      ? this.calibrationSaveFeedbackText
      : '';

    this.calibrationInfoEl.classList.toggle('success', this.calibrationSuccess);
    this.calibrationInfoEl.innerHTML = `
      <h3>Kallibrierung</h3>
      <p>Zentriere dich im Bild und richte Körper, Augen und Arme am Referenzrahmen aus.</p>
      <div class="calibration-score-row">
        <span>Ausrichtung</span>
        <strong>${scorePercent}%</strong>
      </div>
      <p class="calibration-status">${stateText}</p>
      <p class="calibration-hint">${hintText}</p>
      ${feedbackText ? `<p class="calibration-feedback">${feedbackText}</p>` : ''}
    `;
  }

  createConsistencyInfoPanel() {
    const panel = document.createElement('div');
    panel.className = 'consistency-info-panel';
    panel.innerHTML = '<h3>Gleichmäßigkeit</h3><p>Warte auf Start...</p>';
    panel.style.display = 'none';
    document.body.appendChild(panel);
    this.consistencyInfoEl = panel;
  }

  setConsistencyPanelVisible(visible) {
    if (!this.consistencyInfoEl) {
      return;
    }

    const shouldShow = Boolean(visible);
    this.consistencyInfoEl.style.display = shouldShow ? 'block' : 'none';

    if (shouldShow) {
      this.updateConsistencyPanelPosition();
      this.updateConsistencyPanelContent();
    }
  }

  updateConsistencyPanelPosition() {
    if (!this.consistencyInfoEl) {
      return;
    }

    this.consistencyInfoEl.style.left = 'auto';
    this.consistencyInfoEl.style.right = '12px';
    this.consistencyInfoEl.style.top = '18px';
  }

  updateConsistencyPanelContent() {
    if (!this.consistencyInfoEl) {
      return;
    }

    const levelNames = [
      'Rechte Linie',
      'Linke Linie',
      'Synchron',
      'Versetzt',
      '2:1 Tempo',
      'Ellipsen'
    ];
    const levelName = levelNames[this.level] || `Level ${this.level + 1}`;
    const scorePercent = Math.round(this.consistencyAccuracy * 100);

    if (!this.consistencyInfoEl.querySelector('.consistency-score-value')) {
      this.consistencyInfoEl.innerHTML = `
        <h3 class="consistency-title"></h3>
        <p>Folge den bewegten Punkten so präzise und gleichmäßig wie möglich.</p>
        <div class="consistency-score-row">
          <span>Genauigkeit (letzte 3s)</span>
          <strong class="consistency-score-value">0%</strong>
        </div>
        <div class="consistency-slider-row">
          <label for="consistency-speed-slider">Tempo</label>
          <input id="consistency-speed-slider" type="range" min="30" max="170" step="5" value="100" />
          <span class="consistency-slider-value consistency-speed-value">100 bpm</span>
        </div>
        <div class="consistency-slider-row">
          <label for="consistency-strictness-slider">Strenge</label>
          <input id="consistency-strictness-slider" type="range" min="70" max="160" step="5" value="100" />
          <span class="consistency-slider-value consistency-strictness-value">100%</span>
        </div>
        <div class="consistency-slider-row">
          <label for="consistency-motion-slider">Kurve</label>
          <input id="consistency-motion-slider" type="range" min="0" max="100" step="5" value="0" />
          <span class="consistency-slider-value consistency-motion-value">0%</span>
        </div>
        <p class="consistency-status">Die Bewertung aktualisiert sich fortlaufend.</p>
      `;

      const speedSlider = this.consistencyInfoEl.querySelector('#consistency-speed-slider');
      const strictnessSlider = this.consistencyInfoEl.querySelector('#consistency-strictness-slider');
      const motionSlider = this.consistencyInfoEl.querySelector('#consistency-motion-slider');
      if (speedSlider) {
        speedSlider.value = String(this.consistencyTempoBpm);
        speedSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencyTempoBpm = Number.isFinite(next) ? next : 100;
        });
      }
      if (strictnessSlider) {
        strictnessSlider.value = String(this.consistencyStrictnessPercent);
        strictnessSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencyStrictnessPercent = Number.isFinite(next) ? next : 100;
        });
      }
      if (motionSlider) {
        motionSlider.value = String(this.consistencyMotionBlendPercent);
        motionSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencyMotionBlendPercent = Number.isFinite(next) ? next : 0;
        });
      }
    }

    const titleEl = this.consistencyInfoEl.querySelector('.consistency-title');
    const scoreEl = this.consistencyInfoEl.querySelector('.consistency-score-value');
    const speedValueEl = this.consistencyInfoEl.querySelector('.consistency-speed-value');
    const strictnessValueEl = this.consistencyInfoEl.querySelector('.consistency-strictness-value');
    const motionValueEl = this.consistencyInfoEl.querySelector('.consistency-motion-value');
    if (titleEl) {
      titleEl.textContent = `Gleichmäßigkeit - ${levelName}`;
    }
    if (scoreEl) {
      scoreEl.textContent = `${scorePercent}%`;
    }
    if (speedValueEl) {
      speedValueEl.textContent = `${Math.round(this.consistencyTempoBpm)} bpm`;
    }
    if (strictnessValueEl) {
      strictnessValueEl.textContent = `${Math.round(this.consistencyStrictnessPercent)}%`;
    }
    if (motionValueEl) {
      motionValueEl.textContent = `${Math.round(this.consistencyMotionBlendPercent)}%`;
    }
  }

  setCompletionCallback(cb) {
    this.completionCallback = cb;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.buildGrid();
    this.updateCalibrationPanelPosition();
    this.updatePoseAlignmentPanelPosition();
    this.updateConsistencyPanelPosition();
    this.render();
  }

  buildGrid() {
    const rows = this.gridRows;
    const cols = this.gridCols;
    this.grid = [];
    this.circleScales = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    const spacingX = w / cols;
    const spacingY = h / rows;
    const radiusX = spacingX / 2 * 0.98;
    const radiusY = spacingY / 2 * 0.98;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        this.grid.push({
          x: w - (col + 0.5) * spacingX,  // mirrored to match main canvas
          y: (row + 0.5) * spacingY,
          radiusX,
          radiusY,
          row: row,
          col: col
        });
        this.circleScales.push(1.0);
      }
    }

    this.rebuildTargetIndexLookup();
  }

  rebuildTargetIndexLookup() {
    this.targetIndexByCircle.clear();

    for (let targetIndex = 0; targetIndex < this.targets.length; targetIndex += 1) {
      const target = this.targets[targetIndex];
      if (!target) {
        continue;
      }

      const circleIndices = [];
      if (Number.isInteger(target.index)) {
        circleIndices.push(target.index);
      }
      if (Number.isInteger(target.leftIndex)) {
        circleIndices.push(target.leftIndex);
      }
      if (Number.isInteger(target.rightIndex)) {
        circleIndices.push(target.rightIndex);
      }

      circleIndices.forEach((circleIndex) => {
        if (!this.targetIndexByCircle.has(circleIndex)) {
          this.targetIndexByCircle.set(circleIndex, targetIndex);
        }
      });
    }
  }

  requestRender() {
    if (this.renderQueued) {
      return;
    }

    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.render();
    });
  }

  getGridColumnForX(x) {
    if (!this.canvas.width || !this.gridCols) {
      return 0;
    }

    const spacingX = this.canvas.width / this.gridCols;
    const mirroredCol = Math.round((this.canvas.width - x) / spacingX - 0.5);
    return Math.max(0, Math.min(this.gridCols - 1, mirroredCol));
  }

  getEingewoehnungColumns() {
    const centerX = this.canvas.width * 0.5;
    const wristOffset = this.canvas.width * 0.25;
    const outerRightCol = this.getGridColumnForX(centerX + wristOffset);
    const outerLeftCol = this.getGridColumnForX(centerX - wristOffset);
    const innerOffset = wristOffset * 0.55;
    const innerRightCol = this.getGridColumnForX(centerX + innerOffset);
    const innerLeftCol = this.getGridColumnForX(centerX - innerOffset);

    return {
      outerRightCol,
      outerLeftCol,
      innerRightCol,
      innerLeftCol
    };
  }

  setChapter(chapter) {
    this.persistDynamicFigureCornerHeights();
    this.chapter = chapter;
    this.setupLevel();
  }

  setLevel(level) {
    this.persistDynamicFigureCornerHeights();
    this.level = level;
    this.setupLevel();
  }

  loadDynamicFigureCornerHeights() {
    try {
      const stored = localStorage.getItem('motionai.dynamic-figure-corner-heights');
      const parsed = stored ? JSON.parse(stored) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  persistDynamicFigureCornerHeights() {
    if (this.chapter !== 4 || !Number.isInteger(this.level) || this.level < 0 || this.level > 3) {
      return;
    }

    this.dynamicFigureCornerHeightsByLevel[this.level] = this.dynamicFigureCornerHeights.slice();
    try {
      localStorage.setItem(
        'motionai.dynamic-figure-corner-heights',
        JSON.stringify(this.dynamicFigureCornerHeightsByLevel)
      );
    } catch (error) {
      return;
    }
  }

  getDynamicFigureCornerHeightsForLevel(level) {
    const stored = this.dynamicFigureCornerHeightsByLevel[level];
    const count = Number.isInteger(level) ? (level + 1) * 2 : 0;
    return Array.from({ length: 8 }, (_, index) => {
      const value = Array.isArray(stored) ? Number(stored[index]) : 0;
      return index < count && Number.isFinite(value)
        ? Math.min(20, Math.max(-20, value))
        : 0;
    });
  }

  setFigureVariant(variant) {
    const nextVariant = variant === 'hard' ? 'hard' : 'soft';
    if (this.figureVariant === nextVariant) {
      return;
    }

    this.figureVariant = nextVariant;
    this.requestRender();
  }

  setFigureScale(scale) {
    const next = Number(scale);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(1, Math.max(0.2, next));
    if (this.figureScale === clamped) {
      return;
    }

    this.figureScale = clamped;
    this.requestRender();
  }

  setFigureStrokeWidth(width) {
    const next = Number(width);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(0.5, Math.max(0.01, next));
    if (this.figureStrokeWidth === clamped) {
      return;
    }

    this.figureStrokeWidth = clamped;
    this.requestRender();
  }

  setFigureSide(side) {
    const nextSide = side === 'right' ? 'right' : side === 'both' ? 'both' : 'left';
    if (this.figureSide === nextSide) {
      return;
    }

    this.figureSide = nextSide;
    this.requestRender();
  }

  setFigureHorizontalOffset(offset) {
    const next = Number(offset);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(300, Math.max(50, next));
    if (this.figureHorizontalOffset === clamped) {
      return;
    }

    this.figureHorizontalOffset = clamped;
    this.requestRender();
  }

  setFigureYPosition(yPosition) {
    const next = Number(yPosition);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(300, Math.max(-300, next));
    if (this.figureYPosition === clamped) {
      return;
    }

    this.figureYPosition = clamped;
    this.requestRender();
  }

  setFigureDynamicsVisible(visible) {
    const next = Boolean(visible);
    if (this.figureDynamicsVisible === next) {
      return;
    }

    this.figureDynamicsVisible = next;
    this.requestRender();
  }

  setFigureCountTimesVisible(visible) {
    const next = Boolean(visible);
    if (this.figureCountTimesVisible === next) {
      return;
    }

    this.figureCountTimesVisible = next;
    this.requestRender();
  }

  setFigureTempoBpm(bpm) {
    const next = Number(bpm);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(120, Math.max(30, next));
    if (this.figureTempoBpm === clamped) {
      return;
    }

    this.figureTempoBpm = clamped;
    this.requestRender();
  }

  setFigureHardLinearity(linearity) {
    const next = Number(linearity);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(100, Math.max(0, next));
    if (this.figureHardLinearity === clamped) {
      return;
    }

    this.figureHardLinearity = clamped;
    this.requestRender();
  }

  setFigureSoftTransitionPercent(percent) {
    const next = Number(percent);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(50, Math.max(0, next));
    if (this.figureSoftTransitionPercent === clamped) {
      return;
    }

    this.figureSoftTransitionPercent = clamped;
    this.requestRender();
  }

  getFigureDefinitionForLevel(level) {
    if (!Number.isInteger(level) || level < 0 || level > 6) {
      return null;
    }

    const levelNames = [
      'Einserfigur',
      'Zweierfigur',
      'Dreierfigur',
      'Viererfigur',
      'Fünferfigur',
      'Sechserfigur',
      'Siebenerfigur'
    ];
    const figureName = levelNames[level] || null;
    const figurePaths = level < 4 ? basicFigurePaths : extendedFigurePaths;
    if (!figureName || !figurePaths[figureName]) {
      return null;
    }

    const numberPlannedSegments = (level + 1) * 2;
    return {
      ...figurePaths[figureName],
      numberPlannedSegments
    };
  }

  getDynamicFigureDefinitionForLevel(level) {
    if (!Number.isInteger(level) || level < 0 || level > 3) {
      return null;
    }

    const figureName = ['Einserfigur', 'Zweierfigur', 'Dreierfigur', 'Viererfigur'][level];
    const pathData = basicFigurePaths[figureName]?.hardD;
    if (!pathData) {
      return null;
    }

    return {
      pathData,
      numberPlannedSegments: (level + 1) * 2
    };
  }

  setDynamicFigureVariant(variant) {
    this.dynamicFigureVariant = variant === 'hard' ? 'hard' : 'soft';
    this.requestRender();
  }

  setDynamicFigureScale(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureScale = Math.min(1, Math.max(0.2, next));
      this.requestRender();
    }
  }

  setDynamicFigureStrokeWidth(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureStrokeWidth = Math.min(0.5, Math.max(0.01, next));
      this.requestRender();
    }
  }

  setDynamicFigureSide(side) {
    this.dynamicFigureSide = side === 'right' || side === 'both' ? side : 'left';
    this.requestRender();
  }

  setDynamicFigureHorizontalOffset(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureHorizontalOffset = Math.min(300, Math.max(50, next));
      this.requestRender();
    }
  }

  setDynamicFigureYPosition(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureYPosition = Math.min(300, Math.max(-300, next));
      this.requestRender();
    }
  }

  setDynamicFigureTempoBpm(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureTempoBpm = Math.min(120, Math.max(30, next));
      this.requestRender();
    }
  }

  setDynamicFigureDynamicsVisible(visible) {
    this.dynamicFigureDynamicsVisible = Boolean(visible);
    this.requestRender();
  }

  setDynamicFigureCountTimesVisible(visible) {
    this.dynamicFigureCountTimesVisible = Boolean(visible);
    this.requestRender();
  }

  setDynamicFigureHardLinearity(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureHardLinearity = Math.min(100, Math.max(0, next));
      this.requestRender();
    }
  }

  setDynamicFigureSoftTransitionPercent(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureSoftTransitionPercent = Math.min(50, Math.max(0, next));
      this.requestRender();
    }
  }

  setDynamicFigureCornerHeight(index, value) {
    if (!Number.isInteger(index) || index < 0 || index > 7) {
      return;
    }
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureCornerHeights[index] = Math.min(20, Math.max(-20, next));
      this.persistDynamicFigureCornerHeights();
      this.requestRender();
    }
  }

  setDynamicFigureCornerHeights(values) {
    if (!Array.isArray(values)) {
      return;
    }
    this.dynamicFigureCornerHeights = Array.from({ length: 8 }, (_, index) => {
      const value = Number(values[index]);
      return Number.isFinite(value) ? Math.min(20, Math.max(-20, value)) : 0;
    });
    this.persistDynamicFigureCornerHeights();
    this.requestRender();
  }

  applyDynamicFigureCornerHeights(renderSegments, cornerHeights) {
    const cloneSegment = (segment) => ({
      ...segment,
      start: segment.start ? { ...segment.start } : segment.start,
      end: segment.end ? { ...segment.end } : segment.end,
      control1: segment.control1 ? { ...segment.control1 } : segment.control1,
      control2: segment.control2 ? { ...segment.control2 } : segment.control2,
      segments: Array.isArray(segment.segments)
        ? segment.segments.map((child) => cloneSegment(child))
        : segment.segments
    });
    const adjustedSegments = renderSegments.map((segment) => cloneSegment(segment));

    const adjustMatchingPoints = (segment, originalAnchor, nextY) => {
      ['start', 'end'].forEach((pointName) => {
        const point = segment[pointName];
        if (point && point.x === originalAnchor.x && point.y === originalAnchor.y) {
          point.y = nextY;
        }
      });
      if (Array.isArray(segment.segments)) {
        segment.segments.forEach((child) => {
          adjustMatchingPoints(child, originalAnchor, nextY);
        });
      }
    };

    const setLastSegmentEndY = (segment, nextY) => {
      if (Array.isArray(segment.segments) && segment.segments.length > 0) {
        setLastSegmentEndY(segment.segments[segment.segments.length - 1], nextY);
        return;
      }
      if (segment.end) {
        segment.end.y = nextY;
      }
    };

    for (let cornerIndex = 0; cornerIndex < cornerHeights.length; cornerIndex += 1) {
      const segment = adjustedSegments[cornerIndex];
      const originalSegment = renderSegments[cornerIndex];
      const originalAnchor = originalSegment?.start
        || originalSegment?.segments?.[0]?.start;
      if (!segment || !originalAnchor) {
        continue;
      }

      const nextY = originalAnchor.y + Number(cornerHeights[cornerIndex] || 0);
      if (segment.start) {
        segment.start.y = nextY;
      }
      if (Array.isArray(segment.segments) && segment.segments[0]?.start) {
        segment.segments[0].start.y = nextY;
      }
      adjustedSegments.forEach((candidate) => {
        adjustMatchingPoints(candidate, originalAnchor, nextY);
      });

      if (cornerIndex === 0 && adjustedSegments.length > 0) {
        setLastSegmentEndY(adjustedSegments[adjustedSegments.length - 1], nextY);
      }
    }

    return adjustedSegments;
  }

  getCurrentDynamicFigureRenderState() {
    if (!this.canvas || !this.canvas.width || !this.canvas.height) {
      return null;
    }

    const definition = this.getDynamicFigureDefinitionForLevel(this.level);
    if (!definition) {
      return null;
    }

    const originalSegments = this.buildPlannedFigureSegments(
      definition.pathData,
      definition.numberPlannedSegments
    );
    const renderSegments = this.applyDynamicFigureCornerHeights(
      originalSegments,
      this.dynamicFigureCornerHeights.slice(0, (this.level + 1) * 2)
    );
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const baseScale = Math.min(this.canvas.width, this.canvas.height) / 18;
    const scaleX = baseScale * this.dynamicFigureScale;
    const scaleY = baseScale * this.dynamicFigureScale;
    const effectiveStrokeWidth = this.dynamicFigureStrokeWidth
      / Math.max(this.dynamicFigureScale, 0.2);
    const side = this.dynamicFigureSide || 'left';
    const figureConfigs = side === 'both'
      ? [
          { mirrorX: false, offsetX: -this.dynamicFigureHorizontalOffset },
          { mirrorX: true, offsetX: this.dynamicFigureHorizontalOffset }
        ]
      : [{
          mirrorX: side === 'right',
          offsetX: side === 'right' ? this.dynamicFigureHorizontalOffset : -this.dynamicFigureHorizontalOffset
        }];

    return {
      pathData: definition.pathData,
      renderSegments,
      centerX,
      centerY,
      scaleX,
      scaleY,
      effectiveStrokeWidth,
      figureConfigs
    };
  }

  buildPlannedFigureSegments(pathData, plannedSegmentCount) {
    const originalSegments = this.parseSvgPathSegments(pathData);
    if (originalSegments.length === 0) {
      return [];
    }

    const totalOriginalSegments = originalSegments.length;
    const effectivePlannedCount = Math.max(1, Math.min(totalOriginalSegments, Number(plannedSegmentCount) || totalOriginalSegments));
    const plannedSegments = [];

    for (let index = 0; index < effectivePlannedCount; index += 1) {
      const isLastPlannedSegment = index === effectivePlannedCount - 1;
      const remainingOriginalSegments = originalSegments.slice(index);

      if (isLastPlannedSegment && totalOriginalSegments > effectivePlannedCount) {
        plannedSegments.push({
          type: 'combined',
          plannedIndex: index,
          segments: remainingOriginalSegments
        });
        break;
      }

      plannedSegments.push({
        ...originalSegments[index],
        plannedIndex: index
      });
    }

    return plannedSegments;
  }

  parseSvgPathSegments(pathData) {
    if (!pathData || typeof pathData !== 'string') {
      return [];
    }

    const tokens = pathData.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
    const segments = [];
    
    let current = { x: 0, y: 0 };
    let start = { x: 0, y: 0 };
    let command = null;
    let args = [];


    const flushCurrentCommand = () => {
      if (!command) {
        return;
      }

      if (command === 'M') {
        if (args.length >= 2) {
          current = { x: args[0], y: args[1] };
          start = { ...current };
          args = args.slice(2);
        }
      } else if (command === 'L') {
        while (args.length >= 2) {
          const end = { x: args[0], y: args[1] };
          segments.push({ type: 'L', start: { ...current }, end });
          current = { ...end };
          args = args.slice(2);
        }
      } else if (command === 'C') {
        while (args.length >= 6) {
          const control1 = { x: args[0], y: args[1] };
          const control2 = { x: args[2], y: args[3] };
          const end = { x: args[4], y: args[5] };
          segments.push({ type: 'C', start: { ...current }, control1, control2, end });
          current = { ...end };
          args = args.slice(6);
        }
      } else if (command === 'Z') {
        segments.push({ type: 'Z', start: { ...current }, end: { ...start } });
        current = { ...start };
      }
    };

    tokens.forEach((token) => {
      if (/[A-Za-z]/.test(token)) {
        flushCurrentCommand();
        command = token.toUpperCase();
        args = [];
        return;
      }

      args.push(Number(token));
    });

    flushCurrentCommand();
    return segments;
  }

  getCurrentFigureRenderState() {
    if (!this.canvas || !this.canvas.width || !this.canvas.height) {
      return null;
    }

    const definition = this.getFigureDefinitionForLevel(this.level);
    if (!definition) {
      return null;
    }

    const variant = this.figureVariant === 'hard' ? 'hardD' : 'softD';
    const pathData = definition[variant];
    if (!pathData) {
      return null;
    }

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const plannedSegmentCount = Number(definition.numberPlannedSegments) || 0;
    const renderSegments = this.buildPlannedFigureSegments(pathData, plannedSegmentCount);
    const baseScale = Math.min(this.canvas.width, this.canvas.height) / 18;
    const scaleX = baseScale * this.figureScale;
    const scaleY = baseScale * this.figureScale;
    const effectiveStrokeWidth = this.figureStrokeWidth / Math.max(this.figureScale, 0.2);
    const side = this.figureSide || 'left';
    const figureConfigs = side === 'both'
      ? [
          { mirrorX: false, offsetX: -this.figureHorizontalOffset },
          { mirrorX: true, offsetX: this.figureHorizontalOffset }
        ]
      : [{ mirrorX: side === 'right', offsetX: side === 'right' ? this.figureHorizontalOffset : -this.figureHorizontalOffset }];

    return {
      pathData,
      renderSegments,
      centerX,
      centerY,
      scaleX,
      scaleY,
      effectiveStrokeWidth,
      figureConfigs
    };
  }

  drawFigurePath(state = this.getCurrentFigureRenderState(), settings = {}) {
    if (!state) {
      return;
    }

    const {
      pathData,
      renderSegments,
      centerX,
      centerY,
      scaleX,
      scaleY,
      effectiveStrokeWidth,
      figureConfigs
    } = state;
    const colors = ['#6ee7a8', '#7dd3fc'];

    const renderSingleFigure = ({ mirrorX, offsetX }) => {
      this.ctx.save();
      this.ctx.translate(
        centerX + offsetX,
        centerY + (settings.yPosition ?? this.figureYPosition)
      );
      this.ctx.scale(scaleX, scaleY);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = effectiveStrokeWidth;

      if (mirrorX) {
        this.ctx.scale(-1, 1);
      }

      if (renderSegments.length > 0) {
        renderSegments.forEach((segment, index) => {
          const color = colors[index % colors.length];
          this.ctx.beginPath();

          if (segment.type === 'combined' && Array.isArray(segment.segments)) {
            const firstSubSegment = segment.segments[0];
            if (firstSubSegment) {
              if (firstSubSegment.type === 'L') {
                this.ctx.moveTo(firstSubSegment.start.x, firstSubSegment.start.y);
                this.ctx.lineTo(firstSubSegment.end.x, firstSubSegment.end.y);
              } else if (firstSubSegment.type === 'C') {
                this.ctx.moveTo(firstSubSegment.start.x, firstSubSegment.start.y);
                this.ctx.bezierCurveTo(
                  firstSubSegment.control1.x,
                  firstSubSegment.control1.y,
                  firstSubSegment.control2.x,
                  firstSubSegment.control2.y,
                  firstSubSegment.end.x,
                  firstSubSegment.end.y
                );
              } else if (firstSubSegment.type === 'Z') {
                this.ctx.moveTo(firstSubSegment.start.x, firstSubSegment.start.y);
                this.ctx.lineTo(firstSubSegment.end.x, firstSubSegment.end.y);
              }

              for (let i = 1; i < segment.segments.length; i += 1) {
                const subSegment = segment.segments[i];
                if (subSegment.type === 'L') {
                  this.ctx.lineTo(subSegment.end.x, subSegment.end.y);
                } else if (subSegment.type === 'C') {
                  this.ctx.bezierCurveTo(
                    subSegment.control1.x,
                    subSegment.control1.y,
                    subSegment.control2.x,
                    subSegment.control2.y,
                    subSegment.end.x,
                    subSegment.end.y
                  );
                } else if (subSegment.type === 'Z') {
                  this.ctx.lineTo(subSegment.end.x, subSegment.end.y);
                }
              }
            }
          } else if (segment.type === 'L') {
            this.ctx.moveTo(segment.start.x, segment.start.y);
            this.ctx.lineTo(segment.end.x, segment.end.y);
          } else if (segment.type === 'C') {
            this.ctx.moveTo(segment.start.x, segment.start.y);
            this.ctx.bezierCurveTo(
              segment.control1.x,
              segment.control1.y,
              segment.control2.x,
              segment.control2.y,
              segment.end.x,
              segment.end.y
            );
          } else if (segment.type === 'Z') {
            this.ctx.moveTo(segment.start.x, segment.start.y);
            this.ctx.lineTo(segment.end.x, segment.end.y);
          }

          this.ctx.strokeStyle = color;
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 10;
          this.ctx.stroke();
        });
      } else {
        const fallbackPath = new Path2D(pathData);
        this.ctx.strokeStyle = (settings.variant || this.figureVariant) === 'hard'
          ? '#7dd3fc'
          : '#6ee7a8';
        this.ctx.shadowColor = this.ctx.strokeStyle;
        this.ctx.shadowBlur = 10;
        this.ctx.stroke(fallbackPath);
      }

      this.ctx.restore();
    };

    figureConfigs.forEach((config) => {
      renderSingleFigure(config);
    });
  }

  getLinePoint(start, end, t) {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };
  }

  getCubicPoint(segment, t) {
    const mt = 1 - t;
    return {
      x: mt ** 3 * segment.start.x
        + 3 * mt ** 2 * t * segment.control1.x
        + 3 * mt * t ** 2 * segment.control2.x
        + t ** 3 * segment.end.x,
      y: mt ** 3 * segment.start.y
        + 3 * mt ** 2 * t * segment.control1.y
        + 3 * mt * t ** 2 * segment.control2.y
        + t ** 3 * segment.end.y
    };
  }

  samplePathSegment(segment, steps = 28) {
    if (!segment) {
      return [];
    }

    if (segment.type === 'combined' && Array.isArray(segment.segments)) {
      const points = [];
      segment.segments.forEach((subSegment) => {
        const subPoints = this.samplePathSegment(subSegment, steps);
        subPoints.forEach((point, index) => {
          if (points.length > 0 && index === 0) {
            return;
          }
          points.push(point);
        });
      });
      return points;
    }

    if (segment.type === 'L' || segment.type === 'Z') {
      return [segment.start, segment.end];
    }

    if (segment.type === 'C') {
      const points = [];
      for (let i = 0; i <= steps; i += 1) {
        points.push(this.getCubicPoint(segment, i / steps));
      }
      return points;
    }

    return [];
  }

  getPointAtDistance(points, distance) {
    if (!Array.isArray(points) || points.length === 0) {
      return null;
    }

    if (points.length === 1 || distance <= 0) {
      return points[0];
    }

    let remaining = distance;
    for (let i = 1; i < points.length; i += 1) {
      const start = points[i - 1];
      const end = points[i];
      const length = this.distance(start, end);
      if (length <= 0) {
        continue;
      }
      if (remaining <= length) {
        return this.getLinePoint(start, end, remaining / length);
      }
      remaining -= length;
    }

    return points[points.length - 1];
  }

  getSampledSegmentLength(segment) {
    const points = this.samplePathSegment(segment);
    let length = 0;
    for (let index = 1; index < points.length; index += 1) {
      length += this.distance(points[index - 1], points[index]);
    }
    return length;
  }

  getHardSegmentProgress(segmentProgress, segmentIndex, hardLinearity = this.figureHardLinearity) {
    const linearity = Math.min(100, Math.max(0, Number(hardLinearity) || 0));
    const strength = (100 - linearity) / 100;
    const exponent = 1 + strength * 5;
    const progress = Math.min(1, Math.max(0, segmentProgress));

    return segmentIndex % 2 === 0
      ? 1 - ((1 - progress) ** exponent)
      : progress ** exponent;
  }

  computeSoftTransitionProfiles(segmentLengths, transitionPercent) {
    const lengths = Array.isArray(segmentLengths) ? segmentLengths : [];
    const transition = Math.min(0.5, Math.max(0, Number(transitionPercent) || 0) / 100);
    const segmentCount = lengths.length;
    if (segmentCount === 0) {
      return [];
    }

    const boundarySpeeds = lengths.slice(0, -1).map((length, index) => (
      (length + lengths[index + 1]) / 2
    ));

    return lengths.map((length, index) => {
      const startSpeed = index === 0 ? length : boundarySpeeds[index - 1];
      const endSpeed = index === segmentCount - 1 ? length : boundarySpeeds[index];

      if (transition === 0) {
        return {
          length,
          startSpeed: length,
          coreSpeed: length,
          endSpeed: length,
          velocityAt: () => length,
          distanceAt: (progress) => length * Math.min(1, Math.max(0, progress)),
          progressAtDistance: (distance) => length > 0
            ? Math.min(1, Math.max(0, distance / length))
            : 0
        };
      }

      const coreSpeed = (
        length - (transition / 2) * (startSpeed + endSpeed)
      ) / (1 - transition);
      const distanceAt = (progress) => {
        const clampedProgress = Math.min(1, Math.max(0, progress));
        if (clampedProgress <= transition) {
          return startSpeed * clampedProgress
            + ((coreSpeed - startSpeed) * clampedProgress ** 2) / (2 * transition);
        }

        const firstRampDistance = transition * (startSpeed + coreSpeed) / 2;
        if (clampedProgress <= 1 - transition) {
          return firstRampDistance + coreSpeed * (clampedProgress - transition);
        }

        const secondRampProgress = clampedProgress - (1 - transition);
        return firstRampDistance
          + coreSpeed * (1 - 2 * transition)
          + coreSpeed * secondRampProgress
          + ((endSpeed - coreSpeed) * secondRampProgress ** 2) / (2 * transition);
      };

      return {
        length,
        startSpeed,
        coreSpeed,
        endSpeed,
        velocityAt: (progress) => {
          const clampedProgress = Math.min(1, Math.max(0, progress));
          if (clampedProgress <= transition) {
            return startSpeed + (coreSpeed - startSpeed) * (clampedProgress / transition);
          }
          if (clampedProgress <= 1 - transition) {
            return coreSpeed;
          }
          return coreSpeed + (endSpeed - coreSpeed)
            * ((clampedProgress - (1 - transition)) / transition);
        },
        distanceAt,
        progressAtDistance: (distance) => {
          const targetDistance = Math.min(length, Math.max(0, distance));
          let low = 0;
          let high = 1;
          for (let iteration = 0; iteration < 32; iteration += 1) {
            const middle = (low + high) / 2;
            if (distanceAt(middle) < targetDistance) {
              low = middle;
            } else {
              high = middle;
            }
          }
          return (low + high) / 2;
        }
      };
    });
  }

  getSoftSegmentProgress(segmentProgress, segmentIndex, transitionProfiles) {
    const progress = Math.min(1, Math.max(0, segmentProgress));
    const profile = transitionProfiles?.[segmentIndex];
    if (!profile) {
      return progress;
    }
    return profile.length > 0 ? profile.distanceAt(progress) / profile.length : progress;
  }

  getFigureMotionPointAtElapsed(
    renderSegments,
    elapsedMs,
    segmentLengths,
    segmentDurationMs,
    pathDurationMs,
    transitionProfiles,
    settings = {}
  ) {
    const normalizedElapsedMs = ((elapsedMs % pathDurationMs) + pathDurationMs) % pathDurationMs;
    const segmentIndex = Math.min(
      renderSegments.length - 1,
      Math.floor(normalizedElapsedMs / segmentDurationMs)
    );
    const segmentProgress = (
      normalizedElapsedMs - segmentIndex * segmentDurationMs
    ) / segmentDurationMs;
    const points = this.samplePathSegment(renderSegments[segmentIndex]);
    if (points.length === 0) {
      return null;
    }

    const segmentLength = segmentLengths[segmentIndex] || 0;
    const variant = settings.variant || this.figureVariant;
    const adjustedProgress = variant === 'hard'
      ? this.getHardSegmentProgress(segmentProgress, segmentIndex, settings.hardLinearity)
      : this.getSoftSegmentProgress(segmentProgress, segmentIndex, transitionProfiles);
    const completedLength = segmentLengths
      .slice(0, segmentIndex)
      .reduce((total, length) => total + length, 0);

    return {
      point: this.getPointAtDistance(points, segmentLength * adjustedProgress),
      pathDistance: completedLength + segmentLength * adjustedProgress,
      velocity: variant === 'hard'
        ? null
        : transitionProfiles?.[segmentIndex]?.velocityAt(segmentProgress) || 0,
      segmentIndex,
      segmentProgress
    };
  }

  getFigureMotionState(renderSegments, scale = 1, settings = {}) {
    if (!Array.isArray(renderSegments) || renderSegments.length === 0) {
      return null;
    }

    const bpm = Math.min(120, Math.max(30, Number(settings.tempoBpm ?? this.figureTempoBpm) || 60));
    const beatDurationMs = 60000 / bpm;
    const segmentDurationMs = beatDurationMs / 2;
    const pathDurationMs = segmentDurationMs * renderSegments.length;
    if (!(pathDurationMs > 0)) {
      return null;
    }

    const animationStart = settings.animationStart ?? this.figureAnimationStart;
    const nowMs = performance.now() - animationStart;
    const segmentLengths = renderSegments.map((segment) => this.getSampledSegmentLength(segment));
    const variant = settings.variant || this.figureVariant;
    const transitionProfiles = variant === 'hard'
      ? []
      : this.computeSoftTransitionProfiles(
          segmentLengths,
          settings.softTransitionPercent ?? this.figureSoftTransitionPercent
        );
    const currentState = this.getFigureMotionPointAtElapsed(
      renderSegments,
      nowMs,
      segmentLengths,
      segmentDurationMs,
      pathDurationMs,
      transitionProfiles,
      settings
    );
    const measurementWindowMs = Math.min(12, segmentDurationMs / 8);
    const previousState = this.getFigureMotionPointAtElapsed(
      renderSegments,
      nowMs - measurementWindowMs,
      segmentLengths,
      segmentDurationMs,
      pathDurationMs,
      transitionProfiles,
      settings
    );
    const nextState = this.getFigureMotionPointAtElapsed(
      renderSegments,
      nowMs + measurementWindowMs,
      segmentLengths,
      segmentDurationMs,
      pathDurationMs,
      transitionProfiles,
      settings
    );
    if (!currentState || !previousState || !nextState) {
      return null;
    }

    const totalPathLength = segmentLengths.reduce((total, length) => total + length, 0);
    let measuredDistance = nextState.pathDistance - previousState.pathDistance;
    if (measuredDistance < 0) {
      measuredDistance += totalPathLength;
    }
    const speedPathUnitsPerSecond = totalPathLength > 0
      ? measuredDistance / (measurementWindowMs * 2 / 1000)
      : 0;

    return {
      point: currentState.point,
      speed: currentState.velocity === null
        ? Math.max(0, speedPathUnitsPerSecond * scale)
        : Math.max(0, currentState.velocity * scale / (segmentDurationMs / 1000)),
      segmentIndex: currentState.segmentIndex,
      segmentProgress: currentState.segmentProgress
    };
  }

  getFigureMotionPoint(renderSegments) {
    const motionState = this.getFigureMotionState(renderSegments);
    return motionState ? motionState.point : null;
  }

  drawDynamicFigureMotionPoints(state) {
    if (!state) {
      return;
    }

    const motionState = this.getFigureMotionState(state.renderSegments, state.scaleX, {
      variant: this.dynamicFigureVariant,
      tempoBpm: this.dynamicFigureTempoBpm,
      hardLinearity: this.dynamicFigureHardLinearity,
      softTransitionPercent: this.dynamicFigureSoftTransitionPercent,
      animationStart: this.dynamicFigureAnimationStart
    });
    if (!motionState) {
      return;
    }

    const motionPoint = motionState.point;
    const pointRadius = Math.max(6, Math.min(this.canvas.width, this.canvas.height) * 0.016);
    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      const mirroredX = mirrorX ? -motionPoint.x : motionPoint.x;
      const x = state.centerX + offsetX + mirroredX * state.scaleX;
      const y = state.centerY + this.dynamicFigureYPosition + motionPoint.y * state.scaleY;

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      this.ctx.strokeStyle = 'rgba(20, 28, 38, 0.55)';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      this.ctx.shadowBlur = 14;
      this.ctx.beginPath();
      this.ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  drawDynamicFigureCountTimes(state) {
    if (!this.dynamicFigureCountTimesVisible || !state || state.renderSegments.length === 0) {
      return;
    }

    const beatCount = Math.ceil(state.renderSegments.length / 2);
    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
        const anchor = this.getFigureAnchorPoint(state.renderSegments, beatIndex * 2);
        if (!anchor) {
          continue;
        }
        const anchorX = mirrorX ? -anchor.x : anchor.x;
        const x = state.centerX + offsetX + anchorX * state.scaleX;
        const y = state.centerY + this.dynamicFigureYPosition + anchor.y * state.scaleY;
        const label = String(beatIndex + 1);

        this.ctx.save();
        this.ctx.font = '400 17px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'rgba(8, 18, 30, 0.86)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(label, x, y - 15);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        this.ctx.fillText(label, x, y - 15);
        this.ctx.restore();
      }
    });
  }

  drawFigureMotionPoints(state = this.getCurrentFigureRenderState()) {
    if (!state) {
      return;
    }

    const motionState = this.getFigureMotionState(state.renderSegments, state.scaleX);
    if (!motionState) {
      return;
    }

    const motionPoint = motionState.point;
    const pointRadius = Math.max(6, Math.min(this.canvas.width, this.canvas.height) * 0.016);

    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      const mirroredX = mirrorX ? -motionPoint.x : motionPoint.x;
      const x = state.centerX + offsetX + mirroredX * state.scaleX;
      const y = state.centerY + this.figureYPosition + motionPoint.y * state.scaleY;

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      this.ctx.strokeStyle = 'rgba(20, 28, 38, 0.55)';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      this.ctx.shadowBlur = 14;
      this.ctx.beginPath();
      this.ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  drawFigureDynamics(visible = this.figureDynamicsVisible) {
    if (!visible) {
      return;
    }

    const calibrationSet = this.getSelectedCalibrationPoseSet();
    const landmarks = this.getCalibrationLandmarksForCanvas(calibrationSet);
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return;
    }

    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const labels = ['PP', 'MP', 'MF', 'F'];
    const lineColors = [
      'rgba(188, 231, 255, 0.9)',
      'rgba(145, 214, 255, 0.78)',
      'rgba(255, 211, 135, 0.78)',
      'rgba(255, 157, 122, 0.9)'
    ];

    this.ctx.save();
    this.ctx.setLineDash([10, 8]);
    this.ctx.lineWidth = 1.8;
    this.ctx.font = '700 12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    labels.forEach((label, index) => {
      const y = shoulderY + (hipY - shoulderY) * (index / (labels.length - 1));
      this.ctx.strokeStyle = lineColors[index];
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = lineColors[index];
      this.ctx.fillText(label, 12, y - 6);
      this.ctx.setLineDash([10, 8]);
    });
    this.ctx.restore();
  }

  getFigureAnchorPoint(renderSegments, anchorIndex) {
    if (!Array.isArray(renderSegments) || renderSegments.length === 0) {
      return null;
    }

    if (anchorIndex < renderSegments.length) {
      const segment = renderSegments[anchorIndex];
      if (segment.type === 'combined' && Array.isArray(segment.segments)) {
        return segment.segments[0]?.start || null;
      }
      return segment.start || null;
    }

    const lastSegment = renderSegments[renderSegments.length - 1];
    if (lastSegment.type === 'combined' && Array.isArray(lastSegment.segments)) {
      return lastSegment.segments[lastSegment.segments.length - 1]?.end || null;
    }
    return lastSegment.end || null;
  }

  drawFigureCountTimes(state = this.getCurrentFigureRenderState()) {
    if (!this.figureCountTimesVisible || !state || state.renderSegments.length === 0) {
      return;
    }

    const plannedSegmentCount = state.renderSegments.length;
    const beatCount = Math.ceil(plannedSegmentCount / 2);
    const hardFigureCountLabels = {
      4: ['1', '2', '+', '3', '4'],
      5: ['1', '2', '+', '3', '+', '4'],
      6: ['1', '2', '+', '3', '+', '4', '+']
    };
    const labels = this.figureVariant === 'hard'
      ? hardFigureCountLabels[this.level]
        || Array.from({ length: beatCount }, (_, index) => String(index + 1))
      : Array.from({ length: beatCount }, (_, index) => String(index + 1));
    const beatSegmentStep = 2;

    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
        const anchor = this.getFigureAnchorPoint(
          state.renderSegments,
          beatIndex * beatSegmentStep
        );
        if (!anchor) {
          continue;
        }

        const anchorX = mirrorX ? -anchor.x : anchor.x;
        const x = state.centerX + offsetX + anchorX * state.scaleX;
        const y = state.centerY + this.figureYPosition + anchor.y * state.scaleY;

        this.ctx.save();
        this.ctx.font = '400 17px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = 'rgba(8, 18, 30, 0.86)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        this.ctx.lineWidth = 3;
        const label = labels[beatIndex] || String(beatIndex + 1);
        const labelX = label === '+' ? x + 8 : x;
        this.ctx.strokeText(label, labelX, y - 15);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        this.ctx.fillText(label, labelX, y - 15);
        this.ctx.restore();
      }
    });
  }

  setupLevel() {
    this.targets = [];
    this.targetIndexByCircle.clear();
    this.nextTarget = 0;
    this.completed = false;

    if (!(this.chapter === 0 && this.level === 0)) {
      this.finalizeCalibrationSnapshotCapture();
      this.calibrationSavedInCurrentHighWindow = false;
    }

    if (this.chapter === 0) {
      this.consistencyActive = false;
      this.setConsistencyPanelVisible(false);
      this.active = false;
      this.calibrationActive = this.level !== null && this.level >= 0 && this.level <= 2;
      this.calibrationAligned = false;
      this.calibrationSuccess = false;
      this.calibrationAlignedSince = 0;
      this.calibrationScore = 0;
      this.calibrationAnimationStart = performance.now();
      this.render();
      return;
    }

    if (this.chapter === 2) {
      this.active = false;
      this.calibrationActive = false;
      this.setCalibrationPanelVisible(false);
      this.consistencyActive = this.level !== null && this.level >= 0 && this.level <= 5;
      this.consistencyScoreHistory = [];
      this.consistencyAccuracy = 0;
      this.consistencyAnimationStart = performance.now();
      this.consistencyPhase = 0;
      this.consistencyLastTickMs = performance.now();
      this.setConsistencyPanelVisible(this.consistencyActive);
      this.render();
      return;
    }

    if (this.chapter === 3) {
      this.figureActive = Number.isInteger(this.level) && this.level >= 0 && this.level <= 6;
      this.figureAnimationStart = performance.now();
      this.active = false;
      this.calibrationActive = false;
      this.consistencyActive = false;
      this.setCalibrationPanelVisible(false);
      this.setConsistencyPanelVisible(false);
      this.render();
      return;
    }

    if (this.chapter === 4) {
      this.dynamicFigureActive = Number.isInteger(this.level) && this.level >= 0 && this.level <= 3;
      this.dynamicFigureCornerHeights = this.getDynamicFigureCornerHeightsForLevel(this.level);
      this.dynamicFigureAnimationStart = performance.now();
      this.active = false;
      this.figureActive = false;
      this.calibrationActive = false;
      this.consistencyActive = false;
      this.setCalibrationPanelVisible(false);
      this.setConsistencyPanelVisible(false);
      this.render();
      return;
    }

    this.figureActive = false;
    this.dynamicFigureActive = false;
    this.calibrationActive = false;
    this.setCalibrationPanelVisible(false);
    this.consistencyActive = false;
    this.setConsistencyPanelVisible(false);

    if (this.chapter !== 1 || this.level === null) {
      this.active = false;
      this.render();
      return;
    }

    // grid density increases with each level
    const gridSettings = [
      { rows: 12, cols: 16 },
      { rows: 13, cols: 17 },
      { rows: 14, cols: 18 },
      { rows: 15, cols: 19 },
      { rows: 16, cols: 20 }
    ];
    const gs = gridSettings[this.level] || gridSettings[0];
    this.gridRows = gs.rows;
    this.gridCols = gs.cols;
    this.buildGrid();

    this.active = true;

    const rows = this.gridRows;
    const cols = this.gridCols;
    const startRow = Math.max(2, Math.floor(rows * 0.16)) + 2;
    const { outerRightCol, outerLeftCol, innerRightCol, innerLeftCol } = this.getEingewoehnungColumns();

    if (this.level === 0) {
      // right-hand rectangle: down → inward → up → outward
      const col = outerRightCol;
      const targetCount = Math.floor(rows * 0.55);
      const endRow = Math.min(rows - 2, startRow + targetCount - 1);
      const hSpan = 4;
      const vUp = endRow - startRow;
      const innerCol = Math.min(cols - 1, col + hSpan);
      const topRow = Math.max(0, endRow - vUp);
      // 1. vertical down
      for (let row = startRow; row <= endRow; row += 1) {
        this.targets.push({ index: row * cols + col, hand: 'right' });
      }
      // 2. horizontal inward (toward center = increasing col in mirrored grid)
      for (let h = 1; h <= hSpan; h += 1) {
        this.targets.push({ index: endRow * cols + Math.min(cols - 1, col + h), hand: 'right' });
      }
      // 3. vertical up
      for (let v = 1; v <= vUp; v += 1) {
        this.targets.push({ index: Math.max(0, endRow - v) * cols + innerCol, hand: 'right' });
      }
      // 4. horizontal outward (back toward original col = decreasing col, stop 1 short to avoid duplicate)
      for (let h = hSpan - 1; h >= 1; h -= 1) {
        this.targets.push({ index: topRow * cols + Math.min(cols - 1, col + h), hand: 'right' });
      }
    } else if (this.level === 1) {
      // left-hand rectangle: down → inward → up → outward
      const col = outerLeftCol;
      const targetCount = Math.floor(rows * 0.55);
      const endRow = Math.min(rows - 2, startRow + targetCount - 1);
      const hSpan = 4;
      const vUp = endRow - startRow;
      const innerCol = Math.max(0, col - hSpan);
      const topRow = Math.max(0, endRow - vUp);
      // 1. vertical down
      for (let row = startRow; row <= endRow; row += 1) {
        this.targets.push({ index: row * cols + col, hand: 'left' });
      }
      // 2. horizontal inward (toward center = decreasing col in mirrored grid)
      for (let h = 1; h <= hSpan; h += 1) {
        this.targets.push({ index: endRow * cols + Math.max(0, col - h), hand: 'left' });
      }
      // 3. vertical up
      for (let v = 1; v <= vUp; v += 1) {
        this.targets.push({ index: Math.max(0, endRow - v) * cols + innerCol, hand: 'left' });
      }
      // 4. horizontal outward (back toward original col = increasing col, stop 1 short to avoid duplicate)
      for (let h = hSpan - 1; h >= 1; h -= 1) {
        this.targets.push({ index: topRow * cols + Math.max(0, col - h), hand: 'left' });
      }
    } else if (this.level === 2) {
      // both sides symmetric
      const leftCol = outerLeftCol;
      const rightCol = outerRightCol;
      const targetCount = Math.floor(rows * 0.5);
      const endRow = Math.min(rows - 1, startRow + targetCount - 1);
      for (let row = startRow; row <= endRow; row += 1) {
        this.targets.push({ leftIndex: row * cols + leftCol, rightIndex: row * cols + rightCol, hand: 'both' });
      }
    } else if (this.level === 3) {
      // asynchronous alternating path
      const halfRows = Math.floor(rows * 0.55);
      for (let i = 0; i < halfRows; i += 1) {
        const row = startRow + i;
        if (row >= rows) {
          break;
        }
        const isRight = i % 2 === 0;
        const col = isRight ? outerRightCol : outerLeftCol;
        const index = row * cols + col;
        this.targets.push({ index, hand: isRight ? 'right' : 'left' });
      }
    } else if (this.level === 4) {
      // parallel vertical lines: both hands descend on inner columns derived from the same wrist reference
      const rightCol = innerRightCol;
      const leftCol = innerLeftCol;
      for (let row = startRow; row < rows - 1; row += 1) {
        this.targets.push({
          leftIndex: row * cols + leftCol,
          rightIndex: row * cols + rightCol,
          hand: 'both'
        });
      }
    }

    this.rebuildTargetIndexLookup();
    this.render();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getTargetBubbleColors(target, circleIndex, isCurrentTarget, isCompletedTarget) {
    const side = target.hand === 'both'
      ? (circleIndex === target.leftIndex ? 'left' : 'right')
      : target.hand;

    const palettes = {
      left: {
        pending: 'rgba(117, 165, 255, 0.28)',
        current: 'rgba(86, 150, 255, 0.82)',
        completed: 'rgba(150, 196, 255, 0.5)',
        currentStroke: 'rgba(223, 236, 255, 0.95)'
      },
      right: {
        pending: 'rgba(255, 168, 112, 0.3)',
        current: 'rgba(255, 144, 76, 0.84)',
        completed: 'rgba(255, 196, 148, 0.52)',
        currentStroke: 'rgba(255, 236, 219, 0.95)'
      }
    };

    const palette = palettes[side] || palettes.right;

    if (isCompletedTarget) {
      return {
        fill: palette.completed,
        stroke: 'rgba(255, 255, 255, 0.2)'
      };
    }

    if (isCurrentTarget) {
      return {
        fill: palette.current,
        stroke: palette.currentStroke
      };
    }

    return {
      fill: palette.pending,
      stroke: 'rgba(255, 255, 255, 0.16)'
    };
  }

  drawPoseAlignmentLed(status) {
    const now = performance.now();
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.01);
    const radius = 10 + pulse * 2;
    const ledX = 28;
    const ledY = 28;
    const score = status && status.available ? Math.max(0, Math.min(1, status.score || 0)) : 0;
    const scorePercent = Math.round(score * 100);
    const legend = !status || !status.available
      ? 'Pose N/A'
      : status.aligned
        ? 'Pose OK'
        : 'Pose Warnung';
    let color = 'rgba(146, 165, 180, 0.8)';

    if (status && status.available) {
      color = status.aligned
        ? `rgba(94, 255, 141, ${0.78 + pulse * 0.22})`
        : `rgba(255, 106, 106, ${0.78 + pulse * 0.22})`;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = color;
    this.ctx.arc(ledX, ledY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.lineWidth = 2.4;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    this.ctx.arc(ledX, ledY, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * score);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    this.ctx.arc(ledX, ledY, radius + 4, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.font = '700 11px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = 'rgba(243, 250, 255, 0.96)';
    const scoreLabel = status && status.available ? `${scorePercent}%` : '--';
    this.ctx.fillText(`${legend}  ${scoreLabel}`, ledX + radius + 14, ledY);
    this.ctx.restore();
  }

  drawPoseAlignmentWarning(status) {
    if (this.calibrationActive && this.level === 0) {
      this.setPoseAlignmentPanelVisible(false);
      return;
    }

    if (!status || !status.available || status.aligned) {
      this.setPoseAlignmentPanelVisible(false);
      return;
    }

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 128, 128, 0.95)';
    this.ctx.lineWidth = 2.4;
    this.ctx.setLineDash([9, 6]);

    const warningRects = [status.headRect, status.shoulderRect, status.hipRect];
    warningRects.forEach((rect) => {
      if (!rect) return;
      this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });

    this.ctx.setLineDash([]);
    this.ctx.strokeStyle = 'rgba(255, 186, 112, 0.94)';
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width * 0.5, 0);
    this.ctx.lineTo(this.canvas.width * 0.5, this.canvas.height);
    this.ctx.stroke();

    const calibrationSet = this.getSelectedCalibrationPoseSet();
    const calibrationLandmarks = this.getCalibrationLandmarksForCanvas(calibrationSet);
    if (this.poseWarningLandmarksVisible && calibrationLandmarks.length > 0) {
      this.ctx.fillStyle = 'rgba(255, 88, 88, 0.95)';
      const landmarkIndices = [2, 5, 11, 12, 15, 16, 23, 24];
      landmarkIndices.forEach((index) => {
        const landmark = calibrationLandmarks[index];
        if (!landmark) return;
        this.ctx.beginPath();
        this.ctx.arc(landmark.x, landmark.y, 5.5, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    this.ctx.restore();

    this.updatePoseAlignmentPanelPosition();
    this.updatePoseAlignmentPanelContent(status);
    this.setPoseAlignmentPanelVisible(true);
  }

  renderPoseAlignmentFeedback() {
    if (this.calibrationActive && this.level === 0) {
      const status = this.poseAlignmentStatus;
      this.drawPoseAlignmentLed(status);
      this.drawPoseAlignmentWarning(status);
      return;
    }

    const inPlayableLevel = (
      this.calibrationActive && (this.level === 1 || this.level === 2)
    ) || (
      (this.chapter === 3 && this.figureActive)
      || (this.chapter === 4 && this.dynamicFigureActive)
    ) || (
      !this.calibrationActive && (this.active || this.consistencyActive)
    );

    if (!inPlayableLevel) {
      this.setPoseAlignmentPanelVisible(false);
      return;
    }

    const status = this.poseAlignmentStatus;
    this.drawPoseAlignmentLed(status);
    this.drawPoseAlignmentWarning(status);
  }

  render() {
    if (!this.canvas.width || !this.canvas.height) {
      return;
    }
    this.clear();

    if (this.calibrationActive) {
      this.setCalibrationPanelVisible(true);
      this.setConsistencyPanelVisible(false);
      this.renderCalibration();
      this.renderPoseAlignmentFeedback();
      return;
    }

    this.setCalibrationPanelVisible(false);

    if (this.consistencyActive) {
      this.setConsistencyPanelVisible(true);
      this.renderConsistency();
      this.renderPoseAlignmentFeedback();
      return;
    }

    this.setConsistencyPanelVisible(false);

    if (this.chapter === 3 && Number.isInteger(this.level) && this.level >= 0 && this.level <= 6) {
      const figureState = this.getCurrentFigureRenderState();
      this.drawFigureDynamics();
      this.drawFigurePath(figureState);
      this.drawFigureCountTimes(figureState);
      this.drawFigureMotionPoints(figureState);
      this.renderPoseAlignmentFeedback();
      this.requestRender();
      return;
    }

    if (this.chapter === 4 && Number.isInteger(this.level) && this.level >= 0 && this.level <= 3) {
      const dynamicFigureState = this.getCurrentDynamicFigureRenderState();
      if (this.dynamicFigureDynamicsVisible) {
        this.drawFigureDynamics(this.dynamicFigureDynamicsVisible);
      }
      this.drawFigurePath(dynamicFigureState, {
        variant: this.dynamicFigureVariant,
        yPosition: this.dynamicFigureYPosition
      });
      this.drawDynamicFigureCountTimes(dynamicFigureState);
      this.drawDynamicFigureMotionPoints(dynamicFigureState);
      this.renderPoseAlignmentFeedback();
      this.requestRender();
      return;
    }

    if (!this.active) {
      this.setPoseAlignmentPanelVisible(false);
      return;
    }

    // draw grid
    for (let i = 0; i < this.grid.length; i += 1) {
      const circle = this.grid[i];
      const scale = this.circleScales[i];
      const radiusX = circle.radiusX * scale;
      const radiusY = circle.radiusY * scale;
      let fill = 'rgba(255, 255, 255, 0.08)';
      let stroke = 'rgba(255, 255, 255, 0.16)';

      // check if target
      const targetIndex = this.targetIndexByCircle.has(i) ? this.targetIndexByCircle.get(i) : -1;
      if (targetIndex !== -1) {
        const t = this.targets[targetIndex];
        const targetColors = this.getTargetBubbleColors(
          t,
          i,
          targetIndex === this.nextTarget,
          targetIndex < this.nextTarget
        );
        fill = targetColors.fill;
        stroke = targetColors.stroke;
      }

      this.ctx.beginPath();
  this.ctx.ellipse(circle.x, circle.y, radiusX, radiusY, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = fill;
      this.ctx.fill();
      this.ctx.strokeStyle = stroke;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    if (this.completed) {
      this.ctx.fillStyle = 'rgba(30, 170, 110, 0.9)';
      this.ctx.font = 'bold 18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Level completed!', this.canvas.width / 2, this.canvas.height * 0.1);
    }

    this.renderPoseAlignmentFeedback();
  }

  updatePose(poseLandmarks) {
    this.poseLandmarks = poseLandmarks || [];

    this.poseAlignmentStatus = this.evaluatePoseAlignmentAgainstCalibration();

    if (!this.calibrationActive) {
      this.finalizeCalibrationSnapshotCapture();
      if (this.active || this.consistencyActive) {
        this.requestRender();
      }
      return;
    }

    if (this.level === 0) {
      this.evaluateCalibration();
    }
    this.requestRender();
  }

  getVisiblePoint(index, minVisibility = 0.35) {
    const point = this.poseLandmarks[index];
    if (!point) {
      return null;
    }

    if (typeof point.visibility === 'number' && point.visibility < minVisibility) {
      return null;
    }

    return point;
  }

  averagePoints(a, b) {
    if (!a || !b) {
      return null;
    }

    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }

  scoreByDistance(value, target, tolerance) {
    return Math.max(0, 1 - Math.abs(value - target) / tolerance);
  }

  isPointInRect(point, rect) {
    if (!point || !rect) {
      return false;
    }

    return point.x >= rect.x
      && point.x <= rect.x + rect.width
      && point.y >= rect.y
      && point.y <= rect.y + rect.height;
  }

  isSegmentInRect(a, b, rect) {
    return this.isPointInRect(a, rect) && this.isPointInRect(b, rect);
  }

  scoreSegmentInRect(a, b, rect) {
    if (!a || !b || !rect) {
      return 0;
    }

    const insideCount = Number(this.isPointInRect(a, rect)) + Number(this.isPointInRect(b, rect));
    return insideCount / 2;
  }

  isPointInCircle(point, center, radius) {
    if (!point || !center || !Number.isFinite(radius) || radius <= 0) {
      return false;
    }

    return this.distance(point, center) <= radius;
  }

  scorePointInCircle(point, center, radius) {
    if (!point || !center || !Number.isFinite(radius) || radius <= 0) {
      return 0;
    }

    const d = this.distance(point, center);
    if (d <= radius) {
      return 1;
    }

    return Math.max(0, 1 - (d - radius) / radius);
  }

  angleBetweenVectors(a, b) {
    if (!a || !b) {
      return 0;
    }

    const dot = a.x * b.x + a.y * b.y;
    const lenA = Math.hypot(a.x, a.y);
    const lenB = Math.hypot(b.x, b.y);
    if (lenA <= 0 || lenB <= 0) {
      return 0;
    }

    const cosine = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
    return Math.acos(cosine) * 180 / Math.PI;
  }

  evaluateCalibration() {
    const leftEye = this.getVisiblePoint(2) || this.getVisiblePoint(1);
    const rightEye = this.getVisiblePoint(5) || this.getVisiblePoint(4);
    const leftShoulder = this.getVisiblePoint(11);
    const rightShoulder = this.getVisiblePoint(12);
    const leftElbow = this.getVisiblePoint(13);
    const rightElbow = this.getVisiblePoint(14);
    const leftHip = this.getVisiblePoint(23);
    const rightHip = this.getVisiblePoint(24);
    const leftWrist = this.getVisiblePoint(15);
    const rightWrist = this.getVisiblePoint(16);
    const leftHandRefA = this.getVisiblePoint(17);
    const leftHandRefB = this.getVisiblePoint(19);
    const rightHandRefA = this.getVisiblePoint(18);
    const rightHandRefB = this.getVisiblePoint(20);
    const leftHandCenter = this.averagePoints(leftHandRefA, leftHandRefB) || leftWrist;
    const rightHandCenter = this.averagePoints(rightHandRefA, rightHandRefB) || rightWrist;

    const eyeCenter = this.averagePoints(leftEye, rightEye);
    const hipCenter = this.averagePoints(leftHip, rightHip);
    const shoulderCenter = this.averagePoints(leftShoulder, rightShoulder);

    if (!eyeCenter || !hipCenter || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      this.calibrationMetrics = {
        leftEye,
        rightEye,
        leftShoulder,
        rightShoulder,
        leftHip,
        rightHip,
        leftWrist,
        rightWrist,
        leftHandCenter,
        rightHandCenter,
        eyeCenter,
        hipCenter,
        shoulderCenter,
        bodyAligned: false,
        armAligned: false,
        leftGuide: null,
        rightGuide: null,
        headRect: null,
        shoulderRect: null,
        hipRect: null
      };
      this.calibrationScore = 0;
      this.calibrationAligned = false;
      if (!this.calibrationSuccess) {
        this.calibrationAlignedSince = 0;
      }
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const shoulderSpan = this.distance(leftShoulder, rightShoulder);
    const hipSpan = this.distance(leftHip, rightHip);
    const headSpan = this.distance(leftEye, rightEye);
    const bodyCenterX = (eyeCenter.x + shoulderCenter.x + hipCenter.x) / 3;
    const centerScore = this.scoreByDistance(bodyCenterX, centerX, w * 0.1);

    const headRect = this.createRectFromPair(
      leftEye,
      rightEye,
      Math.max(18, headSpan * 0.28),
      Math.max(12, headSpan / 12)
    );
    const shoulderRect = this.createRectFromPair(
      leftShoulder,
      rightShoulder,
      Math.max(22, shoulderSpan * 0.26),
      Math.max(12, shoulderSpan / 12)
    );
    const hipRect = this.createRectFromPair(
      leftHip,
      rightHip,
      Math.max(24, hipSpan * 0.26),
      Math.max(14, hipSpan / 12)
    );

    const headScore = this.scoreSegmentInRect(leftEye, rightEye, headRect);
    const hipScore = this.scoreSegmentInRect(leftHip, rightHip, hipRect);

    const eyeZone = {
      x: centerX - w * 0.18,
      y: Math.max(8, h * 0.04),
      width: w * 0.36,
      height: Math.max(28, h * 0.12)
    };
    const hipZone = {
      x: centerX - w * 0.2,
      y: Math.min(h - 40, Math.max(h * 0.68, hipCenter.y - h * 0.08)),
      width: w * 0.4,
      height: Math.max(36, h * 0.12)
    };

    const bodyScore = (
      centerScore * 0.35
      + this.scoreSegmentInRect(leftEye, rightEye, eyeZone) * 0.35
      + this.scoreSegmentInRect(leftHip, rightHip, hipZone) * 0.3
    );

    const bodyAligned = bodyScore >= 0.78
      && this.scoreSegmentInRect(leftEye, rightEye, eyeZone) >= 0.8
      && this.scoreSegmentInRect(leftHip, rightHip, hipZone) >= 0.8
      && centerScore >= 0.8;

    const leftArmSpreadVector = leftShoulder && leftElbow ? {
      x: leftElbow.x - leftShoulder.x,
      y: leftElbow.y - leftShoulder.y
    } : null;
    const rightArmSpreadVector = rightShoulder && rightElbow ? {
      x: rightElbow.x - rightShoulder.x,
      y: rightElbow.y - rightShoulder.y
    } : null;
    const verticalVector = { x: 0, y: 1 };

    const getSideArmMetrics = (shoulder, elbow, wrist, spreadVector) => {
      if (!shoulder || !elbow || !wrist || !spreadVector) {
        return { angle: 0, elbowAngle: 0, score: 0, shoulderAngle: 0 };
      }

      const shoulderAngle = this.angleBetweenVectors(spreadVector, verticalVector);
      const upperArm = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
      const forearm = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
      const elbowAngle = this.angleBetweenVectors(upperArm, forearm);
      const spreadScore = 1 - Math.min(1, Math.abs(shoulderAngle - 45) / 28);
      const elbowScore = 1 - Math.min(1, Math.abs(elbowAngle - 180) / 42);
      return {
        angle: shoulderAngle,
        elbowAngle,
        shoulderAngle,
        score: (spreadScore * 0.6 + elbowScore * 0.4)
      };
    };

    const leftArmMetrics = getSideArmMetrics(leftShoulder, leftElbow, leftWrist, leftArmSpreadVector);
    const rightArmMetrics = getSideArmMetrics(rightShoulder, rightElbow, rightWrist, rightArmSpreadVector);
    const leftArmScore = leftArmMetrics.score;
    const rightArmScore = rightArmMetrics.score;
    const armScore = bodyAligned
      ? ((leftArmScore + rightArmScore) / 2) || 0
      : 0;
    const finalScore = bodyScore * 0.75 + armScore * 0.25;
    const armAligned = bodyAligned
      && leftArmScore >= 0.72
      && rightArmScore >= 0.72
      && Math.abs(leftArmMetrics.angle - 45) <= 18
      && Math.abs(rightArmMetrics.angle - 45) <= 18
      && Math.abs(leftArmMetrics.elbowAngle - 180) <= 30
      && Math.abs(rightArmMetrics.elbowAngle - 180) <= 30;

    this.calibrationMetrics = {
      leftEye,
      rightEye,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftHip,
      rightHip,
      leftWrist,
      rightWrist,
      leftHandCenter,
      rightHandCenter,
      eyeCenter,
      hipCenter,
      shoulderCenter,
      leftShoulderAngle: leftArmMetrics.angle,
      rightShoulderAngle: rightArmMetrics.angle,
      leftElbowAngle: leftArmMetrics.elbowAngle,
      rightElbowAngle: rightArmMetrics.elbowAngle,
      bodyAligned,
      armAligned,
      leftGuide: bodyAligned && leftShoulder ? {
        start: leftShoulder,
        end: { x: leftShoulder.x - 120, y: leftShoulder.y + 120 }
      } : null,
      rightGuide: bodyAligned && rightShoulder ? {
        start: rightShoulder,
        end: { x: rightShoulder.x + 120, y: rightShoulder.y + 120 }
      } : null,
      headRect,
      shoulderRect,
      hipRect,
      bodyScore,
      armScore,
      score: finalScore
    };

    const wasAligned = this.calibrationAligned;
    const hadSavedSuccess = this.calibrationSuccess;
    this.calibrationScore = finalScore;
    this.calibrationAligned = bodyAligned && armAligned;

    if (this.calibrationAligned) {
      const isFreshReentry = hadSavedSuccess && !wasAligned;
      if (isFreshReentry) {
        this.calibrationAlignedSince = performance.now();
        this.calibrationSuccess = false;
        this.calibrationSavedInCurrentHighWindow = false;
        this.calibrationSaveFeedbackText = '';
        this.calibrationSaveFeedbackUntilMs = 0;
      }

      if (!this.calibrationAlignedSince || isFreshReentry) {
        this.calibrationAlignedSince = performance.now();
      }

      if (!this.calibrationSuccess && performance.now() - this.calibrationAlignedSince >= 3000) {
        this.calibrationSuccess = true;
      }
    } else {
      this.calibrationAlignedSince = 0;
      this.calibrationSuccess = hadSavedSuccess ? true : false;
    }

    this.updateCalibrationSnapshotCapture();
  }

  renderUpperBodyCalibration() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const eyeZoneWidth = w * 0.36;
    const shoulderZoneWidth = w * 0.44;
    const hipZoneWidth = w * 0.4;
    const eyeZone = {
      x: centerX - eyeZoneWidth / 2,
      y: Math.max(8, h * 0.04),
      width: eyeZoneWidth,
      height: Math.max(24, eyeZoneWidth / 6)
    };
    const shoulderZone = this.calibrationMetrics?.shoulderRect || {
      x: centerX - shoulderZoneWidth / 2,
      y: Math.max(12, (this.calibrationMetrics?.shoulderCenter?.y ?? h * 0.26) - shoulderZoneWidth / 12),
      width: shoulderZoneWidth,
      height: Math.max(28, shoulderZoneWidth / 6)
    };
    const hipTargetRect = {
      x: centerX - hipZoneWidth / 2,
      y: h * 0.8,
      width: hipZoneWidth,
      height: Math.max(30, hipZoneWidth / 6)
    };
    const hipZone = {
      x: centerX - hipZoneWidth / 2,
      y: Math.min(h - 40, Math.max(h * 0.64, (this.calibrationMetrics?.hipCenter?.y ?? h * 0.72) - hipZoneWidth / 12)),
      width: hipZoneWidth,
      height: Math.max(30, hipZoneWidth / 6)
    };

    const bodyAlignedPreview = !!this.calibrationMetrics && this.calibrationMetrics.bodyAligned;
    const hipGuideVisible = bodyAlignedPreview && !!this.calibrationMetrics && !!this.calibrationMetrics.hipRect;
    const leftEyeRef = this.calibrationMetrics?.leftEye || null;
    const rightEyeRef = this.calibrationMetrics?.rightEye || null;
    const leftHipRef = this.calibrationMetrics?.leftHip || null;
    const rightHipRef = this.calibrationMetrics?.rightHip || null;

    const drawLargePrompt = (text, rect, color) => {
      if (!rect) return;
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.font = '700 24px Arial';
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = 'rgba(7, 14, 22, 0.82)';
      this.ctx.fillStyle = color;
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2 + 2;
      this.ctx.strokeText(text, x, y);
      this.ctx.fillText(text, x, y);
      this.ctx.restore();
    };

    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(6, 14, 27, 0.16)');
    bgGradient.addColorStop(1, 'rgba(8, 20, 36, 0.28)');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.shadowBlur = 16;
    this.ctx.shadowColor = 'rgba(119, 252, 232, 0.7)';
    this.ctx.strokeStyle = 'rgba(119, 252, 232, 0.95)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([14, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, h * 0.06);
    this.ctx.lineTo(centerX, h * 0.94);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.strokeStyle = 'rgba(255, 111, 145, 0.95)';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(255, 111, 145, 0.2)';
    this.ctx.fillRect(eyeZone.x, eyeZone.y, eyeZone.width, eyeZone.height);
    this.ctx.strokeRect(eyeZone.x, eyeZone.y, eyeZone.width, eyeZone.height);

    if (bodyAlignedPreview && this.calibrationMetrics?.shoulderRect) {
      this.ctx.strokeStyle = 'rgba(255, 154, 102, 0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = 'rgba(255, 154, 102, 0.12)';
      this.ctx.fillRect(shoulderZone.x, shoulderZone.y, shoulderZone.width, shoulderZone.height);
      this.ctx.strokeRect(shoulderZone.x, shoulderZone.y, shoulderZone.width, shoulderZone.height);
    }

    if (!bodyAlignedPreview && leftHipRef && rightHipRef) {
      this.ctx.strokeStyle = 'rgba(255, 120, 143, 0.95)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([10, 8]);
      this.ctx.fillStyle = 'rgba(255, 120, 143, 0.08)';
      this.ctx.fillRect(hipTargetRect.x, hipTargetRect.y, hipTargetRect.width, hipTargetRect.height);
      this.ctx.strokeRect(hipTargetRect.x, hipTargetRect.y, hipTargetRect.width, hipTargetRect.height);
      this.ctx.setLineDash([]);
      drawLargePrompt('HÜFTE', hipTargetRect, 'rgba(255, 232, 236, 0.98)');
    }

    if (hipGuideVisible) {
      this.ctx.strokeStyle = 'rgba(95, 255, 188, 0.95)';
      this.ctx.lineWidth = 2;
      this.ctx.fillStyle = 'rgba(95, 255, 188, 0.2)';
      this.ctx.fillRect(hipZone.x, hipZone.y, hipZone.width, hipZone.height);
      this.ctx.strokeRect(hipZone.x, hipZone.y, hipZone.width, hipZone.height);
    }
    this.ctx.restore();

    if (this.calibrationMetrics) {
      const {
        leftEye,
        rightEye,
        leftShoulder,
        rightShoulder,
        leftHip,
        rightHip,
        leftElbow,
        rightElbow,
        leftWrist,
        rightWrist,
        eyeCenter,
        hipCenter,
        shoulderCenter,
        headRect,
        shoulderRect,
        hipRect,
        leftGuide,
        rightGuide,
        bodyAligned,
        armAligned,
        leftShoulderAngle,
        rightShoulderAngle,
        leftElbowAngle,
        rightElbowAngle
      } = this.calibrationMetrics;

      this.ctx.save();
      this.ctx.setLineDash([9, 6]);
      this.ctx.lineWidth = 2.2;
      this.ctx.strokeStyle = bodyAligned ? 'rgba(99, 224, 149, 0.95)' : 'rgba(255, 106, 137, 0.95)';
      if (headRect) {
        this.ctx.strokeRect(headRect.x, headRect.y, headRect.width, headRect.height);
      }
      if (bodyAligned && shoulderRect) {
        this.ctx.strokeRect(shoulderRect.x, shoulderRect.y, shoulderRect.width, shoulderRect.height);
      }
      this.ctx.restore();

      if (leftEyeRef && rightEyeRef && !this.isSegmentInRect(leftEyeRef, rightEyeRef, eyeZone)) {
        drawLargePrompt('AUGEN', eyeZone, 'rgba(255, 241, 244, 0.98)');
      }

      this.ctx.strokeStyle = 'rgba(95, 196, 255, 0.86)';
      this.ctx.lineWidth = 2.5;

      if (leftEye && rightEye) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.isSegmentInRect(leftEye, rightEye, eyeZone)
          ? 'rgba(99, 224, 149, 0.95)'
          : 'rgba(255, 106, 137, 0.95)';
        this.ctx.moveTo(leftEye.x, leftEye.y);
        this.ctx.lineTo(rightEye.x, rightEye.y);
        this.ctx.stroke();
      }

      if (bodyAligned && leftShoulder && rightShoulder) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.isSegmentInRect(leftShoulder, rightShoulder, shoulderZone)
          ? 'rgba(99, 224, 149, 0.95)'
          : 'rgba(255, 106, 137, 0.95)';
        this.ctx.moveTo(leftShoulder.x, leftShoulder.y);
        this.ctx.lineTo(rightShoulder.x, rightShoulder.y);
        this.ctx.stroke();
      }

      if (leftHip && rightHip) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.isSegmentInRect(leftHip, rightHip, hipZone)
          ? 'rgba(99, 224, 149, 0.95)'
          : 'rgba(255, 106, 137, 0.95)';
        this.ctx.moveTo(leftHip.x, leftHip.y);
        this.ctx.lineTo(rightHip.x, rightHip.y);
        this.ctx.stroke();
      }

      if (eyeCenter && hipCenter && shoulderCenter) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = bodyAligned ? 'rgba(99, 224, 149, 0.95)' : 'rgba(255, 154, 102, 0.95)';
        this.ctx.moveTo(eyeCenter.x, eyeCenter.y);
        this.ctx.lineTo(shoulderCenter.x, shoulderCenter.y);
        this.ctx.lineTo(hipCenter.x, hipCenter.y);
        this.ctx.stroke();
      }

      const drawAngleReadout = (center, radius, actual, target, label, color, offsetX = 0, offsetY = 0) => {
        const actualRadians = Math.max(0.15, Math.min((actual / 180) * Math.PI, Math.PI * 0.92));
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, -Math.PI / 2, -Math.PI / 2 + actualRadians);
        this.ctx.stroke();

        this.ctx.fillStyle = 'rgba(240, 248, 255, 0.98)';
        this.ctx.font = '700 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${label}: ${Math.round(actual)}°`, center.x + offsetX, center.y + offsetY - radius - 20);
        this.ctx.font = '700 15px Arial';
        this.ctx.fillText(`Soll ${target}°`, center.x + offsetX, center.y + offsetY - radius - 4);
        this.ctx.restore();
      };

      if (bodyAligned && leftShoulder && leftElbow && Number.isFinite(leftShoulderAngle)) {
        const leftShoulderOk = Math.abs(leftShoulderAngle - 45) <= 18;
        const leftElbowOk = Math.abs(leftElbowAngle - 180) <= 30;
        drawAngleReadout(leftShoulder, 46, leftShoulderAngle, 45, 'Schulter', leftShoulderOk ? 'rgba(104,255,167,0.95)' : 'rgba(255,188,89,0.96)', -30, 10);
        drawAngleReadout(leftElbow, 34, leftElbowAngle, 180, 'Ellenbogen', leftElbowOk ? 'rgba(104,255,167,0.95)' : 'rgba(255,188,89,0.96)', 40, 12);
      }

      if (bodyAligned && rightShoulder && rightElbow && Number.isFinite(rightShoulderAngle)) {
        const rightShoulderOk = Math.abs(rightShoulderAngle - 45) <= 18;
        const rightElbowOk = Math.abs(rightElbowAngle - 180) <= 30;
        drawAngleReadout(rightShoulder, 46, rightShoulderAngle, 45, 'Schulter', rightShoulderOk ? 'rgba(104,255,167,0.95)' : 'rgba(255,188,89,0.96)', 26, 12);
        drawAngleReadout(rightElbow, 34, rightElbowAngle, 180, 'Ellenbogen', rightElbowOk ? 'rgba(104,255,167,0.95)' : 'rgba(255,188,89,0.96)', -36, 10);
      }

      if (bodyAligned && (leftGuide || rightGuide)) {
        this.ctx.save();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = armAligned ? 'rgba(104, 255, 167, 0.95)' : 'rgba(255, 188, 89, 0.96)';
        [
          { guide: leftGuide },
          { guide: rightGuide }
        ].forEach(({ guide }) => {
          if (!guide) return;
          this.ctx.beginPath();
          this.ctx.moveTo(guide.start.x, guide.start.y);
          this.ctx.lineTo(guide.end.x, guide.end.y);
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.fillStyle = armAligned ? 'rgba(104, 255, 167, 0.95)' : 'rgba(255, 188, 89, 0.96)';
          this.ctx.arc(guide.end.x, guide.end.y, 6, 0, Math.PI * 2);
          this.ctx.fill();
        });
        this.ctx.restore();
      }
    }

    this.updateCalibrationPanelPosition();
    this.updateCalibrationPanelContent();
  }

  renderCalibration() {
    if (this.level === 0) {
      this.renderUpperBodyCalibration();
      return;
    }

    if (this.level === 1 || this.level === 2) {
      if (this.level === 1) {
        this.renderCalibrationMotion(1, 1, false, 0.0001, 'wrist');
      } else {
        this.renderCalibrationMotion(0.6, 0.6, true, 0.0002, 'shoulder');
      }
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const eyeTargetY = h * 0.11;
    const hipTargetY = h * 0.9;
    const eyeZone = {
      x: centerX - w * 0.18,
      y: 0,
      width: w * 0.36,
      height: h * 0.155
    };
    const hipZone = {
      x: centerX - w * 0.2,
      y: hipTargetY - h * 0.04,
      width: w * 0.4,
      height: h * 0.14
    };
    const wristY = h * 0.88;
    const wristOffset = w * 0.35;
    const leftTargetWrist = { x: centerX - wristOffset, y: wristY };
    const rightTargetWrist = { x: centerX + wristOffset, y: wristY };
    const triangleApex = { x: centerX, y: h * 0.38 };
    const wristTargetRadius = Math.max(26, Math.min(56, Math.min(w, h) * 0.08));

    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(6, 14, 27, 0.16)');
    bgGradient.addColorStop(1, 'rgba(8, 20, 36, 0.28)');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.shadowBlur = 16;
    this.ctx.shadowColor = 'rgba(119, 252, 232, 0.7)';
    this.ctx.strokeStyle = 'rgba(119, 252, 232, 0.95)';
    this.ctx.lineWidth = 4;
    this.ctx.setLineDash([14, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, h * 0.06);
    this.ctx.lineTo(centerX, h * 0.94);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.strokeStyle = 'rgba(255, 111, 145, 0.95)';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(255, 111, 145, 0.2)';
    this.ctx.fillRect(eyeZone.x, eyeZone.y, eyeZone.width, eyeZone.height);
    this.ctx.strokeRect(eyeZone.x, eyeZone.y, eyeZone.width, eyeZone.height);

    this.ctx.strokeStyle = 'rgba(95, 255, 188, 0.95)';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(95, 255, 188, 0.2)';
    this.ctx.fillRect(hipZone.x, hipZone.y, hipZone.width, hipZone.height);
    this.ctx.strokeRect(hipZone.x, hipZone.y, hipZone.width, hipZone.height);

    this.ctx.strokeStyle = 'rgba(255, 188, 89, 0.96)';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(leftTargetWrist.x, leftTargetWrist.y);
    this.ctx.lineTo(triangleApex.x, triangleApex.y);
    this.ctx.lineTo(rightTargetWrist.x, rightTargetWrist.y);
    this.ctx.closePath();
    this.ctx.stroke();

    // Wrist base targets: circular zones at the lower corners of the triangle.
    this.ctx.fillStyle = 'rgba(255, 188, 89, 0.2)';
    this.ctx.strokeStyle = 'rgba(255, 213, 143, 0.96)';
    this.ctx.lineWidth = 3;
    [leftTargetWrist, rightTargetWrist].forEach((target) => {
      this.ctx.beginPath();
      this.ctx.arc(target.x, target.y, wristTargetRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });
    this.ctx.restore();

    if (this.calibrationMetrics) {
      const {
        leftEye,
        rightEye,
        leftHip,
        rightHip,
        leftWrist,
        rightWrist,
        leftHandRefA,
        leftHandRefB,
        rightHandRefA,
        rightHandRefB,
        leftHandCenter,
        rightHandCenter,
        eyeCenter,
        hipCenter
      } = this.calibrationMetrics;

      this.ctx.strokeStyle = 'rgba(95, 196, 255, 0.86)';
      this.ctx.lineWidth = 2.5;

      if (leftEye && rightEye) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.isSegmentInRect(leftEye, rightEye, eyeZone)
          ? 'rgba(99, 224, 149, 0.95)'
          : 'rgba(255, 106, 137, 0.95)';
        this.ctx.moveTo(leftEye.x, leftEye.y);
        this.ctx.lineTo(rightEye.x, rightEye.y);
        this.ctx.stroke();
      }

      if (leftHip && rightHip) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.isSegmentInRect(leftHip, rightHip, hipZone)
          ? 'rgba(99, 224, 149, 0.95)'
          : 'rgba(255, 106, 137, 0.95)';
        this.ctx.moveTo(leftHip.x, leftHip.y);
        this.ctx.lineTo(rightHip.x, rightHip.y);
        this.ctx.stroke();
      }

      this.ctx.strokeStyle = 'rgba(95, 196, 255, 0.86)';

      if (eyeCenter && hipCenter) {
        this.ctx.beginPath();
        this.ctx.moveTo(eyeCenter.x, eyeCenter.y);
        this.ctx.lineTo(hipCenter.x, hipCenter.y);
        this.ctx.stroke();
      }

      if (leftWrist && rightWrist && hipCenter) {
        const liveApex = eyeCenter
          ? {
              x: (eyeCenter.x + hipCenter.x) / 2,
              y: eyeCenter.y + (hipCenter.y - eyeCenter.y) * 0.34
            }
          : null;
        this.ctx.beginPath();
        this.ctx.moveTo(leftWrist.x, leftWrist.y);
        if (liveApex) {
          this.ctx.lineTo(liveApex.x, liveApex.y);
        }
        this.ctx.lineTo(rightWrist.x, rightWrist.y);
        this.ctx.stroke();
      }

      if (leftHandCenter && rightHandCenter) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(180, 225, 255, 0.7)';
        this.ctx.setLineDash([7, 5]);
        this.ctx.moveTo(leftHandCenter.x, leftHandCenter.y);
        this.ctx.lineTo(rightHandCenter.x, rightHandCenter.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      const points = [
        leftEye,
        rightEye,
        leftHip,
        rightHip,
        leftWrist,
        rightWrist,
        leftHandRefA,
        leftHandRefB,
        rightHandRefA,
        rightHandRefB
      ];
      this.ctx.fillStyle = 'rgba(95, 196, 255, 0.9)';
      points.forEach((point) => {
        if (!point) return;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
      });

      [
        { point: leftHandCenter, target: leftTargetWrist },
        { point: rightHandCenter, target: rightTargetWrist }
      ].forEach(({ point, target }) => {
        if (!point) {
          return;
        }

        const inCircle = this.isPointInCircle(point, target, wristTargetRadius);
        this.ctx.beginPath();
        this.ctx.fillStyle = inCircle ? 'rgba(104, 255, 167, 0.95)' : 'rgba(255, 117, 117, 0.95)';
        this.ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }

    this.updateCalibrationPanelPosition();
    this.updateCalibrationPanelContent();
  }

  interpolatePoint(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }

  getAnimatedLPoint(path, loopT) {
    const lenAB = this.distance(path.a, path.b);
    const lenBC = this.distance(path.b, path.c);
    const segments = [
      { start: path.a, end: path.b, length: lenAB },
      { start: path.b, end: path.c, length: lenBC },
      { start: path.c, end: path.b, length: lenBC },
      { start: path.b, end: path.a, length: lenAB }
    ];

    const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
    if (totalLength <= 0) {
      return { x: path.a.x, y: path.a.y };
    }

    let distanceAlongPath = loopT * totalLength;
    for (const segment of segments) {
      if (distanceAlongPath <= segment.length) {
        const t = segment.length > 0 ? distanceAlongPath / segment.length : 0;
        return this.interpolatePoint(segment.start, segment.end, t);
      }
      distanceAlongPath -= segment.length;
    }

    return { x: path.a.x, y: path.a.y };
  }

  getHoverStrength(dot, threshold = 34) {
    let strength = 0;
    const tips = [this.leftTip, this.rightTip];
    for (const tip of tips) {
      if (!tip) {
        continue;
      }
      const distance = this.distance(dot, tip);
      const proximity = Math.max(0, 1 - distance / threshold);
      strength = Math.max(strength, proximity);
    }
    return strength;
  }

  drawPulse(dot, strength, nowMs) {
    if (strength <= 0) {
      return;
    }

    const phase = (nowMs * 0.01) % (Math.PI * 2);
    const wave = (Math.sin(phase) + 1) / 2;

    const radiusMain = 16 + wave * 20;
    const alphaMain = 0.4 + strength * 0.6;
    const radiusSecondary = 24 + ((wave + 0.35) % 1) * 18;
    const alphaSecondary = 0.2 + strength * 0.4;

    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(dot.x, dot.y, radiusMain, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 60, 95, ${alphaMain.toFixed(3)})`;
    this.ctx.lineWidth = 4 + strength * 4;
    this.ctx.shadowBlur = 24;
    this.ctx.shadowColor = 'rgba(255, 60, 95, 0.95)';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(dot.x, dot.y, radiusSecondary, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 120, 150, ${alphaSecondary.toFixed(3)})`;
    this.ctx.lineWidth = 2 + strength * 2;
    this.ctx.shadowBlur = 16;
    this.ctx.shadowColor = 'rgba(255, 90, 130, 0.75)';
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderCalibrationMotion(scale, verticalScale = 1, matchSegmentLengths = false, speedFactor = 0.0002, anchorMode = 'none') {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const centerY = h * 0.52;
    const wristOffset = w * 0.25 * scale;
    const innerOffset = wristOffset * 0.35;
    const baseHalfSpanY = h * 0.3;
    const horizontalSegmentLength = wristOffset - innerOffset;
    const targetVerticalLength = matchSegmentLengths ? horizontalSegmentLength : null;
    const halfSpanY = targetVerticalLength
      ? targetVerticalLength / 2
      : baseHalfSpanY * verticalScale;

    let leftEdgeX = centerX - wristOffset;
    let rightEdgeX = centerX + wristOffset;
    let bottomY = centerY + halfSpanY;
    let leftBottomY = bottomY;
    let rightBottomY = bottomY;
    let topY = Math.max(h * 0.04, bottomY - halfSpanY * 2);
    let leftInnerX = Math.min(centerX - 8, leftEdgeX + Math.max(22, wristOffset - innerOffset));
    let rightInnerX = Math.max(centerX + 8, rightEdgeX - Math.max(22, wristOffset - innerOffset));

    if (anchorMode === 'wrist' || anchorMode === 'shoulder') {
      const selectedSet = this.getSelectedCalibrationPoseSet();
      const selectedSetLandmarks = this.getCalibrationLandmarksForCanvas(selectedSet);
      let leftAnchor = null;
      let rightAnchor = null;

      if (selectedSet && selectedSetLandmarks.length > 0) {
        if (anchorMode === 'wrist') {
          leftAnchor = this.averagePoints(selectedSetLandmarks[17], selectedSetLandmarks[19]);
          rightAnchor = this.averagePoints(selectedSetLandmarks[18], selectedSetLandmarks[20]);
        } else {
          leftAnchor = selectedSetLandmarks[11];
          rightAnchor = selectedSetLandmarks[12];
        }
      }

      if (leftAnchor && rightAnchor) {
        const paddingX = Math.max(16, w * 0.03);
        const targetCenterX = (leftAnchor.x + rightAnchor.x) / 2;
        const centerOffset = (centerX - targetCenterX) * 0.35;

        leftEdgeX = leftAnchor.x + centerOffset;
        rightEdgeX = rightAnchor.x + centerOffset;

        leftEdgeX = Math.max(paddingX, leftEdgeX);
        rightEdgeX = Math.min(w - paddingX, rightEdgeX);

        const minSpan = Math.max(54, w * 0.12 * scale);
        if (rightEdgeX - leftEdgeX < minSpan) {
          const fallbackCenterX = (leftEdgeX + rightEdgeX) / 2 || centerX;
          const spanHalf = minSpan / 2;
          leftEdgeX = fallbackCenterX - spanHalf;
          rightEdgeX = fallbackCenterX + spanHalf;
        }

        if (anchorMode === 'wrist') {
          const avgAnchorY = (leftAnchor.y + rightAnchor.y) / 2;
          bottomY = Math.max(h * 0.26, Math.min(h * 0.94, avgAnchorY));
          leftBottomY = bottomY;
          rightBottomY = bottomY;
        } else {
          const leftShoulder = selectedSetLandmarks[11] || leftAnchor;
          const rightShoulder = selectedSetLandmarks[12] || rightAnchor;
          const leftEye = selectedSetLandmarks[2] || selectedSetLandmarks[1] || leftAnchor;
          const rightEye = selectedSetLandmarks[5] || selectedSetLandmarks[4] || rightAnchor;
          const eyeCenterY = ((leftEye?.y ?? 0) + (rightEye?.y ?? 0)) / 2;
          const shoulderWidth = leftShoulder && rightShoulder ? this.distance(leftShoulder, rightShoulder) : Math.max(54, w * 0.18 * scale);
          const xSpread = Math.max(28, shoulderWidth * 0.2);
          const shoulderReach = Math.max(42, shoulderWidth * 0.7);
          const eyeGuideY = Math.max(h * 0.1, Math.min(h * 0.28, eyeCenterY + h * 0.04));
          const minVerticalLength = Math.max(52, h * 0.08);

          leftEdgeX = leftShoulder ? leftShoulder.x - xSpread : leftEdgeX;
          rightEdgeX = rightShoulder ? rightShoulder.x + xSpread : rightEdgeX;
          leftBottomY = leftShoulder ? leftShoulder.y : leftBottomY;
          rightBottomY = rightShoulder ? rightShoulder.y : rightBottomY;
          const lowestBottomY = Math.min(leftBottomY, rightBottomY);
          const maxTopY = lowestBottomY - minVerticalLength;
          topY = Math.max(h * 0.04, Math.min(eyeGuideY, maxTopY));
          leftBottomY = Math.min(h * 0.9, leftBottomY);
          rightBottomY = Math.min(h * 0.9, rightBottomY);
          bottomY = (leftBottomY + rightBottomY) / 2;

          leftInnerX = leftEdgeX + shoulderReach;
          rightInnerX = rightEdgeX - shoulderReach;
        }
      }
    }

    topY = Math.max(h * 0.04, Math.min(topY, bottomY - 8));
    bottomY = Math.min(h * 0.96, Math.max(topY + 8, bottomY));
    leftBottomY = Math.min(h * 0.96, Math.max(topY + 8, leftBottomY));
    rightBottomY = Math.min(h * 0.96, Math.max(topY + 8, rightBottomY));
    const horizontalReach = Math.max(22, wristOffset - innerOffset);
    leftInnerX = Math.min(centerX - 8, leftEdgeX + horizontalReach);
    rightInnerX = Math.max(centerX + 8, rightEdgeX - horizontalReach);

    if (anchorMode === 'shoulder') {
      const shoulderSpan = Math.max(24, rightEdgeX - leftEdgeX);
      const shoulderReach = Math.min(shoulderSpan * 0.42, Math.max(42, wristOffset * 0.42));
      leftInnerX = leftEdgeX + shoulderReach;
      rightInnerX = rightEdgeX - shoulderReach;
    }

    const leftPath = {
      a: { x: leftEdgeX, y: topY },
      b: { x: leftEdgeX, y: leftBottomY },
      c: { x: leftInnerX, y: leftBottomY }
    };
    const rightPath = {
      a: { x: rightEdgeX, y: topY },
      b: { x: rightEdgeX, y: rightBottomY },
      c: { x: rightInnerX, y: rightBottomY }
    };

    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(6, 14, 27, 0.16)');
    bgGradient.addColorStop(1, 'rgba(8, 20, 36, 0.28)');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 206, 112, 0.96)';
    this.ctx.lineWidth = 6;
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = 'rgba(255, 198, 90, 0.75)';

    [leftPath, rightPath].forEach((path) => {
      this.ctx.beginPath();
      this.ctx.moveTo(path.a.x, path.a.y);
      this.ctx.lineTo(path.b.x, path.b.y);
      this.ctx.lineTo(path.c.x, path.c.y);
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(255, 239, 190, 0.95)';
      [path.a, path.b, path.c].forEach((p) => {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        this.ctx.fill();
      });
    });
    this.ctx.restore();

    const elapsed = performance.now() - this.calibrationAnimationStart;
    const nowMs = performance.now();
    const loopT = (elapsed * speedFactor) % 1;
    const leftDot = this.getAnimatedLPoint(leftPath, loopT);
    const rightDot = this.getAnimatedLPoint(rightPath, loopT);
    const leftHoverStrength = this.getHoverStrength(leftDot);
    const rightHoverStrength = this.getHoverStrength(rightDot);

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 95, 120, 0.98)';
    this.ctx.shadowBlur = 16;
    this.ctx.shadowColor = 'rgba(255, 95, 120, 0.75)';
    [
      { dot: leftDot, strength: leftHoverStrength },
      { dot: rightDot, strength: rightHoverStrength }
    ].forEach(({ dot, strength }) => {
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, 10 + strength * 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();

    this.drawPulse(leftDot, leftHoverStrength, nowMs);
    this.drawPulse(rightDot, rightHoverStrength, nowMs);

    this.updateCalibrationPanelPosition();
    this.updateCalibrationPanelContent();
  }

  advanceConsistencyPhase(nowMs) {
    const dtMs = Math.max(0, nowMs - this.consistencyLastTickMs);
    this.consistencyLastTickMs = nowMs;
    const bpm = Math.max(30, this.consistencyTempoBpm);
    // Turning point every beat: full top->bottom->top cycle spans two beats.
    const deltaPhase = dtMs * bpm / 120000;
    this.consistencyPhase = (this.consistencyPhase + deltaPhase) % 1;
  }

  getConsistencyThreshold() {
    const baseThreshold = Math.max(44, Math.min(this.canvas.width, this.canvas.height) * 0.075);
    return baseThreshold * (100 / Math.max(1, this.consistencyStrictnessPercent));
  }

  getConsistencyPointRadius(threshold = this.getConsistencyThreshold()) {
    const radius = threshold * 0.22;
    return Math.max(7, Math.min(22, radius));
  }

  getConsistencyScene() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const wristOffset = w * 0.25;
    const leftX = centerX - wristOffset;
    const rightX = centerX + wristOffset;
    const topY = h * 0.2;
    const bottomY = h * 0.86;
    const baseT = this.consistencyPhase;
    const motionBlend = Math.max(0, Math.min(1, this.consistencyMotionBlendPercent / 100));
    const yAt = (phase = 0, speedMultiplier = 1) => {
      const t = (baseT * speedMultiplier + phase) % 1;
      const triangle = t < 0.5 ? t * 2 : (1 - t) * 2;
      const sine = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      const blended = triangle + (sine - triangle) * motionBlend;
      return topY + blended * (bottomY - topY);
    };

    if (this.level === 0) {
      return {
        guides: [{ type: 'line', x: rightX, topY, bottomY }],
        movingTargets: [{ hand: 'right', x: rightX, y: yAt(0), color: 'rgba(255, 148, 84, 0.98)' }]
      };
    }

    if (this.level === 1) {
      return {
        guides: [{ type: 'line', x: leftX, topY, bottomY }],
        movingTargets: [{ hand: 'left', x: leftX, y: yAt(0), color: 'rgba(96, 160, 255, 0.98)' }]
      };
    }

    if (this.level === 2) {
      const y = yAt(0);
      return {
        guides: [
          { type: 'line', x: leftX, topY, bottomY },
          { type: 'line', x: rightX, topY, bottomY }
        ],
        movingTargets: [
          { hand: 'left', x: leftX, y, color: 'rgba(96, 160, 255, 0.98)' },
          { hand: 'right', x: rightX, y, color: 'rgba(255, 148, 84, 0.98)' }
        ]
      };
    }

    if (this.level === 3) {
      return {
        guides: [
          { type: 'line', x: leftX, topY, bottomY },
          { type: 'line', x: rightX, topY, bottomY }
        ],
        movingTargets: [
          { hand: 'left', x: leftX, y: yAt(0), color: 'rgba(96, 160, 255, 0.98)' },
          { hand: 'right', x: rightX, y: yAt(0.5), color: 'rgba(255, 148, 84, 0.98)' }
        ]
      };
    }

    if (this.level === 4) {
      return {
        guides: [
          { type: 'line', x: leftX, topY, bottomY },
          { type: 'line', x: rightX, topY, bottomY }
        ],
        movingTargets: [
          { hand: 'left', x: leftX, y: yAt(0, 2), color: 'rgba(96, 160, 255, 0.98)' },
          { hand: 'right', x: rightX, y: yAt(0, 1), color: 'rgba(255, 148, 84, 0.98)' }
        ]
      };
    }

    const ellipseRx = w * 0.11;
    const ellipseRy = h * 0.22;
    const theta = baseT * Math.PI * 2 - Math.PI / 2;
    const rightTheta = -theta - Math.PI;
    const leftCenter = { x: leftX, y: h * 0.53 };
    const rightCenter = { x: rightX, y: h * 0.53 };
    return {
      guides: [
        { type: 'ellipse', centerX: leftCenter.x, centerY: leftCenter.y, radiusX: ellipseRx, radiusY: ellipseRy },
        { type: 'ellipse', centerX: rightCenter.x, centerY: rightCenter.y, radiusX: ellipseRx, radiusY: ellipseRy }
      ],
      movingTargets: [
        {
          hand: 'left',
          x: leftCenter.x + Math.cos(theta) * ellipseRx,
          y: leftCenter.y + Math.sin(theta) * ellipseRy,
          color: 'rgba(96, 160, 255, 0.98)'
        },
        {
          hand: 'right',
          x: rightCenter.x + Math.cos(rightTheta) * ellipseRx,
          y: rightCenter.y + Math.sin(rightTheta) * ellipseRy,
          color: 'rgba(255, 148, 84, 0.98)'
        }
      ]
    };
  }

  calculateConsistencyScore(scene, threshold) {
    let sum = 0;

    for (const movingTarget of scene.movingTargets) {
      const tip = movingTarget.hand === 'left' ? this.leftTip : this.rightTip;
      if (!tip) {
        continue;
      }

      const distance = this.distance(tip, movingTarget);
      // Inside the dotted ring = full score; only outside the ring starts to decay.
      const score = distance <= threshold
        ? 1
        : Math.max(0, 1 - (distance - threshold) / threshold);
      sum += score;
    }

    return scene.movingTargets.length > 0 ? sum / scene.movingTargets.length : 0;
  }

  recordConsistencyScore(nowMs, scene, threshold) {
    const score = this.calculateConsistencyScore(scene, threshold);
    this.consistencyScoreHistory.push({ ts: nowMs, score });

    const cutoff = nowMs - 3000;
    while (this.consistencyScoreHistory.length > 0 && this.consistencyScoreHistory[0].ts < cutoff) {
      this.consistencyScoreHistory.shift();
    }

    if (this.consistencyScoreHistory.length === 0) {
      this.consistencyAccuracy = 0;
      return;
    }

    if (this.consistencyScoreHistory.length === 1) {
      this.consistencyAccuracy = Math.max(0, Math.min(1, this.consistencyScoreHistory[0].score));
      return;
    }

    let weightedSum = 0;
    let totalDuration = 0;

    for (let i = 0; i < this.consistencyScoreHistory.length - 1; i += 1) {
      const current = this.consistencyScoreHistory[i];
      const next = this.consistencyScoreHistory[i + 1];
      const segmentStart = Math.max(current.ts, cutoff);
      const segmentEnd = Math.min(next.ts, nowMs);
      const dt = Math.max(0, segmentEnd - segmentStart);
      if (dt <= 0) {
        continue;
      }

      // Piecewise-constant integration: score stays valid until next sample.
      weightedSum += current.score * dt;
      totalDuration += dt;
    }

    if (totalDuration <= 0) {
      const lastScore = this.consistencyScoreHistory[this.consistencyScoreHistory.length - 1].score;
      this.consistencyAccuracy = Math.max(0, Math.min(1, lastScore));
      return;
    }

    const avg = weightedSum / totalDuration;
    this.consistencyAccuracy = Math.max(0, Math.min(1, avg));
  }

  renderConsistency() {
    const nowMs = performance.now();
    this.advanceConsistencyPhase(nowMs);
    const scene = this.getConsistencyScene();
    const threshold = this.getConsistencyThreshold();
    const pointRadius = this.getConsistencyPointRadius(threshold);
    this.recordConsistencyScore(nowMs, scene, threshold);

    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    bgGradient.addColorStop(0, 'rgba(25, 18, 8, 0.18)');
    bgGradient.addColorStop(1, 'rgba(10, 9, 5, 0.26)');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.lineWidth = 6;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = 'rgba(255, 221, 145, 0.5)';

    scene.guides.forEach((guide) => {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 206, 112, 0.92)';
      if (guide.type === 'line') {
        this.ctx.moveTo(guide.x, guide.topY);
        this.ctx.lineTo(guide.x, guide.bottomY);
      } else {
        this.ctx.ellipse(guide.centerX, guide.centerY, guide.radiusX, guide.radiusY, 0, 0, Math.PI * 2);
      }
      this.ctx.stroke();
    });
    this.ctx.restore();

    scene.movingTargets.forEach((movingTarget) => {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 239, 190, 0.34)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([8, 6]);
      this.ctx.arc(movingTarget.x, movingTarget.y, threshold, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.fillStyle = movingTarget.color;
      this.ctx.shadowBlur = 14;
      this.ctx.shadowColor = movingTarget.color;
      this.ctx.arc(movingTarget.x, movingTarget.y, pointRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    this.updateConsistencyPanelPosition();
    this.updateConsistencyPanelContent();
  }

  updateHands(hands) {
    this.leftTip = null;
    this.rightTip = null;

    for (const hand of hands) {
      if (!hand || hand.length < 9) continue;
      const tip = hand[8];
      if (!tip) continue;
      if (tip.x < this.canvas.width * 0.5) {
        this.leftTip = tip;
        // console.log(`Left tip: (${tip.x.toFixed(1)}, ${tip.y.toFixed(1)})`);
      } else {
        this.rightTip = tip;
        // console.log(`Right tip: (${tip.x.toFixed(1)}, ${tip.y.toFixed(1)})`);
      }
    }

    if (this.calibrationActive && (this.level === 1 || this.level === 2)) {
      this.requestRender();
      return;
    }

    if (this.consistencyActive) {
      this.requestRender();
      return;
    }

    if (!this.active || this.completed || this.targets.length === 0) return;

    // update scales for interactivity
    const targetScales = new Array(this.grid.length).fill(1.0);
    if (this.leftTip) {
      const idx = this.getCircleIndex(this.leftTip);
      if (idx !== -1) targetScales[idx] = 1.5;
    }
    if (this.rightTip) {
      const idx = this.getCircleIndex(this.rightTip);
      if (idx !== -1) targetScales[idx] = 1.5;
    }

    // smooth lerp
    for (let i = 0; i < this.circleScales.length; i += 1) {
      this.circleScales[i] += (targetScales[i] - this.circleScales[i]) * 0.1;
    }

    const target = this.targets[this.nextTarget];
    if (!target) return;

    let touched = false;
    if (target.hand === 'left') {
      const tip = this.leftTip || this.rightTip;
      if (tip) touched = this.getCircleIndex(tip) === target.index;
    } else if (target.hand === 'right') {
      const tip = this.rightTip || this.leftTip;
      if (tip) touched = this.getCircleIndex(tip) === target.index;
    } else if (target.hand === 'both' && this.leftTip && this.rightTip) {
      const leftIdx = this.getCircleIndex(this.leftTip);
      const rightIdx = this.getCircleIndex(this.rightTip);
      touched = leftIdx === target.leftIndex && rightIdx === target.rightIndex;
    }

    if (touched) {
      this.nextTarget += 1;
      if (this.nextTarget >= this.targets.length) {
        this.completed = true;
        this.active = false;
        if (this.completionCallback) this.completionCallback(this.chapter, this.level);
      }
      this.requestRender();
    } else {
      this.requestRender();
    }
  }

  getCircleIndex(point) {
    for (let i = 0; i < this.grid.length; i += 1) {
      const circle = this.grid[i];
      const scale = this.circleScales[i];
      const radiusX = circle.radiusX * scale;
      const radiusY = circle.radiusY * scale;
      const normalizedX = (point.x - circle.x) / radiusX;
      const normalizedY = (point.y - circle.y) / radiusY;
      const ellipseDistance = normalizedX * normalizedX + normalizedY * normalizedY;
      if (ellipseDistance <= 1) {
        const d = this.distance(point, { x: circle.x, y: circle.y });
        // console.log(`Finger tip at (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) - Circle ${i} at (${circle.x.toFixed(1)}, ${circle.y.toFixed(1)}) - Distance: ${d.toFixed(1)}`);
        return i;
      }
    }
    return -1;
  }

  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
}
