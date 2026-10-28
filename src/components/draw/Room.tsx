"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { GRACE_SECONDS } from "@/lib/drawRules";

import { Avatar } from "./Avatar";
import JoinPanel, { EditMe, GhostTile, type Draft } from "./JoinPanel";
import { TOAST_MS, type Mine, type Pass, type Person, type View } from "./roomView";
import { clock } from "./time";
import WorldMap, { type Pin } from "./WorldMap";

const TONE = {
  plain: "border-line bg-paper text-ink",
  accent: "border-[#efc9b3] bg-[#f4e4da] text-accent-dark",
  good: "border-[#b9dcc9] bg-[#eaf6ef] text-good",
  bad: "border-[#efc2b8] bg-[#fbebe7] text-bad",
};

const EMOJI = ["👋", "🔥", "🤞", "🍀", "😬", "🎉"];

/** Seconds left on a claim, and the window it is counting down (the grace once they've left). */
function claimLeft(pass: Pass, t: number, claim: number): { left: number; of: number } {
  const of = pass.graceFrom !== undefined ? Math.min(GRACE_SECONDS, pass.claimEnd - pass.graceFrom) : claim;
  return { left: Math.max(0, pass.claimEnd - t), of };
}

function Ring({ left, of, size, urgent }: { left: number; of: number; size: number; urgent: boolean }) {
  const r = size / 2 - 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#d6ebdf" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={urgent ? "var(--color-bad)" : "var(--color-good)"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - left / of)}
        className="transition-[stroke-dashoffset] duration-200 ease-linear"
      />
    </svg>
  );
}

export default function Room({
  view,
  speed,
  draft,
  onDraft,
  onJoin,
  onEditMe,
  missingName,
  onClaim,
  onPassOn,
  onReact,
  onOutcome,
}: {
  view: View;
  speed: number;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onJoin: () => void;
  onEditMe: (draft: Draft) => void;
  missingName: boolean;
  onClaim: () => void;
  onPassOn: () => void;
  onReact: (emoji: string) => void;
  onOutcome: (passId: string, result: "claimed" | "dead") => void;
}) {
  const t = view.t;
  const joined = !!view.me;
  const canJoin = !joined && !view.closed;

  // The sticky "you're not in yet" bar shows only once the join panel has scrolled away, so
  // the invitation is always on screen without ever showing twice.
  const panelRef = useRef<HTMLElement>(null);
  const [panelInView, setPanelInView] = useState(true);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => setPanelInView(entry.isIntersecting));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [canJoin]);

  const total = view.passes.length;
  const links = view.links;
  const holderOf = new Map<string, Pass>();
  const missed = new Set<string>();
  for (const pass of view.passes) {
    if (pass.holder) holderOf.set(pass.holder, pass);
    for (const h of pass.history) missed.add(h.id);
  }
  const byId = new Map(view.people.map((p) => [p.id, p]));
  const meId = view.me?.id;
  const myPass = meId ? holderOf.get(meId) : undefined;
  const myLoss = meId
    ? view.passes.flatMap((p) => p.history.map((h) => ({ ...h, n: p.n }))).find((h) => h.id === meId)
    : undefined;
  const stillOpen = view.passes.some((p) => p.status !== "claimed" && p.status !== "unclaimed");
  const compact = view.people.length > 60;
  const countries = new Set(view.people.filter((p) => !p.left).map((p) => p.country)).size;

  let headline: string;
  if (!view.drawStarted) headline = `Draw in ${clock(view.drawAt - t)}`;
  else if (view.sweepPass)
    headline = view.sweepRedraw ? `Re-drawing spot ${view.sweepPass}…` : `Drawing spot ${view.sweepPass} of ${total}…`;
  else if (view.nextJob)
    headline = view.nextJob.redraw ? `Re-drawing spot ${view.nextJob.pass}…` : `Drawing spot ${view.nextJob.pass} of ${total}…`;
  else if (view.closed) headline = "Room closed";
  else headline = "Winners are claiming";

  const pins: Pin[] = view.people.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    photo: p.photo,
    seed: p.seed,
    state:
      view.highlight === p.id
        ? "highlight"
        : holderOf.has(p.id)
          ? "winner"
          : p.left
            ? "left"
            : p.me
              ? "me"
              : "normal",
  }));
  // Draw the visitor's pin last so it sits on top of anyone from the same city.
  pins.sort((a, b) => Number(a.id === meId) - Number(b.id === meId));

  // Newest first, so every arrival lands at the head of the grid where it is seen. The
  // visitor's own tile is the one exception: it stays pinned in front of everyone, in the
  // place the dashed "your spot" held before they joined.
  const seated = view.people
    .map((person, index) => ({ person, index }))
    .sort((a, b) => Number(!!b.person.me) - Number(!!a.person.me) || b.index - a.index)
    .map(({ person }) => person);

  // FLIP: when someone arrives, every tile after them moves along one place. Note where each
  // tile sat, let the new layout land, then start each from its old spot and let it slide.
  // Positions are offsets inside the grid, never screen coordinates: those also change when
  // something above the grid grows or the page scrolls, and then every tile would "move".
  // `translate`, not `transform`, so it never fights the arrival or the sweep's scale.
  const gridRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const spots = useRef(new Map<string, { x: number; y: number }>());
  const orderKey = `${canJoin ? "ghost," : ""}${seated.map((p) => p.id).join(",")}`;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, { x: number; y: number }>();
    grid.querySelectorAll<HTMLElement>("[data-tile]").forEach((el) => {
      const spot = { x: el.offsetLeft, y: el.offsetTop };
      const before = spots.current.get(el.dataset.tile!);
      next.set(el.dataset.tile!, spot);
      if (!before || still) return;
      const dx = before.x - spot.x;
      const dy = before.y - spot.y;
      if (!dx && !dy) return;
      el.style.transition = "none";
      el.style.translate = `${dx}px ${dy}px`;
      requestAnimationFrame(() => {
        el.style.transition = "translate 480ms cubic-bezier(0.2, 0.8, 0.2, 1)";
        el.style.translate = "";
        // Hand transitions back to the tile's own classes (the sweep, the winner glow).
        setTimeout(() => (el.style.transition = ""), 520);
      });
    });
    spots.current = next;
  }, [orderKey]);

  // The grid's height eases to its new size instead of snapping, so a new row opens up
  // rather than shoving the reactions and everything below it down in one frame.
  useEffect(() => {
    const grid = gridRef.current;
    const shell = shellRef.current;
    if (!grid || !shell) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      shell.style.height = `${grid.offsetHeight}px`;
      if (first) {
        first = false;
        // Size the first frame without animating, then animate every change after it.
        requestAnimationFrame(() => (shell.style.transition = "height 480ms cubic-bezier(0.2, 0.8, 0.2, 1)"));
      }
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  const [editing, setEditing] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; emoji: string }[]>([]);
  const burstSeq = useRef(0);

  return (
    <div className="space-y-5">
      {canJoin && <JoinPanel ref={panelRef} view={view} draft={draft} onChange={onDraft} onJoin={onJoin} missingName={missingName} />}
      {!joined && view.closed && (
        <section className="rounded-2xl border border-line bg-surface px-6 py-5">
          <h2 className="text-[22px] font-semibold">You missed this draw</h2>
          <p className="mt-1 text-[15px] text-muted">
            You never took your spot, so you weren&rsquo;t in it. You keep your place in line, and we&rsquo;ll invite
            you to the next one.
          </p>
        </section>
      )}

      {/* Status */}
      <section className="rounded-2xl border border-line bg-surface px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">
              {view.test && "Test · "}Live draw · {links === 1 ? "1 Claude Pro link" : `${links} Claude Pro links`}, {total}{" "}
              {total === 1 ? "spot" : "spots"}
            </p>
            <h1 className="mt-1 text-[38px] leading-tight font-bold tabular-nums">{headline}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
            <span className="rounded-full bg-[#f0ede6] px-3 py-1">👥 {view.presentCount} in the room</span>
            <span className="rounded-full bg-[#f4e4da] px-3 py-1 text-accent-dark">
              🎟 {total} {total === 1 ? "spot" : "spots"}
            </span>
            {view.mainDone && !view.closed && view.meEligible && stillOpen && (
              <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-good">
                If a spot comes back: 1 in {view.eligible}
              </span>
            )}
          </div>
        </div>

        {view.banner && (
          <p
            key={view.banner.text}
            className={`draw-pop mt-4 rounded-xl border px-4 py-2.5 text-[15px] font-semibold ${TONE[view.banner.tone]}`}
          >
            {view.banner.text}
          </p>
        )}

        {!view.closed && (
          <p className="mt-3 text-[14px] text-muted">
            {view.me && view.me.joinAt > view.drawAt && !view.meEverWon
              ? "You arrived after the draw started, so you're in for any spot that comes back. "
              : ""}
            Stay until the room closes. Any spot a winner doesn&rsquo;t claim within {view.claim} seconds is re-drawn
            live, within seconds, among the people still here.
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {view.passes.map((pass) => (
            <PassChip key={pass.n} pass={pass} view={view} holder={pass.holder ? byId.get(pass.holder) : undefined} />
          ))}
        </div>
      </section>

      {/* The visitor's own outcome */}
      {myPass && (
        <MyWin pass={myPass} view={view} mine={view.mine} onClaim={onClaim} onPassOn={onPassOn} onOutcome={onOutcome} />
      )}
      {!myPass && myLoss && (
        <section className="rounded-2xl border border-line bg-surface px-6 py-5">
          <h2 className="text-[22px] font-semibold">Spot {myLoss.n} went back to the room</h2>
          <p className="mt-1 text-[15px] text-muted">
            {myLoss.reason === "passed_on"
              ? "You passed it on"
              : myLoss.reason === "left"
                ? "You left the room"
                : "Your claim time ran out"}
            , so it was re-drawn
            among the people still here. Your place in line for the next draw is safe.
          </p>
        </section>
      )}
      {view.closed && joined && !view.meEverWon && (
        <section className="rounded-2xl border border-line bg-surface px-6 py-5">
          <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">This draw is over</p>
          <h2 className="mt-1 text-[25px] font-semibold">Not this time</h2>
          <p className="mt-1 text-[15px] text-muted">
            The spots went to{" "}
            {view.passes
              .filter((p) => p.status === "claimed" && p.holder)
              .map((p) => byId.get(p.holder!)?.name)
              .join(", ") || "nobody"}
            . You keep your place in line for the next draw.
          </p>
        </section>
      )}

      {/* The room */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-line bg-surface px-5 py-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold">In the room</h2>
            <span className="text-[13px] text-muted tabular-nums">{view.presentCount} watching</span>
          </div>
          {/* The shell clips while it eases to the grid's height; the grid's padding keeps the
              badges above each tile and the sweep's enlarged tile inside the clip. */}
          <div ref={shellRef} className="-mx-1 overflow-hidden">
            <div
              ref={gridRef}
              className={`grid gap-2 px-1 pt-2.5 pb-1 ${
                compact ? "grid-cols-[repeat(auto-fill,minmax(58px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(82px,1fr))]"
              }`}
            >
              {canJoin && <GhostTile draft={draft} onClick={onJoin} compact={compact} />}
              {seated.map((person) => (
                <Tile
                  key={person.id}
                  person={person}
                  view={view}
                  pass={holderOf.get(person.id)}
                  missed={missed.has(person.id)}
                  fresh={!person.me && person.joinAt > 0 && t - person.joinAt < 4 * speed}
                  compact={compact}
                  onEdit={person.me ? () => setEditing(true) : undefined}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="mr-1 text-[13px] text-muted">React</span>
            {EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  // Feedback where the finger is, joined or not: the tile it also rises from may
                  // be scrolled away, and before joining there is no tile at all.
                  const id = ++burstSeq.current;
                  setBursts((all) => [...all, { id, emoji }]);
                  setTimeout(() => setBursts((all) => all.filter((b) => b.id !== id)), 2000);
                }}
                className="relative h-10 w-10 rounded-full border border-line bg-surface text-[19px] transition hover:-translate-y-0.5 hover:bg-paper active:scale-90"
                aria-label={`React ${emoji}`}
              >
                {emoji}
                {bursts
                  .filter((b) => b.emoji === emoji)
                  .map((b) => (
                    <span
                      key={b.id}
                      aria-hidden="true"
                      className="draw-float pointer-events-none absolute top-0 left-1/2 text-[22px]"
                    >
                      {emoji}
                    </span>
                  ))}
              </button>
            ))}
            {!joined && <span className="text-[13px] text-muted">Join to show yours on your tile</span>}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-surface px-5 py-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[18px] font-semibold">Where the room is</h2>
              <span className="text-[13px] text-muted">
                {countries} {countries === 1 ? "country" : "countries"}
              </span>
            </div>
            <WorldMap pins={pins} />
          </section>
          <section className="rounded-2xl border border-line bg-surface px-5 py-5">
            <h2 className="mb-2 text-[18px] font-semibold">Activity</h2>
            <ul className="space-y-1.5 text-[14px]">
              {view.lines.map((line) => (
                <li
                  key={line.id}
                  className={`draw-pop rounded-md px-2 py-1 ${
                    line.tone === "good" ? "text-good" : line.tone === "bad" ? "text-bad" : "text-muted"
                  }`}
                >
                  {line.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {editing && view.me && (
        <EditMe
          draft={draft}
          onCancel={() => setEditing(false)}
          onSave={(next) => {
            onEditMe(next);
            setEditing(false);
          }}
        />
      )}

      {/* Join pop-ups, bottom right: above the sticky bar when it is up, and clear of the
          bottom-left corner where Next's dev badge sits in development. */}
      <div
        className={`pointer-events-none fixed right-4 z-50 flex w-[290px] max-w-[calc(100vw-2rem)] flex-col gap-2 ${
          canJoin && !panelInView ? "bottom-20" : "bottom-4"
        }`}
        aria-live="polite"
      >
        {view.toasts.map((toast, index) => {
          const person = byId.get(toast.personId);
          if (!person) return null;
          // A phone has room for one: only the newest shows there; wider screens stack three.
          const older = index < view.toasts.length - 1;
          return (
            <div
              key={toast.id}
              className={`draw-toast ${older ? "hidden sm:flex" : "flex"} items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-lg`}
              style={{ animationDuration: `${TOAST_MS}ms` }}
            >
              <Avatar photo={person.photo} seed={person.seed} name={person.name} size={36} />
              <div className="min-w-0 text-[14px] leading-tight">
                <p className="truncate">
                  <strong>{person.name}</strong> joined the room
                </p>
                <p className="truncate text-[12px] text-muted">
                  {person.flag} {person.city} · just now
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {canJoin && !panelInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 px-4 py-3 text-white backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-[14px] font-semibold">
              <span className="draw-dot inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff6b4a]" />
              <span className="truncate">
                You&rsquo;re not in the draw yet
                <span className="font-normal text-white/70">
                  {view.drawStarted ? " · spots still coming back" : ` · draw in ${clock(view.drawAt - t)}`}
                </span>
              </span>
            </p>
            <button
              type="button"
              onClick={onJoin}
              className="draw-beckon relative shrink-0 overflow-hidden rounded-lg bg-accent px-5 py-2 text-[15px] font-bold text-white hover:bg-accent-dark"
            >
              Join now →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PassChip({ pass, view, holder }: { pass: Pass; view: View; holder?: Person }) {
  let text: string;
  let tone = "text-muted";
  if (pass.status === "claimed") {
    text = `${holder?.me ? "You" : holder?.name} · claimed ✓`;
    tone = "text-good";
  } else if (pass.status === "claiming") {
    const { left } = claimLeft(pass, view.t, view.claim);
    text =
      pass.graceFrom !== undefined
        ? `${holder?.name} left · back in ${clock(left)}`
        : `${holder?.me ? "You have" : `${holder?.name} has`} ${clock(left)} to claim`;
    tone = left <= 10 || pass.graceFrom !== undefined ? "text-bad" : "text-ink";
  } else if (pass.status === "drawing") {
    text = "Drawing…";
    tone = "text-accent-dark";
  } else if (pass.status === "unclaimed") {
    text = "Nobody left to draw";
  } else {
    text = !view.drawStarted ? "Drawn when the countdown ends" : pass.history.length ? "Coming back…" : "Up next";
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3 py-2">
      {holder ? (
        <Avatar photo={holder.photo} seed={holder.seed} name={holder.name} size={30} />
      ) : (
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-line text-[13px] text-muted">
          ?
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Spot {pass.n}
          {pass.history.length > 0 && ` · re-drawn ×${pass.history.length}`}
        </p>
        <p className={`truncate text-[14px] font-semibold tabular-nums ${tone}`}>{text}</p>
      </div>
    </div>
  );
}

function Tile({
  person,
  view,
  pass,
  missed,
  fresh,
  compact,
  onEdit,
}: {
  person: Person;
  view: View;
  pass?: Pass;
  missed: boolean;
  fresh: boolean;
  compact: boolean;
  /** Only on the visitor's own tile: opens the name-and-picture editor. */
  onEdit?: () => void;
}) {
  const highlighted = view.highlight === person.id;
  const avatar = compact ? 34 : 44;
  const ringBox = avatar + 10;

  let look = "border-line bg-surface";
  if (highlighted) look = "z-10 scale-[1.07] border-accent bg-[#f7e5da] shadow-md";
  else if (pass?.status === "claiming") look = "draw-glow border-good bg-[#eaf6ef]";
  else if (pass?.status === "claimed") look = "border-good bg-[#eaf6ef]";
  else if (person.me) look = "border-accent bg-surface";

  const badge = pass
    ? { text: `${person.me ? "You · " : ""}Spot ${pass.n}${pass.status === "claimed" ? " ✓" : ""}`, cls: "bg-good text-white" }
    : person.me
      ? { text: "You", cls: "bg-accent text-white" }
      : person.left
        ? { text: "left", cls: "bg-line text-muted" }
        : missed
          ? { text: "missed", cls: "bg-line text-muted" }
          : fresh
            ? { text: "Just in", cls: "bg-accent text-white" }
            : null;

  const claim = pass?.status === "claiming" ? claimLeft(pass, view.t, view.claim) : null;
  const reactions = view.reactions.filter((r) => r.personId === person.id);

  return (
    <div
      data-tile={person.id}
      {...(onEdit && {
        role: "button",
        tabIndex: 0,
        title: "Change your name or picture",
        onClick: onEdit,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onEdit();
          }
        },
      })}
      className={`group relative flex flex-col items-center rounded-xl border px-1 pt-3 pb-2 text-center transition-[background-color,border-color,scale,box-shadow] duration-150 ${look} ${
        person.left && !pass ? "opacity-40 grayscale" : ""
      } ${fresh ? "draw-arrive" : ""} ${onEdit ? "cursor-pointer hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent" : ""}`}
    >
      {onEdit && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f4e4da] text-[11px] text-accent-dark transition group-hover:bg-accent group-hover:text-white"
        >
          ✎
        </span>
      )}
      {badge && (
        <span
          className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[10px] leading-4 font-bold whitespace-nowrap uppercase ${badge.cls}`}
        >
          {badge.text}
        </span>
      )}
      <div className="relative flex items-center justify-center" style={{ width: ringBox, height: ringBox }}>
        {claim && <Ring left={claim.left} of={claim.of} size={ringBox} urgent={claim.left <= 10 || pass?.graceFrom !== undefined} />}
        <Avatar
          photo={person.photo}
          seed={person.seed}
          name={person.name}
          size={avatar}
          className={person.me && !pass ? "ring-2 ring-accent ring-offset-2" : ""}
        />
      </div>
      <p className={`mt-1 w-full truncate leading-tight font-semibold ${compact ? "text-[11px]" : "text-[13px]"}`}>
        {person.me ? `${person.name} (you)` : person.name}
      </p>
      {!compact && (
        <p className="w-full truncate text-[11px] text-muted">
          {person.flag} {person.city}
        </p>
      )}
      {claim && (
        <p className={`text-[11px] font-semibold tabular-nums ${claim.left <= 10 ? "text-bad" : "text-good"}`}>
          {clock(claim.left)}
        </p>
      )}
      {reactions.map((r) => (
        <span
          key={r.id}
          className="draw-float pointer-events-none absolute top-7 z-20 text-[24px]"
          style={{ left: `calc(50% + ${r.dx}px)` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

function MyWin({
  pass,
  view,
  mine,
  onClaim,
  onPassOn,
  onOutcome,
}: {
  pass: Pass;
  view: View;
  mine?: Mine;
  onClaim: () => void;
  onPassOn: () => void;
  onOutcome: (passId: string, result: "claimed" | "dead") => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pressed, setPressed] = useState(false);

  if (pass.status === "claiming") {
    const { left, of } = claimLeft(pass, view.t, view.claim);
    return (
      <section className="draw-pop rounded-2xl border-2 border-good bg-[#eaf6ef] px-6 py-5">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative flex h-[84px] w-[84px] items-center justify-center">
            <Ring left={left} of={of} size={84} urgent={left <= 10} />
            <span className={`text-[22px] font-bold tabular-nums ${left <= 10 ? "text-bad" : "text-good"}`}>
              {clock(left)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold tracking-wider text-good uppercase">You won</p>
            <h2 className="text-[28px] leading-tight font-bold">Spot {pass.n} is yours to claim</h2>
            <p className="mt-1 text-[15px] text-muted">
              Press <strong className="text-ink">Get my pass</strong> within {clock(left)}. If you don&rsquo;t, it goes
              straight back to the room and is re-drawn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pressed}
              onClick={() => {
                // One press: the answer takes a moment, and a second press would only be refused.
                setPressed(true);
                onClaim();
                setTimeout(() => setPressed(false), 5000);
              }}
              className="rounded-lg bg-good px-5 py-2.5 text-[16px] font-semibold text-white hover:brightness-90 disabled:opacity-60"
            >
              {pressed ? "Getting it…" : "Get my pass"}
            </button>
            <button
              type="button"
              disabled={pressed}
              onClick={onPassOn}
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-[15px] font-semibold text-muted hover:text-ink disabled:opacity-60"
            >
              Pass it on
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!mine) {
    return (
      <section className="draw-pop rounded-2xl border-2 border-good bg-surface px-6 py-5">
        <p className="text-[12px] font-semibold tracking-wider text-good uppercase">Spot {pass.n} · claimed</p>
        <h2 className="mt-1 text-[25px] font-semibold">Getting your Claude guest pass…</h2>
      </section>
    );
  }

  const display = mine.url.replace(/^https?:\/\//, "");
  return (
    <section className="draw-pop rounded-2xl border-2 border-good bg-surface px-6 py-5">
      <p className="text-[12px] font-semibold tracking-wider text-good uppercase">Spot {pass.n} · claimed</p>
      <h2 className="mt-1 text-[25px] font-semibold">Here&rsquo;s your Claude guest pass</h2>
      <p className="mt-3 rounded-xl border border-line bg-paper px-4 py-3 font-mono text-[15px] break-all">{display}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={mine.url}
          target="_blank"
          rel="noopener"
          className="rounded-lg bg-good px-4 py-2 text-[15px] font-semibold text-white hover:brightness-90"
        >
          Open your pass ↗
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(mine.url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[14px]"
        >
          {copied ? "Copied" : "Copy ⧉"}
        </button>
        <span className="text-[13px] text-muted">
          Open it and create your Claude account there. Your free week starts on claude.ai.
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[14px]">
        {mine.outcome !== "none" ? (
          <span className="font-semibold text-good">
            {mine.outcome === "claimed"
              ? "Enjoy your week of Claude."
              : "Sorry about that. You're back in the line, so you'll be invited to a later draw."}
          </span>
        ) : (
          <>
            <span className="outcome-pulse font-semibold">Did it work?</span>
            <button
              type="button"
              onClick={() => onOutcome(mine.passId, "claimed")}
              className="rounded-md border border-line px-2.5 py-1"
            >
              ✓ Claimed it
            </button>
            <button
              type="button"
              onClick={() => onOutcome(mine.passId, "dead")}
              className="rounded-md border border-line px-2.5 py-1"
            >
              ✗ Didn&rsquo;t work
            </button>
          </>
        )}
      </div>
    </section>
  );
}
