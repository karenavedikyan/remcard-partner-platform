import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentType, size } from "../app/invite/opengraph-image.tsx";

describe("invite opengraph image", () => {
  it("uses standard OG dimensions and png", () => {
    assert.equal(size.width, 1200);
    assert.equal(size.height, 630);
    assert.equal(contentType, "image/png");
  });
});
