import { RemcardApiError } from "@/lib/api-client";

export function isCabinetShellAuthFailure(error: unknown): boolean {
  return error instanceof RemcardApiError && (error.status === 401 || error.status === 403);
}
