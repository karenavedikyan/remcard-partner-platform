/** Shared Yandex Maps geocoder helpers (mirrors remcard-navigator AddressGeocoder). */

export type YmapsGeo = {
  geometry: { getCoordinates: () => [number, number] };
  properties: { get: (k: string) => unknown };
};

export type YmapsNamespace = {
  ready: (cb: () => void) => void;
  geocode: (q: string, opts?: { results?: number }) => {
    then: (cb: (res: { geoObjects: { get: (i: number) => YmapsGeo } }) => void) => void;
  };
};

export function extractCityDistrict(geo: YmapsGeo): { city: string | null; district: string | null } {
  const meta = geo.properties.get("metaDataProperty") as
    | { GeocoderMetaData?: { Address?: { Components?: { kind: string; name: string }[] } } }
    | undefined;
  const comps = meta?.GeocoderMetaData?.Address?.Components ?? [];
  let city: string | null = null;
  let district: string | null = null;
  for (const c of comps) {
    if (c.kind === "locality") city = c.name;
    if (c.kind === "district" || c.kind === "area" || c.kind === "suburb") {
      if (!district) district = c.name;
    }
  }
  return { city, district };
}

let ymapsLoadPromise: Promise<YmapsNamespace> | null = null;

export function loadYmaps(apiKey: string): Promise<YmapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  const w = window as unknown as { ymaps?: YmapsNamespace };
  if (w.ymaps) {
    return Promise.resolve(w.ymaps);
  }
  if (!ymapsLoadPromise) {
    ymapsLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
      s.async = true;
      s.onload = () => {
        const y = (window as unknown as { ymaps?: YmapsNamespace }).ymaps;
        if (y) resolve(y);
        else reject(new Error("ymaps missing"));
      };
      s.onerror = () => reject(new Error("ymaps script failed"));
      document.head.appendChild(s);
    });
  }
  return ymapsLoadPromise;
}

export function buildBranchGeocodeQuery(city: string, addressLine: string): string {
  const c = city.trim();
  const a = addressLine.trim();
  if (c && a) return `${c}, ${a}`;
  return a || c;
}
