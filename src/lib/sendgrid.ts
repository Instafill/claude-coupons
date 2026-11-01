import sgMail from "@sendgrid/mail";

import { aNoun, Deal, capitalize, dealLink, numberWord } from "@/lib/deals";
import { KITCUT, KITCUT_FILMS, type KitCutFilm, filmStill, filmUrl, kitcutUrl } from "@/lib/kitcut";

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
  deal: Deal;
  code: string;
  submitterEmail?: string;
  submitterName?: string;
  livePasses: number;
}): Promise<void> {
  const { deal } = pass;
  // muse.ai listings come in often enough that the alert is noise; its board goes unannounced.
  if (deal.slug === "muse") return;
  const url = dealLink(deal, pass.code);
  const who = pass.submitterName
    ? pass.submitterEmail
      ? `${pass.submitterName} (${pass.submitterEmail})`
      : pass.submitterName
    : pass.submitterEmail || "an anonymous contributor";

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[notify] new ${deal.slug} ${deal.noun} ${pass.code} from ${who}`);
    return;
  }

  try {
    init();
    await sgMail.send({
      to: NOTIFY_EMAIL,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `New ${deal.name} ${deal.noun} listed by ${pass.submitterEmail || "an anonymous contributor"}`,
      text: `${who} listed ${aNoun(deal)}.\n\n${pass.code}\n${url}\n\nLive ${deal.nounPlural} on the ${deal.name} board: ${pass.livePasses}\nhttps://claudecoupons.com${deal.path}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f; margin-bottom: 4px;">New ${deal.name} ${deal.noun} on the board</h2>
          <p style="color: #6e6a63; margin-top: 0;">Listed by ${who}</p>
          <p style="font-family: ui-monospace, Menlo, monospace; background: #f0ede6; padding: 10px 14px; border-radius: 8px; word-break: break-all;">
            <a href="${url}" style="color: #a94f20;">${url}</a>
          </p>
          <p style="color: #6e6a63; font-size: 14px;">
            Code: <strong>${pass.code}</strong><br />
            Live ${deal.nounPlural} on the board: <strong>${pass.livePasses}</strong> &middot;
            <a href="https://claudecoupons.com${deal.path}" style="color: #a94f20;">open the board</a>
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

// Our other product (src/lib/kitcut.ts), as a card at the foot of the watch confirmation: after
// the one thing the email is for, so confirming stays the obvious action. The showcased films are
// a 2x2 table of stills, each linking to its film on kitcut.ai: a table because mail clients
// ignore grid and flex. Images are absolute because a mail client has no base URL.
const KITCUT_EMAIL_TEXT = `

---
${KITCUT.name}: ${KITCUT.headline} ${KITCUT.uses}
${kitcutUrl("email")}`;
function kitcutEmailHtml(): string {
  const url = kitcutUrl("email");
  const cell = (f: KitCutFilm) => `
                <td width="50%" valign="top" style="padding: 6px;">
                  <a href="${filmUrl(f, "email")}" style="text-decoration: none; color: #1f1e1d;"><img src="https://claudecoupons.com${filmStill(f)}" alt="${f.company}, a ${f.kind.toLowerCase()} episode made with KitCut" width="240" style="display: block; width: 100%; height: auto; border: 0; border-radius: 6px;">
                  <span style="display: block; margin-top: 5px; font-size: 13px; font-weight: 700;">${f.kind}</span>
                  <span style="display: block; font-size: 12px; color: #6e6a63;">${f.company}</span></a>
                </td>`;
  const rows = [KITCUT_FILMS.slice(0, 2), KITCUT_FILMS.slice(2, 4)]
    .map((r) => `
              <tr>${r.map(cell).join("")}
              </tr>`)
    .join("");
  return `
          <div style="margin-top: 28px; border: 2px solid #c9642f; border-radius: 12px; overflow: hidden;">
            <div style="padding: 14px 16px 4px;">
              <p style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1f1e1d;">${KITCUT.headline}</p>
              <p style="margin: 0; font-size: 14px; color: #6e6a63;">${KITCUT.pitch} <strong style="color: #1f1e1d;">${KITCUT.uses}</strong></p>
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 6px 10px;">${rows}
            </table>
            <div style="padding: 4px 16px 16px;">
              <a href="${url}" style="display: inline-block; background: #1f1e1d; color: #fff; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">${KITCUT.cta} &rarr;</a>
            </div>
          </div>`;
}

// Asks someone to confirm they want alerts before a single one is sent. The confirmation
// step is not ceremony: unconfirmed bulk mail from this domain would put the sign-in links
// above at risk, and those are the one email this site cannot afford to have filtered.
export async function sendWatchConfirmation(
  email: string,
  deal: Deal,
  confirmUrl: string
): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[watch-confirm] ${email}: ${confirmUrl}`);
    return;
  }

  // "again" is a claim about the past. On a board still waiting for its first listing it
  // would be the one false word in an email whose whole job is to be trusted.
  const again = deal.awaitingFirstListing ? "" : " again";
  // What they will get, said the way it happens: a draw invite, or their turn in a wave.
  const promise = deal.liveDraw
    ? "You'll get an invite to a live draw when passes have been listed and you're near the front of the line - at most one email a day, never a newsletter."
    : `You'll get an email when ${deal.mailDescription} are listed and your turn in the line comes up - never a newsletter.`;
  const ask = deal.liveDraw
    ? `Someone asked us to put this address in the line for ${deal.mailDescription} at claudecoupons.com.`
    : `Someone asked us to email this address when claudecoupons.com has ${deal.mailDescription}${again}.`;

  try {
    init();
    await sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: deal.liveDraw
        ? `Confirm your place in line for ${deal.name} ${deal.nounPlural}`
        : `Confirm you want ${deal.name} ${deal.noun} alerts`,
      text: `${ask}\n\nConfirm here:\n${confirmUrl}\n\n${promise} If this wasn't you, ignore this email and nothing further will be sent.${KITCUT_EMAIL_TEXT}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
          <h2 style="color: #c9642f;">One click and you&rsquo;re ${deal.liveDraw ? "in line" : "watching"}</h2>
          <p>${ask}</p>
          <p style="margin: 24px 0;">
            <a href="${confirmUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">${deal.liveDraw ? "Confirm my place" : "Confirm and start watching"}</a>
          </p>
          <p style="color: #6e6a63; font-size: 13px;">
            ${promise.replace(/'/g, "&rsquo;")} We don&rsquo;t share your address, and every email carries a
            one-click link to stop.
          </p>
          <p style="color: #6e6a63; font-size: 13px;">If this wasn&rsquo;t you, ignore this email &mdash; nothing further will be sent.</p>${kitcutEmailHtml()}
        </div>`,
    });
  } catch (error) {
    console.error("Watch confirmation send failed:", error);
  }
}

export interface AlertRecipient {
  email: string;
  enterUrl: string;
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
export async function sendPassAlerts(
  recipients: AlertRecipient[],
  deal: Deal,
  waiting: number,
  wave: number
): Promise<string[]> {
  if (!process.env.SENDGRID_API_KEY) {
    for (const recipient of recipients) {
      console.log(`[pass-alert] ${recipient.email}: enter ${recipient.enterUrl} stop ${recipient.stopUrl}`);
    }
    return recipients.map((recipient) => recipient.email);
  }

  init();
  const delivered: string[] = [];

  for (let i = 0; i < recipients.length; i += MAX_ALERT_BATCH) {
    const chunk = recipients.slice(i, i + MAX_ALERT_BATCH);
    const results = await Promise.allSettled(
      chunk.map((r) => sendOneAlert(r, deal, waiting, wave))
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") delivered.push(chunk[index].email);
      else console.error("Pass alert send failed:", result.reason);
    });
  }

  return delivered;
}

export interface InviteRecipient extends AlertRecipient {
  /** Their IANA zone, from where they last were (lib/geo.ts), for the time in their own words. */
  timezone?: string;
}

export interface DrawInvite {
  id: string;
  drawAt: Date;
  spots: number;
  links: number;
  invited: number;
  claimSeconds: number;
  /** A show: the whole line was invited, and everyone in the room has the same chance. */
  everyone?: boolean;
}

// Pictures in the show invite. Served from the site's public/email folder, so they exist once
// the release that sends the mail is deployed. The guest-pass picture (what a winner sees on
// Claude's side) is public/email/guest-pass.jpg; both ship in the same release as this code.
const EMAIL_IMAGES = "https://claudecoupons.com/email";
// The version tag steps past a 404 the CDN cached before the picture was deployed.
const ROOM_PICTURE = `${EMAIL_IMAGES}/live-draw-room.png?v=2`;
const GUEST_PASS_PICTURE: string = `${EMAIL_IMAGES}/guest-pass.jpg`;

// The live draw invite: one email per draw, to the front of the line. Same shape as an alert
// (one message each, for its own List-Unsubscribe header), and the same contract with the
// caller: it returns who was actually accepted.
export async function sendDrawInvites(
  recipients: InviteRecipient[],
  deal: Deal,
  draw: DrawInvite
): Promise<string[]> {
  if (!process.env.SENDGRID_API_KEY) {
    for (const recipient of recipients) {
      console.log(`[draw-invite] ${recipient.email}: enter ${recipient.enterUrl}`);
    }
    return recipients.map((recipient) => recipient.email);
  }

  init();
  const delivered: string[] = [];
  for (let i = 0; i < recipients.length; i += MAX_ALERT_BATCH) {
    const chunk = recipients.slice(i, i + MAX_ALERT_BATCH);
    const results = await Promise.allSettled(chunk.map((r) => sendOneInvite(r, deal, draw)));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") delivered.push(chunk[index].email);
      else console.error("Draw invite send failed:", result.reason);
    });
  }
  return delivered;
}

/**
 * "Wed 14:00 UTC", and the same moment in their own zone when we know it and it differs.
 * With the weekday, because 14:00 UTC is already tomorrow in Sydney: "today" would be wrong
 * for somebody.
 */
function drawTime(at: Date, timezone?: string): { utc: string; local?: string } {
  const format = (timeZone: string) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(at);
  const utc = `${format("UTC")} UTC`;
  if (!timezone) return { utc };
  try {
    const local = format(timezone);
    return local === format("UTC") ? { utc } : { utc, local: `${local} your time` };
  } catch {
    // An unknown zone name from an old row: UTC alone is still true.
    return { utc };
  }
}

/** A Google Calendar "add event" link: works from any mail client, no attachment. */
function calendarUrl(deal: Deal, draw: DrawInvite, roomUrl: string): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(draw.drawAt.getTime() - 5 * 60 * 1000);
  const end = new Date(draw.drawAt.getTime() + 15 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${deal.name} live draw - claudecoupons.com`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `Be in the room when the draw starts: ${roomUrl}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function sendOneInvite(recipient: InviteRecipient, deal: Deal, draw: DrawInvite): Promise<unknown> {
  if (draw.everyone) return sendOneShowInvite(recipient, deal, draw);
  const { email, enterUrl, stopUrl, timezone } = recipient;
  const time = drawTime(draw.drawAt, timezone);
  const when = time.local ? `${time.utc} (${time.local})` : time.utc;
  const spots = `${draw.spots} ${draw.spots === 1 ? "spot" : "spots"}`;
  const links = `${draw.links} ${deal.name} ${draw.links === 1 ? "link" : "links"}`;
  // The calendar entry carries the room's plain address, not the signed-in link: a calendar
  // event gets shared and synced, and the room offers a sign-in to anyone invited.
  const roomUrl = `https://claudecoupons.com/draw/${draw.id}`;
  const others = draw.invited - 1;
  const how = `Open the room before it starts and join with your first name. Winners are drawn from the people in the room. A winner has ${draw.claimSeconds} seconds to claim, and any spot that isn't claimed is re-drawn straight away among the people still there, so stay until the room closes.`;
  const miss = `Can't make it? You keep your place in line. Miss three invites and your number moves to the back.`;

  return sgMail.send({
    to: email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `You're invited to a live draw, ${time.local ?? time.utc}: ${spots}, each a free week of Claude Pro`,
    headers: {
      "List-Unsubscribe": `<${stopUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: `You're invited to a live draw.\n\nWhen: ${when}\nWhat: ${links}, ${spots}. Each spot is a free week of Claude Pro.\nWho: you and ${others} other${others === 1 ? "" : "s"} from the front of the line.\n\nOpen the room: ${enterUrl}\nAdd it to your calendar: ${calendarUrl(deal, draw, roomUrl)}\n\n${how}\n\n${miss}\n\nStop these emails: ${stopUrl}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
        <h2 style="color: #c9642f; margin-bottom: 4px;">You&rsquo;re invited to a live draw</h2>
        <p style="margin-top: 0; font-size: 17px;"><strong>${when}</strong></p>
        <p>${links}, <strong>${spots}</strong>. Each spot is a free week of Claude Pro. You and ${others} other${others === 1 ? "" : "s"} from the front of the line are invited.</p>
        <p style="margin: 24px 0;">
          <a href="${enterUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open the draw room</a>
          &nbsp;
          <a href="${calendarUrl(deal, draw, roomUrl)}" style="color: #a94f20; font-size: 14px;">Add to calendar</a>
        </p>
        <p style="color: #6e6a63; font-size: 14px;">${how}</p>
        <p style="color: #6e6a63; font-size: 14px;">${miss}</p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
      </div>`,
  });
}

/** The show invite as subject, text and HTML. Separate from sending so it can be previewed. */
export function showInviteContent(
  { enterUrl, stopUrl, timezone }: Omit<InviteRecipient, "email">,
  deal: Deal,
  draw: DrawInvite
): { subject: string; text: string; html: string } {
  const time = drawTime(draw.drawAt, timezone);
  const when = time.local ? `${time.local} (${time.utc})` : time.utc;
  const roomUrl = `https://claudecoupons.com/draw/${draw.id}`;
  const calendar = calendarUrl(deal, draw, roomUrl);
  const everyone = draw.invited.toLocaleString("en-US");
  const spots = `${draw.spots} ${draw.spots === 1 ? "spot" : "spots"}`;

  const intro = `A Claude subscriber shared a guest pass with us. It works for ${numberWord(draw.spots)} people, so we're giving it away in a live draw: ${spots}, each a free week of Claude Pro.`;
  const fair = `We've invited all ${everyone} people waiting for a Claude pass. Your place in line doesn't count for this one: everyone in the room when the draw starts has exactly the same chance.`;
  const steps = [
    "Open the room before it starts and join with your first name. The room shows your first name and city.",
    `When the countdown hits zero, ${numberWord(draw.spots)} winners are picked at random, live, from the people in the room.`,
    `A winner has ${draw.claimSeconds} seconds to press "Get my pass". If they don't, the spot is drawn again straight away among the people still there, so stay until the room closes.`,
    "Win, and the guest pass link is yours, right there on the page. Claude asks for a card when you start the free week; cancel within 7 days and you pay nothing.",
  ];
  const miss = "Can't come? Nothing lost. You keep your place in line, and missing this draw doesn't count against you.";
  const more = "More links come in from Claude subscribers every week, and each one becomes a draw.";

  const button = (href: string, label: string) =>
    `<a href="${href}" style="display: inline-block; background: #c9642f; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">${label}</a>`;
  const esc = (t: string) => t.replace(/'/g, "&rsquo;").replace(/"([^"]+)"/g, "&ldquo;$1&rdquo;");

  return {
    subject: `Live draw, ${time.local ?? time.utc}: ${draw.spots} Claude Pro passes, same chance for everyone`,
    text: [
      "You're invited to a live draw.",
      `When: ${when}`,
      intro,
      `Everyone has the same chance. ${fair}`,
      `How it works:\n${steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
      miss,
      `Open the draw room: ${enterUrl}`,
      `Add it to your calendar: ${calendar}`,
      more,
      `Live draw sponsored by KitCut.ai: ${KITCUT.headline} ${kitcutUrl("draw-email")}`,
      `Stop these emails: ${stopUrl}`,
    ].join("\n\n"),
    html: `
      <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1f1e1d; font-size: 15px; line-height: 1.5;">
        <span style="display: none; max-height: 0; overflow: hidden;">All ${everyone} people waiting for a Claude pass are invited, and everyone in the room has the same chance.</span>
        <a href="${kitcutUrl("draw-email")}" style="display: block; margin: 0 0 18px; padding: 7px 12px; border: 1px solid #e6e1d8; border-radius: 8px; font-size: 13px; color: #6e6a63; text-decoration: none; text-align: center;"><img src="https://claudecoupons.com${KITCUT.logo}" width="14" height="14" alt="" style="vertical-align: -2px; border-radius: 3px;">&nbsp; Live draw sponsored by <strong style="color: #1f1e1d;">KitCut.ai</strong> &middot; ${KITCUT.headline} <span style="color: #a94f20; font-weight: 600;">${KITCUT.cta} &rarr;</span></a>
        <p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #a94f20;">Live draw &middot; Claude Pro</p>
        <h1 style="margin: 4px 0 2px; font-size: 26px; line-height: 1.2;">You&rsquo;re invited to a live draw</h1>
        <p style="margin: 0 0 18px; font-size: 18px;"><strong>${when}</strong></p>
        <p style="margin: 0 0 20px;">${button(enterUrl, "Open the draw room")}&nbsp;&nbsp;<a href="${calendar}" style="color: #a94f20; font-size: 14px;">Add to calendar</a></p>
        <p>${esc(intro).replace(`${spots}, each a free week of Claude Pro`, `<strong>${spots}, each a free week of Claude Pro</strong>`)}</p>
        <div style="margin: 18px 0; padding: 14px 16px; border-radius: 12px; background: #eaf6ef; color: #1d6b43;">
          <strong>Everyone has the same chance.</strong> ${esc(fair)}
        </div>
        <p style="margin: 18px 0 6px; font-weight: 600;">How it works</p>
        <ol style="margin: 0; padding-left: 20px;">
          ${steps.map((step) => `<li style="margin-bottom: 6px;">${esc(step)}</li>`).join("\n          ")}
        </ol>
        <p style="margin-top: 14px;">${esc(miss)}</p>
        <a href="${enterUrl}" style="display: block; margin: 22px 0 6px;"><img src="${ROOM_PICTURE}" width="560" alt="The live draw room: everyone who joined, on a grid and a world map, while a spot is drawn" style="display: block; width: 100%; max-width: 560px; height: auto; border: 1px solid #e6e1d8; border-radius: 12px;"></a>
        <p style="margin: 0 0 18px; color: #6e6a63; font-size: 13px;">The draw room: everyone who joined, where they&rsquo;re from, and each pick as it happens.</p>${
          GUEST_PASS_PICTURE
            ? `
        <img src="${GUEST_PASS_PICTURE}" width="560" alt="What a winner sees after opening the link: Claude's guest pass page, a free week" style="display: block; width: 100%; max-width: 560px; height: auto; border: 1px solid #e6e1d8; border-radius: 12px;">
        <p style="margin: 6px 0 18px; color: #6e6a63; font-size: 13px;">What a winner sees when they open their link.</p>`
            : ""
        }
        <p style="margin: 22px 0;">${button(enterUrl, "Open the draw room")}</p>
        <p style="color: #6e6a63; font-size: 14px;">${esc(more)}</p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
      </div>`,
  };
}

function sendOneShowInvite({ email, ...links }: InviteRecipient, deal: Deal, draw: DrawInvite): Promise<unknown> {
  const { subject, text, html } = showInviteContent(links, deal, draw);
  return sgMail.send({
    to: email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    headers: {
      "List-Unsubscribe": `<${links.stopUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text,
    html,
  });
}

function sendOneAlert(
  { email, enterUrl, stopUrl }: AlertRecipient,
  deal: Deal,
  waiting: number,
  wave: number
): Promise<unknown> {
  // An open board has no turns to take: the code is on the board in full for everyone, so
  // the mail only says it has arrived.
  if (deal.openBoard) {
    return sgMail.send({
      to: email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `A new ${deal.name} ${deal.noun} is on the board`,
      headers: {
        "List-Unsubscribe": `<${stopUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      text: `${capitalize(aNoun(deal))} for ${deal.name} was just listed, and it is shown in full on the board - no queue, nothing to unlock.\n\nSee it: ${enterUrl}\n\nStop these emails: ${stopUrl}`,
      html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
        <h2 style="color: #c9642f;">A new ${deal.name} ${deal.noun} is up</h2>
        <p>It was just listed and is shown in full on the board - no queue, nothing to unlock.</p>
        <p style="margin: 24px 0;">
          <a href="${enterUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">See it</a>
        </p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
      </div>`,
    });
  }

  // Honest urgency: this went to your wave only, and the wave behind you is minutes away.
  const crowd = `Wave ${wave}: you and ${waiting - 1} other${waiting === 2 ? "" : "s"} at the front of the queue.`;
  const rule = `${capitalize(numberWord(deal.unlocksPerListing))} unlocks and the ${
    deal.noun
  } is finished. The next wave opens in five minutes.`;
  return sgMail.send({
    to: email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Your turn: a ${deal.name} ${deal.noun} is on the board`,
    // One-click unsubscribe. The POST variant is what Gmail's own "unsubscribe" button
    // calls; the mailto-free header list is what marks this as bulk mail honestly.
    headers: {
      "List-Unsubscribe": `<${stopUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: `It is your turn. A ${deal.name} ${deal.noun} is on the board.\n\nUnlock it: ${enterUrl}\n\n${crowd} ${rule} The link above opens the board with you already signed in. Let it go and you keep your place for the next ${deal.noun}; let three go and your number moves to the back.\n\nStop these emails: ${stopUrl}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1f1e1d;">
        <h2 style="color: #c9642f;">It is your turn</h2>
        <p>A ${deal.name} ${deal.noun} is on the board. ${crowd}</p>
        <p>${rule}</p>
        <p style="margin: 24px 0;">
          <a href="${enterUrl}" style="display: inline-block; background: #c9642f; color: #fff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Unlock it</a>
        </p>
        <p style="color: #6e6a63; font-size: 14px;">
          The button opens the board with you already signed in. Let this one go and you keep your place for
          the next ${deal.noun}; let three go and your number moves to the back.
        </p>
        <p style="color: #6e6a63; font-size: 13px;">
          <a href="${stopUrl}" style="color: #6e6a63;">Stop these emails</a> &mdash; one click, no questions.
        </p>
      </div>`,
  });
}
