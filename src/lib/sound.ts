/* Tiny WebAudio UI sounds — initialized lazily on first gesture. */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

export type SfxKind = "move" | "tab" | "select" | "back" | "error";

const CONF: Record<SfxKind, [OscillatorType, number, number, number]> = {
  move: ["sine", 640, 0.028, 0.05],
  tab: ["sine", 500, 0.045, 0.08],
  select: ["triangle", 860, 0.075, 0.14],
  back: ["sine", 460, 0.06, 0.13],
  error: ["square", 190, 0.05, 0.18],
};

export function sfx(kind: SfxKind) {
  if (!enabled) return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    const [type, freq, vol, dur] = CONF[kind];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (kind === "back") o.frequency.exponentialRampToValueAtTime(300, t + dur);
    if (kind === "select")
      o.frequency.exponentialRampToValueAtTime(1240, t + dur * 0.55);
    if (kind === "tab") o.frequency.exponentialRampToValueAtTime(720, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  } catch {
    /* audio unavailable — stay silent */
  }
}
