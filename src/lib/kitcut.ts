// KitCut (kitcut.ai) is the other product built by whoever runs this site: type one sentence and
// Claude writes, draws, narrates and scores an animated film of it. It needs its first users, so
// this site promotes it everywhere a reader looks - a banner on every page, a bar that follows
// the reader down, a footer line, and a card in the watch confirmation email. It is our own
// product, so every placement says so rather than dressing it up as a third-party ad.
//
// The words are about launching a YouTube channel (the owner's call, 2026-10-16): KitCut makes
// the episodes, writes each one's title, description and thumbnails, and publishes them to the
// person's channel on a schedule, so the headline sells the channel, not a single video. The
// links land on kitcut.ai/faceless-youtube, the sign-up page built for channel starters. The
// free plan is not the pitch: no placement leads with "free" (2026-10-03). Every claim is one
// kitcut.ai can keep: a 30 s film takes 16-24 minutes, so no "in minutes" and no "any language".
//
// One place for the words and the links, so the four placements cannot drift apart. The utm_*
// parameters say which placement brought a visitor.

export const KITCUT = {
  name: "KitCut",
  headline: "Launch a YouTube channel. Claude makes the videos.",
  pitch:
    "Pick a niche, get finished episodes: script, animation, voice-over, music.",
  uses: "Titles, thumbnails and a posting schedule, published to your channel for you.",
  // the short form, where the full list does not fit (the sticky bar)
  usesShort: "Episodes, thumbnails and a schedule, done for you.",
  cta: "Start your channel",
  label: "New from the maker of ClaudeCoupons",
  logo: "/kitcut-logo.png",
};

// The films the banner and the email show: four episodes from YouTube channels KitCut makes, each
// a different niche, so the tiles back the headline (a channel, not one video). Each has a still
// and eight seconds of the episode as a small silent clip (public/kitcut/<slug>.jpg and .mp4, cut
// from the film), and opens the whole episode on YouTube with sound. No lengths or view counts:
// the tile sells the look, and a number written here would go stale.
export interface KitCutFilm {
  slug: string;
  kind: string;
  company: string;
  // a studio film's id (its page is kitcut.ai/film/<id>), or a YouTube video's
  id?: string;
  youtube?: string;
}

export const KITCUT_FILMS: KitCutFilm[] = [
  {
    slug: "padel-tactics",
    kind: "Sports channel",
    company: "Padel Tactics: How Points Are Really Won",
    youtube: "18vtgi2e-AI",
  },
  {
    slug: "duchess-box",
    kind: "Kids' cartoon",
    company: "Duchess and The Box",
    youtube: "GfVhDQmxz6o",
  },
  {
    slug: "openrouter",
    kind: "Tech explainer",
    company: "Why Stripe Paid $7.5B for OpenRouter",
    youtube: "zskY4h5xu0o",
  },
  {
    slug: "icecream",
    kind: "History explainer",
    company: "A Brief History of Ice Cream",
    youtube: "db9y25DuwGU",
  },
];

export function filmStill(f: KitCutFilm): string {
  return `/kitcut/${f.slug}.jpg`;
}

export function filmClip(f: KitCutFilm): string {
  return `/kitcut/${f.slug}.mp4`;
}

export type KitCutPlacement =
  "banner" | "stickybar" | "footer" | "email" | "blog";

const UTM = (placement: KitCutPlacement) =>
  new URLSearchParams({
    utm_source: "claudecoupons",
    utm_medium: placement,
    utm_campaign: "kitcut-youtube",
  });

export function kitcutUrl(placement: KitCutPlacement): string {
  return `https://kitcut.ai/faceless-youtube?${UTM(placement)}`;
}

// Where a showcased film plays in full, with sound.
export function filmUrl(f: KitCutFilm, placement: KitCutPlacement): string {
  if (f.youtube) return `https://www.youtube.com/watch?v=${f.youtube}`;
  return `https://kitcut.ai/film/${f.id}?${UTM(placement)}`;
}
