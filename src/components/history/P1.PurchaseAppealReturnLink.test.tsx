import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

import { PurchaseAppealReturnLink } from "./PurchaseAppealReturnLink";
import {
  parseReceivingAppealReturnId,
  receivingAppealReturnHref,
} from "@/lib/clients-parity/receiving-appeal-return-href";

describe("receivingAppealReturnHref (P1 / P4 contract mirror)", () => {
  it("builds receiving clients deep link with encoded appealId", () => {
    expect(receivingAppealReturnHref("appeal_1")).toBe(
      "/clients?direction=receiving&appealId=appeal_1",
    );
    expect(receivingAppealReturnHref("a b")).toBe(
      "/clients?direction=receiving&appealId=a+b",
    );
  });
});

describe("parseReceivingAppealReturnId", () => {
  it("accepts scoped tokens and rejects malformed or reserved ids", () => {
    expect(parseReceivingAppealReturnId("appeal_1")).toBe("appeal_1");
    expect(parseReceivingAppealReturnId("  appeal_2  ")).toBe("appeal_2");
    expect(parseReceivingAppealReturnId(null)).toBeNull();
    expect(parseReceivingAppealReturnId("")).toBeNull();
    expect(parseReceivingAppealReturnId("https://evil.test")).toBeNull();
    expect(parseReceivingAppealReturnId("//clients")).toBeNull();
    expect(parseReceivingAppealReturnId("batch")).toBeNull();
    expect(parseReceivingAppealReturnId("a?b")).toBeNull();
  });
});

describe("PurchaseAppealReturnLink", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("renders nothing without appealId query", () => {
    const { container } = render(<PurchaseAppealReturnLink />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders canonical return link for valid appealId", () => {
    mockSearchParams = new URLSearchParams("appealId=appeal_9");
    render(<PurchaseAppealReturnLink />);
    const anchor = screen.getByRole("link", { name: "К обращению" });
    expect(anchor).toHaveAttribute(
      "href",
      "/clients?direction=receiving&appealId=appeal_9",
    );
  });

  it("ignores invalid appealId query", () => {
    mockSearchParams = new URLSearchParams("appealId=https%3A%2F%2Fx");
    const { container } = render(<PurchaseAppealReturnLink />);
    expect(container).toBeEmptyDOMElement();
  });
});
