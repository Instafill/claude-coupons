// KitCut (kitcut.ai) is the other product built by whoever runs this site: type one sentence and
// Claude writes, draws, narrates and scores an animated film of it. It needs its first users, so
// this site promotes it everywhere a reader looks - a banner on every page, a bar that follows
// the reader down, a footer line, and a card in the watch confirmation email. It is our own
// product, so every placement says so rather than dressing it up as a third-party ad.
//
// The words speak to who reads this site: people who already use Claude. So the headline is the
// one new fact for them, in four words, and the pitch is what sets KitCut apart from an AI clip
// generator (script, picture, voice and music, finished). Short beats complete: the user asked
// for punchy. Every claim is one
// kitcut.ai's own docs make: 30 free seconds a month, a 30 s film in 16-24 minutes, so no "in
// minutes" and no "any language". The tiles show the films; the words don't list genres.
//
// One place for the words and the links, so the four placements cannot drift apart. The utm_*
// parameters say which placement brought a visitor.

export const KITCUT = {
  name: "KitCut",
  headline: "Claude makes videos now.",
  pitch: "Type an idea, get a finished film: script, animation, voice-over, music.",
  free: "30 seconds free every month.",
  cta: "Make a free film",
  label: "New from the maker of ClaudeCoupons",
  logo: "/kitcut-logo.png",
};

// The films the banner and the email show: four KitCut films, each a different use.
// Each has a still and a few seconds of the film as a small silent clip (public/kitcut/<slug>.jpg
// and .mp4, cut from the film), and opens the whole film with sound: its page on kitcut.ai, or
// YouTube for a film made outside the studio. No lengths: the tile sells the look, not the runtime.
export interface KitCutFilm {
  slug: string;
  kind: string;
  company: string;
  // a studio film's id (its page is kitcut.ai/film/<id>), or a YouTube video's
  id?: string;
  youtube?: string;
}

export const KITCUT_FILMS: KitCutFilm[] = [
  { slug: "icecream", kind: "History explainer", company: "A Brief History of Ice Cream", youtube: "db9y25DuwGU" },
  { slug: "instafill-gpt6", kind: "Product update", company: "Instafill, now on GPT-6 Sol", id: "studio-20260928-135513-pizula" },
  { slug: "paperwork", kind: "Industry explainer", company: "A Brief History of Paperwork", youtube: "MX1iBcJ-qwU" },
  { slug: "thatchers-wine", kind: "Champagne launch", company: "Thatcher's Wine", id: "studio-20260928-110106-skiird" },
];

export function filmStill(f: KitCutFilm): string {
  return `/kitcut/${f.slug}.jpg`;
}

export function filmClip(f: KitCutFilm): string {
  return `/kitcut/${f.slug}.mp4`;
}

export type KitCutPlacement = "banner" | "stickybar" | "footer" | "email" | "blog";

const UTM = (placement: KitCutPlacement) =>
  new URLSearchParams({ utm_source: "claudecoupons", utm_medium: placement, utm_campaign: "kitcut-business" });

export function kitcutUrl(placement: KitCutPlacement): string {
  return `https://kitcut.ai/?${UTM(placement)}`;
}

// Where a showcased film plays in full, with sound.
export function filmUrl(f: KitCutFilm, placement: KitCutPlacement): string {
  if (f.youtube) return `https://www.youtube.com/watch?v=${f.youtube}`;
  return `https://kitcut.ai/film/${f.id}?${UTM(placement)}`;
}
