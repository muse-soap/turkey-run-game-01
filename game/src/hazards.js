// hazards.js — everything in Waddles' way, and everything worth
// grabbing. Ground obstacles are jumped, flying carving knives are
// ducked, and corn and pumpkin pie are collected. Spawning is seeded
// and pattern-based so the run is fair: never an impossible wall.

import { GROUND_Y } from './world.js';
import { randRange, pickOne } from './rng.js';

// kind -> footprint. `flyer` hazards cross at head height: duck!
export const OBSTACLES = {
  haybale: { w: 58, h: 48, flyer: false },
  fence: { w: 68, h: 60, flyer: false },
  pitchfork: { w: 26, h: 68, flyer: false },
  oven: { w: 80, h: 86, flyer: false },
  table: { w: 116, h: 64, flyer: false },
  knife: { w: 66, h: 18, flyer: true },
};

const GROUND_KINDS = ['haybale', 'fence', 'pitchfork', 'oven', 'table'];

export class HazardField {
  constructor(rng) {
    this.rng = rng;
    this.items = []; // {kind, x (world px), taken}
    this.nextSpawnX = 2600;
  }

  reset() {
    this.items.length = 0;
    this.nextSpawnX = 2600;
  }

  // Keep the road stocked ahead of the camera and recycle behind it.
  update(cameraX, viewAhead, difficulty, stage) {
    while (this.nextSpawnX < cameraX + viewAhead) {
      this._spawnPattern(this.nextSpawnX, difficulty, stage);
    }
    while (this.items.length && this.items[0].x < cameraX - 500) this.items.shift();
  }

  _spawnPattern(x, difficulty, stage) {
    const rng = this.rng;
    const roll = rng();
    if (roll < 0.16) {
      // A treat arc: three corn cobs over a hop, sometimes a pie.
      const baseY = rng() < 0.5 ? 64 : 118;
      for (let i = 0; i < 3; i++) {
        this.items.push({ kind: 'corn', pickup: true, x: x + i * 62, y: baseY + Math.sin(i * 0.9) * 16, taken: false });
      }
      if (rng() < 0.3) this.items.push({ kind: 'pie', pickup: true, x: x + 62, y: baseY + 66, taken: false });
      this.nextSpawnX = x + randRange(rng, 420, 620);
      return;
    }
    if (roll < 0.26 && difficulty > 0.25) {
      // A knife whistles past at head height — duck.
      this.items.push({ kind: 'knife', pickup: false, x, y: 108, taken: false, spin: rng() * 6 });
      this.nextSpawnX = x + randRange(rng, 460, 700);
      return;
    }
    // A ground obstacle (the kitchen yard grows more ovens).
    let kind = pickOne(rng, GROUND_KINDS);
    if (stage === 2 && rng() < 0.42) kind = 'oven';
    if (stage === 0 && kind === 'oven' && rng() < 0.6) kind = 'haybale';
    this.items.push({ kind, pickup: false, x, taken: false });
    // Sometimes a corn cob sits just past it, rewarding the jump.
    if (rng() < 0.4) {
      this.items.push({ kind: 'corn', pickup: true, x: x + OBSTACLES[kind].w + 90, y: 70, taken: false });
    }
    const gap = randRange(rng, 560, 900) - difficulty * 190;
    this.nextSpawnX = x + OBSTACLES[kind].w + Math.max(430, gap);
  }

  hitbox(item) {
    if (item.pickup) {
      const cy = GROUND_Y - item.y;
      return { left: item.x - 17, right: item.x + 17, top: cy - 17, bottom: cy + 17 };
    }
    const spec = OBSTACLES[item.kind];
    if (spec.flyer) {
      const cy = GROUND_Y - item.y;
      return { left: item.x, right: item.x + spec.w, top: cy - spec.h / 2, bottom: cy + spec.h / 2 };
    }
    // Forgiving boxes: a few pixels inside the art on every side.
    return {
      left: item.x + 7,
      right: item.x + spec.w - 7,
      top: GROUND_Y - spec.h + 8,
      bottom: GROUND_Y,
    };
  }

  draw(ctx, cameraX, time) {
    for (const item of this.items) {
      if (item.taken) continue;
      const x = item.x - cameraX;
      if (x < -180 || x > 1460) continue;
      if (item.pickup) this._drawPickup(ctx, item, x, time);
      else this._drawObstacle(ctx, item, x, time);
    }
  }

  _drawPickup(ctx, item, x, time) {
    const y = GROUND_Y - item.y + Math.sin(time * 3 + item.x * 0.05) * 4;
    ctx.save();
    ctx.translate(x, y);
    if (item.kind === 'corn') {
      ctx.rotate(-0.5);
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d99a26';
      ctx.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-8, i * 6);
        ctx.lineTo(8, i * 6);
        ctx.stroke();
      }
      ctx.fillStyle = '#5f8f3e';
      ctx.beginPath();
      ctx.ellipse(-6, 14, 6, 11, 0.7, 0, Math.PI * 2);
      ctx.ellipse(6, 14, 6, 11, -0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pumpkin pie on a plate: +1 life, worth the detour.
      ctx.fillStyle = '#eef1f4';
      ctx.beginPath();
      ctx.ellipse(0, 8, 21, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d2691e';
      ctx.beginPath();
      ctx.moveTo(-16, 6);
      ctx.lineTo(16, 6);
      ctx.lineTo(0, -12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a83e1f';
      ctx.fillRect(-16, 2, 32, 5);
      ctx.fillStyle = '#fff7e6';
      ctx.beginPath();
      ctx.arc(0, -4, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawObstacle(ctx, item, x, time) {
    const base = GROUND_Y;
    ctx.save();
    ctx.translate(x, base);
    switch (item.kind) {
      case 'haybale': {
        ctx.fillStyle = '#e0aa3e';
        ctx.beginPath();
        ctx.arc(29, -24, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b9822a';
        ctx.lineWidth = 3;
        for (const r of [17, 10]) {
          ctx.beginPath();
          ctx.arc(29, -24, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = '#8a5a2b';
        ctx.beginPath();
        ctx.moveTo(2, -34);
        ctx.quadraticCurveTo(29, -46, 56, -32);
        ctx.stroke();
        break;
      }
      case 'fence': {
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(2, -58, 10, 58);
        ctx.fillRect(56, -58, 10, 58);
        ctx.fillRect(0, -50, 68, 9);
        ctx.fillRect(0, -26, 68, 9);
        ctx.fillStyle = '#a5713a';
        ctx.fillRect(30, -58, 8, 40);
        ctx.save();
        ctx.rotate(0.5);
        ctx.fillRect(28, -52, 8, 26); // one splintered, dangling slat
        ctx.restore();
        break;
      }
      case 'pitchfork': {
        ctx.save();
        ctx.rotate(0.16);
        ctx.strokeStyle = '#9aa1ab';
        ctx.lineWidth = 4;
        for (const dx of [-8, 0, 8]) {
          ctx.beginPath();
          ctx.moveTo(dx, -40);
          ctx.lineTo(dx, -66);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-8, -40);
        ctx.quadraticCurveTo(0, -32, 8, -40);
        ctx.stroke();
        ctx.strokeStyle = '#6e4520';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(3, 0);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'oven': {
        // A black iron range, door aglow — the whole point of the chase.
        ctx.fillStyle = '#2c2c30';
        ctx.fillRect(4, -86, 72, 86);
        ctx.fillStyle = '#1b1b1e';
        ctx.fillRect(58, -112, 12, 28);
        ctx.fillStyle = '#3d3d44';
        ctx.fillRect(0, -90, 80, 8);
        const flicker = 0.75 + Math.sin(time * 11 + item.x) * 0.25;
        ctx.fillStyle = `rgba(255,${Math.floor(120 + 60 * flicker)},40,1)`;
        ctx.fillRect(16, -62, 48, 40);
        ctx.fillStyle = '#1b1b1e';
        ctx.fillRect(16, -40, 48, 4);
        ctx.fillRect(36, -62, 4, 40);
        ctx.strokeStyle = '#0e0e10';
        ctx.lineWidth = 3;
        ctx.strokeRect(14, -64, 52, 44);
        ctx.fillStyle = '#d9dee6';
        ctx.fillRect(30, -70, 20, 4);
        ctx.fillStyle = '#ffb52e';
        ctx.font = 'bold 11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('HOT!', 40, -24 + 22);
        break;
      }
      case 'table': {
        // A set Thanksgiving table, cruelly placed in the escape route.
        ctx.fillStyle = '#6e4520';
        ctx.fillRect(6, -26, 8, 26);
        ctx.fillRect(102, -26, 8, 26);
        ctx.fillStyle = '#f3e2c7';
        ctx.fillRect(0, -58, 116, 34);
        ctx.fillStyle = '#e8dcc4';
        ctx.fillRect(0, -58, 116, 7);
        // Plates, a candle, and somebody's gravy boat.
        ctx.fillStyle = '#eef1f4';
        for (const px of [20, 58, 94]) {
          ctx.beginPath();
          ctx.ellipse(px, -50, 11, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#d23c2a';
        ctx.fillRect(52, -72, 5, 14);
        ctx.fillStyle = '#ffd94d';
        ctx.beginPath();
        ctx.ellipse(54.5, -76, 3.4, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c8cdd4';
        ctx.beginPath();
        ctx.ellipse(82, -52, 9, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'knife': {
        // A carving knife sailing at head height. Duck, turkey, duck.
        const cy = -item.y + Math.sin(time * 6 + item.x * 0.1) * 3;
        ctx.save();
        ctx.translate(33, cy);
        ctx.rotate(Math.sin(time * 9 + item.spin) * 0.14);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        for (const dy of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(-58, dy);
          ctx.lineTo(-40, dy);
          ctx.stroke();
        }
        ctx.fillStyle = '#6e4520';
        ctx.fillRect(-34, -4, 16, 8);
        ctx.fillStyle = '#d9dee6';
        ctx.beginPath();
        ctx.moveTo(-18, -6);
        ctx.lineTo(24, -2);
        ctx.lineTo(30, 2);
        ctx.lineTo(24, 6);
        ctx.lineTo(-18, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }
}
