/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModerationConfirmDialog } from "./ModerationConfirmDialog";

describe("ModerationConfirmDialog focus", () => {
  it("keeps focus in comment field while typing multiple words", () => {
    function Harness() {
      const [text, setText] = useState("");
      return (
        <ModerationConfirmDialog
          open
          title="Вернуть на доработку"
          description="Комментарий"
          confirmLabel="Отправить"
          requireText
          textLabel="Что нужно исправить"
          textValue={text}
          onTextChange={setText}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
    }
    render(<Harness />);
    const field = screen.getByLabelText("Что нужно исправить");
    field.focus();
    fireEvent.change(field, { target: { value: "первое " } });
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: "первое второе третье" } });
    expect(document.activeElement).toBe(field);
    expect(field).toHaveValue("первое второе третье");
  });

  it("does not close on Escape when busy", () => {
    const onCancel = vi.fn();
    render(
      <ModerationConfirmDialog
        open
        title="T"
        description="D"
        confirmLabel="OK"
        busy
        textValue=""
        onTextChange={() => {}}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
