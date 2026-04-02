let stabilizationEnabled = true;
const landmarksListeners = [];
let resizeCallback = null;

export function setStabilizationEnabled(enabled) {
  stabilizationEnabled = enabled;
}

export function onLandmarksUpdate(callback) {
  if (typeof callback === 'function') {
    landmarksListeners.push(callback);
  }
}

export function onCanvasResize(callback) {
  if (typeof callback === 'function') {
    resizeCallback = callback;
  }
}

export function startTracking(videoElement, canvasElement) {
  const ctx = canvasElement.getContext('2d');
  const connectorStyle = { color: '#5de6b1', lineWidth: 2 };
  const landmarkStyle = { fillStyle: '#f1ffb0', radius: 4 };
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  let lastFrameTime = performance.now();
  let smoothedHandLandmarks = [];

  function resizeCanvasIfNeeded() {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    if (canvasElement.width !== width || canvasElement.height !== height) {
      canvasElement.width = width;
      canvasElement.height = height;
      console.log(`Canvas resized to ${width}x${height}`);
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
        z: alpha * landmark.z + (1 - alpha) * prev.z
      };
    });
  }

  function drawHandSkeleton(landmarks) {
    ctx.strokeStyle = connectorStyle.color;
    ctx.lineWidth = connectorStyle.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      ctx.beginPath();
      ctx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
      ctx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);
      ctx.stroke();
    }
  }

  function drawHandLandmarks(landmarks) {
    ctx.fillStyle = landmarkStyle.fillStyle;
    for (const landmark of landmarks) {
      const x = landmark.x * canvasElement.width;
      const y = landmark.y * canvasElement.height;
      ctx.beginPath();
      ctx.arc(x, y, landmarkStyle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  hands.onResults((results) => {
    const now = performance.now();
    const fps = 1000 / (now - lastFrameTime);
    lastFrameTime = now;
    // console.log(`FPS: ${fps.toFixed(1)}`);

    resizeCanvasIfNeeded();

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasElement.width, 0);
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
      const rawHands = results.multiHandLandmarks;
      const stableHands = stabilizationEnabled
        ? rawHands.map((landmarks, index) => applyExponentialMovingAverage(landmarks, smoothedHandLandmarks[index]))
        : rawHands;

      smoothedHandLandmarks = stableHands;

      for (const landmarks of stableHands) {
        drawHandSkeleton(landmarks);
        drawHandLandmarks(landmarks);
      }

      const canvasLandmarks = stableHands.map((hand) => hand.map((landmark) => ({
        x: (1 - landmark.x) * canvasElement.width,
        y: landmark.y * canvasElement.height,
        z: landmark.z
      })));

      landmarksListeners.forEach((listener) => listener(canvasLandmarks));
    }

    ctx.restore();
  });

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
  });

  camera.start();
}
