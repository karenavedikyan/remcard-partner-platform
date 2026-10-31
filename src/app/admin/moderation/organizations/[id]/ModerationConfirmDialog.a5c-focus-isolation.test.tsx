/** @vitest-environment jsdom */
import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ModerationConfirmDialog } from "./ModerationConfirmDialog";

it("legacy keeps exactly the existing trap restoration, without a second deferred focus", async () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open legacy probe</button>
        <ModerationConfirmDialog
          open={open}
          title="Legacy probe"
          description="Fixture only"
          confirmLabel="Confirm"
          textValue=""
          onTextChange={() => {}}
          onConfirm={() => {}}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  }
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Open legacy probe" });
  opener.focus();
  fireEvent.click(opener);
  await act(async () => {
    await Promise.resolve();
  });
  const restore = vi.spyOn(opener, "focus");
  fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(opener).toHaveFocus();
  expect(restore).toHaveBeenCalledTimes(1);
  restore.mockRestore();
});

it("r1 still restores opener focus after cancel (deferred path gated to r1)", async () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.tsx"),
    "utf8",
  );
  expect(src).toContain("restoreFocusRef");
  expect(src).toContain("queueMicrotask");
  expect(src).toMatch(/if\s*\(\s*!isR1\s*\)/);

  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open r1 probe
        </button>
        <ModerationConfirmDialog
          presentationVariant="r1"
          open={open}
          title="R1 probe"
          description="Fixture only"
          confirmLabel="Confirm"
          textValue=""
          onTextChange={() => {}}
          onConfirm={() => {}}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  }
  render(<Harness />);
  const opener = screen.getByRole("button", { name: "Open r1 probe" });
  opener.focus();
  fireEvent.click(opener);
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(opener).toHaveFocus();
});
