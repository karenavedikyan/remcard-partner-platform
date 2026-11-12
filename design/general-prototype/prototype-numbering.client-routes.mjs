/**
 * Authoritative client route matching (frozen SPA inventory).
 * Run: node prototype-numbering.client-routes.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const js = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");

function loadPageDefs(src) {
  const start = src.indexOf("const PAGE_DEFS = [");
  const end = src.indexOf("\n];", start) + 3;
  const sandbox = vm.createContext({});
  vm.runInContext(src.slice(start, end).replace(/^const PAGE_DEFS/, "var PAGE_DEFS"), sandbox);
  return sandbox.PAGE_DEFS;
}

const PAGE_DEFS = loadPageDefs(js);
const byId = new Map(PAGE_DEFS.map((p) => [p.id, p]));

function normalizeClientRoute(rawHash) {
  let route = (rawHash || "").replace(/^#\/?/, "").split("?")[0];
  route = route.replace(/^\/+/, "").replace(/\/+$/, "");
  if (route === "services") return "care";
  const service = route.match(/^service\/(.+)$/);
  if (service) return `care/${service[1]}`;
  return route;
}

const CLIENT_ROUTE_MATCHERS = [
  (r) => (/^catalog\/p\/[^/]+$/.test(r) ? "client:catalog-product" : null),
  (r) => (/^catalog\/s\/[^/]+$/.test(r) ? "client:catalog-service" : null),
  (r) => (/^catalog\/kit\/[^/]+$/.test(r) ? "client:catalog-kit" : null),
  (r) => (r === "catalog/list" ? "client:catalog-list" : null),
  (r) => (/^catalog\/[^/]+$/.test(r) && r !== "catalog/list" ? "client:catalog-detail" : null),
  (r) => (r === "catalog" ? "client:catalog" : null),
  (r) => (/^me\/enquiry\/[^/]+$/.test(r) ? "client:me-enquiry" : null),
  (r) => (/^me\/purchases$/.test(r) ? "client:me-purchases" : null),
  (r) => (r === "me" ? "client:me" : null),
  (r) => (r === "care" ? "client:care" : null),
  (r) => (/^care\/[^/]+$/.test(r) ? "client:care-detail" : null),
  (r) => (/^cert\/[^/]+$/.test(r) ? "client:cert-code" : null),
  (r) => (r === "" ? "client:home" : null),
];

function match(route) {
  for (const pick of CLIENT_ROUTE_MATCHERS) {
    const id = pick(route);
    if (id) return byId.get(id);
  }
  return null;
}

const cases = [
  ["", "client:home"],
  ["#/catalog/p/p004", "client:catalog-product"],
  ["#/catalog/s/tiler", "client:catalog-service"],
  ["#/catalog/s1", "client:catalog-detail"],
  ["#/catalog/list", "client:catalog-list"],
  ["#/me/purchases", "client:me-purchases"],
  ["#/services", "client:care"],
  ["#/service/plumber", "client:care-detail"],
  ["#/cert/RC-CITY-M8V2", "client:cert-code"],
  ["#/me/enquiry/l1", "client:me-enquiry"],
];

for (const [hash, id] of cases) {
  const page = match(normalizeClientRoute(hash));
  assert.equal(page?.id, id, `${hash} -> ${id}`);
}

const clientPages = PAGE_DEFS.filter((p) => p.zone === "client");
assert.equal(clientPages.length, 36);
assert.equal(clientPages[0].id, "client:home");
assert.equal(clientPages[0].n, 2);
assert.ok(!PAGE_DEFS.some((p) => /client:(register|account|product|matcalc|checkout)/.test(p.id)));

assert.match(js, /CLIENT_ROUTE_MATCHERS/, "ordered client matchers");
assert.match(js, /#\//, "admin pageHref uses view hash");
assert.match(js, /section === "wallet"/, "wallet nav normalization");

console.log("prototype-numbering.client-routes: ok");
