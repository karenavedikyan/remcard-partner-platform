import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import type { ObserverPersonalMeta } from "@/lib/clients-parity/types";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import { createObserverPersonalPersistenceBridge } from "./createObserverPersonalPersistenceBridge";

const appeal = {
  id: "a1",
  clientName: "Клиент",
  certificateId: "",
  receivingPartnerId: "u-rcv",
  referrerPartnerId: "me",
  updatedAt: "2026-01-01T00:00:00.000Z",
  stageId: "new",
};

function BridgeHarness() {
  const versionsRef = useRef<Record<string, number>>({ a1: 1 });
  const [personalMeta, setPersonalMeta] = useState<Record<string, ObserverPersonalMeta>>({});
  const persistence = createObserverPersonalPersistenceBridge(
    () => versionsRef.current,
    (patch) => {
      versionsRef.current = { ...versionsRef.current, ...patch };
    },
  );
  return (
    <ObserverPartnersListView
      appeals={[appeal]}
      partners={[
        {
          id: "u-rcv",
          name: "Партнёр",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      ]}
      dataContract={{ status: "ready" }}
      initialLayout="list"
      displayPersonalMeta={personalMeta}
      personalPersistence={persistence}
      onPersonalMetaUpdated={(meta) => setPersonalMeta((prev) => ({ ...prev, ...meta }))}
    />
  );
}

describe("P3 observer persistence via P5 bridge + intercepted fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    document.cookie = "remcard-csrf=synthetic-csrf-token";
  });

  it("PATCH personal-meta merges server alias (no injected success callback)", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/csrf")) {
        return new Response("{}", { status: 200 });
      }
      if (url.includes("/api/remcard/api/pro/referred-appeals/a1/personal-meta") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { alias?: string };
        return new Response(
          JSON.stringify({
            meta: {
              appealId: "a1",
              alias: body.alias ?? null,
              tag: null,
              note: null,
              bucket: "active",
              version: 2,
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }),
  );

    const user = userEvent.setup();
    render(<BridgeHarness />);
    await user.click(screen.getByLabelText("Выбрать: Клиент"));
    await user.click(screen.getByRole("button", { name: "Изменить" }));
    const aliasField = screen.getByLabelText("Имя для себя");
    await user.clear(aliasField);
    await user.type(aliasField, "Сохранено");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => {
      expect(screen.getByText("Сохранено")).toBeTruthy();
    });
  });

  it("surfaces VERSION_CONFLICT without clobbering selection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/csrf")) {
          return new Response("{}", { status: 200 });
        }
        if (url.includes("personal-meta") && init?.method === "PATCH") {
          return new Response(
            JSON.stringify({
              error: "Version conflict",
              code: "VERSION_CONFLICT",
              details: { currentVersion: 9 },
            }),
            { status: 409 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );
    const user = userEvent.setup();
    render(<BridgeHarness />);
    const rowCheck = screen.getByLabelText("Выбрать: Клиент");
    await user.click(rowCheck);
    await user.click(screen.getByRole("button", { name: "Изменить" }));
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => {
      expect(screen.getByText(/обновились|сервер/i)).toBeTruthy();
    });
    expect(rowCheck).toBeChecked();
  });

  it("batch move all-skipped keeps failed id selected (K5 best_effort)", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/csrf")) {
        return new Response("{}", { status: 200 });
      }
      if (
        url.includes("personal-meta") &&
        init?.method === "PATCH" &&
        JSON.parse(String(init.body)).action === "move"
      ) {
        return new Response(
          JSON.stringify({ error: "Bucket locked", code: "BUCKET_LOCKED" }),
          { status: 403 },
        );
      }
      if (url.includes("personal-batch") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            action: "move",
            mode: "best_effort",
            processedCount: 0,
            skippedCount: 1,
            processed: [],
            skipped: [{ appealId: "a1", reason: "bucket_locked" }],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<BridgeHarness />);
    await user.click(screen.getByLabelText("Выбрать: Клиент"));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    const confirm = screen.getByTestId("ca-observer-personal-confirm");
    await user.click(within(confirm).getByRole("button", { name: "В архив" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.getAllByRole("checkbox", { name: /Выбрать:/i })[0]).toBeChecked();
  });
});
