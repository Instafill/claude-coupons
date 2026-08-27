// Server-side event log. One line per meaningful action, prefixed so it can be filtered in
// Vercel's runtime logs (search "[event]") or picked up by a log drain later.
//
// This is deliberately separate from the Vercel Analytics custom events fired in the browser:
// those miss anyone running an ad blocker, and they cannot see whether the write actually
// succeeded. These lines are the record of what the server really did.
//
// Never log an email address or a full referral code - a user id and a pass id identify the
// row without putting a working coupon or a person's address into log storage.
export function logEvent(
  name: string,
  data: Record<string, string | number | boolean> = {}
): void {
  console.log(`[event] ${name} ${JSON.stringify(data)}`);
}
