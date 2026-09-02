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

// How many messages go out in parallel. Fan-outs run inside a user's request, so this and
// the caller's recipient ceiling together bound how long that request can be made to take.
const MAX_ALERT_BATCH = 25;

// The postal line the bulk mail carries (CAN-SPAM). A recipient-facing string only.
const POSTAL_ADDRESS = process.env.MAIL_POSTAL_ADDRESS || "";

function postalLine(): string {
  return POSTAL_ADDRESS ? `<p style="color: #9a958c; font-size: 12px;">Claude Coupons &middot; ${escapeHtml(POSTAL_ADDRESS)}</p>` : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Sends one message per recipient rather than one call with personalizations, because each
// needs its own List-Unsubscribe header - that header is per-message in the SendGrid API,
// and Gmail and Yahoo require it of bulk senders (RFC 8058).
//
// Returns the addresses that were actually accepted, so the caller only marks those as
// notified and a failed send is retried next time instead of being lost.
async function sendBulk<T extends { email: string }>(
  recipients: T[],
  label: string,
  sendOne: (recipient: T) => Promise<unknown>
): Promise<string[]> {
  if (!process.env.SENDGRID_API_KEY) {
    for (const recipient of recipients) {
      const { email, ...rest } = recipient;
      console.log(`[${label}] ${email}: ${JSON.stringify(rest)}`);
    }
    return recipients.map((recipient) => recipient.email);
  }

  init();
  const delivered: string[] = [];

  for (let i = 0; i < recipients.length; i += MAX_ALERT_BATCH) {
    const chunk = recipients.slice(i, i + MAX_ALERT_BATCH);
    const results = await Promise.allSettled(chunk.map((r) => sendOne(r)));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") delivered.push(chunk[index].email);
      else console.error(`${label} send failed:`, result.reason);
    });
  }

  return delivered;
}

// The refill alert for the pass board.
export function sendPassAlerts(recipients: AlertRecipient[]): Promise<string[]> {
  return sendBulk(recipients, "pass-alert", sendOneAlert);
}

function sendOneAlert({ email, stopUrl }: AlertRecipient): Promise<unknown> {
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
    text: `The board at claudecoupons.com has Claude guest passes again.\n\nhttps://claudecoupons.com/\n\nPasses are first-come, first-served and often go within minutes, so this one may already be gone by the time you get there. If it is, you stay on the list and we'll tell you about the next one.\n\nStop these emails: ${stopUrl}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
        <h2 style="color: #c9642f;">The board has passes again</h2>
        <p>You asked to hear when claudecoupons.com had Claude guest passes. It does right now.</p>
        <p style="margin: 24px 0;">
          <a href="https://claudecoupons.com/" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open the board</a>
        </p>
        <p style="color: #6e6a63; font-size: 14px;">
          Passes are first-come, first-served and often go within minutes, so this one may already be gone by
          the time you arrive. If it is, you stay on the list and we&rsquo;ll tell you about the next one.
        </p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
        ${postalLine()}
      </div>`,
  });
}

// ---- Coupon marketplace ----------------------------------------------------------------

// Asks someone to confirm they want a product's drop email. Same reasoning as the watch
// list: unconfirmed bulk mail from this domain would put the sign-in links at risk.
export async function sendSubscribeConfirmation(
  email: string,
  args: { productName: string; confirmUrl: string; goal: number }
): Promise<void> {
  const { productName, confirmUrl, goal } = args;
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[coupon-confirm] ${email}: ${confirmUrl}`);
    return;
  }

  try {
    init();
    await sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `Confirm: ${productName} drop list`,
      text: `Someone asked us to add this address to the list waiting for ${productName} coupon codes on claudecoupons.com.\n\nConfirm here to hold your place in line:\n${confirmUrl}\n\nWhat follows: one email when the codes drop, and nothing else. There are fewer codes than people on the list, so the drop is first come, first served. We never share your address. If this wasn't you, ignore this email and nothing further will be sent.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f;">One click and you&rsquo;re in line</h2>
          <p>Someone asked us to add this address to the list waiting for <strong>${escapeHtml(productName)}</strong> coupon codes.</p>
          <p style="margin: 24px 0;">
            <a href="${confirmUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Confirm and hold my place</a>
          </p>
          <p style="color: #6e6a63; font-size: 13px;">
            What follows: one email when the codes drop, and nothing else. The drop is released once
            ${goal} people are waiting, or earlier if the makers choose. There are fewer codes than people, so
            it is first come, first served. We never share your address, and every email carries a one-click
            link to stop.
          </p>
          <p style="color: #6e6a63; font-size: 13px;">If this wasn&rsquo;t you, ignore this email &mdash; nothing further will be sent.</p>
        </div>`,
    });
  } catch (error) {
    console.error("Subscribe confirmation send failed:", error);
  }
}

export interface DropRecipient {
  email: string;
  claimUrl: string;
  stopUrl: string;
  productName: string;
  capacity: number;
  waiting: number;
  labels: string[];
}

// The drop email. Everyone on the list gets it in the same pass; the page decides who
// gets a code, so this message only has to be fast and honest about the odds.
export function sendDropAlerts(recipients: DropRecipient[]): Promise<string[]> {
  return sendBulk(recipients, "coupon-drop", sendOneDrop);
}

function sendOneDrop(r: DropRecipient): Promise<unknown> {
  const offer = r.labels.length ? r.labels.join(", ") : "a coupon code";
  return sgMail.send({
    to: r.email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `${r.productName}: ${r.capacity} codes live, first come first served`,
    headers: {
      "List-Unsubscribe": `<${r.stopUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: `You're on the list for ${r.productName}. ${r.capacity} codes just dropped for ${r.waiting} people - first come, first served.\n\nWhat's on offer: ${offer}\n\nClaim yours:\n${r.claimUrl}\n\nEach person can claim one code. If they are gone by the time you get there, you stay on the list for the next drop.\n\nStop these emails: ${r.stopUrl}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
        <h2 style="color: #c9642f;">${escapeHtml(r.productName)} codes are live</h2>
        <p>You&rsquo;re on the list. <strong>${r.capacity} codes</strong> just dropped for ${r.waiting} people &mdash; first come, first served.</p>
        <p style="color: #6e6a63;">On offer: ${escapeHtml(offer)}</p>
        <p style="margin: 24px 0;">
          <a href="${r.claimUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Claim my code</a>
        </p>
        <p style="color: #6e6a63; font-size: 14px;">
          Each person can claim one code. If they are gone by the time you get there, you stay on the list for
          the next drop.
        </p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${r.stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
        ${postalLine()}
      </div>`,
  });
}

// Tells the person who runs a product that its list hit the goal.
export async function sendGoalReached(
  email: string,
  args: { productName: string; waiting: number; dashboardUrl: string }
): Promise<void> {
  const { productName, waiting, dashboardUrl } = args;
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[founder-goal] ${email}: ${productName} ${waiting} waiting ${dashboardUrl}`);
    return;
  }
  try {
    init();
    await sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `${waiting} people are waiting for ${productName} codes`,
      text: `Your ${productName} list on claudecoupons.com reached its goal: ${waiting} people are waiting for codes.\n\nLoad codes and press Release, and everyone on the list is emailed at the same moment:\n${dashboardUrl}\n\nYou get this because you manage the ${productName} page.`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f;">${waiting} people are waiting for ${escapeHtml(productName)} codes</h2>
          <p>Your list reached its goal. Load codes and press Release, and everyone on the list is emailed at the same moment.</p>
          <p style="margin: 24px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open the dashboard</a>
          </p>
          <p style="color: #6e6a63; font-size: 13px;">You get this because you manage the ${escapeHtml(productName)} page on claudecoupons.com.</p>
        </div>`,
    });
  } catch (error) {
    console.error("Goal-reached send failed:", error);
  }
}

// The answer to "I run this product".
export async function sendOwnershipDecision(
  email: string,
  args: { productName: string; approved: boolean; url: string }
): Promise<void> {
  const { productName, approved, url } = args;
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[ownership-${approved ? "approved" : "rejected"}] ${email}: ${productName} ${url}`);
    return;
  }
  try {
    init();
    await sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: approved
        ? `You now manage ${productName} on Claude Coupons`
        : `We couldn't approve your request for ${productName}`,
      text: approved
        ? `Your request to manage the ${productName} page was approved. Load codes, set the goal and release drops here:\n${url}`
        : `We couldn't confirm that you run ${productName}. If you do, reply to this email from an address on the product's own domain and we'll sort it out.\n${url}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f;">${approved ? `You now manage ${escapeHtml(productName)}` : `About your request for ${escapeHtml(productName)}`}</h2>
          <p>${
            approved
              ? "Your request was approved. Load codes, set the goal and release drops from the dashboard."
              : "We couldn&rsquo;t confirm that you run this product. If you do, reply from an address on the product&rsquo;s own domain and we&rsquo;ll sort it out."
          }</p>
          <p style="margin: 24px 0;">
            <a href="${url}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">${approved ? "Open the dashboard" : "See the page"}</a>
          </p>
        </div>`,
    });
  } catch (error) {
    console.error("Ownership decision send failed:", error);
  }
}

// A one-line operator alert. Goes to one fixed inbox, never to a user.
export async function notifyAdmin(subject: string, lines: string[], link?: string): Promise<void> {
  const body = [...lines, ...(link ? [link] : [])].join("\n");
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[admin] ${subject}: ${body.replaceAll("\n", " | ")}`);
    return;
  }
  try {
    init();
    await sgMail.send({
      to: NOTIFY_EMAIL,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      text: body,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f; margin-bottom: 4px;">${escapeHtml(subject)}</h2>
          ${lines.map((line) => `<p style="margin: 6px 0;">${escapeHtml(line)}</p>`).join("")}
          ${link ? `<p><a href="${link}" style="color: #a94f20;">${link}</a></p>` : ""}
        </div>`,
    });
  } catch (error) {
    console.error("Admin notification failed:", error);
  }
}
