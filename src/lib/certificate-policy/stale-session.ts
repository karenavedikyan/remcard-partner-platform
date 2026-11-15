/** Save/propose aborted because viewer or dialog session changed while the request was in flight. */
export class CertificatePolicyStaleSessionError extends Error {
  constructor() {
    super("Certificate policy action superseded by a newer session.");
    this.name = "CertificatePolicyStaleSessionError";
  }
}

export function isCertificatePolicyStaleSessionError(error: unknown): boolean {
  return error instanceof CertificatePolicyStaleSessionError;
}