import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MINI_APP_LOADING_LINES, MiniAppLoadingScreen } from "./MiniAppLoadingScreen";

describe("MiniAppLoadingScreen", () => {
  it("announces what is happening instead of a bare loading line", () => {
    render(<MiniAppLoadingScreen />);

    const shell = screen.getByTestId("mini-app-loading");
    const status = within(shell).getByRole("status");
    // Non-breaking space keeps the preposition with its word.
    expect(within(status).getByRole("heading", { level: 1 }).textContent).toBe(
      "Готовим ваши данные к\u00a0просмотру",
    );
    expect(within(status).getByText("RemCard PROF")).toBeInTheDocument();
    expect(screen.queryByText("Загрузка…")).toBeNull();
  });

  it("lists what is being prepared as decoration, hidden from screen readers", () => {
    render(<MiniAppLoadingScreen />);

    expect(MINI_APP_LOADING_LINES).toEqual([
      "Считаем начисления и баланс",
      "Собираем сертификаты клиентов",
      "Обновляем список партнёров",
    ]);
    for (const line of MINI_APP_LOADING_LINES) {
      const node = screen.getByText(line);
      expect(node.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
