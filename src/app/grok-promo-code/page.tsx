import type { Metadata } from "next";

import DealPage from "@/components/DealPage";
import { DEAL_ARTICLES } from "@/lib/dealArticles";
import { getDeal } from "@/lib/deals";
import { articleMetadata } from "@/lib/seo";

// The Grok board, which is a line rather than a board.
//
// "grok promo code" is the query, and unlike ChatGPT the unwelcome answer is the whole answer:
// xAI issues no codes and runs no referral program, so there is nothing for anyone to list. The
// page wins by saying that accurately, ranking on the real ways to pay less, and holding a queue
// for the day it stops being true. Whether anyone joins it is the thing being measured.
const DEAL = getDeal("grok");
const ARTICLE = DEAL_ARTICLES.grok!;

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
