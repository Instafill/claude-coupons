import { memo } from "react";

import { Avatar } from "./Avatar";
import { LAND_ROWS, LAND_STEP, LAND_TOP } from "./landDots";

// The mini map: every land cell a dot, every person in the room a tiny avatar pinned where
// they joined from. Equirectangular, so a pin's place is plain arithmetic on its lat/lon.

const COLS = LAND_ROWS[0].length * 4;
const ROWS = LAND_ROWS.length;

const DOTS: [number, number][] = LAND_ROWS.flatMap((row, y) =>
  [...row].flatMap((hex, i) => {
    const nibble = parseInt(hex, 16);
    return [0, 1, 2, 3].flatMap((b) => ((nibble >> (3 - b)) & 1 ? [[i * 4 + b + 0.5, y + 0.5] as [number, number]] : []));
  })
);

const Land = memo(function Land() {
  return (
    <svg viewBox={`0 0 ${COLS} ${ROWS}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.34} fill="#d9d4c9" />
      ))}
    </svg>
  );
});

export interface Pin {
  id: string;
  name: string;
  lat: number;
  lon: number;
  photo?: string;
  seed: string;
  state: "normal" | "me" | "highlight" | "winner" | "left";
}

const RING: Record<Pin["state"], string> = {
  normal: "ring-1 ring-white",
  me: "ring-2 ring-accent",
  highlight: "ring-2 ring-accent scale-150 z-20",
  winner: "ring-2 ring-good scale-125 z-10",
  left: "ring-1 ring-white opacity-30 grayscale",
};

// One pin. Memoised on its plain values, so a room's clock ticking doesn't redraw every face.
const MapPin = memo(function MapPin({
  x,
  y,
  photo,
  seed,
  name,
  state,
}: {
  x: number;
  y: number;
  photo?: string;
  seed: string;
  name: string;
  state: Pin["state"];
}) {
  return (
    <span className="draw-pin absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <Avatar
        photo={photo}
        seed={seed}
        name={name}
        size={state === "me" ? 18 : 14}
        className={`-translate-x-1/2 -translate-y-1/2 shadow-sm transition-transform duration-150 ${RING[state]}`}
      />
    </span>
  );
});

export default function WorldMap({ pins }: { pins: Pin[] }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
      <Land />
      {pins.map((pin) => (
        <MapPin
          key={pin.id}
          x={((pin.lon + 180) / 360) * 100}
          y={(((LAND_TOP - pin.lat) / LAND_STEP + 0.5) / ROWS) * 100}
          photo={pin.photo}
          seed={pin.seed}
          name={pin.name}
          state={pin.state}
        />
      ))}
    </div>
  );
}
