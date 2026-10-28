"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// A moment in the reader's own time zone. The server can only say UTC; once the page is in
// the browser, which is the one place that knows the zone, it says the reader's own time.
// The store is the "are we in the browser yet" switch: React renders the server's answer to
// hydrate, then re-renders with the browser's.
export default function LocalTime({ at, weekday = false }: { at: number; weekday?: boolean }) {
  const inBrowser = useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
  const format = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(weekday ? { weekday: "short" } : {}),
    ...(inBrowser ? {} : { timeZone: "UTC" }),
  });
  return <span>{inBrowser ? `${format.format(at)} your time` : `${format.format(at)} UTC`}</span>;
}
