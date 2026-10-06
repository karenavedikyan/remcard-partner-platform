import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
