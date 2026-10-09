import { describe, expect, it } from "vitest";
import { masterDirectionLabel } from "./master-direction-label";

describe("masterDirectionLabel", () => {
  it("resolves L1 stage ids to Russian titles", () => {
    expect(masterDirectionLabel("L1-0")).toBe("Диагностика");
  });

  it("resolves trade ids to Russian labels", () => {
    expect(masterDirectionLabel("plumbing")).toBe("Сантехника");
    expect(masterDirectionLabel("electrical")).toBe("Электрика");
  });
});
