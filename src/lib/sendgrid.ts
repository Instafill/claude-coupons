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
  submitterEmail: string;
  submitterName?: string;
  livePasses: number;
}): Promise<void> {
  const url = `https://claude.ai/referral/${pass.code}`;
  const who = pass.submitterName
    ? `${pass.submitterName} (${pass.submitterEmail})`
    : pass.submitterEmail;

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[notify] new pass ${pass.code} from ${who}`);
    return;
  }

  try {
    init();
    await sgMail.send({
      to: NOTIFY_EMAIL,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `New Claude pass listed by ${pass.submitterEmail}`,
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
