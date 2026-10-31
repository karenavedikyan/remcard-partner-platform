import { readFileSync } from "node:fs";
import path from "node:path";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AGENT_DISCUSSION_INVITE_TEMPLATES,
  AgentDiscussionInviteWizard,
  DISCUSSION_INVITE_RECIPIENT_MAX,
  DISCUSSION_INVITE_SUBJECT_MAX,
} from "./AgentDiscussionInviteWizard";

const css = readFileSync(path.join(__dirname, "AgentDiscussionInviteWizard.module.css"), "utf8");
const source = readFileSync(path.join(__dirname, "AgentDiscussionInviteWizard.tsx"), "utf8");

function WizardHarness({
  onCreate = vi.fn(),
  creating = false,
  error = "",
}: {
  onCreate?: () => void;
  creating?: boolean;
  error?: string;
}) {
  const [recipientLabel, setRecipientLabel] = useState("");
  const [cooperationSubject, setCooperationSubject] = useState("");
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

describe("AgentDiscussionInviteWizard P7/P8a presentation", () => {
  it("keeps agent templates within API subject max and 44px actions", () => {
    for (const item of Object.values(AGENT_DISCUSSION_INVITE_TEMPLATES)) {
      expect(item.text.length).toBeLessThanOrEqual(DISCUSSION_INVITE_SUBJECT_MAX);
    }
    expect(DISCUSSION_INVITE_RECIPIENT_MAX).toBe(120);
    expect(DISCUSSION_INVITE_SUBJECT_MAX).toBe(500);
    expect(css).toContain("min-height: 44px");
    expect(source).toContain('aria-current');
    expect(source).toContain("DISCUSSION_INVITE_SUBJECT_MAX");
    expect(css).not.toContain("!important");
    // Mobile footer must stay in normal flow — sticky bottom overlapped the message textarea.
    expect(css).toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*?\.footer\s*\{[\s\S]*?position:\s*static/,
    );
    expect(css).not.toMatch(
      /@media \(max-width:\s*680px\)[\s\S]*?\.footer\s*\{[\s\S]*?position:\s*sticky/,
    );
  });

  it("walks Partner → Message → Review locally without create until review CTA", async () => {
    const onCreate = vi.fn();
    render(<WizardHarness onCreate={onCreate} />);

    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "1");
    expect(
      within(screen.getByTestId("agent-discussion-invite-progress")).getByText("Партнёр"),
    ).toHaveAttribute("aria-current", "step");

    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "1");

    await userEvent.type(screen.getByTestId("agent-discussion-invite-recipient"), "Студия света");
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "2");

    await userEvent.click(screen.getByTestId("agent-discussion-invite-template-short"));
    expect(screen.getByTestId("agent-discussion-invite-subject")).toHaveValue(
      AGENT_DISCUSSION_INVITE_TEMPLATES.short.text,
    );
    expect(screen.getByTestId("agent-discussion-invite-template-short")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "3");
    expect(screen.getByTestId("agent-discussion-invite-review")).toHaveTextContent("Студия света");
    expect(screen.getByTestId("agent-discussion-invite-safety")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("agent-discussion-invite-create"));
    expect(onCreate).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByTestId("agent-discussion-invite-edit-recipient"));
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "1");
    expect(screen.getByTestId("agent-discussion-invite-recipient")).toHaveValue("Студия света");
  });

  it("keeps Enter in textarea as newline and Back preserves drafts", async () => {
    const onCreate = vi.fn();
    render(<WizardHarness onCreate={onCreate} />);

    await userEvent.type(screen.getByTestId("agent-discussion-invite-recipient"), "Магазин Юг");
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));

    const area = screen.getByTestId("agent-discussion-invite-subject");
    await userEvent.type(area, "Первая строка");
    await userEvent.type(area, "{Enter}вторая");
    expect(area).toHaveValue("Первая строка\nвторая");
    expect(onCreate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("agent-discussion-invite-back"));
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "1");
    expect(screen.getByTestId("agent-discussion-invite-recipient")).toHaveValue("Магазин Юг");

    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    expect(screen.getByTestId("agent-discussion-invite-subject")).toHaveValue("Первая строка\nвторая");
  });

});

describe("AgentDiscussionInviteWizard review creating/error", () => {
  it("shows error and disables create CTA while creating", async () => {
    const onCreate = vi.fn();
    // Mount at step 3 by walking then swap to creating/error without losing step via internal state:
    const Stateful = () => {
      const [recipientLabel, setRecipientLabel] = useState("Партнёр");
      const [cooperationSubject, setCooperationSubject] = useState("Тема");
      const [creating, setCreating] = useState(false);
      const [error, setError] = useState("");
      return (
        <>
          <AgentDiscussionInviteWizard
            recipientLabel={recipientLabel}
            cooperationSubject={cooperationSubject}
            onRecipientLabelChange={setRecipientLabel}
            onCooperationSubjectChange={setCooperationSubject}
            creating={creating}
            error={error}
            onCreate={() => {
              onCreate();
              setCreating(true);
              setError("Сервер недоступен");
            }}
          />
          <button type="button" onClick={() => setCreating(false)}>
            unlock
          </button>
        </>
      );
    };
    render(<Stateful />);
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    await userEvent.click(screen.getByTestId("agent-discussion-invite-next"));
    expect(screen.getByTestId("agent-discussion-invite-wizard")).toHaveAttribute("data-step", "3");
    await userEvent.click(screen.getByTestId("agent-discussion-invite-create"));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("agent-discussion-invite-error")).toHaveTextContent(
      "Сервер недоступен",
    );
    expect(screen.getByTestId("agent-discussion-invite-create")).toBeDisabled();
    expect(screen.getByTestId("agent-discussion-invite-back")).toBeDisabled();
  });
});
