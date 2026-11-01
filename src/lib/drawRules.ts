// The live draw's timings, shared by the server that runs a draw (lib/draw.ts) and the page
// that shows it. Nothing here touches the database, so the browser can import it.

/** How long a winner has to press "Get my pass". */
export const CLAIM_SECONDS = 60;
/** A winner whose page left the room keeps the spot this long, in case they come straight back. */
export const GRACE_SECONDS = 15;
/** How often an open room asks for news. Each ask is also the "still here" signal. */
export const POLL_MS = 2000;
/**
 * Silence after which someone counts as gone. Long on purpose: a browser checks in from a
 * background tab only about once a minute, and someone waiting in another tab is still in
 * the room. Closing the page is caught at once, by the goodbye it sends (pagehide).
 */
export const PRESENT_MS = 90_000;
/** Real milliseconds a sweep takes: the show, so it is never shortened. */
export const MAIN_SWEEP_MS = 4000;
export const REDRAW_SWEEP_MS = 2000;
/** The beat between one winner landing and the next sweep starting. */
export const PAUSE_MS = 1600;
/** What the room may send. Anything else is dropped. */
export const REACTIONS = ["👋", "🔥", "🤞", "🍀", "😬", "🎉"];
/** What can be put on a chat line. */
export const CHAT_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "😮"];
