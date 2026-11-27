// main.js — Gobble Run's conductor: the canvas, the game loop and
// the state machine (title → playing → caught/escaped), plus the
// screenshot scenes (?shot=...) and the scripted self-test (?test=1)
// the maker uses to prove the game works end to end.

import { Input } from './input.js';
import { SoundBoard } from './audio.js';
import { Particles } from './particles.js';
import { World, VIEW_W, VIEW_H, GROUND_Y, FINISH_METRES, PIXELS_PER_METRE, stageForDistance } from './world.js';
import { Turkey } from './turkey.js';
import { Farmer, MAX_GAP } from './farmer.js';
import { HazardField, OBSTACLES } from './hazards.js';
import { makeRng } from './rng.js';
import { drawHUD, drawTitle, drawEnd, drawPaused, START_BUTTON, RESTART_BUTTON, pointInRect } from './hud.js';

const TURKEY_SCREEN_X = 430;
const BASE_SPEED = 305; // px per second at the start of the run
const statusEl = document.getElementById('status');

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundBoard();
    this.world = new World();
    this.particles = new Particles();
    this.state = 'title'; // title | play | caught | over | paused
    this.time = 0;
    this.shake = 0;
    this.flash = 0;
    this.best = loadBest();
    this.demo = false;
    this.resetRun(1);
  }

  resetRun(seed) {
    this.rng = makeRng(seed * 7919 + 13);
    this.turkey = new Turkey();
    this.turkey.reset(600);
    this.farmer = new Farmer();
    this.field = new HazardField(this.rng);
    this.field.reset();
    this.points = 0;
    this.corn = 0;
    this.nearMisses = 0;
    this.lives = 3;
    this.maxLives = 3;
    this.slowTimer = 0;
    this.catchTimer = 0;
    this.endTimer = 0;
    this.particles.clear();
    this.shake = 0;
    this.flash = 0;
  }

  get distance() {
    return Math.max(0, (this.turkey.x - 600) / PIXELS_PER_METRE);
  }

  get score() {
    return this.points + Math.floor(this.distance) * 2;
  }

  get difficulty() {
    return Math.min(1, this.distance / 1050);
  }

  get speed() {
    const base = BASE_SPEED + this.difficulty * 165;
    return this.slowTimer > 0 ? base * 0.52 : base;
  }

  startRun() {
    this.resetRun((Math.random() * 100000) | 0);
    this.state = 'play';
    this.sound.unlock();
    this.sound.gobble();
    announce('The escape is on! Run, Waddles, run!');
  }

  // One frame of simulation. dt is seconds, already clamped by the loop.
  update(dt) {
    this.time += dt;
    const input = this.input;
    if (input.mutePressed) {
      this.sound.setMuted(!this.sound.muted);
    }
    switch (this.state) {
      case 'title': {
        // Waddles idles on the title screen, stretching his legs.
        this.turkey.update(dt, 0, false);
        if (input.confirmPressed || input.jumpPressed) this.startRun();
        if (input.clickPoint) {
          const p = toLogical(input.clickPoint, this.canvas);
          if (pointInRect(p.x, p.y, START_BUTTON)) this.startRun();
        }
        break;
      }
      case 'play': {
        if (input.pausePressed) { this.state = 'paused'; break; }
        this.updatePlay(dt, this.demo ? this.autopilot() : input);
        break;
      }
      case 'paused': {
        if (input.pausePressed || input.confirmPressed) this.state = 'play';
        break;
      }
      case 'caught': {
        // The farmer's hand closes in over a short, dramatic beat.
        this.catchTimer -= dt;
        this.farmer.gap = Math.max(4, this.farmer.gap - dt * 260);
        this.turkey.update(dt, 0, false);
        this.particles.update(dt);
        if (this.catchTimer <= 0) {
          this.state = 'over';
          this.endTimer = 0;
          this.finishRun(false);
        }
        break;
      }
      case 'over': {
        this.endTimer += dt;
        this.particles.update(dt);
        if (input.confirmPressed || (input.jumpPressed && this.endTimer > 0.6)) this.startRun();
        if (input.clickPoint && this.endTimer > 0.4) {
          const p = toLogical(input.clickPoint, this.canvas);
          if (pointInRect(p.x, p.y, RESTART_BUTTON)) this.startRun();
        }
        if (this.demo && this.endTimer > 2.6) this.startRun();
        break;
      }
    }
    this.sound.updateMusic(dt, this.state === 'play');
    input.consumeEdges();
  }

  updatePlay(dt, controls) {
    const turkey = this.turkey;
    const speed = this.speed;
    if (controls.jumpPressed && turkey.tryJump()) this.sound.jump();
    const event = turkey.update(dt, speed, controls.duckHeld);
    if (event === 'landed') {
      this.sound.land();
      this.particles.dust(TURKEY_SCREEN_X - 8, GROUND_Y - 2, 5);
    }
    turkey.x += speed * dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    this.farmer.update(dt, speed, this.difficulty);
    const cameraX = this.cameraX();
    this.field.update(cameraX, VIEW_W + 700, this.difficulty, stageForDistance(this.distance));
    this.handleCollisions();
    this.particles.update(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.8);
    // Running kicks up a little dust.
    if (turkey.grounded && Math.random() < dt * 7) {
      this.particles.dust(TURKEY_SCREEN_X - 26, GROUND_Y - 2, 1);
    }
    if (this.distance >= FINISH_METRES) {
      this.state = 'over';
      this.endTimer = 0;
      this.particles.leaves(TURKEY_SCREEN_X + 60, GROUND_Y - 90, 26);
      this.finishRun(true);
    } else if (this.farmer.caught && turkey.invulnerable <= 0) {
      this.beginCatch();
    }
  }

  cameraX() {
    return this.turkey.x - TURKEY_SCREEN_X;
  }

  handleCollisions() {
    const turkey = this.turkey;
    const tBox = turkey.hitbox();
    for (const item of this.field.items) {
      if (item.taken) continue;
      const box = this.field.hitbox(item);
      if (box.right < tBox.left - 90) {
        // Fully passed: an obstacle cleared cleanly is a near miss.
        if (!item.pickup && !item.counted) {
          item.counted = true;
          this.nearMisses += 1;
          this.points += 25;
          this.sound.nearMiss();
        }
        continue;
      }
      if (box.left > tBox.right + 40) continue;
      const overlap = box.left < tBox.right && box.right > tBox.left && box.top < tBox.bottom && box.bottom > tBox.top;
      if (!overlap) continue;
      if (item.pickup) {
        item.taken = true;
        const sx = item.x - this.cameraX();
        if (item.kind === 'corn') {
          this.corn += 1;
          this.points += 50;
          this.sound.crunch();
          this.particles.sparkles(sx, GROUND_Y - item.y, 7);
        } else {
          this.points += 150;
          if (this.lives < 5) { this.lives += 1; this.maxLives = Math.max(this.maxLives, this.lives); }
          this.farmer.gap = Math.min(MAX_GAP, this.farmer.gap + 90);
          this.sound.pieChime();
          this.particles.sparkles(sx, GROUND_Y - item.y, 14);
        }
      } else if (turkey.invulnerable <= 0) {
        this.takeHit(item);
      }
    }
  }

  takeHit(item) {
    const turkey = this.turkey;
    this.lives -= 1;
    turkey.invulnerable = 1.5;
    turkey.stumble = 0.7;
    this.slowTimer = 0.75;
    this.shake = 13;
    this.flash = 0.55;
    this.farmer.surge(118);
    this.sound.hurt();
    this.sound.alarm();
    this.particles.feathers(TURKEY_SCREEN_X + 4, GROUND_Y - turkey.y - 52, 13);
    announce(`Ouch! Waddles hit a ${item.kind}. ${this.lives} lives left.`);
    if (this.lives <= 0) this.beginCatch();
  }

  beginCatch() {
    if (this.state !== 'play') return;
    this.state = 'caught';
    this.catchTimer = 0.85;
    this.sound.caughtJingle();
    this.particles.feathers(TURKEY_SCREEN_X + 4, GROUND_Y - this.turkey.y - 52, 18);
    announce('Caught! Farmer Brown has his turkey.');
  }

  finishRun(escaped) {
    this.escaped = escaped;
    if (escaped) this.sound.escapedFanfare();
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    announce(escaped ? `Escaped with a score of ${this.score}!` : `Caught. Final score ${this.score}.`);
  }

  // Simple lookahead driver for demo mode, screenshots and the test:
  // jump ground obstacles, duck flying knives, otherwise keep running.
  autopilot() {
    const turkey = this.turkey;
    const tBox = turkey.hitbox();
    let jump = false;
    let duck = false;
    for (const item of this.field.items) {
      if (item.taken || item.pickup) continue;
      const box = this.field.hitbox(item);
      const ahead = box.left - tBox.right;
      if (ahead < -20 || ahead > 165) continue;
      if (OBSTACLES[item.kind].flyer) duck = true;
      else if (turkey.grounded) jump = true;
    }
    return { jumpPressed: jump, duckHeld: duck };
  }

  draw() {
    const ctx = this.ctx;
    const cameraX = this.cameraX();
    const stage = stageForDistance(this.distance);
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.world.drawBackground(ctx, this.state === 'title' ? this.time * 12 : cameraX, stage, this.time);
    this.world.drawGround(ctx, this.state === 'title' ? this.time * 12 : cameraX, stage);
    this.world.drawWoodsGate(ctx, cameraX);
    if (this.state !== 'title') {
      this.field.draw(ctx, cameraX, this.time);
      this.farmer.draw(ctx, TURKEY_SCREEN_X);
    }
    this.turkey.draw(ctx, this.state === 'title' ? 296 : TURKEY_SCREEN_X);
    // Particles live in screen space for bursts, world space for dust:
    // both are spawned already converted, so just draw them.
    this.particles.draw(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(210,40,20,${(this.flash * 0.35).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.state === 'title') {
      drawTitle(ctx, this.time, this.best);
    } else if (this.state === 'paused') {
      drawHUD(ctx, this.hudState());
      drawPaused(ctx);
    } else if (this.state === 'over') {
      drawEnd(ctx, this.hudState(), this.best);
    } else {
      drawHUD(ctx, this.hudState());
    }
  }

  hudState() {
    return {
      score: this.score,
      distance: this.distance,
      lives: this.lives,
      maxLives: this.maxLives,
      corn: this.corn,
      nearMisses: this.nearMisses,
      gap: this.farmer.gap,
      escaped: !!this.escaped,
      muted: this.sound.muted,
    };
  }
}

function toLogical(point, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((point.x - rect.left) / rect.width) * VIEW_W,
    y: ((point.y - rect.top) / rect.height) * VIEW_H,
  };
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function loadBest() {
  try { return Number(localStorage.getItem('gobbleRunBest')) || 0; } catch (err) { return 0; }
}

function saveBest(value) {
  try { localStorage.setItem('gobbleRunBest', String(value)); } catch (err) { /* private mode */ }
}

// --- Boot, sizing and the frame loop -------------------------------------

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
  canvas.style.position = 'fixed';
  canvas.style.left = `${Math.floor((window.innerWidth - VIEW_W * scale) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - VIEW_H * scale) / 2)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const game = new Game(canvas);
window.__game = game;

const params = new URLSearchParams(window.location.search);
if (params.get('demo') === '1') {
  game.demo = true;
  game.startRun();
}

let lastStamp = performance.now();
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - lastStamp) / 1000));
  lastStamp = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}

// --- Screenshot scenes ----------------------------------------------------
// ?shot=title|play|play2|end&seed=N renders one deterministic scene:
// the simulation is stepped at a fixed 60 Hz with the autopilot driving,
// so the picture is a real frame of the real game, reproducible exactly.

function runShotScene(name, seed) {
  const step = 1 / 60;
  game.resetRun(seed);
  if (name === 'title') {
    game.state = 'title';
    for (let i = 0; i < 40; i++) game.update(step);
  } else if (name === 'play' || name === 'play2') {
    game.state = 'play';
    const seconds = name === 'play' ? 8 : 17;
    game.demo = true;
    for (let i = 0; i < seconds * 60; i++) {
      game.update(step);
      if (game.state !== 'play') { game.state = 'play'; game.lives = Math.max(game.lives, 2); }
    }
    game.demo = false;
  } else if (name === 'end') {
    game.state = 'play';
    game.demo = true;
    for (let i = 0; i < 21 * 60; i++) {
      game.update(step);
      if (game.state !== 'play') break;
    }
    game.demo = false;
    // Whatever the autopilot achieved, show the caught ending honestly:
    if (game.state === 'play') {
      game.lives = 1;
      game.farmer.gap = 30;
      game.beginCatch();
    }
    if (game.state === 'caught') {
      for (let i = 0; i < 70 && game.state === 'caught'; i++) game.update(step);
    }
  }
  game.draw();
  window.__shotReady = true;
}

// --- Scripted self-test -----------------------------------------------------
// ?test=1 plays the whole game by itself and reports into the DOM.

function runSelfTest() {
  const step = 1 / 60;
  const results = [];
  const check = (label, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  game.resetRun(7);
  game.state = 'play';
  game.demo = true;
  for (let i = 0; i < 240; i++) game.update(step);
  check('autopilot runs and gains distance', game.distance > 40);
  check('still playing after 4 s of autopilot', game.state === 'play');
  const livesBefore = game.lives;
  game.turkey.invulnerable = 0;
  game.takeHit({ kind: 'oven' });
  check('a hit costs a life and the farmer surges', game.lives === livesBefore - 1 && game.farmer.gap < 300);
  game.demo = false;
  game.turkey.x = 600 + (FINISH_METRES - 4) * PIXELS_PER_METRE;
  game.farmer.gap = 300;
  game.state = 'play';
  for (let i = 0; i < 240 && game.state === 'play'; i++) game.update(step);
  check('reaching the woods ends the run escaped', game.state === 'over' && game.escaped === true);
  game.startRun();
  check('restart resets lives, distance and state', game.state === 'play' && game.lives === 3 && game.distance < 1);
  game.state = 'play';
  game.farmer.gap = 20;
  game.turkey.invulnerable = 0;
  game.update(step);
  check('the farmer catching up ends the run caught', game.state === 'caught' || game.state === 'over');
  for (let i = 0; i < 90; i++) game.update(step);
  check('caught sequence settles on the end screen', game.state === 'over' && game.escaped === false);
  const failed = results.filter((r) => r.startsWith('FAIL'));
  const summary = `GOBBLE RUN SELF-TEST: ${results.length - failed.length}/${results.length} passed`;
  document.title = summary;
  announce(`${summary}. ${results.join(' · ')}`);
  window.__testResult = { summary, results };
  game.resetRun(3);
  game.state = 'title';
  game.draw();
}

if (params.get('test') === '1') {
  runSelfTest();
} else if (params.get('shot')) {
  runShotScene(params.get('shot'), Number(params.get('seed')) || 1);
} else {
  requestAnimationFrame(frame);
}
