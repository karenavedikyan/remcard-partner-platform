/**
 * Match PAGE_DEFS to PROTOTYPE-PAGES.md table (generated).
 * Run: node prototype-numbering.stability.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const js = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");
const md = readFileSync(new URL("./PROTOTYPE-PAGES.md", import.meta.url), "utf8");
function loadPageDefs(src) {
  const start = src.indexOf("const PAGE_DEFS = [");
  const end = src.indexOf("\n];", start) + 3;
  const sandbox = vm.createContext({});
  vm.runInContext(src.slice(start, end).replace(/^const PAGE_DEFS/, "var PAGE_DEFS"), sandbox);
  return sandbox.PAGE_DEFS;
}
const PAGE_DEFS = loadPageDefs(js);

const mdPages = [...md.matchAll(/\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|/g)].map((m) => ({
  n: Number(m[1]),
  id: m[2],
}));

if (mdPages.length !== PAGE_DEFS.length) {
  throw new Error(`PROTOTYPE-PAGES.md out of date: md=${mdPages.length} js=${PAGE_DEFS.length}. Regenerate md.`);
}
for (let i = 0; i < PAGE_DEFS.length; i++) {
  assert.equal(PAGE_DEFS[i].n, mdPages[i].n);
  assert.equal(PAGE_DEFS[i].id, mdPages[i].id);
}
console.log("prototype-numbering.stability: ok", { count: PAGE_DEFS.length });
