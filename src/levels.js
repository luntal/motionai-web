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
    this.buildGrid();
  }

  setCompletionCallback(cb) {
    this.completionCallback = cb;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.buildGrid();
    this.render();
  }

  buildGrid() {
    const rows = 12;
    const cols = 16;
    this.grid = [];
    this.circleScales = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    console.log(`Building grid with canvas dimensions: ${w}x${h}`);
    const spacingX = w / cols;
    const spacingY = h / rows;
    const r = Math.min(spacingX, spacingY) / 2 * 0.95; // touch neighbors
    console.log(`Grid spacing: ${spacingX.toFixed(1)}x${spacingY.toFixed(1)}, radius: ${r.toFixed(1)}`);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        this.grid.push({
          x: w - (col + 0.5) * spacingX,  // mirrored to match main canvas
          y: (row + 0.5) * spacingY,
          r: r,
          row: row,
          col: col
        });
        this.circleScales.push(1.0);
      }
    }
    console.log(`Built grid with ${this.grid.length} circles`);
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

    if (this.chapter !== 0 || this.level === null || this.level === 0) {
      this.active = false;
      console.log(`Level inactive - conditions not met`);
      this.render();
      return;
    }

    this.active = true;
    console.log(`Level activated!`);

    const rows = 12;
    const cols = 16;

    if (this.level === 1) {
      // right side vertical line (mirrored, col=0 is right)
      const col = 1;
      for (let row = 1; row <= 6; row += 1) {
        this.targets.push({ index: row * cols + col, hand: 'right' });
      }
    } else if (this.level === 2) {
      // left side vertical line
      const col = cols - 2;
      for (let row = 1; row <= 6; row += 1) {
        this.targets.push({ index: row * cols + col, hand: 'left' });
      }
    } else if (this.level === 3) {
      // both sides symmetric
      const leftCol = cols - 2;
      const rightCol = 1;
      for (let row = 1; row <= 5; row += 1) {
        this.targets.push({ leftIndex: row * cols + leftCol, rightIndex: row * cols + rightCol, hand: 'both' });
      }
    } else if (this.level === 4) {
      // asynchronous path
      const path = [
        { col: 1, row: 1 },      // right
        { col: cols - 2, row: 2 }, // left
        { col: 1, row: 3 },      // right
        { col: cols - 2, row: 4 }, // left
        { col: 1, row: 5 },      // right
        { col: cols - 2, row: 6 }  // left
      ];
      for (const p of path) {
        const index = p.row * cols + p.col;
        this.targets.push({ index: index, hand: p.col === 1 ? 'right' : 'left' });
      }
    }

    console.log(`Targets set up: ${this.targets.length} targets`);
    this.render();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render() {
    if (!this.canvas.width || !this.canvas.height) {
      console.log(`Render skipped: canvas dimensions are 0`);
      return;
    }
    this.clear();

    if (!this.active) {
      console.log(`Render skipped: level not active`);
      return;
    }

    console.log(`Rendering: grid=${this.grid.length}, active=${this.active}, scales sample: ${this.circleScales.slice(0, 3).map(s => s.toFixed(2)).join(',')}`);
    // draw grid
    for (let i = 0; i < this.grid.length; i += 1) {
      const circle = this.grid[i];
      const scale = this.circleScales[i];
      const r = circle.r * scale;
      let fill = 'rgba(255, 255, 255, 0.08)';
      let stroke = 'rgba(255, 255, 255, 0.16)';

      // check if target
      const targetIndex = this.targets.findIndex(t => t.index === i || t.leftIndex === i || t.rightIndex === i);
      if (targetIndex !== -1) {
        const t = this.targets[targetIndex];
        if (targetIndex < this.nextTarget) {
          fill = 'rgba(120, 220, 160, 0.6)';
        } else if (targetIndex === this.nextTarget) {
          fill = 'rgba(72, 220, 190, 1)';
          stroke = 'rgba(255, 255, 255, 0.9)';
        } else {
          fill = 'rgba(90, 220, 170, 0.35)';
        }
      }

      this.ctx.beginPath();
      this.ctx.arc(circle.x, circle.y, r, 0, Math.PI * 2);
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

  updateHands(hands) {
    if (!this.active || this.completed || this.targets.length === 0) return;

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
    if (target.hand === 'left' && this.leftTip) {
      const idx = this.getCircleIndex(this.leftTip);
      touched = idx === target.index;
    } else if (target.hand === 'right' && this.rightTip) {
      const idx = this.getCircleIndex(this.rightTip);
      touched = idx === target.index;
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
      const d = this.distance(point, { x: circle.x, y: circle.y });
      if (d <= circle.r) {
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
