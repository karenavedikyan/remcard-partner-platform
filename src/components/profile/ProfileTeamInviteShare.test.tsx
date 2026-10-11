import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileTeamInviteShare } from "./ProfileTeamInviteShare";

const ctx = {
  url: "https://app.example/invite/accept?token=secret",
  inviteeFullName: "Жуков Сергей",
  inviterDisplayName: "Owner",
  organizationName: "Org",
  scope: "ORGANIZATION",
};

describe("ProfileTeamInviteShare", () => {
  let writeText: ReturnType<typeof vi.spyOn>;
  let share: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: vi.fn() },
      });
    }
    writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    share = vi.fn();
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
  });

  it("copies full message and reports success", async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();

    render(<ProfileTeamInviteShare ctx={ctx} onFeedback={onFeedback} />);
    await user.click(screen.getByTestId("team-copy-invite-message"));

    await waitFor(() =>
      expect(onFeedback).toHaveBeenCalledWith("Приглашение скопировано"),
    );
  });

  it("falls back to manual copy when clipboard rejects", async () => {
    const user = userEvent.setup();
    const onManualCopy = vi.fn();
    writeText.mockRejectedValue(new Error("denied"));

    render(<ProfileTeamInviteShare ctx={ctx} onManualCopy={onManualCopy} />);
    await user.click(screen.getByTestId("team-copy-invite-link"));

    await waitFor(() => expect(onManualCopy).toHaveBeenCalledWith(ctx.url));
  });

  it("ignores AbortError on native share but surfaces other errors", async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    const onManualCopy = vi.fn();
    share.mockRejectedValueOnce(new DOMException("aborted", "AbortError")).mockRejectedValueOnce(
      new Error("fail"),
    );

    render(
      <ProfileTeamInviteShare ctx={ctx} onFeedback={onFeedback} onManualCopy={onManualCopy} />,
    );
    await user.click(screen.getByTestId("team-share-invite"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(onFeedback).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("team-share-invite"));
    await waitFor(() => expect(onFeedback).toHaveBeenCalledWith(expect.stringContaining("Поделиться")));
    expect(onManualCopy).toHaveBeenCalled();
  });
});
