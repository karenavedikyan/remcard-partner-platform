import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";

/** Mock employees-overview for `/profile/dev-fixture` screenshots only. */
export const DEV_FIXTURE_EMPLOYEES_OVERVIEW: EmployeesOverviewResponse = {
  organization: { id: "org-fixture", name: "Оптовик Юг" },
  myRole: "ORG_OWNER",
  myBranchIds: ["b1", "b2", "b3"],
  summary: {
    totalEmployees: 5,
    byRole: { MANAGER: 2, SELLER: 2, VIEWER: 1 },
    pendingInvites: 0,
  },
  branches: [
    {
      id: "b1",
      name: "Центральный",
      city: "Краснодар",
      address: "ул. Красная, 1",
      employees: [],
      pendingInvites: [],
    },
    {
      id: "b2",
      name: "Западный",
      city: "Краснодар",
      address: "ул. Западная, 2",
      employees: [],
      pendingInvites: [],
    },
    {
      id: "b3",
      name: "Южный",
      city: "Краснодар",
      address: "ул. Южная, 3",
      employees: [],
      pendingInvites: [],
    },
  ],
  viewer: {
    userId: "u-fixture",
    isOrgOwner: true,
    canManageEmployeesByBranchId: { b1: true, b2: true, b3: true },
  },
};
