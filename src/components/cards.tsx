import type { ReactNode } from "react";
import {
  fmtDur,
  grad,
  hashStr,
  type AppDef,
  type Channel,
  type MediaItem,
} from "../data";
import { Icon } from "../icons";
import { cx, shade } from "../lib/util";

/* ------------------------------ Cell ------------------------------- */

export function Cell({
  r,
  c,
  focus,
  hover,
  onClick,
  onCtx,
  className,
  soft,
  children,
}: {
  r: number;
  c: number;
  focus: [number, number];
  hover: (r: number, c: number) => void;
  onClick?: () => void;
  onCtx?: () => void;
  className?: string;
  soft?: boolean;
  children: ReactNode;
}) {
  const focused = focus[0] === r && focus[1] === c;
  return (
    <div
      data-cell={`${r}:${c}`}
      role="button"
      tabIndex={-1}
      onMouseEnter={() => hover(r, c)}
      onClick={() => onClick?.()}
      onContextMenu={(e) => {
        e.preventDefault();
        if (focused) onCtx?.();
        else {
          hover(r, c);
          onCtx?.();
        }
      }}
      className={cx(
        "cell shrink-0 outline-none",
        soft && "cell-soft",
        focused && "is-focused",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------------- Shelves ----------------------------- */

export function ShelfRow({
  title,
  kicker,
  children,
  delay = 0,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section className="rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-1 flex items-center gap-3 px-12">
        <span
          className="h-4 w-1 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <h2 className="font-display text-[1.05rem] font-bold tracking-wide text-slate-100">
          {title}
        </h2>
        {kicker && (
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {kicker}
          </span>
        )}
      </div>
      <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-px-12 px-12 py-5">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------ Posters ---------------------------- */

export function Poster({ m, wide = false }: { m: MediaItem; wide?: boolean }) {
  return (
    <div
      className={cx(
        "grain relative overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10",
        wide ? "h-[12.5rem] w-[22rem]" : "h-60 w-44"
      )}
      style={{ background: grad(m.hue) }}
    >
      {m.backdrop && (
        <img
          src={m.backdrop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          draggable={false}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute left-3 top-3 rounded-md bg-black/45 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-200 backdrop-blur-sm">
        {m.genre}
      </div>
      <div className={cx("absolute bottom-3 left-3 right-3", wide && "bottom-4 left-4 right-4")}>
        <div
          className={cx(
            "font-display font-extrabold leading-tight text-white drop-shadow",
            wide ? "text-2xl" : "text-lg"
          )}
        >
          {m.title}
        </div>
        <div className="mt-1 text-[0.7rem] font-medium text-slate-300">
          {m.year} · {m.maturity} · {fmtDur(m.duration)}
        </div>
      </div>
    </div>
  );
}

export function WideCard({
  title,
  sub,
  bg,
  img,
  icon,
  progress,
  iconColor,
}: {
  title: string;
  sub: string;
  bg: string;
  img?: string;
  icon?: string;
  iconColor?: string;
  progress?: number;
}) {
  return (
    <div className="grain relative h-[12.5rem] w-[22rem] overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10" style={{ background: bg }}>
      {img && (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      )}
      {icon && (
        <div className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-xl bg-black/35 backdrop-blur-sm">
          <Icon name={icon} className="h-7 w-7" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute bottom-3.5 left-4 right-4">
        <div
          className="text-[0.68rem] font-bold uppercase tracking-[0.2em]"
          style={{ color: iconColor ?? "var(--accent)" }}
        >
          {sub}
        </div>
        <div className="mt-0.5 truncate font-display text-xl font-bold text-white">
          {title}
        </div>
      </div>
      {typeof progress === "number" && (
        <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-white/15">
          <div
            className="h-full rounded-r-full"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Apps ------------------------------ */

export function KindTag({ kind }: { kind: AppDef["kind"] }) {
  const map = { url: "WEB", protocol: "PC", sim: "ND" } as const;
  return (
    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[0.58rem] font-bold tracking-[0.14em] text-slate-200">
      {map[kind]}
    </span>
  );
}

export function AppTile({ app, fav }: { app: AppDef; fav?: boolean }) {
  return (
    <div className="w-40">
      <div
        className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10"
        style={{
          background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})`,
        }}
      >
        <Icon
          name={app.icon}
          className="h-10 w-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
        />
        {fav && (
          <span className="absolute left-1.5 top-1.5 text-amber-300">
            <Icon name="star" filled className="h-4 w-4" />
          </span>
        )}
        <KindTag kind={app.kind} />
      </div>
      <div className="mt-2 truncate text-center text-sm font-medium text-slate-300">
        {app.name}
      </div>
    </div>
  );
}

export function AppBadge({ app }: { app: AppDef }) {
  return (
    <div className="flex w-28 flex-col items-center gap-2">
      <div
        className="relative flex h-[6.5rem] w-[6.5rem] items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10"
        style={{
          background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})`,
        }}
      >
        <Icon name={app.icon} className="h-11 w-11 text-white drop-shadow" />
        <KindTag kind={app.kind} />
      </div>
      <div className="w-full truncate text-center text-[0.8rem] font-medium text-slate-300">
        {app.name}
      </div>
    </div>
  );
}

export function AddTile() {
  return (
    <div className="flex w-40 flex-col items-center gap-2">
      <div className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-white/25 bg-white/[0.03]">
        <Icon name="plus" className="h-9 w-9 text-slate-400" />
      </div>
      <div className="text-sm font-medium text-slate-400">Add app</div>
    </div>
  );
}

/* ----------------------------- Channels ---------------------------- */

export function ChannelCard({ ch }: { ch: Channel }) {
  return (
    <div className="relative h-[12rem] w-[21rem] overflow-hidden rounded-xl bg-[#0d1420] ring-1 ring-white/10">
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ background: ch.color }}
      />
      <div className="flex items-center gap-3 px-5 pt-5">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full font-display text-lg font-extrabold text-[#0a0f1a]"
          style={{ background: ch.color }}
        >
          {ch.name[0]}
        </span>
        <div>
          <div className="font-display text-base font-bold text-white">
            {ch.name}
          </div>
          <div className="text-xs text-slate-400">{ch.tag}</div>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.18em] text-white">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
          LIVE
        </span>
      </div>
      <div className="px-5 pt-4">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500">
          On now
        </div>
        <div className="mt-0.5 truncate font-display text-lg font-semibold text-slate-100">
          {ch.now}
        </div>
        <div className="mt-1 truncate text-xs text-slate-500">
          Up next · {ch.next}
        </div>
      </div>
      <div className="absolute bottom-4 left-5 right-5">
        <div className="mb-1.5 flex justify-between text-[0.65rem] font-semibold text-slate-400">
          <span>{ch.progress}% watched</span>
          <span style={{ color: ch.color }}>{ch.tag}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${ch.progress}%`, background: ch.color }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Hero ------------------------------ */

export function Hero({
  m,
  slide,
  total,
  focus,
  hover,
  onPlay,
  onList,
  listed,
  paused,
}: {
  m: MediaItem;
  slide: number;
  total: number;
  focus: [number, number];
  hover: (r: number, c: number) => void;
  onPlay: () => void;
  onList: () => void;
  listed: boolean;
  paused: boolean;
}) {
  const match = 84 + (hashStr(m.id) % 13);
  return (
    <div className="relative mx-12 mt-2 h-[24rem] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
      <div key={m.id} className="slide-hero absolute inset-0">
        {m.backdrop ? (
          <img
            key={m.id + "-img"}
            src={m.backdrop}
            alt=""
            className="animate-kb h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full" style={{ background: grad(m.hue) }} />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b13] via-[#070b13]/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b13] to-transparent" />
      <div className="grain absolute inset-0" />

      <div className="relative flex h-full flex-col justify-end px-10 pb-8">
        <div
          className="text-[0.7rem] font-bold uppercase tracking-[0.32em]"
          style={{ color: "var(--accent)" }}
        >
          Featured {m.type === "movie" ? "Film" : "Series"}
        </div>
        <h1 className="mt-2 max-w-2xl font-display text-6xl font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-lg">
          {m.title}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-sm font-medium text-slate-300">
          <span className="font-bold" style={{ color: "var(--accent)" }}>
            {match}% Match
          </span>
          <span>{m.year}</span>
          <span className="rounded border border-white/30 px-1.5 py-px text-xs">
            {m.maturity}
          </span>
          <span>{fmtDur(m.duration)}</span>
          <span className="rounded bg-white/10 px-1.5 py-px text-xs">4K</span>
        </div>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-slate-300 line-clamp-2">
          {m.desc}
        </p>
        <div className="mt-5 flex items-center gap-4">
          <Cell
            r={2}
            c={0}
            focus={focus}
            hover={hover}
            onClick={onPlay}
            soft
            className="flex items-center gap-2.5 rounded-full px-8 py-3 font-display text-base font-bold text-[#07101c]"
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span className="relative flex items-center gap-2.5">
              <Icon name="play" filled className="h-5 w-5" />
              Play
            </span>
          </Cell>
          <Cell
            r={2}
            c={1}
            focus={focus}
            hover={hover}
            onClick={onList}
            soft
            className={cx(
              "flex items-center gap-2.5 rounded-full px-7 py-3 font-display text-base font-semibold",
              listed ? "bg-white/20 text-white" : "bg-white/10 text-slate-200"
            )}
          >
            <Icon name={listed ? "check" : "plus"} className="h-5 w-5" />
            {listed ? "On Watchlist" : "Watchlist"}
          </Cell>
        </div>
      </div>

      <div className="absolute bottom-5 right-8 flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={cx(
                "h-1.5 rounded-full transition-all duration-300",
                i === slide ? "w-10" : "w-3 bg-white/25"
              )}
              style={i === slide ? { background: "var(--accent)" } : undefined}
            />
            {i === slide && (
              <span className="h-[3px] w-10 overflow-hidden rounded-full bg-white/15">
                <span
                  key={m.id + "-bar"}
                  className="hero-progress block h-full rounded-full"
                  style={{
                    background: "var(--accent)",
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
