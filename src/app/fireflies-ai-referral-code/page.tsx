import type { Metadata } from "next";

import DealPage from "@/components/DealPage";
import { DEAL_ARTICLES } from "@/lib/dealArticles";
import { getDeal } from "@/lib/deals";
import { articleMetadata } from "@/lib/seo";

// The Fireflies.ai board. The discount rides in the link rather than in a code, which the
// page says plainly - it is the thing every competing page gets wrong.
const DEAL = getDeal("fireflies");
const ARTICLE = DEAL_ARTICLES.fireflies!;

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
