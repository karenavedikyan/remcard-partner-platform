/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ModerationConfirmDialog } from "./ModerationConfirmDialog";

describe("ModerationConfirmDialog A5c presentationVariant", () => {
  it("defaults to legacy chrome and keeps shared CSS import", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.tsx"),
      "utf8",
    );
    expect(src).toContain('from "./OrganizationModerationDetail.module.css"');
    expect(src).toContain('from "./ModerationConfirmDialog.r1.module.css"');
    expect(src).toContain('presentationVariant = "legacy"');
    expect(src).toContain("useModerationModalFocusTrap");

    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ModerationConfirmDialog
        open
        title="Одобрить заявку"
        description="Проверка"
        confirmLabel="Подтвердить одобрение"
        textValue=""
        onTextChange={() => {}}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(document.querySelector('[data-moderation-confirm-variant="legacy"]')).toBeTruthy();
    expect(document.querySelector('[data-moderation-confirm-variant="r1"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Закрыть окно" })).toBeNull();
  });

  it("r1 variant shows head/close/footer and does not mutate on cancel/Escape/X/backdrop", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ModerationConfirmDialog
        presentationVariant="r1"
        open
        title="Одобрить заявку"
        description={"Длинное описание подтверждения.\nВторая строка для переноса."}
        confirmLabel="Подтвердить одобрение"
        textValue=""
        onTextChange={() => {}}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const root = document.querySelector('[data-moderation-confirm-variant="r1"]');
    expect(root).toBeTruthy();
    expect(screen.getByRole("button", { name: "Закрыть окно" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Закрыть окно" }));
    expect(onCancel).toHaveBeenCalledTimes(3);

    fireEvent.click(root!);
    expect(onCancel).toHaveBeenCalledTimes(4);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("busy blocks cancel/Escape/X/backdrop and disables confirm (no second decision)", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ModerationConfirmDialog
        presentationVariant="r1"
        open
        busy
        title="Одобрить"
        description="D"
        confirmLabel="Подтвердить"
        textValue=""
        onTextChange={() => {}}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("button", { name: "Закрыть окно" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(document.querySelector('[data-moderation-confirm-variant="r1"]')!);
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows required reason error and keeps typing focus for r1", () => {
    function Harness() {
      const [text, setText] = useState("");
      return (
        <ModerationConfirmDialog
          presentationVariant="r1"
          open
          title="Отклонить заявку"
          description="Нужна причина"
          confirmLabel="Отклонить"
          danger
          requireText
          textLabel="Причина отказа"
          textValue={text}
          textError={text.trim() ? null : "Укажите причину"}
          onTextChange={setText}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole("alert")).toHaveTextContent(/причин/i);
    const field = screen.getByLabelText("Причина отказа");
    field.focus();
    fireEvent.change(field, { target: { value: "неполный адрес филиала" } });
    expect(document.activeElement).toBe(field);
    expect(field).toHaveValue("неполный адрес филиала");
  });

  it("wires r1 only on partner and org detail clients; tests stay default", () => {
    const partner = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/partners/[id]/PartnerModerationDetailClient.tsx"),
      "utf8",
    );
    const org = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/moderation/organizations/[id]/OrganizationModerationDetailClient.tsx",
      ),
      "utf8",
    );
    const existingTest = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.test.tsx"),
      "utf8",
    );
    expect(partner.match(/presentationVariant="r1"/g)?.length).toBe(4);
    expect(org.match(/presentationVariant="r1"/g)?.length).toBe(6);
    expect(existingTest).not.toContain('presentationVariant="r1"');
    expect(existingTest).not.toContain("presentationVariant");
  });

  it("restores focus to opener after cancel", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.tsx"),
      "utf8",
    );
    expect(src).toContain("restoreFocusRef");
    expect(src).toContain("queueMicrotask");

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Открыть подтверждение
          </button>
          <ModerationConfirmDialog
            presentationVariant="r1"
            open={open}
            title="Одобрить"
            description="D"
            confirmLabel="OK"
            textValue=""
            onTextChange={() => {}}
            onConfirm={() => {}}
            onCancel={() => setOpen(false)}
          />
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Открыть подтверждение" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(document.activeElement).toBe(opener);
  });

  it("does not edit shared org CSS module or focus trap", () => {
    const sharedCss = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.module.css",
      ),
      "utf8",
    );
    const trap = readFileSync(
      join(process.cwd(), "src/app/admin/moderation/organizations/[id]/useModerationModalFocusTrap.ts"),
      "utf8",
    );
    const partnerPreview = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/moderation/partners/[id]/ModerationPartnerCatalogFullPreview.tsx",
      ),
      "utf8",
    );
    expect(sharedCss).toContain(".overlay");
    expect(sharedCss).toContain(".dialogActions");
    expect(trap.length).toBeGreaterThan(20);
    expect(partnerPreview).toContain("OrganizationModerationDetail.module.css");
  });
});
