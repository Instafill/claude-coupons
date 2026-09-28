// KitCut (kitcut.ai) is the other product built by whoever runs this site: type one sentence and
// Claude writes, draws, narrates and scores an animated film of it. It needs its first users, so
// this site promotes it everywhere a reader looks - a banner on every page, a bar that follows
// the reader down, a footer line, and a card in the watch confirmation email. It is our own
// product, so every placement says so rather than dressing it up as a third-party ad.
//
// It leads with films made for businesses (a launch, an explainer, an opening) because a business
// is the reader who pays for film; a film of a fox seeing snow sells the craft but not the use.
//
// One place for the words and the links, so the four placements cannot drift apart. The utm_*
// parameters say which placement brought a visitor.

export const KITCUT = {
  name: "KitCut",
  headline: "Ads, explainers and brand films for your business, from one sentence.",
  pitch: "Claude writes, draws, narrates and scores the film in minutes, in any language.",
  free: "Your first 30 seconds of film are free, no card needed.",
  cta: "Make a free film",
  label: "New from the maker of ClaudeCoupons",
  logo: "/kitcut-logo.png",
};

// The films the banner and the email show: KitCut films made for businesses, one per industry.
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
  { slug: "thatchers-wine", kind: "Champagne launch", company: "Thatcher's Wine", id: "studio-20260928-110106-skiird" },
  { slug: "instafill-bpo", kind: "Product explainer", company: "Instafill, for real-estate agents", youtube: "1bEBQp96rb8" },
  { slug: "marisol", kind: "Restaurant opening", company: "Marisol, an example brand", id: "studio-20260928-110110-2ohqb3" },
  { slug: "brightfold", kind: "Software launch", company: "Brightfold, an example brand", id: "studio-20260928-102314-adduja" },
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
