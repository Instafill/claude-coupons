"use client";

import { useEffect, useRef } from "react";

/**
 * Tells the server where the person holding this number is, once per page load.
 *
 * Renders nothing. It exists because the people who joined before their location was ever
 * recorded cannot be placed from anything stored - the IP behind it is hashed on arrival -
 * so the only way to fill them in is to notice them the next time they visit. The wave poll
 * would have done it, but that only runs on a board with passes, and this board is usually
 * empty; someone waiting in the queue is exactly who never got noticed.
 */
export default function PlaceMe() {
  const sent = useRef(false);

  useEffect(() => {
    // Strict mode mounts twice in development, and one page load is one report.
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/watch/place", { method: "POST" }).catch(() => null);
  }, []);

  return null;
}
