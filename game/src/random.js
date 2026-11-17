// Seeded RNG (mulberry32) so screenshot states and replays are deterministic.
// The live game seeds from the clock; ?seed= pins it for screenshots.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(rng) {
  return 1 + Math.floor(rng() * 6);
}

// Fisher-Yates shuffle driven by the seeded RNG.
export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Read ?seed= from the page URL; fall back to a clock seed.
export function seedFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const s = Number(q.get('seed'));
    if (Number.isFinite(s) && s !== 0) return s >>> 0;
  } catch { /* no URL API in odd embeds */ }
  return (Date.now() ^ 0x9e3779b9) >>> 0;
}
