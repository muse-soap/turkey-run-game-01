// rng.js — a tiny seeded random number generator (mulberry32).
// The whole run is seeded so screenshot scenes and the self-test are
// perfectly reproducible: same seed, same farm, every time.

export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

export function pickOne(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}
