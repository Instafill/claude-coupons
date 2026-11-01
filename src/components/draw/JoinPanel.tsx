"use client";

import { useEffect, useRef, useState, type Ref } from "react";

import type { Place } from "@/lib/places";

import { Avatar } from "./Avatar";
import type { Person, View } from "./roomView";
import { clock } from "./time";

// What someone types before they're in. Held above the room, so the "your spot" tile in the
// grid can show it live: the tile they will become, before they press anything.
export interface Draft {
  name: string;
  seed: string;
  /** Their Google picture, if they signed in with Google. Nothing is ever uploaded. */
  photo?: string;
  usePhoto: boolean;
  place: Place;
}

export const NAME_INPUT_ID = "draw-join-name";

/** Brings the name field into view and puts the cursor in it. */
export function focusJoin(): void {
  const input = document.getElementById(NAME_INPUT_ID);
  input?.scrollIntoView({ behavior: "smooth", block: "center" });
  input?.focus({ preventScroll: true });
}

// The panel a visitor sees until they join: everyone else is already in the room and the
// clock is running, so it says so plainly and puts the whole form next to the button. No
// separate step - what the button does is visible before it is pressed.
export default function JoinPanel({
  view,
  draft,
  onChange,
  onJoin,
  missingName,
  ref,
}: {
  view: View;
  draft: Draft;
  onChange: (draft: Draft) => void;
  onJoin: () => void;
  missingName: boolean;
  ref?: Ref<HTMLElement>;
}) {
  const others = view.presentCount;
  // Everyone in the room, newest first, so the panel itself shows it filling up; the full grid
  // is further down the page and off the first screen.
  const arrivals = view.people.filter((p) => !p.me && !p.left).reverse();
  const latestJoin = view.lines.find((line) => line.text.endsWith(" joined"));

  return (
    <section
      ref={ref}
      className="draw-attention rounded-2xl border-2 border-accent bg-surface px-5 py-5 shadow-sm sm:px-6"
    >
      <span className="flex items-center gap-2 text-[13px] font-bold tracking-wider text-bad uppercase">
        <span className="draw-dot inline-block h-2.5 w-2.5 rounded-full bg-bad" />
        You&rsquo;re not in the draw yet
      </span>
      <h2 className="mt-1 text-[27px] leading-tight font-bold">
        {view.drawStarted ? (
          <>The draw has started. Join now to win a spot that comes back.</>
        ) : (
          <>
            Join now. The draw starts in <span className="text-accent tabular-nums">{clock(view.drawAt - view.t)}</span>
          </>
        )}
      </h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-muted">
        <span>
          {others} {others === 1 ? "person is" : "people are"} in and watching
          {view.everyone && " · everyone in the room has the same chance"}
        </span>
        {latestJoin && (
          <span
            key={latestJoin.id}
            className="draw-pop rounded-full bg-[#f4e4da] px-2.5 py-0.5 font-semibold text-accent-dark"
          >
            {latestJoin.text} just now
          </span>
        )}
      </p>
      <AvatarStack people={arrivals} />

      <form
        className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onJoin();
        }}
      >
        <div>
          <span className="text-[13px] font-semibold">Picture</span>
          <div className="mt-1 flex items-center gap-2.5">
            <Avatar
              photo={draft.usePhoto ? draft.photo : undefined}
              seed={draft.seed}
              name={draft.name || "You"}
              size={44}
              className="ring-2 ring-accent ring-offset-2"
            />
            {/* One generated face per visitor, no shuffling: it is theirs the way a
                Stack Overflow identicon was. Their Google picture is the only alternative:
                nothing is uploaded, so nothing a room of strangers sees needs moderating. */}
            <PhotoToggle draft={draft} onChange={onChange} />
          </div>
        </div>

        <label className="block min-w-[170px] flex-1">
          <span className="text-[13px] font-semibold">First name</span>
          <input
            id={NAME_INPUT_ID}
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value.slice(0, 20) })}
            placeholder="Your first name"
            className={`mt-1 block w-full rounded-lg border bg-paper px-3 py-2.5 text-[16px] outline-none focus:border-accent ${
              missingName ? "border-bad" : "border-line"
            }`}
          />
        </label>

        {/* Placed from the connection, as the real site places every subscriber (lib/geo.ts):
            shown so people know what the room will see, never asked. */}
        <div className="min-w-[150px]">
          <span className="text-[13px] font-semibold">Location</span>
          <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-transparent px-1 py-2.5 text-[16px]">
            <span aria-hidden="true">📍</span>
            {draft.place.city}
            <span className="text-[13px] text-muted">{draft.place.country}</span>
          </p>
        </div>

        <button
          type="submit"
          className="draw-beckon relative w-full overflow-hidden rounded-xl bg-accent px-8 py-3.5 text-[19px] font-bold text-white hover:bg-accent-dark sm:w-auto"
        >
          Join the draw →
        </button>
      </form>

      {missingName ? (
        <p className="mt-3 text-[14px] font-semibold text-bad">Add your first name, then press Join.</p>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          Press Join and you&rsquo;re in: your tile takes the dashed spot in the room below, with your first name,
          picture and city. Never your email.
        </p>
      )}
    </section>
  );
}

/**
 * The visitor's own tile, opened: change the first name or the picture after joining. The
 * place in the room, the draw and the location don't move. Edits a copy, so Cancel (or Esc,
 * or a click outside) leaves the tile exactly as it was.
 */
export function EditMe({
  draft,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [edit, setEdit] = useState(draft);
  const name = edit.name.trim();

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <form
        role="dialog"
        aria-label="How the room sees you"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (name) onSave({ ...edit, name });
        }}
        className="draw-pop w-full max-w-sm rounded-2xl border border-line bg-surface px-6 py-6 shadow-xl"
      >
        <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">Your tile</p>
        <h2 className="mt-1 text-[22px] font-semibold">How the room sees you</h2>

        <div className="mt-5 flex items-center gap-4">
          <Avatar
            photo={edit.usePhoto ? edit.photo : undefined}
            seed={edit.seed}
            name={name || "You"}
            size={64}
            className="ring-2 ring-accent ring-offset-2"
          />
          <PhotoToggle draft={edit} onChange={setEdit} />
        </div>

        <label className="mt-5 block">
          <span className="text-[13px] font-semibold">First name</span>
          <input
            autoFocus
            value={edit.name}
            onChange={(event) => setEdit({ ...edit, name: event.target.value.slice(0, 20) })}
            className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[16px] outline-none focus:border-accent"
          />
        </label>
        <p className="mt-2 text-[13px] text-muted">
          📍 {edit.place.city} {edit.place.country} · your place in the room stays the same
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-[15px] font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name}
            className="rounded-lg bg-accent px-5 py-2 text-[15px] font-semibold text-white hover:bg-accent-dark disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/** Switches between their Google picture and the generated face. Nothing without a picture. */
function PhotoToggle({ draft, onChange }: { draft: Draft; onChange: (draft: Draft) => void }) {
  if (!draft.photo) return null;
  return (
    <button
      type="button"
      onClick={() => onChange({ ...draft, usePhoto: !draft.usePhoto })}
      className="text-left text-[13px] leading-5 text-accent-dark underline"
    >
      {draft.usePhoto ? "Use the generated one" : "Use my Google photo"}
    </button>
  );
}

const STACK_AVATAR = 34;
// Below this much of each face showing, a face is a sliver and nobody reads it as a person.
const STACK_MIN_STEP = 14;

/**
 * Every face in the room, overlapping, newest on top at the left. Nothing is cut off or
 * summed up as "+N": as the room fills, the faces close up to fit the row, and once they
 * would overlap past recognition the pile grows a row instead. Each arrival pushes the rest
 * along.
 */
function AvatarStack({ people }: { people: Person[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const loose = STACK_AVATAR * 0.72;
  const room = Math.max(0, width - STACK_AVATAR);
  // As many faces per row as fit at the tightest readable overlap, then spread them out.
  const perRow = width ? Math.max(1, Math.floor(room / STACK_MIN_STEP) + 1) : Math.max(1, people.length);
  const inRow = Math.min(perRow, people.length);
  const step = inRow > 1 && width ? Math.min(loose, room / (inRow - 1)) : loose;
  const rowHeight = STACK_AVATAR * 0.78;
  const rows = Math.max(1, Math.ceil(people.length / perRow));

  return (
    <div
      ref={rowRef}
      className="relative mt-3 w-full transition-[height] duration-500"
      style={{ height: (rows - 1) * rowHeight + STACK_AVATAR + 4 }}
      aria-label={`${people.length} people in the room`}
    >
      {people.map((person, index) => (
        <span
          key={person.id}
          className="draw-pop absolute rounded-full ring-2 ring-surface transition-[left,top] duration-500 ease-out"
          style={{
            left: (index % perRow) * step,
            top: 2 + Math.floor(index / perRow) * rowHeight,
            zIndex: people.length - index,
          }}
        >
          <Avatar photo={person.photo} seed={person.seed} name={person.name} size={STACK_AVATAR} />
        </span>
      ))}
    </div>
  );
}

/** The dashed tile at the head of the grid: the visitor's place, waiting for them. */
export function GhostTile({ draft, onClick, compact }: { draft: Draft; onClick: () => void; compact: boolean }) {
  return (
    <button
      type="button"
      data-tile="ghost"
      onClick={onClick}
      className="draw-ghost relative flex flex-col items-center rounded-xl border-2 border-dashed border-accent bg-[#fdf5f0] px-1 pt-3 pb-2 text-center"
    >
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-bad px-1.5 text-[10px] leading-4 font-bold whitespace-nowrap text-white uppercase">
        Not in yet
      </span>
      <span
        className="flex items-center justify-center opacity-60"
        style={{ width: compact ? 36 : 46, height: compact ? 36 : 46 }}
      >
        <Avatar
          photo={draft.usePhoto ? draft.photo : undefined}
          seed={draft.seed}
          name={draft.name || "Your spot"}
          size={compact ? 26 : 36}
        />
      </span>
      <span className={`mt-1 w-full truncate leading-tight font-semibold ${compact ? "text-[11px]" : "text-[13px]"}`}>
        {draft.name.trim() || "Your spot"}
      </span>
      <span className="text-[11px] font-semibold text-accent-dark">Tap to join</span>
    </button>
  );
}
