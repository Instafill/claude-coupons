// Shown on the page and emitted as FAQPage schema. Every answer is checkable against
// Anthropic's guest pass article, which the page links.
export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is there an official Claude coupon code?",
    a: "No. Anthropic does not publish coupon codes, promo codes or discount codes for Claude. The only legitimate way to get free access to Claude's paid plan is a guest pass - a personal invite a Pro or Max subscriber shares. That is exactly what is exchanged on this site.",
  },
  {
    q: "Is a Claude Code coupon the same thing as a Claude pass?",
    a: "In practice, yes. There is no such thing as a Claude Code coupon code you type at checkout, so when people search for one they are looking for what a guest pass already does: a free week of Claude Pro with Claude Code included. The passes on this board are that.",
  },
  {
    q: "Is there a Claude AI coupon or discount?",
    a: "The only real Claude AI coupon is a guest pass. Anthropic runs no discount codes, no seasonal sales and no student pricing on Claude Pro, and a Claude AI pass from a subscriber is the one supported way to use the paid plan without paying for the first week.",
  },
  {
    q: "What is a Claude Code pass?",
    a: "A guest pass from Anthropic's referral program. It gives someone new to paid Claude 7 days of the Claude Pro plan for free, including Claude Code (the terminal coding agent) and Cowork. Every Pro and Max subscriber gets a small number of passes to share.",
  },
  {
    q: "How do I redeem a Claude coupon?",
    a: "Sign in here, unlock a pass to reveal its claude.ai invite link, then open it. You redeem the pass on claude.ai itself by creating your account there - nothing is entered on this site. Afterwards, tell us whether it worked so the board stays accurate.",
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
    q: "Is there a Claude Groupon deal?",
    a: "No - Groupon does not sell Claude subscriptions, and searches for a Claude Groupon are usually after a Claude coupon. Anthropic sells Claude Pro only at its own price, so a shared guest pass is the only free week available.",
  },
  {
    q: "Why do I have to sign in to see a pass link?",
    a: "Two reasons: it stops bots from scraping every link the moment it is listed, and it lets us log who unlocked each pass so exhausted links get retired quickly. One click with Google, or one email - no password to invent.",
  },
  {
    q: "How do I share my own Claude Code passes?",
    a: "If you subscribe to Claude Pro or Max, run /passes in Claude Code or open Settings in the Claude apps to find your invite link, then list it here. Each subscriber has a limited number of passes, and a listing retires itself once three people report claiming it.",
  },
  {
    q: "What do I get for sharing my passes?",
    a: "You give someone who may not be able to afford Claude Pro a full week to experience it. A pass that might otherwise expire can help another person learn, build, create or solve a real problem. As a secondary benefit, Anthropic credits you $10 in Claude usage when a referral stays subscribed after the free week.",
  },
];
