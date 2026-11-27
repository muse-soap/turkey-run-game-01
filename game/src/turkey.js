// turkey.js — Waddles, the hero: a very determined turkey.
// Handles his run cycle, jumps, ducks and squash-and-stretch, and
// draws him from layered canvas shapes (tail fan, body, wing, head).

import { GROUND_Y } from './world.js';

const GRAVITY = 2500;
const JUMP_VELOCITY = -1010;

export class Turkey {
  constructor() {
    this.reset(0);
  }

  reset(worldX) {
    this.x = worldX; // world position in pixels
    this.y = 0; // height above the ground, >= 0
    this.vy = 0;
    this.ducking = false;
    this.runPhase = 0;
    this.squash = 0; // -1..1 squash-and-stretch spring
    this.blinkTimer = 2.4;
    this.eyeOpen = true;
    this.invulnerable = 0;
    this.stumble = 0;
  }

  get grounded() {
    return this.y <= 0;
  }

  // Screen-space box used for collisions; ducking lowers the top.
  hitbox() {
    const top = this.ducking && this.grounded ? 44 : 76;
    return {
      left: this.x - 30,
      right: this.x + 38,
      top: GROUND_Y - this.y - top,
      bottom: GROUND_Y - this.y,
    };
  }

  tryJump() {
    if (!this.grounded) return false;
    this.vy = JUMP_VELOCITY;
    this.y = 0.01;
    this.squash = -0.55; // stretch up
    return true;
  }

  update(dt, speedPx, wantDuck) {
    this.runPhase += dt * (6 + speedPx * 0.028);
    this.ducking = wantDuck && this.grounded;
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.y -= this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.squash = 0.6; // land with a squash
        return 'landed';
      }
    } else if (!wantDuck && this.vy < 0) {
      this.vy = 0;
    }
    // Spring the squash back to neutral.
    this.squash += (0 - this.squash) * Math.min(1, dt * 11);
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.eyeOpen = !this.eyeOpen;
      this.blinkTimer = this.eyeOpen ? 2.2 + Math.random() * 1.6 : 0.12;
    }
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.stumble > 0) this.stumble -= dt;
    return null;
  }

  draw(ctx, screenX) {
    const groundScreenY = GROUND_Y;
    const bob = this.grounded ? Math.abs(Math.sin(this.runPhase * 2)) * 4 : 0;
    const cx = screenX;
    const cy = groundScreenY - this.y - bob;
    const squashY = 1 + this.squash * 0.28;
    const squashX = 1 - this.squash * 0.2;
    const blink = this.invulnerable > 0 && Math.floor(this.invulnerable * 14) % 2 === 0;

    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    ctx.translate(cx, cy);
    ctx.scale(squashX, squashY);
    if (this.ducking) ctx.translate(4, 16);

    const legSwing = this.grounded ? Math.sin(this.runPhase * 2) * 13 : 6;
    // Legs (orange, busy).
    ctx.strokeStyle = '#e07b24';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -26);
    ctx.lineTo(-6 + legSwing, -2);
    ctx.moveTo(14, -26);
    ctx.lineTo(14 - legSwing, -2);
    ctx.stroke();

    // Tail fan: five feathers fanned behind, wagging with the run.
    const wag = Math.sin(this.runPhase * 2) * 0.07;
    const featherCols = ['#5d3a1a', '#8a5a2b', '#a83e1f', '#8a5a2b', '#5d3a1a'];
    for (let i = 0; i < 5; i++) {
      const angle = -2.25 + i * 0.34 + wag;
      ctx.save();
      ctx.translate(-26, -52);
      ctx.rotate(angle);
      ctx.fillStyle = featherCols[i];
      ctx.beginPath();
      ctx.ellipse(26, 0, 30, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8dcc4';
      ctx.beginPath();
      ctx.ellipse(46, 0, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Body.
    const bodyGrad = ctx.createLinearGradient(0, -84, 0, -18);
    bodyGrad.addColorStop(0, '#a9713a');
    bodyGrad.addColorStop(1, '#7c4c20');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -50, 40, 33, -0.08, 0, Math.PI * 2);
    ctx.fill();
    // Breast feathers.
    ctx.fillStyle = '#c98d4e';
    ctx.beginPath();
    ctx.ellipse(14, -44, 22, 20, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Wing, flapping when airborne.
    const flap = this.grounded ? Math.sin(this.runPhase * 2) * 0.14 : Math.sin(this.runPhase * 6) * 0.5 - 0.3;
    ctx.save();
    ctx.translate(-4, -56);
    ctx.rotate(flap);
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.ellipse(2, 10, 13, 24, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Neck and head.
    ctx.strokeStyle = '#b0512f';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(28, -64);
    ctx.quadraticCurveTo(40, -82, 44, -92);
    ctx.stroke();
    ctx.fillStyle = '#c95f36';
    ctx.beginPath();
    ctx.ellipse(47, -97, 13.5, 12, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Snood and wattle — proper turkey jewellery.
    ctx.fillStyle = '#d23c2a';
    ctx.beginPath();
    ctx.ellipse(52, -86, 4.6, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Beak.
    ctx.fillStyle = '#f2b035';
    ctx.beginPath();
    ctx.moveTo(58, -99);
    ctx.lineTo(74, -94);
    ctx.lineTo(58, -90);
    ctx.closePath();
    ctx.fill();
    // Eye — wide with determination (or shut, mid-blink).
    if (this.eyeOpen) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(49, -100, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241407';
      ctx.beginPath();
      ctx.arc(51, -100, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#241407';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, -100);
      ctx.lineTo(54, -100);
      ctx.stroke();
    }
    ctx.restore();

    // Soft shadow on the ground, shrinking as he jumps.
    const shadowScale = Math.max(0.35, 1 - this.y / 340);
    ctx.save();
    ctx.globalAlpha = 0.25 * shadowScale;
    ctx.fillStyle = '#2a1608';
    ctx.beginPath();
    ctx.ellipse(screenX + 2, GROUND_Y + 12, 40 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
