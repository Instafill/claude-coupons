// Shown on the page and emitted as FAQPage schema. Every answer is checkable against
// Anthropic's guest pass article, which the page links.
export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is there an official Claude coupon code?",
    a: "No. Anthropic does not publish coupon or promo codes for Claude. The only legitimate way to get free access to Claude's paid plan is a guest pass - a personal invite a Pro or Max subscriber shares. That is exactly what is exchanged on this site.",
  },
  {
    q: "What is a Claude Code pass?",
    a: "A guest pass from Anthropic's referral program. It gives someone new to paid Claude 7 days of the Claude Pro plan for free, including Claude Code (the terminal coding agent) and Cowork. Every Pro and Max subscriber gets a small number of passes to share.",
  },
  {
    q: "Are Claude Code passes really free?",
    a: "The 7 days are free, but Anthropic asks for a payment card at signup, and the account converts to a paid Claude Pro subscription when the week ends unless you cancel first. Cancel anytime during the trial and you pay nothing.",
  },
  {
    q: "Who can claim a Claude pass?",
    a: "Only people who have never had a paid Claude subscription. If you already subscribe to Claude Pro or Max, or did in the past, the pass will not apply to your account.",
  },
  {
    q: "How do I claim a pass from this site?",
    a: "Sign in with Google or your email, unlock a pass from the board, and open the link. You'll land on claude.ai's invite page and sign up there. Afterwards, tell us whether the pass worked - that answer is what keeps dead links off the board.",
  },
  {
    q: "Why do I have to sign in to see a pass link?",
    a: "Two reasons: it stops bots from scraping every link the moment it is listed, and it lets us log who unlocked each pass so exhausted links get retired quickly. One click with Google, or one email - no password to invent.",
  },
  {
    q: "How do I share my own Claude Code passes?",
    a: "If you subscribe to Claude Pro or Max, run /passes in Claude Code or open Settings in the Claude apps to find your invite link, then list it here. Each subscriber has a limited number of passes; when yours run out, mark the listing exhausted from your dashboard.",
  },
  {
    q: "What do I get for sharing my passes?",
    a: "When someone you invited stays subscribed after their free week, Anthropic credits you $10 in usage credits (per their referral terms). Listing here simply gets your link in front of people actively looking for a pass.",
  },
];
