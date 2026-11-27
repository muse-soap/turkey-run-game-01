// hud.js — the heads-up display and the game's screens: title,
// pause, caught and escaped. Big readable type, warm panels, and
// buttons the mouse can actually click (their rects are exported).

import { VIEW_W, VIEW_H, FINISH_METRES } from './world.js';
import { MAX_GAP } from './farmer.js';

export const START_BUTTON = { x: VIEW_W / 2 - 130, y: 512, w: 260, h: 62 };
export const RESTART_BUTTON = { x: VIEW_W / 2 - 130, y: 520, w: 260, h: 62 };

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function bigText(ctx, text, x, y, size, fill, stroke = '#3a1e08') {
  ctx.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = Math.max(3, size / 9);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(43,22,8,0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,77,0.65)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawButton(ctx, rect, label, pulse) {
  ctx.save();
  const grow = pulse ? Math.sin(pulse * 4) * 2 : 0;
  ctx.fillStyle = '#c9502e';
  ctx.beginPath();
  ctx.roundRect(rect.x - grow, rect.y - grow, rect.w + grow * 2, rect.h + grow * 2, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff7e6';
  ctx.font = 'bold 27px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 10);
  ctx.restore();
}

function heart(ctx, x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = filled ? '#d23c2a' : 'rgba(210,60,42,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-14, -6, -7, -16, 0, -7);
  ctx.bezierCurveTo(7, -16, 14, -6, 0, 8);
  ctx.fill();
  ctx.restore();
}

export function drawHUD(ctx, run) {
  // Score block, top left.
  panel(ctx, 18, 16, 252, 92);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(run.score).padStart(6, '0'), 36, 56);
  ctx.fillStyle = '#fff7e6';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText(`${Math.floor(run.distance)} m  /  ${FINISH_METRES} m`, 36, 88);
  // Lives, under the score.
  for (let i = 0; i < 5; i++) {
    if (i < run.maxLives) heart(ctx, 42 + i * 30, 140, i < run.lives);
  }
  // Escape progress: a little road from farm to woods, top centre.
  const px = 330;
  const pw = VIEW_W - 660;
  ctx.fillStyle = 'rgba(43,22,8,0.55)';
  ctx.beginPath();
  ctx.roundRect(px, 26, pw, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#7ec850';
  const done = Math.min(1, run.distance / FINISH_METRES);
  ctx.beginPath();
  ctx.roundRect(px, 26, Math.max(16, pw * done), 16, 8);
  ctx.fill();
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏠', px + 4, 66);
  ctx.fillText('🌲', px + pw - 4, 66);
  // Farmer gap meter, top right: how much trouble are we in?
  panel(ctx, VIEW_W - 288, 16, 270, 92);
  ctx.fillStyle = '#fff7e6';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('FARMER BROWN', VIEW_W - 268, 44);
  const gapW = 230;
  const frac = Math.max(0, Math.min(1, run.gap / MAX_GAP));
  ctx.fillStyle = 'rgba(255,247,230,0.25)';
  ctx.fillRect(VIEW_W - 268, 58, gapW, 14);
  ctx.fillStyle = frac < 0.3 ? '#d23c2a' : frac < 0.6 ? '#ffb52e' : '#7ec850';
  ctx.fillRect(VIEW_W - 268, 58, gapW * frac, 14);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(frac < 0.3 ? 'HE’S RIGHT BEHIND YOU!' : frac < 0.6 ? 'He’s gaining…' : 'Clear air — keep running!', VIEW_W - 268, 96);
  // Mute / pause hints.
  ctx.fillStyle = 'rgba(255,247,230,0.75)';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(run.muted ? 'M — sound off' : 'M — sound on · P — pause', VIEW_W - 24, VIEW_H - 16);
}

export function drawTitle(ctx, time, best) {
  ctx.fillStyle = 'rgba(43,22,8,0.34)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  bigText(ctx, 'GOBBLE RUN', VIEW_W / 2, 196, 96, '#ffd94d');
  bigText(ctx, 'The Great Thanksgiving Getaway', VIEW_W / 2, 258, 37, '#fff7e6');
  panel(ctx, VIEW_W / 2 - 330, 300, 660, 168);
  ctx.fillStyle = '#fff7e6';
  ctx.font = '21px Georgia, serif';
  ctx.textAlign = 'center';
  const lines = [
    'Waddles the turkey has seen the menu — and he IS the menu.',
    'Outrun Farmer Brown for 1,200 m to reach the woods!',
    'SPACE / ↑ jump · ↓ duck the knives · grab corn & pie',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 348 + i * 38));
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText('Watch the farmer meter: stumble, and he surges!', VIEW_W / 2, 348 + 3 * 38);
  drawButton(ctx, START_BUTTON, '▶  START THE ESCAPE', time);
  if (best > 0) {
    ctx.fillStyle = 'rgba(255,247,230,0.9)';
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(`Best score so far: ${best}`, VIEW_W / 2, 624);
  }
  ctx.fillStyle = 'rgba(255,247,230,0.75)';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Keyboard or mouse — click to jump, hold low to duck', VIEW_W / 2, 668);
}

export function drawEnd(ctx, run, best) {
  ctx.fillStyle = run.escaped ? 'rgba(24,46,16,0.45)' : 'rgba(46,10,4,0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (run.escaped) {
    bigText(ctx, 'ESCAPED!', VIEW_W / 2, 190, 92, '#a5e075');
    bigText(ctx, 'Waddles made it to the woods —', VIEW_W / 2, 252, 32, '#fff7e6');
    bigText(ctx, 'Thanksgiving is cancelled.', VIEW_W / 2, 292, 32, '#fff7e6');
  } else {
    bigText(ctx, 'CAUGHT!', VIEW_W / 2, 190, 92, '#ff7a52');
    bigText(ctx, 'Farmer Brown got his dinner after all…', VIEW_W / 2, 252, 32, '#fff7e6');
    bigText(ctx, `Waddles was caught at ${Math.floor(run.distance)} m`, VIEW_W / 2, 292, 32, '#ffd94d');
  }
  panel(ctx, VIEW_W / 2 - 240, 330, 480, 150);
  ctx.fillStyle = '#fff7e6';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE  ${run.score}`, VIEW_W / 2, 380);
  ctx.font = '21px Georgia, serif';
  ctx.fillText(`Distance ${Math.floor(run.distance)} m · Corn ${run.corn} · Near misses ${run.nearMisses}`, VIEW_W / 2, 424);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(run.score >= best && run.score > 0 ? '★ A NEW BEST! ★' : `Best: ${best}`, VIEW_W / 2, 460);
  drawButton(ctx, RESTART_BUTTON, '↻  RUN AGAIN', 0);
  ctx.fillStyle = 'rgba(255,247,230,0.8)';
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Press ENTER or click to run again', VIEW_W / 2, 624);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20,10,4,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  bigText(ctx, 'PAUSED', VIEW_W / 2, 330, 64, '#ffd94d');
  ctx.fillStyle = '#fff7e6';
  ctx.font = '21px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Waddles is holding his breath behind a pumpkin.', VIEW_W / 2, 384);
  ctx.fillText('Press P to keep running', VIEW_W / 2, 420);
}
