// KitCut (kitcut.ai) is the other product built by whoever runs this site: type one sentence and
// Claude writes, draws, narrates and scores an animated film of it. It needs its first users, so
// this site promotes it everywhere a reader looks - a banner on every page, a bar that follows
// the reader down, a footer line, and a card in the watch confirmation email. It is our own
// product, so every placement says so rather than dressing it up as a third-party ad.
//
// One place for the words and the links, so the four placements cannot drift apart. The utm_*
// parameters say which placement brought a visitor.

export const KITCUT = {
  name: "KitCut",
  headline: "Type one sentence. Claude turns it into an animated film.",
  pitch:
    "Claude writes, draws, narrates and scores a short film of any idea, hand-drawn or painted, in any language, in a few minutes.",
  free: "Your first 30 seconds of film are free, no card needed.",
  cta: "Make a free film",
  label: "New from the maker of ClaudeCoupons",
  image: "/kitcut-promo.jpg",
  imageAlt: "Stills from four films made with KitCut: a honey jar, a young dragon, a lighthouse cat and a raindrop",
  logo: "/kitcut-logo.png",
};

export type KitCutPlacement = "banner" | "stickybar" | "footer" | "email";

export function kitcutUrl(placement: KitCutPlacement): string {
  const q = new URLSearchParams({ utm_source: "claudecoupons", utm_medium: placement, utm_campaign: "kitcut-launch" });
  return `https://kitcut.ai/?${q}`;
}
