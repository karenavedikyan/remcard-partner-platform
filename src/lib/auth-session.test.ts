import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consentRequirementKey } from "./auth-session.ts";
import type { ConsentRequirement } from "./cabinet-readiness.ts";

describe("consentRequirementKey", () => {
  it("binds checkbox to kind and legalDocumentId", () => {
    const req: ConsentRequirement = {
      kind: "TERMS",
      legalDocumentId: "doc-a",
      version: "1",
      url: "/terms",
      status: "missing",
    };
    assert.equal(consentRequirementKey(req), "TERMS:doc-a");
    assert.notEqual(
      consentRequirementKey({ ...req, legalDocumentId: "doc-b" }),
      consentRequirementKey(req),
    );
  });
});
