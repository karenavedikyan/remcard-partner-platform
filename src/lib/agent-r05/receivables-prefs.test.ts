import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RECEIVABLES_PREFS,
  RECEIVABLES_PREFS_KEY,
  defaultReceivablesPrefs,
  parseReceivablesPrefs,
} from "./receivables-prefs";

describe("receivables-prefs", () => {
  afterEach(() => localStorage.clear());

  it("defaults unknown view and invalid pageSize", () => {
    expect(parseReceivablesPrefs(JSON.stringify({ view: "huge", pageSize: 17 }))).toEqual(
      DEFAULT_RECEIVABLES_PREFS,
    );
  });

  it("falls back on corrupt JSON", () => {
    expect(parseReceivablesPrefs("{not-json")).toEqual(defaultReceivablesPrefs());
  });

  it("accepts list/small/medium/large and 25/50/100", () => {
    for (const view of ["list", "small", "medium", "large"] as const) {
      for (const pageSize of [25, 50, 100] as const) {
        expect(parseReceivablesPrefs(JSON.stringify({ view, pageSize }))).toEqual({
          view,
          pageSize,
        });
      }
    }
  });
});
