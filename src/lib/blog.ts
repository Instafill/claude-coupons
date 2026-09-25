import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export interface BlogPostAuthor {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  url?: string;
}

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogTableColumn {
  key: string;
  label: string;
}

export interface BlogTableRow {
  [key: string]: string;
}

export interface BlogImage {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
}

export interface BlogPostSection {
  id: string;
  h2: string;
  lead?: string;
  body?: string[];
  bullets?: string[];
  steps?: string[];
  images?: BlogImage[];
  table?: {
    columns: BlogTableColumn[];
    rows: BlogTableRow[];
    caption?: string;
  };
  callout?: {
    type: "tip" | "warning" | "note" | "highlight";
    title: string;
    text: string;
  };
  subsections?: {
    h3: string;
    body: string[];
    bullets?: string[];
    images?: BlogImage[];
    callout?: {
      type: "tip" | "warning" | "note" | "highlight";
      title: string;
      text: string;
    };
  }[];
}

export interface BlogPost {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  category: string;
  tags: string[];
  author: BlogPostAuthor;
  keywords: string[];
  imageAlt: string;
  featured?: boolean;
  sections: BlogPostSection[];
  faqs: BlogFaq[];
}

export const AUTHORS: Record<string, BlogPostAuthor> = {
  alex: {
    name: "Oleksandr G",
    role: "Founder & Developer @ ClaudeCoupons",
    bio: "Developer and creator of ClaudeCoupons. Tracking Anthropic API pricing, referral mechanics, and cloud startup credits.",
    avatar: "/logo-256.png",
    url: "https://x.com/ogamaniuk",
  },
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "claude-promo-codes",
    title: "Claude AI Promo Codes & Discounts: What Actually Works (September 2026)",
    h1: "Claude AI Promo Codes & Discounts: The Verified 2026 Guide",
    metaDescription:
      "Looking for a Claude promo code? We verified every discount and active promotion. Here is the honest truth, the new $250 Cloud Session credit, Opus 5.5 resets, and 7-day Pro guest passes.",
    summary:
      "Anthropic does not offer standard promo codes at checkout, but active in-app promotions are live right now: a $250 Cloud Session credit, Opus 5.5 free limit resets, 7-day Pro guest passes, and $5,000+ in AWS Bedrock credits.",
    publishedAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-25T17:30:00Z",
    readingTime: "10 min read",
    category: "Guides & Discounts",
    tags: [
      "Claude AI",
      "Promo Codes",
      "Cloud Sessions",
      "Claude Code",
      "Opus 5.5",
      "Anthropic",
      "Claude Pro",
      "AWS Bedrock",
    ],
    author: AUTHORS.alex,
    keywords: [
      "claude promo code",
      "claude ai promo code",
      "claude cloud session credits",
      "claude $250 credit",
      "claude opus 5.5 reset",
      "claude promo codes",
      "claude coupon code",
      "claude discount",
      "claude free credits",
      "claude pro promo code",
      "claude code pass",
      "claude for startups",
      "claude aws credits",
      "claude promo code reddit",
    ],
    imageAlt: "Claude AI Promo Codes and Active Discounts Guide",
    featured: true,
    sections: [
      {
        id: "status-matrix",
        h2: "Active Claude Discounts & Promotions (September 2026)",
        lead: "Before spending an hour trying dead codes on aggregator sites, here is the fact-checked status of every Claude offer, in-app promotion, and credit program active right now.",
        table: {
          columns: [
            { key: "deal", label: "Deal / Program" },
            { key: "target", label: "Who It's For" },
            { key: "value", label: "Real Value" },
            { key: "status", label: "Status & Expiry" },
          ],
          rows: [
            {
              deal: "Promo Code at Checkout",
              target: "Anyone buying Claude Pro or Team",
              value: "$0 (Checkout has no coupon field)",
              status: "❌ Does not exist",
            },
            {
              deal: "Claude Cloud Session Credits",
              target: "Existing Pro and Max subscribers",
              value: "$250 bonus credit for Cloud Sessions",
              status: "✅ Active (Claim by Oct 7, 2026)",
            },
            {
              deal: "Opus 5.5 Free Limit Reset",
              target: "Pro and Max users hitting weekly caps",
              value: "Free usage reset to explore Opus 5.5",
              status: "✅ Active (Expires Oct 22, 2026)",
            },
            {
              deal: "Claude Guest Passes",
              target: "New users wanting Claude Pro / Code",
              value: "7 free days of full Claude Pro ($0)",
              status: "✅ Active (Community Exchange)",
            },
            {
              deal: "Usage Credits Volume Discount",
              target: "Pro and Max users needing extra tokens",
              value: "Up to 30% off additional usage credits",
              status: "✅ Active (In-app billing option)",
            },
            {
              deal: "Claude Credit Through AWS",
              target: "Startups & developers on AWS",
              value: "$5,000+ in AWS Activate credits for Bedrock",
              status: "✅ Active (Via AWS Bedrock)",
            },
            {
              deal: "Claude for Startups",
              target: "Early-stage founders building on Claude",
              value: "Direct API credits & priority rate limits",
              status: "✅ Active (Anthropic Program)",
            },
            {
              deal: "Claude for Nonprofits",
              target: "501(c)(3)s, K-12 schools, rural health",
              value: "Team plan at $8/user/mo (60-68% off)",
              status: "✅ Active (Via Goodstack)",
            },
            {
              deal: "Annual Billing Discount",
              target: "All Pro and Team subscribers",
              value: "15% - 20% off monthly subscription",
              status: "✅ Active (Standard billing option)",
            },
            {
              deal: "Fable 5 $100 Usage Credit",
              target: "Pro & Team Standard subscribers",
              value: "$100 one-time transition credit",
              status: "⏳ Expired (Closed Aug 2, 2026)",
            },
          ],
          caption:
            "Verified from live Claude.ai settings dashboards, official Stripe checkout sessions, and AWS Bedrock foundation model pricing.",
        },
      },
      {
        id: "the-truth-about-promo-codes",
        h2: "The Honest Truth About Claude Checkout Promo Codes",
        body: [
          "If you search Google, Reddit, or coupon portals for 'Claude promo code' or 'Claude AI coupon code', you will encounter dozens of sites advertising strings like 'CLAUDE50', 'FALLSAVE20', or 'ANTHROPIC25'.",
          "Here is the reality: Anthropic's checkout page does not have a promo code or coupon field. Claude uses Stripe for subscription billing, and the promo code input has been explicitly disabled across all customer-facing checkout sessions.",
          "Anthropic's own support documentation confirms this in plain English: 'Our Support team cannot issue one-off discounts or coupons.' Any coupon website claiming to have an exclusive 50% discount code for Claude Pro is deceptive.",
        ],
        callout: {
          type: "warning",
          title: "Beware of Coupon Scams",
          text: "Never download browser extensions or provide credit card credentials to third-party sites promising 'unlocked Claude promo codes'. If a site asks you to complete surveys or install software to reveal a code, it is a data-harvesting scam.",
        },
      },
      {
        id: "official-in-app-promos",
        h2: "Live In-App Promotions: $250 Cloud Session Credit & Opus 5.5 Resets",
        lead: "While standard checkout codes don't exist, Anthropic does run direct in-app promotional grants. Right now, there are two major promotions active on Claude.ai that competitors haven't reported yet:",
        subsections: [
          {
            h3: "1. The $250 Cloud Session Bonus Credit (Claim by October 7, 2026)",
            body: [
              "Anthropic has officially launched Cloud Sessions for Claude Code. A cloud session runs your coding agent in a secure, isolated remote environment, allowing you to close your laptop while Claude executes terminal tasks, runs tests, and opens pull requests on your GitHub repository.",
              "To accelerate adoption, Anthropic is offering existing Claude Pro and Claude Max subscribers a promotional $250 bonus credit for cloud sessions, applied directly on top of regular plan limits.",
              "To claim it: navigate to Settings → Usage inside your Claude.ai account. Look for the gift box banner: 'Claim a $250 bonus credit for cloud sessions, on top of your plan limits'.",
            ],
            bullets: [
              "Eligibility: Active Claude Pro and Max subscribers.",
              "Claim Deadline: Must be claimed by 11:59 PM PDT on October 7, 2026.",
              "Credit Expiry: Claimed credits remain valid through 11:59 PM PST on November 4, 2026.",
              "How to use: Connect your GitHub account, choose a repository, and launch a Cloud Session (such as the Default Cloud Environment). Usage burns down from the $250 credit first before counting against regular plan limits.",
              "Restriction: Credits apply exclusively to Cloud Sessions and are not eligible for Projects or Routines.",
            ],
            images: [
              {
                src: "/blog/claude-cloud-session-modal-250.jpg",
                alt: "Claude.ai $250 Cloud Session Promotional Credit Modal",
                caption:
                  "The official $250 Cloud Session promotional modal in Claude.ai settings, active through October 7, 2026.",
              },
              {
                src: "/blog/claude-cloud-session-credits-applied.jpg",
                alt: "Cloud session credits balance showing $249 of $250 left",
                caption:
                  "Verified Cloud Session credit balance ($249 of $250 left, expiring November 4) inside Settings → Usage.",
              },
              {
                src: "/blog/claude-code-cloud-environment.jpg",
                alt: "Claude Code running in Default Cloud Environment on GitHub repo",
                caption:
                  "Claude Code executing in the Default Cloud Environment connected to GitHub, powered by the $250 cloud credit.",
              },
            ],
          },
          {
            h3: "2. Opus 5.5 Free Usage Limit Reset (Expires October 22, 2026)",
            body: [
              "With the release of Opus 5.5, Anthropic introduced a special exploration concession for heavy users.",
              "If you are an active subscriber approaching your weekly limit (such as 95%+ of your weekly cap), Anthropic provides a dedicated hourglass reset button under Settings → Usage: 'Get extra wiggle room to explore Opus 5.5. Expires Oct 22. [Reset for free]'.",
              "Clicking 'Reset for free' instantly refreshes your usage envelope without requiring you to wait until the scheduled Saturday reset or purchase extra credits.",
            ],
            images: [
              {
                src: "/blog/claude-usage-limits-reset.jpg",
                alt: "Claude.ai usage settings showing Opus 5.5 Reset for free button",
                caption:
                  "Settings → Usage showing both the $250 Cloud Session bonus banner and the Opus 5.5 free limit reset.",
              },
            ],
          },
          {
            h3: "3. Up to 30% Off on Usage Credits",
            body: [
              "For teams that exhaust their base plan allocations, Anthropic now allows subscribers to purchase add-on Usage Credits directly in the dashboard.",
              "A volume discount of 'Up to 30% off' is currently available when purchasing credits in higher tiers, enabling uninterrupted sessions without needing to upgrade to higher-tier enterprise contracts.",
            ],
          },
        ],
      },
      {
        id: "the-real-solution-guest-passes",
        h2: "The #1 Free Solution for Individuals: Claude Guest Passes",
        body: [
          "If you are not an existing subscriber and want to use Claude Pro without paying upfront, Anthropic's official referral mechanism is the Claude Code and Cowork Guest Pass.",
          "Every active Claude Pro and Claude Max subscriber holds a recurring allotment of personal guest pass invite links. When shared, each pass grants someone new to paid Claude 7 full days of Claude Pro for $0.",
          "This includes full access to Claude Code, Cowork, higher message limits, and flagship models like Claude 3.5 Sonnet, Claude 3.7, and Opus 5.5. Because most subscribers let their passes sit idle and expire, ClaudeCoupons.com operates a free community exchange.",
          "Subscribers donate their spare passes, and anyone can take a number in our automated wave queue. When a wave opens, you unlock a verified pass link, activate your 7 days directly on claude.ai, and report whether it worked.",
        ],
        callout: {
          type: "tip",
          title: "Unlock 7 Free Days of Claude Pro",
          text: "You do not need to hunt through Twitter or Reddit hoping for an unexpired pass. Take a number on our live Claude board, and as passes are listed, you unlock a personal link directly.",
        },
        steps: [
          "Take a number on the ClaudeCoupons.com homepage using your email address.",
          "When your wave opens, unlock a live guest pass to reveal its personal claude.ai referral link.",
          "Open the link on claude.ai and register your account. The 7-day Pro trial activates directly on Anthropic's servers.",
          "Come back to the board and tap 'It worked!'. This helps keep our community queue fast, clean, and 100% accurate.",
        ],
      },
      {
        id: "startup-cloud-credits",
        h2: "Startup & Developer Credits: $5,000 to $25,000+",
        lead: "If you are a developer, founder, or building a product on Claude's API, you can obtain thousands of dollars in legitimate credits through official cloud and accelerator programs.",
        subsections: [
          {
            h3: "1. Claude Credits via AWS Bedrock ($5,000 - $100,000)",
            body: [
              "Anthropic foundation models are fully hosted and accessible on Amazon Bedrock. Because Bedrock is a native AWS service, AWS Activate credits apply directly to Claude API token consumption.",
              "Early-stage startups can apply for AWS Activate Founders ($1,000 - $5,000 in credits) with zero institutional funding required. Startups associated with approved accelerators or incubators can receive up to $100,000.",
              "If you run Claude through Bedrock's API endpoint, your usage is billed against your AWS Activate credit balance before touching any credit card.",
            ],
            bullets: [
              "AWS Activate Founders: $1,000 - $5,000 for bootstrapped companies.",
              "AWS Activate Portfolio: Up to $100,000 for VC/accelerator-backed startups.",
              "Valid for Anthropic Claude tokens via Amazon Bedrock runtime.",
            ],
          },
          {
            h3: "2. Claude for Startups (Anthropic Direct)",
            body: [
              "Anthropic operates its own native startup initiative. The program grants free first-party Claude API credits and priority rate limit tiers to early-stage teams building on Claude.",
              "Unlike many accelerator programs, VC backing is not strictly required, though teams must demonstrate an active product under development and have been founded within the last four years.",
              "Note: Anthropic's native startup credits are valid exclusively through the first-party Claude Console API (api.anthropic.com) and cannot be transferred to AWS Bedrock or Google Cloud.",
            ],
          },
          {
            h3: "3. Google Cloud for Startups (Gemini & Vertex AI)",
            body: [
              "Google Cloud offers between $2,000 and $100,000 in cloud credits for startups. Claude models are accessible via Vertex AI Model Garden, allowing founders holding Google Cloud credits to tap Anthropic models under their credit envelope.",
            ],
          },
        ],
      },
      {
        id: "nonprofit-and-education",
        h2: "Claude for Nonprofits, Teachers & Academic Labs",
        lead: "Anthropic provides several structured discount tracks for social impact organizations, academic researchers, and educators.",
        subsections: [
          {
            h3: "Claude for Nonprofits ($8/user/month)",
            body: [
              "For registered 501(c)(3) organizations, international charities, and qualifying mission-based clinics, Anthropic slashes the price of the Claude Team plan from the standard $20–$25 down to just $8 per user per month for organizations with under 20 seats.",
              "Eligibility verification is processed smoothly through Anthropic's nonprofit validation partner, Goodstack. Larger nonprofit deployments can negotiate custom terms through Anthropic's enterprise social impact team.",
            ],
          },
          {
            h3: "Claude Corps Fellowship ($150M Program)",
            body: [
              "Announced in mid-2026, the Claude Corps is Anthropic's $150 million initiative that embeds trained AI specialists inside qualifying nonprofits for 12 months. Fellows receive an $85,000 salary with benefits covered, and the host nonprofit receives a $10,000 implementation grant alongside up to $2,500 in Claude software licenses and API credits.",
            ],
          },
          {
            h3: "Discounted Team Plan for Scientific Research Labs",
            body: [
              "Principal Investigators (PIs) at accredited academic institutions and nonprofit scientific labs can enroll in Anthropic's discounted research lab program. Labs with under 75 members can be verified directly by the PI.",
              "Eligible scientific domains include biomedicine, physics, chemistry, computer science, and mathematics. In addition to lower seat costs, participants receive access to Anthropic's dedicated Claude Science workspace.",
            ],
          },
          {
            h3: "AI for Science Research Grants",
            body: [
              "Individual academic researchers can apply for direct Claude API research credits through the AI for Science program. Applications are reviewed on the first Monday of every month. Credits apply to first-party API workloads exploring scientific problems.",
            ],
          },
        ],
      },
      {
        id: "how-to-lower-claude-bills",
        h2: "4 Structural Ways to Cut Your Claude Costs Today",
        lead: "Even if you do not qualify for startup or nonprofit programs, you can dramatically lower what you spend on Claude by leveraging these four native levers.",
        subsections: [
          {
            h3: "1. Annual Billing (15% - 20% Instant Savings)",
            body: [
              "Switching from monthly to annual billing provides an immediate recurring discount without needing any coupon code:",
              "Claude Pro: $17/month billed annually ($200/year upfront) vs. $20/month billed monthly — an instant 15% discount.",
              "Claude Team: $20/user/month billed annually vs. $25/user/month monthly — a 20% savings per seat.",
            ],
          },
          {
            h3: "2. Model Tier Optimization (Up to 10x Cost Reduction)",
            body: [
              "If you use Claude via API or API-driven developer tools, routing queries to the right model tier is the single most powerful cost-cutting lever in AI engineering.",
              "Claude Haiku 3.5 / 4.5: ~$1.00 per million input tokens / $5.00 output.",
              "Claude Sonnet 3.5 / 3.7: ~$3.00 per million input tokens / $15.00 output.",
              "Claude Opus 5 / 5.5: ~$15.00 per million input tokens / $75.00 output.",
              "Routing routine summarization, data extraction, or classification to Haiku rather than Opus reduces your token bill by 15x instantly.",
            ],
          },
          {
            h3: "3. Anthropic Prompt Caching (90% Off Input Tokens)",
            body: [
              "Anthropic's native Prompt Caching allows you to cache long system prompts, documentation files, or codebase contexts. Cache hits receive a 90% discount on input tokens and cut latency by up to 80%.",
              "For developer tools, agentic workflows, and document analysis, prompt caching turns a $100 API bill into a $10 bill.",
            ],
          },
          {
            h3: "4. Message Batches API (50% Off Everything)",
            body: [
              "If your workload does not require immediate sub-second responses (e.g., nightly batch data processing, bulk code refactoring, content moderation), Anthropic's Message Batches API cuts both input and output pricing in half (50% off standard rates) with results delivered within 24 hours.",
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        q: "What is the new $250 Claude Cloud Session credit?",
        a: "Anthropic is currently offering active Claude Pro and Max subscribers a promotional $250 bonus credit to use in Cloud Sessions for Claude Code. It allows your coding agent to run in a secure cloud environment connected to GitHub. It must be claimed in Settings → Usage by 11:59 PM PDT on October 7, 2026, and expires November 4, 2026.",
      },
      {
        q: "How does the Opus 5.5 free limit reset work?",
        a: "If you are approaching your weekly usage limit on Claude.ai, Anthropic has an active promotion running through October 22, 2026, offering a free reset button under Settings → Usage to give subscribers extra wiggle room to explore Opus 5.5.",
      },
      {
        q: "Is there a working Claude promo code for checkout in September 2026?",
        a: "No. Anthropic does not issue standard coupon codes or promo codes, and the Claude checkout screen has no promo code box. For new users, the only official way to try Claude Pro for free without paying upfront is through an unredeemed Claude Guest Pass.",
      },
      {
        q: "How does a Claude Guest Pass work?",
        a: "Claude Pro and Max subscribers receive personal guest pass referral links. Each pass gives a new user 7 free days of Claude Pro with Claude Code and Cowork included. On ClaudeCoupons.com, subscribers list their extra passes so they don't go to waste, and you can unlock one through our queue.",
      },
      {
        q: "Can startups get free Claude credits?",
        a: "Yes. Startups can obtain $1,000 to $100,000 in AWS Activate credits that cover Claude token usage on Amazon Bedrock, or apply directly to the official Claude for Startups program for first-party API credits and priority rate limits.",
      },
      {
        q: "Is there a student or education discount for Claude?",
        a: "Anthropic does not offer an individual student discount code. However, institutions can sign up for 'Claude for Higher Education', and K-12 educators can access 'Claude for Teachers'. For individual students, the permanently free Claude tier is available with no payment details required, or you can use a 7-day guest pass.",
      },
      {
        q: "How much is the Claude for Nonprofits discount?",
        a: "Qualifying 501(c)(3) nonprofits, public K-12 schools, and community healthcare providers can get Claude Team for $8 per user per month (compared to the regular $20-$25/mo), verified through Goodstack for organizations with fewer than 20 seats.",
      },
      {
        q: "Do coupon codes on RetailMeNot or Reddit work for Claude?",
        a: "No. Aggregator sites display fake or expired strings ('CLAUDE20', 'NEWUSER') to harvest search traffic and affiliate cookies. Stripe checkout on claude.ai has no promo code entry field whatsoever.",
      },
      {
        q: "What is the cheapest way to pay for Claude Pro?",
        a: "Choose annual billing. Paying annually costs $17/month ($200/year upfront) instead of $20/month monthly, saving 15% immediately.",
      },
      {
        q: "How do I share my extra Claude guest passes?",
        a: "If you have an active Claude Pro or Max subscription, run `/passes` in Claude Code or open your Claude account settings to copy your personal referral link. You can submit it to ClaudeCoupons.com to help another developer learn and build.",
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRecentPosts(limit = 3, excludeSlug?: string): BlogPost[] {
  return getAllPosts()
    .filter((p) => p.slug !== excludeSlug)
    .slice(0, limit);
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function getAuthorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}
