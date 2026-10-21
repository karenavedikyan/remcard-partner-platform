import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { PartnersHandshakeIcon, PARTNERS_HANDSHAKE_PATHS } from "./PartnersHandshakeIcon";
import { NavIconPartners } from "@/components/layout/NavIcons";
import { AgentNavIcon } from "@/components/layout/agent/AgentNavIcon";

function svgSignature(container: HTMLElement) {
  const svg = container.querySelector("svg");
  expect(svg).toBeTruthy();
  return {
    width: svg?.getAttribute("width"),
    height: svg?.getAttribute("height"),
    viewBox: svg?.getAttribute("viewBox"),
    strokeWidth: svg?.getAttribute("stroke-width") ?? svg?.getAttribute("strokeWidth"),
    paths: [...(svg?.querySelectorAll("path") ?? [])].map((p) => p.getAttribute("d")),
  };
}

describe("PartnersHandshakeIcon", () => {
  it("matches reference lucide handshake path set", () => {
    expect(PARTNERS_HANDSHAKE_PATHS).toHaveLength(5);
    expect(PARTNERS_HANDSHAKE_PATHS[0]).toBe("m11 17 2 2a1 1 0 1 0 3-3");
  });

  it("renders the same geometry in AppShell and AgentAppShell nav wrappers", () => {
    const base = render(<PartnersHandshakeIcon />);
    const master = render(<NavIconPartners />);
    const agent = render(<AgentNavIcon section={{ icon: "partners" }} />);
    const expected = svgSignature(base.container);
    expect(svgSignature(master.container)).toEqual(expected);
    expect(svgSignature(agent.container)).toEqual(expected);
  });
});
