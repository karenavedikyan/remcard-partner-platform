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
const repairR2 = readFileSync(path.join(root, "partner/repair-objects-r2.js"), "utf8");
const clientAppeals = readFileSync(path.join(root, "partner/client-appeals.js"), "utf8");
const wallet = readFileSync(path.join(root, "partner/wallet-accruals.js"), "utf8");
const walletCss = readFileSync(path.join(root, "partner/wallet-accruals.css"), "utf8");
const index = readFileSync(path.join(root, "index.html"), "utf8");
const numbering = readFileSync(path.join(root, "prototype-numbering.js"), "utf8");

assert.match(host, /STANDALONE_BY_N/, "standalone catalog");
assert.match(host, /cabinet_embed/, "embed query");
assert.match(roles, /createCabinetStandaloneHost/, "roles imports portal host");
assert.match(roles, /openPartnerCooperationEmbed/, "partner opens embed 143 directly");
assert.match(host, /ev\.source !== frame\.contentWindow/, "message source guard");
assert.match(host, /addEventListener\("scroll", onOuterScroll/, "portal follows document scroll");
assert.match(host, /removeEventListener\("scroll", onOuterScroll/, "document scroll listener cleaned up");
assert.match(roles, /handleStandaloneHostClick/, "roles wires standalone clicks");
assert.match(repairR2, /REPAIR_OBJECT_FIXTURES/, "R2 repair object fixtures");
assert.match(repairR2, /r2-obj-ekb-draft/, "fixture without assignment");
assert.match(clientAppeals, /ca-r2-repair-entry/, "clients list R2 repair entry");
assert.match(clientAppeals, /buildRepairEmbedCtx/, "client appeals hands off repair embed ctx");
assert.match(roles, /R2_REPAIR_OBJECT_PAGES/, "roles gates 141/142 by release");
assert.match(host, /pendingCtx\?\.r2Repair/, "141 workflowNA bypass for contextual R2 handoff");
assert.match(numbering, /141[\s\S]*tocOpen[\s\S]*Объекты и поручения/, "TOC gates 141 to R2 cabinet path");
assert.match(clientAppeals, /agentClientsObserverOnly/, "agent clients observer-only mode");
assert.match(clientAppeals, /ca-observer-partners-list/, "observer partners list test id");
assert.match(clientAppeals, /if \(agentClientsObserverOnly\(config\)\) return;/, "blocks agent legacy client nav handlers");
assert.match(numbering, /partner:agent:clients-list[\s\S]*Мои клиенты у партнёров/, "page 106 titles agent observer list");
assert.match(wallet, /proto-standalone:147/, "wallet hub in cabinet");
assert.match(wallet, /workspaceDisplayName/, "wallet ribbon uses selected workspace actor");
assert.match(wallet, /<a href="#" class="wallet-accruals-history__hub-link"/, "history hub matches production link surface");
assert.doesNotMatch(
  walletCss,
  /\.wallet-accruals-history__hub-link[\s\S]{0,220}font:\s*inherit/,
  "history hub must not use font: inherit shorthand",
);
assert.match(walletCss, /font-size:\s*0\.8125rem/, "history hub font-size matches production global css");
assert.match(wallet, /data-agent-wallet="true"/, "agent wallet production shell marker");
assert.match(wallet, /workspaceOwnerRole\(config\) !== "agent"/, "agent wallet omits demo PAN line");
assert.match(index, /proto_standalone=143/, "hub launches cabinet 143");
assert.doesNotMatch(index, /href="\.\/partner\/partner-cooperation-detail\.html"/, "no bare 143 hub link");
assert.match(numbering, /__protoCabinetEmbeddedPage/, "embedded page badge");
assert.match(numbering, /proto-embed-change/, "parent listens embed badge changes");
const embedCss = readFileSync(path.join(root, "prototype-cabinet-embed.css"), "utf8");
assert.doesNotMatch(
  embedCss,
  /embed-readonly[\s\S]*#filter-button/,
  "read-only embed must not block wallet history filters",
);
const numberingCss = readFileSync(path.join(root, "prototype-numbering.css"), "utf8");
assert.match(numberingCss, /proto-cabinet-embed-host-active/, "reviewer dock above embed portal");
assert.match(roles, /handleEmbedSupplementalAction/, "parent supplemental bridge");
assert.match(roles, /embed-supplemental-actions/, "143 supplemental toolbar html");
const embed143 = readFileSync(path.join(root, "partner/partner-cooperation-detail-embed.js"), "utf8");
assert.match(embed143, /type: "supplemental"/, "143 posts supplemental actions");
assert.match(embed143, /byId\("embed-supplemental"\)/, "143 supplemental delegate root");
const hostCss = readFileSync(path.join(root, "partner/cabinet-standalone-host.css"), "utf8");
assert.match(hostCss, /cabinet-standalone-active main\.content/, "hide stale main content under portal gap");
assert.match(
  hostCss,
  /html\.proto-cabinet-embed-host-active .shell main\.content/,
  "html embed class hides stale main across theme rerender",
);
assert.match(hostCss, /--embed-host-ink/, "portal host uses explicit theme tokens");
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /syncEmbedShellChrome/,
  "afterCabinetRender restores embed shell chrome",
);
const embedRole = readFileSync(path.join(root, "standalone-embed-role.js"), "utf8");
assert.match(embedRole, /scanSaleRelockScheduled/, "146 sale guard coalesces relock rAF");
assert.match(embedRole, /if \(el\.disabled !== true\)/, "146 sale lock writes are idempotent");
const walletHistory = readFileSync(path.join(root, "partner/partner-wallet-history.js"), "utf8");
assert.match(walletHistory, /data-proto-embed-ignore/, "147 purchase anchor ignored by generic embed nav");
assert.match(walletHistory, /data-purchase-embed/, "147 contextual purchase embed handler");
assert.match(
  walletHistory,
  /hasRewardSnapshot:\s*hasSavedReward/,
  "147 accrualReceiptCtx marks saved wallet reward snapshot",
);
const purchaseDetail = readFileSync(path.join(root, "partner/partner-purchase-detail.js"), "utf8");
assert.match(purchaseDetail, /__protoCabinetEmbedBack/, "144 history uses embed back to 147");
assert.match(purchaseDetail, /replace:\s*true/, "144 document ops replace-navigate to 147");
const embedChild = readFileSync(path.join(root, "prototype-cabinet-embed.js"), "utf8");
assert.match(embedChild, /replace:/, "embed child posts replace nav");
assert.match(host, /replace:\s*!!data\.replace/, "host honors replace nav");
const receiptEmbed = readFileSync(path.join(root, "partner/partner-reward-receipt-embed.js"), "utf8");
assert.match(receiptEmbed, /__protoReceiptEmbedDismissBound/, "145 early embed dismiss before native defer");
assert.match(receiptEmbed, /Начисление профклиенту/, "145 merchant hero copy");
assert.match(receiptEmbed, /детализация расчёта недоступна/, "145 hides borrowed calc breakdown");
assert.match(
  host,
  /if \(!replace && chain && openPageN\)[\s\S]{0,450}if \(embedCtx != null\) openCtx = embedCtx;/,
  "chain push before ctx swap",
);
const walletHistoryHtml = readFileSync(path.join(root, "partner/partner-wallet-history.html"), "utf8");
assert.match(walletHistoryHtml, /wallet-open-receipt-145/, "147 accrual detail opens receipt 145");

for (const broken of [
  "partner/recommendation.html",
  "partner/assignment.html",
  "partner/observer.html",
]) {
  const html = readFileSync(path.join(root, broken), "utf8");
  assert.doesNotMatch(
    html,
    /<script data-pplx-inline-edit>[\s\S]*?<link[\s\S]*?prototype-cabinet-embed/,
    `${broken} embed tags must not live inside inline-edit script`,
  );
  assert.match(html, /prototype-cabinet-embed\.css/, `${broken} embed css in document`);
}

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
