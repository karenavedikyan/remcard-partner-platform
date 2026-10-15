import type { CreateCertificateBody } from "@/lib/certificate-types";

export function hashAgentCreatePayload(
  body: CreateCertificateBody & { agentClientId?: string | null },
): string {
  return JSON.stringify(body);
}

export type CreateIdempotencySession = {
  key: string;
  payloadHash: string;
};

export function resolveCreateIdempotencySession(
  previous: CreateIdempotencySession | null,
  payloadHash: string,
): CreateIdempotencySession {
  if (previous && previous.payloadHash === payloadHash) {
    return previous;
  }
  return { key: crypto.randomUUID(), payloadHash };
}
