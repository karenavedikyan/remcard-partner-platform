import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import styles from "./AgentProfileWizard.module.css";
import { AgentPhoneField } from "./AgentPhoneField";

function PhoneInWizardWrapper(props: {
  value: string;
  error?: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className={`${styles.field} ${props.error ? styles.fieldError : ""}`}>
      <AgentPhoneField
        value={props.value}
        error={props.error}
        onChange={props.onChange}
      />
      <small>Для связи, не для повторного входа.</small>
    </div>
  );
}

describe("AgentPhoneField", () => {
  afterEach(cleanup);

  it("types sequentially, clears, edits middle, paste, blur and Enter commit", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInWizardWrapper value="" onChange={onChange} />);
    const input = screen.getByTestId("agent-profile-input-phone");

    await user.click(input);
    await user.type(input, "9186360088");
    expect(onChange).not.toHaveBeenCalled();

    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith("+79186360088");

    onChange.mockClear();
    await user.click(input);
    await user.clear(input);
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith("");

    onChange.mockClear();
    cleanup();
    render(<PhoneInWizardWrapper value="+79186360088" onChange={onChange} />);
    const input2 = screen.getByTestId("agent-profile-input-phone");
    await user.click(input2);
    await user.keyboard("{Backspace}{Backspace}99");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0] as string;
    expect(last).toMatch(/^\+7/);
  });

  it("Enter commits latest digits before parent save handler", async () => {
    const user = userEvent.setup();
    let stored = "+79186360088";
    const onChange = vi.fn((next: string) => {
      stored = next;
    });
    render(<PhoneInWizardWrapper value={stored} onChange={onChange} />);
    const input = screen.getByTestId("agent-profile-input-phone");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "9186360099");
    await user.keyboard("{Enter}");
    expect(stored).toBe("+79186360099");
  });

  it("shows aria-invalid and field error styling when invalid", () => {
    render(
      <PhoneInWizardWrapper
        value="abc"
        error="Некорректный номер"
        onChange={() => {}}
      />,
    );
    const input = screen.getByTestId("agent-profile-input-phone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Некорректный номер")).toBeInTheDocument();
    const field = input.closest(`.${styles.field}`);
    expect(field?.className).toContain(styles.fieldError);
  });

  it.each([
    "89186360088",
    "79186360088",
    "9186360088",
    "+79186360088",
    "+7 (918) 636-00-88",
  ])("accepts RU format %s on blur", async (raw) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInWizardWrapper value="" onChange={onChange} />);
    const input = screen.getByTestId("agent-profile-input-phone");
    await user.click(input);
    await user.paste(raw);
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith("+79186360088");
    cleanup();
  });
});
