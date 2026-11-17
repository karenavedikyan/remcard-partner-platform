export type EmployeeIssuerWorkspace = "specialist" | "agent" | "business" | "unsupported";

/**
 * Issuer workspace of an employee who works without a Branch (solo-partner employee or main-organization
 * member). Display data only: the server re-checks the persisted rights on every request.
 */
export type EmployeeIssuerStatus = {
  applicable: boolean;
  workspace: EmployeeIssuerWorkspace | null;
  canIssue: boolean;
  canManageClients?: boolean;
  source?: "partner" | "org";
  role?: "MANAGER" | "SELLER" | "VIEWER";
  employerDisplayName?: string | null;
};
