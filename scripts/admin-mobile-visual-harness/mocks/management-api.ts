export type { ManagementOverview } from "../../../src/lib/prof-admin-management-api";
import { managementOverview } from "./fixtures";

export async function fetchManagementOverview(period: string) {
  return managementOverview(period);
}

export async function recordProfSessionVisit(): Promise<void> {
  /* harness: no server session */
}
