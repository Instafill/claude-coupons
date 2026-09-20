import type { Metadata } from "next";

import DealPage from "@/components/DealPage";
import { DEAL_ARTICLES } from "@/lib/dealArticles";
import { getDeal } from "@/lib/deals";
import { articleMetadata } from "@/lib/seo";

// The Pokémon GO board. Deliberately not "promo code" in the slug: that phrase belongs to
// Niantic's own expiring store codes, and a page that conflates the two helps nobody.
const DEAL = getDeal("pokemongo");
const ARTICLE = DEAL_ARTICLES.pokemongo!;

export const dynamic = "force-dynamic";

export const metadata: Metadata = articleMetadata({
  title: ARTICLE.title,
  description: ARTICLE.description,
  path: DEAL.path,
  keywords: ARTICLE.keywords,
  imageAlt: ARTICLE.imageAlt,
});

export default function Page() {
  return <DealPage deal={DEAL} />;
}
