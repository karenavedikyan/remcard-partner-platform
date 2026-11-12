/**
 * Partner cabinet section ids must match roles.js nav keys (no orphan catalogue rows).
 * Run: node prototype-numbering.overlap.mjs
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const roles = readFileSync(new URL("./partner/roles.js", import.meta.url), "utf8");
const src = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");

const navKeys = new Set([...roles.matchAll(/"([a-z]+)",\s*$/gm)].map((m) => m[1]));
const beKeys = [...roles.matchAll(/^\s+([a-z]+):\s*\[/gm)].map((m) => m[1]);
beKeys.forEach((k) => navKeys.add(k));

const cabinetSections = [
  ...src.matchAll(/partner:(?:specialist|store|company|agent|employee):([a-z]+)/g),
].map((m) => m[1]);
const uniqueSections = new Set(cabinetSections);

for (const section of uniqueSections) {
  if (section === "registration") continue;
  const known =
    navKeys.has(section) ||
    ["wallet", "links"].includes(section) ||
    roles.includes(`nav:${section}`) ||
    roles.includes(`"${section}"`);
  assert.ok(known, `catalogue section "${section}" should exist in partner nav`);
}

console.log("prototype-numbering.overlap: ok", { sections: [...uniqueSections].sort() });
