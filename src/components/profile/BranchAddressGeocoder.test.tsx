import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function geoResult(text: string) {
  return {
    geoObjects: {
      get: (i: number) =>
        i === 0
          ? {
              geometry: { getCoordinates: () => [38.975313, 45.03547] as [number, number] },
              properties: {
                get: (k: string) =>
                  k === "text"
                    ? text
                    : {
                        metaDataProperty: {
                          GeocoderMetaData: {
                            Address: { Components: [{ kind: "locality", name: "Краснодар" }] },
                          },
                        },
                      },
              },
            }
          : null,
    },
  };
}

beforeEach(() => {
  vi.mocked(ymapsLib.loadYmaps).mockResolvedValue({
    ready: (cb) => cb(),
    geocode: () => ({ then: () => {} }),
  });
});

describe("BranchAddressGeocoder stale response", () => {
  it("ignores late geocode result after city/address change", async () => {
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

    resolveSlow?.(geoResult("Краснодар, ул. Старая"));

    await waitFor(() => {
      expect(screen.queryByTestId("branch-address-preview")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("branch-address-search")).not.toBeDisabled();
  });

  it("allows new search while old request completes; confirms B only", async () => {
    const pendingA: { resolve: ((v: ymapsLib.YmapsGeocodeResult) => void) | null } = {
      resolve: null,
    };
    const pendingB: { resolve: ((v: ymapsLib.YmapsGeocodeResult) => void) | null } = {
      resolve: null,
    };

    vi.mocked(ymapsLib.runYmapsGeocode).mockImplementation((_, query) => {
      if (query.includes("ул. A")) {
        return new Promise((resolve) => {
          pendingA.resolve = resolve;
        });
      }
      if (query.includes("ул. B")) {
        return new Promise((resolve) => {
          pendingB.resolve = resolve;
        });
      }
      return Promise.reject(new Error(`unexpected query ${query}`));
    });

    const onChange = vi.fn();
    const { rerender } = render(
      <BranchAddressGeocoder
        city="Краснодар"
        addressLine="ул. A"
        value={emptyGeo}
        onChange={onChange}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("branch-address-search"));
    expect(screen.getByTestId("branch-address-search")).toBeDisabled();

    rerender(
      <BranchAddressGeocoder
        city="Краснодар"
        addressLine="ул. B"
        value={emptyGeo}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("branch-address-search")).not.toBeDisabled();
    });

    await user.click(screen.getByTestId("branch-address-search"));
    expect(screen.getByTestId("branch-address-search")).toBeDisabled();

    pendingA.resolve?.(geoResult("Краснодар, ул. A"));
    await waitFor(() => {
      expect(screen.queryByText(/Найдено:.*ул\. A/)).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("branch-address-search")).toBeDisabled();

    pendingB.resolve?.(geoResult("Краснодар, ул. B"));
    await waitFor(() => {
      expect(screen.getByText(/Найдено:.*ул\. B/)).toBeInTheDocument();
    });
    expect(screen.getByTestId("branch-address-search")).not.toBeDisabled();

    await user.click(screen.getByTestId("branch-address-confirm"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ addressGeohash: expect.stringMatching(/^[a-z0-9]{5}$/) }),
    );
  });
});
