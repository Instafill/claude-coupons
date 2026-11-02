// The room's sounds, made on the spot with Web Audio: nothing to download, and each is a few
// short notes. A browser keeps audio silent until the visitor has touched the page, so the
// first press or key anywhere unlocks it. Sound can be switched off; the choice is remembered.

const KEY = "draw-sound";

let ctx: AudioContext | null = null;
let muted = read();
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Called on the first touch of the page: from then on sounds can play. */
export function unlockSound() {
  const c = context();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function soundMuted(): boolean {
  return muted;
}

export function setSoundMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(KEY, next ? "off" : "on");
  } catch {
    // A private window: the choice lasts this visit.
  }
  if (!next) unlockSound();
  listeners.forEach((fn) => fn());
}

export function onSoundChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** One note: a frequency, when it starts (seconds from now), how long, how loud, and its timbre. */
function note(freq: number, start: number, length: number, volume: number, type: OscillatorType = "sine") {
  const c = ctx!;
  const at = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

function ready(): boolean {
  if (muted) return false;
  const c = context();
  return !!c && c.state === "running";
}

let lastChat = 0;

/** A new message in the chat: a soft two-note pop, at most a few a second in a busy room. */
export function playChat() {
  const now = Date.now();
  if (now - lastChat < 350 || !ready()) return;
  lastChat = now;
  note(880, 0, 0.09, 0.08);
  note(1320, 0.06, 0.12, 0.06);
}

/** The countdown ends and the draw starts: a rising four-note call. */
export function playDrawStart() {
  if (!ready()) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    note(f, i * 0.12, 0.35, 0.12, "triangle");
  });
}

/** The draw's highlight moving from one person to the next: a short click. */
export function playTick() {
  if (!ready()) return;
  note(1600, 0, 0.035, 0.05, "square");
}

/** A spot lands on someone: a bright chime, a fuller one when it's the visitor. */
export function playWin(mine: boolean) {
  if (!ready()) return;
  const chord = mine ? [783.99, 987.77, 1174.66, 1567.98] : [659.25, 830.61, 987.77];
  chord.forEach((f, i) => note(f, i * 0.07, mine ? 1.1 : 0.7, mine ? 0.12 : 0.09, "triangle"));
}
