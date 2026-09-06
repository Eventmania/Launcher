import { useEffect, useState, type ReactNode } from "react";
import { REGIONS, TABS, type TabId } from "../data";
import { Icon, Logo } from "../icons";
import { useStore } from "../lib/store";
import { cx } from "../lib/util";

function ClockTime({ clock24 }: { clock24: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  let h = now.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  if (!clock24) h = h % 12 || 12;
  const time = `${h}:${now.getMinutes().toString().padStart(2, "0")}`;
  const date = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-lg font-bold tracking-wide text-white">
        {time}
        {!clock24 && (
          <span className="ml-1 text-[0.7rem] font-semibold text-slate-400">
            {ap}
          </span>
        )}
      </span>
      <span className="text-sm text-slate-400">{date}</span>
    </div>
  );
}

function TopCell({
  i,
  focus,
  hover,
  onTop,
  children,
}: {
  i: number;
  focus: [number, number];
  hover: (r: number, c: number) => void;
  onTop: (i: number) => void;
  children: ReactNode;
}) {
  const focused = focus[0] === 0 && focus[1] === i;
  return (
    <div
      data-cell={`0:${i}`}
      role="button"
      onMouseEnter={() => hover(0, i)}
      onClick={() => onTop(i)}
      className={cx(
        "cell cell-soft flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-300",
        focused ? "is-focused bg-white/15 text-white" : "bg-white/[0.04]"
      )}
    >
      {children}
    </div>
  );
}

export function Chrome({
  tab,
  focus,
  hover,
  onTab,
  onTop,
}: {
  tab: TabId;
  focus: [number, number];
  hover: (r: number, c: number) => void;
  onTab: (t: TabId) => void;
  onTop: (i: number) => void;
}) {
  const { s } = useStore();
  const region = REGIONS.find((r) => r.id === s.settings.region) ?? REGIONS[0];
  return (
    <div className="sticky top-0 z-40">
      <div className="flex items-center justify-between bg-gradient-to-b from-[#05080f] via-[#05080f]/90 to-[#05080f]/0 px-12 pb-3 pt-5">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7 drop-shadow-[0_0_12px_var(--accent)]" />
            <span className="font-display text-xl font-extrabold tracking-tight text-white">
              Nova<span style={{ color: "var(--accent)" }}>Deck</span>
            </span>
          </div>
          <div className="h-5 w-px bg-white/10" />
          <ClockTime clock24={s.settings.clock24} />
        </div>
        <div className="flex items-center gap-3">
          <TopCell i={0} focus={focus} hover={hover} onTop={onTop}>
            <Icon name="search" className="h-4.5 w-4.5" />
            Search
          </TopCell>
          <TopCell i={1} focus={focus} hover={hover} onTop={onTop}>
            <Icon name="gear" className="h-4.5 w-4.5" />
            Settings
          </TopCell>
          <TopCell i={2} focus={focus} hover={hover} onTop={onTop}>
            <Icon name="globe" className="h-4.5 w-4.5" />
            {region.label}
          </TopCell>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-gradient-to-b from-[#05080f]/80 to-[#05080f]/0 px-12 pb-4">
        {TABS.map((t, i) => {
          const selected = tab === t.id;
          const focused = focus[0] === 1 && focus[1] === i;
          return (
            <div
              key={t.id}
              data-cell={`1:${i}`}
              role="button"
              onMouseEnter={() => hover(1, i)}
              onClick={() => onTab(t.id)}
              className={cx(
                "cell cell-soft rounded-full px-5 py-2 font-display text-[0.95rem] font-semibold tracking-wide",
                selected
                  ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                  : focused
                    ? "text-white"
                    : "text-slate-400",
                focused && "is-focused"
              )}
            >
              {t.label}
            </div>
          );
        })}
        <div className="ml-auto hidden items-center gap-2 text-xs text-slate-500 lg:flex">
          <Icon name="keyboard" className="h-4 w-4" />
          <span>Arrows move · Enter opens · Esc back · Ctrl+Shift+H home</span>
        </div>
      </div>
    </div>
  );
}
