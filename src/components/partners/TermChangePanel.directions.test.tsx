import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TermChangePanel } from "./TermChangePanel";
import type { Partnership } from "@/lib/types";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

function row(direction: "incoming" | "outgoing" | null): Partnership {
  return {
    id: "p1", status: "ACTIVE", initiatedBy: "a", pendingProposedBy: null, note: null,
    createdAt: "", updatedAt: "", storeUserId: "recv", proUserId: "issuer",
    terms: [{ id: "t1", category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false, minMargin: null }],
    storeUser: { id: "recv", displayName: "Получатель", city: "", specializations: [], storeCategories: [], partnerType: "STORE" },
    proUser: { id: "issuer", displayName: "Выдающий", city: "", specializations: [], storeCategories: [], partnerType: "COMPANY" },
    directionInfo: direction && {
      direction, issuerUserId: "issuer", receiverUserId: "recv", legacyInverted: false,
      counterpartyUserId: direction === "incoming" ? "issuer" : "recv", reversePartnershipId: null, reverseStatus: null,
    },
  } as unknown as Partnership;
}

function mount(p: Partnership, meId: string) {
  return render(
    <TermChangePanel partnership={p} meId={meId} partnerTitle="Партнёр" requests={[]} loadState="loaded"
      loadError="" onReload={() => {}} onChanged={() => {}} onCloseRequest={() => {}} />,
  );
}

describe("TermChangePanel receiving side", () => {
  it("lets the receiver propose changes to its own terms", () => {
    mount(row("incoming"), "recv");
    expect(screen.getByTestId("term-change-submit")).toBeEnabled();
    expect(screen.queryByTestId("term-change-issuer-note")).toBeNull();
  });

  it("does not let the issuer propose changes to the receiver's terms", () => {
    mount(row("outgoing"), "issuer");
    expect(screen.getByTestId("term-change-issuer-note")).toBeInTheDocument();
    expect(screen.queryByTestId("term-change-submit")).toBeNull();
  });

  it("keeps the legacy behaviour for rows without directionInfo", () => {
    mount(row(null), "issuer");
    expect(screen.getByTestId("term-change-submit")).toBeEnabled();
  });
});
