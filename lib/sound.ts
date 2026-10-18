let ctx: AudioContext | null = null;

/** Browsers only allow sound after a tap, so call this from a click handler before playing anything. */
export function unlockSound() {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {
    // No Web Audio; the game still works silently.
  }
}

function beep(frequency: number, seconds: number, volume: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + seconds);
}

export function tick() {
  beep(880, 0.08, 0.1);
}

export function ding() {
  beep(1320, 0.35, 0.15);
}

export function timeUpBuzz() {
  beep(220, 0.9, 0.25);
  navigator.vibrate?.([400, 150, 400]);
}

/** A noisy explosion for Hot Potato. */
export function boom() {
  navigator.vibrate?.([600]);
  if (!ctx) return;
  const seconds = 0.9;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = 900;
  gain.gain.value = 0.6;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}
