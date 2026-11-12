/**
 * Partner catalogue sections align with roles.js nav keys.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadPageDefs(src) {
  const start = src.indexOf("const PAGE_DEFS = [");
  const end = src.indexOf("\n];", start) + 3;
  const sandbox = vm.createContext({});
  vm.runInContext(src.slice(start, end).replace(/^const PAGE_DEFS/, "var PAGE_DEFS"), sandbox);
  return sandbox.PAGE_DEFS;
}

const roles = readFileSync(new URL("./partner/roles.js", import.meta.url), "utf8");
const js = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");
const PAGE_DEFS = loadPageDefs(js);

const navInRoles = new Set(
  [...roles.matchAll(/nav:\s*\[\s*([\s\S]*?)\s*\]/g)].flatMap((m) => [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1])),
);
navInRoles.add("links");

const sections = new Set(PAGE_DEFS.filter((p) => p.partnerSection).map((p) => p.partnerSection));
for (const s of sections) {
  assert.ok(navInRoles.has(s), `partner section ${s} missing from roles.js nav arrays`);
}
console.log("prototype-numbering.overlap: ok", { sections: [...sections].sort() });
