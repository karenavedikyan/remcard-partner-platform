import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerInviteDialog } from "./PartnerInviteDialog";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  remcardFetch: api,
  RemcardApiError: class RemcardApiError extends Error {},
}));

const company = {
  id: "t-company", displayName: "Опт Групп", partnerType: "COMPANY",
  city: "Казань", storeCategories: ["doors"], specializations: [], organizationName: null,
} as unknown as PartnerSearchResult;
const agentTarget = {
  id: "t-agent", displayName: "Дизайнер Ирина", partnerType: "SPECIALIST",
  city: null, storeCategories: [], specializations: [], organizationName: null,
} as unknown as PartnerSearchResult;

function profile(partnerType: string, activities: string[]) {
  return {
    user: { id: "me", partnerType, partnerActivities: activities,
      storeCategories: ["doors", "flooring"], specializations: [] },
    organization: null, programs: [],
  } as unknown as ProProfileResponse;
}

const workspace = {
  general: { effective: { validityDays: 30, purchaseLimit: 4, minimumPurchaseAmount: 500,
    promotionsCompatible: true, exclusionsText: "Сантехника" } },
};

beforeEach(() => {
  api.mockReset().mockImplementation(async (url: string) => {
    if (String(url).includes("certificate-policy")) return workspace;
    return { ok: true };
  });
});

function mount(opts: { me?: ProProfileResponse; target?: PartnerSearchResult; audience?: "business-store-r04" | "business-company-r04" | "specialist-r04"; initialDirection?: "INVITER_RECEIVES" | "INVITER_ISSUES" } = {}) {
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(
    <PartnerInviteDialog
      target={opts.target ?? company}
      meProfile={opts.me ?? profile("STORE", ["STORE"])}
      busy={false}
      onClose={onClose}
      onSent={onSent}
      showSentState
      audience={opts.audience ?? "business-store-r04"}
      initialDirection={opts.initialDirection ?? null}
    />,
  );
  return { onClose, onSent };
}

function inviteCall() {
  return api.mock.calls.find(([url]) => url === "/api/partnership/invite");
}

describe("PartnerInviteDialog directions", () => {
  it("offers both directions to an eligible business pair", () => {
    mount();
    const picker = screen.getByTestId("partner-invite-direction");
    expect(within(picker).getAllByRole("radio")).toHaveLength(2);
    expect(within(picker).getByRole("radio", { name: /Нас будут рекомендовать/ })).toBeChecked();
  });

  it("sends the receiving offer with exact per-category percents, 0% kept distinct from exclusion, and restrictions", async () => {
    mount();
    await waitFor(() => expect(screen.getByLabelText("Число покупок")).toHaveValue(4));
    const doorsPercent = screen.getByLabelText("Процент: Двери");
    await userEvent.clear(doorsPercent);
    await userEvent.type(doorsPercent, "0");
    await userEvent.click(screen.getAllByLabelText("Исключить")[1]);
    fireEvent.change(screen.getByLabelText("Срок скидки, дней"), { target: { value: "14" } });
    await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "Первая строка{enter}Вторая строка");
    await userEvent.click(screen.getByRole("button", { name: "Отправить приглашение" }));
    await waitFor(() => expect(inviteCall()).toBeTruthy());
    const body = inviteCall()![1].body;
    expect(body).toMatchObject({
      targetUserId: "t-company",
      direction: "INVITER_RECEIVES",
      note: "Первая строка\nВторая строка",
      certificatePolicy: {
        validityDays: 14, purchaseLimit: 4, minimumPurchaseAmount: 500,
        promotionsCompatible: true, exclusionsText: "Сантехника",
      },
    });
    const doors = body.terms.find((t: { category: string }) => t.category === "doors");
    const flooring = body.terms.find((t: { category: string }) => t.category === "flooring");
    expect(doors).toMatchObject({ storePercent: 0 });
    expect(doors.isExcluded).toBeFalsy();
    expect(flooring).toMatchObject({ isExcluded: true });
    expect(await screen.findByTestId("partner-direct-invite-ready")).toBeInTheDocument();
  });

  it("gives every per-category percent input a unique id and an accessible name carrying its category", () => {
    mount();
    const inputs = screen.getAllByLabelText(/^Процент: /) as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(new Set(inputs.map((input) => input.id)).size).toBe(inputs.length);
    const names = inputs.map((input) => input.labels?.[0]?.textContent?.trim());
    expect(new Set(names).size).toBe(inputs.length);
    expect(screen.getByRole("spinbutton", { name: "Процент: Двери" })).toBe(inputs[0]);
    for (const input of inputs) {
      expect(input.labels).toHaveLength(1);
    }
  });

  it("prefills restrictions from general terms but keeps what the user already edited", async () => {
    mount();
    const validity = screen.getByLabelText("Срок скидки, дней");
    await userEvent.clear(validity);
    await userEvent.type(validity, "9");
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(validity).toHaveValue(9);
  });

  it("sends a terms-less request when the inviter will recommend, without editable foreign terms", async () => {
    mount({ initialDirection: "INVITER_ISSUES" });
    expect(screen.queryByTestId("partner-invite-restrictions")).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText(/^Процент/)).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    await waitFor(() => expect(inviteCall()).toBeTruthy());
    expect(inviteCall()![1].body).toEqual({
      targetUserId: "t-company", note: null, direction: "INVITER_ISSUES", cooperationRequest: true, terms: [],
    });
  });

  it("keeps the note when switching direction", async () => {
    mount();
    await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "Мой комментарий");
    await userEvent.click(screen.getByRole("radio", { name: /Мы будем рекомендовать/ }));
    expect(screen.getByLabelText(/Комментарий|Предмет/)).toHaveValue("Мой комментарий");
  });

  it("limits the note to 1000 characters", () => {
    mount();
    expect(screen.getByLabelText(/Комментарий к приглашению/)).toHaveAttribute("maxlength", "1000");
  });

  it("fixes the direction when the target cannot receive recommendations", () => {
    mount({ target: agentTarget });
    expect(screen.getByTestId("partner-invite-direction-fixed")).toHaveTextContent("Нас будут рекомендовать");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("keeps the draft and shows the server error with a retry on failure", async () => {
    api.mockImplementation(async (url: string) => {
      if (String(url).includes("certificate-policy")) return workspace;
      throw new Error("boom");
    });
    mount();
    await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "Черновик");
    await userEvent.click(screen.getByRole("button", { name: "Отправить приглашение" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось отправить приглашение");
    expect(screen.getByLabelText(/Комментарий к приглашению/)).toHaveValue("Черновик");
    expect(screen.getByRole("button", { name: "Отправить приглашение" })).toBeEnabled();
  });

  it("does not double-submit", async () => {
    let resolve!: (v: unknown) => void;
    api.mockImplementation((url: string) =>
      String(url).includes("certificate-policy") ? Promise.resolve(workspace) : new Promise((r) => { resolve = r; }),
    );
    mount();
    const button = screen.getByRole("button", { name: "Отправить приглашение" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.mock.calls.filter(([u]) => u === "/api/partnership/invite")).toHaveLength(1);
    resolve({ ok: true });
  });

  it("keeps the legacy single-direction flow when no audience is given", async () => {
    const onClose = vi.fn();
    render(
      <PartnerInviteDialog target={company} meProfile={profile("STORE", ["STORE"])} busy={false} onClose={onClose} onSent={vi.fn()} />,
    );
    expect(screen.queryByTestId("partner-invite-direction")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partner-invite-restrictions")).not.toBeInTheDocument();
  });

  describe("draft protection on Cancel / Escape", () => {
    it("closes at once when nothing was edited (also after only switching direction)", async () => {
      const { onClose } = mount();
      await userEvent.click(screen.getByRole("radio", { name: /Мы будем рекомендовать/ }));
      await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
      expect(screen.queryByTestId("partner-invite-discard-confirm")).toBeNull();
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("asks before discarding an edited comment, then Stay keeps every field", async () => {
      const { onClose } = mount();
      await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "Строка 1{enter}Строка 2");
      await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
      const confirm = await screen.findByTestId("partner-invite-discard-confirm");
      expect(within(confirm).getByText("Закрыть без сохранения?")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      await userEvent.click(within(confirm).getByRole("button", { name: "Продолжить редактирование" }));
      expect(screen.queryByTestId("partner-invite-discard-confirm")).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Комментарий к приглашению/)).toHaveValue("Строка 1\nСтрока 2");
    });

    it("guards the per-invitation restriction fields and keeps them across a direction switch", async () => {
      const { onClose } = mount();
      const validity = await screen.findByLabelText(/Срок скидки, дней/);
      await waitFor(() => expect(validity).toHaveValue(30));
      await userEvent.clear(validity);
      await userEvent.type(validity, "60");
      await userEvent.click(screen.getByRole("radio", { name: /Мы будем рекомендовать/ }));
      await userEvent.click(screen.getByRole("radio", { name: /Нас будут рекомендовать/ }));
      expect(await screen.findByLabelText(/Срок скидки, дней/)).toHaveValue(60);
      await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
      expect(await screen.findByTestId("partner-invite-discard-confirm")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("Discard closes the dialog and sends nothing", async () => {
      const { onClose, onSent } = mount();
      await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "Черновик");
      await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
      const confirm = await screen.findByTestId("partner-invite-discard-confirm");
      await userEvent.click(within(confirm).getByRole("button", { name: "Закрыть без сохранения" }));
      expect(onClose).toHaveBeenCalledOnce();
      expect(onSent).not.toHaveBeenCalled();
      expect(api.mock.calls.some(([u]) => u === "/api/partnership/invite")).toBe(false);
    });

    it("Escape asks first when edited and Escape on the confirm keeps the draft", async () => {
      const { onClose } = mount();
      await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "x");
      await userEvent.keyboard("{Escape}");
      expect(await screen.findByTestId("partner-invite-discard-confirm")).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByTestId("partner-invite-discard-confirm")).toBeNull());
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Комментарий к приглашению/)).toHaveValue("x");
    });

    it("a clean Escape closes at once", async () => {
      const { onClose } = mount();
      await userEvent.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
