"use client";

import { memo, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";

import type { ChatLine } from "@/lib/draw";
import { CHAT_REACTIONS } from "@/lib/drawRules";

import { Avatar } from "./Avatar";
import type { Person } from "./roomView";
import { onSoundChange, playChat, setSoundMuted, soundMuted } from "./sounds";

// The room's live chat, in the manner of a live stream's: what people say, and what the room
// does - arrivals, every pick, claims, spots coming back - in one scrolling column, newest at
// the bottom. It sticks to the bottom while you're there and leaves you be once you scroll up.

const MAX = 200;

export type ChatMode = "chat" | "host" | "join" | "closed" | "watch" | "blocked";

const NO_COUNTS: Record<string, number> = {};
const NO_MINE: string[] = [];

/** Under a line: its reactions as chips, yours highlighted; a press toggles yours. */
function Chips({
  id,
  counts,
  mine,
  onReact,
}: {
  id: string;
  counts: Record<string, number>;
  mine: string[];
  onReact?: (id: string, emoji: string) => void;
}) {
  const chips = Object.entries(counts).filter(([, n]) => n > 0);
  if (!chips.length) return null;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1">
      {chips.map(([emoji, n]) => (
        <button
          key={emoji}
          type="button"
          disabled={!onReact}
          onClick={(event) => {
            event.stopPropagation();
            onReact?.(id, emoji);
          }}
          className={`rounded-full border px-1.5 text-[12px] leading-5 tabular-nums ${
            mine.includes(emoji) ? "border-accent bg-[#f4e4da] text-accent-dark" : "border-line bg-surface text-muted"
          } ${onReact ? "hover:border-accent" : "cursor-default"}`}
        >
          {emoji} {n}
        </button>
      ))}
    </div>
  );
}

/**
 * On hover, or a tap on the line on a touch screen: the emoji to add - plus, for the host,
 * Hide and Block - floating over the line's corner, so showing them never moves a line.
 */
function Tools({
  id,
  mine,
  open,
  onReact,
  onHide,
  onBlock,
}: {
  id: string;
  mine: string[];
  open: boolean;
  onReact?: (id: string, emoji: string) => void;
  onHide?: (id: string) => void;
  onBlock?: (id: string) => void;
}) {
  if (!onReact && !onHide && !onBlock) return null;
  return (
    <span
      className={`${open ? "flex" : "hidden group-hover:flex"} absolute -top-2 right-3 z-10 items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5 shadow-md`}
    >
      {onReact &&
        CHAT_REACTIONS.filter((emoji) => !mine.includes(emoji)).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onReact(id, emoji);
            }}
            className="rounded-full px-1 text-[15px] leading-6 opacity-80 hover:bg-line hover:opacity-100"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      {onHide && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onHide(id);
          }}
          className="ml-1 rounded px-1.5 text-[12px] leading-6 text-muted hover:bg-line hover:text-bad"
          title="Take this message down"
        >
          Hide
        </button>
      )}
      {onBlock && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBlock(id);
          }}
          className="rounded px-1.5 text-[12px] leading-6 font-semibold text-bad hover:bg-[#fbebe7]"
          title="Block this person: all their messages go, and they can't post again"
        >
          Block
        </button>
      )}
    </span>
  );
}

const TONE: Record<string, string> = {
  started: "font-semibold text-accent-dark",
  sweep: "font-semibold text-accent-dark",
  won: "font-semibold text-good",
  claimed: "font-semibold text-good",
  released: "text-bad",
  winner_left: "text-bad",
  closed: "font-semibold text-ink",
};

type Row = { kind: "line"; line: ChatLine } | { kind: "joins"; id: string; lines: ChatLine[] };

/** Arrivals in a row become one line, so a busy minute reads "Maya, Kenji and 6 others joined". */
function rows(lines: ChatLine[]): Row[] {
  const out: Row[] = [];
  for (const line of lines) {
    const last = out[out.length - 1];
    if (line.event === "joined") {
      if (last?.kind === "joins") last.lines.push(line);
      else out.push({ kind: "joins", id: line.id, lines: [line] });
    } else out.push({ kind: "line", line });
  }
  return out;
}

function joinedText(lines: ChatLine[]): string {
  if (lines.length === 1) return lines[0].text.replace(/^👋 /, "");
  const names = lines.map((l) => l.name ?? "Someone");
  const shown = names.slice(-2).reverse();
  const others = names.length - shown.length;
  return others > 0
    ? `${shown.join(", ")} and ${others} ${others === 1 ? "other" : "others"} joined`
    : `${shown.join(" and ")} joined`;
}

function LiveChat({
  lines,
  people,
  meId,
  mode,
  live,
  reactions,
  reacted,
  onSend,
  onHide,
  onBlock,
  onReact,
  onJoin,
}: {
  lines: ChatLine[];
  people: Map<string, Person>;
  meId?: string;
  mode: ChatMode;
  live: boolean;
  reactions: Record<string, Record<string, number>>;
  reacted: Record<string, string[]>;
  onSend: (text: string) => Promise<string | null>;
  onHide?: (id: string) => void;
  onBlock?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onJoin: () => void;
}) {
  // A tap on a line opens its emoji on a touch screen, where there is no hover.
  const [openLine, setOpenLine] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const shown = rows(lines);
  const newest = lines[lines.length - 1]?.id;
  const input = useRef<HTMLInputElement>(null);
  const muted = useSyncExternalStore(onSoundChange, soundMuted, () => false);

  // Arriving, the chat opens on its newest line, as a live chat does.
  useLayoutEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // New lines: follow them down if the reader is at the bottom, else count them for the pill.
  const seen = useRef(newest);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el || newest === seen.current) return;
    // Someone else said something since the last lines: a soft pop, so the room is heard
    // from another tab too.
    const from = lines.findIndex((line) => line.id === seen.current);
    const fresh = from === -1 ? lines.slice(-1) : lines.slice(from + 1);
    if (fresh.some((line) => line.kind === "chat" && !(meId && line.tile === meId))) playChat();
    seen.current = newest;
    if (atBottom.current) el.scrollTop = el.scrollHeight;
    else setUnseen((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);

  const toBottom = () => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnseen(0);
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    const failed = await onSend(message);
    setSending(false);
    setError(failed);
    if (!failed) {
      setText("");
      atBottom.current = true;
    }
    input.current?.focus();
  };

  return (
    <section className="flex h-[560px] min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:h-full">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-[18px] font-semibold">Live chat</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundMuted(!muted)}
            className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-semibold text-muted hover:border-accent hover:text-ink"
            aria-pressed={!muted}
            title={muted ? "Turn the room's sounds on" : "Turn the room's sounds off"}
          >
            {muted ? "🔇 Sound off" : "🔊 Sound on"}
          </button>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#fbebe7] px-2.5 py-0.5 text-[12px] font-bold tracking-wide text-bad uppercase">
              <span className="draw-dot inline-block h-2 w-2 rounded-full bg-bad" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={list}
          onScroll={(event) => {
            const el = event.currentTarget;
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
            if (atBottom.current && unseen) setUnseen(0);
          }}
          className="h-full overflow-y-auto overscroll-contain py-2"
          aria-live="polite"
          aria-relevant="additions"
        >
          {!shown.length && (
            <p className="px-4 py-6 text-center text-[14px] text-muted">
              The chat is quiet so far. Say hi to the room.
            </p>
          )}
          <ul>
            {shown.map((row) => {
              if (row.kind === "joins") {
                const faces = row.lines.slice(-4).map((l) => (l.tile ? people.get(l.tile) : undefined));
                return (
                  <li key={row.id} className="draw-pop flex items-center gap-2 px-4 py-1 text-[13px] text-muted">
                    <span className="flex shrink-0 -space-x-1.5">
                      {faces.map((p, i) =>
                        p ? (
                          <Avatar
                            key={p.id}
                            photo={p.photo}
                            seed={p.seed}
                            name={p.name}
                            size={18}
                            className="ring-2 ring-surface"
                          />
                        ) : (
                          <span key={i} className="block h-[18px] w-[18px] rounded-full bg-line ring-2 ring-surface" />
                        )
                      )}
                    </span>
                    <span className="min-w-0">👋 {joinedText(row.lines)}</span>
                  </li>
                );
              }
              const { line } = row;
              const mineReacted = reacted[line.id] ?? NO_MINE;
              const chips = (
                <Chips id={line.id} counts={reactions[line.id] ?? NO_COUNTS} mine={mineReacted} onReact={onReact} />
              );
              const tools = (
                <Tools
                  id={line.id}
                  mine={mineReacted}
                  open={openLine === line.id}
                  onReact={onReact}
                  onHide={line.kind === "chat" && !line.host ? onHide : undefined}
                  onBlock={line.kind === "chat" && !line.host ? onBlock : undefined}
                />
              );
              if (line.kind === "system") {
                return (
                  <li
                    key={line.id}
                    onClick={() => setOpenLine((open) => (open === line.id ? null : line.id))}
                    className={`group draw-pop relative px-4 py-1 text-[13px] hover:bg-paper ${TONE[line.event ?? ""] ?? "text-muted"}`}
                  >
                    {line.text}
                    {chips}
                    {tools}
                  </li>
                );
              }
              const person = line.tile ? people.get(line.tile) : undefined;
              const mine = !!meId && line.tile === meId;
              return (
                <li
                  key={line.id}
                  onClick={() => setOpenLine((open) => (open === line.id ? null : line.id))}
                  className="group relative flex items-start gap-2.5 px-4 py-1 hover:bg-paper"
                >
                  {line.host ? (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] text-white">
                      ★
                    </span>
                  ) : (
                    <Avatar
                      photo={person?.photo}
                      seed={person?.seed ?? line.id}
                      name={line.name ?? ""}
                      size={24}
                      className="mt-0.5"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug break-words">
                      <span className={`mr-1.5 font-semibold ${mine ? "text-accent-dark" : "text-muted"}`}>
                        {line.name}
                        {person && <span className="ml-1 font-normal">{person.flag}</span>}
                      </span>
                      {line.host && (
                        <span className="mr-1.5 rounded bg-accent px-1 py-px align-[1px] text-[10px] font-bold tracking-wide text-white uppercase">
                          Host
                        </span>
                      )}
                      {line.text}
                    </p>
                    {chips}
                  </div>
                  {tools}
                </li>
              );
            })}
          </ul>
        </div>
        {unseen > 0 && (
          <button
            type="button"
            onClick={toBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-white shadow-md"
          >
            ↓ New messages
          </button>
        )}
      </div>

      <div className="border-t border-line px-3 py-3">
        {mode === "join" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2.5">
            <span className="text-[14px] text-muted">Join the draw to chat</span>
            <button
              type="button"
              onClick={onJoin}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-[14px] font-semibold text-white hover:bg-accent-dark"
            >
              Join
            </button>
          </div>
        ) : mode === "closed" || mode === "watch" || mode === "blocked" ? (
          <p className="rounded-xl bg-paper px-3 py-2.5 text-center text-[14px] text-muted">
            {mode === "closed"
              ? "The chat has closed."
              : mode === "watch"
                ? "You\u2019re watching. Only people in this draw can chat."
                : "The host has turned off chat for you in this room."}
          </p>
        ) : (
          <form onSubmit={send}>
            <div className="flex items-center gap-2">
              <input
                ref={input}
                value={text}
                onChange={(event) => {
                  setText(event.target.value.slice(0, MAX));
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  // Enter sends, whatever state the send button is in; Shift+Enter is left alone.
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    send();
                  }
                }}
                enterKeyHint="send"
                maxLength={MAX}
                placeholder={mode === "host" ? "Message the room as host…" : "Say something to the room…"}
                aria-label="Chat message"
                className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2 text-[14px] outline-none focus:border-accent focus:bg-surface"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-dark disabled:bg-line disabled:text-muted"
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <div className="mt-1 flex min-h-4 justify-between px-2 text-[12px]">
              <span className="text-bad">{error}</span>
              {text.length > MAX - 40 && (
                <span className="text-muted tabular-nums">
                  {text.length}/{MAX}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default memo(LiveChat);
