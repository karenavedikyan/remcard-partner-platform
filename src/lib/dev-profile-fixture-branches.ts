/** Active branches for `/profile/dev-fixture` catalog pin selector (acceptance only). */

export type DevFixtureOrgBranch = {
  id: string;
  name: string;
  city: string;
  address: string;
  isActive: true;
};

export function devFixtureOrganizationBranches(
  partnerType: "STORE" | "COMPANY",
): DevFixtureOrgBranch[] {
  if (partnerType === "COMPANY") {
    return [
      {
        id: "branch-co-1",
        name: "Головной офис",
        city: "Краснодар",
        address: "ул. Строителей, 10",
        isActive: true,
      },
    ];
  }
  return [
    {
      id: "branch-st-1",
      name: "Южный",
      city: "Краснодар",
      address: "ул. Южная, 3",
      isActive: true,
    },
    {
      id: "branch-st-2",
      name: "Центральный",
      city: "Краснодар",
      address: "ул. Красная, 1",
      isActive: true,
    },
    {
      id: "branch-st-3",
      name: "Западный",
      city: "Краснодар",
      address: "ул. Западная, 2",
      isActive: true,
    },
  ];
}
