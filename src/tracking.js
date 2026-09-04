let stabilizationEnabled = true;
let landmarkDrawingEnabled = true;
let silhouetteEnabled = false;
let silhouetteOpacity = 0.2;
let videoSofteningEnabled = true;
let videoSofteningBlurPx = 5;
let videoSofteningBrightness = 0.75;
const landmarksListeners = [];
const poseListeners = [];
let resizeCallback = null;

export function setStabilizationEnabled(enabled) {
  stabilizationEnabled = enabled;
}

export function setLandmarkDrawingEnabled(enabled) {
  landmarkDrawingEnabled = enabled;
}

export function setSilhouetteEnabled(enabled) {
  silhouetteEnabled = Boolean(enabled);
}

export function setSilhouetteOpacity(value) {
  const next = Number(value);
  silhouetteOpacity = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 0.2;
}

export function setVideoSofteningEnabled(enabled) {
  videoSofteningEnabled = Boolean(enabled);
}

export function setVideoSofteningStyle(blurPx = 5, brightness = 0.75) {
  const nextBlur = Number.isFinite(Number(blurPx)) ? Number(blurPx) : 5;
  const nextBrightness = Number.isFinite(Number(brightness)) ? Number(brightness) : 0.75;
  videoSofteningBlurPx = Math.min(20, Math.max(2, nextBlur));
  videoSofteningBrightness = Math.min(0.9, Math.max(0.2, nextBrightness));
}

export function getVideoSofteningStyle() {
  return {
    blurPx: videoSofteningBlurPx,
    brightness: videoSofteningBrightness
  };
}

export function onLandmarksUpdate(callback) {
  if (typeof callback === 'function') {
    landmarksListeners.push(callback);
  }
}

export function onPoseUpdate(callback) {
  if (typeof callback === 'function') {
    poseListeners.push(callback);
  }
}

export function onCanvasResize(callback) {
  if (typeof callback === 'function') {
    resizeCallback = callback;
  }
}

export function startTracking(videoElement, canvasElement, options = {}) {
  const ctx = canvasElement.getContext('2d');
  const VIDEO_RESOLUTION_PRESETS = {
    high: { width: 1280, height: 720 },
    low: { width: 640, height: 360 }
  };
  const connectorStyle = { color: '#5de6b1', lineWidth: 2 };
  const landmarkStyle = { fillStyle: '#f1ffb0', radius: 4 };
  const triggerStyle = { radius: 9 };
  const triggerColors = {
    left:    { fill: '#4da6ff' },
    right:   { fill: '#ff7c35' },
    default: { fill: '#ff3d47' }
  };
  const modelListeners = [];
  const cameraListeners = [];
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];
  const POSE_EDGE_LIST = typeof POSE_CONNECTIONS !== 'undefined' ? POSE_CONNECTIONS : [];

  let activeModel = options.initialModel === 'pose' ? 'pose' : 'hands';
  let activeStream = null;
  let activeDeviceId = null;
  let selectedDeviceId = null;
  let videoResolutionPreset = options.initialResolution === 'low' ? 'low' : 'high';
  let cameraEnabled = true;
  let processing = false;
  let operationQueue = Promise.resolve();
  let handsModel = null;
  let poseModel = null;
  let smoothedHandLandmarks = [];
  let smoothedPoseLandmarks = null;

  function enqueueOperation(task) {
    operationQueue = operationQueue.then(task, task);
    return operationQueue;
  }

  function emitModelChanged(modelName) {
    modelListeners.forEach((listener) => listener(modelName));
  }

  function emitCameraChanged(deviceId) {
    cameraListeners.forEach((listener) => listener(deviceId));
  }

  function onModelChange(callback) {
    if (typeof callback === 'function') {
      modelListeners.push(callback);
    }
  }

  function onCameraChange(callback) {
    if (typeof callback === 'function') {
      cameraListeners.push(callback);
    }
  }

  function resizeCanvasIfNeeded() {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    if (!width || !height) {
      return;
    }

    if (canvasElement.width !== width || canvasElement.height !== height) {
      canvasElement.width = width;
      canvasElement.height = height;
      if (resizeCallback) {
        resizeCallback(width, height);
      }
    }
  }

  function applyExponentialMovingAverage(current, previous, alpha = 0.2) {
    if (!previous || previous.length !== current.length) {
      return current;
    }

    return current.map((landmark, index) => {
      const prev = previous[index];
      return {
        x: alpha * landmark.x + (1 - alpha) * prev.x,
        y: alpha * landmark.y + (1 - alpha) * prev.y,
        z: alpha * landmark.z + (1 - alpha) * prev.z,
        visibility: landmark.visibility
      };
    });
  }

  function toMirroredCanvasX(xValue) {
    return canvasElement.width - (xValue * canvasElement.width);
  }

  function drawConnections(landmarks, edges) {
    ctx.strokeStyle = connectorStyle.color;
    ctx.lineWidth = connectorStyle.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [startIdx, endIdx] of edges) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (!start || !end) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(toMirroredCanvasX(start.x), start.y * canvasElement.height);
      ctx.lineTo(toMirroredCanvasX(end.x), end.y * canvasElement.height);
      ctx.stroke();
    }
  }

  function drawPoints(landmarks) {
    ctx.fillStyle = landmarkStyle.fillStyle;
    for (const landmark of landmarks) {
      const x = toMirroredCanvasX(landmark.x);
      const y = landmark.y * canvasElement.height;
      ctx.beginPath();
      ctx.arc(x, y, landmarkStyle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSilhouette(landmarks) {
    if (!silhouetteEnabled || !Array.isArray(landmarks) || landmarks.length < 25) {
      return;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const midpoint = (a, b) => ({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 });
    const toCanvasPoint = (landmark) => {
      if (!landmark) {
        return null;
      }
      return { x: toMirroredCanvasX(landmark.x), y: landmark.y * canvasElement.height };
    };

    const strokeOpacity = Math.min(0.9, Math.max(0.2, silhouetteOpacity * 1.15));
    const strokeColor = `rgba(122, 180, 255, ${strokeOpacity})`;
    const fillColor = `rgba(122, 180, 255, ${silhouetteOpacity})`;

    function drawSoftClosedShape(points) {
      if (!Array.isArray(points) || points.length < 3) {
        return;
      }

      const smoothPoints = points.slice();
      if (smoothPoints.length >= 3) {
        const first = smoothPoints[0];
        const last = smoothPoints[smoothPoints.length - 1];
        const extraStart = { x: first.x + (first.x - smoothPoints[1].x) * 0.2, y: first.y + (first.y - smoothPoints[1].y) * 0.2 };
        const extraEnd = { x: last.x + (last.x - smoothPoints[smoothPoints.length - 2].x) * 0.2, y: last.y + (last.y - smoothPoints[smoothPoints.length - 2].y) * 0.2 };
        smoothPoints.unshift(extraStart);
        smoothPoints.push(extraEnd);
      }

      ctx.beginPath();
      ctx.moveTo(smoothPoints[0].x, smoothPoints[0].y);

      for (let index = 1; index < smoothPoints.length - 1; index += 1) {
        const current = smoothPoints[index];
        const next = smoothPoints[index + 1];
        const midX = (current.x + next.x) * 0.5;
        const midY = (current.y + next.y) * 0.5;
        ctx.quadraticCurveTo(current.x, current.y, midX, midY);
      }

      const last = smoothPoints[smoothPoints.length - 1];
      const first = smoothPoints[0];
      ctx.quadraticCurveTo(last.x, last.y, first.x, first.y);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }

    function drawRoundedBand(start, end, width) {
      if (!start || !end) {
        return;
      }

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;
      const half = width * 0.5;

      const a = { x: start.x + nx * half, y: start.y + ny * half };
      const b = { x: start.x - nx * half, y: start.y - ny * half };
      const c = { x: end.x + nx * half, y: end.y + ny * half };
      const d = { x: end.x - nx * half, y: end.y - ny * half };

      drawSoftClosedShape([a, c, d, b]);
    }

    function drawArmSegment(startLandmark, endLandmark, widthScale = 1, shoulderBias = 0) {
      const start = toCanvasPoint(startLandmark);
      const end = toCanvasPoint(endLandmark);
      if (!start || !end) {
        return;
      }

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) || 1;
      const baseWidth = clamp(length * 0.56 + 26, 24, 72) * widthScale;
      const shoulderWidth = baseWidth + 18 + shoulderBias;
      const endWidth = Math.max(baseWidth * 0.72, 18);

      const nx = -dy / length;
      const ny = dx / length;
      const dirX = (dx / length) || 0;
      const dirY = (dy / length) || 0;
      const shoulderExpansion = clamp(length * 0.12, 8, 18);
      const endExpansion = clamp(length * 0.12, 8, 18);

      const a = {
        x: start.x + nx * shoulderWidth * 0.5 - dirX * shoulderExpansion,
        y: start.y + ny * shoulderWidth * 0.5 - dirY * shoulderExpansion
      };
      const b = {
        x: start.x - nx * shoulderWidth * 0.5 - dirX * shoulderExpansion,
        y: start.y - ny * shoulderWidth * 0.5 - dirY * shoulderExpansion
      };
      const c = {
        x: end.x + nx * endWidth * 0.5 + dirX * endExpansion,
        y: end.y + ny * endWidth * 0.5 + dirY * endExpansion
      };
      const d = {
        x: end.x - nx * endWidth * 0.5 + dirX * endExpansion,
        y: end.y - ny * endWidth * 0.5 + dirY * endExpansion
      };

      drawRoundedPolygon([a, c, d, b], Math.min(shoulderWidth * 0.45, 30));
    }

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftEar = landmarks[7] || landmarks[5] || landmarks[1];
    const rightEar = landmarks[8] || landmarks[6] || landmarks[4];
    const mouthLeft = landmarks[9];
    const mouthRight = landmarks[10];
    const nose = landmarks[0] || landmarks[1];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !nose) {
      return;
    }

    const leftShoulderPoint = toCanvasPoint(leftShoulder);
    const rightShoulderPoint = toCanvasPoint(rightShoulder);
    const leftHipPoint = toCanvasPoint(leftHip);
    const rightHipPoint = toCanvasPoint(rightHip);
    const leftEarPoint = toCanvasPoint(leftEar || nose);
    const rightEarPoint = toCanvasPoint(rightEar || nose);
    const mouthLeftPoint = toCanvasPoint(mouthLeft || nose);
    const mouthRightPoint = toCanvasPoint(mouthRight || nose);

    if (!leftShoulderPoint || !rightShoulderPoint || !leftHipPoint || !rightHipPoint) {
      return;
    }

    ctx.save();

    function drawRoundedPolygon(points, radius) {
      if (!Array.isArray(points) || points.length < 3) {
        return;
      }

      const pointToward = (start, end, distance) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;
        const factor = Math.min(distance / length, 1);
        return {
          x: start.x + dx * factor,
          y: start.y + dy * factor
        };
      };

      const safeRadius = Math.min(
        radius,
        ...points.map((point, index) => {
          const prev = points[(index - 1 + points.length) % points.length];
          const next = points[(index + 1) % points.length];
          return Math.min(
            Math.hypot(point.x - prev.x, point.y - prev.y),
            Math.hypot(point.x - next.x, point.y - next.y)
          ) * 0.5;
        })
      );

      ctx.beginPath();
      const first = points[0];
      const last = points[points.length - 1];
      const firstStart = pointToward(first, last, safeRadius);
      ctx.moveTo(firstStart.x, firstStart.y);

      for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        const prev = points[(index - 1 + points.length) % points.length];

        const from = pointToward(current, prev, safeRadius);
        const to = pointToward(current, next, safeRadius);

        ctx.lineTo(from.x, from.y);
        ctx.quadraticCurveTo(current.x, current.y, to.x, to.y);
      }

      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }

    const torsoShape = [
      {
        x: leftShoulderPoint.x - 24,
        y: leftShoulderPoint.y - 22
      },
      {
        x: rightShoulderPoint.x + 24,
        y: rightShoulderPoint.y - 22
      },
      {
        x: rightHipPoint.x + 30,
        y: rightHipPoint.y + 22
      },
      {
        x: leftHipPoint.x - 30,
        y: leftHipPoint.y + 22
      }
    ];
    drawRoundedPolygon(torsoShape, 52);

    const headShape = [
      {
        x: mouthLeftPoint.x - 12,
        y: mouthLeftPoint.y + 20
      },
      {
        x: mouthRightPoint.x + 12,
        y: mouthRightPoint.y + 20
      },
      {
        x: rightEarPoint.x + 22,
        y: rightEarPoint.y -60
      },
      {
        x: ((toCanvasPoint(landmarks[6])?.x ?? rightEarPoint.x) + (toCanvasPoint(landmarks[3])?.x ?? leftEarPoint.x)) * 0.5 + 26,
        y: ((toCanvasPoint(landmarks[6])?.y ?? rightEarPoint.y) + (toCanvasPoint(landmarks[3])?.y ?? leftEarPoint.y)) * 0.5 - 40
      },
      {
        x: ((toCanvasPoint(landmarks[3])?.x ?? leftEarPoint.x) + (toCanvasPoint(landmarks[6])?.x ?? rightEarPoint.x)) * 0.5 - 26,
        y: ((toCanvasPoint(landmarks[3])?.y ?? leftEarPoint.y) + (toCanvasPoint(landmarks[6])?.y ?? rightEarPoint.y)) * 0.5 - 40
      },
      {
        x: leftEarPoint.x - 22,
        y: leftEarPoint.y - 60
      }
    ];

    drawRoundedPolygon(headShape, 32);

    function drawPoseHandPolygon(indices, padding = 10) {
      const points = indices
        .map((index) => toCanvasPoint(landmarks[index]))
        .filter(Boolean);

      if (points.length < 3) {
        return;
      }

      const centroid = points.reduce((acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y
      }), { x: 0, y: 0 });

      centroid.x /= points.length;
      centroid.y /= points.length;

      const expanded = points.map((point) => {
        const dx = point.x - centroid.x;
        const dy = point.y - centroid.y;
        const distance = Math.hypot(dx, dy) || 1;
        return {
          x: centroid.x + (dx / distance) * (distance + padding),
          y: centroid.y + (dy / distance) * (distance + padding)
        };
      });

      drawRoundedPolygon(expanded, 18);
    }

    drawPoseHandPolygon([15, 17, 19, 21], 16);
    drawPoseHandPolygon([16, 18, 20, 22], 16);

    drawArmSegment(leftShoulder, leftElbow, 0.9, 18);
    drawArmSegment(leftElbow, leftWrist || leftShoulder, 0.7, 0);
    drawArmSegment(rightShoulder, rightElbow, 0.9, 18);
    drawArmSegment(rightElbow, rightWrist || rightShoulder, 0.7, 0);

    ctx.restore();
  }

  function drawMirroredFrame(image) {
    resizeCanvasIfNeeded();
    const drawSource = (() => {
      if (!videoSofteningEnabled) {
        return image;
      }

      const softCanvas = document.createElement('canvas');
      softCanvas.width = canvasElement.width;
      softCanvas.height = canvasElement.height;
      const softCtx = softCanvas.getContext('2d');
      if (!softCtx) {
        return image;
      }

      softCtx.filter = `blur(${videoSofteningBlurPx}px) brightness(${videoSofteningBrightness})`;
      softCtx.drawImage(image, 0, 0, softCanvas.width, softCanvas.height);
      return softCanvas;
    })();

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasElement.width, 0);
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(drawSource, 0, 0, canvasElement.width, canvasElement.height);
    ctx.restore();
  }

  function closeMirroredFrame() {
    ctx.restore();
  }

  function drawTriggerPoint(normalizedPoint, side = null) {
    if (!normalizedPoint) {
      return;
    }

    const x = toMirroredCanvasX(normalizedPoint.x);
    const y = normalizedPoint.y * canvasElement.height;
    const radius = triggerStyle.radius;
    const colors = (side && triggerColors[side]) ? triggerColors[side] : triggerColors.default;
    const label = side === 'left' ? 'L' : side === 'right' ? 'R' : null;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    if (label) {
      ctx.save();
      ctx.translate(x, y);
      ctx.font = `bold ${Math.round(radius * 1.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  function createTriggerPointFromLandmarks(landmarks, firstIndex, secondIndex = null) {
    const first = landmarks[firstIndex];
    if (!first) {
      return null;
    }

    if (secondIndex === null) {
      return { x: first.x, y: first.y, z: first.z };
    }

    const second = landmarks[secondIndex];
    if (!second) {
      return null;
    }

    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      z: ((first.z || 0) + (second.z || 0)) / 2
    };
  }

  function createPoseTipHands(poseLandmarks) {
    const LEFT_PINKY_INDEX = 17;
    const RIGHT_PINKY_INDEX = 18;
    const LEFT_INDEX_FINGER = 19;
    const RIGHT_INDEX_FINGER = 20;

    const leftPinky = poseLandmarks[LEFT_PINKY_INDEX];
    const leftIndex = poseLandmarks[LEFT_INDEX_FINGER];
    const rightPinky = poseLandmarks[RIGHT_PINKY_INDEX];
    const rightIndex = poseLandmarks[RIGHT_INDEX_FINGER];

    const pseudoHands = [];

    if (leftPinky && leftIndex) {
      const leftTipMidpoint = createTriggerPointFromLandmarks(poseLandmarks, LEFT_PINKY_INDEX, LEFT_INDEX_FINGER);
      const leftHand = new Array(9).fill(null);
      leftHand[8] = {
        x: (1 - leftTipMidpoint.x) * canvasElement.width,
        y: leftTipMidpoint.y * canvasElement.height,
        z: leftTipMidpoint.z
      };
      leftHand.side = 'left';
      pseudoHands.push(leftHand);
    }

    if (rightPinky && rightIndex) {
      const rightTipMidpoint = createTriggerPointFromLandmarks(poseLandmarks, RIGHT_PINKY_INDEX, RIGHT_INDEX_FINGER);
      const rightHand = new Array(9).fill(null);
      rightHand[8] = {
        x: (1 - rightTipMidpoint.x) * canvasElement.width,
        y: rightTipMidpoint.y * canvasElement.height,
        z: rightTipMidpoint.z
      };
      rightHand.side = 'right';
      pseudoHands.push(rightHand);
    }

    return pseudoHands;
  }

  async function getHandsModel() {
    if (handsModel) {
      return handsModel;
    }

    handsModel = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsModel.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    handsModel.onResults((results) => {
      if (activeModel !== 'hands') {
        return;
      }

      drawMirroredFrame(results.image);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const rawHands = results.multiHandLandmarks;
        const stableHands = stabilizationEnabled
          ? rawHands.map((landmarks, index) => applyExponentialMovingAverage(landmarks, smoothedHandLandmarks[index]))
          : rawHands;

        smoothedHandLandmarks = stableHands;

        if (landmarkDrawingEnabled) {
          for (const handLandmarks of stableHands) {
            drawConnections(handLandmarks, HAND_CONNECTIONS);
            drawPoints(handLandmarks);
          }
        }

        const handednessData = results.multiHandedness || [];
        for (let i = 0; i < stableHands.length; i++) {
          const handLandmarks = stableHands[i];
          const mpLabel = handednessData[i] ? handednessData[i].label : null;
          const side = mpLabel === 'Left' ? 'left' : mpLabel === 'Right' ? 'right' : null;
          const indexTipTrigger = createTriggerPointFromLandmarks(handLandmarks, 8);
          drawTriggerPoint(indexTipTrigger, side);
        }

        const canvasLandmarks = stableHands.map((hand, index) => {
          const normalized = hand.map((landmark) => ({
            x: (1 - landmark.x) * canvasElement.width,
            y: landmark.y * canvasElement.height,
            z: landmark.z
          }));
          const mpLabel = handednessData[index] ? handednessData[index].label : null;
          const side = mpLabel === 'Left' ? 'left' : mpLabel === 'Right' ? 'right' : null;
          normalized.side = side;
          return normalized;
        });

        landmarksListeners.forEach((listener) => listener(canvasLandmarks));
        poseListeners.forEach((listener) => listener([]));
      } else {
        smoothedHandLandmarks = [];
        landmarksListeners.forEach((listener) => listener([]));
        poseListeners.forEach((listener) => listener([]));
      }

      closeMirroredFrame();
    });

    return handsModel;
  }

  async function getPoseModel() {
    if (poseModel) {
      return poseModel;
    }

    poseModel = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    poseModel.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    poseModel.onResults((results) => {
      if (activeModel !== 'pose') {
        return;
      }

      drawMirroredFrame(results.image);

      if (results.poseLandmarks && results.poseLandmarks.length > 0) {
        const stablePose = stabilizationEnabled
          ? applyExponentialMovingAverage(results.poseLandmarks, smoothedPoseLandmarks)
          : results.poseLandmarks;

        smoothedPoseLandmarks = stablePose;
        if (silhouetteEnabled) {
          drawSilhouette(stablePose);
        }
        if (landmarkDrawingEnabled) {
          drawConnections(stablePose, POSE_EDGE_LIST);
          drawPoints(stablePose);
        }

        const leftPoseTrigger = createTriggerPointFromLandmarks(stablePose, 17, 19);
        const rightPoseTrigger = createTriggerPointFromLandmarks(stablePose, 18, 20);

        drawTriggerPoint(leftPoseTrigger, 'left');
        drawTriggerPoint(rightPoseTrigger, 'right');

        const poseTipHands = createPoseTipHands(stablePose);
        landmarksListeners.forEach((listener) => listener(poseTipHands));

        const canvasPoseLandmarks = stablePose.map((landmark) => ({
          x: (1 - landmark.x) * canvasElement.width,
          y: landmark.y * canvasElement.height,
          z: landmark.z,
          visibility: landmark.visibility
        }));
        poseListeners.forEach((listener) => listener(canvasPoseLandmarks));
      } else {
        smoothedPoseLandmarks = null;
        landmarksListeners.forEach((listener) => listener([]));
        poseListeners.forEach((listener) => listener([]));
      }
      closeMirroredFrame();
    });

    return poseModel;
  }

  async function getActiveModel() {
    return activeModel === 'pose' ? getPoseModel() : getHandsModel();
  }

  function stopStream() {
    if (!activeStream) {
      return;
    }

    const tracks = activeStream.getTracks();
    tracks.forEach((track) => track.stop());
    activeStream = null;
    activeDeviceId = null;
    videoElement.srcObject = null;
    emitCameraChanged(null);
  }

  function closeTrackingModels() {
    if (poseModel && typeof poseModel.close === 'function') {
      try {
        poseModel.close();
      } catch (error) {
        // ignore close errors during background tear-down
      }
      poseModel = null;
    }

    if (handsModel && typeof handsModel.close === 'function') {
      try {
        handsModel.close();
      } catch (error) {
        // ignore close errors during background tear-down
      }
      handsModel = null;
    }

    smoothedHandLandmarks = [];
    smoothedPoseLandmarks = null;
  }

  async function startStream(deviceId = null) {
    cameraEnabled = true;
    stopStream();

    const resolution = VIDEO_RESOLUTION_PRESETS[videoResolutionPreset] || VIDEO_RESOLUTION_PRESETS.high;
    const videoConstraints = {
      width: { ideal: resolution.width },
      height: { ideal: resolution.height }
    };

    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    }

    const constraints = {
      audio: false,
      video: videoConstraints
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeStream = stream;
    selectedDeviceId = deviceId || selectedDeviceId || null;
    videoElement.srcObject = stream;
    await videoElement.play();

    const [videoTrack] = stream.getVideoTracks();
    const settings = videoTrack ? videoTrack.getSettings() : null;
    activeDeviceId = settings && settings.deviceId ? settings.deviceId : deviceId || selectedDeviceId;
    if (activeDeviceId) {
      selectedDeviceId = activeDeviceId;
    }
    emitCameraChanged(activeDeviceId);
  }

  async function listAvailableCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameraDevices = devices.filter((device) => device.kind === 'videoinput');
    return cameraDevices.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`
    }));
  }

  async function processFrames() {
    if (processing) {
      return;
    }

    processing = true;

    while (processing) {
      if (!activeStream || videoElement.readyState < 2) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        continue;
      }

      const model = await getActiveModel();
      await model.send({ image: videoElement });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }
  async function setModel(modelName) {
    if (modelName !== 'hands' && modelName !== 'pose') {
      return;
    }

    return enqueueOperation(async () => {
      if (activeModel === modelName) {
        return;
      }

      activeModel = modelName;
      smoothedHandLandmarks = [];
      smoothedPoseLandmarks = null;
      landmarksListeners.forEach((listener) => listener([]));
      poseListeners.forEach((listener) => listener([]));
      emitModelChanged(activeModel);
    });
  }

  async function setCamera(deviceId) {
    if (deviceId) {
      selectedDeviceId = deviceId;
    }
    cameraEnabled = true;
    return enqueueOperation(async () => {
      await startStream(deviceId || selectedDeviceId || null);
    });
  }

  function setCameraEnabled(enabled) {
    const desiredState = Boolean(enabled);
    cameraEnabled = desiredState;

    if (!desiredState) {
      stopStream();
      return;
    }

    return enqueueOperation(async () => {
      await startStream(selectedDeviceId || null);
    });
  }

  function isCameraEnabled() {
    return cameraEnabled && Boolean(activeStream);
  }

  function getCurrentModel() {
    return activeModel;
  }

  function getCurrentDeviceId() {
    return activeDeviceId || selectedDeviceId || null;
  }

  async function setResolutionPreset(preset) {
    const nextPreset = preset === 'low' ? 'low' : 'high';

    return enqueueOperation(async () => {
      if (videoResolutionPreset === nextPreset) {
        return;
      }

      videoResolutionPreset = nextPreset;
      smoothedHandLandmarks = [];
      smoothedPoseLandmarks = null;
      landmarksListeners.forEach((listener) => listener([]));
      poseListeners.forEach((listener) => listener([]));

      if (cameraEnabled) {
        await startStream(selectedDeviceId || null);
      }
    });
  }

  function getResolutionPreset() {
    return videoResolutionPreset;
  }

  function stop() {
    processing = false;
    cameraEnabled = false;
    stopStream();
  }

  function pauseForBackground() {
    processing = false;
    closeTrackingModels();
    if (cameraEnabled) {
      stopStream();
    }
    if (videoElement && !videoElement.paused) {
      videoElement.pause();
    }
  }

  async function resumeFromBackground() {
    if (!cameraEnabled || document.visibilityState === 'hidden' || !document.hasFocus()) {
      return;
    }

    if (!activeStream) {
      await enqueueOperation(async () => {
        await startStream(selectedDeviceId || null);
        if (!processing) {
          processFrames();
        }
      });
      return;
    }

    if (!processing) {
      processFrames();
    }
  }

  if (document && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        pauseForBackground();
        return;
      }

      resumeFromBackground();
    });
    document.addEventListener('blur', () => {
      pauseForBackground();
    });
    document.addEventListener('focus', () => {
      if (document.visibilityState !== 'hidden' && document.hasFocus()) {
        resumeFromBackground();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('blur', () => {
      pauseForBackground();
    });
    window.addEventListener('focus', () => {
      if (document.visibilityState !== 'hidden' && document.hasFocus()) {
        resumeFromBackground();
      }
    });
  }

  if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      if (typeof options.onCamerasChanged === 'function') {
        const cameras = await listAvailableCameras();
        options.onCamerasChanged(cameras);
      }
    });
  }

  enqueueOperation(async () => {
    await startStream(null);
    if (typeof options.onCamerasChanged === 'function') {
      const cameras = await listAvailableCameras();
      options.onCamerasChanged(cameras);
    }
    emitModelChanged(activeModel);
  });

  processFrames();

  return {
    listAvailableCameras,
    setCamera,
    setCameraEnabled,
    isCameraEnabled,
    setModel,
    getCurrentModel,
    getCurrentDeviceId,
    setResolutionPreset,
    getResolutionPreset,
    onModelChange,
    onCameraChange,
    stop,
    pauseForBackground,
    resumeFromBackground
  };
}
