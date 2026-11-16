import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { remcardFetch } from "@/lib/api-client";
import { ObserverPartnersWorkspace } from "./ObserverPartnersWorkspace";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  remcardFetch: vi.fn(),
}));

const api = vi.mocked(remcardFetch);
const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => {
  unhandled.push(reason);
};

beforeEach(() => {
  unhandled.length = 0;
  process.on("unhandledRejection", onUnhandled);
  api.mockReset();
  api.mockImplementation(
    (_path: string, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("signal is aborted without reason", "AbortError")),
        );
      }),
  );
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
});

describe("Observer workspace abort on unmount", () => {
  it("leaves no unhandled AbortError when the page is left while loading", async () => {
    const view = render(<ObserverPartnersWorkspace />);
    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(unhandled).toEqual([]);
  });
});
