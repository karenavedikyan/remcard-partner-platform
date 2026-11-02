import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentPartnerHubModal } from "./AgentPartnerHubModal";

describe("prototype invitation method choice", () => {
  it("offers both real paths, keeping the mounted directory hidden until selected", () => {
    const select = vi.fn();
    render(<AgentPartnerHubModal open tab="find" titleFind="Поиск" titleLink="Пригласить по ссылке"
      choiceMode onClose={vi.fn()} onTabChange={select}>
      <button type="button">Существующее содержимое</button>
    </AgentPartnerHubModal>);
    expect(screen.getByRole("heading", { name: "Найти партнёра" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Существующее содержимое" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Уже в RemCard Найти в RemCard/ }));
    expect(select).toHaveBeenLastCalledWith("find");
    fireEvent.click(screen.getByRole("button", { name: /Ещё не в RemCard Пригласить по ссылке/ }));
    expect(select).toHaveBeenLastCalledWith("link");
  });
});
