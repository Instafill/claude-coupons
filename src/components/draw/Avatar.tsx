import { memo } from "react";

// A face for everyone in the room. A photo when there is one; otherwise an identicon, the
// generated avatar Stack Overflow showed through Gravatar: a hash of a seed picks a colour
// and a 5x5 grid mirrored left to right, so the same seed always draws the same face and two
// seeds almost never collide.

// cyrb53: a fast 53-bit string hash, plenty for picking pixels.
function hash(seed: string): [number, number] {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}

export const Identicon = memo(function Identicon({ seed, size }: { seed: string; size: number }) {
  const [bits, tone] = hash(seed);
  const hue = tone % 360;
  const cells: [number, number][] = [];
  // Fifteen bits fill the left three columns; columns 3 and 4 mirror 1 and 0.
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 5; row++) {
      if ((bits >>> (col * 5 + row)) & 1) {
        cells.push([col, row]);
        if (col < 2) cells.push([4 - col, row]);
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox="-0.75 -0.75 6.5 6.5" aria-hidden="true" className="block">
      <rect x="-0.75" y="-0.75" width="6.5" height="6.5" fill="#f0ede6" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={`hsl(${hue} 55% 52%)`} />
      ))}
    </svg>
  );
});

// Memoised: a room shows hundreds of these on its grid and its map, and a face never changes
// between two ticks of the room's clock.
export const Avatar = memo(function Avatar({
  photo,
  seed,
  name,
  size,
  className = "",
}: {
  photo?: string;
  seed: string;
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={`block shrink-0 overflow-hidden rounded-full bg-[#f0ede6] ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      {photo ? (
        // A plain img on purpose: these are Google avatars at a few dozen pixels, dozens to a
        // room, and next/image would route every one through the optimizer for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} width={size} height={size} className="block h-full w-full object-cover" />
      ) : (
        <Identicon seed={seed} size={size} />
      )}
    </span>
  );
});
