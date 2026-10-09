/** Shared Yandex Maps geocoder helpers (mirrors remcard-navigator AddressGeocoder). */

export type YmapsGeo = {
  geometry: { getCoordinates: () => [number, number] };
  properties: { get: (k: string) => unknown };
};

export type YmapsGeocodeResult = {
  geoObjects: { get: (index: number) => YmapsGeo | null | undefined };
};

/** Yandex API returns a thenable that accepts onRejected for async geocode failures. */
export type YmapsGeocodeRequest = {
  then: (
    onFulfilled: (result: YmapsGeocodeResult) => void,
    onRejected?: (reason: unknown) => void,
  ) => void;
};

export type YmapsNamespace = {
  ready: (callback: () => void) => void;
  geocode: (query: string, opts?: { results?: number }) => YmapsGeocodeRequest;
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

type WindowWithYmaps = Window & { ymaps?: YmapsNamespace };

let ymapsLoadInFlight: Promise<YmapsNamespace> | null = null;

function readWindowYmaps(): YmapsNamespace | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as WindowWithYmaps).ymaps;
}

function startYmapsScriptLoad(apiKey: string): Promise<YmapsNamespace> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.dataset.remcardYmapsLoader = "1";
    script.onload = () => {
      const ymaps = readWindowYmaps();
      if (ymaps) resolve(ymaps);
      else reject(new Error("ymaps missing after script load"));
    };
    script.onerror = () => reject(new Error("ymaps script failed"));
    document.head.appendChild(script);
  });
}

/** Reset cached loader state (tests only). */
export function resetYmapsLoaderForTests(): void {
  ymapsLoadInFlight = null;
}

export function loadYmaps(apiKey: string): Promise<YmapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  const existing = readWindowYmaps();
  if (existing) {
    return Promise.resolve(existing);
  }
  if (!ymapsLoadInFlight) {
    ymapsLoadInFlight = startYmapsScriptLoad(apiKey).finally(() => {
      ymapsLoadInFlight = null;
    });
  }
  return ymapsLoadInFlight;
}

export function runYmapsGeocode(ymaps: YmapsNamespace, query: string): Promise<YmapsGeocodeResult> {
  return new Promise((resolve, reject) => {
    ymaps.ready(() => {
      ymaps.geocode(query, { results: 1 }).then(resolve, reject);
    });
  });
}

export function buildBranchGeocodeQuery(city: string, addressLine: string): string {
  const c = city.trim();
  const a = addressLine.trim();
  if (c && a) return `${c}, ${a}`;
  return a || c;
}
