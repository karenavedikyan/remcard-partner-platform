import { describe, expect, it } from "vitest";
import { walletEmptyCopy } from "./copy";

describe("walletEmptyCopy history steps", () => {
  it("links seller confirmation to history when capability granted", () => {
    const copy = walletEmptyCopy("store", { canLinkReadOnlyHistory: true });
    const confirm = copy.steps.find((s) => s.title === "Подтверждение");
    expect(confirm?.action).toMatchObject({ kind: "link", href: "/history" });
  });

  it("static seller history steps when capability absent", () => {
    const copy = walletEmptyCopy("company");
    expect(copy.steps.filter((s) => s.action.kind === "link" && s.action.href === "/history")).toHaveLength(
      0,
    );
  });
});
