import type { DealSlug } from "@/lib/deals";

// The words each new board is found with, and the words it answers in.
//
// Kept apart from lib/deals.ts because none of this crosses into a client component: the
// deal objects are handed to the board and the join form, and shipping four articles of
// prose along with them would double every page's payload for text the server already
// rendered into HTML.
//
// The rule for every line below: it is checkable. These offers are the ones the apps
// themselves state on their share sheets - $10 off a first Waymo ride, 50% off two Uber
// trips up to $10 each, a billion Muse tokens inside 48 hours - and where a searcher's
// question has an unwelcome answer ("promo code for existing users"), the answer is given
// plainly rather than dodged. Pages that guess at these numbers are the competition.

export interface DealFact {
  term: string;
  def: string;
}

export interface DealSection {
  h2: string;
  body?: string[];
  /** Rendered as a numbered list where the section is a procedure. */
  steps?: string[];
  bullets?: string[];
}

export interface DealArticle {
  /** The SERP line. Deliberately not the h1 - they target the same query differently. */
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  imageAlt: string;
  lead: string[];
  facts: DealFact[];
  factsNote: string;
  sections: DealSection[];
  /** The conditions that decide whether the offer actually pays out, and to whom.
      Every line is the program's own rule, not ours - the ones a person would otherwise
      discover after signing up, when it is too late to act on them. */
  terms: string[];
  /** Where the binding version lives, named by the screen it is on rather than by a URL
      we would be guessing at. The terms someone is held to are the ones in their app. */
  termsSource: string;
  faqHeading: string;
  faqs: { q: string; a: string }[];
}

const WAYMO: DealArticle = {
  title: "Waymo Promo Code: $10 Off Your First Ride | Claude Coupons",
  h1: "Waymo promo code: a real $10 off your first ride",
  description:
    "Working Waymo promo codes, shared by riders. Waymo's give $10, get $10 referral takes $10 off a first robotaxi ride - take a number and unlock a code when your wave opens.",
  keywords: [
    "waymo promo code",
    "waymo referral code",
    "waymo discount code",
    "waymo coupon",
    "waymo invite code",
    "waymo promo code first ride",
    "waymo promo code for existing users",
    "waymo $10 off",
    "free waymo ride",
    "waymo referral code reddit",
  ],
  imageAlt: "Waymo promo codes",
  lead: [
    "Waymo runs no public promo codes. What exists is the rider referral: every Waymo rider carries a personal code worth $10 off a new rider's first trip, and up to $10 back to the rider who shared it. That is the whole of the discount, and it is the only one.",
    "Riders list their codes here so the ten uses a code carries each month are not wasted. Take a number, and when your wave opens you unlock one and redeem it in the Waymo app.",
  ],
  facts: [
    { term: "What the offer is", def: "Give $10, get $10 - Waymo's own rider referral." },
    { term: "What you save", def: "$10 off your first Waymo ride." },
    { term: "What the sharer gets", def: "Up to $10 off their next ride, once you ride." },
    { term: "Who can use one", def: "New Waymo riders. A code does nothing on an account that has already ridden." },
    { term: "Where it goes", def: "Waymo app, Offers & promotions, Redeem code." },
    { term: "How many uses a code has", def: "Ten a month per rider, shown on their share sheet." },
    { term: "Where Waymo operates", def: "Phoenix, San Francisco, Los Angeles, Austin and Atlanta, with more cities opening." },
  ],
  factsNote:
    "Waymo's terms apply: subject to availability and while supplies last, non-transferable, not redeemable for cash, and offers cannot be combined - the app applies whichever promo discounts your trip most.",
  sections: [
    {
      h2: "How to redeem a Waymo promo code",
      steps: [
        "Take a number here and confirm your email - that one click is also your sign-in.",
        "When your wave opens, unlock a code on the board. It stays masked until then.",
        "Download the Waymo app and create your account, or open the referral link that comes with the code.",
        "Tap Offers & promotions, then Redeem code, and paste it in. $10 comes off your first ride.",
        "Tell us whether it worked. One click, and a spent code stops being offered to the person behind you.",
      ],
    },
    {
      h2: "Is there a Waymo promo code for existing users?",
      body: [
        "No, and any page offering one is guessing. The referral is written for a rider's first trip: the code is checked against a new account, and an account that has already taken a Waymo ride gets nothing from it. Waymo does run its own promotions from time to time - they appear under Offers & promotions in the app on their own, with no code to type.",
        "If you have ridden before, the thing worth having is the other half of the offer. Your own code is worth up to $10 off your next ride every time someone new rides on it, ten times a month, and it costs nothing to list here.",
      ],
    },
    {
      h2: "Why a code from this board works when a scraped one does not",
      body: [
        "A Waymo referral code belongs to a person, carries a limited number of uses, and resets monthly. The codes posted on deal aggregators are usually months old and long spent, which is why they fail silently in the app.",
        "Here a code is listed by the rider who owns it, offered to a queue ten people at a time, and retired the moment its uses run out or someone reports it dead. The board only ever shows codes that nobody has reported spent.",
      ],
    },
    {
      h2: "What a first Waymo ride is actually like",
      body: [
        "A Waymo is a fully driverless taxi: no driver, no steering wheel turning on its own account, and no conversation you did not ask for. You hail it in the Waymo app like any ride, the car arrives, your initials show on the roof display, and you press Start ride from the back seat.",
        "$10 covers a meaningful share of a typical city trip, which is why the first ride is the one worth having a code for.",
      ],
    },
  ],
  terms: [
    "New riders only. The $10 applies to a first Waymo ride; on an account that has already ridden, the code is refused.",
    "Waymo's own wording: subject to availability and while supplies last, non-transferable, and not redeemable for cash.",
    "Offers cannot be combined. The app automatically applies whichever promo discounts your trip most, so a $10 referral can be superseded by a larger one rather than added to it.",
    "The discount is capped at $10 and applies to the fare. A longer trip pays the difference.",
    "A rider's code carries ten uses a month and the count resets monthly - a code that worked last month may have nothing left this month.",
    "The sharer's half, up to $10 off their next ride, only lands once the new rider actually takes a ride. Redeeming the code is not enough.",
    "Usable only where Waymo operates - currently Phoenix, San Francisco, Los Angeles, Austin and Atlanta, with more cities opening.",
    "Nothing is redeemed on this site. Every rule above is Waymo's, and this site is not affiliated with Waymo.",
  ],
  termsSource:
    "Waymo app -> Offers & promotions -> Terms apply, and See promo details on the offer itself.",
  faqHeading: "Waymo promo code questions",
  faqs: [
    {
      q: "Does Waymo have a promo code?",
      a: "Not a public one. Waymo issues no coupon codes and runs no seasonal sale. The only code that takes money off a Waymo ride is a rider's personal referral code, worth $10 off a first ride, and that is what riders share on this board.",
    },
    {
      q: "How much is the Waymo referral discount?",
      a: "$10 off the new rider's first trip, and up to $10 off the next trip of whoever shared the code, once that first ride happens. Waymo calls it give $10, get $10.",
    },
    {
      q: "How do I enter a promo code in the Waymo app?",
      a: "Open the Waymo app, go to Offers & promotions, tap Redeem code, and paste the code in. It then appears under Active Offers and is applied automatically to the trip it discounts most.",
    },
    {
      q: "Can I use a Waymo promo code if I have ridden before?",
      a: "No. Referral codes apply to a rider's first Waymo trip only. On an account that has already ridden, the code is refused. Waymo's own promotions for existing riders appear in the app under Offers & promotions without any code.",
    },
    {
      q: "Do Waymo codes expire?",
      a: "A rider's code refreshes its uses monthly, so a code that worked last month may have nothing left this month. That is why the board retires a listing after its uses are spent and asks everyone who unlocks one whether it worked.",
    },
    {
      q: "Where can I use a Waymo code?",
      a: "Anywhere Waymo operates - currently Phoenix, San Francisco, Los Angeles, Austin and Atlanta, with more cities opening. The discount is on the fare, so it works on any trip in a service area.",
    },
    {
      q: "Is a Waymo promo code free to get here?",
      a: "Yes. Nothing on this site is ever sold. Riders list their spare uses, and a queue decides who gets the next one, so the codes go to people waiting rather than to whoever scrapes the page fastest.",
    },
  ],
};

const UBER: DealArticle = {
  title: "Uber Promo Code: 50% Off Your First 2 Trips | Claude Coupons",
  h1: "Uber promo code: 50% off your first two trips",
  description:
    "Working Uber promo codes from real riders. Uber's referral gives a new rider 50% off two trips, up to $10 off each - take a number and unlock a code when your wave opens.",
  keywords: [
    "uber promo code",
    "uber referral code",
    "uber invite code",
    "uber coupon code",
    "uber discount code",
    "uber promo code first ride",
    "uber promo code for existing users",
    "uber 50 off",
    "free uber ride code",
    "uber promo code that works",
  ],
  imageAlt: "Uber promo codes",
  lead: [
    "Uber's referral is the one discount a rider can actually hand to a stranger: a new rider gets 50% off their first two trips, up to $10 off each, and the rider who invited them gets 50% off two trips of their own once that first trip happens.",
    "Riders list their invite codes here rather than posting them where they go stale. Take a number, and when your wave opens you unlock a code and enter it in the Uber app.",
  ],
  facts: [
    { term: "What the offer is", def: "Uber's own rider referral - 50% off, both ways." },
    { term: "What you save", def: "50% off your first 2 Uber trips, up to USD 10 off each." },
    { term: "What the sharer gets", def: "50% off 2 trips, valid 30 days after your first ride." },
    { term: "Who can use one", def: "Riders taking their first Uber trip." },
    { term: "Where it goes", def: "At signup, or Account, Promotions, Add promo code." },
    { term: "What it costs", def: "Nothing. Codes are shared, never sold." },
  ],
  factsNote:
    "Uber's terms decide the rest: the discount applies per trip up to the stated cap, and the sharer's half is valid for 30 days after the new rider's first ride.",
  sections: [
    {
      h2: "How to use an Uber promo code",
      steps: [
        "Take a number here and confirm your email - that click is also your sign-in.",
        "When your wave opens, unlock a code on the board.",
        "Install the Uber app and enter the code while signing up, where it asks for a promo or invite code.",
        "Already signed up and never ridden? Account, then Promotions, then Add promo code.",
        "Take your trip. Half comes off, up to $10. Then tell us whether it worked.",
      ],
    },
    {
      h2: "Is there an Uber promo code for existing users?",
      body: [
        "Not from the referral. It is written for a rider's first trip, and an account with trip history gets nothing from an invite code - the app accepts the entry and then applies no discount, which is what makes scraped codes look broken.",
        "What existing riders do get is the other side: your own invite code gives 50% off two of your trips for every friend who takes a first ride on it. That is a real discount for someone who already rides, and listing your code here is how you find the friends.",
        "Uber's own offers for existing riders - Uber One pricing, local campaigns, ride passes - show up in the app under Promotions on their own, without a code.",
      ],
    },
    {
      h2: "Why Uber promo codes from coupon sites usually fail",
      body: [
        "An Uber invite code is personal and one-use-per-rider. The lists you find on aggregator sites are scraped, unverified and typically spent long before you type one, so the app rejects them without saying why.",
        "On this board, a code is listed by the rider who owns it, offered to a queue in waves, and retired the moment it has been handed out its allotment or someone reports it dead. Everyone who unlocks one is asked whether it worked, and that answer is what takes a dead code off the board.",
      ],
    },
  ],
  terms: [
    "New riders only. The 50% applies to a first Uber trip; an account with trip history gets nothing from an invite code.",
    "The discount is capped: 50% off each of two trips, up to USD 10 off per trip. A larger fare pays the balance.",
    "The inviter's half - 50% off two trips - is valid for 30 days after the new rider takes their first ride, and expires unused after that.",
    "The inviter is credited only when the invited rider completes a first trip, not when the code is entered.",
    "Codes are personal, one per rider, not transferable, and have no cash value.",
    "Amounts and availability vary by city and can change. The figures on Uber's own invite screen are the ones in force for that account.",
    "Nothing is redeemed on this site. Every rule above is Uber's, and this site is not affiliated with Uber.",
  ],
  termsSource: "The read FAQs link on Uber's own Invite friends screen.",
  faqHeading: "Uber promo code questions",
  faqs: [
    {
      q: "What is the Uber promo code for the first ride?",
      a: "There is no single public one. Uber's first-ride discount comes from a rider's personal invite code: 50% off your first two trips, up to USD 10 off each. Riders share those codes here.",
    },
    {
      q: "How do I enter a promo code on Uber?",
      a: "Enter it while signing up, where the app asks for a promo or invite code. If the account already exists but has never taken a trip, open Account, then Promotions, then Add promo code, and paste it there.",
    },
    {
      q: "Do Uber promo codes work for existing users?",
      a: "Referral codes do not - they apply to a rider's first trip. Existing riders get discounts the other way round: share your own invite code and you get 50% off two trips for every friend who takes their first ride on it.",
    },
    {
      q: "How much is the Uber referral bonus?",
      a: "50% off two trips for the new rider, up to USD 10 off each, and 50% off two trips for whoever invited them, valid for 30 days after the new rider's first ride. Uber states both figures on its own invite screen.",
    },
    {
      q: "Are these Uber codes free?",
      a: "Yes, and they always will be. Riders list their invite codes, a queue decides who gets the next one, and nothing is sold. A code that has to be bought is not a referral code.",
    },
    {
      q: "Why was my Uber promo code rejected?",
      a: "Nearly always one of three reasons: the account has taken a trip before, the code has already been used by that rider, or the code was spent before you got it. Report it here as not working and your place in the queue is returned to you.",
    },
  ],
};

const MUSE: DealArticle = {
  title: "muse.ai Invite Code: 1 Billion Muse Tokens | Claude Coupons",
  h1: "muse.ai invite code: 1 billion Muse tokens, both ways",
  description:
    "Working muse.ai invite codes. Redeem one in Settings within 48 hours of joining and both you and the person who shared it get 1 billion Muse tokens - free, from real users.",
  keywords: [
    "muse.ai invite code",
    "muse ai invite code",
    "muse ai referral code",
    "muse.ai promo code",
    "muse ai free tokens",
    "muse tokens",
    "muse.ai coupon",
    "muse ai invite",
    "muse.ai referral",
  ],
  imageAlt: "muse.ai invite codes",
  lead: [
    "muse.ai gives both sides of an invite the same thing: redeem a code in Settings within 48 hours of creating your account and you and the person who shared it each get 1 billion Muse tokens.",
    "The 48 hours are the catch, and the reason codes go unused - a code found a week after signing up is worth nothing. Take a number here, unlock a code, and redeem it while the window is open.",
  ],
  facts: [
    { term: "What the offer is", def: "muse.ai's invite - 1 billion Muse tokens for each side." },
    { term: "What you get", def: "1 billion Muse tokens on your new account." },
    { term: "What the sharer gets", def: "1 billion Muse tokens, once you redeem." },
    { term: "The deadline", def: "48 hours from the moment you join. Not from when you got the code." },
    { term: "Where it goes", def: "muse.ai, Settings, redeem code." },
    { term: "How many uses a code has", def: "Thirty per user, counted down on their invite screen." },
  ],
  factsNote:
    "The token grant is muse.ai's and is paid to both accounts only when the code is redeemed inside the window. Nothing is redeemed on this site.",
  sections: [
    {
      h2: "How to redeem a muse.ai invite code",
      steps: [
        "Take a number here and confirm your email.",
        "When your wave opens, unlock a code on the board and copy it.",
        "Create your muse.ai account - the 48-hour clock starts here, so do this second, not first.",
        "Open Settings and redeem the code. Both accounts are credited 1 billion Muse tokens.",
        "Tell us whether it worked, so a spent code stops being offered.",
      ],
    },
    {
      h2: "Why the 48-hour window matters more than the code",
      body: [
        "Most muse.ai invite codes that fail did not expire - the account did. The grant is tied to a new account redeeming inside two days of being created, so someone who signs up first and goes looking for a code afterwards usually finds one too late.",
        "The order that works is: get the code, then make the account, then redeem in Settings the same day. The queue here exists so you can have the code in hand before you sign up.",
      ],
    },
    {
      h2: "What a billion Muse tokens is for",
      body: [
        "Muse tokens are muse.ai's usage currency - what the platform's AI features spend as you search, transcribe and work through video. A billion of them is a serious head start on a new account, which is why the invite is worth the two minutes it takes to redeem properly.",
      ],
    },
  ],
  terms: [
    "The 48-hour window runs from when the account was created, not from when you received the code. Get the code first, then sign up.",
    "The code is redeemed in Settings on the new account. There is no field for it during signup, so signing up and looking for a code afterwards usually misses the window.",
    "Both sides are paid only on a redemption inside the window. A late redemption pays neither of you.",
    "New accounts only.",
    "A code carries thirty uses, counted down on the sharer's own invite screen, so a widely shared code can be spent before you reach it.",
    "Muse tokens are account credit for muse.ai's own features. They are not cash, not transferable, and not redeemable for anything outside the product.",
    "Nothing is redeemed on this site. Every rule above is muse.ai's, and this site is not affiliated with muse.ai.",
  ],
  termsSource: "The invite screen in muse.ai, and muse.ai's own terms.",
  faqHeading: "muse.ai invite code questions",
  faqs: [
    {
      q: "What does a muse.ai invite code give you?",
      a: "1 billion Muse tokens for the new account, and 1 billion for whoever shared the code - but only when the new account redeems it in Settings within 48 hours of joining.",
    },
    {
      q: "Where do I enter a muse.ai invite code?",
      a: "In Settings on muse.ai, after creating your account. There is no field for it during signup, which is why the order matters: account first, then redeem, inside 48 hours.",
    },
    {
      q: "My muse.ai account is older than 48 hours. Can I still redeem?",
      a: "No. The window runs from when the account was created, and a code redeemed after it has closed grants nothing to either side. Codes on this board go to people who have not signed up yet, so the window is still open when they use one.",
    },
    {
      q: "How many people can use one muse.ai code?",
      a: "Thirty, and the invite screen counts them down. A listing here comes off the board once its uses are spent or someone reports it dead.",
    },
    {
      q: "Do I have to pay for a muse.ai invite code?",
      a: "No. Users list their codes here and a queue decides who gets the next one. Nothing on this site is sold.",
    },
  ],
};

const POKEMON_GO: DealArticle = {
  title: "Pokémon GO Referral Code: 100 Poké Balls to Start | Claude Coupons",
  h1: "Pokémon GO referral code: 100 Poké Balls to start",
  description:
    "Working Pokémon GO referral codes from real Trainers. A code gives a new or returning Trainer 100 Poké Balls and milestone rewards - take a number and unlock one when your wave opens.",
  keywords: [
    "pokemon go referral code",
    "pokemon go referral codes",
    "pokemon go invite code",
    "pokemon go promo code",
    "pokemon go referral code 2026",
    "pokemon go 100 poke balls",
    "pokemon go returning trainer code",
    "pokemon go referral rewards",
    "free pokemon go referral code",
  ],
  imageAlt: "Pokémon GO referral codes",
  lead: [
    "Pokémon GO's referral pays both Trainers. Enter someone's code while you are setting up and you start with 100 Poké Balls, then earn more as you pass your first milestones - and the Trainer who invited you earns Ultra Balls, incense and encounters at the same moments.",
    "This is not the same thing as a promo code. Promo codes come from Niantic and expire; a referral code belongs to a Trainer and works as long as they are playing. Trainers list theirs here, and a queue decides who gets the next one.",
  ],
  facts: [
    { term: "What the offer is", def: "Niantic's own Invite to Pokémon GO referral." },
    { term: "What you get", def: "100 Poké Balls for starting, and rewards at each milestone after." },
    { term: "What the sharer gets", def: "Rewards as you log in, beat Team GO Rocket grunts and finish Field Research." },
    { term: "Who can use one", def: "New Trainers, and returning Trainers who have been away 90 days or more." },
    { term: "Where it goes", def: "Typed into the game while you set your Trainer up." },
    { term: "Not the same as", def: "A promo code from Niantic, or a Trainer friend code (those only add a friend)." },
  ],
  factsNote:
    "Niantic's rule, stated on the invite screen: referring someone who has already started only earns rewards if that Trainer has not logged in for over 90 days.",
  sections: [
    {
      h2: "How to use a Pokémon GO referral code",
      steps: [
        "Take a number here and confirm your email - that one click is also your sign-in.",
        "When your wave opens, unlock a code on the board and copy it.",
        "Install Pokémon GO and start creating your Trainer. Enter the code when the game asks for one.",
        "Returning after 90 days or more? The game offers the same prompt when you come back.",
        "Your 100 Poké Balls arrive, and both of you collect more as you hit milestones. Tell us whether it worked.",
      ],
    },
    {
      h2: "Referral code, promo code or friend code?",
      bullets: [
        "A referral code is a Trainer's personal invite - 100 Poké Balls for you, milestone rewards for them. That is what this board exchanges.",
        "A promo code comes from Niantic, usually with an event or a partner, and is redeemed on the Pokémon GO web store. They expire, often within days, and no board can keep them fresh.",
        "A friend code is a 12-digit number that adds someone to your friends list. It pays neither side anything.",
      ],
    },
    {
      h2: "What the milestones actually pay",
      body: [
        "The invite screen lists them as your recruit works through them: logging in, defeating three Team GO Rocket grunts, completing 25 Field Research tasks, and further goals after that. Each one credits the Trainer who shared the code, which is why an unused code is worth listing rather than leaving in the app.",
        "The rewards on the new Trainer's side start with 100 Poké Balls and continue alongside - nobody is trading away their own start to help somebody else's.",
      ],
    },
    {
      h2: "Why codes from a list usually do nothing",
      body: [
        "A referral code has to be entered while a Trainer account is being set up. Pasted into an account that is already running, it does nothing at all - which is the single most common reason a code found on a forum looks broken.",
        "Get the code first, then create the Trainer. The queue here exists so the code is in hand before you install the game.",
      ],
    },
  ],
  terms: [
    "Written for new Trainers. Niantic's own rule, printed on the invite screen: referring someone who has already started earns rewards only if that Trainer has not logged in for over 90 days.",
    "The code has to be entered while the Trainer account is being set up. An account already running cannot apply one afterwards.",
    "Rewards arrive in stages as the new Trainer passes milestones - logging in, defeating three Team GO Rocket grunts, completing 25 Field Research tasks, and further goals - not all at once.",
    "The sharer is paid only as the new Trainer actually reaches those milestones. A Trainer who installs and stops earns them little or nothing.",
    "A Trainer can refresh their referral code whenever they like, which replaces the old one - so a code copied from a forum can simply have ceased to exist.",
    "This is not a Niantic promo code (those are redeemed on the Pokémon GO web store and expire) and not a Trainer friend code (which pays neither side).",
    "Rewards are in-game items. They have no cash value and are not transferable.",
    "Nothing is redeemed on this site. Every rule above is Niantic's, and this site is not affiliated with Niantic or Pokémon.",
  ],
  termsSource:
    "The Invite to Pokémon GO screen in game, and Niantic's own terms of service.",
  faqHeading: "Pokémon GO referral code questions",
  faqs: [
    {
      q: "What does a Pokémon GO referral code give you?",
      a: "100 Poké Balls when you start your journey, plus further rewards as you pass milestones. The Trainer who shared the code earns their own rewards at those same milestones - items like Ultra Balls, incense and Pokémon encounters.",
    },
    {
      q: "Where do I enter a Pokémon GO referral code?",
      a: "In the game, while you are setting up a new Trainer - Pokémon GO asks whether you have a referral code. Returning Trainers who have been away for 90 days or more get the same prompt when they come back.",
    },
    {
      q: "Can an existing Pokémon GO player use a referral code?",
      a: "Only after a long break. Niantic's rule, printed on the invite screen, is that referring someone who has already started earns rewards only if that Trainer has not logged in for over 90 days. An active account gets nothing from a code.",
    },
    {
      q: "Is a referral code the same as a Pokémon GO promo code?",
      a: "No. Promo codes come from Niantic, are redeemed on the Pokémon GO web store, and expire quickly. A referral code belongs to a Trainer, is entered in the game at setup, and keeps working while they play. This board exchanges referral codes.",
    },
    {
      q: "How many people can use one referral code?",
      a: "Niantic states no limit on the invite screen, and a Trainer can refresh their code whenever they like. This board still retires a listing after ten unlocks so that one code does not become the whole queue.",
    },
    {
      q: "Do Pokémon GO referral codes cost anything?",
      a: "No. Trainers list their codes here and a queue decides who gets the next one. Nothing on this site is sold, and a code that has to be bought is not a referral code.",
    },
  ],
};

const FIREFLIES: DealArticle = {
  title: "Fireflies.ai Referral Code: 10% Off Any Plan | Claude Coupons",
  h1: "Fireflies.ai referral code: 10% off any plan",
  description:
    "Working Fireflies.ai referral links. Sign up through one and you get 10% off all plans; the person who shared it gets $5 in credit. Free, from real users.",
  keywords: [
    "fireflies.ai referral code",
    "fireflies ai referral code",
    "fireflies.ai promo code",
    "fireflies ai discount code",
    "fireflies ai coupon",
    "fireflies.ai discount",
    "fireflies ai referral link",
    "fireflies ai 10% off",
    "fireflies ai pro discount",
  ],
  imageAlt: "Fireflies.ai referral links",
  lead: [
    "Fireflies.ai has no public coupon code. What it has is a referral link: sign up through one and 10% comes off every plan, and the person whose link you used gets $5 in credit towards their own renewal.",
    "The discount rides in the link, not in a box at checkout - which is why it has to be the link you create the account from. Users list theirs here, and a queue decides who gets the next one.",
  ],
  facts: [
    { term: "What the offer is", def: "Fireflies.ai's own referral - 10% off for you, $5 credit for them." },
    { term: "What you save", def: "10% off all plans, applied because you signed up through the link." },
    { term: "What the sharer gets", def: "$5 per successful signup, spendable on a Pro renewal." },
    { term: "Where it goes", def: "Nowhere. Open the link and create the account from that page." },
    { term: "Email address", def: "Use a work address - Fireflies no longer credits referrals from personal email domains." },
    { term: "Who can use one", def: "New Fireflies.ai accounts." },
  ],
  factsNote:
    "The personal-domain rule is Fireflies' own, stated on its Refer screen. It decides whether the referral counts, so it is worth reading before you sign up rather than after.",
  sections: [
    {
      h2: "How to use a Fireflies.ai referral link",
      steps: [
        "Take a number here and confirm your email - that click is also your sign-in.",
        "When your wave opens, unlock a link on the board.",
        "Open it. It lands on the Fireflies sign-up page with the referral already attached.",
        "Create the account from that page, using a work email address rather than a personal one.",
        "Check that 10% is off at checkout, then tell us whether it worked.",
      ],
    },
    {
      h2: "Is there a Fireflies.ai promo code or coupon?",
      body: [
        "Not a public one. Fireflies runs no coupon codes and no seasonal sale, so the codes listed on aggregator sites are either expired, invented, or somebody's referral link with the discount stripped out of it.",
        "The 10% is real, and it is attached to a link rather than to a code you could type. That is the whole discount that exists for a new account, which is why the link is worth queueing for.",
      ],
    },
    {
      h2: "Why the email address decides whether it counts",
      body: [
        "Fireflies states on its own Refer screen that personal email domains are no longer eligible for referral credits. In practice that means a gmail.com or outlook.com signup can leave the person who shared the link with nothing, even though you signed up through it.",
        "Use a work address. It costs you nothing, it is the account you would want a meeting recorder on anyway, and it keeps the exchange honest for the person whose link you used.",
      ],
    },
  ],
  terms: [
    "The 10% is attached to the link, not to a code. The account has to be created from the page the link lands on, or the discount is not applied and cannot be added afterwards.",
    "Use a work email address. Fireflies states on its own Refer screen that personal email domains are no longer eligible for referral credits, so a gmail.com or outlook.com signup can leave the sharer with nothing even though you used their link.",
    "New Fireflies.ai accounts only.",
    "The sharer receives $5 in credit towards renewing a Pro plan - credit inside the product, not a cash payout.",
    "That credit is paid on a successful signup as Fireflies counts one. Their definition governs, not ours.",
    "Plan prices and the discount can change. What the checkout page shows at the moment you subscribe is what applies.",
    "Nothing is redeemed on this site. Every rule above is Fireflies' own, and this site is not affiliated with Fireflies.ai.",
  ],
  termsSource: "The Refer screen in Fireflies.ai, and Fireflies' own terms.",
  faqHeading: "Fireflies.ai referral questions",
  faqs: [
    {
      q: "Does Fireflies.ai have a promo code?",
      a: "No public one. The only discount available for a new account is the referral link, which takes 10% off all plans. Coupon sites listing Fireflies codes are listing codes that do not work.",
    },
    {
      q: "How much is the Fireflies.ai referral discount?",
      a: "10% off all plans for the person signing up, and $5 in credit for the person who shared the link, usable on renewing their Pro plan. Both figures are Fireflies' own, from its Refer screen.",
    },
    {
      q: "Where do I enter a Fireflies.ai referral code?",
      a: "You do not enter it anywhere. The referral code rides in the link as ?referralCode=..., so you have to open the link and create your account from the page it lands on. Signing up separately and pasting a code afterwards does not apply the discount.",
    },
    {
      q: "Can I use a personal email address?",
      a: "You can create the account, but Fireflies says personal email domains are no longer eligible for referral credits - so the person who shared the link may get nothing. Use a work address.",
    },
    {
      q: "Do Fireflies.ai referral links expire?",
      a: "They belong to a user's account rather than to a campaign, so they keep working while that account does. A listing still comes off this board after ten unlocks, or as soon as someone reports that it stopped applying the discount.",
    },
  ],
};

// The one board where the honest answer to the search term is "not the way you mean".
//
// The sequencing is the whole design. Someone who typed "chatgpt promo code" gets the true
// answer in the first clause of the first sentence - there is no code box at OpenAI's
// checkout - and then, in the same breath, the thing that does exist and is worth staying
// for. It is never a heading, never a banner, never a warning box. A page that shouts the
// absence loses the reader; a page that hides it is the aggregator spam this site exists to
// be the opposite of.
const CHATGPT: DealArticle = {
  title: "ChatGPT Promo Code: What Actually Exists in 2026 | Claude Coupons",
  h1: "ChatGPT promo codes: get in line for the next invite",
  description:
    "OpenAI takes no promo code at checkout - it hands selected accounts personal invite codes, each worth a free run of ChatGPT Plus or Go. Take a number and be first when one is listed.",
  keywords: [
    "chatgpt promo code",
    "chatgpt coupon code",
    "chatgpt discount code",
    "chatgpt plus promo code",
    "chatgpt invite code",
    "chatgpt referral code",
    "chatgpt plus discount",
    "chatgpt plus free trial",
    "openai promo code",
    "chatgpt promo code 2026",
    "chatgpt student discount",
  ],
  imageAlt: "ChatGPT invite codes",
  lead: [
    "OpenAI doesn't take a promo code at checkout. What it does hand out, in waves, is personal invite codes - a small number to a limited set of accounts, each worth a free run of ChatGPT Plus or Go for someone who hasn't paid for it before. They arrive by email or inside the app, they're often tied to one country, and they go quickly.",
    "You can't ask OpenAI for one. What you can do is already be in line when the next batch lands here. Numbers are handed out in order and never reused, and every code listed on this board is offered to the front of the line first.",
  ],
  facts: [
    {
      term: "What OpenAI takes at checkout",
      def: "No promo code field. Discounts arrive as invites or verified offers, never as a code you type.",
    },
    {
      term: "What does exist",
      def: "Personal invite codes, issued by OpenAI to selected accounts, campaign by campaign.",
    },
    {
      term: "What an invite is worth",
      def: "A free run of ChatGPT Plus or Go. The length is set per campaign - three months is OpenAI's own example.",
    },
    {
      term: "Who can redeem one",
      def: "Generally accounts on the free plan. Some campaigns make exceptions.",
    },
    {
      term: "How you get one",
      def: "OpenAI sends it, by email or in-product. There is no way to request one.",
    },
    {
      term: "Students in the US",
      def: "Four free months of Plus, verified through SheerID. No code involved. The claim window closes 31 October 2026.",
    },
    {
      term: "When the free run ends",
      def: "Auto-renews at the standard rate unless cancelled first.",
    },
  ],
  factsNote:
    "Campaign terms are OpenAI's and differ between campaigns - how many invites an account gets, who may redeem them and when they expire are all set per campaign and shown when the invite is generated.",
  sections: [
    {
      h2: "Is there a ChatGPT promo code?",
      body: [
        "Not in the sense the phrase usually means. There is no box at OpenAI's checkout to paste a code into, no seasonal sale, and no public discount code - which is why a list of \u201cworking ChatGPT promo codes\u201d is a list of things there is nowhere to type.",
        "What OpenAI runs instead is invites. Selected accounts are given a few personal codes, each worth a free stretch of ChatGPT, and who gets them is decided by OpenAI campaign by campaign, usually by country. That is the real currency, and it is the one this board deals in.",
      ],
    },
    {
      h2: "What OpenAI has actually handed out",
      bullets: [
        "Promotional subscription invites: a limited number of unique codes given to eligible accounts, each giving someone a free limited-duration ChatGPT subscription, delivered by email or inside the app.",
        "A ChatGPT Free referral campaign, run from 18 August to 17 September 2026 in Mexico, India and Indonesia, where each qualifying referral doubled the referrer's free usage limits for seven days, up to three times.",
        "ChatGPT Go promotions, including a stretch of Go at no cost for accounts in India.",
        "Referral promotions tied to the ChatGPT desktop app.",
        "A US student offer: four free months of Plus, verified rather than redeemed with a code.",
      ],
      body: [
        "The pattern is the point. These arrive in waves, they are usually regional, and they are given rather than requested. Being in a line when the next one starts is worth more than any code on a coupon site.",
      ],
    },
    {
      h2: "How to pay less for ChatGPT today",
      bullets: [
        "The free plan. It is not a trial and it does not expire, and for occasional use it is often the whole answer. No card, no code.",
        "ChatGPT Go, where it is offered. It is the cheaper paid tier and it is priced regionally - in some countries it has been given away outright for a period.",
        "The US student offer: four free months of Plus, verified through SheerID rather than redeemed with a code. The claim window closes 31 October 2026, and it renews at the standard rate afterwards.",
        "Your university or employer. Institutions on ChatGPT Edu or Business seat their people directly, which is a better deal than any consumer discount and costs you nothing.",
        "Not the coupon aggregators. Since there is no code field at checkout, every \u201cverified 40% off ChatGPT code\u201d is either an affiliate link with the word code printed beside it or simply invented.",
      ],
    },
    {
      h2: "How to redeem a ChatGPT invite code",
      steps: [
        "Take a number here and confirm your email - that one click is also your sign-in.",
        "When your wave opens, unlock a code on the board and copy it.",
        "Redeem it on a ChatGPT account that has never been on a paid plan. Most campaigns check that and refuse an account that has.",
        "Read what the invite says it gives you before you add a card - the length is set by the campaign, not by whoever shared it.",
        "Tell us whether it worked. One click, and a spent code stops being offered to the person behind you.",
      ],
    },
    {
      h2: "Why ChatGPT codes from a list usually do nothing",
      body: [
        "An invite is issued to one account, for one campaign, with an expiry OpenAI sets and shows when the invite is generated. Most are tied to a country. An account that already pays is refused outright. Any of those four is enough to make a code that was real last month do nothing today, and a scraped list tells you none of them.",
        "Here a code is listed by the person OpenAI gave it to, offered to a queue in order, and retired the moment it has been handed out its allotment or someone reports it dead. The person who just tried a code is the only check on it that exists, and one click from them is what keeps the board honest.",
      ],
    },
  ],
  terms: [
    "Invites are OpenAI's to issue. Nobody can request one, and no site can promise you one - including this one.",
    "Generally only accounts on the ChatGPT free plan can redeem an invite. Some campaigns make exceptions for existing subscribers; most do not.",
    "The length of the free run is set by the campaign that issued the code, not by whoever shares it.",
    "Every invite carries an expiry OpenAI sets and shows when the invite is generated. After it, the code does nothing.",
    "Campaigns are usually regional. An invite from one country's campaign may not apply to an account elsewhere.",
    "The subscription auto-renews at the standard rate when the free run ends. Cancel at least 24 hours before the first billing date if you do not want to continue.",
    "Invites are personal codes issued to an account. Nothing here is sold, and a code that has to be bought is not an invite.",
    "Nothing is redeemed on this site. Every rule above is OpenAI's, and this site is not affiliated with OpenAI.",
  ],
  termsSource:
    "OpenAI's help centre - the ChatGPT Promotional Subscriptions/Free Trial Invites FAQ, and the promotions and referrals articles for Plus, Go and the desktop app.",
  faqHeading: "ChatGPT promo code questions",
  faqs: [
    {
      q: "Is there a ChatGPT promo code?",
      a: "Not one you can type. OpenAI's checkout has no promo code field, and there is no public discount code for ChatGPT Plus. What OpenAI does issue is personal invite codes, given to selected accounts in campaigns, each worth a free run of ChatGPT. Those are real, and those are what this board exchanges.",
    },
    {
      q: "Does ChatGPT have a referral program?",
      a: "Yes, in campaigns rather than continuously. OpenAI's help centre documents promotional subscription invites, referrals for ChatGPT Plus and Go, referral promotions in the desktop app, and a ChatGPT Free referral campaign that ran in Mexico, India and Indonesia during August and September 2026. Eligibility is decided by OpenAI, campaign by campaign.",
    },
    {
      q: "How do I get a ChatGPT invite code?",
      a: "You cannot request one. OpenAI sends invites to accounts it selects, by email or inside ChatGPT, and how many you get depends on the campaign. The only other way is from somebody who was given more than they can use - which is what this board is for.",
    },
    {
      q: "Can I use an invite if I already pay for ChatGPT Plus?",
      a: "Usually not. Invites are generally redeemable only by accounts on the free plan, though a campaign can make an exception for existing subscribers. If you already subscribe, assume no unless the invite itself says otherwise.",
    },
    {
      q: "Is the ChatGPT student discount a promo code?",
      a: "No. OpenAI's US student offer - four free months of ChatGPT Plus - is claimed by verifying you are a student through SheerID, not by entering a code. The claim window closes on 31 October 2026, and the plan renews at the standard rate afterwards unless you cancel.",
    },
    {
      q: "Do ChatGPT invite codes expire?",
      a: "Yes. OpenAI sets an expiry on each invite and shows it when the invite is generated. Past that date the code does nothing, which is the most common reason a code found on a forum fails.",
    },
    {
      q: "Are the codes on this board free?",
      a: "Yes, and they always will be. People list invites they were given and cannot use, and a queue decides who gets the next one. Nothing on this site is sold, and a code that has to be bought is not an invite.",
    },
  ],
};

export const DEAL_ARTICLES: Partial<Record<DealSlug, DealArticle>> = {
  waymo: WAYMO,
  uber: UBER,
  muse: MUSE,
  pokemongo: POKEMON_GO,
  fireflies: FIREFLIES,
  chatgpt: CHATGPT,
};
