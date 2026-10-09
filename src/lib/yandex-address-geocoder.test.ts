import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBranchGeocodeQuery,
  loadYmaps,
  resetYmapsLoaderForTests,
  runYmapsGeocode,
  type YmapsNamespace,
} from "@/lib/yandex-address-geocoder";

describe("buildBranchGeocodeQuery", () => {
  it("combines city and address", () => {
    expect(buildBranchGeocodeQuery("Краснодар", "ул. Красная, 1")).toBe(
      "Краснодар, ул. Красная, 1",
    );
  });
});

describe("runYmapsGeocode", () => {
  it("rejects when geocode thenable rejects asynchronously", async () => {
    const ymaps: YmapsNamespace = {
      ready: (cb) => cb(),
      geocode: () => ({
        then: (_ok, fail) => {
          queueMicrotask(() => fail?.(new Error("provider async reject")));
        },
      }),
    };
    await expect(runYmapsGeocode(ymaps, "Краснодар, ул. 1")).rejects.toThrow("provider async reject");
  });

  it("resolves on successful geocode", async () => {
    const geo = {
      geometry: { getCoordinates: () => [38.9, 45.0] as [number, number] },
      properties: { get: () => "text" },
    };
    const ymaps: YmapsNamespace = {
      ready: (cb) => cb(),
      geocode: () => ({
        then: (ok) => {
          ok({ geoObjects: { get: (i) => (i === 0 ? geo : null) } });
        },
      }),
    };
    const res = await runYmapsGeocode(ymaps, "q");
    expect(res.geoObjects.get(0)).toBe(geo);
  });
});

describe("loadYmaps", () => {
  afterEach(() => {
    resetYmapsLoaderForTests();
    document.querySelectorAll("script[data-remcard-ymaps-loader]").forEach((n) => n.remove());
    delete (window as Window & { ymaps?: YmapsNamespace }).ymaps;
  });

  it("retries script load after failure without caching rejected promise", async () => {
    let attempt = 0;
    const appendSpy = vi.spyOn(document.head, "appendChild");

    appendSpy.mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      if (script.tagName === "SCRIPT" && script.dataset.remcardYmapsLoader) {
        attempt += 1;
        queueMicrotask(() => {
          if (attempt === 1) {
            script.onerror?.(new Event("error"));
          } else {
            (window as Window & { ymaps?: YmapsNamespace }).ymaps = {
              ready: (cb) => cb(),
              geocode: () => ({ then: () => {} }),
            };
            script.onload?.(new Event("load"));
          }
        });
      }
      return node;
    });

    const first = loadYmaps("key-a");
    await expect(first).rejects.toThrow("ymaps script failed");
    expect(attempt).toBe(1);

    const second = loadYmaps("key-a");
    await expect(second).resolves.toBeTruthy();
    expect(attempt).toBe(2);

    appendSpy.mockRestore();
  });
});
