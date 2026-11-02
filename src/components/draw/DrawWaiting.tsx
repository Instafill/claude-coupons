"use client";

import { useEffect, useRef, useState } from "react";

// The page an invite link lands on before the room opens: one big countdown, the times in the
// viewer's own zone, and a warm spark that breathes while they wait. When the clock reaches
// zero the parent swaps this for the real room (onOpen).

// The spark: an original starburst of tapered rays with slightly uneven lengths, so it reads
// as hand-made rather than geometric. Angles in degrees, lengths in viewBox units.
const RAYS: { a: number; len: number; w: number }[] = [
  { a: 0, len: 78, w: 13 },
  { a: 27, len: 60, w: 10 },
  { a: 49, len: 72, w: 12 },
  { a: 76, len: 56, w: 10 },
  { a: 98, len: 76, w: 13 },
  { a: 124, len: 62, w: 11 },
  { a: 147, len: 70, w: 12 },
  { a: 172, len: 58, w: 10 },
  { a: 196, len: 77, w: 13 },
  { a: 222, len: 61, w: 10 },
  { a: 245, len: 73, w: 12 },
  { a: 270, len: 57, w: 10 },
  { a: 293, len: 75, w: 13 },
  { a: 318, len: 63, w: 11 },
  { a: 340, len: 68, w: 12 },
];
const INNER = 14;

function rayPath(len: number, w: number): string {
  const r0 = INNER;
  const r1 = INNER + len;
  const mid = r0 + len * 0.42;
  const base = w * 0.32;
  return `M ${-base} ${-r0} C ${-w * 0.62} ${-mid} ${-w * 0.36} ${-r1 + 6} 0 ${-r1} C ${w * 0.36} ${-r1 + 6} ${w * 0.62} ${-mid} ${base} ${-r0} Z`;
}

// People arriving: small dots that drift in from the edge and settle into the orbit.
const ARRIVALS = [12, 58, 101, 147, 189, 232, 276, 318, 341, 80, 205, 300];
// Dots already circling, on two rings.
const ORBIT_A = [0, 52, 118, 170, 236, 290];
const ORBIT_B = [24, 88, 140, 205, 262, 330, 15, 180];

const CSS = `
.dw-stage { position: relative; }
.dw-glow { position: absolute; inset: -18%; border-radius: 9999px;
  background: radial-gradient(closest-side, rgba(217,119,72,.30), rgba(217,119,72,.10) 55%, rgba(217,119,72,0) 100%);
  animation: dw-breathe var(--dw-breath) ease-in-out infinite; }
.dw-spin { transform-box: view-box; transform-origin: 0 0; animation: dw-rotate var(--dw-turn) linear infinite; }
.dw-spin-rev { transform-box: view-box; transform-origin: 0 0; animation: dw-rotate var(--dw-orbit) linear infinite reverse; }
.dw-spin-slow { transform-box: view-box; transform-origin: 0 0; animation: dw-rotate calc(var(--dw-orbit) * 1.6) linear infinite; }
.dw-ray { transform-box: fill-box; transform-origin: 50% 100%;
  animation: dw-pulse var(--dw-pulse) cubic-bezier(.45,0,.55,1) infinite; animation-delay: var(--dw-d); }
.dw-core { transform-box: fill-box; transform-origin: 50% 50%; animation: dw-core var(--dw-breath) ease-in-out infinite; }
.dw-arrive { animation: dw-arrive 7.5s cubic-bezier(.2,.7,.2,1) infinite; animation-delay: var(--dw-d); opacity: 0; }
.dw-twinkle { animation: dw-twinkle 3.2s ease-in-out infinite; animation-delay: var(--dw-d); }
.dw-digit { display: inline-block; animation: dw-digit .42s cubic-bezier(.2,.8,.2,1); }
.dw-tick { animation: dw-tick 1s ease-out infinite; }
@keyframes dw-rotate { to { transform: rotate(360deg); } }
@keyframes dw-breathe { 0%,100% { transform: scale(.92); opacity: .75; } 50% { transform: scale(1.06); opacity: 1; } }
@keyframes dw-pulse { 0%,100% { transform: scaleY(.84); opacity: .78; } 45% { transform: scaleY(1.06); opacity: 1; } }
@keyframes dw-core { 0%,100% { transform: scale(.94); } 50% { transform: scale(1.08); } }
@keyframes dw-arrive {
  0% { transform: translateY(-96px); opacity: 0; }
  18% { opacity: .95; }
  55% { transform: translateY(-74px); opacity: .9; }
  80% { transform: translateY(-74px); opacity: .55; }
  100% { transform: translateY(-74px); opacity: 0; } }
@keyframes dw-twinkle { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
@keyframes dw-digit { from { transform: translateY(-.28em); opacity: 0; filter: blur(2px); } to { transform: none; opacity: 1; filter: none; } }
@keyframes dw-tick { 0% { opacity: 1; } 60%,100% { opacity: .35; } }
.dw-root { --dw-turn: 90s; --dw-orbit: 40s; --dw-pulse: 4.2s; --dw-breath: 6s; }
.dw-root.dw-hot { --dw-turn: 30s; --dw-orbit: 14s; --dw-pulse: 1.3s; --dw-breath: 1.6s; }
.dw-root.dw-hot .dw-glow { background: radial-gradient(closest-side, rgba(217,119,72,.42), rgba(217,119,72,.14) 55%, rgba(217,119,72,0) 100%); }
@media (prefers-reduced-motion: reduce) {
  .dw-root *, .dw-root *::before, .dw-root *::after { animation: none !important; }
  .dw-root .dw-arrive { opacity: 0; }
}
.dw-still .dw-root *, .dw-still .dw-root *::before, .dw-still .dw-root *::after { animation: none !important; }
.dw-still .dw-root .dw-arrive { opacity: 0; }
`;

function Spark({ size }: { size: string }) {
  const step = 4.2 / RAYS.length;
  return (
    <div className={`dw-stage ${size}`} aria-hidden="true">
      <div className="dw-glow" />
      <svg viewBox="-100 -100 200 200" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="dw-ray" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#b9532a" />
            <stop offset="0.55" stopColor="#d4703f" />
            <stop offset="1" stopColor="#e79a6c" />
          </linearGradient>
          <radialGradient id="dw-core">
            <stop offset="0" stopColor="#f6c9a6" />
            <stop offset="1" stopColor="#c9642f" />
          </radialGradient>
        </defs>

        {/* the two orbits: people already in, circling */}
        <circle r="74" fill="none" stroke="#e9c7b1" strokeWidth="0.6" strokeDasharray="1.2 3.6" />
        <circle r="92" fill="none" stroke="#efd8c9" strokeWidth="0.5" strokeDasharray="0.8 4.2" />
        <g className="dw-spin-slow">
          {ORBIT_A.map((a, i) => (
            <circle
              key={a}
              className="dw-twinkle"
              style={{ ["--dw-d" as string]: `${-i * 0.55}s` }}
              cx={Math.sin((a * Math.PI) / 180) * 74}
              cy={-Math.cos((a * Math.PI) / 180) * 74}
              r={i % 2 ? 2 : 2.6}
              fill="#c9642f"
            />
          ))}
        </g>
        <g className="dw-spin-rev">
          {ORBIT_B.map((a, i) => (
            <circle
              key={a}
              className="dw-twinkle"
              style={{ ["--dw-d" as string]: `${-i * 0.4}s` }}
              cx={Math.sin((a * Math.PI) / 180) * 92}
              cy={-Math.cos((a * Math.PI) / 180) * 92}
              r={i % 3 ? 1.5 : 2}
              fill="#dd9a72"
            />
          ))}
        </g>

        {/* new arrivals drifting in and settling on the inner orbit */}
        {ARRIVALS.map((a, i) => (
          <g key={a} transform={`rotate(${a})`}>
            <circle
              className="dw-arrive"
              style={{ ["--dw-d" as string]: `${i * 0.62}s` }}
              r="2.2"
              fill="#c9642f"
            />
          </g>
        ))}

        {/* the spark */}
        <g className="dw-spin">
          {RAYS.map((ray, i) => (
            <g key={ray.a} transform={`rotate(${ray.a})`}>
              <path
                className="dw-ray"
                style={{ ["--dw-d" as string]: `${-(RAYS.length - i) * step}s` }}
                d={rayPath(ray.len * 0.78, ray.w)}
                fill="url(#dw-ray)"
              />
            </g>
          ))}
          <circle className="dw-core" r="13" fill="url(#dw-core)" />
        </g>
      </svg>
    </div>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** One countdown unit: the number (each digit slides in when it changes) and a small label. */
function Unit({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="inline-flex">
        {value.split("").map((d, i) => (
          // A new key per digit value replays the slide-in only for the digit that changed.
          <span key={`${i}-${d}`} className="dw-digit">
            {d}
          </span>
        ))}
      </span>
      <span className="mt-1 text-[11px] font-semibold tracking-wider text-muted uppercase sm:text-[12px]">{label}</span>
    </span>
  );
}

function Colon() {
  // Two small dots sized to the digits, centred on their cap height, softly ticking.
  return (
    <span className="dw-tick flex h-[1em] flex-col items-center justify-center gap-[0.16em] px-[0.12em] pb-[0.04em]" aria-hidden="true">
      <span className="block h-[0.09em] w-[0.09em] rounded-full bg-accent/70" />
      <span className="block h-[0.09em] w-[0.09em] rounded-full bg-accent/70" />
    </span>
  );
}

export default function DrawWaiting({
  opensAt,
  drawAt,
  spots,
  invited,
  invitedYou,
  calendarUrl,
  onOpen,
}: {
  opensAt: number;
  drawAt: number;
  spots: number;
  invited: number;
  invitedYou: boolean;
  calendarUrl?: string;
  onOpen?: () => void;
}) {
  // Null until mounted: the clock and the viewer's time zone only exist in the browser.
  const [now, setNow] = useState<number | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= opensAt) {
        if (!opened.current) {
          opened.current = true;
          onOpen?.();
        }
        return;
      }
      // Wake just after the next whole second, so the digits change on the second.
      timer = setTimeout(tick, 1000 - ((opensAt - t) % 1000) + 15);
    };
    tick();
    return () => clearTimeout(timer);
  }, [opensAt, onOpen]);

  const left = now === null ? null : Math.max(0, Math.ceil((opensAt - now) / 1000));
  const hot = left !== null && left <= 60;

  const fmt = (ms: number) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(ms);
  const zone =
    now === null
      ? ""
      : (new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
          .formatToParts(opensAt)
          .find((p) => p.type === "timeZoneName")?.value ?? "");
  const openTime = now === null ? " " : fmt(opensAt);
  const drawTime = now === null ? "…" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(drawAt);

  let units: { value: string; label: string }[];
  if (left === null) {
    units = [
      { value: "--", label: "hours" },
      { value: "--", label: "min" },
      { value: "--", label: "sec" },
    ];
  } else {
    const d = Math.floor(left / 86400);
    const h = Math.floor((left % 86400) / 3600);
    const m = Math.floor((left % 3600) / 60);
    const s = left % 60;
    units = [
      ...(left >= 86400 ? [{ value: String(d), label: d === 1 ? "day" : "days" }] : []),
      { value: pad(h), label: "hours" },
      { value: pad(m), label: "min" },
      { value: pad(s), label: "sec" },
    ];
  }

  const steps = [
    { n: 1, text: "Join with your first name" },
    { n: 2, text: `Winners drawn live at ${drawTime}` },
    { n: 3, text: "Claim within a minute" },
  ];

  return (
    <section className={`dw-root ${hot ? "dw-hot" : ""} flex flex-col items-center px-1 pt-2 pb-6 text-center sm:pt-4`}>
      <style>{CSS}</style>

      <Spark size="h-[124px] w-[124px] sm:h-[180px] sm:w-[180px]" />

      <span className="mt-4 text-[12px] font-semibold tracking-wider text-accent-dark uppercase sm:mt-6">
        Live draw &middot; Claude Pro
      </span>
      <h1 className="mt-1 text-[24px] leading-tight font-bold sm:text-[30px]">
        {hot ? "Almost there. The room opens in" : "The room opens in"}
      </h1>

      <div
        className="mt-3 flex items-start font-bold tracking-tight text-ink tabular-nums text-[50px] leading-none sm:text-[80px]"
        role="timer"
        aria-live="off"
        aria-label={left === null ? "Countdown" : `${units.map((u) => `${Number(u.value)} ${u.label}`).join(", ")}`}
      >
        {units.map((u, i) => (
          <span key={u.label} className="flex items-start">
            {i > 0 && (u.label === "hours" && units[0].label !== "hours" ? <span className="w-3 sm:w-5" /> : <Colon />)}
            <span className={hot && u.label === "sec" ? "text-accent" : ""}>
              <Unit value={u.value} label={u.label} />
            </span>
          </span>
        ))}
      </div>

      <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1 text-[14px] text-muted sm:text-[15px]">
        Opens <strong className="font-semibold text-ink">{openTime}</strong>
        <span className="mx-1 text-[#d9d4ca]">&middot;</span>
        Draw at <strong className="font-semibold text-ink">{drawTime}</strong>
        {zone && <span className="ml-1">{zone}</span>}
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener"
            className="ml-2 inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[13px] font-semibold text-accent-dark hover:border-accent"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="2" y="3" width="12" height="11" rx="2" />
              <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
            </svg>
            Add to calendar
          </a>
        )}
      </p>

      <p className="mt-1.5 max-w-[22rem] sm:max-w-[44rem] text-[14px] text-muted sm:text-[15px]">
        <strong className="font-semibold text-ink">{spots} free weeks of Claude Pro</strong> &middot;{" "}
        {invited.toLocaleString("en-US")} people invited &middot; everyone in the room has the same chance
      </p>

      <p
        className={`mt-4 inline-flex items-center gap-2 rounded-2xl border px-4 py-1.5 text-left text-[14px] sm:rounded-full ${
          invitedYou ? "border-[#b9dcc9] bg-[#eaf6ef] text-good" : "border-line bg-surface text-ink"
        }`}
      >
        {invitedYou ? (
          <>
            <span className="inline-block h-2 w-2 shrink-0 self-start mt-[0.45em] rounded-full bg-good sm:self-center sm:mt-0" />
            <span>
              <strong className="font-semibold">You&rsquo;re invited.</strong> Keep this page open or come back when it opens.
            </span>
          </>
        ) : (
          <>You can watch live when the room opens.</>
        )}
      </p>

      <ol className="mt-5 grid w-full max-w-[44rem] grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2 text-left text-[14px] sm:py-3"
          >
            <span className="flex h-6 w-6 shrink-0 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#f4e4da] text-[13px] font-bold text-accent-dark">
              {s.n}
            </span>
            <span className="leading-snug">{s.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
