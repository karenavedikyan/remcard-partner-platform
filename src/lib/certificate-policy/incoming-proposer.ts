import type {
  CertificatePolicyProposal,
  CertificatePolicyWorkspace,
} from "@/lib/certificate-policy/types";

export function certificatePolicyIncomingProposalTitle(
  workspace: CertificatePolicyWorkspace,
  proposal: CertificatePolicyProposal,
): string {
  const name = workspace.counterparties
    .find((c) => c.userId === proposal.proposerUserId)
    ?.displayName?.trim();
  if (name) {
    return `${name} предлагает новые условия`;
  }
  return "Входящее предложение (контрагент не найден в списке партнёров)";
}