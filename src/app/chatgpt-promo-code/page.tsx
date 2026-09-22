import type { Metadata } from "next";

import DealPage from "@/components/DealPage";
import { DEAL_ARTICLES } from "@/lib/dealArticles";
import { getDeal } from "@/lib/deals";
import { articleMetadata } from "@/lib/seo";

// The ChatGPT board, and a demand probe.
//
// "chatgpt promo code" is the query, so it is the slug - even though the honest answer is
// that OpenAI takes no code at checkout. The page wins by answering that accurately and
// then saying what does exist: personal invite codes, handed to selected accounts in
// campaigns. Whether anyone joins the line, and whether the page draws impressions at all,
// is the thing being measured.
const DEAL = getDeal("chatgpt");
const ARTICLE = DEAL_ARTICLES.chatgpt!;

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
