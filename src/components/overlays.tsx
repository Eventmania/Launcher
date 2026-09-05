import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ACCENTS,
  ACCENT_NAMES,
  ICON_CHOICES,
  TILE_COLORS,
  WALL_NAMES,
  WALLS,
  detectKind,
  grad,
  MEDIA,
  type AppDef,
  type MediaItem,
} from "../data";
import { Icon } from "../icons";
import { useTvKeys, useTvNav } from "../lib/keys";
import { sfx } from "../lib/sound";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { cx, fireProtocol, shade } from "../lib/util";
import { AppBadge, Cell, Poster } from "./cards";

/* ------------------------------ shell ------------------------------ */

export function OverlayShell({
  children,
  onBg,
}: {
  children: ReactNode;
  onBg?: () => void;
}) {
  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#04060c]/85 p-6 backdrop-blur-md"
      onMouseDown={onBg}
    >
      <div className="pop-in max-h-full" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function EscChip() {
  return (
    <span className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-400 ring-1 ring-white/10">
      <span className="rounded border border-white/25 px-1.5 font-display text-[0.65rem] font-bold text-slate-300">
        ESC
      </span>
      back to launcher
    </span>
  );
}

/* ------------------------------ SEARCH ----------------------------- */

export function SearchOverlay({ seed }: { seed?: string }) {
  const ui = useUI();
  const { s } = useStore();
  const [q, setQ] = useState(seed ?? "");
  const boxRef = useRef<HTMLDivElement>(null);
  const qq = q.trim().toLowerCase();

  const appRes = (
    qq
      ? s.apps.filter((a) => (a.name + " " + a.cat).toLowerCase().includes(qq))
      : s.apps.slice(0, 10)
  ).slice(0, 10);
  const medRes = (
    qq
      ? MEDIA.filter((m) =>
          (m.title + " " + m.genre + " " + m.type).toLowerCase().includes(qq)
        )
      : MEDIA.slice(0, 10)
  ).slice(0, 10);

  const rowsArr: { title: string; items: { key: string; node: ReactNode; act: () => void }[] }[] =
    [
      {
        title: qq ? "Apps matching" : "Popular apps",
        items: appRes.map((a) => ({
          key: "sa-" + a.id,
          node: <AppBadge app={a} />,
          act: () => ui.openApp(a),
        })),
      },
      {
        title: qq ? "Movies & shows matching" : "Trending on NovaDeck",
        items: medRes.map((m) => ({
          key: "sm-" + m.id,
          node: <Poster m={m} />,
          act: () => ui.openMedia(m),
        })),
      },
    ].filter((r) => r.items.length > 0);

  const nav = useTvNav({
    id: "search",
    prio: 100,
    rows: Math.max(1, rowsArr.length),
    cols: (r) => Math.max(1, rowsArr[r]?.items.length ?? 1),
    onEnter: (r, c) => rowsArr[r]?.items[c]?.act(),
    extra: (e) => {
      if (e.key === "Escape") {
        sfx("back");
        ui.close();
        return true;
      }
      if (e.key === "Backspace") {
        setQ((v) => v.slice(0, -1));
        sfx("move");
        return true;
      }
      if (e.key.length === 1) {
        setQ((v) => v + e.key);
        sfx("move");
        return true;
      }
      return false;
    },
  });

  const focus: [number, number] = [nav.r, nav.c];
  useEffect(() => {
    const el = boxRef.current?.querySelector(`[data-cell="${nav.r}:${nav.c}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [nav.r, nav.c]);

  return (
    <div className="fade-in fixed inset-0 z-50 bg-[#05080f]/97 backdrop-blur-xl">
      <div className="flex h-full flex-col px-16 pt-10">
        <div className="flex items-center gap-5">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--accent)" }}
          >
            <Icon name="search" className="h-6 w-6 text-[#07101c]" />
          </span>
          <div className="min-h-[3.2rem] flex-1 font-display text-4xl font-bold text-white">
            {q || <span className="text-slate-600">Search apps, movies, shows…</span>}
            <span className="caret-blink ml-1 inline-block h-9 w-[3px] translate-y-1 rounded-full" style={{ background: "var(--accent)" }} />
          </div>
          <EscChip />
        </div>
        <div className="mt-6 h-px bg-white/10" />
        <div ref={boxRef} className="no-scrollbar mt-2 flex-1 overflow-y-auto pb-16">
          {qq && rowsArr.length === 0 && (
            <div className="mt-20 text-center">
              <div className="font-display text-2xl font-bold text-slate-300">
                No matches for “{q}”
              </div>
              <p className="mt-2 text-slate-500">
                Try an app name like “Steam”, or a title like “Solar Drift”.
              </p>
            </div>
          )}
          {rowsArr.map((row, ri) => (
            <section key={row.title} className="mt-6">
              <h3 className="mb-1 font-display text-base font-bold tracking-wide text-slate-200">
                {row.title}
                {qq && <span style={{ color: "var(--accent)" }}> “{q.trim()}”</span>}
              </h3>
              <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-px-2 py-4">
                {row.items.map((it, ci) => (
                  <Cell
                    key={it.key}
                    r={ri}
                    c={ci}
                    focus={focus}
                    hover={nav.set}
                    onClick={it.act}
                  >
                    {it.node}
                  </Cell>
                ))}
              </div>
            </section>
          ))}
          <p className="mt-8 text-center text-xs text-slate-600">
            Keep typing to refine · ↑ ↓ switch rows · Enter opens · Esc returns
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- SETTINGS ---------------------------- */

export function SettingsOverlay() {
  const { s, d } = useStore();
  const ui = useUI();
  const [fi, setFi] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const st = s.settings;

  const rows: {
    label: string;
    desc: string;
    value: ReactNode;
    adjust?: (dir: 1 | -1) => void;
    act?: () => void;
  }[] = [
    {
      label: "Wallpaper",
      desc: "Ambient backdrop behind the deck",
      adjust: (dir) =>
        d({ type: "settings", patch: { wall: (st.wall + dir + WALLS.length) % WALLS.length } }),
      value: (
        <span className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-200">{WALL_NAMES[st.wall]}</span>
          <img src={WALLS[st.wall]} alt="" className="h-11 w-20 rounded-md object-cover ring-1 ring-white/20" />
        </span>
      ),
    },
    {
      label: "Accent color",
      desc: "Focus actions, progress bars, highlights",
      adjust: (dir) =>
        d({ type: "settings", patch: { accent: (st.accent + dir + ACCENTS.length) % ACCENTS.length } }),
      value: (
        <span className="flex items-center gap-2.5">
          {ACCENTS.map((c, i) => (
            <span
              key={c}
              className={cx("h-5 w-5 rounded-full", i === st.accent && "ring-2 ring-white ring-offset-2 ring-offset-[#0c1322]")}
              style={{ background: c }}
            />
          ))}
          <span className="ml-1 text-sm font-semibold text-slate-200">{ACCENT_NAMES[st.accent]}</span>
        </span>
      ),
    },
    {
      label: "Clock format",
      desc: "Shown in the top bar",
      act: () => d({ type: "settings", patch: { clock24: !st.clock24 } }),
      value: <span className="text-sm font-semibold text-slate-200">{st.clock24 ? "24-hour" : "12-hour"}</span>,
    },
    {
      label: "Navigation sounds",
      desc: "Soft blips while moving and selecting",
      act: () => d({ type: "settings", patch: { sound: !st.sound } }),
      value: (
        <span className={cx("text-sm font-semibold", st.sound ? "text-emerald-300" : "text-slate-500")}>
          {st.sound ? "On" : "Off"}
        </span>
      ),
    },
    {
      label: "Link real Windows apps",
      desc: "Launch any .exe via URI protocols",
      act: () => ui.setLayer({ type: "help" }),
      value: <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Open guide ›</span>,
    },
    {
      label: confirmReset ? "Press Enter again to wipe" : "Reset NovaDeck",
      desc: "Removes added apps, history and settings",
      act: () => {
        if (!confirmReset) {
          setConfirmReset(true);
          sfx("error");
          return;
        }
        d({ type: "reset" });
        ui.toast("Launcher restored to factory defaults", "restart");
        ui.close();
      },
      value: (
        <span className={cx("text-sm font-semibold", confirmReset ? "text-red-400" : "text-slate-400")}>
          {confirmReset ? "Are you sure?" : "Restore defaults"}
        </span>
      ),
    },
  ];

  useTvKeys("settings", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.key) {
      case "ArrowDown":
        setFi((i) => Math.min(rows.length - 1, i + 1));
        sfx("move");
        return true;
      case "ArrowUp":
        setFi((i) => Math.max(0, i - 1));
        sfx("move");
        return true;
      case "ArrowLeft":
        if (rows[fi].adjust) {
          rows[fi].adjust?.(-1);
          sfx("move");
        }
        return true;
      case "ArrowRight":
        if (rows[fi].adjust) {
          rows[fi].adjust?.(1);
          sfx("move");
        }
        return true;
      case "Enter":
      case " ":
        if (rows[fi].adjust) rows[fi].adjust?.(1);
        else rows[fi].act?.();
        sfx("select");
        return true;
      case "Escape":
        if (confirmReset) setConfirmReset(false);
        else {
          sfx("back");
          ui.close();
        }
        return true;
      default:
        return true;
    }
  });

  return (
    <OverlayShell onBg={() => ui.close()}>
      <div className="w-[46rem] max-w-[94vw] overflow-hidden rounded-xl bg-[#0c1322] shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-8 py-5">
          <div>
            <div className="font-display text-xl font-extrabold text-white">Settings</div>
            <div className="text-xs text-slate-500">
              ↑ ↓ choose · ← → adjust · Enter toggle · Esc returns to the deck
            </div>
          </div>
          <EscChip />
        </div>
        <div className="space-y-1 p-4">
          {rows.map((r, i) => (
            <div
              key={r.label}
              onMouseEnter={() => setFi(i)}
              onClick={() => {
                sfx("select");
                if (r.adjust) r.adjust(1);
                else r.act?.();
              }}
              className={cx(
                "cell cell-soft flex cursor-pointer items-center justify-between rounded-lg px-5 py-4",
                fi === i ? "is-focused bg-white/10" : "bg-white/[0.02]"
              )}
            >
              <div>
                <div className={cx("font-display text-[0.98rem] font-bold", fi === i ? "text-white" : "text-slate-200")}>
                  {r.label}
                </div>
                <div className="text-xs text-slate-500">{r.desc}</div>
              </div>
              <div className="flex items-center gap-3">
                {r.adjust && <Icon name="chevL" className="h-4 w-4 text-slate-500" />}
                {r.value}
                {r.adjust && <Icon name="chevR" className="h-4 w-4 text-slate-500" />}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] px-8 py-3.5 text-[0.7rem] text-slate-600">
          NovaDeck v1.0 · a 10-foot launcher for Windows 10 · state is stored on this PC
        </div>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------ DETAILS ---------------------------- */

export function DetailsOverlay({ m }: { m: MediaItem }) {
  const ui = useUI();
  const { s, d } = useStore();
  const prog = s.mediaProgress[m.id] ?? 0;

  const nav = useTvNav({
    id: "details",
    prio: 100,
    rows: 1,
    cols: () => 3,
    onEnter: (_r, c) => {
      if (c === 0) ui.playMedia(m);
      else if (c === 1) {
        const listed = s.favMedia.includes(m.id);
        d({ type: "favMedia", id: m.id });
        ui.toast(listed ? "Removed from Watchlist" : "Added to Watchlist", "star");
      } else {
        sfx("back");
        ui.close();
      }
    },
    extra: (e) => {
      if (e.key === "Escape") {
        sfx("back");
        ui.close();
      }
      return true;
    },
  });

  const focus: [number, number] = [0, nav.c];
  const listed = s.favMedia.includes(m.id);

  return (
    <div className="fade-in fixed inset-0 z-50 overflow-hidden">
      {m.backdrop ? (
        <img src={m.backdrop} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="h-full w-full" style={{ background: grad(m.hue) }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05080f] via-[#05080f]/70 to-[#05080f]/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05080f]/90 via-transparent to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 px-16 pb-14">
        <div className="max-w-3xl">
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            {m.genre} · {m.type === "movie" ? "Film" : "Series"}
          </div>
          <h2 className="mt-2 font-display text-6xl font-extrabold tracking-tight text-white drop-shadow">
            {m.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-300">
            <span>{m.year}</span>
            <span className="rounded border border-white/30 px-1.5 py-px text-xs">{m.maturity}</span>
            <span>
              {m.duration} min{m.type === "show" ? " / ep" : ""}
            </span>
            {prog > 60 && (
              <span className="rounded-full px-3 py-1 text-xs font-bold text-[#07101c]" style={{ background: "var(--accent)" }}>
                Resume from {Math.floor(prog / 60)}:{Math.floor(prog % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>
          <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-slate-300">{m.desc}</p>
          <div className="mt-7 flex items-center gap-4">
            <Cell r={0} c={0} focus={focus} hover={nav.set} soft
              onClick={() => ui.playMedia(m)}
              className="relative flex items-center gap-2.5 rounded-full px-8 py-3 font-display text-base font-bold text-[#07101c]"
            >
              <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
              <span className="relative flex items-center gap-2.5">
                <Icon name="play" filled className="h-5 w-5" />
                {prog > 60 ? "Resume" : "Play"}
              </span>
            </Cell>
            <Cell r={0} c={1} focus={focus} hover={nav.set} soft
              onClick={() => {
                d({ type: "favMedia", id: m.id });
                ui.toast(!listed ? "Added to Watchlist" : "Removed from Watchlist", "star");
              }}
              className={cx(
                "flex items-center gap-2.5 rounded-full px-7 py-3 font-display text-base font-semibold",
                listed ? "bg-white/20 text-white" : "bg-white/10 text-slate-200"
              )}
            >
              <Icon name={listed ? "check" : "plus"} className="h-5 w-5" />
              {listed ? "On Watchlist" : "Watchlist"}
            </Cell>
            <Cell r={0} c={2} focus={focus} hover={nav.set} soft
              onClick={() => {
                sfx("back");
                ui.close();
              }}
              className="flex items-center gap-2.5 rounded-full bg-white/10 px-7 py-3 font-display text-base font-semibold text-slate-200"
            >
              <Icon name="back" className="h-5 w-5" />
              Back
            </Cell>
          </div>
        </div>
      </div>
      <div className="absolute right-10 top-8">
        <EscChip />
      </div>
    </div>
  );
}

/* ---------------------------- APP OPTIONS -------------------------- */

export function AppOptionsOverlay({ app }: { app: AppDef }) {
  const ui = useUI();
  const { s, d } = useStore();
  const [fi, setFi] = useState(0);
  const [confirmDel, setConfirmDel] = useState(false);
  const fav = s.favApps.includes(app.id);

  const rows: { icon: string; label: string; danger?: boolean; act: () => void }[] = [
    { icon: "play", label: "Open", act: () => ui.openApp(app) },
    {
      icon: "star",
      label: fav ? "Remove from Favorites" : "Add to Favorites",
      act: () => {
        d({ type: "favApp", id: app.id });
        ui.toast(fav ? `${app.name} removed from favorites` : `${app.name} pinned to favorites`, "star");
        ui.close();
      },
    },
    { icon: "pencil", label: "Edit details", act: () => ui.openAddApp(app) },
    ...(app.builtIn
      ? []
      : [
          {
            icon: "trash",
            label: confirmDel ? "Press Enter again to remove" : "Remove from NovaDeck",
            danger: true,
            act: () => {
              if (!confirmDel) {
                setConfirmDel(true);
                sfx("error");
                return;
              }
              d({ type: "removeApp", id: app.id });
              ui.toast(`${app.name} removed from the deck`, "trash");
              ui.close();
            },
          },
        ]),
    { icon: "x", label: "Cancel", act: () => ui.close() },
  ];

  useTvKeys("appopts", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.key) {
      case "ArrowDown":
        setFi((i) => Math.min(rows.length - 1, i + 1));
        sfx("move");
        return true;
      case "ArrowUp":
        setFi((i) => Math.max(0, i - 1));
        sfx("move");
        return true;
      case "Enter":
      case " ":
        rows[fi].act();
        sfx("select");
        return true;
      case "Escape":
        if (confirmDel) setConfirmDel(false);
        else {
          sfx("back");
          ui.close();
        }
        return true;
      default:
        return true;
    }
  });

  return (
    <OverlayShell onBg={() => ui.close()}>
      <div className="w-[26rem] overflow-hidden rounded-xl bg-[#0c1322] shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-4 border-b border-white/[0.06] px-6 py-5">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
          >
            <Icon name={app.icon} className="h-7 w-7 text-white" />
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-extrabold text-white">{app.name}</div>
            <div className="truncate font-mono text-[0.68rem] text-slate-500">
              {app.target || `nova-deck quick window · ${app.cat}`}
            </div>
          </div>
        </div>
        <div className="space-y-1 p-3">
          {rows.map((r, i) => (
            <div
              key={r.label}
              onMouseEnter={() => setFi(i)}
              onClick={() => {
                sfx("select");
                r.act();
              }}
              className={cx(
                "cell cell-soft flex cursor-pointer items-center gap-3.5 rounded-lg px-4 py-3",
                fi === i ? "is-focused bg-white/10" : "bg-white/[0.02]"
              )}
            >
              <Icon
                name={r.icon}
                className={cx("h-5 w-5", r.danger ? (confirmDel ? "text-red-400" : "text-slate-400") : "text-slate-300")}
              />
              <span
                className={cx(
                  "font-display text-[0.95rem] font-semibold",
                  r.danger ? (confirmDel ? "text-red-400" : "text-slate-300") : "text-slate-200"
                )}
              >
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------ ADD APP ---------------------------- */

export function AddAppOverlay({ app }: { app?: AppDef }) {
  const ui = useUI();
  const { d } = useStore();
  const editing = app;
  const [name, setName] = useState(editing?.name ?? "");
  const [target, setTarget] = useState(editing?.target ?? "");
  const [iconIdx, setIconIdx] = useState(() =>
    Math.max(0, ICON_CHOICES.indexOf(editing?.icon ?? "spark"))
  );
  const [colorIdx, setColorIdx] = useState(() =>
    Math.max(0, TILE_COLORS.indexOf(editing?.color ?? TILE_COLORS[0]))
  );
  const [fi, setFi] = useState(0); // 0 name · 1 target · 2 icon · 3 color · 4 save · 5 cancel
  const kind = detectKind(target);

  const save = () => {
    const nm = name.trim();
    if (!nm) {
      sfx("error");
      ui.toast("Give the app a name first", "info");
      return;
    }
    const a: AppDef = {
      id: editing?.id ?? "u" + Date.now().toString(36),
      name: nm,
      cat: editing?.cat ?? "My Apps",
      target: target.trim(),
      kind,
      icon: ICON_CHOICES[iconIdx],
      color: TILE_COLORS[colorIdx],
      builtIn: editing?.builtIn,
      simId: editing?.simId ?? "generic",
    };
    d(editing ? { type: "updateApp", app: a } : { type: "addApp", app: a });
    ui.toast(editing ? `${nm} updated` : `${nm} added to your deck`, "check");
    ui.close();
  };

  useTvKeys("addapp", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const typing = fi === 0 || fi === 1;
    if (typing && e.key === "Backspace") {
      (fi === 0 ? setName : setTarget)((v) => v.slice(0, -1));
      sfx("move");
      return true;
    }
    if (typing && e.key.length === 1) {
      (fi === 0 ? setName : setTarget)((v) => v + e.key);
      sfx("move");
      return true;
    }
    switch (e.key) {
      case "ArrowDown":
        setFi((i) => Math.min(5, i + 1));
        sfx("move");
        return true;
      case "ArrowUp":
        setFi((i) => Math.max(0, i - 1));
        sfx("move");
        return true;
      case "ArrowLeft":
        if (fi === 2) setIconIdx((i) => (i + ICON_CHOICES.length - 1) % ICON_CHOICES.length);
        if (fi === 3) setColorIdx((i) => (i + TILE_COLORS.length - 1) % TILE_COLORS.length);
        sfx("move");
        return true;
      case "ArrowRight":
        if (fi === 2) setIconIdx((i) => (i + 1) % ICON_CHOICES.length);
        if (fi === 3) setColorIdx((i) => (i + 1) % TILE_COLORS.length);
        sfx("move");
        return true;
      case "Enter":
      case " ":
        if (fi === 4) save();
        else if (fi === 5) ui.close();
        else setFi((i) => i + 1);
        sfx("select");
        return true;
      case "Escape":
        sfx("back");
        ui.close();
        return true;
      default:
        return true;
    }
  });

  const kindInfo =
    kind === "url"
      ? "WEB — opens in a browser tab"
      : kind === "protocol"
        ? "PC — launches a Windows app through its URI protocol"
        : "ND — runs as a NovaDeck quick window";

  const FieldRow = ({
    i,
    label,
    children,
  }: {
    i: number;
    label: string;
    children: ReactNode;
  }) => (
    <div
      onMouseEnter={() => setFi(i)}
      className={cx(
        "cell cell-soft cursor-pointer rounded-lg px-5 py-4",
        fi === i ? "is-focused bg-white/10" : "bg-white/[0.02]"
      )}
    >
      <div className="mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );

  return (
    <OverlayShell onBg={() => ui.close()}>
      <div className="w-[46rem] max-w-[94vw] overflow-hidden rounded-xl bg-[#0c1322] shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-8 py-5">
          <div>
            <div className="font-display text-xl font-extrabold text-white">
              {editing ? "Edit app" : "Add an app"}
            </div>
            <div className="text-xs text-slate-500">
              {editing ? "Changes apply instantly across the deck" : "Anything with a link or a protocol can live here"}
            </div>
          </div>
          <span
            className="flex h-14 w-14 items-center justify-center rounded-xl transition-all"
            style={{ background: `linear-gradient(140deg, ${TILE_COLORS[colorIdx]}, ${shade(TILE_COLORS[colorIdx], 0.45)})` }}
          >
            <Icon name={ICON_CHOICES[iconIdx]} className="h-7 w-7 text-white" />
          </span>
        </div>
        <div className="space-y-2 p-5">
          <FieldRow i={0} label="Name">
            <div className="font-display text-lg font-semibold text-white">
              {name || <span className="text-slate-600">e.g. Elder Scrolls, OBS, Grandma's Recipes…</span>}
              {fi === 0 && <span className="caret-blink ml-0.5 inline-block h-5 w-[2.5px] translate-y-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </div>
          </FieldRow>
          <FieldRow i={1} label="Launch target">
            <div className="font-mono text-sm text-slate-200">
              {target || <span className="text-slate-600">https://… · steam://open/main · myapp://launch · leave empty for quick window</span>}
              {fi === 1 && <span className="caret-blink ml-0.5 inline-block h-4 w-[2.5px] translate-y-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </div>
            <div className="mt-1.5 text-xs font-semibold" style={{ color: "var(--accent)" }}>
              {kindInfo}
            </div>
          </FieldRow>
          <FieldRow i={2} label="Icon — ← → to browse">
            <div className="flex flex-wrap gap-2">
              {ICON_CHOICES.map((ic, i) => (
                <span
                  key={ic}
                  className={cx(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    i === iconIdx ? "text-[#07101c]" : "bg-white/[0.06] text-slate-400"
                  )}
                  style={i === iconIdx ? { background: "var(--accent)" } : undefined}
                >
                  <Icon name={ic} className="h-4.5 w-4.5" />
                </span>
              ))}
            </div>
          </FieldRow>
          <FieldRow i={3} label="Tile color — ← → to browse">
            <div className="flex gap-2.5">
              {TILE_COLORS.map((c, i) => (
                <span
                  key={c}
                  className={cx("h-8 w-8 rounded-full", i === colorIdx && "ring-2 ring-white ring-offset-2 ring-offset-[#0c1322]")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </FieldRow>
          <div className="flex gap-3 pt-2">
            <div
              onMouseEnter={() => setFi(4)}
              onClick={() => {
                sfx("select");
                save();
              }}
              className={cx(
                "cell cell-soft flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-3.5 font-display text-base font-bold text-[#07101c]",
                fi === 4 && "is-focused"
              )}
              style={{ background: "var(--accent)" }}
            >
              <Icon name="check" className="h-5 w-5" />
              {editing ? "Save changes" : "Add to deck"}
            </div>
            <div
              onMouseEnter={() => setFi(5)}
              onClick={() => ui.close()}
              className={cx(
                "cell cell-soft flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white/10 px-8 py-3.5 font-display text-base font-semibold text-slate-200",
                fi === 5 && "is-focused"
              )}
            >
              Cancel
            </div>
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------ LAUNCH ----------------------------- */

export function LaunchOverlay({ app }: { app: AppDef }) {
  const ui = useUI();
  const [again, setAgain] = useState(0);
  const [fi, setFi] = useState(0);

  useEffect(() => {
    fireProtocol(app.target);
  }, [app.target, again]);

  useTvKeys("launch", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
        setFi((i) => (i + 1) % 2);
        sfx("move");
        return true;
      case "Enter":
      case " ":
        sfx("select");
        if (fi === 0) ui.close();
        else {
          setAgain((a) => a + 1);
          ui.toast("Launch signal sent again", "restart");
        }
        return true;
      case "Escape":
        sfx("back");
        ui.close();
        return true;
      default:
        return true;
    }
  });

  return (
    <OverlayShell onBg={() => ui.close()}>
      <div className="w-[40rem] max-w-[94vw] rounded-xl bg-[#0c1322] px-10 py-10 text-center shadow-2xl ring-1 ring-white/10">
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl shadow-lg"
          style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
        >
          <Icon name={app.icon} className="h-10 w-10 text-white" />
        </div>
        <div className="mx-auto mt-6 h-10 w-10 rounded-full border-[3px] border-white/10 spin-slow" style={{ borderTopColor: "var(--accent)" }} />
        <h3 className="mt-5 font-display text-2xl font-extrabold text-white">
          Launching {app.name}…
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          Windows is being asked to open{" "}
          <span className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-xs text-slate-300">{app.target}</span>.
          NovaDeck stays right here — when you're done, Alt+Tab back, or press Enter.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <div
            onMouseEnter={() => setFi(0)}
            onClick={() => ui.close()}
            className={cx(
              "cell cell-soft cursor-pointer rounded-full px-8 py-3 font-display text-base font-bold text-[#07101c]",
              fi === 0 && "is-focused"
            )}
            style={{ background: "var(--accent)" }}
          >
            Return to NovaDeck
          </div>
          <div
            onMouseEnter={() => setFi(1)}
            onClick={() => {
              setAgain((a) => a + 1);
              ui.toast("Launch signal sent again", "restart");
            }}
            className={cx(
              "cell cell-soft cursor-pointer rounded-full bg-white/10 px-7 py-3 font-display text-base font-semibold text-slate-200",
              fi === 1 && "is-focused"
            )}
          >
            Send again
          </div>
        </div>
      </div>
    </OverlayShell>
  );
}

/* ------------------------------- HELP ------------------------------ */

export function HelpOverlay() {
  const ui = useUI();
  useTvKeys("help", 100, (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      sfx("back");
      ui.close();
    }
    return true;
  });

  const reg = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\novadeck-app]
@="URL:NovaDeck App Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\novadeck-app\\shell\\open\\command]
@="\\"C:\\\\Path\\\\To\\\\YourApp.exe\\" \\"%1\\""`;

  return (
    <OverlayShell onBg={() => ui.close()}>
      <div className="no-scrollbar max-h-[86vh] w-[52rem] max-w-[94vw] overflow-y-auto rounded-xl bg-[#0c1322] shadow-2xl ring-1 ring-white/10">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/[0.06] bg-[#0c1322] px-10 py-5">
          <div className="font-display text-xl font-extrabold text-white">
            Run real Windows programs from NovaDeck
          </div>
          <EscChip />
        </div>
        <div className="space-y-8 px-10 py-8 text-sm leading-relaxed text-slate-300">
          <section>
            <h4 className="mb-3 font-display text-base font-bold text-white">How launch targets work</h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded bg-sky-500/20 px-2 py-0.5 font-mono text-xs font-bold text-sky-300">WEB</span>
                <p>Targets starting with <span className="font-mono text-xs">https://</span> open in a browser tab. NovaDeck stays open behind it.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-300">PC</span>
                <p>Anything like <span className="font-mono text-xs">steam://</span> or <span className="font-mono text-xs">myapp://</span> asks Windows to launch the registered program directly on your desktop.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">ND</span>
                <p>No target? The app runs as a NovaDeck quick window (Notepad, Calculator and Clock are fully working sandboxes). Esc always snaps you straight back to the launcher.</p>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-display text-base font-bold text-white">Link any .exe in two minutes</h4>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Save the snippet below as <span className="font-mono text-xs text-slate-200">novadeck-app.reg</span> and edit the path to your program.</li>
              <li>Double-click it and accept the merge — this registers the <span className="font-mono text-xs">novadeck-app://</span> protocol with Windows 10.</li>
              <li>In NovaDeck: Apps → Add app, and set the target to <span className="font-mono text-xs text-slate-200">novadeck-app://launch</span>. Done — Enter now opens that program.</li>
            </ol>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-black/50 p-5 font-mono text-xs leading-relaxed text-emerald-200/90 ring-1 ring-white/10">{reg}</pre>
          </section>

          <section>
            <h4 className="mb-3 font-display text-base font-bold text-white">Protocols that already work on most PCs</h4>
            <div className="flex flex-wrap gap-2">
              {["steam://open/main", "spotify:", "vscode://", "ms-settings:", "ms-calculator:", "microsoft-edge:"].map((p) => (
                <span key={p} className="rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-xs text-slate-300 ring-1 ring-white/10">
                  {p}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-display text-base font-bold text-white">Coming back to the launcher</h4>
            <p>
              NovaDeck never closes itself. Quick windows return with <span className="rounded border border-white/25 px-1.5 font-display text-[0.65rem] font-bold">ESC</span>,
              external programs return with <span className="rounded border border-white/25 px-1.5 font-display text-[0.65rem] font-bold">ALT+TAB</span>.
              Press <span className="rounded border border-white/25 px-1.5 font-display text-[0.65rem] font-bold">F11</span> in your browser for full-screen TV mode, and pin the tab for one-click home.
            </p>
          </section>
        </div>
      </div>
    </OverlayShell>
  );
}
