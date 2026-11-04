import { describe, expect, it } from "vitest";
import {
  isCertificatesWelcomeDecisionPending,
  isClientsWelcomeDecisionPending,
  isHomeMetricsPresentationPending,
  isPartnersOverviewPresentationPending,
  isRecommendationsWelcomeDecisionPending,
  isScannerWelcomeDecisionPending,
  isTeamWelcomeDecisionPending,
} from "./welcomeFirstPaintPending";

describe("welcomeFirstPaintPending helpers", () => {
  it("clients pending only on baseline initial load", () => {
    expect(
      isClientsWelcomeDecisionPending({
        loadState: "loading",
        page: 1,
        appliedQ: "",
        archived: false,
        sort: "updated_desc",
        itemsLength: 0,
      }),
    ).toBe(true);
    expect(
      isClientsWelcomeDecisionPending({
        loadState: "loading",
        page: 1,
        appliedQ: "x",
        archived: false,
        sort: "updated_desc",
        itemsLength: 0,
      }),
    ).toBe(false);
    expect(
      isClientsWelcomeDecisionPending({
        loadState: "loading",
        page: 1,
        appliedQ: "",
        archived: false,
        sort: "updated_desc",
        itemsLength: 2,
      }),
    ).toBe(false);
  });

  it("certificates pending respects filters and retained rows", () => {
    expect(
      isCertificatesWelcomeDecisionPending({
        loadState: "loading",
        itemsLength: 0,
        archived: false,
        filtersActive: false,
      }),
    ).toBe(true);
    expect(
      isCertificatesWelcomeDecisionPending({
        loadState: "loading",
        itemsLength: 0,
        archived: true,
        filtersActive: false,
      }),
    ).toBe(false);
  });

  it("partners pending only for unresolved initial load", () => {
    expect(
      isPartnersOverviewPresentationPending({ loading: true, listReady: false, error: "" }),
    ).toBe(true);
    expect(
      isPartnersOverviewPresentationPending({ loading: false, listReady: false, error: "" }),
    ).toBe(true);
    expect(
      isPartnersOverviewPresentationPending({ loading: false, listReady: true, error: "" }),
    ).toBe(false);
    expect(
      isPartnersOverviewPresentationPending({
        loading: true,
        listReady: true,
        error: "",
      }),
    ).toBe(false);
  });

  it("partners errors and malformed outcomes are not pending", () => {
    expect(
      isPartnersOverviewPresentationPending({
        loading: false,
        listReady: false,
        error: "Не удалось загрузить список",
      }),
    ).toBe(false);
    expect(
      isPartnersOverviewPresentationPending({
        loading: false,
        listReady: false,
        error: "Forbidden",
      }),
    ).toBe(false);
  });

  it("scanner pending for idle and loading probes", () => {
    expect(isScannerWelcomeDecisionPending({ status: "loading" })).toBe(true);
    expect(isScannerWelcomeDecisionPending({ status: "idle" })).toBe(true);
    expect(isScannerWelcomeDecisionPending({ status: "empty_confirmed" })).toBe(false);
  });

  it("team pending while loading without error", () => {
    expect(isTeamWelcomeDecisionPending({ loading: true, error: "" })).toBe(true);
    expect(isTeamWelcomeDecisionPending({ loading: true, error: "fail" })).toBe(false);
  });

  it("home metrics pending while loadState loading", () => {
    expect(isHomeMetricsPresentationPending("loading")).toBe(true);
    expect(isHomeMetricsPresentationPending("loaded")).toBe(false);
  });

  it("recommendations pending on initial fetch", () => {
    expect(
      isRecommendationsWelcomeDecisionPending({ loadState: "loading", itemsLength: 0 }),
    ).toBe(true);
    expect(
      isRecommendationsWelcomeDecisionPending({ loadState: "loading", itemsLength: 1 }),
    ).toBe(false);
  });
});
