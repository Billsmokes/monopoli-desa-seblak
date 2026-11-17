// WebAudio-synthesised sound effects only — no audio files, no network.
// Every call is guarded: if the context cannot start (no gesture yet, or
// headless), the game stays silent instead of throwing.

let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = 0) {
  const ac = audio();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* ignore audio errors */ }
}

function noise(dur, vol = 0.1, when = 0) {
  const ac = audio();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(ac.destination);
    src.start(t0);
  } catch { /* ignore audio errors */ }
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.08); },
  dice() {
    noise(0.09, 0.12, 0);
    noise(0.09, 0.1, 0.12);
    noise(0.12, 0.12, 0.26);
  },
  coin() {
    tone(988, 0.09, 'sine', 0.1);
    tone(1319, 0.16, 'sine', 0.1, 0.07);
  },
  card() {
    noise(0.12, 0.08, 0);
    tone(520, 0.1, 'triangle', 0.07, 0.05);
  },
  buy() {
    tone(523, 0.1, 'triangle', 0.1);
    tone(659, 0.1, 'triangle', 0.1, 0.08);
    tone(784, 0.18, 'triangle', 0.1, 0.16);
  },
  bad() { tone(220, 0.22, 'sawtooth', 0.06, 0, 160); },
  jail() { tone(180, 0.3, 'square', 0.05, 0, 90); },
  build() {
    tone(392, 0.08, 'triangle', 0.09);
    tone(523, 0.12, 'triangle', 0.09, 0.07);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.13));
    tone(1319, 0.5, 'triangle', 0.1, 0.55);
  },
};
