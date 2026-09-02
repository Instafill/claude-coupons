"use client";

import { useState } from "react";

// The product's mark, always inside our own chrome. Logos are founder-supplied URLs on
// hosts we cannot enumerate for next/image, so this is a plain <img>, and one that fails
// to load gives way to a monogram rather than an empty box.
export default function ProductLogo({
  name,
  logoUrl,
  size = 56,
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (logoUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="shrink-0 rounded-xl border border-line bg-surface object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-xl bg-ink font-bold text-paper"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}
