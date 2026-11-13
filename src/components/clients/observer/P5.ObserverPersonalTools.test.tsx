import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPersonalTools } from "./ObserverPersonalTools";

const counts = { active: 3, archived: 1, trash: 0 };

function renderTools(overrides: Partial<Parameters<typeof ObserverPersonalTools>[0]> = {}) {
  const props = {
    bucket: "active" as const,
    layout: "partners" as const,
    counts,
    selectedCount: 0,
    visibleCount: 3,
    allVisibleSelected: false,
    someVisibleSelected: false,
    showLayoutToggle: true,
    onBucket: vi.fn(),
    onLayout: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onEditSelected: vi.fn(),
    onRequestArchive: vi.fn(),
    onRequestTrash: vi.fn(),
    onRequestRestore: vi.fn(),
    ...overrides,
  };
  render(<ObserverPersonalTools {...props} />);
  return props;
}

describe("P5 ObserverPersonalTools", () => {
  it("select-all toggles and reflects indeterminate mixed state", async () => {
    const onSelectAll = vi.fn();
    const { unmount } = render(
      <ObserverPersonalTools
        bucket="active"
        layout="partners"
        counts={counts}
        selectedCount={1}
        visibleCount={3}
        allVisibleSelected={false}
        someVisibleSelected
        showLayoutToggle
        onBucket={vi.fn()}
        onLayout={vi.fn()}
        onSelectAll={onSelectAll}
        onClearSelection={vi.fn()}
      />,
    );
    let selectAll = screen
      .getByTestId("ca-observer-personal-tools")
      .querySelector("[data-observer-select-all]") as HTMLInputElement;
    expect(selectAll.getAttribute("aria-checked")).toBe("mixed");
    unmount();

    renderTools({
      onSelectAll,
      allVisibleSelected: true,
      someVisibleSelected: true,
      selectedCount: 3,
    });
    selectAll = screen
      .getByTestId("ca-observer-personal-tools")
      .querySelector("[data-observer-select-all]") as HTMLInputElement;
    expect(selectAll.getAttribute("aria-checked")).toBe("true");
    expect(selectAll.checked).toBe(true);

    await userEvent.setup().click(selectAll);
    expect(onSelectAll).toHaveBeenCalled();
  });

  it("disables select-all when visibleCount is zero", () => {
    renderTools({ visibleCount: 0 });
    const selectAll = screen
      .getByTestId("ca-observer-personal-tools")
      .querySelector("[data-observer-select-all]") as HTMLInputElement;
    expect(selectAll.disabled).toBe(true);
  });

  it("exposes archive/trash/edit/clear when selection active on active bucket", async () => {
    const handlers = {
      onEditSelected: vi.fn(),
      onRequestArchive: vi.fn(),
      onRequestTrash: vi.fn(),
      onClearSelection: vi.fn(),
    };
    renderTools({ selectedCount: 2, someVisibleSelected: true, ...handlers });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Редактировать" }));
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await user.click(screen.getByRole("button", { name: "Удалить у себя" }));
    await user.click(screen.getByRole("button", { name: "Снять выбор" }));
    expect(handlers.onEditSelected).toHaveBeenCalled();
    expect(handlers.onRequestArchive).toHaveBeenCalled();
    expect(handlers.onRequestTrash).toHaveBeenCalled();
    expect(handlers.onClearSelection).toHaveBeenCalled();
  });

  it("shows restore (not archive) on archived bucket", () => {
    renderTools({ bucket: "archived", selectedCount: 1, someVisibleSelected: true });
    expect(screen.queryByRole("button", { name: "В архив" })).toBeNull();
    expect(screen.getByRole("button", { name: "Восстановить" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Удалить у себя" })).toBeTruthy();
  });

  it("hides edit and self-delete in trash bucket", () => {
    renderTools({ bucket: "trash", selectedCount: 1, someVisibleSelected: true });
    expect(screen.queryByRole("button", { name: "Редактировать" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Удалить у себя" })).toBeNull();
    expect(screen.getByRole("button", { name: "Восстановить" })).toBeTruthy();
  });

  it("renders persistence notice when provided", () => {
    renderTools({ persistenceNotice: "BLOCKED_PERSISTENCE: тест" });
    expect(screen.getByText(/BLOCKED_PERSISTENCE: тест/)).toBeTruthy();
  });

  it("bucket and layout buttons invoke handlers", () => {
    const onBucket = vi.fn();
    const onLayout = vi.fn();
    renderTools({ onBucket, onLayout });
    fireEvent.click(screen.getByRole("button", { name: /Архив/ }));
    fireEvent.click(screen.getByRole("button", { name: /Списком/ }));
    expect(onBucket).toHaveBeenCalledWith("archived");
    expect(onLayout).toHaveBeenCalledWith("list");
  });
});
