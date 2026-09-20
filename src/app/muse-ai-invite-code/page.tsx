import type { Metadata } from "next";

import DealPage from "@/components/DealPage";
import { DEAL_ARTICLES } from "@/lib/dealArticles";
import { getDeal } from "@/lib/deals";
import { articleMetadata } from "@/lib/seo";

// The muse.ai board. "invite code" rather than "promo code": muse.ai's own screens call it
// an invite, and so does everyone searching for one.
const DEAL = getDeal("muse");
const ARTICLE = DEAL_ARTICLES.muse!;

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
