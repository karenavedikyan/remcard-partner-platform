import { describe, expect, it } from "vitest";
import { resolveBusinessSectionDispatch } from "./dispatch-priority";
import type { EmployeeIssuerStatus } from "@/lib/employee-issuer/types";

const client = {
  id: "e1",
  displayName: "Employee",
  role: "CLIENT" as const,
  partnerType: null,
  partnerActivities: [],
};

function dispatch(
  employeeIssuer: EmployeeIssuerStatus | null | undefined,
  over: Partial<Parameters<typeof resolveBusinessSectionDispatch>[0]> = {},
) {
  return resolveBusinessSectionDispatch({
    user: client,
    proContext: { role: "PARTNER_EMPLOYEE", employer: { id: "emp", displayName: "Мастер" } },
    contextReady: true,
    // the employee's own CLIENT profile is never agent-like or specialist-like
    r03Eligible: false,
    r06Eligible: false,
    surface: "issuer",
    employeeIssuer,
    ...over,
  });
}

const status = (over: Partial<EmployeeIssuerStatus>): EmployeeIssuerStatus => ({
  applicable: true,
  workspace: "specialist",
  canIssue: true,
  employerDisplayName: "Мастер Иван",
  ...over,
});

describe("resolveBusinessSectionDispatch: employee without Branch (persisted rights)", () => {
  it("specialist employer: the employer's issuer workspace, with the employer label and the issue right", () => {
    expect(dispatch(status({}))).toEqual({
      kind: "employee-issuer",
      canIssue: true,
      employerLabel: "Мастер Иван",
    });
  });

  it("agent employer: the agent screens, chosen from the EMPLOYER and not from the employee's CLIENT profile", () => {
    expect(dispatch(status({ workspace: "agent" }))).toEqual({ kind: "agent-r03" });
  });

  it("main-organization member: business workspace with the organization's partner type", () => {
    expect(
      dispatch(status({ workspace: "business", source: "org" }), {
        proContext: {
          role: "ORG_TEAM_MEMBER",
          organization: { id: "o1", name: "Shop", partnerType: "COMPANY" },
        },
      }),
    ).toMatchObject({ kind: "employee-issuer", partnerType: "COMPANY", canIssue: true });
  });

  it("no issue right: the workspace opens read-only (canIssue false), nothing is promoted", () => {
    expect(dispatch(status({ canIssue: false }))).toMatchObject({ kind: "employee-issuer", canIssue: false });
  });

  it("not applicable (owner, legacy/revoked/suspended/VIEWER-without-right, failed status call): the existing decision is untouched", () => {
    for (const s of [null, undefined, { applicable: false, workspace: null, canIssue: false } as unknown as EmployeeIssuerStatus]) {
      expect(dispatch(s).kind).not.toBe("employee-issuer");
      expect(dispatch(s).kind).not.toBe("agent-r03");
    }
  });

  it("an unsupported employer workspace never opens an issuer screen", () => {
    expect(dispatch(status({ workspace: "unsupported" })).kind).not.toBe("employee-issuer");
  });

  it("clients surface: never the issuer screen; a non-agent employer keeps the existing decision", () => {
    expect(dispatch(status({}), { surface: "clients" }).kind).not.toBe("employee-issuer");
    expect(dispatch(status({}), { surface: "clients" })).toEqual({ kind: "specialist-r06" });
  });

  it("clients surface, AGENT employer (AB-11): observer-only screen when observer rights exist, never decided by canIssue alone", () => {
    const clients = { surface: "clients" as const };
    expect(dispatch(status({ workspace: "agent" }), clients)).toEqual({ kind: "agent-r03" });
    expect(dispatch(status({ workspace: "agent", canIssue: true, canManageClients: false, role: "SELLER" }), clients)).toEqual({ kind: "agent-r03" });
    expect(dispatch(status({ workspace: "agent", canIssue: false, canManageClients: true, role: "SELLER" }), clients)).toEqual({ kind: "agent-r03" });
    expect(dispatch(status({ workspace: "agent", canIssue: false, canManageClients: false }), clients)).toEqual({ kind: "clients-unavailable" });
    expect(dispatch(status({ workspace: "agent", role: "VIEWER", canIssue: true, canManageClients: true }), clients)).toEqual({ kind: "clients-unavailable" });
  });

  it("clients surface, AGENT employer status without a verified assistant context does not route to the agent screen", () => {
    expect(
      dispatch(status({ workspace: "agent" }), { surface: "clients", proContext: { role: "SOLO_PARTNER" } as never }).kind,
    ).not.toBe("agent-r03");
  });
});
