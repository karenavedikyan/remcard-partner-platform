export async function createProfTestUser() {
  return { id: "test-new", publicId: "RC-TEST-NEW" };
}

export async function disableProfTestUser() {
  return { ok: true };
}

export async function setProfTestPublicCatalogShow() {
  return { ok: true };
}

export async function adminPasswordChange() {
  return { ok: true };
}

export async function fetchProfTestUsers() {
  return {
    items: [
      {
        id: "test-1",
        publicId: "RC-TEST-1",
        displayName: "Тестовый агент harness",
        partnerType: "AGENT",
        partnerActivities: ["agent"],
        profTestDisabledAt: null,
        profTestCreatedAt: "2026-10-01T00:00:00.000Z",
        profTestPublicCatalogAllowed: true,
        catalogStatus: "APPROVED",
        isPublic: true,
        isBlocked: false,
        organizationsOwned: [
          {
            id: "test-org",
            name: "Тестовая организация с длинным названием",
            catalogStatus: "APPROVED",
            catalogPublished: true,
          },
        ],
      },
    ],
  };
}
