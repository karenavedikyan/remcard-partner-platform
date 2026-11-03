import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesNewPartnerEmpty } from "./CertificatesNewPartnerEmpty";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./certificates-new-partner-empty.module.css";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

describe("CertificatesNewPartnerEmpty CTA semantics", () => {
  it("agent: link-as-button CTAs without nested interactive elements", () => {
    render(<CertificatesNewPartnerEmpty role="agent" createHref="/certificates/new" />);
    const create = screen.getByTestId("es-создать-сертификат");
    expect(create.tagName).toBe("A");
    expect(create.querySelector("button")).toBeNull();
    expect(create.className).toContain(buttonStyles.button);
    expect(create.className).toContain(buttonStyles.primary);
    expect(create.className).toContain(styles.actionLink);

    const partners = screen.getByTestId("es-найти-партнёра");
    expect(partners.tagName).toBe("A");
    expect(partners.querySelector("button")).toBeNull();
    expect(partners.className).toContain(buttonStyles.secondary);
  });

  it("store: scan link-as-button and create as real button", () => {
    render(<CertificatesNewPartnerEmpty role="store" onCreateCertificate={() => undefined} />);
    const scan = screen.getByTestId("es-проверить-сертификат");
    expect(scan.tagName).toBe("A");
    expect(scan.querySelector("button")).toBeNull();

    const create = screen.getByTestId("es-создать-сертификат");
    expect(create.tagName).toBe("BUTTON");
    expect(create.getAttribute("type")).toBe("button");
    expect(create.className).toContain(styles.actionButton);
  });

  it("specialist create uses button when dialog handler provided", () => {
    render(<CertificatesNewPartnerEmpty role="specialist" onCreateCertificate={() => undefined} />);
    expect(screen.getByTestId("es-создать-сертификат").tagName).toBe("BUTTON");
  });
});
