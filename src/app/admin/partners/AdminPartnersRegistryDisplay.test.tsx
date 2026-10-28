import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminPartnersClient } from "./AdminPartnersClient";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(), previewPartnerLifecycle: vi.fn(), applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
const row = {
  id: "display-partner", publicId: "RC-DISPLAY", displayName: "Проверочный партнёр",
  partnerType: "COMPANY", partnerKind: "agent", city: "Краснодар",
  registrationLabel: "DEMO", lifecycle: null, catalogVisibility: "VISIBLE",
  publicCatalogLinks: [{ label: "Карточка партнёра", path: "/partner/display-partner" }],
  organizations: [{ id: "display-org", name: "Проверочная организация" }],
};
beforeEach(() => {
  vi.clearAllMocks();
  api.fetchPartnerRegistry.mockResolvedValue({ items: [row], total: 1, nextCursor: null });
  api.previewPartnerLifecycle.mockResolvedValue({ preview: { effects: ["Карточка будет скрыта"], warnings: [], confirmToken: "preview-token" } });
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
});
async function open() { render(<AdminPartnersClient />); await screen.findByText(row.displayName); }

describe("PROF admin partner registry display", () => {
  it("keeps additional public cards in an expandable list without dropping their links",async()=>{
    api.fetchPartnerRegistry.mockResolvedValue({items:[{...row,publicCatalogLinks:[
      {label:"Основная карточка",path:"/partner/display-partner"},
      {label:"Филиал 1",path:"/catalog/branch/one"},
      {label:"Филиал 2",path:"/catalog/branch/two"},
    ]}],total:1,nextCursor:null});
    await open();
    const details=screen.getByText("Ещё карточки: 2").closest("details")!;
    expect(details.hasAttribute("open")).toBe(false);
    expect(details.querySelectorAll("a")).toHaveLength(2);
    expect(details.querySelector("a")?.getAttribute("href")).toBe("https://remcard.ru/catalog/branch/one");
  });
  it("keeps visible filter labels, table name and mobile card field labels",async()=>{
    render(<AdminPartnersClient/>);
    await screen.findByText("Агент");
    for(const label of ["Поиск партнёров","Регистрация","Тип партнёра","Город","Видимость в каталоге","Архив"]){
      expect(screen.getByLabelText(label).closest("label")).not.toBeNull();
    }
    expect(screen.getByRole("table",{name:"Реестр партнёров"})).toBeTruthy();
    const cells=screen.getByText(row.displayName).closest("tr")!.querySelectorAll("td");
    expect([...cells].map(cell=>cell.getAttribute("data-label"))).toEqual(["Выбор","Имя","Тип","Город / организация","Регистрация","Каталог","Доступ"]);
  });
  it.each(["AGENT", "MASTER", "STORE", "COMPANY"])("forwards the %s type filter to the real registry contract", async kind => {
    await open();
    fireEvent.change(screen.getByLabelText("Тип партнёра"), { target: { value: kind } });
    await waitFor(() => expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("partnerType")).toBe(kind));
  });
  it("shows an agent as an agent, not its technical COMPANY type", async () => {
    await open();
    expect(screen.getByRole("cell", { name: "Агент" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "COMPANY" })).not.toBeInTheDocument();
  });
  it("opens reversible deletion controls beside the selected row without applying anything", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
    const panel = screen.getByRole("region", { name: /Управление партнёром/ });
    expect(within(panel).getByRole("button", { name: "Убрать из каталога" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "В архив проекта" })).toBeInTheDocument();
    expect(panel.closest("tr")?.previousElementSibling?.textContent).toContain(row.displayName);
    expect(api.previewPartnerLifecycle).not.toHaveBeenCalled();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });
  it("shows read-only admin profiles and the exact public visitor link", async () => {
    await open();
    expect(screen.getByRole("link", { name: "Открыть профиль" })).toHaveAttribute("href", "/admin/moderation/partners/display-partner");
    expect(screen.getByRole("link", { name: /Профиль организации/ })).toHaveAttribute("href", "/admin/moderation/organizations/display-org");
    expect(screen.getByRole("link", { name: /На remcard.ru/ })).toHaveAttribute("href", "https://remcard.ru/partner/display-partner");
    expect(screen.getByRole("cell", { name: /Виден в каталоге/ })).toBeInTheDocument();
  });
  it("keeps hidden profiles inspectable by the admin without claiming they are public", async () => {
    api.fetchPartnerRegistry.mockResolvedValue({ items: [{ ...row, lifecycle: { catalogHiddenAt: "2026-10-27", projectArchivedAt: null }, catalogVisibility: "HIDDEN", publicCatalogLinks: [] }], total: 1, nextCursor: null });
    await open();
    expect(screen.getByRole("cell", { name: "Скрыт" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть профиль" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /На remcard.ru/ })).not.toBeInTheDocument();
  });
  it("forwards public visibility and archive filters", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Видимость в каталоге"), { target: { value: "visible" } });
    await waitFor(() => expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("catalogHidden")).toBe("false"));
    fireEvent.change(screen.getByLabelText("Архив"), { target: { value: "true" } });
    await waitFor(() => expect(api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("projectArchived")).toBe("true"));
  });
  it("does not render a public link supplied outside the allowed catalog routes", async () => {
    api.fetchPartnerRegistry.mockResolvedValue({ items: [{ ...row, publicCatalogLinks: [{ label: "Unsafe", path: "//evil.example" }] }], total: 1, nextCursor: null });
    await open();
    expect(screen.queryByRole("link", { name: /Unsafe/ })).not.toBeInTheDocument();
  });
  it("handles preview errors without applying a lifecycle action", async () => {
    api.previewPartnerLifecycle.mockRejectedValue(new Error("Проверка не выполнена"));
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Проверка" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Проверка не выполнена");
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });
});
