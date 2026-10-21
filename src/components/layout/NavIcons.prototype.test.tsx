import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  NavIconClients,
  NavIconRecommendations,
  NavIconWallet,
  NAV_ICONS,
} from "./NavIcons";

function pathDs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("path")).map((el) => el.getAttribute("d") ?? "");
}

describe("prototype nav icon geometry", () => {
  it("exposes wallet in NAV_ICONS", () => {
    expect(NAV_ICONS.wallet).toBe(NavIconWallet);
  });

  it("renders users-round clients paths", () => {
    const { container } = render(<NavIconClients />);
    expect(pathDs(container)).toEqual([
      "M18 21a8 8 0 0 0-16 0",
      "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3",
    ]);
    expect(container.querySelector("circle")?.getAttribute("cx")).toBe("10");
  });

  it("renders ticket recommendations paths", () => {
    const { container } = render(<NavIconRecommendations />);
    expect(pathDs(container)).toEqual([
      "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
      "M13 5v2",
      "M13 17v2",
      "M13 11v2",
    ]);
  });

  it("renders wallet paths with prototype stroke width", () => {
    const { container } = render(<NavIconWallet />);
    expect(pathDs(container)).toEqual([
      "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",
      "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
    ]);
    expect(container.querySelector("svg")?.getAttribute("stroke-width")).toBe("1.7");
  });
});
