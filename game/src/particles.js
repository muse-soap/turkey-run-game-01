// particles.js — feather bursts, dust puffs and sparkle trails.
// One pooled list, hard-capped, so a long run never grows memory or
// tanks the frame rate on a modest machine.

const MAX_PARTICLES = 260;

export class Particles {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  spawn(x, y, options) {
    if (this.items.length >= MAX_PARTICLES) return;
    const count = options.count ?? 8;
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = (options.speed ?? 120) * (0.35 + Math.random() * 0.85);
      this.items.push({
        x, y,
        vx: Math.cos(angle) * speed + (options.driftX ?? 0),
        vy: Math.sin(angle) * speed - (options.lift ?? 40),
        life: 0,
        maxLife: (options.life ?? 0.6) * (0.6 + Math.random() * 0.7),
        size: (options.size ?? 5) * (0.6 + Math.random() * 0.9),
        color: options.colors[Math.floor(Math.random() * options.colors.length)],
        gravity: options.gravity ?? 320,
        spin: (Math.random() - 0.5) * 9,
        angle: Math.random() * Math.PI,
        shape: options.shape ?? 'feather',
      });
    }
  }

  feathers(x, y, count = 10) {
    this.spawn(x, y, { count, colors: ['#8a5a2b', '#a9713a', '#5d3a1a', '#e8dcc4'], speed: 190, life: 0.8, size: 7, shape: 'feather' });
  }

  dust(x, y, count = 6) {
    this.spawn(x, y, { count, colors: ['#c9a06a', '#b98d54', '#d9b77c', '#a87c48'], speed: 70, life: 0.5, size: 6, gravity: 60, shape: 'puff', lift: 16 });
  }

  sparkles(x, y, count = 8) {
    this.spawn(x, y, { count, colors: ['#ffd94d', '#fff3a0', '#ffb52e'], speed: 90, life: 0.45, size: 4, gravity: -40, shape: 'star' });
  }

  leaves(x, y, count = 12) {
    this.spawn(x, y, { count, colors: ['#d2691e', '#e08a2e', '#a83e1f', '#e5b84f'], speed: 150, life: 1.0, size: 6, gravity: 130, shape: 'feather' });
  }

  update(dt) {
    const list = this.items;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      const fade = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.3, -p.size * 0.3);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(p.size * 0.3, p.size * 0.3);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.3, p.size * 0.3);
        ctx.lineTo(-p.size, 0);
        ctx.lineTo(-p.size * 0.3, -p.size * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.7 + p.life), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
