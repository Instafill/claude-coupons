// Where a request came from, as the edge already knows it. Nothing is looked up and no
// service is called: both Cloudflare and Vercel put this on the request itself.
//
// Cloudflare first, because the apex is proxied through it. Only `cf-ipcountry` is sent by
// default though - city, region and timezone need the zone's "Add visitor location headers"
// managed transform, which may or may not be on. So Vercel's own headers are the fallback
// on every field, and they are always present at its edge. Turning the Cloudflare transform
// on later needs no change here; the values simply come from the first source instead.
//
// Deliberately not read: the IP itself, which is hashed elsewhere and never stored, and the
// latitude, longitude and postal code Cloudflare can emit. A country and a city say where
// subscribers are, which is the question; a block-level fix on someone who asked for a free
// week of Claude is not.

export interface Geo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

// Edge geo strings are short. This only bounds a forged header from bloating a row.
const MAX_LENGTH = 120;

function read(headers: Headers, ...names: string[]): string | undefined {
  for (const name of names) {
    const raw = headers.get(name);
    if (!raw) continue;
    // Vercel percent-encodes these, so "San Francisco" arrives as "San%20Francisco" and
    // would otherwise be stored and counted as a different city from Cloudflare's.
    let value = raw.trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // A malformed escape is not worth losing the header over.
    }
    value = value.trim();
    // Cloudflare answers XX for an address it cannot place, and T1 for Tor.
    if (!value || value === "XX" || value === "T1") continue;
    return value.slice(0, MAX_LENGTH);
  }
  return undefined;
}

/**
 * One source per request, never a field from each.
 *
 * Falling back field by field looked harmless and was not: Cloudflare sends cf-ipcountry on
 * every request but only sends a city when the zone's visitor-location transform is on, so
 * the country came from Cloudflare and the city from Vercel - two different databases
 * resolving one address, and they disagree. That is what "Amsterdam (IN)" and "Miami (CO)"
 * were. A record that mixes them is worse than one missing half its fields.
 */
export function readGeo(headers: Headers): Geo {
  const city = read(headers, "cf-ipcity");
  if (city) {
    return {
      country: read(headers, "cf-ipcountry"),
      region: read(headers, "cf-region"),
      city,
      timezone: read(headers, "cf-timezone"),
    };
  }

  const vercel: Geo = {
    country: read(headers, "x-vercel-ip-country"),
    region: read(headers, "x-vercel-ip-country-region"),
    city: read(headers, "x-vercel-ip-city"),
    timezone: read(headers, "x-vercel-ip-timezone"),
  };
  if (vercel.country || vercel.city) return vercel;

  // Neither edge placed them fully. Cloudflare's country alone is still a true fact, and it
  // is the one field that arrives without any configuration.
  return { country: read(headers, "cf-ipcountry") };
}
