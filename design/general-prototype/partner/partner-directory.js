// Explicit fictional catalogue tags for the seven existing demo profiles.
// Production must read these IDs from each partner's published catalogue.
const demoDirections = {
  materials: { products: ["flooring", "doors", "paint", "wallpaper", "construction"], services: [], stages: ["L1-8", "L1-9"] },
  interior: { products: [], services: ["painting", "furniture"], stages: ["L1-9", "L1-10"] },
  light: { products: ["lighting", "electrical"], services: [], stages: ["L1-7", "L1-10"] },
  tile: { products: ["tiles"], services: [], stages: ["L1-9"] },
  repair: { products: [], services: ["renovation", "planning", "demolition", "rough", "engineering", "finishing"], stages: ["L1-1", "L1-4", "L1-7", "L1-8", "L1-9", "L1-11"] },
  master: { products: [], services: ["doors"], stages: ["L1-9"] },
  recommender: { products: [], services: [], stages: [] },
};
const normalize = (value = "") => String(value).trim().replace(/\s+/g, " ").toLocaleLowerCase("ru").replace(/ё/g, "е");
export function partnerDirections(partner) {
  const demo = demoDirections[partner.id] || {};
  return Object.fromEntries(["products", "services", "stages"].map((group) => [group, Array.isArray(partner[group]) ? partner[group] : demo[group] || []]));
}
export function directionLabel(dictionary, value) {
  const [group, id] = String(value).split(":");
  const item = dictionary[group]?.find((entry) => entry.id === id);
  return item ? `${group === "products" ? "Товары" : "Работы и услуги"}: ${item.label}` : "";
}
export function stageLabel(dictionary, id) {
  return dictionary.stages.find((entry) => entry.id === id)?.label || "";
}
export function filterDirectory(partners, state, dictionary) {
  const query = normalize(state.q);
  return partners.filter((partner) => {
    const directions = partnerDirections(partner);
    const labels = ["products", "services", "stages"].flatMap((group) => dictionary[group].filter((item) => directions[group].includes(item.id)).map((item) => item.label));
    const [group, id] = String(state.specialization || "").split(":");
    return (!query || normalize([partner.name, partner.id, partner.city, ...(partner.topics || []), ...labels].join(" ")).includes(query)) &&
      (!state.city || partner.city === state.city) &&
      (!state.type || partner.type === state.type) &&
      (!state.specialization || ["products", "services"].includes(group) && directions[group].includes(id)) &&
      (!state.stage || directions.stages.includes(state.stage));
  });
}
export function directoryFacts(partner, state, dictionary, escape) {
  const directions = partnerDirections(partner);
  const matched = [
    state.specialization ? directionLabel(dictionary, state.specialization) : "",
    state.stage ? `Этап: ${stageLabel(dictionary, state.stage)}` : "",
  ].filter(Boolean);
  const stages = directions.stages.map((id) => stageLabel(dictionary, id)).filter(Boolean);
  return matched.length
    ? `<div class="directory-match" aria-label="Почему подходит">${matched.map((text) => `<span>${escape(text)}</span>`).join("")}</div>`
    : stages.length ? `<p class="small directory-stages">Этапы: ${escape(stages.slice(0, 3).join(", "))}${stages.length > 3 ? ` и ещё ${stages.length - 3}` : ""}</p>` : "";
}
export function directoryFullDirections(partner, dictionary, escape) {
  const directions = partnerDirections(partner);
  const labels = ["products", "services"].flatMap((group) => directions[group].map((id) => directionLabel(dictionary, `${group}:${id}`))).filter(Boolean);
  const stages = directions.stages.map((id) => stageLabel(dictionary, id)).filter(Boolean);
  return `<section class="directory-profile-directions"><h3>Специализация и этапы</h3><p class="small">${labels.length ? labels.map(escape).join(" · ") : "Специализация не указана"}</p><p class="small">Этапы: ${stages.length ? stages.map(escape).join(", ") : "не указаны"}</p><small>В прототипе показаны демонстрационные данные каталога.</small></section>`;
}
