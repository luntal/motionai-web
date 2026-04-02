const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const ctx = canvasElement.getContext('2d');

// Setup MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 0, // 0=fastest, 1=default, 2=most accurate
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

let lastFrameTime = performance.now();
// Called on each hand detection
hands.onResults((results) => {
  const now = performance.now();
  const fps = 1000 / (now - lastFrameTime);
  lastFrameTime = now;
  // console.log(`FPS: ${fps.toFixed(1)}, Latenz: ${(now - lastFrameTime).toFixed(1)} ms`);
  console.log(`FPS: ${fps.toFixed(1)}`);
  
  // Canvas match video size, no resizing needed
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  ctx.save();
  ctx.scale(-1, 1); // horizontal spiegeln
  ctx.translate(-canvasElement.width, 0); // nach links verschieben
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1 });
    }
  }
  ctx.restore();
});

// Use requestVideoFrameCallback for low latency
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

camera.start();
