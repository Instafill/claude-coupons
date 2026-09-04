// The tools we ask about once someone is already on the list. Kept in one place because the
// form renders it, the route validates against it, and stats.mjs counts it - three copies of
// this list would drift apart within a week.
//
// These are demand candidates, not partners. Nothing here has agreed to anything, which is
// why the form asks what people want rather than announcing what we have.
export const TOOLS = [
  "Cursor",
  "Windsurf",
  "GitHub Copilot",
  "Replit",
  "Lovable",
  "v0",
  "Perplexity",
  "ChatGPT Plus",
  "Midjourney",
  "ElevenLabs",
] as const;

export const MAX_OTHER_LENGTH = 200;

/** Keeps only names we offered. A checkbox list is a closed set; anything else is noise. */
export function cleanInterests(values: string[]): string[] {
  const allowed = new Set<string>(TOOLS);
  return [...new Set(values.filter((value) => allowed.has(value)))];
}
