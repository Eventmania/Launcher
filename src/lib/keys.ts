/* ------------------------------------------------------------------ */
/*  10-foot focus navigation: a prioritized key handler stack.         */
/*  The topmost (highest priority) layer consumes keys — overlays      */
/*  naturally shadow the screens underneath.                           */
/* ------------------------------------------------------------------ */
import { useEffect, useRef, useState } from "react";
import { sfx } from "./sound";

export type KeyHandler = (e: KeyboardEvent) => boolean;

interface Entry {
  id: string;
  prio: number;
  h: KeyHandler;
}

const entries: Entry[] = [];
const NAV_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Enter",
  " ",
  "Backspace",
  "Escape",
]);

if (typeof window !== "undefined") {
  window.addEventListener(
    "keydown",
    (e) => {
      const sorted = [...entries].sort((a, b) => b.prio - a.prio);
      for (const en of sorted) {
        let consumed = false;
        try {
          consumed = en.h(e);
        } catch {
          consumed = false;
        }
        if (consumed) {
          if (NAV_KEYS.has(e.key)) e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    },
    true
  );
}

export function useTvKeys(
  id: string,
  prio: number,
  h: KeyHandler,
  active = true
) {
  const ref = useRef(h);
  ref.current = h;
  useEffect(() => {
    if (!active) return;
    const entry: Entry = { id, prio, h: (e) => ref.current(e) };
    entries.push(entry);
    return () => {
      const i = entries.indexOf(entry);
      if (i >= 0) entries.splice(i, 1);
    };
  }, [id, prio, active]);
}

/* ------------------------- grid navigation ------------------------- */

export type EdgeDir = "left" | "right" | "up" | "down";

export interface TvNavOpts {
  id: string;
  prio?: number;
  active?: boolean;
  rows: number;
  cols: (r: number) => number;
  onEnter: (r: number, c: number) => void;
  onEdge?: (r: number, c: number, dir: EdgeDir) => void;
  extra?: (e: KeyboardEvent, r: number, c: number) => boolean;
  initial?: [number, number];
}

export function useTvNav(o: TvNavOpts) {
  const [pos, setPos] = useState<[number, number]>(() => o.initial ?? [0, 0]);
  const posRef = useRef(pos);
  posRef.current = pos;
  const optsRef = useRef(o);
  optsRef.current = o;

  const move = (r: number, c: number, silent = false) => {
    const op = optsRef.current;
    const rows = Math.max(1, op.rows);
    const nr = Math.max(0, Math.min(rows - 1, r));
    const nc = Math.max(0, Math.min(Math.max(1, op.cols(nr)) - 1, c));
    const [cr, cc] = posRef.current;
    if (nr === cr && nc === cc) return;
    setPos([nr, nc]);
    if (!silent) sfx("move");
  };

  useEffect(() => {
    if (o.active === false) return;
    const h: KeyHandler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const op = optsRef.current;
      const [r, c] = posRef.current;
      const nCols = Math.max(1, op.cols(r));
      switch (e.key) {
        case "ArrowRight":
          if (c < nCols - 1) move(r, c + 1);
          else op.onEdge?.(r, c, "right");
          return true;
        case "ArrowLeft":
          if (c > 0) move(r, c - 1);
          else op.onEdge?.(r, c, "left");
          return true;
        case "ArrowDown":
          if (r < op.rows - 1) move(r + 1, c);
          else op.onEdge?.(r, c, "down");
          return true;
        case "ArrowUp":
          if (r > 0) move(r - 1, c);
          else op.onEdge?.(r, c, "up");
          return true;
        case "Enter":
        case " ":
          op.onEnter(r, c);
          sfx("select");
          return true;
        default:
          return op.extra ? op.extra(e, r, c) : false;
      }
    };
    const id = o.id;
    const prio = o.prio ?? 50;
    const entry: Entry = { id, prio, h };
    entries.push(entry);
    return () => {
      const i = entries.indexOf(entry);
      if (i >= 0) entries.splice(i, 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.id, o.active, o.prio]);

  /* keep position valid when the grid shrinks (filters, overlays…) */
  useEffect(() => {
    const [r, c] = posRef.current;
    const op = optsRef.current;
    const nr = Math.min(r, Math.max(0, op.rows - 1));
    const nc = Math.min(c, Math.max(0, Math.max(1, op.cols(nr)) - 1));
    if (nr !== r || nc !== c) setPos([nr, nc]);
  }, [o.rows]);

  return {
    r: pos[0],
    c: pos[1],
    set: (r: number, c: number) => move(r, c, true),
    move,
  };
}

/* Per-tab focus memory so returning to a tab restores where you were. */
const LAST_FOCUS: Record<string, [number, number]> = {};
export function rememberFocus(tab: string, r: number, c: number) {
  LAST_FOCUS[tab] = [r, c];
}
export function recallFocus(tab: string): [number, number] {
  return LAST_FOCUS[tab] ?? [2, 0];
}
