import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </>
  ),
  gear: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6L9 17l-5-5" />,
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  star: (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z" />
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  pencil: <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  chevL: <path d="M15 18l-6-6 6-6" />,
  chevR: <path d="M9 18l6-6-6-6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  film: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2.5" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  gamepad: (
    <>
      <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59L2.68 8.74C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.42.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.54-.6-6.58-.68-7.26l-.02-.15A4 4 0 0 0 17.32 5z" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  note: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8" />
    </>
  ),
  calc: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  folder: (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  ),
  terminal: <path d="M4 17l6-6-6-6M12 19h8" />,
  tv: (
    <>
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <path d="M17 2l-5 5-5-5" />
    </>
  ),
  spark: <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" />,
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  restart: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </>
  ),
};

export function Icon({
  name,
  className = "w-5 h-5",
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {P[name] ?? P.spark}
    </svg>
  );
}

/** Brand mark: a four-point navigation star. */
export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M16 3l3.4 9.6L29 16l-9.6 3.4L16 29l-3.4-9.6L3 16l9.6-3.4z"
        fill="var(--accent)"
      />
      <circle cx="16" cy="16" r="2.6" fill="#0a0f1a" />
    </svg>
  );
}
