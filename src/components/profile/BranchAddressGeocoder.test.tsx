import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BranchAddressGeocoder, type BranchAddressGeoValue } from "./BranchAddressGeocoder";

vi.mock("@/lib/yandex-address-geocoder", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/yandex-address-geocoder")>();
  return {
    ...actual,
    loadYmaps: vi.fn(),
    runYmapsGeocode: vi.fn(),
  };
});

import * as ymapsLib from "@/lib/yandex-address-geocoder";

const emptyGeo: BranchAddressGeoValue = {
  addressCity: null,
  addressDistrict: null,
  addressGeohash: null,
};

describe("BranchAddressGeocoder stale response", () => {
  it("ignores late geocode result after city/address change", async () => {
    vi.mocked(ymapsLib.loadYmaps).mockResolvedValue({
      ready: (cb) => cb(),
      geocode: () => ({ then: () => {} }),
    });

    let resolveSlow: ((v: ymapsLib.YmapsGeocodeResult) => void) | null = null;
    vi.mocked(ymapsLib.runYmapsGeocode).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSlow = resolve;
        }),
    );

    const onChange = vi.fn();
    const { rerender } = render(
      <BranchAddressGeocoder
        city="Краснодар"
        addressLine="ул. Старая"
        value={emptyGeo}
        onChange={onChange}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("branch-address-search"));

    rerender(
      <BranchAddressGeocoder
        city="Краснодар"
        addressLine="ул. Новая"
        value={emptyGeo}
        onChange={onChange}
      />,
    );

    const geo = {
      geometry: { getCoordinates: () => [38.9, 45.0] as [number, number] },
      properties: {
        get: (k: string) => (k === "text" ? "Краснодар, ул. Старая" : null),
      },
    };
    resolveSlow?.({ geoObjects: { get: (i) => (i === 0 ? geo : null) } });

    await waitFor(() => {
      expect(screen.queryByTestId("branch-address-preview")).not.toBeInTheDocument();
    });
  });
});
