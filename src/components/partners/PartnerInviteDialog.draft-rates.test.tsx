import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerInviteDialog } from "./PartnerInviteDialog";
import type { PartnerSearchResult, ProProfileResponse } from "@/lib/types";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  remcardFetch: api,
  RemcardApiError: class RemcardApiError extends Error {},
}));

const target = (id: string) =>
  ({
    id,
    displayName: `Партнёр ${id}`,
    partnerType: "COMPANY",
    city: "Казань",
    storeCategories: ["doors"],
    specializations: [],
    organizationName: null,
  }) as unknown as PartnerSearchResult;

const me = {
  user: {
    id: "me",
    partnerType: "COMPANY",
    partnerActivities: ["SERVICE", "STORE"],
    storeCategories: ["doors", "flooring", "paint"],
    specializations: [],
  },
  organization: null,
  programs: [],
} as unknown as ProProfileResponse;

const workspace = {
  general: {
    effective: {
      validityDays: 30,
      purchaseLimit: 2,
      minimumPurchaseAmount: null,
      promotionsCompatible: true,
      exclusionsText: null,
    },
  },
};

beforeEach(() => {
  api.mockReset().mockImplementation(async (url: string) =>
    String(url).includes("certificate-policy") ? workspace : { ok: true },
  );
});

function dialog(t: PartnerSearchResult) {
  return (
    <PartnerInviteDialog
      target={t}
      meProfile={me}
      busy={false}
      onClose={() => undefined}
      onSent={() => undefined}
      showSentState
      audience="business-company-r04"
    />
  );
}

const percent = (label: string) => screen.getByLabelText(`Процент: ${label}`) as HTMLInputElement;

async function setPercent(label: string, value: string) {
  const input = percent(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

async function pickDirection(name: RegExp) {
  await userEvent.click(screen.getByRole("radio", { name }));
}

async function fillDraft() {
  await waitFor(() => expect(screen.getByLabelText("Число покупок")).toHaveValue(2));
  await setPercent("Двери", "5");
  await setPercent("Напольные покрытия", "0");
  await setPercent("Краска / ЛКМ", "7");
  fireEvent.change(screen.getByLabelText("Срок скидки, дней"), { target: { value: "30" } });
  await userEvent.type(screen.getByLabelText(/Комментарий к приглашению/), "Строка 1{enter}Строка 2");
}

const invitePosts = () => api.mock.calls.filter(([url]) => url === "/api/partnership/invite");

describe("PartnerInviteDialog keeps the receiving-direction draft across direction switches", () => {
  it("restores 5/0/7, limits and the multiline comment after switching away and back, with no submission", async () => {
    render(dialog(target("t-1")));
    await fillDraft();

    await pickDirection(/Мы будем рекомендовать/);
    expect(screen.queryByLabelText(/^Процент: /)).toBeNull();
    await pickDirection(/Нас будут рекомендовать/);

    expect(percent("Двери").value).toBe("5");
    expect(percent("Напольные покрытия").value).toBe("0");
    expect(percent("Краска / ЛКМ").value).toBe("7");
    expect(screen.getByLabelText("Срок скидки, дней")).toHaveValue(30);
    expect(screen.getByLabelText("Число покупок")).toHaveValue(2);
    expect((screen.getByLabelText(/Комментарий к приглашению/) as HTMLTextAreaElement).value).toBe("Строка 1\nСтрока 2");
    expect(invitePosts()).toHaveLength(0);
  });

  it("keeps an excluded category excluded, distinct from 0%, and sends exactly the restored draft", async () => {
    render(dialog(target("t-1")));
    await fillDraft();
    const exclude = screen.getAllByLabelText("Исключить");
    await userEvent.click(exclude[2]!);

    await pickDirection(/Мы будем рекомендовать/);
    await pickDirection(/Нас будут рекомендовать/);

    const toggles = screen.getAllByLabelText("Исключить") as HTMLInputElement[];
    expect(toggles.map((t) => t.checked)).toEqual([false, false, true]);
    expect(percent("Напольные покрытия").value).toBe("0");

    await userEvent.click(screen.getByRole("button", { name: "Отправить приглашение" }));
    await waitFor(() => expect(invitePosts()).toHaveLength(1));
    const body = invitePosts()[0]![1].body;
    expect(body.direction).toBe("INVITER_RECEIVES");
    const byCategory = (key: string) => body.terms.find((t: { category: string }) => t.category === key);
    expect(byCategory("doors")).toMatchObject({ storePercent: 5 });
    expect(byCategory("doors").isExcluded).toBeFalsy();
    expect(byCategory("flooring")).toMatchObject({ storePercent: 0 });
    expect(byCategory("flooring").isExcluded).toBeFalsy();
    expect(byCategory("paint")).toMatchObject({ isExcluded: true });
    expect(body.note).toBe("Строка 1\nСтрока 2");
  });

  it("survives several round trips and the dirty cancel guard", async () => {
    render(dialog(target("t-1")));
    await fillDraft();
    for (let i = 0; i < 2; i += 1) {
      await pickDirection(/Мы будем рекомендовать/);
      await pickDirection(/Нас будут рекомендовать/);
    }
    expect(percent("Краска / ЛКМ").value).toBe("7");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(await screen.findByRole("button", { name: "Продолжить редактирование" }));
    expect(percent("Двери").value).toBe("5");
    expect(percent("Напольные покрытия").value).toBe("0");
    expect(percent("Краска / ЛКМ").value).toBe("7");
  });

  it("never lets the issuer direction author or send receiver terms", async () => {
    render(dialog(target("t-1")));
    await fillDraft();
    await pickDirection(/Мы будем рекомендовать/);
    await userEvent.click(screen.getByRole("button", { name: "Отправить запрос" }));
    await waitFor(() => expect(invitePosts()).toHaveLength(1));
    const body = invitePosts()[0]![1].body;
    expect(body.direction).toBe("INVITER_ISSUES");
    expect(body.terms).toEqual([]);
  });

  it("does not reuse the draft for a different target", async () => {
    const { rerender } = render(dialog(target("t-1")));
    await fillDraft();
    await pickDirection(/Мы будем рекомендовать/);
    rerender(dialog(target("t-2")));
    await pickDirection(/Нас будут рекомендовать/);
    expect(percent("Двери").value).toBe("10");
    expect(percent("Напольные покрытия").value).toBe("10");
    expect(percent("Краска / ЛКМ").value).toBe("10");
  });

  it("starts from defaults in a new invitation after a successful send", async () => {
    const first = render(dialog(target("t-1")));
    await fillDraft();
    await pickDirection(/Мы будем рекомендовать/);
    await pickDirection(/Нас будут рекомендовать/);
    await userEvent.click(screen.getByRole("button", { name: "Отправить приглашение" }));
    await waitFor(() => expect(invitePosts()).toHaveLength(1));
    first.unmount();
    render(dialog(target("t-1")));
    expect(percent("Двери").value).toBe("10");
    expect(percent("Краска / ЛКМ").value).toBe("10");
  });
});
