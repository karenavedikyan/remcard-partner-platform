import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerDiscussionInvitePanel } from "./PartnerDiscussionInvitePanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const remcardFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class RemcardApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RemcardApiError";
    }
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://app.test",
}));

async function walkToCreate() {
  await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
  await userEvent.type(screen.getByTestId("agent-discussion-invite-recipient"), "  Студия света  ");
  await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
  await userEvent.type(
    screen.getByTestId("agent-discussion-invite-subject"),
    "  Обсудим свет для клиентов  ",
  );
  await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
  await userEvent.click(screen.getByTestId("agent-discussion-invite-create"));
}

describe("PartnerDiscussionInvitePanel P8b ready / hand-off", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    remcardFetch.mockImplementation(async (url: string, init?: { method?: string; body?: unknown }) => {
      if (String(url) === "/api/partnership/discussion-invite" && (!init || !init.method || init.method === "GET")) {
        return {
          invites: [
            {
              id: "disc-1",
              recipientLabel: "Студия света",
              cooperationSubject: "Обсудим свет для клиентов",
              status: "PENDING",
              role: "author",
              expiresAt: "2026-12-01T00:00:00.000Z",
              createdAt: "2026-10-31T00:00:00.000Z",
              joinedAt: null,
              canProposeTerms: false,
            },
          ],
        };
      }
      if (String(url) === "/api/partnership/discussion-invite" && init?.method === "POST") {
        return {
          token: "tok-1",
          expiresAt: "2026-12-01T00:00:00.000Z",
          previewPath: "/invite/discussion/tok-1",
        };
      }
      if (String(url).includes("/api/partnership/discussion-invite/") && init?.method === "DELETE") {
        return { ok: true };
      }
      return {};
    });
  });

  it("replaces wizard with ready snapshot after one trimmed create POST", async () => {
    const onReadyChange = vi.fn();
    render(
      <PartnerDiscussionInvitePanel
        showSectionTitle={false}
        presentationWizard
        onReadyChange={onReadyChange}
      />,
    );
    await walkToCreate();

    await waitFor(() => {
      expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("agent-discussion-invite-wizard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-discussion-invite-create")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-discussion-invite-ready-message")).toHaveTextContent(
      "Обсудим свет для клиентов",
    );
    // R1 ready: history + raw URL are not in the success composition until share/open-card.
    expect(screen.queryByTestId("discussion-invite-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("discussion-invite-created-url")).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenCalledWith(true);

    await userEvent.click(screen.getByTestId("agent-discussion-invite-share"));
    expect(screen.getByTestId("discussion-invite-created-url")).toHaveValue(
      "https://app.test/invite/discussion/tok-1",
    );
    await userEvent.click(screen.getByTestId("agent-discussion-invite-open-card"));
    expect(screen.getByTestId("discussion-invite-list")).toBeInTheDocument();

    const posts = remcardFetch.mock.calls.filter(
      (call) => call[1] && (call[1] as { method?: string }).method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]![1]).toEqual({
      method: "POST",
      body: {
        recipientLabel: "Студия света",
        cooperationSubject: "Обсудим свет для клиентов",
      },
    });
  });

  it("keeps review on create error and does not show ready", async () => {
    remcardFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (String(url) === "/api/partnership/discussion-invite" && (!init || !init.method || init.method === "GET")) {
        return { invites: [] };
      }
      if (init?.method === "POST") {
        const { RemcardApiError } = await import("@/lib/api-client");
        throw new RemcardApiError("Сервер недоступен");
      }
      return {};
    });

    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await walkToCreate();

    await waitFor(() => {
      expect(screen.getByTestId("agent-discussion-invite-error")).toHaveTextContent(
        "Сервер недоступен",
      );
    });
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-discussion-invite-ready")).not.toBeInTheDocument();
  });

  it("copies message+URL only on explicit click; share/copy do not POST", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await walkToCreate();
    await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument());
    remcardFetch.mockClear();

    await userEvent.click(screen.getByTestId("agent-discussion-invite-share"));
    expect(screen.getByTestId("agent-discussion-invite-share-panel")).toBeInTheDocument();
    expect(screen.getByTestId("agent-discussion-invite-share-text")).toHaveValue(
      "Обсудим свет для клиентов\n\nhttps://app.test/invite/discussion/tok-1",
    );

    await userEvent.click(screen.getByTestId("agent-discussion-invite-copy-message"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "Обсудим свет для клиентов\n\nhttps://app.test/invite/discussion/tok-1",
      );
      expect(screen.getByTestId("agent-discussion-invite-share-status")).toHaveTextContent(
        "Текст и ссылка скопированы",
      );
    });

    await userEvent.click(screen.getByTestId("agent-discussion-invite-copy-url"));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://app.test/invite/discussion/tok-1");
      expect(screen.getByTestId("agent-discussion-invite-share-status")).toHaveTextContent(
        "Ссылка скопирована",
      );
    });

    expect(
      remcardFetch.mock.calls.some(
        (call) => call[1] && (call[1] as { method?: string }).method === "POST",
      ),
    ).toBe(false);
    expect(screen.queryByText(/отправлено/i)).not.toBeInTheDocument();
  });

  it("shows manual fallback when clipboard is denied", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });

    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await walkToCreate();
    await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("agent-discussion-invite-share"));
    await userEvent.click(screen.getByTestId("agent-discussion-invite-copy-url"));
    await waitFor(() => {
      expect(screen.getByTestId("agent-discussion-invite-share-status")).toHaveTextContent(
        /вручную/i,
      );
    });
  });

  it("create-another restores wizard without a new POST", async () => {
    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await walkToCreate();
    await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument());
    remcardFetch.mockClear();

    await userEvent.click(screen.getByTestId("agent-discussion-invite-create-another"));
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-discussion-invite-ready")).not.toBeInTheDocument();
    expect(
      remcardFetch.mock.calls.some(
        (call) => call[1] && (call[1] as { method?: string }).method === "POST",
      ),
    ).toBe(false);
  });

  it("leaves non-agent flat UI with notice, not ready composition", async () => {
    render(<PartnerDiscussionInvitePanel showSectionTitle={false} />);
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    await userEvent.type(screen.getByLabelText(/Имя или название партнёра/i), "Магазин");
    await userEvent.type(screen.getByLabelText(/Предмет сотрудничества/i), "Тема");
    await userEvent.click(screen.getByRole("button", { name: /Создать ссылку/i }));
    await waitFor(() => {
      expect(screen.getByTestId("discussion-invite-created")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("agent-discussion-invite-ready")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-discussion-invite-wizard")).not.toBeInTheDocument();
  });

  it("still allows revoke from list after ready via open-card", async () => {
    render(<PartnerDiscussionInvitePanel showSectionTitle={false} presentationWizard />);
    await walkToCreate();
    await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-ready")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("agent-discussion-invite-open-card"));
    await userEvent.click(screen.getByRole("button", { name: /^Отозвать$/i }));
    await waitFor(() => {
      expect(
        remcardFetch.mock.calls.some(
          (call) => call[1] && (call[1] as { method?: string }).method === "DELETE",
        ),
      ).toBe(true);
    });
  });
});
