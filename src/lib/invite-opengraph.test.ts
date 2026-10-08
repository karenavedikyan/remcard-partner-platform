import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentType, size } from "../app/invite/opengraph-image.tsx";
import { contentType as siteContentType, size as siteSize } from "../app/opengraph-image.tsx";

describe("invite opengraph image", () => {
  it("uses standard OG dimensions and png", () => {
    assert.equal(size.width, 1200);
    assert.equal(size.height, 630);
    assert.equal(contentType, "image/png");
  });
});

describe("site opengraph image", () => {
  it("uses standard OG dimensions and png", () => {
    assert.equal(siteSize.width, 1200);
    assert.equal(siteSize.height, 630);
    assert.equal(siteContentType, "image/png");
  });
});
