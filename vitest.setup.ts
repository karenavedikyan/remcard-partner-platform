import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ??= "vitest-yandex-key";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

vi.mock("next/link", () => ({
  default: (props: { href: string; children: unknown }) => {
    const React = require("react") as typeof import("react");
    return React.createElement("a", { href: props.href }, props.children as React.ReactNode);
  },
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
