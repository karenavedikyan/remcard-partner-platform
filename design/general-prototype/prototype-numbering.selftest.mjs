/**
 * Catalogue + path helpers (no DOM). Run: node prototype-numbering.selftest.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const js = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./prototype-numbering.css", import.meta.url), "utf8");

function loadPageDefs(src) {
  const start = src.indexOf("const PAGE_DEFS = [");
  const end = src.indexOf("\n];", start) + 3;
  const sandbox = vm.createContext({});
  vm.runInContext(src.slice(start, end).replace(/^const PAGE_DEFS/, "var PAGE_DEFS"), sandbox);
  return sandbox.PAGE_DEFS;
}
const PAGE_DEFS = loadPageDefs(js);
assert.ok(Array.isArray(PAGE_DEFS) && PAGE_DEFS.length > 67, "catalogue must exceed 67 pages");

for (let i = 0; i < PAGE_DEFS.length; i++) {
  assert.equal(PAGE_DEFS[i].n, i + 1, `consecutive n at index ${i}`);
}
assert.equal(new Set(PAGE_DEFS.map((p) => p.id)).size, PAGE_DEFS.length, "unique ids");

const clientPages = PAGE_DEFS.filter((p) => p.zone === "client");
assert.ok(clientPages.length >= 37, "client routes catalogue");

const adminViews = new Set(PAGE_DEFS.filter((p) => p.adminView).map((p) => p.adminView));
for (const v of ["overview", "partners", "clients", "team", "tasks", "analytics", "results", "notifications", "settings"]) {
  assert.ok(adminViews.has(v), `admin view ${v}`);
}

assert.match(js, /document\.currentScript/, "root from currentScript");
assert.doesNotMatch(js, /\.\.\/\"\)\.repeat/, "no parent-depth guess paths");
assert.match(js, /proto-page-dialog-host/, "dialog dock");
assert.match(css, /680px/, "mobile partner nav clearance");
assert.doesNotMatch(js, /rc_demo_release=2.*href|href.*rc_demo_release=2/, "TOC must not append rc_demo_release");

writeFileSync(
  new URL("./prototype-page-catalog.json", import.meta.url),
  JSON.stringify(
    {
      version: 2,
      pageCount: PAGE_DEFS.length,
      pages: PAGE_DEFS.map((p) => ({ n: p.n, id: p.id, title: p.title, zone: p.zone, r2: !!p.r2 })),
    },
    null,
    2,
  ) + "\n",
);

console.log("prototype-numbering.selftest: ok", { pageCount: PAGE_DEFS.length, clientPages: clientPages.length });
