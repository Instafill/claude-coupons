import sgMail from "@sendgrid/mail";

const FROM_EMAIL = process.env.EMAIL_FROM || "alex@botmakers.net";
const FROM_NAME = "Claude Coupons";

let initialized = false;

function init() {
  if (!initialized) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    initialized = true;
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
