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
