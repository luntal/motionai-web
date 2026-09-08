import { basicFigurePaths, basicFigurePathsStyle2, extendedFigurePaths } from './constants.js';
import { registerHoverHelp } from './ui.js';

export class LevelManager {
  constructor(overlayCanvas) {
    this.canvas = overlayCanvas;
    this.ctx = overlayCanvas.getContext('2d');
    this.normalizedCanvasHeight = Math.max(1, this.canvas?.height || 600);
    this.chapter = 0;
    this.level = null;
    this.active = false;
    this.targets = [];
    this.nextTarget = 0;
    this.nextTargetByHand = { left: 0, right: 0 };
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
    this.consistencySettingsStorageKey = 'motionai.consistency-panel-settings';
    this.consistencyTouchStateByHand = {
      left: { active: false, startedAt: 0, lastTouchAt: 0, scale: 1 },
      right: { active: false, startedAt: 0, lastTouchAt: 0, scale: 1 }
    };
    this.loadConsistencySettings();
    this.gridRows = 12;
    this.gridCols = 16;
    this.targetIndexByCircle = new Map();
    this.audioContext = null;
    this.audioMasterGain = null;
    this.audioVoices = [];
    this.audioVoiceCount = 8;
    this.audioTriggerCooldownMs = 90;
    this.alternatingExerciseVolume = 0;
    this.alternatingExerciseStartNote = 36;
    this.alternatingScaleMode = 'chromatic';
    this.alternatingExerciseFrequencyModulation = false;
    this.alternatingExerciseAxisSwap = false;
    this.lastAudioTriggerAtByCircle = new Map();
    this.activeTouchCircleByHand = { left: new Set(), right: new Set() };
    this.activeTouchFadeByHand = { left: new Map(), right: new Map() };
    this.activeTouchFadeEnabled = true;
    this.activeTouchFadeDurationMs = 2000;
    this.exerciseFieldVisible = true;
    this.exerciseFieldScale = 1;
    this.exerciseFieldXOffset = 0;
    this.exerciseFieldStrikeCount = 2;
    this.exerciseFieldStrikeRadius = 12;
    this.exerciseFieldStrikeRadiusBase = 12;
    this.exerciseFieldAssignment = {
      side: 'left',
      vertical: 'top',
      beatIndex: 1
    };
    this.exerciseFieldChallengeMode = 'free';
    this.exerciseFieldTempoBpm = 60;
    this.exerciseFieldMetronomeEnabled = false;
    this.exerciseFieldSequenceIndex = 0;
    this.exerciseFieldAccuracy = 0;
    this.exerciseFieldLastFreeTickBeat = -1;
    this.exerciseFieldSequenceStartedAt = performance.now();
    this.exerciseFieldStrikePositions = { left: [], right: [] };
    this.exerciseFieldTimingSamples = [];
    this.exerciseFieldFreeSyncSamples = [];
    this.exerciseFieldFreeBeatRegularitySamples = [];
    this.exerciseFieldFreeBeatRegularityLastBeatAtMs = null;
    this.exerciseFieldFreeSyncLabels = [];
    this.exerciseFieldFreeSyncActive = false;
    this.exerciseFieldFreeSyncCurrentPair = { leftTouchAtMs: null, rightTouchAtMs: null };
    this.exerciseFieldFreeSyncLastTouchAt = { left: null, right: null };
    this.exerciseFieldBeatWindow = null;
    this.exerciseFieldLastResolvedBeatIndex = null;
    this.exerciseFieldTimingLabels = [];
    this.exerciseFieldMetronomeClock = {
      audioContext: null,
      masterGain: null,
      startedAtAudioTime: 0,
      lastBeatIndex: -1,
      lastBeatAtAudioTime: 0
    };
    this.exerciseFieldMetronomeBeatTimer = null;
    this.exerciseFieldMetronomeSchedulerToken = 0;
    this.exerciseFieldMetronomeSchedulerActive = false;
    this.exerciseFieldMetronomeActivationBound = false;
    this.exerciseFieldDrag = null;
    this.exerciseFieldZones = {
      leftTop: null,
      leftBottom: null,
      rightTop: null,
      rightBottom: null
    };
    this.renderQueued = false;
    this.figureVariant = 'soft';
    this.figureScale = 1 / 3;
    this.figureStrokeWidth = 0.4;
    this.figureSide = 'left';
    this.figureHorizontalOffset = 50;
    this.figureYPosition = 0.5;
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
    this.dynamicFigureYPosition = 0.5;
    this.dynamicFigureTempoBpm = 60;
    this.dynamicFigureDynamicsVisible = false;
    this.dynamicFigureCountTimesVisible = false;
    this.dynamicFigureHardLinearity = 10;
    this.dynamicFigureSoftTransitionPercent = 0;
    this.dynamicFigureCornerHeights = Array(8).fill(0);
    this.dynamicFigureCornerHeightsByLevel = this.loadDynamicFigureCornerHeights();
    this.dynamicFigureAnimationStart = performance.now();
    this.dynamicFigureActive = false;
    this.handIndependenceActive = false;
    this.handIndependenceVariant = 'hard';
    this.handIndependenceReverse = false;
    this.handIndependenceDynamicsVisible = false;
    this.handIndependenceCountTimesVisible = false;
    this.handIndependenceFigureScale = 1 / 3;
    this.handIndependenceFigureStrokeWidth = 0.4;
    this.handIndependenceFigureHardLinearity = 10;
    this.handIndependenceFigureSoftTransitionPercent = 0;
    this.handIndependenceFigureTempoBpm = 60;
    this.handIndependenceSharedTempoBpm = 60;
    this.handIndependenceTempoRatio = '1:1';
    this.handIndependenceFigureX = 0;
    this.handIndependenceFigureY = 0.5;
    this.handIndependenceFigureLevel = 0;
    this.handIndependenceFigureCornerHeights = Array(8).fill(0);
    this.handIndependenceShape = 'line';
    this.handIndependenceShapeLength = 12;
    this.handIndependenceShapeWidth = 8;
    this.handIndependenceShapeHeight = 8;
    this.handIndependenceShapeRotation = 0;
    this.handIndependenceShapeX = 0;
    this.handIndependenceShapeY = 0;
    this.handIndependenceShapeTempoBpm = 60;
    this.handIndependenceShapeLinearity = 0;
    this.handIndependenceAnimationStart = performance.now();
    this.pointExerciseEditMode = false;
    this.pointExerciseSelectedSlot = 0;
    this.pointExerciseHand = 'right';
    this.pointExerciseSymmetryMode = false;
    this.pointExercisePalindromMode = false;
    this.pointExerciseTraversalDirection = 1;
    this.pointExercisePalindromeIndex = 0;
    this.pointExercisePalindromeDirection = 1;
    this.pointExerciseSequence = [];
    this.pointExerciseSequentialMode = 'sequential';
    this.pointExerciseCurrentIndex = 0;
    this.pointExerciseTraversalCursor = 0;
    this.pointExerciseTraversalSequence = [];
    this.pointExerciseSavedSlots = {};
    this.pointExerciseFlashPoints = [];
    this.pointExerciseFlashDurationMs = 350;
    this.squareExerciseHandMode = 'right';
    this.squareExerciseSyncMode = 'asynchronous';
    this.squareExerciseResolution = 1;
    this.squareExerciseGridResolution = 8;
    this.squareExerciseShape = '0';
    this.squareExerciseCenterDistance = 0.5;
    this.symmetricExerciseResolution = 1;
    this.symmetricExerciseGridResolution = 8;
    this.symmetricExerciseCenterDistance = 0.5;
    this.chapter1GridResolution = 8;
    this.chapter1CircleDiameter = 1;
    this.symmetricExerciseOrientation = 'vertical';
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

  setExerciseFieldVisible(visible) {
    this.exerciseFieldVisible = Boolean(visible);
    this.requestRender();
  }

  setExerciseFieldScale(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    this.exerciseFieldScale = Math.min(1.25, Math.max(0.25, next));
    this.requestRender();
  }

  setExerciseFieldXOffset(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    this.exerciseFieldXOffset = Math.min(1, Math.max(0, next));
    this.requestRender();
  }

  getExerciseFieldStrikeDefaults(count) {
    const centerX = this.canvas.width * 0.5;
    const leftMin = 12;
    const leftMax = Math.max(leftMin + 8, centerX - 12);
    const midpoint = (leftMin + leftMax) * 0.5;
    const spread = count > 1
      ? Math.min((leftMax - leftMin) * 0.5, 180) / (count - 1)
      : 0;
    const yLevels = [
      this.canvas.height * 0.32,
      this.canvas.height * 0.42,
      this.canvas.height * 0.52,
      this.canvas.height * 0.62
    ];

    const leftX = Array.from({ length: count }, (_, index) => {
      const offset = (index - (count - 1) * 0.5) * spread;
      return Math.min(leftMax, Math.max(leftMin, midpoint + offset));
    });

    return {
      leftX,
      rightX: leftX.map((value) => centerX + (centerX - value)),
      centerX,
      y: this.canvas.height * 0.52,
      yLevels
    };
  }

  setExerciseFieldStrikePositions(positions = {}) {
    const nextLeft = Array.isArray(positions.left) ? positions.left : [];
    const nextRight = Array.isArray(positions.right) ? positions.right : [];
    const count = Math.max(2, Math.min(4, Number.isInteger(this.exerciseFieldStrikeCount) ? this.exerciseFieldStrikeCount : nextLeft.length || nextRight.length || 2));
    const left = Array.from({ length: count }, (_, index) => {
      const point = nextLeft[index] || { x: 0, y: 0 };
      const safeX = Number.isFinite(Number(point.x)) ? Number(point.x) : 0;
      const safeY = Number.isFinite(Number(point.y)) ? Number(point.y) : 0;
      return { x: safeX, y: safeY };
    });
    const right = Array.from({ length: count }, (_, index) => {
      const point = nextRight[index] || { x: 0, y: 0 };
      const safeX = Number.isFinite(Number(point.x)) ? Number(point.x) : 0;
      const safeY = Number.isFinite(Number(point.y)) ? Number(point.y) : 0;
      return { x: safeX, y: safeY };
    });

    this.exerciseFieldStrikePositions = { left, right };
    this.exerciseFieldStrikeCount = count;
    this.requestRender();
  }

  setExerciseFieldPositions(positions = {}) {
    this.setExerciseFieldStrikePositions(positions);
  }

  setExerciseFieldStrikeCount(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    const safeValue = [2, 3, 4].includes(next) ? next : 2;
    if (this.exerciseFieldStrikeCount === safeValue) {
      return;
    }

    const previousLeft = this.exerciseFieldStrikePositions.left || [];
    const previousRight = this.exerciseFieldStrikePositions.right || [];
    const defaultPositions = this.getExerciseFieldStrikeDefaults(safeValue);

    this.exerciseFieldStrikeCount = safeValue;
    this.exerciseFieldStrikePositions.left = Array.from({ length: safeValue }, (_, index) => {
      const previous = previousLeft[index];
      const y = defaultPositions.yLevels[index] ?? defaultPositions.y;
      if (previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)) {
        return { x: previous.x, y: previous.y };
      }
      return { x: defaultPositions.leftX[index], y };
    });
    this.exerciseFieldStrikePositions.right = Array.from({ length: safeValue }, (_, index) => {
      const previous = previousRight[index];
      const pairedLeft = this.exerciseFieldStrikePositions.left[index];
      const y = defaultPositions.yLevels[index] ?? defaultPositions.y;
      const mirroredX = pairedLeft && Number.isFinite(pairedLeft.x)
        ? defaultPositions.centerX + (defaultPositions.centerX - pairedLeft.x)
        : defaultPositions.rightX[index];
      if (previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)) {
        return { x: previous.x, y: previous.y };
      }
      return { x: mirroredX, y };
    });

    if (this.exerciseFieldMetronomeEnabled && this.exerciseFieldChallengeMode === 'tempo') {
      this.stopExerciseFieldMetronomeScheduler();
      const audioContext = this.ensureExerciseFieldMetronomeAudio();
      if (audioContext) {
        this.exerciseFieldMetronomeClock.startedAtAudioTime = audioContext.currentTime;
        this.exerciseFieldMetronomeClock.lastBeatIndex = -1;
        this.exerciseFieldMetronomeClock.lastBeatAtAudioTime = audioContext.currentTime;
        this.startExerciseFieldMetronomeScheduler();
      }
    }

    this.requestRender();
  }

  setExerciseFieldStrikeRadius(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    const minimum = 20;
    const maximum = 60;
    this.exerciseFieldStrikeRadiusBase = minimum;
    this.exerciseFieldStrikeRadius = Math.min(maximum, Math.max(minimum, next));
    this.requestRender();
  }

  setExerciseFieldAssignment(assignment = {}) {
    const side = assignment && assignment.side === 'right' ? 'right' : 'left';
    const vertical = assignment && assignment.vertical === 'bottom' ? 'bottom' : 'top';
    const beatCount = Number.isInteger(this.exerciseFieldStrikeCount)
      ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
      : 2;
    const beatIndex = Number(assignment && assignment.beatIndex);
    const nextBeat = Number.isFinite(beatIndex)
      ? Math.max(1, Math.min(beatCount, Math.round(beatIndex)))
      : 1;

    this.exerciseFieldAssignment = { side, vertical, beatIndex: nextBeat };
    this.requestRender();
  }

  getExerciseFieldStrikeLayout(zones, count) {
    if (!zones || !count) {
      return { leftX: [], rightX: [], y: this.canvas.height * 0.62, centerX: this.canvas.width * 0.5 };
    }

    const centerX = this.canvas.width * 0.5;
    const leftRect = zones.leftTop || zones.leftBottom;
    const rightRect = zones.rightTop || zones.rightBottom;
    const lineY = leftRect && rightRect
      ? (leftRect.y + rightRect.y) * 0.5 + (leftRect.height + rightRect.height) * 0.06
      : this.canvas.height * 0.64;
    const leftMin = 12;
    const leftMax = centerX - 12;
    const step = count > 1 ? (leftMax - leftMin) / (count - 1) : 0;
    const leftX = Array.from({ length: count }, (_, index) => leftMin + index * step);
    const rightX = leftX.map((value) => centerX + (centerX - value));

    return { leftX, rightX, y: lineY, centerX };
  }

  getExerciseFieldTargetForIndex(side, index) {
    const strikeCount = Number.isInteger(this.exerciseFieldStrikeCount)
      ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
      : 2;
    const normalizedIndex = Number.isInteger(index) ? Math.max(0, Math.min(strikeCount - 1, index)) : 0;
    const assignmentSide = this.exerciseFieldAssignment?.side === 'right' ? 'right' : 'left';
    const assignmentVertical = this.exerciseFieldAssignment?.vertical === 'bottom' ? 'bottom' : 'top';
    const assignmentBeatIndex = Math.max(1, Math.min(strikeCount, Number(this.exerciseFieldAssignment?.beatIndex) || 1));

    const point = side === 'left'
      ? (this.exerciseFieldStrikePositions.left[normalizedIndex] || { x: 0, y: 0 })
      : (this.exerciseFieldStrikePositions.right[normalizedIndex] || { x: 0, y: 0 });

    const isAssignedBeatTarget = side === assignmentSide && normalizedIndex === assignmentBeatIndex - 1;
    if (!isAssignedBeatTarget) {
      return { kind: 'point', point };
    }

    const zones = this.getExerciseFieldZones();
    const key = assignmentSide === 'left'
      ? (assignmentVertical === 'top' ? 'leftTop' : 'leftBottom')
      : (assignmentVertical === 'top' ? 'rightTop' : 'rightBottom');
    const rect = zones[key] || null;

    if (rect) {
      return { kind: 'rect', rect };
    }

    return { kind: 'point', point };
  }

  getExerciseFieldStrikeHit(x, y) {
    const strikeCount = Number.isInteger(this.exerciseFieldStrikeCount)
      ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
      : 2;

    const candidates = [];
    for (let index = 0; index < strikeCount; index += 1) {
      candidates.push({ side: 'left', index, target: this.getExerciseFieldTargetForIndex('left', index) });
      candidates.push({ side: 'right', index, target: this.getExerciseFieldTargetForIndex('right', index) });
    }

    const hit = candidates.find(({ target }) => {
      if (target.kind === 'rect') {
        const rect = target.rect;
        return rect && x >= rect.x - rect.width / 2 && x <= rect.x + rect.width / 2
          && y >= rect.y - rect.height / 2 && y <= rect.y + rect.height / 2;
      }

      const point = target.point || { x: 0, y: 0 };
      return Number.isFinite(point.x) && Number.isFinite(point.y)
        && Math.hypot(x - point.x, y - point.y) <= 16;
    });
    return hit || null;
  }

  beginExerciseFieldDrag(x, y) {
    const hit = this.getExerciseFieldStrikeHit(x, y);
    if (!hit) {
      return false;
    }

    this.exerciseFieldDrag = {
      side: hit.side,
      index: hit.index
    };
    return true;
  }

  updateExerciseFieldDrag(x, y) {
    if (!this.exerciseFieldDrag) {
      return false;
    }

    const centerX = this.canvas.width * 0.5;
    const side = this.exerciseFieldDrag.side;
    const index = this.exerciseFieldDrag.index;
    const leftMin = 12;
    const leftMax = centerX - 12;
    const rightMin = centerX + 12;
    const rightMax = this.canvas.width - 12;
    const nextX = side === 'left'
      ? Math.min(leftMax, Math.max(leftMin, x))
      : Math.min(rightMax, Math.max(rightMin, x));
    const nextY = Math.min(this.canvas.height - 20, Math.max(20, y));

    if (side === 'left') {
      this.exerciseFieldStrikePositions.left[index] = { x: nextX, y: nextY };
      this.exerciseFieldStrikePositions.right[index] = { x: centerX + (centerX - nextX), y: nextY };
    } else {
      this.exerciseFieldStrikePositions.right[index] = { x: nextX, y: nextY };
      this.exerciseFieldStrikePositions.left[index] = { x: centerX - (nextX - centerX), y: nextY };
    }

    this.requestRender();
    return true;
  }

  endExerciseFieldDrag() {
    this.exerciseFieldDrag = null;
  }

  setExerciseFieldChallengeMode(mode = 'free') {
    const nextMode = mode === 'tempo' ? 'tempo' : 'free';
    if (this.exerciseFieldChallengeMode === nextMode) {
      return;
    }

    this.exerciseFieldChallengeMode = nextMode;
    this.exerciseFieldSequenceIndex = 0;
    this.exerciseFieldLastFreeTickBeat = -1;
    this.exerciseFieldSequenceStartedAt = performance.now();
    this.exerciseFieldAccuracy = 0;
    this.exerciseFieldTimingSamples = [];
    this.exerciseFieldFreeSyncSamples = [];
    this.exerciseFieldFreeBeatRegularitySamples = [];
    this.exerciseFieldFreeBeatRegularityLastBeatAtMs = null;
    this.exerciseFieldFreeSyncLabels = [];
    this.exerciseFieldFreeSyncActive = false;
    this.exerciseFieldFreeSyncCurrentPair = { leftTouchAtMs: null, rightTouchAtMs: null };
    this.exerciseFieldFreeSyncLastTouchAt = { left: null, right: null };
    this.exerciseFieldBeatWindow = null;
    this.exerciseFieldLastResolvedBeatIndex = null;
    if (nextMode === 'tempo') {
      if (this.exerciseFieldMetronomeEnabled) {
        const audioContext = this.ensureExerciseFieldMetronomeAudio();
        if (audioContext) {
          this.exerciseFieldMetronomeClock.startedAtAudioTime = audioContext.currentTime;
          this.exerciseFieldMetronomeClock.lastBeatIndex = -1;
          this.startExerciseFieldMetronomeScheduler();
        }
      }
    } else {
      this.stopExerciseFieldMetronomeScheduler();
    }
    this.requestRender();
  }

  getExerciseFieldBeatDurationMs() {
    return 60000 / Math.max(30, Math.min(180, Number(this.exerciseFieldTempoBpm) || 60));
  }

  setExerciseFieldTempoBpm(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(180, Math.max(30, next));
    if (this.exerciseFieldTempoBpm === clamped) {
      return;
    }

    this.exerciseFieldTempoBpm = clamped;
    this.exerciseFieldSequenceStartedAt = performance.now();
    if (this.exerciseFieldMetronomeEnabled && this.exerciseFieldChallengeMode === 'tempo') {
      this.stopExerciseFieldMetronomeScheduler();
      const audioContext = this.ensureExerciseFieldMetronomeAudio();
      if (audioContext) {
        this.exerciseFieldMetronomeClock.startedAtAudioTime = audioContext.currentTime;
        this.exerciseFieldMetronomeClock.lastBeatIndex = -1;
        this.exerciseFieldMetronomeClock.lastBeatAtAudioTime = audioContext.currentTime;
        this.startExerciseFieldMetronomeScheduler();
      }
    }
    this.requestRender();
  }

  bindExerciseFieldMetronomeUserActivation() {
    if (typeof window === 'undefined' || this.exerciseFieldMetronomeActivationBound) {
      return;
    }

    this.exerciseFieldMetronomeActivationBound = true;
    const silentResumeAudio = async () => {
      const audioContext = this.ensureExerciseFieldMetronomeAudio();
      if (!audioContext) {
        return;
      }

      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (error) {
          this.captureExerciseFieldMetronomeDebug({ action: 'resume:silent-failed', error: String(error) });
        }
      }
    };

    const resumeOnUserGesture = () => {
      if (this.exerciseFieldMetronomeEnabled || this.exerciseFieldChallengeMode === 'tempo') {
        silentResumeAudio();
      }
    };

    window.addEventListener('pointerdown', resumeOnUserGesture, { passive: true });
    window.addEventListener('mousedown', resumeOnUserGesture, { passive: true });
    window.addEventListener('touchstart', resumeOnUserGesture, { passive: true });
    window.addEventListener('click', resumeOnUserGesture, { passive: true });
    window.addEventListener('keydown', resumeOnUserGesture, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && (this.exerciseFieldMetronomeEnabled || this.exerciseFieldChallengeMode === 'tempo')) {
          this.resumeExerciseFieldMetronomeAudio().catch(() => {});
          if (this.exerciseFieldChallengeMode === 'tempo' && this.exerciseFieldMetronomeEnabled) {
            this.startExerciseFieldMetronomeScheduler();
          }
        }
      });
    }
  }

  captureExerciseFieldMetronomeDebug(detail = {}) {
    if (typeof window === 'undefined') {
      return;
    }

    window.__motionAiMetronomeDebug = {
      enabled: Boolean(this.exerciseFieldMetronomeEnabled),
      challengeMode: this.exerciseFieldChallengeMode,
      tempoBpm: this.exerciseFieldTempoBpm,
      audioContextState: this.exerciseFieldMetronomeClock?.audioContext?.state || null,
      hasMasterGain: Boolean(this.exerciseFieldMetronomeClock?.masterGain),
      lastBeatIndex: this.exerciseFieldMetronomeClock?.lastBeatIndex ?? null,
      detail
    };
  }

  async resumeExerciseFieldMetronomeAudio() {
    const audioContext = this.ensureExerciseFieldMetronomeAudio();
    if (!audioContext) {
      this.captureExerciseFieldMetronomeDebug({ action: 'resume:missing-audio-context' });
      return null;
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (error) {
        this.captureExerciseFieldMetronomeDebug({ action: 'resume:failed', error: String(error) });
        return null;
      }
    }

    this.captureExerciseFieldMetronomeDebug({ action: 'resume:ok', audioContextState: audioContext.state });
    return audioContext;
  }

  ensureExerciseFieldMetronomeAudio() {
    if (typeof window === 'undefined') {
      return null;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (!this.exerciseFieldMetronomeClock.audioContext) {
      const audioContext = new AudioCtor();
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0.22;
      masterGain.connect(audioContext.destination);
      this.exerciseFieldMetronomeClock = {
        audioContext,
        masterGain,
        startedAtAudioTime: audioContext.currentTime,
        lastBeatIndex: -1,
        lastBeatAtAudioTime: audioContext.currentTime
      };
    }

    const clock = this.exerciseFieldMetronomeClock;
    if (clock.audioContext.state === 'suspended') {
      clock.audioContext.resume().catch(() => {});
    }

    return clock.audioContext;
  }

  stopExerciseFieldMetronomeScheduler() {
    if (this.exerciseFieldMetronomeBeatTimer) {
      clearTimeout(this.exerciseFieldMetronomeBeatTimer);
      this.exerciseFieldMetronomeBeatTimer = null;
    }
    this.exerciseFieldMetronomeSchedulerToken += 1;
    this.exerciseFieldMetronomeSchedulerActive = false;
  }

  startExerciseFieldMetronomeScheduler() {
    if (!this.exerciseFieldMetronomeEnabled || this.exerciseFieldChallengeMode !== 'tempo') {
      this.stopExerciseFieldMetronomeScheduler();
      return;
    }

    if (this.exerciseFieldMetronomeSchedulerActive) {
      this.stopExerciseFieldMetronomeScheduler();
    }

    this.exerciseFieldMetronomeSchedulerActive = true;
    this.exerciseFieldSequenceStartedAt = performance.now();
    const schedulerToken = ++this.exerciseFieldMetronomeSchedulerToken;

    this.resumeExerciseFieldMetronomeAudio().then((audioContext) => {
      if (!audioContext || !this.exerciseFieldMetronomeClock.masterGain) {
        this.exerciseFieldMetronomeSchedulerActive = false;
        return;
      }

      if (schedulerToken !== this.exerciseFieldMetronomeSchedulerToken) {
        this.exerciseFieldMetronomeSchedulerActive = false;
        return;
      }

      const beatDurationMs = this.getExerciseFieldBeatDurationMs();
      const beatDurationSeconds = beatDurationMs / 1000;
      const strikeCount = Number.isInteger(this.exerciseFieldStrikeCount)
        ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
        : 2;

      this.exerciseFieldMetronomeClock.startedAtAudioTime = audioContext.currentTime;
      this.exerciseFieldMetronomeClock.lastBeatIndex = -1;
      this.exerciseFieldMetronomeClock.lastBeatAtAudioTime = audioContext.currentTime;

      let nextBeatNumber = 1;
      const baseAudioTime = audioContext.currentTime;

      const scheduleNextBeat = () => {
        if (schedulerToken !== this.exerciseFieldMetronomeSchedulerToken) {
          return;
        }
        if (!this.exerciseFieldMetronomeEnabled || this.exerciseFieldChallengeMode !== 'tempo') {
          this.exerciseFieldMetronomeSchedulerActive = false;
          return;
        }

        const beatIndexInCycle = nextBeatNumber - 1;
        const beatAudioTime = baseAudioTime + beatIndexInCycle * beatDurationSeconds;
        const delayMs = Math.max(15, (beatAudioTime - audioContext.currentTime) * 1000 + 5);

        this.exerciseFieldMetronomeBeatTimer = window.setTimeout(() => {
          if (schedulerToken !== this.exerciseFieldMetronomeSchedulerToken) {
            return;
          }
          if (!this.exerciseFieldMetronomeEnabled || this.exerciseFieldChallengeMode !== 'tempo') {
            this.exerciseFieldMetronomeSchedulerActive = false;
            return;
          }

          const activeAudioContext = this.ensureExerciseFieldMetronomeAudio();
          if (!activeAudioContext || !this.exerciseFieldMetronomeClock.masterGain) {
            this.exerciseFieldMetronomeSchedulerActive = false;
            return;
          }

          const beatNumber = ((nextBeatNumber - 1) % strikeCount) + 1;
          const scheduledAt = baseAudioTime + (nextBeatNumber - 1) * beatDurationSeconds;

          this.exerciseFieldMetronomeClock.lastBeatIndex = beatNumber - 1;
          this.exerciseFieldMetronomeClock.lastBeatAtAudioTime = scheduledAt;

          this.playExerciseFieldMetronomeTick(beatNumber, beatNumber === 1, scheduledAt);

          nextBeatNumber += 1;
          scheduleNextBeat();
        }, delayMs);
      };

      scheduleNextBeat();
    }).catch(() => {
      this.exerciseFieldMetronomeSchedulerActive = false;
    });
  }

  setExerciseFieldMetronomeEnabled(enabled) {
    const next = Boolean(enabled);
    this.exerciseFieldMetronomeEnabled = next;
    this.bindExerciseFieldMetronomeUserActivation();
    this.exerciseFieldLastFreeTickBeat = -1;
    this.captureExerciseFieldMetronomeDebug({ action: 'toggle', enabled: next, challengeMode: this.exerciseFieldChallengeMode });

    if (next) {
      const audioContext = this.ensureExerciseFieldMetronomeAudio();
      if (audioContext) {
        this.exerciseFieldMetronomeClock.startedAtAudioTime = audioContext.currentTime;
        this.exerciseFieldMetronomeClock.lastBeatIndex = -1;
        this.exerciseFieldMetronomeClock.lastBeatAtAudioTime = audioContext.currentTime;
      }
      this.resumeExerciseFieldMetronomeAudio().catch(() => {});
      if (this.exerciseFieldChallengeMode === 'tempo') {
        this.startExerciseFieldMetronomeScheduler();
      }
    } else {
      this.stopExerciseFieldMetronomeScheduler();
      this.exerciseFieldBeatWindow = null;
    }

    this.requestRender();
  }

  async playExerciseFieldMetronomeTick(beatNumber = 1, isPrimary = false, atTime = null) {
    const audioContext = await this.resumeExerciseFieldMetronomeAudio();
    this.captureExerciseFieldMetronomeDebug({ action: 'tick:request', beatNumber, isPrimary, atTime, audioContextState: audioContext?.state || null, hasMasterGain: Boolean(this.exerciseFieldMetronomeClock?.masterGain) });
    if (!audioContext || !this.exerciseFieldMetronomeClock.masterGain) {
      return;
    }

    const startAt = Number.isFinite(Number(atTime)) ? Number(atTime) : audioContext.currentTime;
    const primaryFrequency = isPrimary ? 880 : 660;
    const secondaryFrequency = isPrimary ? 660 : 440;
    const beatDuration = this.getExerciseFieldBeatDurationMs() / 1000;
    const frequency = beatNumber === 1 ? primaryFrequency : secondaryFrequency;
    const duration = isPrimary ? 0.08 : 0.05;

    const oscillator = audioContext.createOscillator();
    oscillator.type = isPrimary ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startAt);

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isPrimary ? 2200 : 1600, startAt);
    filter.Q.setValueAtTime(0.8, startAt);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(isPrimary ? 0.18 : 0.12, startAt + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    const noiseBuffer = audioContext.createBuffer(1, Math.max(1, Math.floor(audioContext.sampleRate * 0.02)), audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * (isPrimary ? 0.8 : 0.55);
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = isPrimary ? 2500 : 1800;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(isPrimary ? 0.08 : 0.05, startAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.02);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.exerciseFieldMetronomeClock.masterGain);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.exerciseFieldMetronomeClock.masterGain);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.04);
    noiseSource.start(startAt);
    noiseSource.stop(startAt + 0.03);
    this.captureExerciseFieldMetronomeDebug({ action: 'tick:started', beatNumber, isPrimary, startAt, audioContextState: audioContext.state, hasMasterGain: true });

    setTimeout(() => {
      oscillator.disconnect();
      filter.disconnect();
      gainNode.disconnect();
      noiseSource.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    }, Math.max(50, (duration + 0.04) * 1000 + 30));

    return beatDuration;
  }

  getExerciseFieldTimelineElapsedMs(nowMs = performance.now()) {
    if (!Number.isFinite(this.exerciseFieldSequenceStartedAt)) {
      this.exerciseFieldSequenceStartedAt = nowMs;
    }

    return Math.max(0, nowMs - this.exerciseFieldSequenceStartedAt);
  }

  getExerciseFieldBeatState(nowMs = performance.now()) {
    const strikeCount = Number.isInteger(this.exerciseFieldStrikeCount)
      ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
      : 2;

    const beatDurationMs = this.getExerciseFieldBeatDurationMs();
    const elapsedMs = this.getExerciseFieldTimelineElapsedMs(nowMs);
    const absoluteBeatIndex = Math.floor(elapsedMs / beatDurationMs);
    const scheduledIndex = absoluteBeatIndex % strikeCount;
    const phase = beatDurationMs > 0 ? (elapsedMs % beatDurationMs) / beatDurationMs : 0;
    return { absoluteBeatIndex, scheduledIndex, beatDurationMs, elapsedMs, phase };
  }

  finalizeExerciseFieldBeatWindow(nowMs = performance.now()) {
    const sample = this.exerciseFieldBeatWindow;
    if (!sample || sample.finalized) {
      return;
    }

    const beatDurationMs = this.getExerciseFieldBeatDurationMs();
    const expectedAtMs = Number.isFinite(sample.expectedAtMs) ? sample.expectedAtMs : 0;
    const beatWindowHalfDurationMs = beatDurationMs / 2;
    const bothHandsKnown = Number.isFinite(sample.leftTouchAtMs) && Number.isFinite(sample.rightTouchAtMs);
    const beatTimedOut = Number.isFinite(nowMs) && nowMs >= expectedAtMs + beatWindowHalfDurationMs;

    if (!bothHandsKnown && !beatTimedOut) {
      return;
    }

    sample.finalized = true;

    const leftTouchAtMs = Number.isFinite(sample.leftTouchAtMs) ? sample.leftTouchAtMs : null;
    const rightTouchAtMs = Number.isFinite(sample.rightTouchAtMs) ? sample.rightTouchAtMs : null;
    const leftDeltaMs = leftTouchAtMs !== null ? leftTouchAtMs - expectedAtMs : null;
    const rightDeltaMs = rightTouchAtMs !== null ? rightTouchAtMs - expectedAtMs : null;
    const fullBeatPenaltyMs = Math.max(50, beatDurationMs);
    const leftErrorMs = leftDeltaMs !== null ? Math.abs(leftDeltaMs) : fullBeatPenaltyMs;
    const rightErrorMs = rightDeltaMs !== null ? Math.abs(rightDeltaMs) : fullBeatPenaltyMs;
    const syncDeltaMs = Number.isFinite(leftTouchAtMs) && Number.isFinite(rightTouchAtMs)
      ? Math.abs(leftTouchAtMs - rightTouchAtMs)
      : fullBeatPenaltyMs;
    const avgAbsoluteDeviationMs = ((leftErrorMs + rightErrorMs) / 2);
    const normalizedDeviationRangeMs = Math.max(50, beatDurationMs);
    const normalizedDeviation = Math.min(1, Math.max(0, avgAbsoluteDeviationMs / normalizedDeviationRangeMs));

    this.exerciseFieldTimingSamples.push({
      beatIndex: sample.beatIndex,
      expectedAtMs,
      leftTouchAtMs: leftTouchAtMs,
      rightTouchAtMs: rightTouchAtMs,
      leftDeltaMs,
      rightDeltaMs,
      leftErrorMs,
      rightErrorMs,
      syncDeltaMs,
      avgAbsoluteDeviationMs,
      normalizedDeviation
    });

    this.exerciseFieldLastResolvedBeatIndex = sample.beatIndex;

    const sampleWindow = Math.max(10, this.exerciseFieldStrikeCount * 10);
    this.exerciseFieldTimingSamples = this.exerciseFieldTimingSamples.slice(-sampleWindow);
    this.exerciseFieldBeatWindow = null;
  }

  recordExerciseFieldTouchTiming(side, beatIndex, nowMs) {
    if (this.exerciseFieldChallengeMode !== 'tempo') {
      return;
    }

    const absoluteBeatIndex = Number.isFinite(Number(beatIndex)) ? Number(beatIndex) : 0;
    const cycleBeatIndex = Math.abs(this.exerciseFieldStrikeCount || 2) > 0
      ? absoluteBeatIndex % Number(this.exerciseFieldStrikeCount || 2)
      : 0;
    const beatDurationMs = this.getExerciseFieldBeatDurationMs();
    const absoluteOriginMs = Number.isFinite(this.exerciseFieldSequenceStartedAt)
      ? this.exerciseFieldSequenceStartedAt
      : nowMs;
    const expectedAtMs = absoluteOriginMs + absoluteBeatIndex * beatDurationMs;
    const deltaMs = nowMs - expectedAtMs;

    const existingLabel = this.exerciseFieldTimingLabels.find((label) => label.side === side && label.beatIndex === cycleBeatIndex);
    if (existingLabel && nowMs - existingLabel.createdAtMs < beatDurationMs) {
      return;
    }

    this.exerciseFieldTimingLabels = this.exerciseFieldTimingLabels.filter((label) => {
      const stillFresh = nowMs - label.createdAtMs < beatDurationMs;
      return stillFresh && !(label.side === side && label.beatIndex === cycleBeatIndex);
    });

    this.exerciseFieldTimingLabels.push({
      side,
      beatIndex: cycleBeatIndex,
      absoluteBeatIndex,
      createdAtMs: nowMs,
      deltaMs,
      expectedAtMs
    });

    if (!this.exerciseFieldBeatWindow || this.exerciseFieldBeatWindow.beatIndex !== beatIndex) {
      this.exerciseFieldBeatWindow = {
        beatIndex,
        expectedAtMs,
        leftTouchAtMs: null,
        rightTouchAtMs: null,
        finalized: false
      };
    }

    const sample = this.exerciseFieldBeatWindow;
    if (side === 'left') {
      sample.leftTouchAtMs = nowMs;
    }
    if (side === 'right') {
      sample.rightTouchAtMs = nowMs;
    }

    if (Number.isFinite(sample.leftTouchAtMs) && Number.isFinite(sample.rightTouchAtMs)) {
      this.finalizeExerciseFieldBeatWindow();
    }
  }

  getExerciseFieldFreeBeatRegularityStats() {
    const samples = Array.isArray(this.exerciseFieldFreeBeatRegularitySamples)
      ? this.exerciseFieldFreeBeatRegularitySamples.slice(-10)
      : [];

    if (samples.length < 2) {
      return {
        avgIntervalMs: null,
        deviationMs: null,
        regularityPct: null,
        observations: samples.length
      };
    }

    const avgIntervalMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const deviationMs = samples.reduce((sum, value) => sum + Math.abs(value - avgIntervalMs), 0) / samples.length;
    const normalizedDeviation = Math.min(1, deviationMs / Math.max(100, avgIntervalMs * 0.75));
    const regularityPct = Math.max(0, Math.min(100, (1 - normalizedDeviation) * 100));

    return {
      avgIntervalMs,
      deviationMs,
      regularityPct,
      observations: samples.length
    };
  }

  getExerciseFieldTimingStats() {
    const samples = Array.isArray(this.exerciseFieldTimingSamples) ? this.exerciseFieldTimingSamples : [];
    if (samples.length === 0) {
      return {
        syncAvgMs: null,
        leftAccuracyPct: null,
        rightAccuracyPct: null,
        combinedAccuracyPct: null,
        observations: 0
      };
    }

    const beatWindow = this.getExerciseFieldBeatDurationMs();
    const toleranceMs = Math.max(75, beatWindow * 0.75);
    const syncValues = samples.map((sample) => Number(sample.syncDeltaMs)).filter((value) => Number.isFinite(value));
    const leftValues = samples.map((sample) => Number(sample.leftErrorMs)).filter((value) => Number.isFinite(value));
    const rightValues = samples.map((sample) => Number(sample.rightErrorMs)).filter((value) => Number.isFinite(value));

    const syncAvgMs = syncValues.length > 0 ? syncValues.reduce((sum, value) => sum + value, 0) / syncValues.length : null;
    const leftAvgMs = leftValues.length > 0 ? leftValues.reduce((sum, value) => sum + value, 0) / leftValues.length : null;
    const rightAvgMs = rightValues.length > 0 ? rightValues.reduce((sum, value) => sum + value, 0) / rightValues.length : null;

    const clampScore = (avgValue) => {
      if (!Number.isFinite(avgValue) || !Number.isFinite(toleranceMs) || toleranceMs <= 0) {
        return null;
      }
      const ratio = Math.min(1, avgValue / toleranceMs);
      return Math.max(0, Math.min(100, (1 - ratio) * 100));
    };

    return {
      syncAvgMs: syncAvgMs,
      leftAccuracyPct: clampScore(leftAvgMs),
      rightAccuracyPct: clampScore(rightAvgMs),
      combinedAccuracyPct: clampScore((leftAvgMs === null || rightAvgMs === null)
        ? (leftAvgMs ?? rightAvgMs)
        : (leftAvgMs + rightAvgMs) / 2),
      observations: samples.length
    };
  }

  getExerciseFieldMetrics() {
    const timing = this.getExerciseFieldTimingStats();
    return {
      mode: this.exerciseFieldChallengeMode || 'free',
      tempoBpm: Number.isFinite(this.exerciseFieldTempoBpm) ? this.exerciseFieldTempoBpm : 60,
      accuracy: Number.isFinite(this.exerciseFieldAccuracy) ? this.exerciseFieldAccuracy : 0,
      activeIndex: Number.isInteger(this.exerciseFieldSequenceIndex) ? this.exerciseFieldSequenceIndex : 0,
      strikeCount: Number.isInteger(this.exerciseFieldStrikeCount)
        ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
        : 2,
      metronomeEnabled: Boolean(this.exerciseFieldMetronomeEnabled),
      syncAvgMs: timing.syncAvgMs,
      leftAccuracyPct: timing.leftAccuracyPct,
      rightAccuracyPct: timing.rightAccuracyPct,
      combinedAccuracyPct: timing.combinedAccuracyPct,
      observations: timing.observations
    };
  }

  scheduleExerciseFieldMetronomeTick() {
    if (!this.exerciseFieldMetronomeEnabled || this.exerciseFieldChallengeMode !== 'tempo') {
      this.stopExerciseFieldMetronomeScheduler();
      return;
    }

    this.startExerciseFieldMetronomeScheduler();
  }

  updateExerciseFieldChallengeTracking(nowMs = performance.now()) {
    const strikeCount = Number.isInteger(this.exerciseFieldStrikeCount)
      ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
      : 2;

    if (strikeCount <= 0) {
      return;
    }

    if (this.exerciseFieldMetronomeEnabled && this.exerciseFieldChallengeMode === 'tempo') {
      if (!this.exerciseFieldMetronomeSchedulerActive) {
        this.scheduleExerciseFieldMetronomeTick();
      }

      const beatState = this.getExerciseFieldBeatState(nowMs);
      const beatDurationMs = this.getExerciseFieldBeatDurationMs();
      const absoluteOriginMs = Number.isFinite(this.exerciseFieldSequenceStartedAt)
        ? this.exerciseFieldSequenceStartedAt
        : nowMs;

      if (Number.isFinite(beatState.absoluteBeatIndex)) {
        const previousScheduledIndex = this.exerciseFieldSequenceIndex;
        const nextScheduledIndex = beatState.scheduledIndex;
        const absoluteBeatIndex = beatState.absoluteBeatIndex;

        if (this.exerciseFieldBeatWindow) {
          const beatWindow = this.exerciseFieldBeatWindow;
          const beatIsResolved = Number.isFinite(beatWindow.leftTouchAtMs)
            && Number.isFinite(beatWindow.rightTouchAtMs);
          const beatTimedOut = nowMs >= beatWindow.expectedAtMs + (beatDurationMs / 2);

          if ((beatIsResolved || beatTimedOut) && previousScheduledIndex === nextScheduledIndex) {
            this.finalizeExerciseFieldBeatWindow(nowMs);
          }
        }

        const lastResolvedBeatIndex = Number.isFinite(this.exerciseFieldLastResolvedBeatIndex)
          ? this.exerciseFieldLastResolvedBeatIndex
          : null;

        if (!this.exerciseFieldBeatWindow && (lastResolvedBeatIndex === null || absoluteBeatIndex > lastResolvedBeatIndex)) {
          this.exerciseFieldBeatWindow = {
            beatIndex: absoluteBeatIndex,
            expectedAtMs: absoluteOriginMs + absoluteBeatIndex * beatDurationMs,
            leftTouchAtMs: null,
            rightTouchAtMs: null,
            finalized: false
          };
        }

        this.exerciseFieldSequenceIndex = nextScheduledIndex;
      }
    }

    const activeIndex = this.exerciseFieldSequenceIndex % strikeCount;
    const leftTarget = this.getExerciseFieldTargetForIndex('left', activeIndex);
    const rightTarget = this.getExerciseFieldTargetForIndex('right', activeIndex);

    const isRectHit = (tip, target) => {
      if (!tip || !target) {
        return false;
      }

      if (target.kind === 'rect') {
        const rect = target.rect;
        return rect && tip.x >= rect.x - rect.width / 2 && tip.x <= rect.x + rect.width / 2
          && tip.y >= rect.y - rect.height / 2 && tip.y <= rect.y + rect.height / 2;
      }

      const point = target.point || { x: 0, y: 0 };
      return Number.isFinite(point.x) && Number.isFinite(point.y)
        && Math.hypot(tip.x - point.x, tip.y - point.y) <= Math.max(16, this.exerciseFieldStrikeRadius * 1.8);
    };

    const leftMatch = isRectHit(this.leftTip, leftTarget);
    const rightMatch = isRectHit(this.rightTip, rightTarget);

    if (this.exerciseFieldChallengeMode === 'tempo' && this.exerciseFieldMetronomeEnabled) {
      const beatState = this.getExerciseFieldBeatState(nowMs);
      if (leftMatch) {
        this.recordExerciseFieldTouchTiming('left', beatState.absoluteBeatIndex, nowMs);
      }
      if (rightMatch) {
        this.recordExerciseFieldTouchTiming('right', beatState.absoluteBeatIndex, nowMs);
      }
    }

    if (this.exerciseFieldChallengeMode === 'free') {
      const syncPair = this.exerciseFieldFreeSyncCurrentPair;
      if (leftMatch && syncPair.leftTouchAtMs === null) {
        syncPair.leftTouchAtMs = nowMs;
      }
      if (rightMatch && syncPair.rightTouchAtMs === null) {
        syncPair.rightTouchAtMs = nowMs;
      }

      if (leftMatch && rightMatch) {
        const leftTouchAtMs = Number.isFinite(syncPair.leftTouchAtMs) ? syncPair.leftTouchAtMs : nowMs;
        const rightTouchAtMs = Number.isFinite(syncPair.rightTouchAtMs) ? syncPair.rightTouchAtMs : nowMs;
        const rawDeltaMs = leftTouchAtMs - rightTouchAtMs;
        const deltaMs = Math.abs(rawDeltaMs);
        const clampedDeltaMs = Math.min(1000, Math.max(0, deltaMs));
        const score = Math.max(0, Math.min(1, 1 - (clampedDeltaMs / 1000)));
        const syncTargetIndex = activeIndex;

        if (Number.isFinite(this.exerciseFieldFreeBeatRegularityLastBeatAtMs)) {
          const intervalMs = Math.max(0, nowMs - this.exerciseFieldFreeBeatRegularityLastBeatAtMs);
          this.exerciseFieldFreeBeatRegularitySamples.push(intervalMs);
          this.exerciseFieldFreeBeatRegularitySamples = this.exerciseFieldFreeBeatRegularitySamples.slice(-10);
        }
        this.exerciseFieldFreeBeatRegularityLastBeatAtMs = nowMs;

        this.exerciseFieldFreeSyncSamples.push({
          deltaMs: clampedDeltaMs,
          score,
          recordedAtMs: nowMs
        });
        this.exerciseFieldFreeSyncSamples = this.exerciseFieldFreeSyncSamples.slice(-10);

        this.exerciseFieldFreeSyncLabels = this.exerciseFieldFreeSyncLabels.filter((label) => label.beatIndex !== syncTargetIndex);
        this.exerciseFieldFreeSyncLabels.push(
          { side: 'left', beatIndex: syncTargetIndex, deltaMs: clampedDeltaMs, createdAtMs: nowMs },
          { side: 'right', beatIndex: syncTargetIndex, deltaMs: clampedDeltaMs, createdAtMs: nowMs }
        );
        this.exerciseFieldFreeSyncLabels = this.exerciseFieldFreeSyncLabels.slice(-20);
        this.exerciseFieldFreeSyncActive = true;
        this.exerciseFieldFreeSyncCurrentPair = { leftTouchAtMs: null, rightTouchAtMs: null };

        const tickBeat = ((this.exerciseFieldSequenceIndex % strikeCount) + 1) || 1;
        if (this.exerciseFieldMetronomeEnabled) {
          const audioContext = this.ensureExerciseFieldMetronomeAudio();
          this.playExerciseFieldMetronomeTick(tickBeat, tickBeat === 1, audioContext ? audioContext.currentTime : null);
        }
        this.exerciseFieldSequenceIndex = (activeIndex + 1) % strikeCount;
        this.exerciseFieldSequenceStartedAt = nowMs;
        this.exerciseFieldAccuracy = Math.min(1, this.exerciseFieldAccuracy + 0.2);
      } else {
        this.exerciseFieldFreeSyncActive = false;
        const partialMatch = Number(leftMatch || rightMatch);
        const nextAccuracy = partialMatch > 0
          ? Math.min(1, this.exerciseFieldAccuracy * 0.88 + 0.12)
          : Math.max(0, this.exerciseFieldAccuracy * 0.96);
        this.exerciseFieldAccuracy = Math.max(0, Math.min(1, nextAccuracy));
      }
      return;
    }

    const beatDurationMs = this.getExerciseFieldBeatDurationMs();
    const elapsedSinceStart = this.exerciseFieldMetronomeEnabled && this.exerciseFieldChallengeMode === 'tempo'
      ? this.getExerciseFieldTimelineElapsedMs(nowMs)
      : Math.max(0, nowMs - this.exerciseFieldSequenceStartedAt);
    const scheduledIndex = Math.floor(elapsedSinceStart / beatDurationMs) % strikeCount;

    if (scheduledIndex !== this.exerciseFieldSequenceIndex) {
      this.exerciseFieldSequenceIndex = scheduledIndex;
    }

    const combinedMatchScore = (leftMatch && rightMatch) ? 1 : ((leftMatch || rightMatch) ? 0.5 : 0);
    const phaseProgress = beatDurationMs > 0 ? (elapsedSinceStart % beatDurationMs) / beatDurationMs : 0;
    const timingQuality = (1 - Math.abs(phaseProgress - 0.5) * 2);
    const quality = Math.max(0, Math.min(1, combinedMatchScore * (0.7 + timingQuality * 0.3)));
    this.exerciseFieldAccuracy = Math.max(0, Math.min(1, this.exerciseFieldAccuracy * 0.82 + quality * 0.18));
  }

  getPoseWarningLandmarksEnabled() {
    return this.poseWarningLandmarksVisible;
  }

  getExerciseFieldZones() {
    const calibrationSet = this.getSelectedCalibrationPoseSet();
    const landmarks = this.getCalibrationLandmarksForCanvas(calibrationSet);
    const leftEye = landmarks[2] || landmarks[5] || landmarks[1] || landmarks[0] || null;
    const rightEye = landmarks[5] || landmarks[2] || landmarks[4] || landmarks[0] || null;
    const leftHand = landmarks[15] || landmarks[19] || landmarks[17] || landmarks[7] || landmarks[0] || null;
    const rightHand = landmarks[16] || landmarks[20] || landmarks[18] || landmarks[8] || landmarks[0] || null;
    const leftHip = landmarks[23] || landmarks[25] || landmarks[24] || landmarks[0] || null;
    const rightHip = landmarks[24] || landmarks[26] || landmarks[23] || landmarks[0] || null;
    const leftShoulder = landmarks[11] || landmarks[13] || landmarks[0] || null;
    const rightShoulder = landmarks[12] || landmarks[14] || landmarks[0] || null;

    if (!leftHand || !rightHand || !leftHip || !rightHip || !leftShoulder || !rightShoulder) {
      return {
        leftTop: null,
        leftBottom: null,
        rightTop: null,
        rightBottom: null,
        sideLength: 80
      };
    }

    const leftUpperCenterY = leftEye && leftShoulder ? (leftEye.y + leftShoulder.y) / 2 : leftShoulder.y;
    const rightUpperCenterY = rightEye && rightShoulder ? (rightEye.y + rightShoulder.y) / 2 : rightShoulder.y;
    const leftLowerCenterY = leftHand && leftHip ? (leftHand.y + leftHip.y) / 2 : leftHand.y;
    const rightLowerCenterY = rightHand && rightHip ? (rightHand.y + rightHip.y) / 2 : rightHand.y;

    const defaultSideLength = Math.max(60, Math.min(220, Math.max(
      Math.abs(leftHand.y - leftHip.y),
      Math.abs(rightHand.y - rightHip.y),
      Math.abs((leftEye?.y ?? leftShoulder.y) - leftShoulder.y),
      Math.abs((rightEye?.y ?? rightShoulder.y) - rightShoulder.y)
    ) * 2));

    const sideLength = defaultSideLength * this.exerciseFieldScale;
    const baseXOffset = this.exerciseFieldXOffset * Math.max(defaultSideLength, 60);
    const makeRect = (centerX, centerY, direction) => ({
      x: direction === 'left' ? centerX - baseXOffset : centerX + baseXOffset,
      y: centerY,
      width: sideLength,
      height: sideLength
    });

    return {
      leftTop: makeRect(leftHand.x, leftUpperCenterY, 'left'),
      leftBottom: makeRect(leftHand.x, leftLowerCenterY, 'left'),
      rightTop: makeRect(rightHand.x, rightUpperCenterY, 'right'),
      rightBottom: makeRect(rightHand.x, rightLowerCenterY, 'right'),
      sideLength,
      defaultSideLength,
      xOffset: baseXOffset
    };
  }

  getFallbackCalibrationPoseSet() {
    const landmarks = Array.from({ length: 33 }, (_, index) => {
      const defaultPose = {
        0: { x: 0.5, y: 0.12 },
        1: { x: 0.42, y: 0.08 },
        2: { x: 0.42, y: 0.08 },
        3: { x: 0.38, y: 0.09 },
        4: { x: 0.58, y: 0.08 },
        5: { x: 0.58, y: 0.08 },
        6: { x: 0.62, y: 0.09 },
        7: { x: 0.34, y: 0.12 },
        8: { x: 0.66, y: 0.12 },
        9: { x: 0.46, y: 0.17 },
        10: { x: 0.54, y: 0.17 },
        11: { x: 0.38, y: 0.28 },
        12: { x: 0.62, y: 0.28 },
        13: { x: 0.31, y: 0.38 },
        14: { x: 0.69, y: 0.38 },
        15: { x: 0.24, y: 0.52 },
        16: { x: 0.76, y: 0.52 },
        17: { x: 0.18, y: 0.55 },
        18: { x: 0.82, y: 0.55 },
        19: { x: 0.22, y: 0.48 },
        20: { x: 0.78, y: 0.48 },
        21: { x: 0.28, y: 0.44 },
        22: { x: 0.72, y: 0.44 },
        23: { x: 0.4, y: 0.82 },
        24: { x: 0.6, y: 0.82 },
        25: { x: 0.44, y: 0.88 },
        26: { x: 0.56, y: 0.88 },
        27: { x: 0.46, y: 0.92 },
        28: { x: 0.54, y: 0.92 },
        29: { x: 0.4, y: 0.96 },
        30: { x: 0.6, y: 0.96 },
        31: { x: 0.46, y: 0.98 },
        32: { x: 0.54, y: 0.98 }
      }[index] || { x: 0.5, y: 0.5 };

      return {
        x: Number(defaultPose.x),
        y: Number(defaultPose.y),
        z: 0,
        visibility: 1
      };
    });

    return {
      name: 'default-fallback',
      timestamp: 0,
      referenceWidth: 640,
      referenceHeight: 360,
      landmarks
    };
  }

  getSelectedCalibrationPoseSet() {
    if (!Number.isInteger(this.selectedCalibrationPoseSetIndex)) {
      if (this.calibrationPoseSets.length === 0) {
        this.calibrationPoseSets = [this.getFallbackCalibrationPoseSet()];
        this.selectedCalibrationPoseSetIndex = 0;
      }
      return this.calibrationPoseSets[0] || this.getFallbackCalibrationPoseSet();
    }

    return this.calibrationPoseSets[this.selectedCalibrationPoseSetIndex] || this.getFallbackCalibrationPoseSet();
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
        return [this.getFallbackCalibrationPoseSet()];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [this.getFallbackCalibrationPoseSet()];
      }

      const normalized = parsed
        .filter((entry) => entry && Array.isArray(entry.landmarks))
        .map((entry) => this.normalizeCalibrationPoseSetEntry(entry))
        .filter((entry) => entry)
        .slice(-10);

      if (normalized.length === 0) {
        return [this.getFallbackCalibrationPoseSet()];
      }

      return normalized;
    } catch (error) {
      console.warn('Failed to load calibration pose sets:', error);
      return [this.getFallbackCalibrationPoseSet()];
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

  loadConsistencySettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.consistencySettingsStorageKey) || '{}');
      if (!stored || typeof stored !== 'object') {
        return;
      }

      const nextTempo = Number(stored.tempoBpm);
      const nextStrictness = Number(stored.strictnessPercent);
      const nextMotion = Number(stored.motionBlendPercent);

      if (Number.isFinite(nextTempo)) {
        this.consistencyTempoBpm = Math.min(170, Math.max(30, nextTempo));
      }
      if (Number.isFinite(nextStrictness)) {
        this.consistencyStrictnessPercent = Math.min(160, Math.max(70, nextStrictness));
      }
      if (Number.isFinite(nextMotion)) {
        this.consistencyMotionBlendPercent = Math.min(100, Math.max(0, nextMotion));
      }
    } catch (error) {
      // Ignore storage failures for local settings.
    }
  }

  persistConsistencySettings() {
    try {
      localStorage.setItem(this.consistencySettingsStorageKey, JSON.stringify({
        tempoBpm: this.consistencyTempoBpm,
        strictnessPercent: this.consistencyStrictnessPercent,
        motionBlendPercent: this.consistencyMotionBlendPercent
      }));
    } catch (error) {
      // Ignore storage failures for local settings.
    }
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
          <div class="consistency-slider-meta">
            <label for="consistency-speed-slider">Tempo</label>
            <span class="consistency-slider-value consistency-speed-value">100 bpm</span>
          </div>
          <input id="consistency-speed-slider" type="range" min="30" max="170" step="5" value="100" />
        </div>
        <div class="consistency-slider-row">
          <div class="consistency-slider-meta">
            <label for="consistency-strictness-slider">Strenge</label>
            <span class="consistency-slider-value consistency-strictness-value">100%</span>
          </div>
          <input id="consistency-strictness-slider" type="range" min="70" max="160" step="5" value="100" />
        </div>
        <div class="consistency-slider-row">
          <div class="consistency-slider-meta">
            <label for="consistency-motion-slider">Kurve</label>
            <span class="consistency-slider-value consistency-motion-value">0%</span>
          </div>
          <input id="consistency-motion-slider" type="range" min="0" max="100" step="5" value="0" />
        </div>
        <p class="consistency-status">Die Bewertung aktualisiert sich fortlaufend.</p>
      `;

      const speedSlider = this.consistencyInfoEl.querySelector('#consistency-speed-slider');
      const strictnessSlider = this.consistencyInfoEl.querySelector('#consistency-strictness-slider');
      const motionSlider = this.consistencyInfoEl.querySelector('#consistency-motion-slider');
      const speedLabel = this.consistencyInfoEl.querySelector('label[for="consistency-speed-slider"]');
      const strictnessLabel = this.consistencyInfoEl.querySelector('label[for="consistency-strictness-slider"]');
      const motionLabel = this.consistencyInfoEl.querySelector('label[for="consistency-motion-slider"]');
      const speedValue = this.consistencyInfoEl.querySelector('.consistency-speed-value');
      const strictnessValue = this.consistencyInfoEl.querySelector('.consistency-strictness-value');
      const motionValue = this.consistencyInfoEl.querySelector('.consistency-motion-value');
      if (speedSlider) {
        speedSlider.value = String(this.consistencyTempoBpm);
        speedSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencyTempoBpm = Number.isFinite(next) ? Math.min(170, Math.max(30, next)) : 100;
          this.persistConsistencySettings();
        });
      }
      if (strictnessSlider) {
        strictnessSlider.value = String(this.consistencyStrictnessPercent);
        strictnessSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencyStrictnessPercent = Number.isFinite(next) ? Math.min(160, Math.max(70, next)) : 100;
          this.persistConsistencySettings();
        });
      }
      if (motionSlider) {
        motionSlider.value = String(this.consistencyMotionBlendPercent);
        motionSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencyMotionBlendPercent = Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0;
          this.persistConsistencySettings();
        });
      }
      const consistencyDescriptions = {
        Tempo: 'Stelle das Tempo der Bewegung ein.',
        Strenge: 'Es wird ein Score angezeigt, der die Ausführungsgenauigkeit der Bewegung bewertet. Hier kannst du seine Strenge einstellen.',
        Kurve: 'Höhere Werte bremsen die Bewegung an den Eckpunkten ab, während niedrigere Werte die Bewegungsgeschwindigkeit überall gleichmäßig halten.'
      };

      if (speedLabel && speedSlider) registerHoverHelp(speedLabel, consistencyDescriptions.Tempo);
      if (strictnessLabel && strictnessSlider) registerHoverHelp(strictnessLabel, consistencyDescriptions.Strenge);
      if (motionLabel && motionSlider) registerHoverHelp(motionLabel, consistencyDescriptions.Kurve);
      if (speedSlider) registerHoverHelp(speedSlider, consistencyDescriptions.Tempo);
      if (strictnessSlider) registerHoverHelp(strictnessSlider, consistencyDescriptions.Strenge);
      if (motionSlider) registerHoverHelp(motionSlider, consistencyDescriptions.Kurve);
      if (speedValue) registerHoverHelp(speedValue, consistencyDescriptions.Tempo);
      if (strictnessValue) registerHoverHelp(strictnessValue, consistencyDescriptions.Strenge);
      if (motionValue) registerHoverHelp(motionValue, consistencyDescriptions.Kurve);
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

  setSquareExerciseHandMode(mode) {
    const next = ['right', 'left', 'both'].includes(mode) ? mode : 'right';
    if (this.squareExerciseHandMode === next) {
      return;
    }
    this.squareExerciseHandMode = next;
    if (this.squareExerciseHandMode === 'both') {
      this.nextTarget = 0;
      this.nextTargetByHand = { left: 0, right: 0 };
      this.completed = false;
    }
    if (this.squareExerciseHandMode !== 'both') {
      this.squareExerciseSyncMode = 'asynchronous';
    }
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setSquareExerciseSyncMode(mode) {
    const next = ['asynchronous', 'synchronous'].includes(mode) ? mode : 'asynchronous';
    this.squareExerciseSyncMode = next;
    if (this.squareExerciseHandMode !== 'both') {
      this.squareExerciseSyncMode = 'asynchronous';
    }
    if (this.squareExerciseHandMode === 'both' && this.squareExerciseSyncMode === 'synchronous') {
      this.nextTarget = 0;
      this.nextTargetByHand = { left: 0, right: 0 };
      this.completed = false;
    }
    this.requestRender();
  }

  setSquareExerciseResolution(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(1.0, Math.max(0.55, next));
    this.squareExerciseResolution = clamped;
    this.symmetricExerciseResolution = clamped;
    this.chapter1CircleDiameter = clamped;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 1, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.buildGrid();
    this.requestRender();
  }

  setSquareExerciseGridResolution(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    const evenValue = Math.max(8, Math.min(24, Math.round(next / 2) * 2));
    this.squareExerciseGridResolution = evenValue;
    this.symmetricExerciseGridResolution = evenValue;
    this.chapter1GridResolution = evenValue;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 1, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setSquareExerciseShape(mode) {
    const next = ['square', 'circle', '0', '1', '2', '3', '4', '5'].includes(mode) ? mode : '0';
    if (this.squareExerciseShape === next) {
      return;
    }
    this.squareExerciseShape = next;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.requestRender();
  }

  buildDigitSegments(digitValue) {
    const segmentDefinitions = {
      a: { x1: 1.2, y1: 1, x2: 6.8, y2: 1 },
      b: { x1: 6.8, y1: 1, x2: 6.8, y2: 5 },
      c: { x1: 6.8, y1: 5, x2: 6.8, y2: 9 },
      d: { x1: 1.2, y1: 9, x2: 6.8, y2: 9 },
      e: { x1: 1.2, y1: 5, x2: 1.2, y2: 9 },
      f: { x1: 1.2, y1: 1, x2: 1.2, y2: 5 },
      g: { x1: 1.2, y1: 5, x2: 6.8, y2: 5 }
    };

    const digitSegments = {
      0: ['a', 'b', 'c', 'd', 'e', 'f'],
      1: ['b', 'c'],
      2: ['a', 'b', 'g', 'e', 'd'],
      3: ['a', 'b', 'g', 'c', 'd'],
      4: ['f', 'g', 'b', 'c'],
      5: ['a', 'f', 'g', 'c', 'd']
    };

    const selected = digitSegments[Number(digitValue)] || [];
    return selected.map((segmentKey) => segmentDefinitions[segmentKey]).filter(Boolean);
  }

  orderDigitTargetsByNearestNeighbor(points, digitValue = null, side = null) {
    if (!Array.isArray(points) || points.length === 0) {
      return [];
    }

    const uniquePoints = [];
    const seen = new Set();
    for (const point of points) {
      if (!point || !Number.isInteger(point.row) || !Number.isInteger(point.col)) {
        continue;
      }
      const key = `${point.row}:${point.col}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      uniquePoints.push({ row: point.row, col: point.col });
    }

    if (uniquePoints.length === 0) {
      return [];
    }

    const getNeighborCount = (point) => {
      let count = 0;
      for (const candidate of uniquePoints) {
        if (candidate === point) {
          continue;
        }
        const rowDelta = Math.abs(candidate.row - point.row);
        const colDelta = Math.abs(candidate.col - point.col);
        if (rowDelta <= 1 && colDelta <= 1) {
          count += 1;
        }
      }
      return count;
    };

    const getStartCandidate = () => {
      const digit = Number(digitValue);
      const openCornerCandidates = uniquePoints.filter((point) => getNeighborCount(point) === 1);

      if (digit === 0) {
        const topRow = Math.min(...uniquePoints.map((point) => point.row));
        const topCandidates = uniquePoints.filter((point) => point.row === topRow);
        if (topCandidates.length > 0) {
          if (side === 'left') {
            return topCandidates.reduce((best, point) => (point.col < best.col ? point : best), topCandidates[0]);
          }
          if (side === 'right') {
            return topCandidates.reduce((best, point) => (point.col > best.col ? point : best), topCandidates[0]);
          }
        }
      }

      if ([2, 3, 4, 5].includes(digit) && openCornerCandidates.length > 0) {
        const minCol = Math.min(...uniquePoints.map((point) => point.col));
        const maxCol = Math.max(...uniquePoints.map((point) => point.col));
        const centerColumn = (minCol + maxCol) / 2;

        const sideFilteredCandidates = (() => {
          if (digit === 4 && side === 'left') {
            return openCornerCandidates.filter((point) => point.col <= centerColumn);
          }
          if (digit === 4 && side === 'right') {
            return openCornerCandidates.filter((point) => point.col >= centerColumn);
          }
          return openCornerCandidates;
        })();

        const candidates = sideFilteredCandidates.length > 0 ? sideFilteredCandidates : openCornerCandidates;

        return candidates.reduce((best, point) => {
          const edgePriority = (point.row === 0 ? 0 : 1) + (point.col === 0 ? 0 : 1);
          const bestPriority = (best.row === 0 ? 0 : 1) + (best.col === 0 ? 0 : 1);
          const distanceToCenter = Math.abs(point.col - centerColumn);
          const bestDistanceToCenter = Math.abs(best.col - centerColumn);

          if (edgePriority < bestPriority) {
            return point;
          }

          if (edgePriority === bestPriority) {
            if (distanceToCenter < bestDistanceToCenter - 1e-9) {
              return point;
            }

            if (Math.abs(distanceToCenter - bestDistanceToCenter) <= 1e-9) {
              if (point.row < best.row || (point.row === best.row && point.col < best.col)) {
                return point;
              }
            }
          }

          return best;
        }, candidates[0]);
      }

      return uniquePoints.reduce((best, point) => {
        if (point.row < best.row || (point.row === best.row && point.col < best.col)) {
          return point;
        }
        return best;
      }, uniquePoints[0]);
    };

    const start = getStartCandidate();

    const ordered = [start];
    const remaining = uniquePoints.filter((point) => point !== start);
    let current = start;

    while (remaining.length > 0) {
      let bestCandidate = null;
      let bestDistance = Infinity;
      let bestTieBreak = Infinity;

      for (const candidate of remaining) {
        const dx = candidate.col - current.col;
        const dy = candidate.row - current.row;
        const distance = Math.hypot(dx, dy);
        const tieBreak = Math.abs(candidate.row - current.row) + Math.abs(candidate.col - current.col);

        if (distance < bestDistance - 1e-9 || (Math.abs(distance - bestDistance) <= 1e-9 && tieBreak < bestTieBreak)) {
          bestCandidate = candidate;
          bestDistance = distance;
          bestTieBreak = tieBreak;
        }
      }

      if (!bestCandidate) {
        break;
      }

      ordered.push(bestCandidate);
      current = bestCandidate;
      const index = remaining.indexOf(bestCandidate);
      if (index >= 0) {
        remaining.splice(index, 1);
      }
    }

    return ordered;
  }

  buildDigitTargets(digitValue, side, rows, cols) {
    const numericDigit = Number(digitValue);
    if (!Number.isInteger(numericDigit) || numericDigit < 0 || numericDigit > 5) {
      return [];
    }

    const centerX = this.canvas.width * 0.5;
    const centerY = this.canvas.height * 0.5;
    const digitWidth = 7.2;
    const digitHeight = 10;
    const distanceFactor = Math.min(1.0, Math.max(0.1, Number(this.squareExerciseCenterDistance) || 0.5));
    const sideOffset = this.canvas.width * (0.08 + distanceFactor * 0.18);
    const scale = Math.min(
      (this.canvas.width * 0.44) / digitWidth,
      (this.canvas.height * 0.6) / digitHeight
    );

    const points = [];
    const appendPoint = (x, y) => {
      const offsetX = (x - 3.6) * scale;
      const localX = side === 'left'
        ? centerX - sideOffset - offsetX
        : centerX + sideOffset + offsetX;
      const localY = centerY + (y - 5) * scale;
      const normalizedRow = (localY / this.canvas.height) * rows;
      const row = Math.max(0, Math.min(rows - 1, Math.round(normalizedRow - 0.5)));
      const col = this.getGridColumnForX(localX);
      if (Number.isFinite(row) && Number.isFinite(col)) {
        points.push({ row, col });
      }
    };

    this.buildDigitSegments(numericDigit).forEach(({ x1, y1, x2, y2 }) => {
      const distance = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(8, Math.ceil(distance * 2.2));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        appendPoint(x, y);
      }
    });

    return this.orderDigitTargetsByNearestNeighbor(points, numericDigit, side);
  }

  setPointExerciseEditMode(value) {
    const next = Boolean(value);
    if (this.pointExerciseEditMode === next) {
      return;
    }
    this.pointExerciseEditMode = next;
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setPointExerciseSelectedSlot(value) {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 1 || next > 8) {
      return;
    }
    this.pointExerciseSelectedSlot = next;
    const saved = this.pointExerciseSavedSlots[next];
    const savedSequence = Array.isArray(saved)
      ? saved
      : (saved && typeof saved === 'object' && Array.isArray(saved.sequence) ? saved.sequence : []);
    if (savedSequence.length > 0 && !this.pointExerciseEditMode) {
      this.pointExerciseSequence = this.sanitizePointSequence(savedSequence);
      if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
        this.setupLevel();
      }
    }
    this.requestRender();
  }

  resolvePointHandForColumn(col, fallbackHand = this.pointExerciseHand) {
    if (['left', 'right'].includes(fallbackHand)) {
      return fallbackHand;
    }
    const midpoint = Math.max(1, this.gridCols || 16) / 2;
    return Number(col) >= midpoint ? 'left' : 'right';
  }

  setPointExerciseHand(value) {
    const next = ['left', 'right', 'auto'].includes(value) ? value : 'right';
    if (this.pointExerciseHand === next) {
      return;
    }
    this.pointExerciseHand = next;
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
      this.setupLevel();
    }
    this.requestRender();
  }

  applySymmetryToPointSequence() {
    if (!this.pointExerciseSymmetryMode) {
      return this.pointExerciseSequence;
    }

    const seen = new Set();
    const nextSequence = [];
    this.pointExerciseSequence.forEach((point) => {
      if (!point || !Number.isFinite(Number(point.row)) || !Number.isFinite(Number(point.col))) {
        return;
      }
      const row = Math.max(0, Math.min(this.gridRows - 1, Number(point.row)));
      const col = Math.max(0, Math.min(this.gridCols - 1, Number(point.col)));
      const hand = ['left', 'right'].includes(point.hand)
        ? point.hand
        : this.resolvePointHandForColumn(col, this.pointExerciseHand);
      const key = `${row}:${col}:${hand}`;
      if (!seen.has(key)) {
        seen.add(key);
        nextSequence.push({ row, col, hand });
      }
      if (['left', 'right'].includes(hand)) {
        const mirroredCol = Math.max(0, Math.min(this.gridCols - 1, this.gridCols - 1 - col));
        const mirroredHand = hand === 'left' ? 'right' : 'left';
        const mirroredKey = `${row}:${mirroredCol}:${mirroredHand}`;
        if (!seen.has(mirroredKey)) {
          seen.add(mirroredKey);
          nextSequence.push({ row, col: mirroredCol, hand: mirroredHand });
        }
      }
    });

    this.pointExerciseSequence = this.sanitizePointSequence(nextSequence);
    return this.pointExerciseSequence;
  }

  setPointExerciseSymmetryMode(value) {
    const next = Boolean(value);
    if (this.pointExerciseSymmetryMode === next) {
      return;
    }

    this.pointExerciseSymmetryMode = next;
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
      this.setupLevel();
    }
    this.requestRender();
  }

  getPalindromeTraversalSequence(length) {
    const targetCount = Math.max(1, Number(length) || 0);
    const sequence = [];
    for (let index = 0; index < targetCount; index += 1) {
      sequence.push(index);
    }
    for (let index = targetCount - 2; index >= 1; index -= 1) {
      sequence.push(index);
    }
    return sequence.length > 0 ? sequence : [0];
  }

  resetPointExerciseTraversalState() {
    this.nextTargetByHand = { left: 0, right: 0 };
    const targetCount = Math.max(
      1,
      Number(this.targets?.length || this.pointExerciseSequence?.length || 0)
    );
    const nextSequence = this.pointExercisePalindromMode
      ? this.getPalindromeTraversalSequence(targetCount)
      : Array.from({ length: targetCount }, (_, index) => index);

    this.pointExerciseTraversalSequence = nextSequence;
    this.pointExerciseTraversalCursor = 0;
    this.nextTarget = nextSequence[0] ?? 0;
    this.pointExerciseCurrentIndex = this.nextTarget;
    this.pointExerciseTraversalDirection = 1;
    this.pointExercisePalindromeIndex = this.nextTarget;
    this.pointExercisePalindromeDirection = 1;
  }

  advancePointExerciseTarget(stepTargets) {
    if (!Array.isArray(stepTargets) || stepTargets.length === 0) {
      return;
    }

    if (!this.pointExercisePalindromMode) {
      this.nextTarget += stepTargets.length;
      if (this.nextTarget >= this.targets.length) {
        this.nextTarget = 0;
      }
      this.pointExerciseCurrentIndex = this.nextTarget;
      this.pointExercisePalindromeIndex = this.nextTarget;
      this.pointExercisePalindromeDirection = this.pointExerciseTraversalDirection;
      return;
    }

    const targetCount = Math.max(1, (this.targets && this.targets.length) || 0);
    const sequence = this.pointExerciseTraversalSequence && Array.isArray(this.pointExerciseTraversalSequence)
      ? this.pointExerciseTraversalSequence
      : this.getPalindromeTraversalSequence(targetCount);

    if (!Array.isArray(sequence) || sequence.length === 0) {
      this.resetPointExerciseTraversalState();
      return;
    }

    this.pointExerciseTraversalSequence = sequence;
    const stepSize = Math.max(1, stepTargets.length);
    this.pointExerciseTraversalCursor = (this.pointExerciseTraversalCursor + stepSize) % sequence.length;
    this.nextTarget = sequence[this.pointExerciseTraversalCursor] ?? 0;
    this.pointExerciseCurrentIndex = this.nextTarget;
    this.pointExercisePalindromeIndex = this.nextTarget;
    this.pointExerciseTraversalDirection = this.pointExerciseTraversalCursor === 0 ? 1 : this.pointExerciseTraversalDirection;
    this.pointExercisePalindromeDirection = this.pointExerciseTraversalDirection;
  }

  setPointExercisePalindromMode(value) {
    this.pointExercisePalindromMode = Boolean(value);
    this.nextTargetByHand = { left: 0, right: 0 };
    this.resetPointExerciseTraversalState();
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1 && this.targets.length > 0) {
      this.pointExerciseCurrentIndex = this.nextTarget;
      this.pointExercisePalindromeIndex = this.nextTarget;
    }
    this.requestRender();
  }

  setPointExerciseSequentialMode(value) {
    const next = ['independent', 'sequential', 'simultaneous'].includes(value)
      ? value
      : (typeof value === 'boolean' ? (value ? 'sequential' : 'independent') : 'sequential');
    if (this.pointExerciseSequentialMode === next) {
      return;
    }
    this.pointExerciseSequentialMode = next;
    this.nextTargetByHand = { left: 0, right: 0 };
    this.resetPointExerciseTraversalState();
    this.requestRender();
  }

  sanitizePointSequence(sequence) {
    if (!Array.isArray(sequence)) {
      return [];
    }

    const normalized = [];
    const seen = new Set();
    const maxRow = Math.max(1, this.gridRows || 12) - 1;
    const maxCol = Math.max(1, this.gridCols || 16) - 1;

    sequence.forEach((point) => {
      if (!point || !Number.isFinite(Number(point.row)) || !Number.isFinite(Number(point.col))) {
        return;
      }
      const row = Math.max(0, Math.min(maxRow, Math.round(Number(point.row))));
      const col = Math.max(0, Math.min(maxCol, Math.round(Number(point.col))));
      const hand = ['left', 'right'].includes(point.hand)
        ? point.hand
        : this.resolvePointHandForColumn(col, this.pointExerciseHand);
      const key = `${row}:${col}:${hand}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      normalized.push({ row, col, hand });
    });

    return normalized;
  }

  registerPointExerciseFlash(point, nowMs = performance.now()) {
    if (!point || !Number.isFinite(Number(point.row)) || !Number.isFinite(Number(point.col))) {
      return;
    }

    const row = Math.max(0, Math.min(this.gridRows - 1, Math.round(Number(point.row))));
    const col = Math.max(0, Math.min(this.gridCols - 1, Math.round(Number(point.col))));
    const hand = ['left', 'right'].includes(point.hand)
      ? point.hand
      : this.resolvePointHandForColumn(col, this.pointExerciseHand);

    this.pointExerciseFlashPoints.push({
      row,
      col,
      hand,
      index: row * this.gridCols + col,
      startedAt: nowMs,
      durationMs: this.pointExerciseFlashDurationMs
    });

    if (this.pointExerciseFlashPoints.length > 16) {
      this.pointExerciseFlashPoints.shift();
    }
  }

  setPointExerciseSequence(value) {
    this.pointExerciseSequence = this.sanitizePointSequence(value);
    this.resetPointExerciseTraversalState();
    this.nextTargetByHand = { left: 0, right: 0 };
    if (!this.pointExerciseSequence.some((point) => ['left', 'right'].includes(point.hand))) {
      this.pointExerciseSequence = this.pointExerciseSequence.map((point) => ({ ...point, hand: this.pointExerciseHand }));
    }
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setPointExerciseSavedSlots(value) {
    if (!value || typeof value !== 'object') {
      return;
    }
    const sanitized = {};
    Object.entries(value).forEach(([key, slot]) => {
      const normalizedKey = Number(key);
      const resolvedKey = Number.isInteger(normalizedKey) && normalizedKey >= 1 && normalizedKey <= 8
        ? normalizedKey
        : (Number.isInteger(normalizedKey) && normalizedKey >= 0 && normalizedKey <= 7 ? normalizedKey + 1 : null);
      if (resolvedKey === null) {
        return;
      }
      if (Array.isArray(slot)) {
        sanitized[resolvedKey] = {
          sequence: this.sanitizePointSequence(slot),
          gridResolution: this.chapter1GridResolution || this.squareExerciseGridResolution || 8,
          resolution: this.chapter1CircleDiameter || this.squareExerciseResolution || 1,
          hand: this.pointExerciseHand,
          sequentialMode: this.pointExerciseSequentialMode,
          palindromMode: Boolean(this.pointExercisePalindromMode)
        };
        return;
      }
      if (slot && typeof slot === 'object') {
        const sequence = Array.isArray(slot.sequence) ? this.sanitizePointSequence(slot.sequence) : [];
        const gridResolution = Number.isFinite(Number(slot.gridResolution))
          ? Math.max(8, Math.min(24, Math.round(Number(slot.gridResolution) / 2) * 2))
          : (this.chapter1GridResolution || this.squareExerciseGridResolution || 8);
        const resolution = Number.isFinite(Number(slot.resolution))
          ? Math.min(1.0, Math.max(0.55, Number(slot.resolution)))
          : (this.chapter1CircleDiameter || this.squareExerciseResolution || 1);
        const hand = ['left', 'right'].includes(slot.hand) ? slot.hand : this.pointExerciseHand;
        const sequentialMode = ['independent', 'sequential', 'simultaneous'].includes(slot.sequentialMode)
          ? slot.sequentialMode
          : (['independent', 'sequential', 'simultaneous'].includes(slot.sequenceMode)
            ? slot.sequenceMode
            : (typeof slot.sequentialMode === 'boolean'
              ? (slot.sequentialMode ? 'sequential' : 'independent')
              : (typeof slot.sequenceMode === 'boolean' ? (slot.sequenceMode ? 'sequential' : 'independent') : this.pointExerciseSequentialMode)));
        const palindromMode = typeof slot.palindromMode === 'boolean'
          ? slot.palindromMode
          : (typeof slot.palindromeMode === 'boolean' ? slot.palindromeMode : Boolean(this.pointExercisePalindromMode));
        sanitized[resolvedKey] = { sequence, gridResolution, resolution, hand, sequentialMode, palindromMode };
      }
    });
    this.pointExerciseSavedSlots = sanitized;
    this.requestRender();
  }

  addPointToSequenceAtPosition(x, y) {
    const canvasX = Number(x);
    const canvasY = Number(y);
    if (!Number.isFinite(canvasX) || !Number.isFinite(canvasY)) {
      return false;
    }
    const row = Math.max(0, Math.min(this.gridRows - 1, Math.round((canvasY / this.canvas.height) * this.gridRows - 0.5)));
    const baseCol = this.getGridColumnForX(canvasX);
    const resolvedHand = this.resolvePointHandForColumn(baseCol, this.pointExerciseHand);
    const addPoint = (hand, col) => {
      const point = { row, col, hand };
      const existing = this.pointExerciseSequence.some((candidate) => candidate.row === point.row && candidate.col === point.col && candidate.hand === point.hand);
      if (!existing) {
        this.pointExerciseSequence.push(point);
        this.registerPointExerciseFlash(point);
      }
      return !existing;
    };

    const addMirroredPoint = (sourceHand, sourceCol) => {
      if (!['left', 'right'].includes(sourceHand)) {
        return false;
      }
      const mirroredCol = Math.max(0, Math.min(this.gridCols - 1, this.gridCols - 1 - sourceCol));
      const mirroredHand = sourceHand === 'left' ? 'right' : 'left';
      const mirrorPoint = { row, col: mirroredCol, hand: mirroredHand };
      const existingMirror = this.pointExerciseSequence.some((candidate) => candidate.row === mirrorPoint.row && candidate.col === mirrorPoint.col && candidate.hand === mirrorPoint.hand);
      if (!existingMirror) {
        this.pointExerciseSequence.push(mirrorPoint);
        this.registerPointExerciseFlash(mirrorPoint);
        return true;
      }
      return false;
    };

    const addedFirst = addPoint(resolvedHand, baseCol);
    let addedMirror = false;
    if (this.pointExerciseSymmetryMode && ['left', 'right'].includes(resolvedHand)) {
      addedMirror = addMirroredPoint(resolvedHand, baseCol);
    }

    if (!addedFirst && !addedMirror) {
      return false;
    }
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
      this.setupLevel();
    }
    this.requestRender();
    return true;
  }

  setSquareExerciseCenterDistance(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(1.0, Math.max(0.1, next));
    this.squareExerciseCenterDistance = clamped;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setSymmetricExerciseResolution(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(1.0, Math.max(0.55, next));
    this.symmetricExerciseResolution = clamped;
    this.squareExerciseResolution = clamped;
    this.chapter1CircleDiameter = clamped;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 1, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.buildGrid();
    this.requestRender();
  }

  setSymmetricExerciseGridResolution(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    const evenValue = Math.max(8, Math.min(24, Math.round(next / 2) * 2));
    this.symmetricExerciseGridResolution = evenValue;
    this.squareExerciseGridResolution = evenValue;
    this.chapter1GridResolution = evenValue;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 1, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setSymmetricExerciseCenterDistance(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(1.0, Math.max(0.1, next));
    this.symmetricExerciseCenterDistance = clamped;
    this.squareExerciseCenterDistance = clamped;
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 1, 2, 3, 4].includes(this.level)) {
      this.setupLevel();
    }
    this.requestRender();
  }

  setSymmetricExerciseOrientation(mode) {
    const next = ['vertical', 'horizontal', 'square', 'circle', 'diagonal'].includes(mode) ? mode : 'vertical';
    if (this.symmetricExerciseOrientation === next) {
      return;
    }
    this.symmetricExerciseOrientation = next;
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1) {
      this.setupLevel();
    }
    this.requestRender();
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
    const chapter1ResolutionFactor = this.chapter === 1 && Number.isInteger(this.level)
      ? ([0, 1, 2, 3, 4].includes(this.level)
        ? (this.chapter1CircleDiameter ?? this.squareExerciseResolution ?? this.symmetricExerciseResolution ?? 1)
        : 1)
      : 1;
    const resolutionFactor = chapter1ResolutionFactor;
    const radiusX = spacingX / 2 * 0.98 * resolutionFactor;
    const radiusY = spacingY / 2 * 0.98 * resolutionFactor;

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
    this.updateTargetHandProgress();
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
        const existing = this.targetIndexByCircle.get(circleIndex) || [];
        existing.push(targetIndex);
        this.targetIndexByCircle.set(circleIndex, existing);
      });
    }
  }

  updateTargetHandProgress() {
    const counts = { left: 0, right: 0 };
    for (const target of this.targets) {
      if (!target || !target.hand || !['left', 'right'].includes(target.hand)) {
        continue;
      }
      target.handProgress = counts[target.hand];
      counts[target.hand] += 1;
    }
  }

  getIndependentHandTraversalSequence(hand) {
    if (!['left', 'right'].includes(hand)) {
      return [];
    }

    const handTargetIndexes = this.targets.reduce((indexes, target, index) => {
      if (target && target.hand === hand) {
        indexes.push(index);
      }
      return indexes;
    }, []);

    if (handTargetIndexes.length === 0) {
      return [];
    }

    if (!this.pointExercisePalindromMode) {
      return handTargetIndexes;
    }

    const sequence = [...handTargetIndexes];
    for (let index = handTargetIndexes.length - 2; index >= 1; index -= 1) {
      sequence.push(handTargetIndexes[index]);
    }
    return sequence;
  }

  getCurrentTargetForHand(hand) {
    if (!['left', 'right'].includes(hand)) {
      return null;
    }

    if (this.pointExerciseSequentialMode === 'independent') {
      const sequence = this.getIndependentHandTraversalSequence(hand);
      if (sequence.length === 0) {
        return null;
      }
      const cursor = Math.max(0, Math.min(sequence.length - 1, this.nextTargetByHand[hand] ?? 0));
      const targetIndex = sequence[cursor];
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= this.targets.length) {
        return null;
      }
      return this.targets[targetIndex] || null;
    }

    const targetProgress = this.nextTargetByHand[hand] ?? 0;
    for (let i = 0; i < this.targets.length; i += 1) {
      const target = this.targets[i];
      if (!target || target.hand !== hand) {
        continue;
      }
      if (target.handProgress === targetProgress) {
        return target;
      }
    }

    for (let i = this.targets.length - 1; i >= 0; i -= 1) {
      const target = this.targets[i];
      if (target && target.hand === hand) {
        return target;
      }
    }

    return null;
  }

  getCurrentTargetForCircle(circleIndex) {
    if (!Number.isInteger(circleIndex) || circleIndex < 0) {
      return null;
    }

    const targetIndexes = this.targetIndexByCircle.get(circleIndex) || [];
    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1 && ['independent', 'sequential', 'simultaneous'].includes(this.pointExerciseSequentialMode)) {
      if (this.pointExerciseSequentialMode === 'independent') {
        const candidates = ['left', 'right']
          .map((hand) => this.getCurrentTargetForHand(hand))
          .filter((target) => target && (target.index === circleIndex || target.leftIndex === circleIndex || target.rightIndex === circleIndex));
        return candidates[0] ?? null;
      }

      const activeTargetIndexes = new Set();
      if (this.pointExerciseSequentialMode === 'simultaneous') {
        const currentTarget = this.targets[this.nextTarget] || null;
        [this.nextTarget].filter((index) => Number.isInteger(index) && index >= 0 && index < this.targets.length).forEach((index) => {
          activeTargetIndexes.add(index);
        });
        for (let offset = 1; offset < this.targets.length; offset += 1) {
          const candidateIndex = this.nextTarget + offset;
          const candidateTarget = this.targets[candidateIndex];
          if (!candidateTarget || !currentTarget || !currentTarget.hand || !candidateTarget.hand || currentTarget.hand === 'both' || candidateTarget.hand === 'both') {
            continue;
          }
          if (candidateTarget.hand !== currentTarget.hand && currentTarget.hand !== candidateTarget.hand) {
            if (Number.isInteger(candidateIndex) && candidateIndex >= 0 && candidateIndex < this.targets.length) {
              activeTargetIndexes.add(candidateIndex);
              break;
            }
          }
        }
      } else {
        if (Number.isInteger(this.nextTarget) && this.nextTarget >= 0 && this.nextTarget < this.targets.length) {
          activeTargetIndexes.add(this.nextTarget);
        }
      }

      const candidates = Array.from(activeTargetIndexes)
        .map((index) => this.targets[index])
        .filter((target) => target && Number.isInteger(target.index));

      const exactMatch = candidates.find((target) => target.index === circleIndex || target.leftIndex === circleIndex || target.rightIndex === circleIndex);
      if (exactMatch) {
        return exactMatch;
      }

      const currentTarget = this.targets[this.nextTarget] || null;
      if (currentTarget && targetIndexes.includes(this.nextTarget) && (currentTarget.index === circleIndex || currentTarget.leftIndex === circleIndex || currentTarget.rightIndex === circleIndex)) {
        return currentTarget;
      }
      return null;
    }

    if (this.squareExerciseHandMode === 'both') {
      for (const hand of ['left', 'right']) {
        const target = this.getCurrentTargetForHand(hand);
        if (!target) {
          continue;
        }
        const targetIndex = this.targets.indexOf(target);
        if (targetIndex !== -1 && targetIndexes.includes(targetIndex)) {
          return target;
        }
      }
      return null;
    }

    const currentTarget = this.targets[this.nextTarget] || null;
    if (!currentTarget || !targetIndexes.includes(this.nextTarget)) {
      return null;
    }
    return currentTarget;
  }

  advanceTargetForHand(hand) {
    if (!['left', 'right'].includes(hand)) {
      return;
    }

    if (this.pointExerciseSequentialMode === 'independent') {
      const sequence = this.getIndependentHandTraversalSequence(hand);
      if (sequence.length === 0) {
        this.nextTargetByHand[hand] = 0;
        return;
      }
      const current = this.nextTargetByHand[hand] ?? 0;
      const nextCursor = (current + 1) % sequence.length;
      this.nextTargetByHand[hand] = nextCursor;
      const nextTarget = this.targets[sequence[nextCursor]] || null;
      if (nextTarget) {
        this.pointExerciseCurrentIndex = nextTarget.index ?? nextTarget.leftIndex ?? nextTarget.rightIndex ?? this.pointExerciseCurrentIndex;
      }
      return;
    }

    const current = this.nextTargetByHand[hand] ?? 0;
    const total = this.targets.filter((target) => target && target.hand === hand).length;
    this.nextTargetByHand[hand] = total > 0 ? ((current + 1) % total) : 0;
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

  ensureAudioEngine() {
    if (typeof window === 'undefined') {
      return null;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioCtor();
      this.audioMasterGain = this.audioContext.createGain();
      this.audioMasterGain.gain.value = 0.35 * this.alternatingExerciseVolume;
      this.audioMasterGain.connect(this.audioContext.destination);

      this.audioVoices = Array.from({ length: this.audioVoiceCount }, () => ({
        active: false,
        lastUsedAt: 0
      }));
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  setAlternatingExerciseVolume(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    this.alternatingExerciseVolume = Math.max(0, Math.min(1, next));
    if (this.audioMasterGain) {
      this.audioMasterGain.gain.value = 0.35 * this.alternatingExerciseVolume;
    }
  }

  setActiveTouchFadeEnabled(enabled) {
    this.activeTouchFadeEnabled = Boolean(enabled);
    if (!this.activeTouchFadeEnabled) {
      this.activeTouchFadeByHand.left.clear();
      this.activeTouchFadeByHand.right.clear();
      this.activeTouchCircleByHand.left.clear();
      this.activeTouchCircleByHand.right.clear();
    }
    this.requestRender();
  }

  setAlternatingExerciseScaleMode(value) {
    const normalized = typeof value === 'string' ? value.toLowerCase() : '';
    if (normalized === 'major' || normalized === 'dur') {
      this.alternatingScaleMode = 'major';
      return;
    }
    if (normalized === 'pentatonic' || normalized === 'pentatonik') {
      this.alternatingScaleMode = 'pentatonic';
      return;
    }
    this.alternatingScaleMode = 'chromatic';
  }

  setAlternatingExerciseStartNote(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }
    this.alternatingExerciseStartNote = Math.max(36, Math.min(60, Math.round(next)));
  }

  setAlternatingExerciseFrequencyModulation(enabled) {
    this.alternatingExerciseFrequencyModulation = Boolean(enabled);
  }

  setAlternatingExerciseAxisSwap(enabled) {
    this.alternatingExerciseAxisSwap = Boolean(enabled);
  }

  getAlternatingScaleMidiOffset(columnIndex) {
    const safeColumn = Math.max(0, Number(columnIndex) || 0);
    const chromatic = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const major = [0, 2, 4, 5, 7, 9, 11];
    const pentatonic = [0, 2, 4, 7, 9];
    const selected = this.alternatingScaleMode === 'major' ? major : this.alternatingScaleMode === 'pentatonic' ? pentatonic : chromatic;
    const octave = Math.floor(safeColumn / selected.length);
    const scaleIndex = safeColumn % selected.length;
    return octave * 12 + selected[scaleIndex];
  }

  triggerTouchToneForCircleIndex(circleIndex, hand) {
    if (!Number.isInteger(circleIndex) || circleIndex < 0 || circleIndex >= this.grid.length) {
      return;
    }

    const activeSet = this.activeTouchCircleByHand[hand] || new Set();
    if (activeSet.has(circleIndex)) {
      return;
    }
    activeSet.add(circleIndex);
    this.activeTouchCircleByHand[hand] = activeSet;

    const ctx = this.ensureAudioEngine();
    if (!ctx || !this.audioMasterGain || !this.grid[circleIndex]) {
      return;
    }

    const nowMs = performance.now();
    const lastAt = this.lastAudioTriggerAtByCircle.get(circleIndex) || -Infinity;
    if (nowMs - lastAt < this.audioTriggerCooldownMs) {
      return;
    }
    this.lastAudioTriggerAtByCircle.set(circleIndex, nowMs);

    const circle = this.grid[circleIndex];
    const leftToRightColumn = Math.max(0, Math.min(this.gridCols - 1, this.gridCols - 1 - circle.col));
    const yFactor = Math.max(0, Math.min(1, circle.y / Math.max(1, this.canvas.height)));
    const xFactor = Math.max(0, Math.min(1, circle.x / Math.max(1, this.canvas.width)));
    const verticalIndex = Math.max(0, Math.min(this.gridRows - 1, Math.round((1 - yFactor) * Math.max(this.gridRows - 1, 0))));
    const pitchIndex = this.alternatingExerciseAxisSwap ? verticalIndex : leftToRightColumn;
    const scaleOffset = this.getAlternatingScaleMidiOffset(pitchIndex);
    const midiPitch = this.alternatingExerciseStartNote + scaleOffset;
    const frequency = 440 * Math.pow(2, (midiPitch - 69) / 12);
    const volume = this.alternatingExerciseAxisSwap
      ? 0.02 + xFactor * 0.22
      : 0.03 + yFactor * 0.18;
    const attack = this.alternatingExerciseAxisSwap
      ? 0.01 + (1 - xFactor) * 0.05
      : 0.015 + (1 - yFactor) * 0.04;
    const decay = this.alternatingExerciseAxisSwap
      ? 0.18 + (1 - xFactor) * 1.8
      : 0.18 + yFactor * 1.6;
    const noteDuration = attack + decay + 0.09;

    const voiceSlot = this.audioVoices.find((voice) => !voice.active)
      || this.audioVoices.reduce((current, candidate) => (candidate.lastUsedAt < current.lastUsedAt ? candidate : current), this.audioVoices[0]);
    if (!voiceSlot) {
      return;
    }
    voiceSlot.active = true;
    voiceSlot.lastUsedAt = nowMs;

    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + noteDuration);

    const noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.12)), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i += 1) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.35;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1600;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + noteDuration);

    const startAt = ctx.currentTime;

    let modulatorOscillator = null;
    let modulatorGain = null;
    if (this.alternatingExerciseFrequencyModulation) {
      const harmonicRatios = [0.5, 2 / 3, 1, 4 / 3, 3 / 2, 2];
      const rowCluster = Math.max(0, Math.min(harmonicRatios.length - 1, Math.round(circle.row / Math.max(1, this.gridRows / harmonicRatios.length))));
      const yBias = 0.5 + yFactor * 0.9;
      const ratioIndex = (rowCluster + Math.floor(yFactor * harmonicRatios.length)) % harmonicRatios.length;
      const ratio = harmonicRatios[ratioIndex];
      const modulatorFrequency = Math.max(2, frequency * ratio * (0.8 + yBias * 0.3));
      const modulationDepth = 5 + yFactor * 18;

      modulatorOscillator = ctx.createOscillator();
      modulatorOscillator.type = 'sine';
      modulatorOscillator.frequency.setValueAtTime(modulatorFrequency, startAt);

      modulatorGain = ctx.createGain();
      modulatorGain.gain.setValueAtTime(modulationDepth, startAt);

      modulatorOscillator.connect(modulatorGain);
      modulatorGain.connect(oscillator.frequency);

      modulatorOscillator.start(startAt);
      modulatorOscillator.stop(startAt + noteDuration + 0.03);
    }

    oscillator.connect(mainGain);
    mainGain.connect(this.audioMasterGain);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioMasterGain);

    oscillator.start(startAt);
    oscillator.stop(startAt + noteDuration + 0.03);
    noiseSource.start(startAt);
    noiseSource.stop(startAt + noteDuration + 0.03);

    setTimeout(() => {
      voiceSlot.active = false;
      if (modulatorOscillator) {
        modulatorOscillator.disconnect();
      }
      if (modulatorGain) {
        modulatorGain.disconnect();
      }
    }, noteDuration * 1000 + 50);

    if (hand === 'left') {
      // left hand is intentionally mapped with the same position-dependent tone logic; no extra offset applied.
    }
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
        ? Math.min(25, Math.max(-25, value))
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

  normalizeCanvasHorizontalPosition(value, fallback = 0.25) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    if (numeric >= 0 && numeric <= 1) {
      return Math.min(1, Math.max(0, numeric));
    }

    const halfWidth = (this.canvas?.width || 600) / 2;
    const legacyNormalised = Math.abs(numeric) / Math.max(halfWidth, 1);
    return Math.min(1, Math.max(0, legacyNormalised));
  }

  normalizeHandIndependenceHorizontalPosition(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    if (numeric >= 0 && numeric <= 1) {
      return Math.min(1, Math.max(0, numeric));
    }

    const halfWidth = (this.canvas?.width || 600) / 2;
    const legacyNormalised = Math.abs(numeric) / Math.max(halfWidth, 1);
    return Math.min(1, Math.max(0, legacyNormalised));
  }

  getCanvasHorizontalOffsetFromNormalized(value, side = 'right') {
    const normalized = this.normalizeCanvasHorizontalPosition(value, 0);
    const halfWidth = (this.canvas?.width || 600) / 2;
    const offset = normalized * halfWidth;
    return side === 'left' ? -offset : offset;
  }

  setFigureHorizontalOffset(offset) {
    const next = Number(offset);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = this.normalizeCanvasHorizontalPosition(next, this.figureHorizontalOffset ?? 0.25);
    if (Math.abs(this.figureHorizontalOffset - clamped) < 1e-6) {
      return;
    }

    this.figureHorizontalOffset = clamped;
    this.requestRender();
  }

  normalizeCanvasVerticalPosition(value, fallback = 0.5) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    if (numeric >= 0 && numeric <= 1) {
      return Math.min(1, Math.max(0, numeric));
    }

    const legacyNormalised = (numeric / (this.canvas?.height || 600)) + 0.5;
    return Math.min(1, Math.max(0, legacyNormalised));
  }

  getCanvasVerticalOffsetFromNormalized(value) {
    const normalized = this.normalizeCanvasVerticalPosition(value, 0.5);
    return (normalized - 0.5) * (this.canvas?.height || 600);
  }

  setFigureYPosition(yPosition) {
    const next = Number(yPosition);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = this.normalizeCanvasVerticalPosition(next, this.figureYPosition ?? 0.5);
    if (Math.abs(this.figureYPosition - clamped) < 1e-6) {
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

    const renderState = this.getCurrentFigureRenderState();
    this.preserveMotionPhaseOnTempoChange(
      'figureAnimationStart',
      this.figureTempoBpm,
      clamped,
      renderState?.renderSegments || []
    );
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
    const variant = this.dynamicFigureVariant === 'soft' ? 'softD' : 'hardD';
    const pathData = basicFigurePaths[figureName]?.[variant];
    if (!pathData) {
      return null;
    }

    return {
      pathData,
      numberPlannedSegments: (level + 1) * 2
    };
  }

  getHandIndependenceFigureDefinition(level) {
    const figureNames = [
      'Einserfigur',
      'Zweierfigur',
      'Dreierfigur',
      'Viererfigur',
      'Vierviertel',
      'Dreiviertel',
      'Zweiviertel'
    ];
    const beatCounts = [1, 2, 3, 4, 4, 3, 2];
    const figureIndex = Number(level);
    if (!Number.isInteger(figureIndex) || figureIndex < 0 || figureIndex >= figureNames.length) {
      return null;
    }

    const figureName = figureNames[figureIndex];
    const figureSet = figureIndex <= 3 ? basicFigurePaths : basicFigurePathsStyle2;
    const variantKey = this.handIndependenceVariant === 'soft' ? 'softD' : 'hardD';
    const pathData = figureSet[figureName]?.[variantKey] || null;
    const beatCount = beatCounts[figureIndex] || 1;

    return {
      figureName,
      beatCount,
      pathData,
      numberPlannedSegments: beatCount * 2
    };
  }

  setHandIndependenceVariant(variant) {
    this.handIndependenceVariant = variant === 'soft' ? 'soft' : 'hard';
    this.requestRender();
  }

  setHandIndependenceFigureLevel(level) {
    const next = Number(level);
    if (Number.isInteger(next) && next >= 0 && next <= 6) {
      this.handIndependenceFigureLevel = next;
      this.requestRender();
    }
  }

  setHandIndependenceReverse(reverse) {
    this.handIndependenceReverse = Boolean(reverse);
    this.requestRender();
  }

  setHandIndependenceDynamicsVisible(visible) {
    this.handIndependenceDynamicsVisible = Boolean(visible);
    this.requestRender();
  }

  setHandIndependenceCountTimesVisible(visible) {
    this.handIndependenceCountTimesVisible = Boolean(visible);
    this.requestRender();
  }

  drawHandIndependenceCountTimes(state) {
    if (!this.handIndependenceCountTimesVisible || !state) return;
    const count = Math.ceil(state.renderSegments.length / 2);
    const config = state.figureConfigs[0];
    const pathAnchor = this.getPathAnchorPoint(state.renderSegments);
    for (let index = 0; index < count; index += 1) {
      const anchor = this.getFigureAnchorPoint(state.renderSegments, index * 2);
      if (!anchor) continue;
      const anchorX = config.mirrorX ? -anchor.x : anchor.x;
      const pathAnchorX = config.mirrorX ? -pathAnchor.x : pathAnchor.x;
      const x = state.centerX + config.offsetX + (anchorX - pathAnchorX) * state.scaleX;
      const y = state.centerY + this.getCanvasVerticalOffsetFromNormalized(this.handIndependenceFigureY) + (anchor.y - pathAnchor.y) * state.scaleY;
      this.ctx.save();
      this.ctx.font = '400 17px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      this.ctx.strokeText(String(index + 1), x, y - 15);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      this.ctx.fillText(String(index + 1), x, y - 15);
      this.ctx.restore();
    }
  }

  setHandIndependenceFigureParameter(name, value) {
    const setters = {
      scale: (next) => { this.handIndependenceFigureScale = Math.min(1, Math.max(0.2, next)); },
      strokeWidth: (next) => { this.handIndependenceFigureStrokeWidth = Math.min(0.5, Math.max(0.01, next)); },
      figureHardLinearity: (next) => { this.handIndependenceFigureHardLinearity = Math.min(100, Math.max(0, next)); },
      figureSoftTransitionPercent: (next) => { this.handIndependenceFigureSoftTransitionPercent = Math.min(50, Math.max(0, next)); },
      tempoBpm: (next) => { this.handIndependenceSharedTempoBpm = Math.min(120, Math.max(30, next)); },
      sharedTempoBpm: (next) => { this.handIndependenceSharedTempoBpm = Math.min(120, Math.max(30, next)); },
      figureX: (next) => { this.handIndependenceFigureX = this.normalizeHandIndependenceHorizontalPosition(next, this.handIndependenceFigureX ?? 0); },
      figureY: (next) => { this.handIndependenceFigureY = this.normalizeCanvasVerticalPosition(next, this.handIndependenceFigureY ?? 0.5); },
      sharedX: (next) => { this.handIndependenceFigureX = this.normalizeHandIndependenceHorizontalPosition(next, this.handIndependenceFigureX ?? 0); },
      sharedY: (next) => { this.handIndependenceFigureY = this.normalizeCanvasVerticalPosition(next, this.handIndependenceFigureY ?? 0.5); }
    };
    const next = Number(value);
    if (!Number.isFinite(next) || !setters[name]) {
      return;
    }

    if (name === 'tempoBpm' || name === 'sharedTempoBpm') {
      const renderState = this.getHandIndependenceDynamicState();
      this.preserveMotionPhaseOnTempoChange(
        'handIndependenceAnimationStart',
        this.handIndependenceSharedTempoBpm,
        Math.min(120, Math.max(30, next)),
        renderState?.renderSegments || []
      );
    }

    setters[name](next);
    this.requestRender();
  }

  setHandIndependenceTempoRatio(ratio) {
    const allowed = [
      '1:1',
      '2:1',
      '3:1',
      '1:2',
      '1:3',
      '0.5:1',
      '1:0.5',
      '0.25:1',
      '1:0.25',
      '0.125:1',
      '1:0.125'
    ];
    const nextRatio = allowed.includes(ratio) ? ratio : '1:1';
    if (nextRatio !== this.handIndependenceTempoRatio) {
      this.handIndependenceTempoRatio = nextRatio;
      this.handIndependenceAnimationStart = performance.now();
    }
    this.requestRender();
  }

  normalizeHandIndependenceTempoRatio(ratio) {
    const allowed = ['1:1', '2:1', '3:1', '1:2', '1:3', '0.5:1', '1:0.5', '0.25:1', '1:0.25', '0.125:1', '1:0.125'];
    const normalizedRatio = allowed.includes(ratio) ? ratio : '1:1';
    const [first, second] = normalizedRatio.split(':').map(Number);
    if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0 || second <= 0) {
      return { ratio: '1:1', scaleFactor: 1 };
    }

    const scaleFactor = Math.min(first, second);
    const normalizedFirst = first / scaleFactor;
    const normalizedSecond = second / scaleFactor;
    return {
      ratio: `${normalizedFirst}:${normalizedSecond}`,
      scaleFactor
    };
  }

  getHandIndependenceTempoPair() {
    const { ratio, scaleFactor } = this.normalizeHandIndependenceTempoRatio(this.handIndependenceTempoRatio);
    const [first, second] = ratio.split(':').map(Number);
    const base = this.handIndependenceSharedTempoBpm;
    return {
      figure: base * second * scaleFactor,
      shape: base * first * scaleFactor
    };
  }

  setHandIndependenceFigureCornerHeight(index, value) {
    const next = Number(value);
    if (Number.isInteger(index) && index >= 0 && index < 8 && Number.isFinite(next)) {
      this.handIndependenceFigureCornerHeights[index] = Math.min(25, Math.max(-25, next));
      this.requestRender();
    }
  }

  setHandIndependenceShapeParameter(name, value) {
    const numeric = Number(value);
    if (name === 'shape' && ['line', 'circle', 'square', 'L'].includes(value)) {
      this.handIndependenceShape = value;
    } else if (Number.isFinite(numeric)) {
      const limits = {
        length: [1, 50], width: [1, 50], height: [1, 50], rotation: [-180, 180], x: [-200, 200], y: [-200, 200], shapeTempoBpm: [30, 120], linearity: [0, 100]
      };
      const [min, max] = limits[name] || [0, 100];
      const property = `handIndependenceShape${name[0].toUpperCase()}${name.slice(1)}`;
      if (property in this) this[property] = Math.min(max, Math.max(min, numeric));
    }
    this.requestRender();
  }

  getHandIndependenceDynamicState() {
    const figureDefinition = this.getHandIndependenceFigureDefinition(this.handIndependenceFigureLevel);
    if (!figureDefinition || !figureDefinition.pathData) return null;

    const { pathData, numberPlannedSegments } = figureDefinition;
    const originalSegments = this.buildPlannedFigureSegments(pathData, numberPlannedSegments);
    const renderSegments = this.applyDynamicFigureCornerHeights(
      originalSegments,
      this.handIndependenceFigureCornerHeights.slice(0, numberPlannedSegments)
    );
    const baseScale = Math.min(this.canvas.width, this.canvas.height) / 18;
    const halfWidth = this.canvas.width / 2;
    const normalizedX = this.normalizeHandIndependenceHorizontalPosition(this.handIndependenceFigureX, 0);
    const xOffset = normalizedX * halfWidth;
    const rightConfig = { mirrorX: true, offsetX: xOffset };
    const leftConfig = { mirrorX: false, offsetX: -xOffset };
    return {
      pathData,
      renderSegments,
      centerX: this.canvas.width / 2,
      centerY: this.canvas.height / 2,
      scaleX: baseScale * this.handIndependenceFigureScale,
      scaleY: baseScale * this.handIndependenceFigureScale,
      effectiveStrokeWidth: this.handIndependenceFigureStrokeWidth / Math.max(this.handIndependenceFigureScale, 0.2),
      figureConfigs: [this.handIndependenceReverse ? leftConfig : rightConfig],
        handIndependenceSettings: {
          variant: this.handIndependenceVariant,
          xPosition: 0,
          yPosition: this.normalizeCanvasVerticalPosition(this.handIndependenceFigureY, 0.5),
          rotation: 0
        }
    };
  }

  getHandIndependenceShapeState() {
    const length = this.handIndependenceShapeLength;
    const width = this.handIndependenceShapeWidth;
    const height = this.handIndependenceShapeHeight;
    let pathData = `M 0 0 L ${length} 0 L 0 0 Z`;
    if (this.handIndependenceShape === 'circle') {
      pathData = `M 0 0 C ${width} 0 ${width} ${height} 0 ${height} C -${width} ${height} -${width} 0 0 0 Z`;
    } else if (this.handIndependenceShape === 'square') {
      pathData = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} L 0 0 Z`;
    } else if (this.handIndependenceShape === 'L') {
      pathData = `M 0 0 L 0 -${height} L ${width} -${height} L ${width} -${height - 2} L 2 -${height - 2} L 2 0 Z`;
    }
    const renderSegments = this.buildPlannedFigureSegments(pathData, 2);
    const baseScale = Math.min(this.canvas.width, this.canvas.height) / 18;
    const scale = baseScale * 0.25;
    const halfWidth = this.canvas.width / 2;
    const normalizedX = this.normalizeHandIndependenceHorizontalPosition(this.handIndependenceFigureX, 0);
    const xOffset = normalizedX * halfWidth;
    const shapeConfig = this.handIndependenceReverse
      ? { mirrorX: true, offsetX: xOffset }
      : { mirrorX: false, offsetX: -xOffset };
    return {
      pathData, renderSegments, centerX: this.canvas.width / 2, centerY: this.canvas.height / 2,
      scaleX: scale, scaleY: scale,
      effectiveStrokeWidth: this.handIndependenceFigureStrokeWidth / 0.25,
      figureConfigs: [shapeConfig],
      handIndependenceSettings: {
        variant: 'soft',
        xPosition: 0,
        yPosition: this.normalizeCanvasVerticalPosition(this.handIndependenceFigureY, 0.5),
        rotation: this.handIndependenceShapeRotation,
        linearity: 100
      }
    };
  }

  drawHandIndependenceMotionPoint(state, settings) {
    const motionState = this.getFigureMotionState(state.renderSegments, state.scaleX, {
      variant: settings.variant,
      tempoBpm: settings.tempoBpm,
      hardLinearity: this.handIndependenceFigureHardLinearity,
      softTransitionPercent: this.handIndependenceFigureSoftTransitionPercent,
      linearity: 0,
      animationStart: this.handIndependenceAnimationStart
    });
    if (!motionState) return;
    const point = motionState.point;
    const angle = (Number(settings.rotation) || 0) * Math.PI / 180;
    const shapeOffsetX = Number(settings.xPosition) || 0;
    const offsetY = Number(settings.yPosition) || 0;
    const anchor = this.getPathAnchorPoint(state.renderSegments);
    state.figureConfigs.forEach(({ mirrorX, offsetX: figureOffsetX }) => {
      const localX = point.x * state.scaleX;
      const localY = point.y * state.scaleY;
      const rotatedX = Math.cos(angle) * localX - Math.sin(angle) * localY;
      const rotatedY = Math.sin(angle) * localX + Math.cos(angle) * localY;
      const mirroredX = mirrorX ? -rotatedX : rotatedX;
      const anchorX = mirrorX ? -anchor.x : anchor.x;
      const x = state.centerX
        + figureOffsetX
        + (mirrorX ? -shapeOffsetX : shapeOffsetX)
        + (mirroredX - anchorX * state.scaleX)
        + anchorX * state.scaleX;
      const y = state.centerY + this.getCanvasVerticalOffsetFromNormalized(offsetY) + rotatedY - anchor.y * state.scaleY + anchor.y * state.scaleY;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      this.ctx.shadowBlur = 14;
      this.ctx.beginPath();
      this.ctx.arc(x, y, Math.max(6, Math.min(this.canvas.width, this.canvas.height) * 0.016), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
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
      this.dynamicFigureHorizontalOffset = this.normalizeCanvasHorizontalPosition(next, this.dynamicFigureHorizontalOffset ?? 0.25);
      this.requestRender();
    }
  }

  setDynamicFigureYPosition(value) {
    const next = Number(value);
    if (Number.isFinite(next)) {
      this.dynamicFigureYPosition = this.normalizeCanvasVerticalPosition(next, this.dynamicFigureYPosition ?? 0.5);
      this.requestRender();
    }
  }

  setDynamicFigureTempoBpm(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    const clamped = Math.min(120, Math.max(30, next));
    if (this.dynamicFigureTempoBpm === clamped) {
      return;
    }

    const renderState = this.getCurrentDynamicFigureRenderState();
    this.preserveMotionPhaseOnTempoChange(
      'dynamicFigureAnimationStart',
      this.dynamicFigureTempoBpm,
      clamped,
      renderState?.renderSegments || []
    );
    this.dynamicFigureTempoBpm = clamped;
    this.requestRender();
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
      this.dynamicFigureCornerHeights[index] = Math.min(25, Math.max(-25, next));
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
      return Number.isFinite(value) ? Math.min(25, Math.max(-25, value)) : 0;
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
      if (segment.start
        && segment.start.x === originalAnchor.x
        && segment.start.y === originalAnchor.y) {
        segment.start.y = nextY;
        if (segment.control1) {
          segment.control1.y += nextY - originalAnchor.y;
        }
      }
      if (segment.end
        && segment.end.x === originalAnchor.x
        && segment.end.y === originalAnchor.y) {
        segment.end.y = nextY;
        if (segment.control2) {
          segment.control2.y += nextY - originalAnchor.y;
        }
      }
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
        if (segment.control2) {
          segment.control2.y = nextY;
        }
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
      adjustedSegments.forEach((candidate) => {
        adjustMatchingPoints(candidate, originalAnchor, nextY);
      });
      if (segment.start) {
        segment.start.y = nextY;
      }
      if (Array.isArray(segment.segments) && segment.segments[0]?.start) {
        segment.segments[0].start.y = nextY;
      }

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
    const halfWidth = this.canvas.width / 2;
    const normalizedOffset = this.normalizeCanvasHorizontalPosition(this.dynamicFigureHorizontalOffset, 0.25);
    const horizontalOffset = normalizedOffset * halfWidth;
    const figureConfigs = side === 'both'
      ? [
          { mirrorX: false, offsetX: -horizontalOffset },
          { mirrorX: true, offsetX: horizontalOffset }
        ]
      : [{
          mirrorX: side === 'right',
          offsetX: side === 'right' ? horizontalOffset : -horizontalOffset
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
    const halfWidth = this.canvas.width / 2;
    const normalizedOffset = this.normalizeCanvasHorizontalPosition(this.figureHorizontalOffset, 0.25);
    const horizontalOffset = normalizedOffset * halfWidth;
    const figureConfigs = side === 'both'
      ? [
          { mirrorX: false, offsetX: -horizontalOffset },
          { mirrorX: true, offsetX: horizontalOffset }
        ]
      : [{ mirrorX: side === 'right', offsetX: side === 'right' ? horizontalOffset : -horizontalOffset }];

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

  getPathAnchorPoint(renderSegments) {
    if (!Array.isArray(renderSegments) || renderSegments.length === 0) {
      return { x: 0, y: 0 };
    }

    const firstSegment = renderSegments[0];
    if (firstSegment?.type === 'combined' && Array.isArray(firstSegment.segments) && firstSegment.segments.length > 0) {
      return firstSegment.segments[0]?.start || { x: 0, y: 0 };
    }

    return firstSegment?.start || { x: 0, y: 0 };
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
    const anchorPoint = this.getPathAnchorPoint(renderSegments);

    const renderSingleFigure = ({ mirrorX, offsetX }) => {
      const targetX = centerX + offsetX + (mirrorX ? -(settings.xPosition ?? 0) : (settings.xPosition ?? 0));
      const targetY = centerY + this.getCanvasVerticalOffsetFromNormalized(settings.yPosition ?? this.figureYPosition);
      const anchorX = (mirrorX ? -anchorPoint.x : anchorPoint.x) * scaleX;
      const anchorY = anchorPoint.y * scaleY;

      this.ctx.save();
      this.ctx.translate(
        targetX - anchorX,
        targetY - anchorY
      );
      if (settings.rotation) {
        const rotationRadians = (Number(settings.rotation) * Math.PI) / 180;
        this.ctx.rotate(mirrorX ? -rotationRadians : rotationRadians);
      }
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
    const baseProgress = variant === 'hard'
      ? this.getHardSegmentProgress(segmentProgress, segmentIndex, settings.hardLinearity)
      : this.getSoftSegmentProgress(segmentProgress, segmentIndex, transitionProfiles);
    const linearity = Number.isFinite(Number(settings.linearity))
      ? Math.min(100, Math.max(0, Number(settings.linearity))) / 100
      : 0;
    const adjustedProgress = baseProgress + (segmentProgress - baseProgress) * linearity;
    const completedLength = segmentLengths
      .slice(0, segmentIndex)
      .reduce((total, length) => total + length, 0);

    return {
      point: this.getPointAtDistance(points, segmentLength * adjustedProgress),
      pathDistance: completedLength + segmentLength * adjustedProgress,
      velocity: variant === 'hard' || linearity >= 1
        ? null
        : transitionProfiles?.[segmentIndex]?.velocityAt(segmentProgress) || 0,
      segmentIndex,
      segmentProgress
    };
  }

  getMotionCyclePhase(animationStart, tempoBpm, renderSegments) {
    if (!Array.isArray(renderSegments) || renderSegments.length === 0) {
      return 0;
    }

    const bpm = Math.min(360, Math.max(1, Number(tempoBpm) || 60));
    const beatDurationMs = 60000 / bpm;
    const segmentDurationMs = beatDurationMs / 2;
    const pathDurationMs = segmentDurationMs * renderSegments.length;
    if (!(pathDurationMs > 0)) {
      return 0;
    }

    const elapsedMs = Math.max(0, performance.now() - (animationStart ?? performance.now()));
    const normalizedElapsedMs = ((elapsedMs % pathDurationMs) + pathDurationMs) % pathDurationMs;
    return normalizedElapsedMs / pathDurationMs;
  }

  preserveMotionPhaseOnTempoChange(animationStartKey, previousTempoBpm, nextTempoBpm, renderSegments) {
    if (!Array.isArray(renderSegments) || renderSegments.length === 0) {
      return;
    }

    const previousBpm = Number(previousTempoBpm);
    const nextBpm = Number(nextTempoBpm);
    if (!Number.isFinite(previousBpm) || !Number.isFinite(nextBpm) || previousBpm === nextBpm) {
      return;
    }

    const previousDurationMs = (60000 / previousBpm) / 2 * renderSegments.length;
    const nextDurationMs = (60000 / nextBpm) / 2 * renderSegments.length;
    if (!(previousDurationMs > 0) || !(nextDurationMs > 0)) {
      return;
    }

    const currentPhase = this.getMotionCyclePhase(this[animationStartKey], previousBpm, renderSegments);
    this[animationStartKey] = performance.now() - (currentPhase * nextDurationMs);
  }

  getFigureMotionState(renderSegments, scale = 1, settings = {}) {
    if (!Array.isArray(renderSegments) || renderSegments.length === 0) {
      return null;
    }

    const bpm = Math.min(360, Math.max(1, Number(settings.tempoBpm ?? this.figureTempoBpm) || 60));
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
    const anchor = this.getPathAnchorPoint(state.renderSegments);
    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      const anchorX = mirrorX ? -anchor.x : anchor.x;
      const anchorY = anchor.y;
      const localMotionX = mirrorX ? -motionPoint.x : motionPoint.x;
      const x = state.centerX + offsetX + (localMotionX - anchorX) * state.scaleX;
      const y = state.centerY + this.getCanvasVerticalOffsetFromNormalized(this.dynamicFigureYPosition) + (motionPoint.y - anchorY) * state.scaleY;

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
    const pathAnchor = this.getPathAnchorPoint(state.renderSegments);
    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
        const anchor = this.getFigureAnchorPoint(state.renderSegments, beatIndex * 2);
        if (!anchor) {
          continue;
        }
        const anchorX = mirrorX ? -anchor.x : anchor.x;
        const pathAnchorX = mirrorX ? -pathAnchor.x : pathAnchor.x;
        const x = state.centerX + offsetX + (anchorX - pathAnchorX) * state.scaleX;
        const y = state.centerY + this.getCanvasVerticalOffsetFromNormalized(this.dynamicFigureYPosition) + (anchor.y - pathAnchor.y) * state.scaleY;
        const label = String(beatIndex + 1);

        this.ctx.save();
        this.ctx.font = '400 17px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
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
    const anchor = this.getPathAnchorPoint(state.renderSegments);

    state.figureConfigs.forEach(({ mirrorX, offsetX }) => {
      const anchorX = mirrorX ? -anchor.x : anchor.x;
      const localMotionX = mirrorX ? -motionPoint.x : motionPoint.x;
      const x = state.centerX + offsetX + (localMotionX - anchorX) * state.scaleX;
      const y = state.centerY + this.getCanvasVerticalOffsetFromNormalized(this.figureYPosition) + (motionPoint.y - anchor.y) * state.scaleY;

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
    if (!visible || !this.canvas || !this.ctx) {
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

    const shoulderY = Number(leftShoulder.y) + Number(rightShoulder.y);
    const hipY = Number(leftHip.y) + Number(rightHip.y);
    if (!Number.isFinite(shoulderY) || !Number.isFinite(hipY)) {
      return;
    }

    const midpointShoulderY = shoulderY / 2;
    const midpointHipY = hipY / 2;
    const labels = ['PP', 'MP', 'MF', 'F'];
    const lineColors = [
      'rgba(188, 231, 255, 0.9)',
      'rgba(145, 214, 255, 0.78)',
      'rgba(255, 211, 135, 0.78)',
      'rgba(255, 157, 122, 0.9)'
    ];

    this.ctx.save();
    try {
      this.ctx.setLineDash([10, 8]);
      this.ctx.lineWidth = 1.8;
      this.ctx.lineCap = 'butt';
      this.ctx.font = '700 12px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'bottom';

      labels.forEach((label, index) => {
        const t = labels.length > 1 ? index / (labels.length - 1) : 0;
        const y = midpointShoulderY + (midpointHipY - midpointShoulderY) * t;
        if (!Number.isFinite(y) || y < 0 || y > this.canvas.height) {
          return;
        }

        this.ctx.strokeStyle = lineColors[index] || 'rgba(255,255,255,0.8)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillStyle = lineColors[index] || 'rgba(255,255,255,0.8)';
        this.ctx.strokeText(label, 12, y - 6);
        this.ctx.fillText(label, 12, y - 6);
        this.ctx.setLineDash([10, 8]);
      });
    } finally {
      this.ctx.setLineDash([]);
      this.ctx.restore();
    }
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
    const pathAnchor = this.getPathAnchorPoint(state.renderSegments);

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
        const pathAnchorX = mirrorX ? -pathAnchor.x : pathAnchor.x;
        const x = state.centerX + offsetX + (anchorX - pathAnchorX) * state.scaleX;
        const y = state.centerY + this.getCanvasVerticalOffsetFromNormalized(this.figureYPosition) + (anchor.y - pathAnchor.y) * state.scaleY;

        this.ctx.save();
        this.ctx.font = '400 17px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
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
    this.nextTargetByHand = { left: 0, right: 0 };
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

    if (this.chapter === 5) {
      this.handIndependenceActive = Number.isInteger(this.level) && this.level >= 0 && this.level <= 7;
      this.handIndependenceAnimationStart = performance.now();
      this.active = false;
      this.figureActive = false;
      this.dynamicFigureActive = false;
      this.calibrationActive = false;
      this.consistencyActive = false;
      this.setCalibrationPanelVisible(false);
      this.setConsistencyPanelVisible(false);
      this.render();
      return;
    }

    if (this.chapter === 6) {
      this.active = Number.isInteger(this.level) && this.level >= 0 && this.level <= 4;
      this.figureActive = false;
      this.dynamicFigureActive = false;
      this.handIndependenceActive = false;
      this.calibrationActive = false;
      this.consistencyActive = false;
      this.setCalibrationPanelVisible(false);
      this.setConsistencyPanelVisible(false);
      this.render();
      return;
    }

    this.figureActive = false;
    this.dynamicFigureActive = false;
    this.handIndependenceActive = false;
    this.calibrationActive = false;
    this.setCalibrationPanelVisible(false);
    this.consistencyActive = false;
    this.setConsistencyPanelVisible(false);

    if (this.chapter !== 1 || this.level === null) {
      this.active = false;
      this.render();
      return;
    }

    if ([3, 4].includes(this.level)) {
      this.targets = [];
      this.targetIndexByCircle.clear();
      this.nextTarget = 0;
      this.nextTargetByHand = { left: 0, right: 0 };
      this.pointExerciseCurrentIndex = 0;
      this.completed = false;
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
    if (this.chapter === 1 && Number.isInteger(this.level) && [0, 1, 2, 3, 4].includes(this.level)) {
      const resolution = Math.max(8, Math.min(24, this.chapter1GridResolution || this.squareExerciseGridResolution || this.symmetricExerciseGridResolution || gs.rows));
      const snapEven = (value) => (value % 2 === 0 ? value : value + 1);
      const rowsTarget = Math.max(8, Math.min(24, resolution));
      const colsTarget = Math.max(12, Math.min(32, Math.round((gs.cols / gs.rows) * rowsTarget)));
      this.gridRows = snapEven(rowsTarget);
      this.gridCols = snapEven(colsTarget);
    } else {
      this.gridRows = gs.rows;
      this.gridCols = gs.cols;
    }
    this.buildGrid();

    this.active = true;

    const rows = this.gridRows;
    const cols = this.gridCols;
    const startRow = Math.max(2, Math.floor(rows * 0.16)) + 2;
    const { outerRightCol, outerLeftCol, innerRightCol, innerLeftCol } = this.getEingewoehnungColumns();

    if (this.level === 1) {
      this.active = true;
      this.targets = [];
      this.nextTarget = 0;
      this.nextTargetByHand = { left: 0, right: 0 };
      this.pointExerciseCurrentIndex = 0;
      this.completed = false;
      this.targetIndexByCircle.clear();
      this.pointExerciseSequence = this.sanitizePointSequence(this.pointExerciseSequence);
      this.pointExerciseSequence.forEach(({ row, col, hand }) => {
        const safeRow = Math.max(0, Math.min(rows - 1, Number(row) || 0));
        const safeCol = Math.max(0, Math.min(cols - 1, Number(col) || 0));
        const targetHand = ['left', 'right'].includes(hand)
          ? hand
          : this.resolvePointHandForColumn(safeCol, this.pointExerciseHand);
        this.targets.push({ index: safeRow * cols + safeCol, hand: targetHand });
      });
      this.rebuildTargetIndexLookup();
      this.updateTargetHandProgress();
      this.resetPointExerciseTraversalState();
      this.buildGrid();
      this.render();
      return;
    }

    if (this.level === 0) {
      const isBoth = this.squareExerciseHandMode === 'both';
      const selectedHands = isBoth ? ['left', 'right'] : [this.squareExerciseHandMode || 'right'];
      const isDigitShape = /^\d$/.test(String(this.squareExerciseShape));
      const isCircle = this.squareExerciseShape === 'circle';

      const pushTarget = (side, cx, cy, radius, steps) => {
        for (let step = 0; step < steps; step += 1) {
          const theta = (step / steps) * Math.PI * 2;
          const localX = cx + Math.cos(theta) * radius;
          const localY = cy + Math.sin(theta) * radius;
          const row = Math.max(0, Math.min(rows - 1, Math.round((localY / this.canvas.height) * rows - 0.5)));
          const col = this.getGridColumnForX(localX);
          this.targets.push({ index: row * cols + col, hand: side });
        }
      };

      const buildSquarePath = (side) => {
        const leftCol = outerLeftCol;
        const rightCol = Math.max(0, outerRightCol - 1);
        const col = side === 'left' ? leftCol : rightCol;
        const targetCount = Math.floor(rows * 0.6);
        const endRow = Math.min(rows - 2, startRow + targetCount - 1);
        const hSpan = 4;
        const vUp = endRow - startRow;
        const rightInnerCol = Math.min(cols - 1, rightCol + hSpan);
        const leftInnerCol = Math.max(0, leftCol - hSpan);
        const topRow = Math.max(0, endRow - vUp);
        const innerCol = side === 'left' ? leftInnerCol : rightInnerCol;

        for (let row = startRow; row <= endRow; row += 1) {
          this.targets.push({ index: row * cols + col, hand: side });
        }
        for (let h = 1; h <= hSpan; h += 1) {
          const nextCol = side === 'left' ? Math.max(0, col - h) : Math.min(cols - 1, col + h);
          this.targets.push({ index: endRow * cols + nextCol, hand: side });
        }
        for (let v = 1; v <= vUp; v += 1) {
          this.targets.push({ index: Math.max(0, endRow - v) * cols + innerCol, hand: side });
        }
        for (let h = hSpan - 1; h >= 1; h -= 1) {
          const nextCol = side === 'left' ? Math.max(0, col - h) : Math.min(cols - 1, col + h);
          this.targets.push({ index: topRow * cols + nextCol, hand: side });
        }
      };

      selectedHands.forEach((side) => {
        if (isDigitShape) {
          const digitPoints = this.buildDigitTargets(this.squareExerciseShape, side, rows, cols);
          digitPoints.forEach(({ row, col }) => {
            this.targets.push({ index: row * cols + col, hand: side });
          });
        } else if (isCircle) {
          const cx = side === 'left' ? this.canvas.width * 0.35 : this.canvas.width * 0.65;
          const cy = this.canvas.height * 0.5;
          const radius = Math.min(this.canvas.width, this.canvas.height) * 0.17;
          pushTarget(side, cx, cy, radius, 26);
        } else {
          buildSquarePath(side);
        }
      });
    } else if (this.level === 1) {
      const leftCol = outerLeftCol;
      const rightCol = outerRightCol;
      const targetCount = Math.floor(rows * 0.5);
      const endRow = Math.min(rows - 1, startRow + targetCount - 1);

      if (this.symmetricExerciseOrientation === 'horizontal') {
        const centerRow = Math.floor((startRow + endRow) / 2);
        const centerCol = (cols - 1) / 2;
        const startOffset = 2;
        const helperCount = 6;
        const horizontalSequence = [];

        for (let offset = startOffset; offset <= helperCount; offset += 1) {
          const visualLeftCol = Math.min(cols - 1, Math.ceil(centerCol + offset));
          const visualRightCol = Math.max(0, Math.floor(centerCol - offset));
          horizontalSequence.push({ left: visualLeftCol, right: visualRightCol });
        }
        for (let offset = helperCount - 1; offset >= startOffset; offset -= 1) {
          const visualLeftCol = Math.min(cols - 1, Math.ceil(centerCol + offset));
          const visualRightCol = Math.max(0, Math.floor(centerCol - offset));
          horizontalSequence.push({ left: visualLeftCol, right: visualRightCol });
        }

        const repeatCycles = 8;
        for (let cycle = 0; cycle < repeatCycles; cycle += 1) {
          horizontalSequence.forEach(({ left, right }) => {
            this.targets.push({
              leftIndex: centerRow * cols + left,
              rightIndex: centerRow * cols + right,
              hand: 'both'
            });
          });
        }
      } else if (this.symmetricExerciseOrientation === 'square') {
        const centerRow = Math.floor((startRow + endRow) / 2);
        const centerCol = (cols - 1) / 2;
        const squareSpan = 4;
        const squareCycle = [];

        for (let row = startRow; row <= endRow; row += 1) {
          const distanceFromCenter = Math.abs(row - centerRow);
          const offset = Math.max(0, squareSpan - distanceFromCenter);
          const leftCol = Math.min(cols - 1, Math.ceil(centerCol + offset));
          const rightCol = Math.max(0, Math.floor(centerCol - offset));
          squareCycle.push({ left: row * cols + leftCol, right: row * cols + rightCol });
        }
        for (let row = endRow - 1; row >= startRow; row -= 1) {
          const distanceFromCenter = Math.abs(row - centerRow);
          const offset = Math.max(0, squareSpan - distanceFromCenter);
          const leftCol = Math.min(cols - 1, Math.ceil(centerCol + offset));
          const rightCol = Math.max(0, Math.floor(centerCol - offset));
          squareCycle.push({ left: row * cols + leftCol, right: row * cols + rightCol });
        }

        const repeatCycles = 10;
        for (let cycle = 0; cycle < repeatCycles; cycle += 1) {
          squareCycle.forEach(({ left, right }) => {
            this.targets.push({ leftIndex: left, rightIndex: right, hand: 'both' });
          });
        }
      } else if (this.symmetricExerciseOrientation === 'circle') {
        const centerRow = Math.floor((startRow + endRow) / 2);
        const leftCenterCol = leftCol;
        const rightCenterCol = rightCol;
        const radius = Math.max(2, Math.min(5, Math.floor(cols * 0.08)));
        const circleCycle = [];
        const sampleSteps = 20;

        for (let step = 0; step < sampleSteps; step += 1) {
          const angle = (step / sampleSteps) * Math.PI * 2;
          const rowOffset = Math.round(Math.sin(angle) * radius);
          const leftColOffset = Math.round(Math.cos(angle) * radius);
          const rightColOffset = Math.round(Math.cos(angle) * radius);
          const row = Math.max(startRow, Math.min(endRow, centerRow + rowOffset));
          const leftIndex = row * cols + Math.max(0, Math.min(cols - 1, leftCenterCol + leftColOffset));
          const rightIndex = row * cols + Math.max(0, Math.min(cols - 1, rightCenterCol - rightColOffset));
          circleCycle.push({ left: leftIndex, right: rightIndex });
        }

        const repeatCycles = 10;
        for (let cycle = 0; cycle < repeatCycles; cycle += 1) {
          circleCycle.forEach(({ left, right }) => {
            this.targets.push({ leftIndex: left, rightIndex: right, hand: 'both' });
          });
        }
      } else if (this.symmetricExerciseOrientation === 'diagonal') {
        const diagonalCycle = [];
        const maxLength = 5;
        const leftStart = Math.max(0, leftCol - 2);
        const rightStart = Math.min(cols - 1, rightCol + 2);

        for (let step = 0; step < maxLength; step += 1) {
          const row = startRow + step;
          const offset = step;
          diagonalCycle.push({
            left: row * cols + Math.max(0, leftStart + offset),
            right: row * cols + Math.min(cols - 1, rightStart - offset)
          });
        }
        for (let step = maxLength - 2; step >= 0; step -= 1) {
          const row = startRow + step;
          const offset = step;
          diagonalCycle.push({
            left: row * cols + Math.max(0, leftStart + offset),
            right: row * cols + Math.min(cols - 1, rightStart - offset)
          });
        }

        const repeatCycles = 10;
        for (let cycle = 0; cycle < repeatCycles; cycle += 1) {
          diagonalCycle.forEach(({ left, right }) => {
            this.targets.push({ leftIndex: left, rightIndex: right, hand: 'both' });
          });
        }
      } else {
        // both sides symmetric, endless up/down motion with repeated cycles
        const cycleRows = [];
        for (let row = startRow; row <= endRow; row += 1) {
          cycleRows.push(row);
        }
        for (let row = endRow - 1; row >= startRow; row -= 1) {
          cycleRows.push(row);
        }

        const repeatCycles = 10;
        for (let cycle = 0; cycle < repeatCycles; cycle += 1) {
          cycleRows.forEach((row) => {
            this.targets.push({ leftIndex: row * cols + leftCol, rightIndex: row * cols + rightCol, hand: 'both' });
          });
        }
      }
    } else if (this.level === 2) {
      this.targets = [];
      this.nextTarget = 0;
      this.nextTargetByHand = { left: 0, right: 0 };
      this.pointExerciseCurrentIndex = 0;
      this.completed = false;
      this.targetIndexByCircle.clear();
      this.rebuildTargetIndexLookup();
      this.updateTargetHandProgress();
      this.render();
      return;
    } else if (this.level === 3) {
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
    } else if (this.level === 4) {
      const isBoth = this.squareExerciseHandMode === 'both';
      const selectedHands = isBoth ? ['left', 'right'] : [this.squareExerciseHandMode || 'right'];
      selectedHands.forEach((side) => {
        const cx = side === 'left' ? this.canvas.width * 0.35 : this.canvas.width * 0.65;
        const cy = this.canvas.height * 0.5;
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.17;
        const steps = 26;
        for (let step = 0; step < steps; step += 1) {
          const theta = (step / steps) * Math.PI * 2;
          const localX = cx + Math.cos(theta) * radius;
          const localY = cy + Math.sin(theta) * radius;
          const row = Math.max(0, Math.min(rows - 1, Math.round((localY / this.canvas.height) * rows - 0.5)));
          const col = this.getGridColumnForX(localX);
          this.targets.push({ index: row * cols + col, hand: side });
        }
      });
    }

    this.rebuildTargetIndexLookup();
    this.updateTargetHandProgress();
    this.render();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getTargetBubbleColors(target, circleIndex, isCurrentTarget, isCompletedTarget) {
    const getBothSide = () => {
      if (circleIndex === target.leftIndex) {
        return 'left';
      }
      if (circleIndex === target.rightIndex) {
        return 'right';
      }
      if (Number.isInteger(target.leftIndex) && Number.isInteger(target.rightIndex) && this.grid[circleIndex]) {
        const leftCircle = this.grid[target.leftIndex];
        const rightCircle = this.grid[target.rightIndex];
        const currentCircle = this.grid[circleIndex];
        const leftDistance = this.distance(currentCircle, leftCircle);
        const rightDistance = this.distance(currentCircle, rightCircle);
        return leftDistance <= rightDistance ? 'left' : 'right';
      }
      return 'left';
    };

    const side = target.hand === 'both' ? getBothSide() : target.hand;

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

  drawExerciseFieldTimingOverlay() {
    const metrics = this.getExerciseFieldMetrics();
    const chartX = 18;
    const chartY = this.canvas.height - 72;
    const chartWidth = Math.min(420, this.canvas.width - 36);
    const chartHeight = 46;
    const barCount = 10;
    const isFreeMode = this.exerciseFieldChallengeMode === 'free';
    const tempoSamples = Array.isArray(this.exerciseFieldTimingSamples) ? this.exerciseFieldTimingSamples.slice(-barCount) : [];
    const freeSamples = Array.isArray(this.exerciseFieldFreeSyncSamples) ? this.exerciseFieldFreeSyncSamples.slice(-barCount) : [];
    const samples = isFreeMode ? freeSamples : tempoSamples;
    const displaySamples = samples.length > 0 ? samples : [];
    const maxValue = 1;
    const panelHeight = chartHeight + 18;
    const chartInnerWidth = Math.max(180, chartWidth - 170);
    const chartInnerX = chartX + 12;
    const metricX = chartX + chartInnerWidth + 18;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(7, 14, 26, 0.72)';
    this.ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)';
    this.ctx.lineWidth = 1.1;
    this.ctx.fillRect(chartX, chartY, chartWidth, panelHeight);
    this.ctx.strokeRect(chartX, chartY, chartWidth, panelHeight);

    this.ctx.fillStyle = 'rgba(230, 242, 255, 0.96)';
    this.ctx.font = '700 11px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    const chartTitle = isFreeMode ? 'Synchronität zwischen linker und rechter Hand' : 'Tempo-Genauigkeit';
    this.ctx.fillText(chartTitle, chartX + 12, chartY + 8);

    const barGap = 6;
    const slotCount = Math.max(1, displaySamples.length);
    const barWidth = Math.max(8, (chartInnerWidth - 24 - barGap * (slotCount - 1)) / slotCount);
    const baselineY = chartY + chartHeight + 10;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    this.ctx.beginPath();
    this.ctx.moveTo(chartX + 12, baselineY);
    this.ctx.lineTo(chartX + chartWidth - 12, baselineY);
    this.ctx.stroke();

    const derivedScores = displaySamples.map((sample) => {
      if (isFreeMode) {
        const deltaMs = Number.isFinite(sample?.deltaMs) ? sample.deltaMs : 1000;
        return Math.max(0, Math.min(1, 1 - Math.min(1, deltaMs / 1000)));
      }

      const normalizedDeviation = Number.isFinite(sample?.normalizedDeviation) ? sample.normalizedDeviation : 0;
      const normalizedScore = Math.max(0, Math.min(1, 1 - normalizedDeviation));
      return sample && Number.isFinite(sample.leftErrorMs) && Number.isFinite(sample.rightErrorMs)
        ? Math.max(0, Math.min(1, (sample.leftErrorMs === sample.rightErrorMs && sample.leftErrorMs >= Math.max(50, this.getExerciseFieldBeatDurationMs()) ? 0 : normalizedScore)))
        : 0;
    });

    const averageScore = derivedScores.length > 0
      ? derivedScores.reduce((sum, value) => sum + value, 0) / derivedScores.length
      : 0;

    displaySamples.forEach((sample, sampleIndex) => {
      const scoreForDisplay = derivedScores[sampleIndex] ?? 0;
      const height = (scoreForDisplay / maxValue) * (chartHeight - 8);
      const x = chartInnerX + sampleIndex * (barWidth + barGap);
      const y = baselineY - height;
      const hue = scoreForDisplay * 120;
      const alpha = 0.9;
      const lightness = 32 + (1 - scoreForDisplay) * 20;
      const color = `hsla(${hue}, 76%, ${lightness}%, ${alpha})`;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, barWidth, height);
    });

    this.ctx.fillStyle = 'rgba(240, 246, 255, 0.98)';
    this.ctx.font = '700 48px Arial';
    this.ctx.textAlign = 'left';
    const averagePercent = Math.round(averageScore * 100);
    this.ctx.fillText(`Ø ${averagePercent}%`, metricX + 2, chartY + 14);

    if (isFreeMode) {
      const freeRegularity = this.getExerciseFieldFreeBeatRegularityStats();
      if (Number.isFinite(freeRegularity.regularityPct)) {
        const regularityText = `~${Math.round(freeRegularity.regularityPct)}%`;
        const averageTempoBpm = Number.isFinite(freeRegularity.avgIntervalMs) && freeRegularity.avgIntervalMs > 0
          ? 60000 / freeRegularity.avgIntervalMs
          : null;

        const topRowY = chartY - 58;
        this.ctx.fillStyle = 'rgba(206, 232, 255, 0.96)';
        this.ctx.font = '700 48px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(regularityText, chartX + 12, topRowY);

        if (Number.isFinite(averageTempoBpm)) {
          const tempoText = `${Math.round(averageTempoBpm)} bpm`;
          this.ctx.font = '700 26px Arial';
          const tempoX = chartX + 12 + this.ctx.measureText(regularityText).width + 64;
          this.ctx.fillText(tempoText, tempoX, topRowY + 22);
        }
      }
    }

    this.ctx.fillStyle = 'rgba(214, 230, 255, 0.9)';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'left';

    const modeText = metrics.mode === 'tempo' ? `Tempo ${Math.round(metrics.tempoBpm || 60)} bpm` : 'Frei';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(modeText, chartX + chartWidth - 12, chartY + 10);
    this.ctx.restore();
  }

  drawExerciseFieldZones() {
    if (!this.exerciseFieldVisible) {
      return;
    }

    this.updateExerciseFieldChallengeTracking(performance.now());

    const zones = this.getExerciseFieldZones();
    const entries = ['leftTop', 'leftBottom', 'rightTop', 'rightBottom'];
    if (!entries.some((key) => zones[key])) {
      return;
    }

    const strikeCount = Number.isInteger(this.exerciseFieldStrikeCount)
      ? Math.max(2, Math.min(4, this.exerciseFieldStrikeCount))
      : 2;
    const assignmentSide = this.exerciseFieldAssignment?.side === 'right' ? 'right' : 'left';
    const assignmentVertical = this.exerciseFieldAssignment?.vertical === 'bottom' ? 'bottom' : 'top';
    const assignmentBeatIndex = Math.max(1, Math.min(strikeCount, Number(this.exerciseFieldAssignment?.beatIndex) || 1));
    const activeSequenceIndex = Number.isInteger(this.exerciseFieldSequenceIndex)
      ? this.exerciseFieldSequenceIndex % strikeCount
      : 0;
    const assignmentRectKey = assignmentSide === 'left'
      ? (assignmentVertical === 'top' ? 'leftTop' : 'leftBottom')
      : (assignmentVertical === 'top' ? 'rightTop' : 'rightBottom');
    const assignmentRect = zones[assignmentRectKey] || null;

    const layout = this.getExerciseFieldStrikeLayout(zones, strikeCount);
    const generatedStrikeDefaults = this.getExerciseFieldStrikeDefaults(strikeCount);
    const currentLeft = Array.isArray(this.exerciseFieldStrikePositions.left) ? this.exerciseFieldStrikePositions.left : [];
    const currentRight = Array.isArray(this.exerciseFieldStrikePositions.right) ? this.exerciseFieldStrikePositions.right : [];

    this.exerciseFieldStrikePositions.left = Array.from({ length: strikeCount }, (_, index) => {
      const previous = currentLeft[index];
      const defaultY = generatedStrikeDefaults.yLevels[index] ?? generatedStrikeDefaults.y;
      const base = previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)
        ? previous
        : { x: generatedStrikeDefaults.leftX[index], y: defaultY };
      const clampedX = Math.min(layout.centerX - 12, Math.max(12, base.x));
      return { x: clampedX, y: Number.isFinite(base.y) ? base.y : defaultY };
    });
    this.exerciseFieldStrikePositions.right = Array.from({ length: strikeCount }, (_, index) => {
      const previous = currentRight[index];
      const pairedLeft = this.exerciseFieldStrikePositions.left[index];
      const defaultY = generatedStrikeDefaults.yLevels[index] ?? generatedStrikeDefaults.y;
      const mirroredX = pairedLeft && Number.isFinite(pairedLeft.x)
        ? layout.centerX + (layout.centerX - pairedLeft.x)
        : generatedStrikeDefaults.rightX[index];
      const base = previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)
        ? previous
        : { x: mirroredX, y: defaultY };
      const clampedX = Math.min(this.canvas.width - 12, Math.max(layout.centerX + 12, base.x));
      return { x: clampedX, y: Number.isFinite(base.y) ? base.y : defaultY };
    });

    this.ctx.save();
    entries.forEach((key) => {
      const rect = zones[key];
      if (!rect) {
        return;
      }

      const side = key.includes('left') ? 'left' : 'right';
      const handTip = side === 'left' ? this.leftTip : this.rightTip;
      const isActive = Boolean(handTip) && handTip.x >= rect.x - rect.width / 2 && handTip.x <= rect.x + rect.width / 2
        && handTip.y >= rect.y - rect.height / 2 && handTip.y <= rect.y + rect.height / 2;
      const fillAlpha = isActive ? 0.28 : 0.12;
      const strokeAlpha = isActive ? 0.96 : 0.55;
      this.ctx.fillStyle = side === 'left'
        ? `rgba(82, 156, 255, ${fillAlpha})`
        : `rgba(255, 163, 92, ${fillAlpha})`;
      this.ctx.strokeStyle = side === 'left'
        ? `rgba(128, 204, 255, ${strokeAlpha})`
        : `rgba(255, 201, 129, ${strokeAlpha})`;
      this.ctx.lineWidth = isActive ? 2.6 : 1.4;
      this.ctx.shadowBlur = isActive ? 18 : 0;
      this.ctx.shadowColor = side === 'left' ? 'rgba(82, 156, 255, 0.9)' : 'rgba(255, 163, 92, 0.9)';
      this.ctx.fillRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
      this.ctx.strokeRect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height);
    });

    if (assignmentRect) {
      const isAssignmentActive = activeSequenceIndex === assignmentBeatIndex - 1;
      const assignmentTempoLabel = this.exerciseFieldChallengeMode === 'tempo'
        ? this.exerciseFieldTimingLabels.find((label) => label.side === assignmentSide && label.beatIndex === assignmentBeatIndex - 1)
        : null;
      const assignmentFreeLabel = this.exerciseFieldChallengeMode === 'free'
        ? this.exerciseFieldFreeSyncLabels.find((label) => label.side === assignmentSide && label.beatIndex === assignmentBeatIndex - 1)
        : null;
      const assignmentLabelAgeMs = assignmentTempoLabel ? performance.now() - assignmentTempoLabel.createdAtMs : (assignmentFreeLabel ? performance.now() - assignmentFreeLabel.createdAtMs : Number.POSITIVE_INFINITY);
      const assignmentLabelVisible = Boolean(assignmentTempoLabel || assignmentFreeLabel)
        && assignmentLabelAgeMs >= 0
        && assignmentLabelAgeMs <= (this.exerciseFieldChallengeMode === 'tempo' ? this.getExerciseFieldBeatDurationMs() : 1000);
      const assignmentLabelAlpha = assignmentLabelVisible ? Math.max(0, 1 - assignmentLabelAgeMs / (this.exerciseFieldChallengeMode === 'tempo' ? this.getExerciseFieldBeatDurationMs() : 1000)) : 0;

      this.ctx.fillStyle = isAssignmentActive ? 'rgba(255, 244, 168, 0.18)' : 'rgba(255, 255, 255, 0.06)';
      this.ctx.strokeStyle = isAssignmentActive ? 'rgba(255, 244, 168, 0.98)' : 'rgba(255, 255, 255, 0.72)';
      this.ctx.lineWidth = isAssignmentActive ? 3.1 : 1.6;
      this.ctx.shadowBlur = isAssignmentActive ? 18 : 0;
      this.ctx.shadowColor = isAssignmentActive ? 'rgba(255, 244, 168, 0.9)' : 'rgba(255, 255, 255, 0.45)';
      this.ctx.strokeRect(assignmentRect.x - assignmentRect.width / 2, assignmentRect.y - assignmentRect.height / 2, assignmentRect.width, assignmentRect.height);
      this.ctx.fillRect(assignmentRect.x - assignmentRect.width / 2, assignmentRect.y - assignmentRect.height / 2, assignmentRect.width, assignmentRect.height);
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#f5f9ff';
      this.ctx.font = 'bold 18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      if (assignmentLabelVisible) {
        const labelValue = assignmentTempoLabel ? assignmentTempoLabel.deltaMs : assignmentFreeLabel?.deltaMs;
        const labelText = Number.isFinite(labelValue)
          ? `${labelValue < 100 ? labelValue.toFixed(1) : Math.round(labelValue)}ms`
          : String(assignmentBeatIndex);
        this.ctx.fillStyle = `rgba(255, 244, 168, ${Math.max(0.15, assignmentLabelAlpha)})`;
        this.ctx.fillText(labelText, assignmentRect.x, assignmentRect.y + 1);
      } else {
        this.ctx.fillText(String(assignmentBeatIndex), assignmentRect.x, assignmentRect.y + 1);
      }
    }

    for (let index = 0; index < strikeCount; index += 1) {
      const leftPoint = this.exerciseFieldStrikePositions.left[index];
      const rightPoint = this.exerciseFieldStrikePositions.right[index];
      if (!leftPoint || !rightPoint) {
        continue;
      }

      const isDraggingThisPair = this.exerciseFieldDrag
        && this.exerciseFieldDrag.index === index;
      const isReservedAssignmentPair = index === assignmentBeatIndex - 1;

      if (isDraggingThisPair && !isReservedAssignmentPair) {
        this.ctx.beginPath();
        this.ctx.moveTo(leftPoint.x, leftPoint.y);
        this.ctx.lineTo(rightPoint.x, rightPoint.y);
        this.ctx.strokeStyle = 'rgba(210, 227, 255, 0.5)';
        this.ctx.lineWidth = 1.1;
        this.ctx.setLineDash([4, 6]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      const pairId = index + 1;
      const drawStrikeCircle = (point, side) => {
        const isLeft = side === 'left';
        const isCurrentSequenceTarget = index === activeSequenceIndex;
        const shouldHideAssignedBeat = side === assignmentSide && index === assignmentBeatIndex - 1;
        if (shouldHideAssignedBeat) {
          return;
        }

        const handTip = isLeft ? this.leftTip : this.rightTip;
        const isActive = Boolean(handTip) && Math.hypot(handTip.x - point.x, handTip.y - point.y) <= 18;
        const radius = this.exerciseFieldStrikeRadius * (isActive ? 1.15 : 1);
        const tempoLabel = this.exerciseFieldChallengeMode === 'tempo'
          ? this.exerciseFieldTimingLabels.find((label) => label.side === side && label.beatIndex === index)
          : null;
        const freeLabel = this.exerciseFieldChallengeMode === 'free'
          ? this.exerciseFieldFreeSyncLabels.find((label) => label.side === side && label.beatIndex === index)
          : null;
        const nowMs = performance.now();
        const labelFadeWindowMs = this.exerciseFieldChallengeMode === 'tempo' ? this.getExerciseFieldBeatDurationMs() : 1000;
        const labelAgeMs = tempoLabel ? nowMs - tempoLabel.createdAtMs : (freeLabel ? nowMs - freeLabel.createdAtMs : Number.POSITIVE_INFINITY);
        const labelVisible = Boolean(tempoLabel || freeLabel) && labelAgeMs >= 0 && labelAgeMs <= labelFadeWindowMs;
        const labelAlpha = labelVisible ? Math.max(0, 1 - labelAgeMs / labelFadeWindowMs) : 0;

        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = isLeft
          ? (isActive ? 'rgba(82, 156, 255, 0.38)' : 'rgba(82, 156, 255, 0.16)')
          : (isActive ? 'rgba(255, 163, 92, 0.38)' : 'rgba(255, 163, 92, 0.16)');
        this.ctx.shadowBlur = isActive || isCurrentSequenceTarget ? 18 : 0;
        this.ctx.shadowColor = isLeft ? 'rgba(82, 156, 255, 0.9)' : 'rgba(255, 163, 92, 0.9)';
        this.ctx.fill();
        this.ctx.lineWidth = isCurrentSequenceTarget ? 3.2 : (isActive ? 2.4 : 1.5);
        this.ctx.strokeStyle = isCurrentSequenceTarget
          ? (isLeft ? 'rgba(255, 244, 168, 0.98)' : 'rgba(255, 214, 127, 0.98)')
          : (isLeft ? 'rgba(128, 204, 255, 0.9)' : 'rgba(255, 201, 129, 0.9)');
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = isLeft ? '#dbeeff' : '#ffe4c2';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (labelVisible) {
          const labelValue = tempoLabel ? tempoLabel.deltaMs : freeLabel?.deltaMs;
          const labelText = Number.isFinite(labelValue)
            ? `${labelValue < 100 ? labelValue.toFixed(1) : Math.round(labelValue)}ms`
            : String(pairId);
          this.ctx.fillStyle = `rgba(255, 244, 168, ${Math.max(0.1, labelAlpha)})`;
          this.ctx.fillText(labelText, point.x, point.y + 0.5);
          return;
        }

        this.ctx.fillStyle = isLeft ? '#dbeeff' : '#ffe4c2';
        this.ctx.fillText(String(pairId), point.x, point.y + 0.5);
      };

      drawStrikeCircle(leftPoint, 'left');
      drawStrikeCircle(rightPoint, 'right');
    }

    this.ctx.restore();
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
      || (this.chapter === 5 && this.handIndependenceActive)
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

    if (this.chapter === 5 && Number.isInteger(this.level) && this.level >= 0 && this.level <= 7) {
      const dynamicState = this.getHandIndependenceDynamicState();
      const shapeState = this.getHandIndependenceShapeState();
      const tempoPair = this.getHandIndependenceTempoPair();
      if (dynamicState) {
        if (this.handIndependenceDynamicsVisible) this.drawFigureDynamics();
        this.drawFigurePath(dynamicState, dynamicState.handIndependenceSettings);
        this.drawHandIndependenceCountTimes(dynamicState);
        this.drawHandIndependenceMotionPoint(dynamicState, {
          variant: this.handIndependenceVariant,
          tempoBpm: tempoPair.figure,
          xPosition: 0,
          yPosition: this.handIndependenceFigureY
        });
      }
      if (shapeState) {
        this.drawFigurePath(shapeState, shapeState.handIndependenceSettings);
        this.drawHandIndependenceMotionPoint(shapeState, {
          variant: 'soft',
          tempoBpm: tempoPair.shape,
          linearity: 100,
          xPosition: 0,
          yPosition: this.handIndependenceFigureY,
          rotation: this.handIndependenceShapeRotation
        });
      }
      this.renderPoseAlignmentFeedback();
      this.requestRender();
      return;
    }

    if (this.chapter === 6 && Number.isInteger(this.level) && this.level >= 0 && this.level <= 4) {
      this.drawExerciseFieldZones();
      this.drawExerciseFieldTimingOverlay();
      this.renderPoseAlignmentFeedback();
      this.requestRender();
      return;
    }

    if (!this.active) {
      this.setPoseAlignmentPanelVisible(false);
      return;
    }

    // draw grid
    const nowMs = performance.now();
    this.pointExerciseFlashPoints = this.pointExerciseFlashPoints.filter((flash) => nowMs - flash.startedAt < flash.durationMs);
    const freeMovementTouchFeedbackActive = this.chapter === 1 && Number.isInteger(this.level) && this.level === 2;
    for (let i = 0; i < this.grid.length; i += 1) {
      const circle = this.grid[i];
      const scale = this.circleScales[i];
      const radiusX = circle.radiusX * scale;
      const radiusY = circle.radiusY * scale;
      let fill = 'rgba(255, 255, 255, 0.08)';
      let stroke = 'rgba(255, 255, 255, 0.16)';
      const pointFlash = this.pointExerciseFlashPoints.find((flash) => flash.index === i);
      const flashProgress = pointFlash ? Math.min(1, (nowMs - pointFlash.startedAt) / Math.max(1, pointFlash.durationMs)) : 0;

      const leftTouch = freeMovementTouchFeedbackActive && (this.activeTouchCircleByHand.left?.has(i) ?? false);
      const rightTouch = freeMovementTouchFeedbackActive && (this.activeTouchCircleByHand.right?.has(i) ?? false);

      const getFadeColor = (hand) => {
        if (!this.activeTouchFadeEnabled) {
          return null;
        }
        const fadeEntry = this.activeTouchFadeByHand[hand]?.get(i);
        if (!fadeEntry) {
          return null;
        }
        if (nowMs >= fadeEntry.endAt) {
          this.activeTouchFadeByHand[hand].delete(i);
          return null;
        }
        const lifePercent = 1 - (nowMs - fadeEntry.startedAt) / Math.max(1, this.activeTouchFadeDurationMs);
        const alpha = Math.max(0, Math.min(1, lifePercent * 0.82));
        return {
          fill: hand === 'left' ? `rgba(96, 160, 255, ${alpha})` : `rgba(255, 160, 92, ${alpha})`,
          stroke: hand === 'left' ? `rgba(220, 236, 255, ${Math.min(1, alpha + 0.18)})` : `rgba(255, 236, 216, ${Math.min(1, alpha + 0.18)})`
        };
      };

      const leftFade = leftTouch ? null : getFadeColor('left');
      const rightFade = rightTouch ? null : getFadeColor('right');

      if (leftTouch || rightTouch) {
        if (leftTouch && rightTouch) {
          fill = 'rgba(120, 150, 255, 0.82)';
          stroke = 'rgba(255, 232, 182, 0.98)';
        } else if (leftTouch) {
          fill = 'rgba(96, 160, 255, 0.82)';
          stroke = 'rgba(220, 236, 255, 0.98)';
        } else {
          fill = 'rgba(255, 160, 92, 0.82)';
          stroke = 'rgba(255, 236, 216, 0.98)';
        }
      } else if (leftFade || rightFade) {
        const fadeColor = leftFade || rightFade;
        fill = fadeColor.fill;
        stroke = fadeColor.stroke;
      } else {
        const targetIndexes = this.targetIndexByCircle.get(i) || [];
        if (targetIndexes.length > 0) {
          const targetCandidates = targetIndexes
            .map((targetIndex) => this.targets[targetIndex])
            .filter(Boolean);

          const currentTarget = this.getCurrentTargetForCircle(i);
          const activeTarget = currentTarget || targetCandidates[0];
          if (activeTarget) {
            const isCurrentTarget = currentTarget !== null && activeTarget === currentTarget;
            const isCompletedTarget = false;
            const targetColors = this.getTargetBubbleColors(activeTarget, i, isCurrentTarget, isCompletedTarget);
            fill = targetColors.fill;
            stroke = targetColors.stroke;
          }
        }
      }

      if (pointFlash) {
        const flashAlpha = Math.max(0, 1 - flashProgress);
        const flashOscillation = 0.5 + 0.5 * Math.sin(flashProgress * Math.PI);
        const glowBase = pointFlash.hand === 'left'
          ? [117, 165, 255]
          : [255, 168, 112];
        fill = `rgba(${glowBase[0]}, ${glowBase[1]}, ${glowBase[2]}, ${0.12 + flashOscillation * 0.7 + flashAlpha * 0.1})`;
        stroke = `rgba(255, 255, 255, ${0.75 + flashOscillation * 0.2})`;
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

  getConsistencyDistanceScore(distance, threshold) {
    if (!Number.isFinite(distance) || distance < 0) {
      return 0;
    }
    if (distance <= threshold) {
      return 1;
    }
    return Math.max(0, 1 - (distance - threshold) / Math.max(1, threshold));
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
      const score = this.getConsistencyDistanceScore(distance, threshold);
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
    const bpm = Math.max(30, this.consistencyTempoBpm);
    const growDurationMs = (60 / bpm) * 1000 / 5;
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

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
      const handState = this.consistencyTouchStateByHand[movingTarget.hand] || {
        touching: false,
        startedAt: 0,
        releaseStartedAt: 0,
        scale: 1
      };
      const tip = movingTarget.hand === 'left' ? this.leftTip : this.rightTip;
      const distance = tip ? this.distance(tip, movingTarget) : Number.POSITIVE_INFINITY;
      const isActiveTouch = tip && distance <= threshold;

      if (isActiveTouch) {
        if (!handState.touching) {
          handState.touching = true;
          handState.startedAt = nowMs;
          handState.releaseStartedAt = 0;
        }
      } else if (handState.touching) {
        handState.touching = false;
        handState.releaseStartedAt = nowMs;
      }

      const growProgress = handState.touching
        ? Math.min(1, (nowMs - handState.startedAt) / Math.max(1, growDurationMs))
        : 0;
      const releaseProgress = handState.releaseStartedAt > 0
        ? Math.min(1, (nowMs - handState.releaseStartedAt) / Math.max(1, growDurationMs))
        : 0;

      const ringPhase = handState.touching
        ? easeOutCubic(growProgress)
        : (handState.releaseStartedAt > 0
          ? 1 - easeOutCubic(releaseProgress)
          : 0);

      const currentScale = handState.touching
        ? 1 + (1.35 - 1) * easeOutCubic(growProgress)
        : (handState.releaseStartedAt > 0
          ? 1.35 + (1 - 1.35) * easeOutCubic(releaseProgress)
          : 1);

      handState.scale = currentScale;
      if (handState.releaseStartedAt > 0 && releaseProgress >= 1) {
        handState.releaseStartedAt = 0;
        handState.scale = 1;
      }
      this.consistencyTouchStateByHand[movingTarget.hand] = handState;

      const activeRadius = pointRadius * handState.scale;
      const ringDash = ringPhase >= 0.98 ? [] : [Math.max(0.5, 8 * (1 - ringPhase)), Math.max(0.5, 6 * (1 - ringPhase))];
      const ringOpacity = 0.34 + ringPhase * 0.46;
      const accuracyPercent = Math.round(Math.max(0, Math.min(100, (this.consistencyAccuracy || 0) * 100)));

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.strokeStyle = `rgba(255, 239, 190, ${ringOpacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash(ringDash);
      this.ctx.arc(movingTarget.x, movingTarget.y, threshold, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.fillStyle = movingTarget.color;
      this.ctx.shadowBlur = isActiveTouch ? 20 : 14;
      this.ctx.shadowColor = movingTarget.color;
      this.ctx.arc(movingTarget.x, movingTarget.y, activeRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (isActiveTouch) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.font = '700 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${accuracyPercent}%`, movingTarget.x, movingTarget.y);
        this.ctx.restore();
      }
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

      const explicitSide = hand.side === 'left' || hand.side === 'right' ? hand.side : null;
      const side = explicitSide || (tip.x < this.canvas.width * 0.5 ? 'right' : 'left');

      if (side === 'left') {
        this.leftTip = tip;
      } else if (side === 'right') {
        this.rightTip = tip;
      }
    }

    const freeMovementActive = this.chapter === 1 && Number.isInteger(this.level) && this.level === 2;
    const leftIdx = this.leftTip ? this.getCircleIndex(this.leftTip) : -1;
    const rightIdx = this.rightTip ? this.getCircleIndex(this.rightTip) : -1;
    const nowMs = performance.now();

    for (const hand of ['left', 'right']) {
      if (!freeMovementActive) {
        this.activeTouchCircleByHand[hand].clear();
        this.activeTouchFadeByHand[hand].clear();
        continue;
      }

      if (!this.activeTouchFadeEnabled) {
        this.activeTouchFadeByHand[hand].clear();
      }
      const currentIndex = hand === 'left' ? leftIdx : rightIdx;
      const previousSet = this.activeTouchCircleByHand[hand] || new Set();
      const nextSet = new Set();
      if (currentIndex >= 0) {
        nextSet.add(currentIndex);
      }

      previousSet.forEach((index) => {
        if (index !== currentIndex) {
          if (this.activeTouchFadeEnabled) {
            this.activeTouchFadeByHand[hand].set(index, {
              startedAt: nowMs,
              endAt: nowMs + this.activeTouchFadeDurationMs
            });
          } else {
            this.activeTouchFadeByHand[hand].delete(index);
          }
        }
      });

      if (currentIndex >= 0) {
        this.activeTouchFadeByHand[hand].delete(currentIndex);
      }

      this.activeTouchCircleByHand[hand] = nextSet;
    }

    if (this.calibrationActive && (this.level === 1 || this.level === 2)) {
      this.requestRender();
      return;
    }

    if (this.consistencyActive) {
      this.requestRender();
      return;
    }

    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 2) {
      const targetScales = new Array(this.grid.length).fill(1.0);
      const leftIdx = this.leftTip ? this.getCircleIndex(this.leftTip) : -1;
      const rightIdx = this.rightTip ? this.getCircleIndex(this.rightTip) : -1;

      const leftPrevious = this.activeTouchCircleByHand.left || new Set();
      const rightPrevious = this.activeTouchCircleByHand.right || new Set();

      if (leftIdx !== -1) {
        targetScales[leftIdx] = 1.5;
        if (!leftPrevious.has(leftIdx)) {
          this.triggerTouchToneForCircleIndex(leftIdx, 'left');
        }
      }
      if (rightIdx !== -1) {
        targetScales[rightIdx] = 1.5;
        if (!rightPrevious.has(rightIdx)) {
          this.triggerTouchToneForCircleIndex(rightIdx, 'right');
        }
      }

      for (const hand of ['left', 'right']) {
        const previousSet = this.activeTouchCircleByHand[hand] || new Set();
        const currentIndex = hand === 'left' ? leftIdx : rightIdx;
        const nextSet = new Set();
        if (currentIndex !== -1) {
          nextSet.add(currentIndex);
        }
        this.activeTouchCircleByHand[hand] = nextSet;
        previousSet.forEach((index) => {
          if (index !== currentIndex) {
            this.activeTouchCircleByHand[hand].delete(index);
          }
        });
      }

      for (let i = 0; i < this.circleScales.length; i += 1) {
        this.circleScales[i] += (targetScales[i] - this.circleScales[i]) * 0.1;
      }
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

    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1 && this.pointExerciseSequentialMode === 'independent') {
      const leftCurrentTarget = this.getCurrentTargetForHand('left');
      const rightCurrentTarget = this.getCurrentTargetForHand('right');

      const leftTouched = leftCurrentTarget && this.leftTip && this.getCircleIndex(this.leftTip) === leftCurrentTarget.index;
      const rightTouched = rightCurrentTarget && this.rightTip && this.getCircleIndex(this.rightTip) === rightCurrentTarget.index;

      if (leftTouched) {
        this.pointExerciseCurrentIndex = leftCurrentTarget.index;
        this.advanceTargetForHand('left');
      }
      if (rightTouched) {
        this.pointExerciseCurrentIndex = rightCurrentTarget.index;
        this.advanceTargetForHand('right');
      }

      this.requestRender();
      return;
    }

    if (this.chapter === 1 && Number.isInteger(this.level) && this.level === 1 && ['sequential', 'simultaneous'].includes(this.pointExerciseSequentialMode)) {
      const currentTarget = this.targets[this.nextTarget] || null;
      this.pointExerciseCurrentIndex = this.nextTarget;

      if (!currentTarget) {
        this.requestRender();
        return;
      }

      let stepTargets = [currentTarget];
      if (this.pointExerciseSequentialMode === 'simultaneous') {
        let pairedTarget = null;
        for (let offset = 1; offset < this.targets.length; offset += 1) {
          const candidateTarget = this.targets[this.nextTarget + offset] || null;
          if (!candidateTarget || !currentTarget || !currentTarget.hand || !candidateTarget.hand || currentTarget.hand === 'both' || candidateTarget.hand === 'both') {
            continue;
          }
          if (currentTarget.hand !== candidateTarget.hand) {
            pairedTarget = candidateTarget;
            break;
          }
        }
        if (pairedTarget) {
          stepTargets = [currentTarget, pairedTarget];
        }
      }

      const stepComplete = stepTargets.every((target) => {
        if (!target || !target.hand || !['left', 'right'].includes(target.hand)) {
          return false;
        }

        if (target.hand === 'left' && this.leftTip) {
          return this.getCircleIndex(this.leftTip) === target.index;
        }
        if (target.hand === 'right' && this.rightTip) {
          return this.getCircleIndex(this.rightTip) === target.index;
        }
        return false;
      });

      if (stepComplete) {
        this.advancePointExerciseTarget(stepTargets);
      }

      this.requestRender();
      return;
    }

    const currentTarget = this.targets[this.nextTarget];
    const activeTargets = this.squareExerciseHandMode === 'both' && currentTarget && currentTarget.hand !== 'both'
      ? ['left', 'right']
          .map((hand) => this.getCurrentTargetForHand(hand))
          .filter(Boolean)
      : [currentTarget].filter(Boolean);

    if (activeTargets.length === 0) {
      this.requestRender();
      return;
    }

    const leftCurrentTarget = this.squareExerciseHandMode === 'both' ? this.getCurrentTargetForHand('left') : null;
    const rightCurrentTarget = this.squareExerciseHandMode === 'both' ? this.getCurrentTargetForHand('right') : null;
    const leftTouched = leftCurrentTarget && this.leftTip ? this.getCircleIndex(this.leftTip) === leftCurrentTarget.index : false;
    const rightTouched = rightCurrentTarget && this.rightTip ? this.getCircleIndex(this.rightTip) === rightCurrentTarget.index : false;

    if (this.squareExerciseHandMode === 'both' && this.squareExerciseSyncMode === 'synchronous') {
      if (leftTouched && rightTouched) {
        this.advanceTargetForHand('left');
        this.advanceTargetForHand('right');
      }
      this.requestRender();
      return;
    }

    for (const target of activeTargets) {
      let touched = false;
      if (target.hand === 'left') {
        const tip = this.leftTip;
        if (tip) touched = this.getCircleIndex(tip) === target.index;
      } else if (target.hand === 'right') {
        const tip = this.rightTip;
        if (tip) touched = this.getCircleIndex(tip) === target.index;
      } else if (target.hand === 'both') {
        const leftIdx = this.leftTip ? this.getCircleIndex(this.leftTip) : -1;
        const rightIdx = this.rightTip ? this.getCircleIndex(this.rightTip) : -1;
        const leftMatch = leftIdx !== -1 && leftIdx === target.leftIndex;
        const rightMatch = rightIdx !== -1 && rightIdx === target.rightIndex;
        touched = leftMatch && rightMatch;
      }

      if (touched) {
        if (this.pointExercisePalindromMode) {
          this.advancePointExerciseTarget([target]);
        } else if (target.hand === 'both') {
          this.nextTarget += 1;
          if (this.nextTarget >= this.targets.length) {
            this.nextTarget = 0;
            this.completed = false;
          }
        } else if (this.squareExerciseHandMode === 'both') {
          this.advanceTargetForHand(target.hand);
        } else {
          this.nextTarget += 1;
          if (this.nextTarget >= this.targets.length) {
            this.nextTarget = 0;
            this.completed = false;
          }
        }
      }
    }

    this.requestRender();
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
