import sgMail from "@sendgrid/mail";

// Must stay on claudecoupons.com, and is not configurable on purpose. A sign-in link for
// one domain arriving from another is the shape of a phishing mail and filters score it
// that way; sending as alex@botmakers.net put the magic link in a user's spam folder, and
// failed SPF besides, since botmakers.net authorises Google rather than SendGrid. This
// address is only deliverable because claudecoupons.com is the domain SendGrid signs for,
// so an env var pointing it elsewhere could only break DKIM alignment again.
//
// It receives as well as sends: Cloudflare Email Routing forwards it to a real inbox, so
// replies need no Reply-To pointing off the brand domain.
const FROM_EMAIL = "hello@claudecoupons.com";
const FROM_NAME = "Claude Coupons";
// Where operator alerts are delivered. A recipient only - it cannot affect authentication.
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "alex@botmakers.net";

let initialized = false;

function init() {
  if (!initialized) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    initialized = true;
  }
}

// Tells the operator a new pass landed on the board. Unlike the server event log, this one
// carries the full referral link on purpose: the point is to be able to check the pass is
// real from the phone that got the alert. It goes to one fixed inbox, never to a user.
export async function notifyNewPass(pass: {
  code: string;
  submitterEmail?: string;
  submitterName?: string;
  livePasses: number;
}): Promise<void> {
  const url = `https://claude.ai/referral/${pass.code}`;
  const who = pass.submitterName
    ? pass.submitterEmail
      ? `${pass.submitterName} (${pass.submitterEmail})`
      : pass.submitterName
    : pass.submitterEmail || "an anonymous contributor";

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[notify] new pass ${pass.code} from ${who}`);
    return;
  }

  try {
    init();
    await sgMail.send({
      to: NOTIFY_EMAIL,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `New Claude pass listed by ${pass.submitterEmail || "an anonymous contributor"}`,
      text: `${who} listed a pass.\n\n${url}\n\nLive passes on the board: ${pass.livePasses}\nhttps://claudecoupons.com/`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f; margin-bottom: 4px;">New pass on the board</h2>
          <p style="color: #6e6a63; margin-top: 0;">Listed by ${who}</p>
          <p style="font-family: ui-monospace, Menlo, monospace; background: #f0ede6; padding: 10px 14px; border-radius: 8px; word-break: break-all;">
            <a href="${url}" style="color: #a94f20;">${url}</a>
          </p>
          <p style="color: #6e6a63; font-size: 14px;">
            Live passes on the board: <strong>${pass.livePasses}</strong> &middot;
            <a href="https://claudecoupons.com/" style="color: #a94f20;">open the board</a>
          </p>
        </div>`,
    });
  } catch (error) {
    // A failed alert must never cost someone their listing.
    console.error("New-pass notification failed:", error);
  }
}

// Sends the sign-in link. Without an API key configured (local development) the link goes
// to the console instead, so the whole flow can be walked without sending mail.
export async function sendMagicLink(email: string, link: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[magic-link] ${email}: ${link}`);
    return;
  }

  try {
    init();
    await sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "Your sign-in link for claudecoupons.com",
      text: `Click to sign in to claudecoupons.com:\n\n${link}\n\nThe link works once and expires in 30 minutes. If you didn't request it, ignore this email.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f;">Sign in to ClaudeCoupons</h2>
          <p>Click the button to sign in. No password needed.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Sign in</a>
          </p>
          <p style="color: #6e6a63; font-size: 13px;">The link works once and expires in 30 minutes. If you didn&rsquo;t request it, ignore this email.</p>
        </div>`,
    });
  } catch (error) {
    console.error("Magic link send failed:", error);
  }
}

// Asks someone to confirm they want alerts before a single one is sent. The confirmation
// step is not ceremony: unconfirmed bulk mail from this domain would put the sign-in links
// above at risk, and those are the one email this site cannot afford to have filtered.
export async function sendWatchConfirmation(email: string, confirmUrl: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[watch-confirm] ${email}: ${confirmUrl}`);
    return;
  }

  try {
    init();
    await sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "Confirm you want Claude pass alerts",
      text: `Someone asked us to email this address when claudecoupons.com has Claude guest passes again.\n\nConfirm here:\n${confirmUrl}\n\nWe will only email you when the board goes from empty to having passes - never a newsletter, and never more than once every 12 hours. If this wasn't you, ignore this email and nothing further will be sent.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f;">One click and you&rsquo;re watching</h2>
          <p>Someone asked us to email this address when the board at claudecoupons.com has Claude guest passes again.</p>
          <p style="margin: 24px 0;">
            <a href="${confirmUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm and start watching</a>
          </p>
          <p style="color: #6e6a63; font-size: 13px;">
            You&rsquo;ll hear from us only when the board goes from empty to having passes, and never more than
            once every 12 hours. No newsletter, and we don&rsquo;t share your address. Every alert carries a
            one-click link to stop.
          </p>
          <p style="color: #6e6a63; font-size: 13px;">If this wasn&rsquo;t you, ignore this email &mdash; nothing further will be sent.</p>
        </div>`,
    });
  } catch (error) {
    console.error("Watch confirmation send failed:", error);
  }
}

export interface AlertRecipient {
  email: string;
  stopUrl: string;
}

// How many alerts one refill may send. The fan-out runs inside the submitter's request, so
// this is the ceiling on how long listing a pass can be made to take by a long watch list.
const MAX_ALERT_BATCH = 25;

// The refill alert. Sent one message per recipient rather than as a single call with
// personalizations, because each needs its own List-Unsubscribe header - that header is
// per-message in the SendGrid API, and Gmail and Yahoo require it of bulk senders (RFC 8058).
//
// Returns the addresses that were actually accepted, so the caller only marks those as
// notified and a failed send is retried on the next refill instead of being lost.
export async function sendPassAlerts(recipients: AlertRecipient[], waiting: number): Promise<string[]> {
  if (!process.env.SENDGRID_API_KEY) {
    for (const recipient of recipients) {
      console.log(`[pass-alert] ${recipient.email}: stop ${recipient.stopUrl}`);
    }
    return recipients.map((recipient) => recipient.email);
  }

  init();
  const delivered: string[] = [];

  for (let i = 0; i < recipients.length; i += MAX_ALERT_BATCH) {
    const chunk = recipients.slice(i, i + MAX_ALERT_BATCH);
    const results = await Promise.allSettled(chunk.map((r) => sendOneAlert(r, waiting)));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") delivered.push(chunk[index].email);
      else console.error("Pass alert send failed:", result.reason);
    });
  }

  return delivered;
}

function sendOneAlert({ email, stopUrl }: AlertRecipient, waiting: number): Promise<unknown> {
  // The count is the honest form of urgency: it is how many people are opening this at the
  // same moment, and passes are gone once three of them get through.
  const crowd = waiting > 1 ? `${waiting} people got this email at the same moment. ` : "";
  const rule = "First to sign in and unlock gets it. Three claims and it is finished.";
  return sgMail.send({
    to: email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: "A Claude guest pass is on the board",
    // One-click unsubscribe. The POST variant is what Gmail's own "unsubscribe" button
    // calls; the mailto-free header list is what marks this as bulk mail honestly.
    headers: {
      "List-Unsubscribe": `<${stopUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: `A Claude pass is on the board.\n\nhttps://claudecoupons.com/\n\n${crowd}${rule} Miss it and you stay on the list for the next one.\n\nStop these emails: ${stopUrl}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
        <h2 style="color: #c9642f;">A Claude pass is on the board</h2>
        <p>${crowd}${rule}</p>
        <p style="margin: 24px 0;">
          <a href="https://claudecoupons.com/" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open the board</a>
        </p>
        <p style="color: #6e6a63; font-size: 14px;">Miss it and you stay on the list for the next one.</p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
      </div>`,
  });
}
