import { remcardFetch } from "@/lib/api-client";

export type TaxonomyProposalKind = "SERVICE" | "STAGE";

export type SubmitTaxonomyProposalResponse =
  | {
      ok: true;
      created: boolean;
      message: string;
      proposal: {
        id: string;
        kind: TaxonomyProposalKind;
        status: string;
        originalName: string;
        createdAt: string;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function submitTaxonomyProposal(body: {
  kind: TaxonomyProposalKind;
  name: string;
  description?: string;
}): Promise<SubmitTaxonomyProposalResponse> {
  return remcardFetch<SubmitTaxonomyProposalResponse>("/api/pro/taxonomy-proposals", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
