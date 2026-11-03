import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerHomeEmptyState } from "@/components/home/PartnerHomeEmptyState";
import { PartnersNewPartnerEmpty } from "@/components/partners/partners-new-partner-empty/PartnersNewPartnerEmpty";
import { CertificatesNewPartnerEmpty } from "@/components/certificates-new-partner-empty/CertificatesNewPartnerEmpty";
import { ClientsNewPartnerEmptyState } from "@/components/clients/new-partner-empty/ClientsNewPartnerEmptyState";
import { WalletSectionEmptyState } from "@/components/wallet-empty/WalletSectionEmptyState";
import { ScannerNewPartnerEmpty } from "@/components/scanner/ScannerNewPartnerEmpty";
import { TeamSectionNewPartnerEmpty } from "@/components/profile/team-new-partner-empty/TeamSectionNewPartnerEmpty";
import { ProfileSectionEmptyState } from "@/components/profile/empty-state/ProfileSectionEmptyState";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function expectNoInteractiveLi(container: HTMLElement) {
  container.querySelectorAll("ol.steps li, ol[class*='steps'] li").forEach((li) => {
    expect(li).not.toHaveAttribute("onClick");
    const nested = li.querySelector("a, button");
    if (nested) {
      expect(nested.closest("a, button")).toBe(nested);
    }
  });
}

describe("onboarding step interactivity matrix", () => {
  it("HOME company steps link to profile branches, team, and partners", () => {
    render(<PartnerHomeEmptyState role="company" />);
    const steps = screen.getAllByRole("link", { name: /Профиль и филиалы/i });
    expect(steps[0]).toHaveAttribute("href", "/profile?section=branches");
    expect(screen.getByRole("link", { name: /Сотрудники и права/i })).toHaveAttribute(
      "href",
      "/profile?section=team",
    );
    expect(screen.getByRole("link", { name: /Партнёры и условия/i })).toHaveAttribute(
      "href",
      "/partners",
    );
  });

  it("PARTNERS find/link steps call the same handlers as CTAs", async () => {
    const user = userEvent.setup();
    const onOpenFind = vi.fn();
    const onOpenLink = vi.fn();
    render(
      <PartnersNewPartnerEmpty
        audience="agent-r04"
        onOpenFind={onOpenFind}
        onOpenLink={onOpenLink}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Найдите в RemCard/i }));
    expect(onOpenFind).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Или пригласите по ссылке/i }));
    expect(onOpenLink).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Согласуйте условия/i }));
    expect(onOpenFind).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(/Сначала выберите партнёра/i),
    ).toBeInTheDocument();
  });

  it("CLIENTS store add-client step calls onAddClient only", async () => {
    const user = userEvent.setup();
    const onAddClient = vi.fn();
    render(
      <ClientsNewPartnerEmptyState
        accessMode="business"
        businessPartnerType="STORE"
        onAddClient={onAddClient}
        canLinkOnboardingHistory
      />,
    );
    await user.click(screen.getByRole("button", { name: /Добавьте клиента вручную/i }));
    expect(onAddClient).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Проверяйте сертификат на кассе/i })).toHaveAttribute(
      "href",
      "/scanner",
    );
  });

  it("CERTIFICATES specialist create steps share onCreateCertificate", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CertificatesNewPartnerEmpty role="specialist" onCreateCertificate={onCreate} />);
    expect(screen.getByRole("link", { name: /Выберите партнёра/i })).toHaveAttribute(
      "href",
      "/partners",
    );
    await user.click(screen.getByRole("button", { name: /Укажите клиента/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("SCANNER scan step calls onOpenScanner", async () => {
    const user = userEvent.setup();
    const onOpenScanner = vi.fn();
    render(<ScannerNewPartnerEmpty onOpenScanner={onOpenScanner} />);
    await user.click(screen.getByRole("button", { name: /Отсканируйте QR/i }));
    expect(onOpenScanner).toHaveBeenCalledTimes(1);
  });

  it("TEAM invite steps call onInvite; branch step links to profile branches", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn();
    render(<TeamSectionNewPartnerEmpty onInvite={onInvite} />);
    await user.click(screen.getByRole("button", { name: /Отправьте ссылку/i }));
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: /Укажите филиалы/i })).toHaveAttribute(
      "href",
      "/profile?section=branches",
    );
    expect(
      screen.queryByRole("button", { name: /Укажите филиалы/i }),
    ).not.toBeInTheDocument();
  });

  it("CLIENTS company purchases step links to read-only history", () => {
    render(
      <ClientsNewPartnerEmptyState
        accessMode="business"
        businessPartnerType="COMPANY"
        onAddClient={() => undefined}
        canLinkOnboardingHistory
      />,
    );
    const historyStep = screen.getByRole("link", { name: /Открыть историю/i });
    expect(historyStep).toHaveAttribute("href", "/history");
  });

  it("CLIENTS agent purchases step links to history with history hint", () => {
    render(
      <ClientsNewPartnerEmptyState accessMode="agent" onAddClient={() => undefined} canLinkOnboardingHistory />,
    );
    expect(screen.getByRole("link", { name: /Открыть историю/i })).toHaveAttribute(
      "href",
      "/history",
    );
    expect(screen.getByText(/История появится после первой продажи/i)).toBeInTheDocument();
  });

  it("CLIENTS specialist purchases step links to settlements wallet", () => {
    render(
      <ClientsNewPartnerEmptyState accessMode="specialist" onAddClient={() => undefined} />,
    );
    expect(screen.getByRole("link", { name: /Открыть кошелёк/i })).toHaveAttribute(
      "href",
      "/settlements",
    );
    expect(screen.getByText(/Начисления и выплаты — в кошельке/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).not.toBeInTheDocument();
  });

  it("CERTIFICATES store confirmed-sale step links to history without confirm action", () => {
    render(<CertificatesNewPartnerEmpty role="store" onCreateCertificate={vi.fn()} canLinkOnboardingHistory />);
    expect(
      screen.getByRole("link", { name: /Продажа подтверждена.*Открыть историю/i }),
    ).toHaveAttribute("href", "/history");
  });

  it("CERTIFICATES store recommend step uses create handler not route link", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CertificatesNewPartnerEmpty role="store" onCreateCertificate={onCreate} canLinkOnboardingHistory />);
    await user.click(screen.getByRole("button", { name: /Рекомендуйте сами/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("PROFILE agent requisites step is static; wallet roles link to settlements", async () => {
    const user = userEvent.setup();
    const onStartFill = vi.fn();
    const { unmount } = render(<ProfileSectionEmptyState role="agent" onStartFill={onStartFill} />);
    expect(
      screen.queryByRole("button", { name: /Реквизиты/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Реквизиты/i })).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Начать заполнение: Имя и контакты/i }),
    );
    expect(onStartFill).toHaveBeenCalledTimes(1);
    unmount();

    render(<ProfileSectionEmptyState role="store" onStartFill={vi.fn()} />);
    expect(screen.getByRole("link", { name: /Реквизиты/i })).toHaveAttribute(
      "href",
      "/settlements",
    );
    expect(screen.getByText(/Вкладка «Реквизиты» в кошельке/i)).toBeInTheDocument();
  });

  it("store wallet history steps stay static without capability prop", () => {
    render(<WalletSectionEmptyState role="store" />);
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Раздел «История» недоступен/i).length).toBeGreaterThanOrEqual(2);
  });

  it("WALLET seller first step links to scanner", () => {
    render(<WalletSectionEmptyState role="store" canLinkOnboardingHistory />);
    expect(screen.getByRole("link", { name: /Продажа по сертификату/i })).toHaveAttribute(
      "href",
      "/scanner",
    );
  });
});

describe("onboarding step list guard", () => {
  it("does not put chevron-style actionable chrome on static steps only", () => {
    const { container } = render(<PartnerHomeEmptyState role="specialist" />);
    expectNoInteractiveLi(container);
    const staticBlocks = container.querySelectorAll('[data-onboarding-step="static"]');
    staticBlocks.forEach((el) => {
      expect(el.querySelector("svg")).toBeNull();
    });
  });

  it("specialist onboarding empty states never link to /history", () => {
    const mounts: Array<() => { container: HTMLElement; unmount: () => void }> = [
      () => render(<PartnerHomeEmptyState role="specialist" />),
      () =>
        render(
          <ClientsNewPartnerEmptyState accessMode="specialist" onAddClient={() => undefined} />,
        ),
      () =>
        render(<CertificatesNewPartnerEmpty role="specialist" onCreateCertificate={vi.fn()} />),
      () => render(<WalletSectionEmptyState role="specialist" />),
      () => render(<ProfileSectionEmptyState role="specialist" onStartFill={vi.fn()} />),
    ];
    for (const mount of mounts) {
      const { container, unmount } = mount();
      expect(container.querySelectorAll('a[href="/history"]')).toHaveLength(0);
      unmount();
    }
  });
});
