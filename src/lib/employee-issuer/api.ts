import { remcardFetch } from "@/lib/api-client";
import type { EmployeeIssuerStatus } from "./types";

export function fetchEmployeeIssuerStatus() {
  return remcardFetch<EmployeeIssuerStatus>("/api/pro/employee-issuer/status");
}

/** A failed status request must never open anything: it is treated as "not an employee issuer". */
export async function fetchEmployeeIssuerStatusSafe(): Promise<EmployeeIssuerStatus | null> {
  try {
    return await fetchEmployeeIssuerStatus();
  } catch {
    return null;
  }
}
