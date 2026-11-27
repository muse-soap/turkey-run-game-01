// world.js — the farm Waddles runs through: a sunset sky, rolling
// hills, the big red barn, fences and pumpkin patches, drawn in
// parallax layers. Distant layers are pre-rendered once to offscreen
// canvases so each frame is a handful of drawImage calls.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 606;
export const FINISH_METRES = 1200;
export const PIXELS_PER_METRE = 10;

// Which stretch of the escape we are in; the palette warms as the sun drops.
export function stageForDistance(metres) {
  if (metres < 400) return 0; // the farmyard
  if (metres < 800) return 1; // the pumpkin patch
  return 2; // the kitchen yard, just outside the farmhouse
}

const SKY_STOPS = [
  ['#ffe9b0', '#ffb52e', '#e2703a'],
  ['#ffd9a0', '#ff9440', '#c9502e'],
  ['#f7c489', '#e2703a', '#8f3524'],
];

function makeSky(stage) {
  const c = document.createElement('canvas');
  c.width = VIEW_W;
  c.height = VIEW_H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, GROUND_Y);
  const stops = SKY_STOPS[stage];
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // Low sun with a soft halo.
  const sunX = VIEW_W * 0.78;
  const sunY = 168 + stage * 42;
  const halo = g.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
  halo.addColorStop(0, 'rgba(255,244,190,0.95)');
  halo.addColorStop(0.25, 'rgba(255,214,110,0.55)');
  halo.addColorStop(1, 'rgba(255,180,80,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, VIEW_W, GROUND_Y);
  g.fillStyle = '#fff3b0';
  g.beginPath();
  g.arc(sunX, sunY, 40, 0, Math.PI * 2);
  g.fill();
  return c;
}

function drawCloud(g, x, y, s) {
  g.fillStyle = 'rgba(255,246,224,0.85)';
  g.beginPath();
  g.ellipse(x, y, 52 * s, 17 * s, 0, 0, Math.PI * 2);
  g.ellipse(x - 30 * s, y + 5 * s, 34 * s, 13 * s, 0, 0, Math.PI * 2);
  g.ellipse(x + 32 * s, y + 4 * s, 38 * s, 14 * s, 0, 0, Math.PI * 2);
  g.fill();
}

function drawTree(g, x, baseY, s, palette) {
  g.fillStyle = '#5d3a1a';
  g.fillRect(x - 5 * s, baseY - 44 * s, 10 * s, 44 * s);
  g.fillStyle = palette[0];
  g.beginPath();
  g.arc(x, baseY - 74 * s, 34 * s, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = palette[1];
  g.beginPath();
  g.arc(x - 22 * s, baseY - 54 * s, 22 * s, 0, Math.PI * 2);
  g.arc(x + 24 * s, baseY - 58 * s, 24 * s, 0, Math.PI * 2);
  g.fill();
}

function drawBarn(g, x, baseY) {
  // The big red barn, Waddles' former home.
  g.fillStyle = '#9c2b1e';
  g.fillRect(x, baseY - 170, 230, 170);
  g.fillStyle = '#7c1f14';
  g.beginPath();
  g.moveTo(x - 14, baseY - 170);
  g.lineTo(x + 115, baseY - 248);
  g.lineTo(x + 244, baseY - 170);
  g.closePath();
  g.fill();
  g.fillStyle = '#f3e2c7';
  g.fillRect(x + 78, baseY - 118, 74, 118);
  g.strokeStyle = '#7c1f14';
  g.lineWidth = 6;
  g.strokeRect(x + 78, baseY - 118, 74, 118);
  g.beginPath();
  g.moveTo(x + 78, baseY - 118);
  g.lineTo(x + 152, baseY);
  g.moveTo(x + 152, baseY - 118);
  g.lineTo(x + 78, baseY);
  g.stroke();
  g.fillStyle = '#fff7e6';
  g.fillRect(x + 96, baseY - 226, 38, 34);
  g.strokeStyle = '#7c1f14';
  g.lineWidth = 4;
  g.strokeRect(x + 96, baseY - 226, 38, 34);
  // Silo beside it.
  g.fillStyle = '#c8cdd4';
  g.fillRect(x + 268, baseY - 210, 54, 210);
  g.fillStyle = '#9aa1ab';
  g.beginPath();
  g.arc(x + 295, baseY - 210, 27, Math.PI, 0);
  g.fill();
}

function drawFarmhouse(g, x, baseY) {
  // The farmhouse: warm windows, and a wisp of oven smoke. Danger lives here.
  g.fillStyle = '#e8dcc4';
  g.fillRect(x, baseY - 150, 210, 150);
  g.fillStyle = '#6b4226';
  g.beginPath();
  g.moveTo(x - 12, baseY - 150);
  g.lineTo(x + 105, baseY - 216);
  g.lineTo(x + 222, baseY - 150);
  g.closePath();
  g.fill();
  g.fillStyle = '#54331d';
  g.fillRect(x + 158, baseY - 226, 22, 52);
  g.fillStyle = '#ffd94d';
  g.fillRect(x + 26, baseY - 116, 40, 44);
  g.fillRect(x + 140, baseY - 116, 40, 44);
  g.strokeStyle = '#6b4226';
  g.lineWidth = 4;
  g.strokeRect(x + 26, baseY - 116, 40, 44);
  g.strokeRect(x + 140, baseY - 116, 40, 44);
  g.fillStyle = '#8a5a2b';
  g.fillRect(x + 84, baseY - 92, 42, 92);
}

export class World {
  constructor() {
    this.skies = [makeSky(0), makeSky(1), makeSky(2)];
  }

  drawBackground(ctx, cameraX, stage, time) {
    ctx.drawImage(this.skies[stage], 0, 0);
    // Clouds, slowest layer.
    ctx.save();
    const cloudOff = -(cameraX * 0.08) % 900;
    for (let i = -1; i < 3; i++) {
      const x = cloudOff + i * 900;
      drawCloud(ctx, x + 180, 84 + Math.sin(time * 0.1 + i) * 4, 1.1);
      drawCloud(ctx, x + 560, 140, 0.75);
    }
    ctx.restore();
    // Rolling hills with autumn trees.
    const hillOff = -(cameraX * 0.3) % 760;
    ctx.fillStyle = stage === 2 ? '#b3612f' : '#c47436';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= VIEW_W; x += 40) {
      const wx = x - hillOff;
      ctx.lineTo(x, GROUND_Y - 120 - Math.sin(wx * 0.004) * 34 - Math.sin(wx * 0.013) * 10);
    }
    ctx.lineTo(VIEW_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    for (let i = -1; i < 4; i++) {
      const base = -((cameraX * 0.3) % 340) + i * 340;
      drawTree(ctx, base + 90, GROUND_Y - 108 - Math.sin((base + cameraX * 0.3) * 0.004) * 30, 0.9, ['#d2691e', '#e08a2e']);
      drawTree(ctx, base + 250, GROUND_Y - 100 - Math.sin((base + 160 + cameraX * 0.3) * 0.004) * 30, 0.7, ['#a83e1f', '#c9502e']);
    }
    // Landmarks repeat down the road: barn early, farmhouse late.
    const landmarkSpan = 2600;
    const landOff = -(cameraX * 0.55) % landmarkSpan;
    for (let i = -1; i < 2; i++) {
      const x = landOff + i * landmarkSpan;
      if (stage === 2) drawFarmhouse(ctx, x + 500, GROUND_Y - 26);
      else drawBarn(ctx, x + 420, GROUND_Y - 26);
    }
  }

  drawGround(ctx, cameraX, stage) {
    // Soil band with a grass lip.
    ctx.fillStyle = stage === 1 ? '#7a4a21' : '#835226';
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = stage === 2 ? '#9c6a30' : '#a5713a';
    ctx.fillRect(0, GROUND_Y, VIEW_W, 10);
    ctx.fillStyle = '#5f8f3e';
    ctx.fillRect(0, GROUND_Y - 6, VIEW_W, 8);
    // Dirt dashes scroll past to sell the speed.
    ctx.fillStyle = 'rgba(60,36,14,0.35)';
    const dashOff = -(cameraX % 90);
    for (let x = dashOff; x < VIEW_W; x += 90) {
      ctx.fillRect(x, GROUND_Y + 34, 44, 7);
      ctx.fillRect(x + 30, GROUND_Y + 74, 30, 6);
    }
    // Fence posts along the back of the lane.
    const fenceOff = -(cameraX * 0.92) % 150;
    ctx.fillStyle = '#6e4520';
    for (let x = fenceOff; x < VIEW_W + 60; x += 150) {
      ctx.fillRect(x, GROUND_Y - 52, 9, 52);
    }
    ctx.fillRect(0, GROUND_Y - 44, VIEW_W, 6);
    ctx.fillRect(0, GROUND_Y - 22, VIEW_W, 6);
    if (stage === 1) this._drawPumpkins(ctx, cameraX);
    if (stage === 2) this._drawKitchenYard(ctx, cameraX);
  }

  _drawPumpkins(ctx, cameraX) {
    const off = -(cameraX % 420);
    for (let x = off; x < VIEW_W + 120; x += 420) {
      for (const [dx, r] of [[30, 17], [66, 12], [300, 14]]) {
        ctx.fillStyle = '#e07b24';
        ctx.beginPath();
        ctx.ellipse(x + dx, GROUND_Y - r + 4, r, r * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5f8f3e';
        ctx.fillRect(x + dx - 2, GROUND_Y - r * 1.8 + 4, 4, 7);
      }
    }
  }

  _drawKitchenYard(ctx, cameraX) {
    const off = -(cameraX % 560);
    ctx.fillStyle = '#7d7f85';
    for (let x = off; x < VIEW_W + 160; x += 560) {
      // A washtub and crates stacked by the farmhouse path.
      ctx.fillRect(x + 40, GROUND_Y - 26, 64, 26);
      ctx.fillStyle = '#9aa1ab';
      ctx.fillRect(x + 34, GROUND_Y - 32, 76, 8);
      ctx.fillStyle = '#a5713a';
      ctx.fillRect(x + 330, GROUND_Y - 34, 34, 34);
      ctx.fillRect(x + 338, GROUND_Y - 62, 34, 34);
      ctx.fillStyle = '#7d7f85';
    }
  }

  // The finish: a gap in the fence and the dark, safe woods beyond.
  drawWoodsGate(ctx, cameraX) {
    const gateWorldX = FINISH_METRES * PIXELS_PER_METRE;
    const x = gateWorldX - cameraX;
    if (x < -500 || x > VIEW_W + 500) return;
    ctx.fillStyle = '#2e4a22';
    for (let i = 0; i < 6; i++) {
      const tx = x + 190 + i * 62;
      ctx.fillRect(tx + 22, GROUND_Y - 190, 12, 190);
      ctx.fillStyle = i % 2 ? '#33512a' : '#2e4a22';
      ctx.beginPath();
      ctx.moveTo(tx, GROUND_Y - 150);
      ctx.lineTo(tx + 28, GROUND_Y - 262);
      ctx.lineTo(tx + 56, GROUND_Y - 150);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2e4a22';
    }
    // A hand-painted sign: freedom, this way.
    ctx.fillStyle = '#6e4520';
    ctx.fillRect(x + 66, GROUND_Y - 108, 10, 108);
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(x + 16, GROUND_Y - 122, 118, 40);
    ctx.fillStyle = '#54331d';
    ctx.font = 'bold 21px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE WOODS', x + 75, GROUND_Y - 94);
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText('turkeys only →', x + 75, GROUND_Y - 76 + 14);
  }
}
