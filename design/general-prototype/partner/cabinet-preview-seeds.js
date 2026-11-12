// Synthetic saved profiles for «Кабинет» preview only (in-memory, not real accounts).
const seededRoles = new Set();

const demoPhone = "+7 918 111-22-33";
const demoEmail = "partner.demo@example.remcard";
const demoCity = "Краснодар";

function profileForRole(role) {
  switch (role) {
    case "store":
      return {
        name: "Анна Петрова · демо",
        organization: "Дом материалов · демо",
        city: demoCity,
        contactPhone: demoPhone,
        contactEmail: demoEmail,
        contactTelegram: "@dom_materialov_demo",
        website: "https://demo.remcard.example/store",
        products: ["flooring", "doors", "tiles", "plumbing"],
        services: ["flooring", "doors"],
        stages: ["L1-3", "L1-9", "L1-10"],
        partnerSearchOptIn: true,
      };
    case "company":
      return {
        name: "Алексей Смирнов · демо",
        organization: "РемСтрой · демо",
        city: demoCity,
        contactPhone: demoPhone,
        contactEmail: demoEmail,
        contactTelegram: "@remstroy_demo",
        products: ["doors", "windows", "construction"],
        services: ["renovation", "finishing", "engineering"],
        stages: ["L1-0", "L1-7", "L1-10", "L1-11"],
        partnerSearchOptIn: true,
      };
    case "specialist":
      return {
        name: "Игорь Волков · демо",
        city: demoCity,
        contactPhone: "+7 918 222-33-44",
        contactEmail: "specialist.demo@example.remcard",
        services: ["flooring", "doors", "finishing"],
        stages: ["L1-9", "L1-10"],
        partnerSearchOptIn: true,
      };
    case "agent":
      return {
        name: "Мария Козлова · демо",
        city: demoCity,
        contactPhone: "+7 918 333-44-55",
        contactEmail: "agent.demo@example.remcard",
        channel: "https://t.me/demo_agent_channel",
        products: [],
        services: [],
        stages: [],
        partnerSearchOptIn: true,
      };
    case "employee":
      return {
        name: "Алексей Иванов · демо",
        contactPhone: "+7 918 444-55-66",
        contactEmail: "employee.demo@example.remcard",
      };
    default:
      return null;
  }
}

function hasMeaningfulIdentity(draft) {
  return Boolean(String(draft?.name || "").trim());
}

/**
 * @param {object} state - roles prototype root state (drafts, screen)
 * @param {{ screen: string, registering?: boolean, role?: string | null, employerKey?: string }} opts
 */
export function ensureCabinetPreviewDrafts(
  state,
  { screen, registering = false, role = null, employerKey = "company" },
) {
  if (screen !== "cabinet" || registering) return;
  const roles = role ? [role] : ["store", "company", "specialist", "agent", "employee"];
  for (const r of roles) {
    if (seededRoles.has(r)) continue;
    const existing = state.drafts[r];
    if (hasMeaningfulIdentity(existing)) {
      seededRoles.add(r);
      continue;
    }
    const seed = profileForRole(r);
    if (!seed) continue;
    state.drafts[r] = { ...(existing || {}), ...seed };
    seededRoles.add(r);
  }
  for (const employer of new Set([employerKey, "store", "company"])) {
    if (seededRoles.has(`employer:${employer}`)) continue;
    const existing = state.drafts[employer];
    if (hasMeaningfulIdentity(existing)) {
      seededRoles.add(`employer:${employer}`);
      continue;
    }
    if (!["store", "company"].includes(employer)) continue;
    const seed = profileForRole(employer);
    if (!seed) continue;
    state.drafts[employer] = { ...(existing || {}), ...seed };
    seededRoles.add(`employer:${employer}`);
  }
}
