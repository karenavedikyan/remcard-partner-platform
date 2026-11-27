/**
 * Extracts Оптовик (seller s6) demo products from prototype catalog-data.js into JSON fixture.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcPath = path.join(
  root,
  "artifacts/catalog-reference/prototype/client/catalog-data.js",
);
const outPath = path.join(root, "src/lib/partner-1c-catalog/fixtures/optovik-products.json");

const js = fs.readFileSync(srcPath, "utf8");
const wrapped = js.replace("window.RCCatalogData", "globalThis.RCCatalogData");
const sandbox = { globalThis: {} };
vm.runInNewContext(wrapped, sandbox);
const data = sandbox.globalThis.RCCatalogData;
if (!data?.products) throw new Error("RCCatalogData.products missing");

const EXTRA = [
  {
    id: "x901",
    cat: "hardware",
    name: "Наличник телескопический 70×8×2150",
    variant: "Снежно-белый",
    price: 640,
    unit: "шт",
    imgs: [],
    seller: "s6",
    colors: ["Снежно-белый", "Белый"],
    specs: { Ширина: "70 мм", Покрытие: "ЭВО ПЭТ", Длина: "2150 мм" },
    avail: "in",
    tags: [],
  },
  {
    id: "x902",
    cat: "hardware",
    name: "Добор телескопический 100×10×2070",
    variant: "Белый",
    price: null,
    unit: "шт",
    imgs: [],
    seller: "s6",
    colors: ["Белый"],
    specs: { Ширина: "100 мм", Покрытие: "ЭВО ПЭТ", Длина: "2070 мм" },
    avail: "order",
    tags: [],
  },
];

const toPublicImg = (rel) =>
  rel.startsWith("assets/catalog/")
    ? `/catalog-fixture/${rel.replace("assets/catalog/", "")}`
    : rel;

const products = data.products
  .filter((p) => p.seller === "s6")
  .map((p) => ({
    ...p,
    imgs: (p.imgs || []).map(toPublicImg),
  }));

const fixture = {
  sellerId: "s6",
  sellerName: "Оптовик",
  products: [...products, ...EXTRA],
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2) + "\n");
console.log(`Wrote ${fixture.products.length} products to ${outPath}`);