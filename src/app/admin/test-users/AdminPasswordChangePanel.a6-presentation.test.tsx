/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AdminPasswordChangePanel } from "./AdminPasswordChangePanel";

const changeMock = vi.fn();

vi.mock("@/lib/prof-admin-api", () => ({
  adminPasswordChange: (...args: unknown[]) => changeMock(...args),
}));

vi.mock("@/lib/api-client", () => {
  class RemcardApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RemcardApiError";
    }
  }
  return { RemcardApiError };
});

describe("AdminPasswordChangePanel A6 presentationVariant", () => {
  beforeEach(() => {
    changeMock.mockReset();
    changeMock.mockResolvedValue({ ok: true });
  });

  it("defaults to legacy chrome and keeps global adminPanel classes", () => {
    const src = readFileSync(join(process.cwd(), "src/app/admin/test-users/AdminPasswordChangePanel.tsx"), "utf8");
    expect(src).toContain('presentationVariant = "legacy"');
    expect(src).toContain('className="adminPanel"');
    expect(src).toContain('className="adminError"');
    expect(src).toContain('className="adminOk"');
    expect(src).not.toContain("queueMicrotask");
    expect(src).not.toContain("restoreFocusRef");

    render(<AdminPasswordChangePanel />);
    expect(document.querySelector('[data-admin-password-variant="legacy"]')).toBeTruthy();
    expect(document.querySelector('[data-admin-password-variant="r1"]')).toBeNull();
    expect(document.querySelector(".adminPanel")).toBeTruthy();
    expect(screen.getByLabelText(/Текущий пароль/i)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/Текущий пароль/i)).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText(/Новый пароль/i)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/Новый пароль/i)).toHaveAttribute("autocomplete", "new-password");
  });

  it("r1 variant uses local module chrome without form/implicit submit", () => {
    render(<AdminPasswordChangePanel presentationVariant="r1" />);
    expect(document.querySelector('[data-admin-password-variant="r1"]')).toBeTruthy();
    expect(document.querySelector(".adminPanel")).toBeNull();
    expect(document.querySelector("form")).toBeNull();
    const current = screen.getByLabelText(/^Текущий пароль$/i);
    const next = screen.getByLabelText(/^Новый пароль$/i);
    expect(current).toHaveAttribute("type", "password");
    expect(current).toHaveAttribute("autocomplete", "current-password");
    expect(next).toHaveAttribute("type", "password");
    expect(next).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("button", { name: "Сменить пароль" })).toHaveAttribute("type", "button");
  });

  it("keeps length≥12 busy disable and clears fields only after success", async () => {
    render(<AdminPasswordChangePanel presentationVariant="r1" />);
    const current = screen.getByLabelText(/^Текущий пароль$/i);
    const next = screen.getByLabelText(/^Новый пароль$/i);
    const btn = screen.getByRole("button", { name: "Сменить пароль" });

    expect(btn).toBeDisabled();
    fireEvent.change(current, { target: { value: "synthetic-current-aaaaaaaa" } });
    fireEvent.change(next, { target: { value: "short" } });
    expect(btn).toBeDisabled();
    expect(changeMock).not.toHaveBeenCalled();

    fireEvent.change(next, { target: { value: "synthetic-new-bbbbbbbb" } });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() => expect(changeMock).toHaveBeenCalledTimes(1));
    const [argCurrent, argNew] = changeMock.mock.calls[0];
    expect(typeof argCurrent).toBe("string");
    expect(typeof argNew).toBe("string");
    expect(String(argCurrent).length).toBeGreaterThan(0);
    expect(String(argNew).length).toBeGreaterThanOrEqual(12);
    // Do not assert or log plaintext synthetic values — only DTO arity / lengths.
    expect(changeMock.mock.calls[0]).toHaveLength(2);

    await waitFor(() => {
      expect(screen.getByText("Пароль обновлён. Другие сессии отозваны.")).toBeTruthy();
    });
    expect(current).toHaveValue("");
    expect(next).toHaveValue("");
  });

  it("shows backend error text and does not clear fields on failure", async () => {
    const { RemcardApiError } = await import("@/lib/api-client");
    changeMock.mockRejectedValueOnce(new RemcardApiError("Временная ошибка сервера. Повторите попытку."));
    render(<AdminPasswordChangePanel presentationVariant="r1" />);
    fireEvent.change(screen.getByLabelText(/^Текущий пароль$/i), {
      target: { value: "synthetic-current-cccccccc" },
    });
    fireEvent.change(screen.getByLabelText(/^Новый пароль$/i), {
      target: { value: "synthetic-new-dddddddd" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сменить пароль" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Временная ошибка/));
    expect(changeMock).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText(/^Текущий пароль$/i) as HTMLInputElement).value.length).toBeGreaterThan(0);
    expect((screen.getByLabelText(/^Новый пароль$/i) as HTMLInputElement).value.length).toBeGreaterThanOrEqual(12);
  });

  it("password page wires r1 variant without changing auth gate strings", () => {
    const page = readFileSync(join(process.cwd(), "src/app/admin/password/page.tsx"), "utf8");
    expect(page).toContain('await requireProfPlatformAdmin("/admin/password")');
    expect(page).toContain('export const dynamic = "force-dynamic"');
    expect(page).toContain('presentationVariant="r1"');
    expect(page).toContain('data-admin-password-page="r1"');
  });

  it("does not edit global adminPanel/adminError/adminOk or test-users CSS", () => {
    const testUsersCss = readFileSync(
      join(process.cwd(), "src/app/admin/admin-test-users.module.css"),
      "utf8",
    );
    const harness = readFileSync(
      join(process.cwd(), "scripts/admin-mobile-visual-harness/HarnessApp.tsx"),
      "utf8",
    );
    expect(testUsersCss).toContain(".adminError");
    expect(testUsersCss).toContain(".adminOk");
    expect(harness).toContain("<AdminPasswordChangePanel />");
    expect(harness).not.toContain('presentationVariant="r1"');
  });
});
