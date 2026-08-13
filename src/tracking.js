let stabilizationEnabled = true;
let landmarkDrawingEnabled = true;
const landmarksListeners = [];
const poseListeners = [];
let resizeCallback = null;

export function setStabilizationEnabled(enabled) {
  stabilizationEnabled = enabled;
}

export function setLandmarkDrawingEnabled(enabled) {
  landmarkDrawingEnabled = enabled;
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
      ctx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
      ctx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);
      ctx.stroke();
    }
  }

  function drawPoints(landmarks) {
    ctx.fillStyle = landmarkStyle.fillStyle;
    for (const landmark of landmarks) {
      const x = landmark.x * canvasElement.width;
      const y = landmark.y * canvasElement.height;
      ctx.beginPath();
      ctx.arc(x, y, landmarkStyle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMirroredFrame(image) {
    resizeCanvasIfNeeded();
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasElement.width, 0);
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(image, 0, 0, canvasElement.width, canvasElement.height);
  }

  function closeMirroredFrame() {
    ctx.restore();
  }

  function drawTriggerPoint(normalizedPoint, side = null) {
    if (!normalizedPoint) {
      return;
    }

    const x = normalizedPoint.x * canvasElement.width;
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
      ctx.scale(-1, 1); // un-mirror text drawn inside mirrored frame
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
          const side = mpLabel === 'Left' ? 'right' : mpLabel === 'Right' ? 'left' : null;
          const indexTipTrigger = createTriggerPointFromLandmarks(handLandmarks, 8);
          drawTriggerPoint(indexTipTrigger, side);
        }

        const canvasLandmarks = stableHands.map((hand) => hand.map((landmark) => ({
          x: (1 - landmark.x) * canvasElement.width,
          y: landmark.y * canvasElement.height,
          z: landmark.z
        })));

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
    stop
  };
}
