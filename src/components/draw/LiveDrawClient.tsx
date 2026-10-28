"use client";

import dynamic from "next/dynamic";

import type { DrawView } from "@/lib/draw";
import type { Place } from "@/lib/places";

import type { Known } from "./LiveDraw";

// The room runs on the server's clock, read in the browser, so it renders there only: a
// server-rendered countdown would hand React a different second to hydrate.
const LiveDraw = dynamic(() => import("./LiveDraw"), {
  ssr: false,
  loading: () => <p className="py-16 text-center text-[15px] text-muted">Opening the room…</p>,
});

export default function LiveDrawClient(props: { initial: DrawView; known: Known; place: Place }) {
  return <LiveDraw {...props} />;
}
