import { repairUtf8, type Geo } from "@/lib/geo";

// Where someone in a draw's room is shown on its map. The city and country are the ones the
// edge already names (lib/geo.ts); this only turns them into a pin.

export interface Place {
  city: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  // IANA zones that make this the likely guess for a visitor's own city.
  tz?: string[];
}

/** A country code as its flag emoji: two regional indicator letters. */
export function flagOf(country?: string): string {
  if (!country || !/^[A-Za-z]{2}$/.test(country)) return "🌐";
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const C = (city: string, country: string, lat: number, lon: number, tz?: string[]): Place => ({
  city,
  country,
  flag: flagOf(country),
  lat,
  lon,
  tz,
});

// Pins for when the edge gives a city but no coordinates (localhost, or a source that sends
// none): a known city by name, else one in the visitor's time zone, else one in their country.
export const CITIES: Place[] = [
  C("Kyiv", "UA", 50.45, 30.52, ["Europe/Kyiv", "Europe/Kiev"]),
  C("Lviv", "UA", 49.84, 24.03),
  C("London", "GB", 51.51, -0.13, ["Europe/London"]),
  C("Dublin", "IE", 53.35, -6.26, ["Europe/Dublin"]),
  C("Berlin", "DE", 52.52, 13.4, ["Europe/Berlin"]),
  C("Paris", "FR", 48.86, 2.35, ["Europe/Paris"]),
  C("Warsaw", "PL", 52.23, 21.01, ["Europe/Warsaw"]),
  C("Lisbon", "PT", 38.72, -9.14, ["Europe/Lisbon"]),
  C("Madrid", "ES", 40.42, -3.7, ["Europe/Madrid"]),
  C("Barcelona", "ES", 41.39, 2.17),
  C("Amsterdam", "NL", 52.37, 4.9, ["Europe/Amsterdam"]),
  C("Milan", "IT", 45.46, 9.19),
  C("Rome", "IT", 41.9, 12.5, ["Europe/Rome"]),
  C("Vienna", "AT", 48.21, 16.37, ["Europe/Vienna"]),
  C("Stockholm", "SE", 59.33, 18.07, ["Europe/Stockholm"]),
  C("Oslo", "NO", 59.91, 10.75, ["Europe/Oslo"]),
  C("Athens", "GR", 37.98, 23.73, ["Europe/Athens"]),
  C("Istanbul", "TR", 41.01, 28.98, ["Europe/Istanbul"]),
  C("New York", "US", 40.71, -74.01, ["America/New_York"]),
  C("Miami", "US", 25.76, -80.19),
  C("Chicago", "US", 41.88, -87.63, ["America/Chicago"]),
  C("Austin", "US", 30.27, -97.74),
  C("Denver", "US", 39.74, -104.99, ["America/Denver"]),
  C("Seattle", "US", 47.61, -122.33),
  C("San Francisco", "US", 37.77, -122.42, ["America/Los_Angeles"]),
  C("Toronto", "CA", 43.65, -79.38, ["America/Toronto"]),
  C("Mexico City", "MX", 19.43, -99.13, ["America/Mexico_City"]),
  C("Bogotá", "CO", 4.71, -74.07, ["America/Bogota"]),
  C("Lima", "PE", -12.05, -77.04, ["America/Lima"]),
  C("Santiago", "CL", -33.45, -70.67, ["America/Santiago"]),
  C("São Paulo", "BR", -23.55, -46.63, ["America/Sao_Paulo"]),
  C("Rio de Janeiro", "BR", -22.91, -43.17),
  C("Buenos Aires", "AR", -34.6, -58.38, ["America/Argentina/Buenos_Aires"]),
  C("Mumbai", "IN", 19.08, 72.88, ["Asia/Kolkata", "Asia/Calcutta"]),
  C("Delhi", "IN", 28.61, 77.21),
  C("Bengaluru", "IN", 12.97, 77.59),
  C("Hyderabad", "IN", 17.39, 78.49),
  C("Dubai", "AE", 25.2, 55.27, ["Asia/Dubai"]),
  C("Cairo", "EG", 30.04, 31.24, ["Africa/Cairo"]),
  C("Casablanca", "MA", 33.57, -7.59, ["Africa/Casablanca"]),
  C("Lagos", "NG", 6.52, 3.38, ["Africa/Lagos"]),
  C("Accra", "GH", 5.6, -0.19, ["Africa/Accra"]),
  C("Nairobi", "KE", -1.29, 36.82, ["Africa/Nairobi"]),
  C("Singapore", "SG", 1.35, 103.82, ["Asia/Singapore"]),
  C("Jakarta", "ID", -6.21, 106.85, ["Asia/Jakarta"]),
  C("Ho Chi Minh City", "VN", 10.82, 106.63, ["Asia/Ho_Chi_Minh", "Asia/Saigon"]),
  C("Bangkok", "TH", 13.76, 100.5, ["Asia/Bangkok"]),
  C("Manila", "PH", 14.6, 120.98, ["Asia/Manila"]),
  C("Taipei", "TW", 25.03, 121.57, ["Asia/Taipei"]),
  C("Tokyo", "JP", 35.68, 139.69, ["Asia/Tokyo"]),
  C("Osaka", "JP", 34.69, 135.5),
  C("Seoul", "KR", 37.57, 126.98, ["Asia/Seoul"]),
  C("Sydney", "AU", -33.87, 151.21, ["Australia/Sydney"]),
  C("Melbourne", "AU", -37.81, 144.96, ["Australia/Melbourne"]),
];

function countryName(country: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
  } catch {
    return country;
  }
}

/** A pin's precision. Half a degree is a city's width: enough for a dot, nothing more. */
function coarse(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * The edge's coordinates for this request, coarsened, from the same source as its city
 * (lib/geo.ts explains why sources are never mixed). lib/geo.ts deliberately reads none, and
 * nothing stores these on the watcher: they exist only to put a dot on one draw's map.
 */
export function readCoords(headers: Headers): { lat: number; lon: number } | null {
  const [latName, lonName] = headers.get("cf-ipcity")
    ? ["cf-iplatitude", "cf-iplongitude"]
    : ["x-vercel-ip-latitude", "x-vercel-ip-longitude"];
  const lat = Number(headers.get(latName));
  const lon = Number(headers.get(lonName));
  if (!headers.get(latName) || !headers.get(lonName) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat: coarse(lat), lon: coarse(lon) };
}

/** Where to pin someone: the edge's coordinates if it sent them, else the nearest known city. */
export function placeFor(raw: Geo, coords?: { lat: number; lon: number } | null, browserZone?: string): Place {
  // Rows saved before the header fix can hold "SÃ£o Paulo"; read them the way they were meant.
  const geo = { ...raw, city: raw.city && repairUtf8(raw.city), region: raw.region && repairUtf8(raw.region) };
  const city = geo.city?.toLowerCase();
  const exact = city ? CITIES.find((c) => c.city.toLowerCase() === city) : undefined;
  const zone = geo.timezone ?? browserZone;
  const known = geo.country?.toUpperCase();
  const near =
    exact ||
    (zone && CITIES.find((c) => c.tz?.includes(zone))) ||
    (known && CITIES.find((c) => c.country === known)) ||
    CITIES[0];
  const country = known ?? near.country;
  return {
    // A borrowed city is only ever a pin. The label stays true: their own city, else their
    // country's name, never a neighbour's city shown as theirs.
    city: geo.city ?? (near.country === country ? near.city : countryName(country)),
    country,
    flag: flagOf(country),
    lat: coords?.lat ?? near.lat,
    lon: coords?.lon ?? near.lon,
  };
}
