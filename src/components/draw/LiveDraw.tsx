"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatLine, DrawPerson, DrawView } from "@/lib/draw";
import { POLL_MS } from "@/lib/drawRules";
import type { Place } from "@/lib/places";

import { focusJoin, type Draft } from "./JoinPanel";
import type { ChatMode } from "./LiveChat";
import Room from "./Room";
import { TOAST_MS, type Banner, type Line, type Pass, type PassStatus, type Person, type View } from "./roomView";
import { clock } from "./time";

// The live room in the browser. The server runs the draw (lib/draw.ts); this page asks it for
// news every couple of seconds - sooner when something is due, like a sweep landing or a claim
// running out - and turns each answer into the frame Room draws. Asking is also how the server
// knows this page is still in the room, and closing it says goodbye (pagehide), so a winner
// who leaves loses their spot after the grace instead of the whole minute.

/** What the server already knows about the visitor, for the join form. */
export interface Known {
  name?: string;
  picture?: string;
  /** Their identicon in this room, so the face in the form is the face on the tile. */
  seed: string;
}

/** A reaction as this page first saw it. Shown from then, whenever it was sent. */
interface Shown {
  id: string;
  who: string;
  emoji: string;
  at: number;
}

/** The server's view with the people list always filled in: a page keeps the last one it got. */
type Full = DrawView & { people: DrawPerson[] };

const REACTION_MS = 2200;
// How much chat a page holds; older lines scroll away for good.
const CHAT_HELD = 200;
// After the room closes nothing moves but a winner's "did it work?", so it asks rarely.
const CLOSED_POLL_MS = 15_000;

function why(reason: Pass["history"][number]["reason"], me: boolean, name: string): string {
  if (reason === "passed_on") return me ? "you passed it on" : `${name} passed it on`;
  if (reason === "left") return me ? "you left the room" : `${name} left the room`;
  return me ? "your time ran out" : `${name} didn't claim in time`;
}

function spread(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 25) - 12;
}

/** When something next happens that the page should hear about at once. */
function nextDue(s: DrawView, now: number): number {
  const due = [
    s.status === "open" ? s.drawAt : undefined,
    s.sweep?.end,
    s.nextJobAt,
    ...s.spots.map((spot) => spot.claimEnd),
  ].filter((at): at is number => at !== undefined && at > now);
  return due.length ? Math.min(...due) : Infinity;
}

/**
 * The room's people as tiles. A person whose tile reads the same as last time keeps the very
 * same object, so with hundreds in the room only the tiles that changed draw again.
 */
function toPeople(list: DrawPerson[], absent: Set<string>, meId: string | undefined, held: Map<string, Person>): Person[] {
  return list.map((p) => {
    const left = absent.has(p.id);
    const me = p.id === meId;
    const had = held.get(p.id);
    if (had && had.left === left && had.me === me && had.name === p.name && had.photo === p.picture && had.city === p.city)
      return had;
    const person: Person = {
      id: p.id,
      name: p.name,
      photo: p.picture,
      seed: p.seed,
      city: p.city,
      country: p.country,
      flag: p.flag,
      lat: p.lat,
      lon: p.lon,
      joinAt: p.joinedAt / 1000,
      joined: true,
      left,
      me,
    };
    held.set(p.id, person);
    return person;
  });
}

/** Chat lines merged by id, in order, without any the host took down. */
function mergeChat(held: ChatLine[], fresh: ChatLine[]): ChatLine[] {
  if (!fresh.length) return held;
  const byId = new Map(held.map((line) => [line.id, line]));
  let changed = false;
  for (const line of fresh) {
    const had = byId.get(line.id);
    if (line.hidden) {
      if (had) {
        byId.delete(line.id);
        changed = true;
      }
    } else if (!had) {
      byId.set(line.id, line);
      changed = true;
    }
  }
  if (!changed) return held;
  return [...byId.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1)).slice(-CHAT_HELD);
}

function toView(s: Full, people: Person[], now: number, loadedAt: number, shown: Shown[]): View {
  const meId = s.viewer.id;
  const byId = new Map(people.map((p) => [p.id, p]));
  const name = (id?: string) => byId.get(id ?? "")?.name ?? "Someone";
  const isMe = (id?: string) => !!meId && id === meId;

  const passes: Pass[] = s.spots.map((spot) => ({
    n: spot.n,
    status: spot.status as PassStatus,
    holder: spot.holder,
    claimStart: (spot.claimStart ?? 0) / 1000,
    claimEnd: (spot.claimEnd ?? 0) / 1000,
    graceFrom: spot.graceFrom === undefined ? undefined : spot.graceFrom / 1000,
    history: spot.history.map((h) => ({ id: h.id, reason: h.reason, why: why(h.reason, isMe(h.id), name(h.id)) })),
  }));

  // The banner says the latest thing that matters to the whole room; activity lists the rest.
  let banner: Banner | null = null;
  for (const item of [...s.feed].reverse()) {
    if (item.kind === "sweep" && item.redraw) {
      const n = item.candidates ?? 0;
      banner = {
        text: `Spot ${item.spot} came back. Re-drawing now among the ${n} ${n === 1 ? "person" : "people"} still here`,
        tone: "accent",
      };
    } else if (item.kind === "won") {
      const person = byId.get(item.who ?? "");
      banner = isMe(item.who)
        ? { text: `You win spot ${item.spot}!`, tone: "good" }
        : {
            text: `${person?.name ?? "Someone"}${person ? ` from ${person.city}` : ""} wins spot ${item.spot}`,
            tone: "good",
          };
    } else if (item.kind === "claimed" && isMe(item.who)) {
      banner = { text: `You claimed spot ${item.spot}`, tone: "good" };
    } else if (item.kind === "released") {
      const reason = (item.reason ?? "timeout") as Pass["history"][number]["reason"];
      banner = { text: `Spot ${item.spot} is back: ${why(reason, isMe(item.who), name(item.who))}`, tone: "bad" };
    } else if (item.kind === "unfilled") {
      banner = { text: `Nobody left in the room to draw spot ${item.spot} for`, tone: "plain" };
    } else if (item.kind === "closed") {
      const claimed = item.claimed ?? 0;
      banner = {
        text:
          claimed === s.spots.length
            ? `All ${claimed} ${claimed === 1 ? "spot" : "spots"} claimed. Room closed.`
            : `Room closed. ${claimed} of ${s.spots.length} spots claimed; nobody was left for the rest.`,
        tone: "plain",
      };
    }
    if (banner) break;
  }

  const lines: (Line & { at: number })[] = people.map((p) => ({
    id: `j${p.id}`,
    at: p.joinAt * 1000,
    text: p.me ? `You joined from ${p.city}` : `${p.name} from ${p.city} joined`,
    tone: "plain" as const,
  }));
  for (const item of s.feed) {
    const who = isMe(item.who) ? "You" : name(item.who);
    const line = (text: string, tone: Line["tone"]) => lines.push({ id: `f${item.id}`, at: item.at, text, tone });
    if (item.kind === "won") line(`${who} won spot ${item.spot}`, "good");
    else if (item.kind === "claimed") line(`${who} claimed spot ${item.spot} ✓`, "good");
    else if (item.kind === "released") {
      const reason = (item.reason ?? "timeout") as Pass["history"][number]["reason"];
      line(`Spot ${item.spot} is back: ${why(reason, isMe(item.who), name(item.who))}`, "bad");
    } else if (item.kind === "winner_left") line(`${who} left the room. Spot ${item.spot} goes back soon`, "bad");
    else if (item.kind === "winner_back")
      line(`${who} came back. Spot ${item.spot} is still ${isMe(item.who) ? "yours" : "theirs"}`, "plain");
    else if (item.kind === "unfilled") line(`Nobody left to draw spot ${item.spot} for`, "plain");
  }
  lines.sort((a, b) => b.at - a.at);

  const sweep = s.sweep;
  const present = people.filter((p) => !p.left);
  const drawStarted = s.status !== "open";
  return {
    t: now / 1000,
    drawAt: s.drawAt / 1000,
    claim: s.claimSeconds,
    test: s.test,
    everyone: s.everyone,
    spectator: s.viewer.spectator,
    links: s.links,
    drawStarted,
    closed: s.status === "closed",
    people,
    presentCount: present.length,
    passes,
    highlight: sweep ? [...sweep.steps].reverse().find((step) => step.at <= now)?.id : undefined,
    sweepPass: sweep?.spot,
    sweepRedraw: !!sweep?.redraw,
    nextJob: s.jobs[0] && { pass: s.jobs[0].spot, redraw: s.jobs[0].redraw },
    mainDone: drawStarted && !s.jobs.some((j) => !j.redraw) && !(sweep && !sweep.redraw),
    eligible: s.eligible,
    meEligible: s.viewer.eligible,
    banner,
    lines: lines.slice(0, 7),
    reactions: shown
      .filter((r) => now - r.at < REACTION_MS)
      .map((r) => ({ id: r.id, personId: r.who, emoji: r.emoji, dx: spread(r.id) })),
    toasts: people
      .filter((p) => !p.me && p.joinAt * 1000 > loadedAt && now - p.joinAt * 1000 < TOAST_MS)
      .slice(-3)
      .map((p) => ({ id: `t${p.id}`, personId: p.id })),
    me: people.find((p) => p.me),
    meEverWon: s.viewer.everWon,
    mine: s.viewer.mine,
  };
}

export default function LiveDraw({ initial: first, known, place }: { initial: DrawView; known: Known; place: Place }) {
  const initial = first as Full;
  const id = initial.id;
  const [server, setServer] = useState<Full>(initial);
  const [chat, setChat] = useState<ChatLine[]>(() => mergeChat([], initial.chat));
  const lastChatAt = useRef(initial.chat.length ? Math.max(...initial.chat.map((line) => line.at)) : 0);
  // The server's clock minus ours. Every countdown in every room reads the server's.
  const offset = useRef(0);
  const latest = useRef<Full>(initial);
  // Tiles as last built, so an unchanged person keeps the same object from one answer to the next.
  const heldPeople = useRef(new Map<string, Person>());
  const [people, setPeople] = useState<Person[]>(() =>
    toPeople(initial.people, new Set(initial.absent), initial.viewer.id, new Map())
  );
  const [now, setNow] = useState(initial.now);
  const [shown, setShown] = useState<Shown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [missingName, setMissingName] = useState(false);
  const meAtLoad = initial.people.find((p) => p.id === initial.viewer.id);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: meAtLoad?.name ?? known.name ?? "",
    seed: known.seed,
    photo: known.picture,
    usePhoto: meAtLoad ? !!meAtLoad.picture : !!known.picture,
    place,
  }));

  const apply = useCallback((answer: DrawView, sentAt: number) => {
    // Half the round trip is the best guess at when the server read its clock.
    offset.current = answer.now - (sentAt + Date.now()) / 2;
    // The whole people list comes on arrival; after that only the arrivals since the last ask.
    const people = answer.people ?? [...latest.current.people, ...(answer.peopleAdded ?? [])];
    const view: Full = { ...answer, people };
    latest.current = view;
    setServer(view);
    setPeople(toPeople(people, new Set(answer.absent), answer.viewer.id, heldPeople.current));
    if (answer.chat.length) {
      lastChatAt.current = Math.max(lastChatAt.current, ...answer.chat.map((line) => line.at));
      setChat((held) => mergeChat(held, answer.chat));
    }
    // Reactions are shown from the moment this page first sees them: one sent just after the
    // last ask would otherwise be nearly over by the time it arrived.
    setShown((all) => {
      const known = new Set(all.map((r) => r.id));
      const fresh = view.reactions
        .filter((r) => !known.has(r.id) && r.who !== view.viewer.id)
        .map((r) => ({ id: r.id, who: r.who, emoji: r.emoji, at: view.now }));
      return [...all.filter((r) => view.now - r.at < 10_000), ...fresh];
    });
  }, []);

  const poll = useCallback(async () => {
    const sentAt = Date.now();
    // What this page holds, so the answer carries only what's new to it.
    const have = new URLSearchParams({
      n: String(latest.current.people.length),
      ph: latest.current.peopleHash,
      since: String(lastChatAt.current),
    });
    const response = await fetch(`/api/draw/${id}?${have}`, { cache: "no-store" });
    if (response.ok) apply(await response.json(), sentAt);
  }, [id, apply]);

  // Ask for news: every POLL_MS, or right when the next thing is due if that is sooner.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const view = latest.current;
      const serverNow = Date.now() + offset.current;
      const wait =
        view.status === "closed" ? CLOSED_POLL_MS : Math.min(POLL_MS, nextDue(view, serverNow) + 150 - serverNow);
      timer = setTimeout(loop, Math.max(250, wait));
    };
    const loop = async () => {
      try {
        await poll();
      } catch {
        // A dropped request is just a missed beat; the next one catches up.
      }
      if (!stopped) schedule();
    };
    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [poll]);

  // The clock the room is drawn on.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now() + offset.current), 200);
    return () => clearInterval(tick);
  }, []);

  // Leaving says so at once; coming back (a restored tab, a woken phone) asks for news at once.
  useEffect(() => {
    const bye = () => navigator.sendBeacon(`/api/draw/${id}`, JSON.stringify({ action: "leave" }));
    const back = () => {
      if (document.visibilityState === "visible") poll().catch(() => {});
    };
    window.addEventListener("pagehide", bye);
    window.addEventListener("pageshow", back);
    document.addEventListener("visibilitychange", back);
    return () => {
      window.removeEventListener("pagehide", bye);
      window.removeEventListener("pageshow", back);
      document.removeEventListener("visibilitychange", back);
    };
  }, [id, poll]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const view = toView(server, people, now, initial.now, shown);

  // A background tab still says what is happening in its title: a winner who switched away
  // sees it from the tab strip.
  const myClaim = view.passes.find((p) => p.status === "claiming" && p.holder && p.holder === view.me?.id);
  const title = myClaim
    ? `🎉 You won! Claim in ${clock(myClaim.claimEnd - view.t)}`
    : view.closed
      ? "Live draw · closed"
      : !view.drawStarted
        ? `Live draw in ${clock(view.drawAt - view.t)}`
        : "Live draw · drawing";
  useEffect(() => {
    document.title = `${title} - Claude Coupons`;
  }, [title]);

  const sendChat = useCallback(
    async (text: string): Promise<string | null> => {
      const sentAt = Date.now();
      const response = await fetch(`/api/draw/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", text }),
      }).catch(() => null);
      if (!response) return "That didn't send. Try again.";
      const data = await response.json().catch(() => ({}));
      if (data.view) apply(data.view, sentAt);
      return response.ok ? null : (data.error ?? "That didn't send. Try again.");
    },
    [id, apply]
  );

  const hideChat = useCallback(
    async (message: string) => {
      setChat((held) => held.filter((line) => line.id !== message));
      await fetch(`/api/draw/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide", message }),
      }).catch(() => {});
    },
    [id]
  );

  const joined = !!view.me;
  const chatMode: ChatMode = !server.chatOpen
    ? "closed"
    : server.viewer.spectator
      ? "host"
      : joined
        ? "chat"
        : view.closed
          ? "closed"
          : "join";

  const send = async (body: Record<string, unknown>) => {
    const sentAt = Date.now();
    const response = await fetch(`/api/draw/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (data.view) apply(data.view, sentAt);
    if (!response.ok) {
      setError(data.error ?? "That didn't go through. Try again.");
      return null;
    }
    setError(null);
    return data;
  };

  // Every join button lands here - the panel's, the dashed tile's, the sticky bar's. Without a
  // name there is nothing to put on the tile, so it sends them to the one empty field instead.
  const join = async () => {
    const name = draft.name.trim();
    if (!name) {
      setMissingName(true);
      focusJoin();
      return;
    }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (await send({ action: "join", name, usePhoto: draft.usePhoto, zone })) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      {error && (
        <p
          role="alert"
          className="fixed top-4 left-1/2 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-[#efc2b8] bg-[#fbebe7] px-4 py-2.5 text-[15px] font-semibold text-bad shadow-lg"
        >
          {error}
        </p>
      )}
      <Room
        view={view}
        speed={1}
        draft={draft}
        onDraft={(next) => {
          setDraft(next);
          if (next.name.trim()) setMissingName(false);
        }}
        onJoin={join}
        onEditMe={(next) => {
          setDraft(next);
          send({ action: "edit", name: next.name, usePhoto: next.usePhoto });
        }}
        missingName={missingName}
        chat={chat}
        peopleById={peopleById}
        chatMode={chatMode}
        onChat={sendChat}
        onHideChat={server.viewer.spectator ? hideChat : undefined}
        onClaim={() => send({ action: "claim" })}
        onPassOn={() => send({ action: "passon" })}
        onReact={(emoji) => {
          if (view.me) {
            const me = view.me.id;
            setShown((all) => [...all, { id: `mine-${Date.now()}`, who: me, emoji, at: Date.now() + offset.current }]);
            send({ action: "react", emoji });
          }
        }}
        onOutcome={async (passId, result) => {
          await fetch(`/api/passes/${passId}/outcome`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result }),
          });
          await poll().catch(() => {});
        }}
      />
    </>
  );
}
