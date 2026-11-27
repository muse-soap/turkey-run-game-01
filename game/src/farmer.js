// farmer.js — Farmer Brown, the man with the carving knife and a
// grievance. He runs behind Waddles; his screen position IS the gap
// meter. Stumble and he surges forward; run clean and he fades back,
// red-faced, shaking his fist at the sky.

import { GROUND_Y } from './world.js';

export const MAX_GAP = 460; // pixels of breathing room at the start
const CATCH_GAP = 26; // this close and his hand closes on a tail feather

export class Farmer {
  constructor() {
    this.reset();
  }

  reset() {
    this.gap = 300; // pixels behind the turkey
    this.runPhase = 0;
    this.anger = 0; // 0 calm .. 1 furious (he is always at least a bit furious)
    this.lungeTimer = 0;
    this.shoutTimer = 3;
    this.shout = '';
  }

  get caught() {
    return this.gap <= CATCH_GAP;
  }

  // Called when the turkey hits something: the farmer surges.
  surge(amount) {
    this.gap = Math.max(CATCH_GAP - 6, this.gap - amount);
    this.anger = Math.min(1, this.anger + 0.35);
    this.lungeTimer = 0.45;
    this.shout = pickShout();
    this.shoutTimer = 1.1;
  }

  update(dt, turkeySpeedPx, difficulty) {
    this.runPhase += dt * (7 + turkeySpeedPx * 0.026);
    // The farmer's pace: he nearly matches the turkey, a touch faster
    // as the run goes on, a touch slower right after a surge.
    const farmerSpeed = turkeySpeedPx * (0.90 + difficulty * 0.13) - (this.lungeTimer > 0 ? 60 : 0);
    this.gap += (turkeySpeedPx - farmerSpeed) * dt;
    this.gap = Math.min(MAX_GAP, this.gap);
    this.anger = Math.max(0.25, this.anger - dt * 0.05);
    if (this.lungeTimer > 0) this.lungeTimer -= dt;
    if (this.shoutTimer > 0) this.shoutTimer -= dt;
    else if (Math.random() < dt * 0.25) {
      this.shout = pickShout();
      this.shoutTimer = 1.2;
    }
  }

  draw(ctx, turkeyScreenX) {
    const x = turkeyScreenX - this.gap;
    if (x < -140) return; // too far back to see
    const bob = Math.abs(Math.sin(this.runPhase * 2)) * 5;
    const baseY = GROUND_Y - bob;
    const lunge = this.lungeTimer > 0 ? 16 : 0;

    ctx.save();
    ctx.translate(x, baseY);
    const legSwing = Math.sin(this.runPhase * 2) * 15;
    // Legs in overalls-blue trousers and big boots.
    ctx.strokeStyle = '#2e4a6b';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -58);
    ctx.lineTo(-8 + legSwing, -4);
    ctx.moveTo(12, -58);
    ctx.lineTo(12 - legSwing, -4);
    ctx.stroke();
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(-14 + legSwing, -8, 20, 8);
    ctx.fillRect(6 - legSwing, -8, 20, 8);
    // Overalls body.
    ctx.fillStyle = '#3f6186';
    ctx.fillRect(-24, -118, 52, 64);
    ctx.fillStyle = '#c9502e';
    ctx.fillRect(-24, -140, 52, 26); // plaid shirt shoulders
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(-2, -104, 7, 7);
    ctx.fillRect(-2, -84, 7, 7);
    // Head: sunburnt, furious.
    ctx.fillStyle = '#e8a878';
    ctx.beginPath();
    ctx.arc(2, -158, 19, 0, Math.PI * 2);
    ctx.fill();
    // Straw hat.
    ctx.fillStyle = '#e5b84f';
    ctx.fillRect(-24, -172, 54, 7);
    ctx.fillRect(-13, -188, 32, 17);
    // Angry brows and a shouting mouth.
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -163);
    ctx.lineTo(0, -159);
    ctx.moveTo(12, -163);
    ctx.lineTo(4, -159);
    ctx.stroke();
    ctx.fillStyle = '#5d1f14';
    ctx.beginPath();
    ctx.ellipse(2, -146, 5.5, this.shoutTimer > 0 ? 6 : 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Back arm pumping.
    ctx.strokeStyle = '#c9502e';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-20, -132);
    ctx.lineTo(-32, -104 + legSwing * 0.5);
    ctx.stroke();
    // Front arm reaching out with the carving knife.
    ctx.beginPath();
    ctx.moveTo(24, -132);
    ctx.lineTo(46 + lunge, -116);
    ctx.stroke();
    ctx.save();
    ctx.translate(50 + lunge, -114);
    ctx.rotate(-0.25 + Math.sin(this.runPhase * 2) * 0.08);
    ctx.fillStyle = '#6e4520';
    ctx.fillRect(0, -3, 13, 6);
    ctx.fillStyle = '#d9dee6';
    ctx.beginPath();
    ctx.moveTo(13, -4);
    ctx.lineTo(40, -1);
    ctx.lineTo(13, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // His shout, in a wobbly speech bubble.
    if (this.shoutTimer > 0 && this.shout) {
      ctx.save();
      ctx.font = 'bold 17px Georgia, serif';
      const w = ctx.measureText(this.shout).width + 22;
      const bx = x + 16;
      const by = GROUND_Y - 268 - bob;
      ctx.fillStyle = 'rgba(255,250,236,0.95)';
      ctx.beginPath();
      ctx.roundRect(bx, by, w, 32, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 14, by + 30);
      ctx.lineTo(bx + 6, by + 44);
      ctx.lineTo(bx + 30, by + 31);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#54331d';
      ctx.textAlign = 'center';
      ctx.fillText(this.shout, bx + w / 2, by + 22);
      ctx.restore();
    }

    // Shadow.
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#2a1608';
    ctx.beginPath();
    ctx.ellipse(x + 2, GROUND_Y + 12, 38, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const SHOUTS = [
  'COME BACK HERE!',
  'THAT’S MY DINNER!',
  'HOLD STILL, BIRD!',
  'GRAVY NEEDS A TURKEY!',
  'STOP, IN THE NAME OF LUNCH!',
  'MY OVEN IS PREHEATED!',
];

function pickShout() {
  return SHOUTS[Math.floor(Math.random() * SHOUTS.length)];
}
