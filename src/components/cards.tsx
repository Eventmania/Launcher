import type { ReactNode } from "react";
import {
  fmtDur,
  grad,
  hashStr,
  ytThumb,
  type AppDef,
  type MusicTrack,
  type NetStream,
  type PdFilm,
  type TonightItem,
  type TvShow,
  type WikiFilm,
  type YtVideo,
} from "../data";
import { fmtSize, type LocalFile } from "../lib/local";
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

/* --------------------------- close button -------------------------- */

export function CloseBtn({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label + " (Esc)"}
      className="absolute right-6 top-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition hover:scale-110 hover:bg-white/25"
    >
      <Icon name="x" className="h-5 w-5" />
    </button>
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
        <span className="h-4 w-1 rounded-full" style={{ background: "var(--accent)" }} />
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

/* --------------------------- real-art cards ------------------------ */

function ArtFrame({
  art,
  hue,
  wide = false,
  children,
}: {
  art: string | null;
  hue: number;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "grain relative overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10",
        wide ? "h-[12.5rem] w-[22rem]" : "h-60 w-44"
      )}
      style={{ background: grad(hue) }}
    >
      {art && (
        <img
          src={art}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          draggable={false}
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      {children}
    </div>
  );
}

export function ShowCard({ s }: { s: TvShow }) {
  return (
    <ArtFrame art={s.imgThumb} hue={hashStr(s.id) % 360}>
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[0.68rem] font-bold text-amber-300 backdrop-blur-sm">
        <Icon name="star" filled className="h-3 w-3" />
        {s.rating ? s.rating.toFixed(1) : "—"}
      </div>
      <div className="absolute bottom-2.5 left-3 right-3">
        <div className="font-display text-[1.02rem] font-extrabold leading-tight text-white drop-shadow">
          {s.name}
        </div>
        <div className="mt-0.5 text-[0.68rem] font-medium text-slate-300">
          {s.year || "—"} · {s.network} · {s.genres[0] ?? "Series"}
        </div>
      </div>
    </ArtFrame>
  );
}

export function FilmCard({ f }: { f: PdFilm }) {
  return (
    <ArtFrame art={f.img} hue={hashStr(f.id) % 360}>
      <div className="absolute left-2.5 top-2.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-200 backdrop-blur-sm">
        {f.genres[0]}
      </div>
      <div
        className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#07101c]"
        style={{ background: "var(--accent)" }}
      >
        <Icon name="play" filled className="h-3 w-3" />
        Stream
      </div>
      <div className="absolute bottom-2.5 left-3 right-3">
        <div className="font-display text-[1.02rem] font-extrabold leading-tight text-white drop-shadow">
          {f.title}
        </div>
        <div className="mt-0.5 text-[0.68rem] font-medium text-slate-300">
          {f.year} · {f.maturity} · {fmtDur(f.runtimeMin)}
        </div>
      </div>
    </ArtFrame>
  );
}

export function WikiCard({ w }: { w: WikiFilm }) {
  return (
    <ArtFrame art={w.image} hue={hashStr(w.id) % 360} wide>
      <div className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-200 backdrop-blur-sm">
        {w.year || "Film"}
      </div>
      <div className="absolute bottom-3 left-4 right-4">
        <div className="font-display text-xl font-extrabold text-white drop-shadow">
          {w.title}
        </div>
        <div className="mt-0.5 truncate text-[0.7rem] font-medium text-slate-300">
          {w.desc || "Acclaimed film"}
        </div>
      </div>
    </ArtFrame>
  );
}

export function EpisodeCard({ ep }: { ep: TonightItem }) {
  return (
    <ArtFrame art={ep.img} hue={hashStr(ep.id) % 360} wide>
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.16em] text-white">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" />
          TONIGHT
        </span>
        <span className="rounded-md bg-black/50 px-2 py-0.5 text-[0.68rem] font-bold text-slate-100 backdrop-blur-sm">
          {ep.time} · {ep.network}
        </span>
      </div>
      <div className="absolute bottom-3 left-4 right-4">
        <div className="font-display text-lg font-extrabold leading-tight text-white drop-shadow">
          {ep.show}
        </div>
        <div className="mt-0.5 truncate text-[0.72rem] font-medium text-slate-300">
          {ep.tag} · “{ep.episode}”
        </div>
      </div>
    </ArtFrame>
  );
}

export function VideoCard({ v }: { v: YtVideo }) {
  return (
    <ArtFrame art={ytThumb(v.id)} hue={hashStr(v.id) % 360} wide>
      <div className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white">
        YouTube
      </div>
      <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
        <Icon name="play" filled className="h-4 w-4 text-white" />
      </div>
      <div className="absolute bottom-3 left-4 right-4">
        <div className="font-display text-lg font-extrabold leading-tight text-white drop-shadow">
          {v.title}
        </div>
        <div className="mt-0.5 text-[0.72rem] font-medium text-slate-300">{v.channel}</div>
      </div>
    </ArtFrame>
  );
}

export function TrackCard({ t }: { t: MusicTrack }) {
  return (
    <div className="w-44">
      <div
        className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10"
        style={{ background: grad(hashStr(t.id) % 360) }}
      >
        {t.art && (
          <img src={t.art} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" draggable={false} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <span className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#07101c]">
          <Icon name="play" filled className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 truncate text-center text-sm font-semibold text-slate-200">{t.track}</div>
      <div className="truncate text-center text-xs text-slate-500">{t.artist}</div>
    </div>
  );
}

export function LocalCard({ f }: { f: LocalFile }) {
  return (
    <div className="flex w-[19rem] items-center gap-4 rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
        style={{ background: f.video ? "#12314f" : "#2d1f3d" }}
      >
        <Icon name={f.video ? "film" : "music"} className="h-6 w-6 text-white" />
      </span>
      <div className="min-w-0">
        <div className="truncate font-display text-[0.95rem] font-bold text-white">{f.name}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">
          {f.folderName}/{f.relPath} · {fmtSize(f.size)}
        </div>
        <div
          className="mt-1 inline-block rounded px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#07101c]"
          style={{ background: "var(--accent)" }}
        >
          {f.video ? "Play here" : "Audio"}
        </div>
      </div>
    </div>
  );
}

export function StreamCard({ st }: { st: NetStream }) {
  return (
    <div className="flex w-[19rem] items-center gap-4 rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#123a2e]">
        <Icon name="globe" className="h-6 w-6 text-emerald-300" />
      </span>
      <div className="min-w-0">
        <div className="truncate font-display text-[0.95rem] font-bold text-white">{st.name}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{st.url}</div>
        <div className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
          Stream · VLC ready
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
  iconColor,
  progress,
}: {
  title: string;
  sub: string;
  bg: string;
  img?: string | null;
  icon?: string;
  iconColor?: string;
  progress?: number;
}) {
  return (
    <div
      className="grain relative h-[12.5rem] w-[22rem] overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10"
      style={{ background: bg }}
    >
      {img && (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} loading="lazy" />
      )}
      {icon && (
        <div className="absolute right-5 top-5 flex h-14 w-14 items-center justify-center rounded-xl bg-black/35 backdrop-blur-sm">
          <Icon name={icon} className="h-7 w-7" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute bottom-3.5 left-4 right-4">
        <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em]" style={{ color: iconColor ?? "var(--accent)" }}>
          {sub}
        </div>
        <div className="mt-0.5 truncate font-display text-xl font-bold text-white">{title}</div>
      </div>
      {typeof progress === "number" && (
        <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-white/15">
          <div
            className="h-full rounded-r-full"
            style={{ width: `${Math.min(100, progress)}%`, background: "var(--accent)" }}
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
        style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
      >
        <Icon name={app.icon} className="h-10 w-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
        {fav && (
          <span className="absolute left-1.5 top-1.5 text-amber-300">
            <Icon name="star" filled className="h-4 w-4" />
          </span>
        )}
        <KindTag kind={app.kind} />
      </div>
      <div className="mt-2 truncate text-center text-sm font-medium text-slate-300">{app.name}</div>
    </div>
  );
}

export function AppBadge({ app }: { app: AppDef }) {
  return (
    <div className="flex w-28 flex-col items-center gap-2">
      <div
        className="relative flex h-[6.5rem] w-[6.5rem] items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10"
        style={{ background: `linear-gradient(140deg, ${app.color}, ${shade(app.color, 0.45)})` }}
      >
        <Icon name={app.icon} className="h-11 w-11 text-white drop-shadow" />
        <KindTag kind={app.kind} />
      </div>
      <div className="w-full truncate text-center text-[0.8rem] font-medium text-slate-300">{app.name}</div>
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

/* ------------------------------- Hero ------------------------------ */

export type HeroItem = { kind: "film"; film: PdFilm } | { kind: "show"; show: TvShow };

export function Hero({
  item,
  slide,
  total,
  focus,
  hover,
  onPrimary,
  onList,
  listed,
  paused,
}: {
  item: HeroItem;
  slide: number;
  total: number;
  focus: [number, number];
  hover: (r: number, c: number) => void;
  onPrimary: () => void;
  onList: () => void;
  listed: boolean;
  paused: boolean;
}) {
  const isFilm = item.kind === "film";
  const title = isFilm ? item.film.title : item.show.name;
  const art = isFilm ? item.film.img : item.show.img;
  const desc = isFilm ? item.film.desc : item.show.summary;
  const match = 84 + (hashStr(title) % 13);
  const uid = isFilm ? item.film.id : item.show.id;
  return (
    <div className="relative mx-12 mt-2 h-[24rem] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
      <div key={uid} className="slide-hero absolute inset-0 bg-[#0a0f1a]">
        {art && <img src={art} alt="" className="animate-kb h-full w-full object-cover" draggable={false} />}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b13] via-[#070b13]/65 to-[#070b13]/10" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b13] to-transparent" />
      <div className="grain absolute inset-0" />

      <div className="relative flex h-full flex-col justify-end px-10 pb-8">
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.32em]" style={{ color: "var(--accent)" }}>
          {isFilm ? "Real Cinema · Free Stream" : `Featured Series · ${item.show.network}`}
        </div>
        <h1 className="mt-2 max-w-2xl font-display text-6xl font-extrabold leading-[1.02] tracking-tight text-white drop-shadow-lg">
          {title}
        </h1>
        <div className="mt-3 flex items-center gap-3 text-sm font-medium text-slate-300">
          {isFilm ? (
            <>
              <span>{item.film.year}</span>
              <span className="rounded border border-white/30 px-1.5 py-px text-xs">{item.film.maturity}</span>
              <span>{fmtDur(item.film.runtimeMin)}</span>
              <span className="rounded bg-white/10 px-1.5 py-px text-xs">{item.film.genres.join(" · ")}</span>
              <span className="rounded bg-white/10 px-1.5 py-px text-xs">Public domain</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Icon name="star" filled className="h-4 w-4" />
                {item.show.rating ? item.show.rating.toFixed(1) : "—"}
              </span>
              <span>{item.show.year || "—"}</span>
              <span className="rounded border border-white/30 px-1.5 py-px text-xs">{item.show.status}</span>
              <span>{item.show.runtime}m eps</span>
              <span className="rounded bg-white/10 px-1.5 py-px text-xs">{item.show.genres.slice(0, 2).join(" · ")}</span>
              <span className="font-bold" style={{ color: "var(--accent)" }}>
                {match}% Match
              </span>
            </>
          )}
        </div>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-slate-300 line-clamp-2">{desc}</p>
        <div className="mt-5 flex items-center gap-4">
          <Cell
            r={2}
            c={0}
            focus={focus}
            hover={hover}
            onClick={onPrimary}
            soft
            className="relative flex items-center gap-2.5 rounded-full px-8 py-3 font-display text-base font-bold text-[#07101c]"
          >
            <span className="absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="relative flex items-center gap-2.5">
              <Icon name={isFilm ? "play" : "info"} filled={isFilm} className="h-5 w-5" />
              {isFilm ? "Play" : "Details"}
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
              className={cx("h-1.5 rounded-full transition-all duration-300", i === slide ? "w-10" : "w-3 bg-white/25")}
              style={i === slide ? { background: "var(--accent)" } : undefined}
            />
            {i === slide && (
              <span className="h-[3px] w-10 overflow-hidden rounded-full bg-white/15">
                <span
                  key={uid + "-bar"}
                  className="hero-progress block h-full rounded-full"
                  style={{ background: "var(--accent)", animationPlayState: paused ? "paused" : "running" }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ skeleton --------------------------- */

export function ShelfSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <section className="rise px-12" style={{ animationDelay: `${delay}ms` }}>
      <div className="shimmer mb-4 h-5 w-48 rounded-md" />
      <div className="flex gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-60 w-44 shrink-0 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
