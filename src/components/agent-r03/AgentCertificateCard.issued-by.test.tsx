import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentCertificateCard } from "./AgentCertificateCard";
import { AgentR03MobileCertRow } from "./AgentR03MobileCertRow";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";

const base = {
  id: "c1",
  promoCode: "G1",
  displayCode: "S-G1",
  qrCode: "q",
  status: "ACTIVE",
  validUntil: null,
  maxUsages: 0,
  usageCount: 0,
  createdAt: "2026-10-01T10:00:00.000Z",
  userAlias: null,
  title: "Сертификат",
  directionLabel: null,
  partnerStoreName: "Store",
  partnerCount: 1,
  categorySummary: null,
  discountPercent: 5,
  archivedInWorkspace: false,
  hasOrders: false,
  agentClient: null,
  issuerKindSnapshot: null,
} as AgentCertificateRow;

const props = { selected: false, onSelectChange: () => {}, actions: [] };

describe("«Выпустил» on certificate card and mobile row", () => {
  it("renders the employee name when issuedBy is present", () => {
    const cert = { ...base, issuedBy: { id: "e1", name: "Иван Петров" } };
    const { unmount } = render(<AgentCertificateCard cert={cert} archived={false} {...props} />);
    expect(screen.getByTestId("certificate-issued-by")).toHaveTextContent("Выпустил: Иван Петров");
    unmount();
    render(<AgentR03MobileCertRow cert={cert} {...props} />);
    expect(screen.getByTestId("certificate-issued-by")).toHaveTextContent("Выпустил: Иван Петров");
  });

  it("renders nothing for owner/legacy certificates", () => {
    render(<AgentCertificateCard cert={{ ...base, issuedBy: null }} archived={false} {...props} />);
    expect(screen.queryByTestId("certificate-issued-by")).not.toBeInTheDocument();
  });
});
