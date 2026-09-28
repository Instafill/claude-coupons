// KitCut (kitcut.ai) is the other product built by whoever runs this site: type one sentence and
// Claude writes, draws, narrates and scores an animated film of it. It needs its first users, so
// this site promotes it everywhere a reader looks - a banner on every page, a bar that follows
// the reader down, a footer line, and a card in the watch confirmation email. It is our own
// product, so every placement says so rather than dressing it up as a third-party ad.
//
// It leads with business films (ads, explainers, brand films) because a business is the reader
// who pays for film; a film of a fox seeing snow sells the craft but not the use.
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

// The films the banner and the email show: KitCut's best business films, all public on
// kitcut.ai. `at` is the second the still was taken at (public/kitcut/<slug>.jpg), and where
// the hover preview starts, so the moving picture picks up where the still left off.
export interface KitCutFilm {
  slug: string;
  id: string;
  kind: string;
  what: string;
  length: string;
  at: number;
}

export const KITCUT_FILMS: KitCutFilm[] = [
  { slug: "turing-complete", id: "studio-20260928-041445-2p46v3", kind: "Launch ad", what: "A game on Steam", length: "0:13", at: 9.1 },
  { slug: "dell-hp", id: "studio-20260927-171047-mgkibw", kind: "Business documentary", what: "Dell vs HP in the AI era", length: "8:00", at: 336 },
  { slug: "queensgame", id: "studio-20260927-223145-5wo5i4", kind: "Product ad", what: "A web puzzle game", length: "0:13", at: 2.6 },
  { slug: "clamly", id: "studio-20260927-061617-q6t772", kind: "Brand values film", what: "An app's values", length: "0:33", at: 23.1 },
];

const FILMS_BASE = "https://kitcutst.blob.core.windows.net/films";

export function filmStill(f: KitCutFilm): string {
  return `/kitcut/${f.slug}.jpg`;
}

export function filmPreview(f: KitCutFilm): string {
  return `${FILMS_BASE}/${f.id}/film_web.mp4#t=${f.at}`;
}

export type KitCutPlacement = "banner" | "stickybar" | "footer" | "email";

const UTM = (placement: KitCutPlacement) =>
  new URLSearchParams({ utm_source: "claudecoupons", utm_medium: placement, utm_campaign: "kitcut-business" });

export function kitcutUrl(placement: KitCutPlacement): string {
  return `https://kitcut.ai/?${UTM(placement)}`;
}

// A showcased film's own page on kitcut.ai, where it plays with sound.
export function filmUrl(f: KitCutFilm, placement: KitCutPlacement): string {
  return `https://kitcut.ai/film/${f.id}?${UTM(placement)}`;
}
