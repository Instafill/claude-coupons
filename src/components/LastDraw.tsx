import Link from "next/link";

import type { DrawSummary } from "@/lib/draw";

// Proof that the draws are real: the last one, who won it, how many were there, and the room
// itself, which stays up read-only for anyone to look through.

function names(list: string[]): string {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export default function LastDraw({ last }: { last: NonNullable<DrawSummary["last"]> }) {
  const day = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(last.drawAt);
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <Link href={`/draw/${last.id}`} className="block border-b border-line bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/email/live-draw-room.png?v=2"
          alt="The live draw room: everyone who joined on a grid and a world map, the winners and the live chat"
          width={1200}
          height={675}
          className="aspect-[16/8] w-full object-cover object-top"
        />
      </Link>
      <div className="flex flex-1 flex-col px-6 py-5">
        <p className="text-[12px] font-semibold tracking-wider text-accent-dark uppercase">Last live draw &middot; {day}</p>
        <h3 className="mt-1 text-[21px] leading-tight font-semibold">
          {last.winners.length ? `${names(last.winners)} won` : `${last.claimed} of ${last.spots} passes claimed`}
        </h3>
        <p className="mt-1.5 text-[15px] text-muted">
          {last.joined} {last.joined === 1 ? "person was" : "people were"} in the room, chatting while the{" "}
          {last.spots === 1 ? "pass was" : `${last.spots} passes were`} drawn live.
          {last.claimed === last.spots ? " Every pass was claimed." : ""}
        </p>
        <Link href={`/draw/${last.id}`} className="mt-auto pt-4 text-[15px] font-semibold text-accent-dark hover:underline">
          Look through the room and its chat &rarr;
        </Link>
      </div>
    </section>
  );
}
