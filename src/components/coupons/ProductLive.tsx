"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import DropPanel from "@/components/coupons/DropPanel";
import QueueProgress from "@/components/coupons/QueueProgress";
import SubscribeForm from "@/components/coupons/SubscribeForm";
import type { ClaimedCode } from "@/lib/coupons";
import type { PageState, Progress, PublicDrop, PublicProduct } from "@/lib/product-state";

// The part of a product page that depends on who is looking. The server renders the same
// HTML for everyone; this component reads the token and state from the URL, keeps the
// token in localStorage so a return visit still knows the viewer, and asks /me for the
// live numbers and the viewer's own place and code.

interface Me {
  status: "pending" | "confirmed" | "stopped";
  position: number | null;
  claim: ClaimedCode | null;
}

interface Live {
  progress: Progress;
  drop: PublicDrop | null;
  state: PageState;
  hasCodes: boolean;
  owned: boolean;
  me: Me | null;
}

const BANNERS: Record<string, { tone: "good" | "muted" | "bad"; text: (position: number | null) => string }> = {
  confirmed: { tone: "good", text: (p) => (p ? `Confirmed - you're #${p} on the list.` : "Confirmed - you're on the list.") },
  stopped: { tone: "muted", text: () => "You're off this list. Nothing else changes." },
  invalid: { tone: "bad", text: () => "That link didn't work. Links expire after seven days and work once - ask for a fresh one below." },
};

function storageKey(slug: string): string {
  return `cc_sub:${slug}`;
}

export default function ProductLive({
  product,
  initial,
  signedIn,
  sessionEmail,
  consent,
}: {
  product: PublicProduct;
  initial: { progress: Progress; drop: PublicDrop | null; state: PageState; hasCodes: boolean };
  signedIn: boolean;
  sessionEmail?: string;
  consent: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [live, setLive] = useState<Live>({ ...initial, owned: product.owned, me: null });
  const [formResult, setFormResult] = useState<{ status: string; position?: number } | null>(null);

  const refresh = useCallback(
    async (t: string | null): Promise<Live | null> => {
      const query = t ? `?t=${encodeURIComponent(t)}` : "";
      const response = await fetch(`/api/coupons/${product.slug}/me${query}`, { cache: "no-store" });
      if (!response.ok) return null;
      return (await response.json()) as Live;
    },
    [product.slug]
  );

  // Reads the token and state out of the URL, tucks the token away, cleans the address bar,
  // then asks /me. State is set once, after the fetch, so the page paints the server's
  // numbers first and the viewer's own numbers as soon as they are known.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get("t");
      const state = url.searchParams.get("state");
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(storageKey(product.slug));
        if (fromUrl) window.localStorage.setItem(storageKey(product.slug), fromUrl);
      } catch {
        // Private mode or blocked storage: the token still works for this visit.
      }
      const t = fromUrl || stored;
      if (fromUrl || state) {
        url.searchParams.delete("t");
        url.searchParams.delete("state");
        window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
      }
      const fresh = await refresh(t);
      if (cancelled) return;
      setToken(t);
      if (state) setBanner(state);
      if (fresh) setLive(fresh);
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [product.slug, refresh]);

  const { progress, drop, state, hasCodes, me } = live;
  const bannerSpec = banner ? BANNERS[banner] : null;
  const isLive = state === "live" && drop;
  const confirmed = me?.status === "confirmed";
  const pending = me?.status === "pending";

  async function reload() {
    const fresh = await refresh(token);
    if (fresh) setLive(fresh);
  }

  function onSubscribed(result: { status: string; position?: number }) {
    setFormResult(result);
    void reload();
  }

  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-6">
      {bannerSpec && (
        <p
          className={`mb-4 rounded-lg px-3 py-2 text-sm font-semibold ${
            bannerSpec.tone === "good" ? "bg-[#eaf6ef] text-good" : bannerSpec.tone === "bad" ? "bg-[#f9e5e0] text-bad" : "bg-[#f0ede6] text-muted"
          }`}
        >
          {bannerSpec.text(me?.position ?? null)}
        </p>
      )}

      <QueueProgress
        name={product.name}
        owned={live.owned}
        progress={progress}
        drop={drop}
        state={state}
        hasCodes={hasCodes}
      />

      {isLive && confirmed && (
        <DropPanel
          slug={product.slug}
          token={token}
          drop={drop}
          claim={me?.claim ?? null}
          onClaimed={(claim) => {
            setLive((prev) => ({
              ...prev,
              me: prev.me ? { ...prev.me, claim } : prev.me,
              drop: prev.drop ? { ...prev.drop, remaining: Math.max(0, prev.drop.remaining - 1) } : prev.drop,
            }));
            void reload();
          }}
        />
      )}

      {isLive && pending && (
        <p className="mt-4 text-sm text-muted">
          Confirm your email first - the link is in your inbox - and you can claim a code here.
        </p>
      )}

      {!isLive && confirmed && !formResult && (
        <div className="mt-4 rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
          <p className="font-semibold">
            {me?.position && me.position >= 6 ? `You're #${me.position} on the list.` : "You're on the list, near the front."}
          </p>
          <p className="mt-1 text-sm">
            {progress.goalReached
              ? "The goal is reached. We'll email you the moment the codes are released."
              : `${progress.left} more and the codes drop. We'll email you the moment they do.`}
          </p>
        </div>
      )}

      {formResult && (formResult.status === "confirmed" || formResult.status === "already") && (
        <div className="mt-4 rounded-xl border border-[#b9dcc9] bg-[#eaf6ef] px-4 py-4 text-good">
          <p className="font-semibold">
            {formResult.status === "already"
              ? `You're already on this list${formResult.position ? ` (#${formResult.position})` : ""}.`
              : formResult.position && formResult.position >= 6
                ? `You're #${formResult.position} on the list.`
                : "You're on the list, near the front."}
          </p>
          <p className="mt-1 text-sm">We&rsquo;ll email you the moment the codes drop. One click in any email stops it.</p>
        </div>
      )}

      {formResult && formResult.status === "sent" && (
        <div className="mt-4 rounded-xl border border-line bg-paper p-5">
          <h3 className="font-semibold">Check your inbox</h3>
          <p className="mt-1 text-sm text-muted">
            If that address is valid, we&rsquo;ve sent one email asking you to confirm. Until you click it
            you&rsquo;re not on the list, and we won&rsquo;t send anything else.
          </p>
        </div>
      )}

      {!formResult && !confirmed && !(isLive && pending) && (
        <SubscribeForm
          slug={product.slug}
          productName={product.name}
          consent={consent}
          signedIn={signedIn}
          email={sessionEmail}
          buttonLabel={isLive ? "Join the list to claim a code" : progress.band === "empty" ? "Be first on the list" : "Join the list"}
          onResult={onSubscribed}
        />
      )}

      {!signedIn && !confirmed && !formResult && (
        <p className="mt-3 text-[13px] text-muted">
          Signed-in addresses skip the confirmation email.{" "}
          <Link className="text-accent-dark underline" href={`/signin?return_to=${encodeURIComponent(`/coupons/${product.slug}`)}`}>
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
