import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import type { ObserverReferredAppeal } from "@/lib/clients-parity/types";

const appeal: ObserverReferredAppeal = {
  id: "a1",
  clientName: "Клиент",
  certificateId: "",
  receivingPartnerId: "p1",
  referrerPartnerId: "me",
  updatedAt: "2026-01-01T00:00:00.000Z",
  stageId: "new",
};

describe("P3 ObserverPartnersListView persistence callbacks", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onBucketAction and merges meta; keeps failed id selected", async () => {
    const onBucketAction = vi.fn(async () => ({
      ok: true as const,
      meta: { a1: { bucket: "archived" as const } },
      failedIds: ["a1"],
    }));
    const onPersonalMetaUpdated = vi.fn();
    render(
      <ObserverPartnersListView
        appeals={[appeal]}
        partners={[{ id: "p1", name: "Партнёр", receivingOrganizationId: null, receivingBranchId: null }]}
        dataContract={{ status: "ready" }}
        initialLayout="list"
        displayPersonalMeta={{}}
        personalPersistence={{ onBucketAction }}
        onPersonalMetaUpdated={onPersonalMetaUpdated}
      />,
    );
    const rowCheck = screen.getByLabelText("Выбрать: Клиент");
    await userEvent.click(rowCheck);
    await userEvent.click(screen.getByRole("button", { name: "В архив" }));
    const confirm = screen.getByTestId("ca-observer-personal-confirm");
    await userEvent.click(within(confirm).getByRole("button", { name: "В архив" }));
    expect(onBucketAction).toHaveBeenCalled();
    expect(onPersonalMetaUpdated).toHaveBeenCalledWith({ a1: { bucket: "archived" } });
    expect(rowCheck).toBeChecked();
  });

  it("falls back to BLOCKED notice without adapter", async () => {
    render(
      <ObserverPartnersListView
        appeals={[appeal]}
        partners={[{ id: "p1", name: "Партнёр", receivingOrganizationId: null, receivingBranchId: null }]}
        dataContract={{ status: "ready" }}
        initialLayout="list"
      />,
    );
    await userEvent.click(screen.getByLabelText("Выбрать: Клиент"));
    await userEvent.click(screen.getByRole("button", { name: "В архив" }));
    const confirm = screen.getByTestId("ca-observer-personal-confirm");
    await userEvent.click(within(confirm).getByRole("button", { name: "В архив" }));
    expect(screen.getByText(/BLOCKED_PERSISTENCE/i)).toBeTruthy();
  });
});
