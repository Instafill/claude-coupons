// Every brand the board runs, and everything that differs between them.
//
// The machinery underneath is one machine: someone lists a code, everyone else takes a
// number, waves open, the first to arrive unlock it and say whether it worked. What
// changes from Claude to Waymo to Uber to muse.ai is only the words, the link and the
// arithmetic - so all of that lives here, and nothing else in the codebase names a brand.
//
// Deliberately free of RegExp, functions and anything else that cannot cross into a client
// component: the board, the join form and the submit form all render from these objects, so
// a Deal has to survive serialization. Patterns are strings, compiled where they are used.

/** Stored on every Pass and Membership row. Never change one - rows carry it forever. */
export const DEAL_SLUGS = [
  "claude",
  "waymo",
  "uber",
  "muse",
  "pokemongo",
  "fireflies",
  "chatgpt",
  "grok",
] as const;
export type DealSlug = (typeof DEAL_SLUGS)[number];

export interface Deal {
  slug: DealSlug;
  /** The brand as it is written on the app's own screens: "Uber", "muse.ai". */
  name: string;
  /** Where this board lives. Claude's is the home page. */
  path: string;
  /** What one listing is called, in the brand's own language: a pass, a code, an invite. */
  noun: string;
  nounPlural: string;
  /** The verb on the board's button once a number is in hand. */
  unlockLabel: string;

  /** One line, present tense, what the person claiming it receives. */
  reward: string;
  /** What the person who listed it receives when someone uses it. Empty when nothing. */
  giverReward: string;
  /** The single sentence used as the page description's first clause and the hub blurb. */
  summary: string;
  /** How the mail names what someone signed up for. Its own field rather than a phrase
      built from name and noun, so each brand's alerts read the way that brand's alerts
      have always read. */
  mailDescription: string;

  // --- the link ---
  /** Personal referral URL built from the code, `{code}` substituted. Empty when the brand
      has no such link and the code is typed into the app instead. */
  linkTemplate: string;
  /** Where the code is typed when there is no link - the app's own front door. */
  redeemUrl: string;
  /** Said on the card, in the app's own navigation words. */
  redeemHint: string;
  /** Whether the claimer needs the code itself in hand, not just the link. */
  needsCode: boolean;
  /** Printed before the code on the board, so a listing looks like what it is. */
  displayPrefix: string;

  // --- what a submitter pastes ---
  /** Where a subscriber finds their own code, in the app's own navigation words. */
  findYourCode: string;
  /** Anchored source of the bare-code pattern, compiled in parseDealCode. */
  codePattern: string;
  /** A real-shaped example for the form's placeholder. Never a live code. */
  codeExample: string;
  /** Bare codes are accepted only where the app hands out a bare code. Claude hands out a
      URL, and requiring the whole URL is what keeps a guessed token off that board. */
  acceptsBareCode: boolean;
  /** Codes are stored the way the app prints them, so two spellings of one code collide on
      the unique index instead of both going live. */
  codeCase: "upper" | "lower" | "preserve";
  /** Hosts whose URLs we will dig a code out of. The check is the security boundary: a URL
      from anywhere else is refused outright rather than parsed. */
  linkHosts: string[];
  /** Query parameters that carry the code on those hosts. */
  codeParams: string[];
  /** Path prefixes whose last segment is the code. */
  linkPaths: string[];

  // --- the arithmetic ---
  /** How many people one listing is offered to before it comes off the board. Set from
      what the app itself says a code is good for. */
  unlocksPerListing: number;
  /** Asked of people joining this queue, or empty where there is nothing worth asking. */
  intentQuestion: string;

  // --- the supply side ---
  /** Who the share card is talking to. */
  audience: string;
  /** The same question asked of a visitor, in a sentence - "Have Claude Pro or Max?" */
  supplyAsk: string;
  /** The share card's headline and pitch. */
  sharePitch: string;

  // --- an empty board ---
  /** What the board says when it has nothing on it. Its own field per brand rather than one
      sentence for all of them, because "listed a few times a week and unlocked within
      minutes" is a claim about history, and a board that has never had a listing has none
      to make it with. */
  emptyNote: string;
  /** Set while a board is still waiting for its first listing ever. It keeps the alert
      confirmation from promising codes "again" when there have not been any, and marks the
      board honestly on the hub. Remove it once something has been listed. */
  awaitingFirstListing?: boolean;
  /** Set on a board where the brand issues nothing anyone could list. The queue still runs -
      being first if that changes is the whole point - but the share cards, the submit link and
      this board's place in the submit form's picker are hidden, and a submission naming it is
      refused. Asking someone to paste a code that demonstrably does not exist is the one thing
      that would cost such a page the trust the rest of its copy is built on. Clear the flag the
      day the brand starts handing codes out; every field below is already filled for that. */
  waitlistOnly?: boolean;
}

const CLAUDE: Deal = {
  slug: "claude",
  name: "Claude",
  path: "/",
  noun: "pass",
  nounPlural: "passes",
  unlockLabel: "Unlock this pass",
  reward: "7 free days of Claude Pro, Claude Code and Cowork included",
  giverReward: "$10 in Claude usage credit if your referral stays subscribed",
  summary:
    "A Claude guest pass is a week of Claude Pro, free, shared by a subscriber who would otherwise let it expire.",
  mailDescription: "Claude guest passes",
  linkTemplate: "https://claude.ai/referral/{code}",
  redeemUrl: "https://claude.ai/",
  redeemHint: "Open the link and create your Claude account there.",
  needsCode: false,
  displayPrefix: "claude.ai/referral/",
  findYourCode:
    "Run /passes in Claude Code, or open Settings in the Claude desktop app.",
  // Anthropic's shapes vary, so any URL-safe token is taken rather than guessing a format
  // and turning away real invites. The host check above is what makes that safe.
  codePattern: "^[A-Za-z0-9._~-]{4,64}$",
  codeExample: "c_AbCd1234",
  acceptsBareCode: false,
  codeCase: "preserve",
  linkHosts: ["claude.ai", "www.claude.ai"],
  codeParams: [],
  linkPaths: ["/referral/"],
  // A Pro/Max subscriber holds about this many passes, so after three unlocks the listing
  // has nothing left to give.
  unlocksPerListing: 3,
  intentQuestion: "After your free week of Claude Pro, do you expect to",
  audience: "For Claude Pro & Max subscribers",
  supplyAsk: "Have Claude Pro or Max?",
  sharePitch:
    "Not everyone can afford Claude Pro. A pass you may never use can give someone seven days to learn, create, solve a problem, or discover what Claude can make possible for them.",
  emptyNote:
    "Passes are listed a few times a week and unlocked within minutes. The list above gets the email the moment one lands. Refreshing this page does not.",
};

const WAYMO: Deal = {
  slug: "waymo",
  name: "Waymo",
  path: "/waymo-promo-code",
  noun: "code",
  nounPlural: "codes",
  unlockLabel: "Unlock this code",
  reward: "$10 off your first Waymo ride",
  giverReward: "up to $10 off your next ride, once your rider takes theirs",
  summary:
    "Waymo's referral offer is give $10, get $10: a rider's personal code takes $10 off a first robotaxi ride.",
  mailDescription: "Waymo promo codes",
  // The share sheet's own link. The campaign id is Waymo's, the code is the rider's - the
  // app builds exactly this URL when a rider presses Share.
  linkTemplate: "https://waymo.smart.link/4pcoqniy5?code={code}",
  redeemUrl: "https://waymo.com/",
  redeemHint:
    "In the Waymo app: Offers & promotions -> Redeem code. The link opens the app with the code attached, and the code itself is the fallback if it does not.",
  needsCode: true,
  displayPrefix: "",
  findYourCode:
    "Waymo app -> Offers & promotions -> Give $10, get $10 -> Share. The code sits above the Share button.",
  codePattern: "^[A-Za-z0-9]{5,20}$",
  codeExample: "RIDER5ABCD",
  acceptsBareCode: true,
  codeCase: "upper",
  linkHosts: ["waymo.smart.link", "waymo.com", "www.waymo.com"],
  codeParams: ["code"],
  linkPaths: [],
  // Waymo prints the remaining uses on the share sheet - ten a month is what a rider's code
  // carries, so a listing is offered to ten people and then retires itself.
  unlocksPerListing: 10,
  intentQuestion: "",
  audience: "For Waymo riders",
  supplyAsk: "Ridden with Waymo?",
  sharePitch:
    "Your code is worth $10 to someone taking their first driverless ride, and up to $10 back to you when they take it. It resets every month whether you share it or not.",
  emptyNote:
    "Codes are listed as riders remember they have them, and unlocked within minutes. The list above gets the email the moment one lands. Refreshing this page does not.",
};

const UBER: Deal = {
  slug: "uber",
  name: "Uber",
  path: "/uber-promo-code",
  noun: "code",
  nounPlural: "codes",
  unlockLabel: "Unlock this code",
  reward: "50% off your first 2 Uber trips, up to $10 off each",
  giverReward: "50% off 2 of your own trips for every rider who takes a first trip",
  summary:
    "Uber's referral offer is 50% off two trips for a new rider, and 50% off two trips for whoever invited them.",
  mailDescription: "Uber promo codes",
  // Uber's share sheet hands out a bare code, not a link, so there is no personal URL to
  // rebuild here. Inventing one would send people to a page that may not carry the code.
  linkTemplate: "",
  redeemUrl: "https://www.uber.com/",
  redeemHint:
    "New riders enter the code when signing up; in the app it is Account -> Promotions -> Add promo code.",
  needsCode: true,
  displayPrefix: "",
  findYourCode:
    "Uber app -> Account -> Invite friends. The code sits above the Invite friends button.",
  codePattern: "^[A-Za-z0-9]{6,24}$",
  codeExample: "4w8sz34xzqhr",
  acceptsBareCode: true,
  codeCase: "lower",
  linkHosts: ["uber.com", "www.uber.com", "ubr.to"],
  codeParams: ["invite_code", "inviteCode", "code"],
  linkPaths: ["/invite/"],
  // Uber states no cap on the share sheet, so this is our own rationing rather than a claim
  // about the offer: ten is what keeps one listing from being the whole board.
  unlocksPerListing: 10,
  intentQuestion: "",
  audience: "For Uber riders",
  supplyAsk: "Ride with Uber?",
  sharePitch:
    "Every rider you send on a first trip is 50% off two of yours. The code costs you nothing to list and the invite screen is three taps away.",
  emptyNote:
    "Codes are listed as riders remember they have them, and unlocked within minutes. The list above gets the email the moment one lands. Refreshing this page does not.",
};

const MUSE: Deal = {
  slug: "muse",
  name: "muse.ai",
  path: "/muse-ai-invite-code",
  noun: "invite code",
  nounPlural: "invite codes",
  unlockLabel: "Unlock this code",
  reward: "1 billion Muse tokens, redeemed in Settings within 48 hours of joining",
  giverReward: "1 billion Muse tokens on your own account",
  summary:
    "muse.ai's invite gives both sides 1 billion Muse tokens when a new account redeems the code within 48 hours.",
  mailDescription: "muse.ai invite codes",
  linkTemplate: "",
  redeemUrl: "https://muse.ai/",
  redeemHint:
    "Create the account first, then redeem the code in Settings. The window is 48 hours from joining - after that the code does nothing.",
  needsCode: true,
  displayPrefix: "",
  findYourCode:
    "muse.ai -> Invite friends. The code sits above the list of contacts, next to the copy button.",
  codePattern: "^[A-Za-z0-9]{4,16}$",
  codeExample: "NNZHWP",
  acceptsBareCode: true,
  codeCase: "upper",
  linkHosts: ["muse.ai", "www.muse.ai"],
  codeParams: ["code", "invite"],
  linkPaths: ["/invite/"],
  // The share sheet counts down from thirty uses, so a listing is offered to at most that
  // many people before it comes off the board.
  unlocksPerListing: 30,
  intentQuestion: "",
  audience: "For muse.ai users",
  supplyAsk: "On muse.ai already?",
  sharePitch:
    "An invite is a billion tokens for them and a billion for you, and the counter on your code goes down only when someone actually uses it.",
  emptyNote:
    "Invite codes are listed a few at a time and unlocked within minutes. The list above gets the email the moment one lands. Refreshing this page does not.",
};

const POKEMON_GO: Deal = {
  slug: "pokemongo",
  name: "Pokémon GO",
  path: "/pokemon-go-referral-code",
  noun: "referral code",
  nounPlural: "referral codes",
  unlockLabel: "Unlock this code",
  reward: "100 Poké Balls for starting, and more at each milestone you pass",
  giverReward: "Ultra Balls, incense and encounters as your recruit hits their milestones",
  summary:
    "A Pokémon GO referral code hands a new or returning Trainer 100 Poké Balls to start, and pays the Trainer who shared it as the newcomer plays.",
  mailDescription: "Pokémon GO referral codes",
  // Niantic's share sheet copies the bare code, not a URL, so there is no personal link to
  // rebuild. The code is typed into the game itself.
  linkTemplate: "",
  redeemUrl: "https://pokemongolive.com/",
  redeemHint:
    "The game asks for a referral code while you are setting up a new Trainer. Returning Trainers who have been away 90 days or more are asked again when they come back.",
  needsCode: true,
  displayPrefix: "",
  findYourCode:
    "Pokémon GO -> your Trainer profile -> Invite to Pokémon GO. The code sits above Share referral code.",
  codePattern: "^[A-Za-z0-9]{6,16}$",
  codeExample: "398XJQ4TD",
  acceptsBareCode: true,
  codeCase: "upper",
  linkHosts: ["pokemongolive.com", "www.pokemongolive.com", "pokemongo.com"],
  codeParams: ["code", "referral"],
  linkPaths: [],
  // Niantic states no cap on the share sheet, and a Trainer can refresh their code at will,
  // so ten is our own rationing rather than a claim about the game.
  unlocksPerListing: 10,
  intentQuestion: "",
  audience: "For Pokémon GO Trainers",
  supplyAsk: "Already playing Pokémon GO?",
  sharePitch:
    "Every Trainer who starts on your code earns you Ultra Balls, incense and encounters as they pass their first milestones - and it costs them nothing but gains them 100 Poké Balls.",
  emptyNote:
    "Referral codes are listed as Trainers remember they have them, and unlocked within minutes. The list above gets the email the moment one lands. Refreshing this page does not.",
};

const FIREFLIES: Deal = {
  slug: "fireflies",
  name: "Fireflies.ai",
  path: "/fireflies-ai-referral-code",
  noun: "referral link",
  nounPlural: "referral links",
  unlockLabel: "Unlock this link",
  reward: "10% off every Fireflies.ai plan, for as long as you stay on it",
  giverReward: "$5 in credit per successful signup, spendable on a Pro renewal",
  summary:
    "Fireflies.ai's referral takes 10% off any plan for the person signing up, and pays the person who shared it $5 in credit.",
  mailDescription: "Fireflies.ai referral links",
  linkTemplate: "https://app.fireflies.ai/login?referralCode={code}",
  redeemUrl: "https://fireflies.ai/",
  redeemHint:
    "The link carries the discount - open it and create the account from that page, or the 10% is not applied. Sign up with a work email address: Fireflies stopped crediting referrals from personal email domains.",
  needsCode: false,
  displayPrefix: "",
  findYourCode:
    "Fireflies.ai -> Refer. Press Copy under Share your referral link and paste the whole link here.",
  // A ULID, as Fireflies mints them: 26 characters of Crockford base32. Bounded loosely
  // either side rather than pinned at 26, so a change of format does not turn away a link
  // that the app itself just produced.
  codePattern: "^[A-Za-z0-9]{16,40}$",
  codeExample: "01JEXAMPLE9B14MQNGMSNM4V9A",
  acceptsBareCode: true,
  codeCase: "upper",
  linkHosts: ["app.fireflies.ai", "fireflies.ai", "www.fireflies.ai"],
  codeParams: ["referralCode", "referralcode", "code"],
  linkPaths: [],
  // Fireflies states no cap, so this is our own rationing: ten keeps one link from being
  // the whole board.
  unlocksPerListing: 10,
  intentQuestion: "",
  audience: "For Fireflies.ai users",
  supplyAsk: "Using Fireflies.ai?",
  sharePitch:
    "Every signup on your link is $5 of credit towards your own Pro renewal, and 10% off for them. Your meetings list is full of people who would use it.",
  emptyNote:
    "Referral links are listed a few at a time and unlocked within minutes. The list above gets the email the moment one lands. Refreshing this page does not.",
};

const CHATGPT: Deal = {
  slug: "chatgpt",
  name: "ChatGPT",
  path: "/chatgpt-promo-code",
  noun: "invite code",
  nounPlural: "invite codes",
  unlockLabel: "Unlock this code",
  reward: "free months of ChatGPT Plus or Go",
  // OpenAI's promotional invites pay the sender nothing at all. Saying so rather than
  // inventing a bonus is the only version that survives someone checking.
  giverReward: "",
  summary:
    "OpenAI hands selected accounts a few personal invite codes, each worth a free run of ChatGPT. They arrive in campaigns and go quickly.",
  mailDescription: "ChatGPT invite codes",
  // An invite is a code typed into an account, not a personal URL we could rebuild.
  linkTemplate: "",
  redeemUrl: "https://chatgpt.com/",
  redeemHint:
    "Redeem it on a ChatGPT account that has never been on a paid plan - the invite is checked against the account, not against the card.",
  needsCode: true,
  displayPrefix: "",
  findYourCode:
    "OpenAI sends invites by email or shows them inside ChatGPT. If you were given more than you can use, the spare ones are what this board is for.",
  // Deliberately loose: OpenAI has never published the shape of an invite code, and a guess
  // narrow enough to be wrong would turn away the real ones.
  codePattern: "^[A-Za-z0-9_-]{6,40}$",
  codeExample: "CHATGPT3MO-XXXXXX",
  acceptsBareCode: true,
  codeCase: "preserve",
  linkHosts: [
    "chatgpt.com",
    "www.chatgpt.com",
    "chat.openai.com",
    "openai.com",
    "www.openai.com",
  ],
  codeParams: ["code", "invite", "invite_code", "referral", "referralCode"],
  linkPaths: ["/invite/", "/redeem/"],
  // Our own rationing, not a figure from OpenAI: their help centre says only that eligible
  // accounts get "a limited number" and that the number varies by campaign.
  unlocksPerListing: 3,
  intentQuestion: "",
  audience: "For anyone holding a spare ChatGPT invite",
  supplyAsk: "Did OpenAI send you invites?",
  sharePitch:
    "OpenAI pays you nothing for passing one on, and the code expires whether you use it or not. Someone who could never justify the monthly price gets months of it instead.",
  emptyNote:
    "Nothing has been listed here yet. OpenAI gives invites out in campaigns rather than continuously, which is exactly why the line matters: the first code that lands goes to the front of it, not to whoever happens to be refreshing.",
  awaitingFirstListing: true,
};

const GROK: Deal = {
  slug: "grok",
  name: "Grok",
  path: "/grok-promo-code",
  noun: "code",
  nounPlural: "codes",
  unlockLabel: "Unlock this code",
  // Not a discount, because there is none to promise. What the line is actually worth is the
  // position in it, and that is what this says.
  reward: "first call on a Grok code if xAI starts issuing them",
  giverReward: "",
  summary:
    "xAI runs no promo codes and no referral program for Grok. This is the line for the first ones, if that ever changes.",
  mailDescription: "Grok codes",
  linkTemplate: "",
  redeemUrl: "https://grok.com/",
  redeemHint: "Codes would be entered at grok.com under Settings, then Billing.",
  needsCode: true,
  displayPrefix: "",
  findYourCode:
    "xAI issues nothing shareable today - no invite codes, no referral links. There is nothing to find yet, which is the whole reason this page exists.",
  // Every field from here down is dormant while waitlistOnly is set. They are filled anyway, and
  // filled loosely, so that clearing one flag yields a working board rather than a rewrite.
  codePattern: "^[A-Za-z0-9_-]{6,40}$",
  codeExample: "GROK-XXXXXX",
  acceptsBareCode: true,
  codeCase: "preserve",
  linkHosts: ["grok.com", "www.grok.com", "x.ai", "www.x.ai", "accounts.x.ai"],
  codeParams: ["code", "invite", "invite_code", "referral", "referralCode"],
  linkPaths: ["/invite/", "/redeem/"],
  // Our own rationing. xAI has never issued a code, so there is no published figure to take.
  unlocksPerListing: 3,
  intentQuestion: "",
  audience: "For anyone watching for the first Grok code",
  supplyAsk: "Holding a Grok code?",
  sharePitch:
    "xAI has never handed one out, so if you are holding something we have not seen, the queue on this page is waiting for exactly it.",
  emptyNote:
    "xAI has never issued a Grok promo or referral code, so there is nothing on this board yet - and a coupon site telling you otherwise is guessing. The list above is what puts you first if that changes.",
  awaitingFirstListing: true,
  waitlistOnly: true,
};

export const DEALS: Deal[] = [CLAUDE, WAYMO, UBER, MUSE, POKEMON_GO, FIREFLIES, CHATGPT, GROK];

/** The one every legacy row belongs to: passes and queue numbers predate the brand field. */
export const DEFAULT_DEAL: DealSlug = "claude";

const BY_SLUG = new Map(DEALS.map((deal) => [deal.slug, deal]));

export function getDeal(slug: string | undefined | null): Deal {
  return BY_SLUG.get((slug ?? DEFAULT_DEAL) as DealSlug) ?? CLAUDE;
}

export function isDealSlug(value: string): value is DealSlug {
  return BY_SLUG.has(value as DealSlug);
}

/** Everything but Claude - the boards that hang off the home page rather than being it. */
export const OTHER_DEALS = DEALS.filter((deal) => deal.slug !== DEFAULT_DEAL);

/** The personal link for a code, or the app's front door where the brand has no link. */
export function dealLink(deal: Deal, code: string): string {
  return deal.linkTemplate
    ? deal.linkTemplate.replace("{code}", encodeURIComponent(code))
    : deal.redeemUrl;
}

/** What the board prints for a code: the brand's URL shape, or the bare code. */
export function dealDisplay(deal: Deal, code: string): string {
  return `${deal.displayPrefix}${code}`;
}

/** Codes are stored the way the app prints them - see Deal.codeCase. */
export function normalizeCode(deal: Deal, code: string): string {
  if (deal.codeCase === "upper") return code.toUpperCase();
  if (deal.codeCase === "lower") return code.toLowerCase();
  return code;
}

/**
 * Turns whatever someone pasted into a code, or into null.
 *
 * Two doors, and only two. A URL is accepted only from the brand's own hosts, and only the
 * code is kept from it - which is what structurally keeps an arbitrary link off the board.
 * A bare code is accepted only where the app itself hands out a bare code, and only when it
 * matches that brand's shape. Everything else - whitespace, query strings on the end of a
 * code, trailing slashes - is stripped first, because a real paste picks all of it up from
 * a share button.
 */
export function parseDealCode(deal: Deal, input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const shape = new RegExp(deal.codePattern);

  if (/^[a-z]+:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    if (url.protocol !== "https:") return null;
    if (!deal.linkHosts.includes(url.hostname.toLowerCase())) return null;

    for (const param of deal.codeParams) {
      const value = url.searchParams.get(param);
      if (value && shape.test(value)) return normalizeCode(deal, value);
    }
    for (const prefix of deal.linkPaths) {
      if (!url.pathname.startsWith(prefix)) continue;
      const segment = url.pathname.slice(prefix.length).replace(/\/+$/, "");
      if (shape.test(segment)) return normalizeCode(deal, segment);
    }
    return null;
  }

  if (!deal.acceptsBareCode) return null;
  const cleaned = trimmed.replace(/[?#].*$/, "").replace(/\/+$/, "");
  return shape.test(cleaned) ? normalizeCode(deal, cleaned) : null;
}

// Small numbers read better written out: "Three unlocks and the pass is finished" is a
// sentence, "3 unlocks" is a receipt. Lives here because the card, the board and the alert
// email all say the same line and must say it the same way.
const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve",
];

export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What the submit form tells someone to paste. */
export function pasteHint(deal: Deal): string {
  return deal.acceptsBareCode
    ? `Your ${deal.name} code, or the share link that carries it.`
    : `Your complete ${deal.name} invite link.`;
}
