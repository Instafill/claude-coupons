"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { DrawView } from "@/lib/draw";
import type { Place } from "@/lib/places";

import type { Known } from "./LiveDraw";

// The room runs on the server's clock, read in the browser, so it renders there only: a
// server-rendered countdown would hand React a different second to hydrate.
const LiveDraw = dynamic(() => import("./LiveDraw"), {
  ssr: false,
  loading: () => <p className="py-16 text-center text-[15px] text-muted">Opening the room…</p>,
});

// A draw announced ahead: until the room opens, the page is a countdown and nothing polls.
// A thousand invited tabs left open overnight cost nothing until the moment they're needed.
const DrawWaiting = dynamic(() => import("./DrawWaiting"), { ssr: false });

export default function LiveDrawClient(props: { initial: DrawView; known: Known; place: Place }) {
  const { initial } = props;
  // The server's clock decides, not the browser's: a wrong clock on a laptop must not open
  // the room early (joining would be refused) or keep it shut.
  const [skew] = useState(() => initial.now - Date.now());
  const opensAt = initial.opensAt;
  const [waiting] = useState(() => Boolean(opensAt && initial.now < opensAt));
  if (waiting && opensAt) {
    return (
      <DrawWaiting
        opensAt={opensAt - skew}
        drawAt={initial.drawAt - skew}
        spots={initial.spots.length}
        invited={initial.invited}
        invitedYou={initial.viewer.invited || initial.viewer.spectator}
        // A fresh page rather than the room on a view hours old: the room's clock and roster
        // start from the server's answer. Spread over a few seconds so a thousand tabs that
        // waited together don't all ask in the same instant.
        onOpen={() => setTimeout(() => window.location.reload(), Math.random() * 4000)}
      />
    );
  }
  return <LiveDraw {...props} />;
}
