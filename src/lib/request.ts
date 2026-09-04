/**
 * Reads a posted form without trusting the sender to have sent one.
 *
 * `request.formData()` throws when the content type is anything else, and scanners post
 * bare bodies at these routes all day - which turned into 500s in the runtime log and, on
 * a route that answers before it reads anything, a 500 where a 400 was the whole reply.
 * An unreadable body is simply an empty form: every caller already rejects what is missing.
 */
export async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    return new FormData();
  }
}
