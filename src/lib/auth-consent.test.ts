import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consentErrorMessage, consentLabel } from "./auth-consent.ts";

describe("auth-consent", () => {
  it("maps document version mismatch", () => {
    assert.match(
      consentErrorMessage(409, { error: "DOCUMENT_VERSION_MISMATCH" }),
      /обнов/i,
    );
  });

  it("maps missing active document", () => {
    assert.match(consentErrorMessage(503, { error: "NO_ACTIVE_DOCUMENT" }), /недоступен/i);
  });

  it("labels known consent kinds", () => {
    assert.match(consentLabel("TERMS"), /соглашение/i);
    assert.match(consentLabel("PUBLIC_OFFER_PRO"), /оферт/i);
  });
});
