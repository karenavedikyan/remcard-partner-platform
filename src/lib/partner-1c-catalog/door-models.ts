import type { DoorCatalogModel } from "@/lib/doorCalculator/types";
import { buildPartnerModels, defaultPublicationState, modelStatus } from "./models";
import { optovikFixtureProducts } from "./fixtures";

/** Published межкомнатные/входные doors for calculator «Из каталога». */
export function publishedDoorCatalogModels(): DoorCatalogModel[] {
  const pub = defaultPublicationState();
  const models = buildPartnerModels(optovikFixtureProducts()).filter((m) => m.cat === "doors");
  return models
    .filter((m) => modelStatus(pub, m) === "live")
    .map((m) => {
      const colors = [...new Set(m.skus.map((k) => k.props.Цвет || k.color).filter(Boolean))];
      const blades = buildBladesFromSkus(m);
      return {
        id: m.id,
        name: m.name,
        maker: "Тандор",
        color: colors[0] ?? "#e9e4da",
        price: m.price ?? 0,
        blades,
      };
    });
}

function buildBladesFromSkus(m: ReturnType<typeof buildPartnerModels>[0]) {
  const widthSizes = [...new Set(m.skus.map((k) => parseInt(k.size, 10)).filter((w) => w > 0))];
  if (!widthSizes.length) return null;
  widthSizes.sort((a, b) => a - b);
  return widthSizes.map((w, i) => ({
    w,
    from: 700 + i * 70,
    to: 760 + i * 80,
  }));
}
