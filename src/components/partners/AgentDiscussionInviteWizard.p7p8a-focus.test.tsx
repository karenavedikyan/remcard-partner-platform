import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgentDiscussionInviteWizard } from "./AgentDiscussionInviteWizard";

function Harness({
  creating = false,
  error = "",
  onCreate = vi.fn(),
}: {
  creating?: boolean;
  error?: string;
  onCreate?: () => void;
}) {
  const [recipientLabel, setRecipientLabel] = useState("Партнёр");
  const [cooperationSubject, setCooperationSubject] = useState("Сообщение");
  return (
    <AgentDiscussionInviteWizard
      recipientLabel={recipientLabel}
      cooperationSubject={cooperationSubject}
      onRecipientLabelChange={setRecipientLabel}
      onCooperationSubjectChange={setCooperationSubject}
      creating={creating}
      error={error}
      onCreate={onCreate}
    />
  );
}

async function review() {
  fireEvent.click(screen.getByTestId("agent-discussion-invite-next"));
  await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-subject")).toHaveFocus());
  fireEvent.click(screen.getByTestId("agent-discussion-invite-next"));
  await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-create")).toHaveFocus());
}

describe("Computer: P7/P8a async error focus", () => {
  it("restores create/retry focus after first async error, not on a later render", async () => {
    const { rerender } = render(<Harness />);
    await review();
    rerender(<Harness creating />);
    expect(screen.getByTestId("agent-discussion-invite-create")).toBeDisabled();
    const sink = document.createElement("button");
    sink.textContent = "QA focus sink";
    document.body.append(sink);
    sink.focus();
    expect(sink).toHaveFocus();
    rerender(<Harness creating={false} error="Синтетическая ошибка создания" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Синтетическая ошибка создания");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    try {
      expect(screen.getByTestId("agent-discussion-invite-create")).toBeEnabled();
      expect(screen.getByTestId("agent-discussion-invite-create")).toHaveFocus();
    } finally {
      sink.remove();
    }
  });

  it("retains draft and focus on local review edits", async () => {
    render(<Harness />);
    await review();
    fireEvent.click(screen.getByTestId("agent-discussion-invite-edit-recipient"));
    await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-recipient")).toHaveFocus());
    expect(screen.getByTestId("agent-discussion-invite-recipient")).toHaveValue("Партнёр");
    fireEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    await waitFor(() => expect(screen.getByTestId("agent-discussion-invite-subject")).toHaveFocus());
    expect(screen.getByTestId("agent-discussion-invite-subject")).toHaveValue("Сообщение");
  });
});

describe("P7/P8a busy→error→retry→success focus path", () => {
  it("refocuses Create on each empty→error transition after busy", async () => {
    const onCreate = vi.fn();
    const { rerender } = render(<Harness onCreate={onCreate} />);
    await review();

    rerender(<Harness creating onCreate={onCreate} />);
    expect(screen.getByTestId("agent-discussion-invite-create")).toBeDisabled();

    const sink = document.createElement("button");
    sink.textContent = "sink";
    document.body.append(sink);
    sink.focus();

    rerender(<Harness creating={false} error="fail-1" onCreate={onCreate} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(screen.getByTestId("agent-discussion-invite-create")).toHaveFocus();

    // Clear error then fail again with same message — still refocus
    rerender(<Harness creating={false} error="" onCreate={onCreate} />);
    sink.focus();
    rerender(<Harness creating onCreate={onCreate} />);
    rerender(<Harness creating={false} error="fail-1" onCreate={onCreate} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(screen.getByTestId("agent-discussion-invite-create")).toHaveFocus();

    // Success path: clear error, create stays usable
    rerender(<Harness creating={false} error="" onCreate={onCreate} />);
    expect(screen.getByTestId("agent-discussion-invite-create")).toBeEnabled();
    await userEvent.click(screen.getByTestId("agent-discussion-invite-create"));
    expect(onCreate).toHaveBeenCalled();
    sink.remove();
  });
});
