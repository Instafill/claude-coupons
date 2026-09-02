import type { Metadata } from "next";
import { redirect } from "next/navigation";

import ProductForm from "@/components/founders/ProductForm";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Add your product - Claude Coupons",
  robots: { index: false },
};

export default async function NewProductPage() {
  const user = await getUser();
  if (!user) redirect("/signin?return_to=%2Ffounders%2Fnew");

  return (
    <section className="mx-auto mt-8 max-w-2xl">
      <h1 className="text-[28px] font-bold">Add your product</h1>
      <p className="mt-2 text-muted">
        You get a public page that collects people waiting for your codes. You keep your checkout and
        your customers; we keep the list and send one email when you release a drop. The page goes live
        the moment you save it.
      </p>
      <ProductForm />
    </section>
  );
}
