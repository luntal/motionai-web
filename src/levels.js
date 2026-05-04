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
    this.calibrationAnimationStart = performance.now();
    this.calibrationInfoEl = null;
    this.consistencyActive = false;
    this.consistencyInfoEl = null;
    this.consistencyScoreHistory = [];
    this.consistencyAccuracy = 0;
    this.consistencyAnimationStart = performance.now();
    this.consistencyPhase = 0;
    this.consistencyLastTickMs = performance.now();
    this.consistencySpeedPercent = 100;
    this.consistencyStrictnessPercent = 100;
    this.consistencyMotionBlendPercent = 0;
    this.gridRows = 12;
    this.gridCols = 16;
    this.createCalibrationInfoPanel();
    this.createConsistencyInfoPanel();
    this.buildGrid();
  }

  createCalibrationInfoPanel() {
    const panel = document.createElement('div');
    panel.className = 'calibration-info-panel';
    panel.innerHTML = '<h3>Kallibrierung</h3><p>Warte auf Pose-Daten...</p>';
    panel.style.display = 'none';
    document.body.appendChild(panel);
    this.calibrationInfoEl = panel;
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

    const rect = this.canvas.getBoundingClientRect();
    const panelMargin = 12;
    const panelMarginTop = 24;
    const topOffset = Math.max(panelMarginTop, rect.top + panelMarginTop);

    this.calibrationInfoEl.style.left = 'auto';
    this.calibrationInfoEl.style.right = `${panelMargin}px`;
    this.calibrationInfoEl.style.top = `${topOffset}px`;
  }

  updateCalibrationPanelContent() {
    if (!this.calibrationInfoEl) {
      return;
    }

    if (this.level === 1) {
      this.calibrationInfoEl.classList.remove('success');
      this.calibrationInfoEl.innerHTML = `
        <h3>Kallibrierung - forte</h3>
        <p>Folge den großen Referenz-Linien mit beiden Händen spiegelbildlich.</p>
        <p class="calibration-status">Pfad: Oben nach unten, dann nach innen und zurück.</p>
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
        <p class="calibration-hint">Die Punkte zeigen den kleineren Bewegungsraum.</p>
      `;
      return;
    }

    const scorePercent = Math.round(this.calibrationScore * 100);
    const stateText = this.calibrationSuccess ? 'Perfekt ausgerichtet!' : 'Noch nicht stabil ausgerichtet';
    const hintText = this.calibrationSuccess
      ? 'Sehr gut. Du bist zentriert und passend positioniert.'
      : 'Augen zur oberen Linie, Hüfte zur unteren Linie, Arme als symmetrisches Dreieck.';

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
    this.consistencyInfoEl.style.display = visible ? 'block' : 'none';
  }

  updateConsistencyPanelPosition() {
    if (!this.consistencyInfoEl) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const panelMargin = 12;
    const panelMarginTop = 24;
    const topOffset = Math.max(panelMarginTop, rect.top + panelMarginTop);

    this.consistencyInfoEl.style.left = 'auto';
    this.consistencyInfoEl.style.right = `${panelMargin}px`;
    this.consistencyInfoEl.style.top = `${topOffset}px`;
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
          <span class="consistency-slider-value consistency-speed-value">100%</span>
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
        speedSlider.value = String(this.consistencySpeedPercent);
        speedSlider.addEventListener('input', (event) => {
          const next = Number(event.target.value);
          this.consistencySpeedPercent = Number.isFinite(next) ? next : 100;
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
      speedValueEl.textContent = `${Math.round(this.consistencySpeedPercent)}%`;
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
    console.log(`Building grid with canvas dimensions: ${w}x${h}`);
    const spacingX = w / cols;
    const spacingY = h / rows;
    const radiusX = spacingX / 2 * 0.98;
    const radiusY = spacingY / 2 * 0.98;
    console.log(`Grid spacing: ${spacingX.toFixed(1)}x${spacingY.toFixed(1)}, radii: ${radiusX.toFixed(1)}x${radiusY.toFixed(1)}`);

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
    console.log(`Built grid with ${this.grid.length} circles`);
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
    this.chapter = chapter;
    this.setupLevel();
  }

  setLevel(level) {
    this.level = level;
    this.setupLevel();
  }

  setupLevel() {
    this.targets = [];
    this.nextTarget = 0;
    this.completed = false;
    console.log(`setupLevel called: chapter=${this.chapter}, level=${this.level}`);

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

    this.calibrationActive = false;
    this.setCalibrationPanelVisible(false);
    this.consistencyActive = false;
    this.setConsistencyPanelVisible(false);

    if (this.chapter !== 1 || this.level === null) {
      this.active = false;
      console.log(`Level inactive - conditions not met`);
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
    console.log(`Level activated!`);

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

    console.log(`Targets set up: ${this.targets.length} targets`);
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

  render() {
    if (!this.canvas.width || !this.canvas.height) {
      console.log(`Render skipped: canvas dimensions are 0`);
      return;
    }
    this.clear();

    if (this.calibrationActive) {
      this.setCalibrationPanelVisible(true);
      this.setConsistencyPanelVisible(false);
      this.renderCalibration();
      return;
    }

    this.setCalibrationPanelVisible(false);

    if (this.consistencyActive) {
      this.setConsistencyPanelVisible(true);
      this.renderConsistency();
      return;
    }

    this.setConsistencyPanelVisible(false);

    if (!this.active) {
      console.log(`Render skipped: level not active`);
      return;
    }

    console.log(`Rendering: grid=${this.grid.length}, active=${this.active}, scales sample: ${this.circleScales.slice(0, 3).map(s => s.toFixed(2)).join(',')}`);
    // draw grid
    for (let i = 0; i < this.grid.length; i += 1) {
      const circle = this.grid[i];
      const scale = this.circleScales[i];
      const radiusX = circle.radiusX * scale;
      const radiusY = circle.radiusY * scale;
      let fill = 'rgba(255, 255, 255, 0.08)';
      let stroke = 'rgba(255, 255, 255, 0.16)';

      // check if target
      const targetIndex = this.targets.findIndex(t => t.index === i || t.leftIndex === i || t.rightIndex === i);
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
  }

  updatePose(poseLandmarks) {
    this.poseLandmarks = poseLandmarks || [];

    if (!this.calibrationActive) {
      return;
    }

    if (this.level === 0) {
      this.evaluateCalibration();
    }
    this.render();
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

  evaluateCalibration() {
    const leftEye = this.getVisiblePoint(2) || this.getVisiblePoint(1);
    const rightEye = this.getVisiblePoint(5) || this.getVisiblePoint(4);
    const leftHip = this.getVisiblePoint(23);
    const rightHip = this.getVisiblePoint(24);
    const leftWrist = this.getVisiblePoint(15);
    const rightWrist = this.getVisiblePoint(16);

    const eyeCenter = this.averagePoints(leftEye, rightEye);
    const hipCenter = this.averagePoints(leftHip, rightHip);

    this.calibrationMetrics = {
      leftEye,
      rightEye,
      leftHip,
      rightHip,
      leftWrist,
      rightWrist,
      eyeCenter,
      hipCenter
    };

    if (!eyeCenter || !hipCenter || !leftWrist || !rightWrist) {
      this.calibrationScore = 0;
      this.calibrationAligned = false;
      this.calibrationSuccess = false;
      this.calibrationAlignedSince = 0;
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const bodyCenterX = (eyeCenter.x + hipCenter.x) * 0.5;
    const eyeTargetY = h * 0.11;
    const hipTargetY = h * 0.9;
    const wristTargetY = h * 0.66;
    const wristTargetOffset = w * 0.19;
    const leftWristOffset = centerX - leftWrist.x;
    const rightWristOffset = rightWrist.x - centerX;
    const wristSpan = rightWrist.x - leftWrist.x;
    const wristTargetSpan = wristTargetOffset * 2;

    const centerScore = this.scoreByDistance(bodyCenterX, centerX, w * 0.12);
    const eyeScore = this.scoreByDistance(eyeCenter.y, eyeTargetY, h * 0.08);
    const hipScore = this.scoreByDistance(hipCenter.y, hipTargetY, h * 0.1);
    const wristHeightScore = (
      this.scoreByDistance(leftWrist.y, wristTargetY, h * 0.16)
      + this.scoreByDistance(rightWrist.y, wristTargetY, h * 0.16)
    ) / 2;
    const symmetryScore = this.scoreByDistance(leftWristOffset, rightWristOffset, w * 0.14);
    const spanScore = this.scoreByDistance(wristSpan, wristTargetSpan, w * 0.2);

    const score = (
      centerScore * 0.25
      + eyeScore * 0.2
      + hipScore * 0.2
      + symmetryScore * 0.15
      + wristHeightScore * 0.1
      + spanScore * 0.1
    );

    this.calibrationScore = score;
    this.calibrationAligned = score >= 0.78;

    if (this.calibrationAligned) {
      if (!this.calibrationAlignedSince) {
        this.calibrationAlignedSince = performance.now();
      }
      this.calibrationSuccess = performance.now() - this.calibrationAlignedSince >= 800;
    } else {
      this.calibrationAlignedSince = 0;
      this.calibrationSuccess = false;
    }
  }

  renderCalibration() {
    if (this.level === 1 || this.level === 2) {
      if (this.level === 1) {
        this.renderCalibrationMotion(1, 1, false, 0.0001);
      } else {
        this.renderCalibrationMotion(0.6, 0.6, true, 0.0002);
      }
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w * 0.5;
    const eyeTargetY = h * 0.11;
    const hipTargetY = h * 0.9;
    const wristY = h * 0.8;
    const wristOffset = w * 0.25;
    const leftTargetWrist = { x: centerX - wristOffset, y: wristY };
    const rightTargetWrist = { x: centerX + wristOffset, y: wristY };
    const triangleApex = { x: centerX, y: h * 0.38 };

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
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - w * 0.12, eyeTargetY);
    this.ctx.lineTo(centerX + w * 0.12, eyeTargetY);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(95, 255, 188, 0.95)';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - w * 0.14, hipTargetY);
    this.ctx.lineTo(centerX + w * 0.14, hipTargetY);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 188, 89, 0.96)';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(leftTargetWrist.x, leftTargetWrist.y);
    this.ctx.lineTo(triangleApex.x, triangleApex.y);
    this.ctx.lineTo(rightTargetWrist.x, rightTargetWrist.y);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();

    if (this.calibrationMetrics) {
      const {
        leftEye,
        rightEye,
        leftHip,
        rightHip,
        leftWrist,
        rightWrist,
        eyeCenter,
        hipCenter
      } = this.calibrationMetrics;

      this.ctx.strokeStyle = 'rgba(95, 196, 255, 0.86)';
      this.ctx.lineWidth = 2.5;

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

      const points = [leftEye, rightEye, leftHip, rightHip, leftWrist, rightWrist];
      this.ctx.fillStyle = 'rgba(95, 196, 255, 0.9)';
      points.forEach((point) => {
        if (!point) return;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
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

  renderCalibrationMotion(scale, verticalScale = 1, matchSegmentLengths = false, speedFactor = 0.0002) {
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
    const topY = centerY - halfSpanY;
    const bottomY = centerY + halfSpanY;

    const leftPath = {
      a: { x: centerX - wristOffset, y: topY },
      b: { x: centerX - wristOffset, y: bottomY },
      c: { x: centerX - innerOffset, y: bottomY }
    };
    const rightPath = {
      a: { x: centerX + wristOffset, y: topY },
      b: { x: centerX + wristOffset, y: bottomY },
      c: { x: centerX + innerOffset, y: bottomY }
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
    const speedFactor = Math.max(30, this.consistencySpeedPercent) / 100;
    const baseDurationMs = 3200;
    const deltaPhase = dtMs / baseDurationMs * speedFactor;
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
        console.log(`Left tip: (${tip.x.toFixed(1)}, ${tip.y.toFixed(1)})`);
      } else {
        this.rightTip = tip;
        console.log(`Right tip: (${tip.x.toFixed(1)}, ${tip.y.toFixed(1)})`);
      }
    }

    if (this.calibrationActive && (this.level === 1 || this.level === 2)) {
      this.render();
      return;
    }

    if (this.consistencyActive) {
      this.render();
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
    console.log(`After lerp: scales sample: ${this.circleScales.slice(0, 3).map(s => s.toFixed(2)).join(',')}`);

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
      console.log(`Target touched! Moving to next target: ${this.nextTarget + 1}/${this.targets.length}`);
      this.nextTarget += 1;
      if (this.nextTarget >= this.targets.length) {
        this.completed = true;
        this.active = false;
        if (this.completionCallback) this.completionCallback(this.chapter, this.level);
      }
      this.render();
    } else {
      this.render();
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
        console.log(`Finger tip at (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) - Circle ${i} at (${circle.x.toFixed(1)}, ${circle.y.toFixed(1)}) - Distance: ${d.toFixed(1)}`);
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
