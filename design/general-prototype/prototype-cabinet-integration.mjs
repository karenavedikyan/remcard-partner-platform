/**
 * Cabinet standalone embed integration checks.
 * Run: node design/general-prototype/prototype-cabinet-integration.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

const host = readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8");
const roles = readFileSync(path.join(root, "partner/roles.js"), "utf8");
const wallet = readFileSync(path.join(root, "partner/wallet-accruals.js"), "utf8");
const index = readFileSync(path.join(root, "index.html"), "utf8");
const numbering = readFileSync(path.join(root, "prototype-numbering.js"), "utf8");

assert.match(host, /STANDALONE_BY_N/, "standalone catalog");
assert.match(host, /cabinet_embed/, "embed query");
assert.match(roles, /createCabinetStandaloneHost/, "roles imports portal host");
assert.match(roles, /openPartnerCooperationEmbed/, "partner opens embed 143 directly");
assert.match(host, /ev\.source !== frame\.contentWindow/, "message source guard");
assert.match(roles, /handleStandaloneHostClick/, "roles wires standalone clicks");
assert.match(wallet, /proto-standalone:147/, "wallet hub in cabinet");
assert.match(index, /proto_standalone=143/, "hub launches cabinet 143");
assert.doesNotMatch(index, /href="\.\/partner\/partner-cooperation-detail\.html"/, "no bare 143 hub link");
assert.match(numbering, /__protoCabinetEmbeddedPage/, "embedded page badge");
assert.match(numbering, /proto-embed-change/, "parent listens embed badge changes");
const numberingCss = readFileSync(path.join(root, "prototype-numbering.css"), "utf8");
assert.match(numberingCss, /proto-cabinet-embed-host-active/, "reviewer dock above embed portal");
assert.match(roles, /handleEmbedSupplementalAction/, "parent supplemental bridge");
assert.match(roles, /embed-supplemental-actions/, "143 supplemental toolbar html");
const embed143 = readFileSync(path.join(root, "partner/partner-cooperation-detail-embed.js"), "utf8");
assert.match(embed143, /type: "supplemental"/, "143 posts supplemental actions");
const walletHistory = readFileSync(path.join(root, "partner/partner-wallet-history.js"), "utf8");
assert.match(walletHistory, /data-proto-embed-ignore/, "147 purchase anchor ignored by generic embed nav");
assert.match(walletHistory, /data-purchase-embed/, "147 contextual purchase embed handler");
const receiptEmbed = readFileSync(path.join(root, "partner/partner-reward-receipt-embed.js"), "utf8");
assert.match(receiptEmbed, /Начисление профклиенту/, "145 merchant hero copy");
assert.match(receiptEmbed, /детализация расчёта недоступна/, "145 hides borrowed calc breakdown");
assert.match(
  host,
  /if \(chain && openPageN\)[\s\S]{0,400}if \(embedCtx != null\) openCtx = embedCtx;/,
  "chain push before ctx swap",
);
const walletHistoryHtml = readFileSync(path.join(root, "partner/partner-wallet-history.html"), "utf8");
assert.match(walletHistoryHtml, /wallet-open-receipt-145/, "147 accrual detail opens receipt 145");

for (const n of [143, 144, 147]) {
  const file = {
    143: "partner/partner-cooperation-detail.html",
    144: "partner/partner-purchase-detail.html",
    147: "partner/partner-wallet-history.html",
  }[n];
  const html = readFileSync(path.join(root, file), "utf8");
  assert.match(html, /prototype-cabinet-embed\.js/, `${file} embed child script`);
}

console.log("prototype-cabinet-integration.mjs: ok");
