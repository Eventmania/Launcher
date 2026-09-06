export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Darken a #rrggbb color by factor f (0..1). */
export function shade(hex: string, f = 0.5) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r} ${g} ${b})`;
}

export function clampN(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

/** Classify a launch target. */
export function detectKind(target: string): "url" | "protocol" | "sim" {
  const t = target.trim();
  if (!t) return "sim";
  if (/^https?:\/\//i.test(t)) return "url";
  return "protocol";
}

/** Ask Windows to open a custom URI protocol (steam://, myapp://, …). */
export function fireProtocol(target: string) {
  try {
    const f = document.createElement("iframe");
    f.style.display = "none";
    f.src = target;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 6000);
  } catch {
    /* protocol launch unavailable */
  }
}
