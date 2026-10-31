export async function fetchPartnerTaxonomy() {
  return {
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "elec", label: "Электрика" }],
    stages: [{ kind: "stage", id: "L1-8", label: "Отделка" }],
  };
}
