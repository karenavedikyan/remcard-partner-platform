/**
 * Cabinet standalone embed integration checks.
 * Run: node design/general-prototype/prototype-cabinet-integration.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
assert.match(numbering, /cabinetEmbed:\s*true/, "numbered standalone pages use cabinet embed launch");
assert.match(numbering, /function cabinetEmbedHref/, "TOC href routes 143-147 through partner cabinet");
assert.match(roles, /__protoCabinetTocStandalone/, "in-cabinet TOC opens contextual embed host");
assert.match(roles, /purchaseSelectionRequired/, "144 without selection defers to history");
assert.match(clientAppeals, /agentClientsObserverOnly/, "agent clients observer-only mode");
assert.match(clientAppeals, /ca-observer-repair-na/, "observer client card explains 142 unavailability without CTA");
assert.doesNotMatch(
  clientAppeals,
  /renderObserverClientRepairFooter[\s\S]{0,400}standalone:142/,
  "observer direction card must not render standalone 142 button",
);
assert.match(roles, /pageN === 142[\s\S]*O\("clients"\)/, "142 standalone gate requires clients for employee");
assert.match(repairR2, /employeeRepairScopeAllowsDemo/, "scoped employee repair list honest filter");
assert.match(clientAppeals, /ca-observer-partners-list/, "observer partners list test id");
assert.doesNotMatch(clientAppeals, /ca-clients-preview-toggle/, "no legacy clients preview opt-in block");
assert.match(clientAppeals, /clientsAtPartnersTabEnabled/, "partner-grouped at-partners tab without preview toggle");
assert.match(clientAppeals, /atPartnersDirectionSwitchAllowed/, "direction tab uses eligibility not active mode");
assert.match(clientAppeals, /incomingDirectionSwitchAllowed/, "incoming tab uses role eligibility");
assert.doesNotMatch(
  clientAppeals,
  /if \(action === "direction:at-partners"\)[\s\S]{0,180}observerActionsAllowed/,
  "at-partners switch must not require observerActionsAllowed",
);
assert.doesNotMatch(
  clientAppeals,
  /function ws\(key\)[\s\S]{0,900}if \("clientsPreviewMode" in s\) delete s\.clientsPreviewMode/,
  "ws() must not strip clientsPreviewMode before normalizeClientsNavState",
);
assert.match(clientAppeals, /showsAtPartnersObserverList/, "at-partners uses observer list not flat outgoing table");
assert.doesNotMatch(clientAppeals, /Сравните привычный список/, "removed comparison helper copy");
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
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /shouldUseSrcdocStandaloneLoad/,
  "embed host supports preview srcdoc mount",
);
const srcdocLoader = readFileSync(path.join(root, "partner/cabinet-standalone-srcdoc.js"), "utf8");
assert.match(srcdocLoader, /import\.meta\.url/, "standalone asset base from module URL not location.href");
assert.match(srcdocLoader, /__protoCabinetEmbedSearch/, "srcdoc boot injects embed query for opaque child");
assert.match(srcdocLoader, /waitForEmbedChildContentReady/, "opaque srcdoc waits on child postMessage");
assert.match(srcdocLoader, /__protoCabinetEmbedSessionToken/, "srcdoc boot carries per-open session token");
assert.match(srcdocLoader, /__protoCabinetEmbedHash/, "srcdoc boot preserves guest hash without HTML comment");
assert.doesNotMatch(
  readFileSync(path.join(root, "partner/cabinet-standalone-srcdoc.js"), "utf8"),
  /srcdoc.*<!--#/,
  "guest hash is not appended as HTML comment",
);
assert.match(srcdocLoader, /#partner-title/, "143 content probe blocks badge-only false positive");
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /embedContentReady/,
  "host marks iframe when native standalone content is present",
);
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /if \(useSrcdoc\) syncEmbeddedPageBadge\(null\)/,
  "preview embed defers page badge until content mount",
);
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /allow-scripts allow-forms/,
  "preview srcdoc uses opaque sandbox without allow-same-origin",
);
const embedChild = readFileSync(path.join(root, "prototype-cabinet-embed.js"), "utf8");
assert.match(embedChild, /__protoCabinetEmbedParams/, "embed child reads injected search in srcdoc");
assert.match(embedChild, /embed-content-ready/, "embed child signals model readiness to opaque parent");
assert.match(embedChild, /__protoCabinetEmbedPost/, "embed child exposes tokenized post for adapters");
assert.match(embedChild, /__protoCabinetEmbedAdapterReady/, "embed child waits for adapter before ready");
assert.match(embedChild, /DOMContentLoaded/, "embed child defers ready until DOM handshake");
assert.match(
  embedChild,
  /maybeEmitChildReady[\s\S]*type: "ready"/,
  "tokenized ready is emitted only after adapter and DOM handshake",
);
assert.match(
  readFileSync(path.join(root, "partner/observer-cabinet-embed.js"), "utf8"),
  /__protoCabinetEmbedPost/,
  "142 adapter uses tokenized embed post",
);
assert.match(
  readFileSync(path.join(root, "partner/assignment-cabinet-embed.js"), "utf8"),
  /__protoCabinetEmbedAdapterReady/,
  "141 adapter signals handshake before child ready",
);
const srcdocLoaderFull = readFileSync(path.join(root, "partner/cabinet-standalone-srcdoc.js"), "utf8");
assert.match(srcdocLoaderFull, /assertActive/, "srcdoc mount checks session before iframe write");
assert.match(srcdocLoaderFull, /StandaloneSrcdocStaleError/, "stale srcdoc fetch rejects without mounting");
assert.match(srcdocLoaderFull, /String\(d\.token/, "embed ready waits for exact token match");
const embedDocBase = readFileSync(path.join(root, "partner/embed-document-base.js"), "utf8");
assert.match(embedDocBase, /document\.baseURI/, "guest embed base prefers document.baseURI over about:srcdoc");
assert.match(embedDocBase, /import\.meta\.url/, "guest embed base falls back to module directory");
for (const chunk of ["chunk-QXOSRGZH.js", "chunk-BTQ7FRMV.js", "chunk-UM77QSQJ.js", "chunk-KTYMGLZA.js"]) {
  const src = readFileSync(path.join(root, "partner", chunk), "utf8");
  assert.doesNotMatch(
    src,
    /new URL\("\.\/[^"]+\.html",\s*location\.href\)/,
    `${chunk} must not resolve guest pages against location.href`,
  );
  assert.match(src, /embed-document-base/, `${chunk} uses shared embed document base`);
}
assert.match(
  readFileSync(path.join(root, "partner/certificate-cabinet-embed.js"), "utf8"),
  /publicHtml/,
  "139 opaque embed applies host-rendered guest HTML",
);
assert.match(
  readFileSync(path.join(root, "partner/certificate-cabinet-embed.js"), "utf8"),
  /__certificateEmbedGuestHydrate/,
  "139 opaque embed calls classic guest hydration binder",
);
assert.match(
  readFileSync(path.join(root, "partner/certificate.html"), "utf8"),
  /certificate-embed-guest\.classic\.js/,
  "139 guest page loads classic interaction binder for opaque srcdoc",
);
assert.match(
  readFileSync(path.join(root, "partner/certificate.html"), "utf8"),
  /<script src="\.\/certificate-cabinet-embed\.js/,
  "139 guest page uses classic embed script for opaque srcdoc",
);
assert.doesNotMatch(
  readFileSync(path.join(root, "partner/certificate.html"), "utf8"),
  /type="module"\s+src="\.\/certificate-cabinet-embed/,
  "139 guest page must not load embed module in opaque srcdoc",
);
assert.match(
  readFileSync(path.join(root, "partner/roles.js"), "utf8"),
  /publicHtml:\s*renderCertificateGuestMain\(publicModel\)/,
  "host pre-renders 139 guest HTML before opaque embed",
);
assert.match(
  readFileSync(path.join(root, "partner/qrcode-bundle-api.js"), "utf8"),
  /qrcodeModuleRef\(\)/,
  "QR bundle invokes chunk factory before toDataURL",
);
assert.match(
  readFileSync(path.join(root, "partner/qrcode-bundle-api.js"), "utf8"),
  /cachedQrcodeApi/,
  "QR bundle initializes chunk API once",
);
assert.doesNotMatch(
  readFileSync(path.join(root, "partner/roles.js"), "utf8"),
  /certificateQrcode\.(?:toDataURL|toString)/,
  "roles.js must not call qrcode chunk factory without interop",
);
assert.match(
  readFileSync(path.join(root, "partner/certificate-view.js"), "utf8"),
  /qrcode-bundle-api/,
  "certificate card QR uses initialized bundle API",
);
assert.match(
  readFileSync(path.join(root, "prototype-cabinet-embed.js"), "utf8"),
  /isSameCertificatePartnerLink|pageN === currentN/,
  "same-page guest links do not re-navigate embed host",
);
assert.match(
  readFileSync(path.join(root, "partner/roles.js"), "utf8"),
  /ensureCabinetScreenForStandalone/,
  "proto_standalone deep link shows cabinet before embed host",
);
assert.match(
  readFileSync(path.join(root, "prototype-numbering.js"), "utf8"),
  /__protoCloseBookToc/,
  "book TOC can close on programmatic page launch",
);
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /viewportBottom - top - bottomInset/,
  "embed host height follows viewport below content column",
);
assert.match(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /reviewerDockBottomReserve/,
  "embed host reserves reviewer dock chrome",
);
assert.doesNotMatch(
  readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8"),
  /proto-page-panel\[data-open="true"\]/,
  "dock reserve must not treat open TOC popover as bottom inset",
);
assert.match(
  readFileSync(path.join(root, "partner/recommendation-cabinet-embed.js"), "utf8"),
  /publicHtml/,
  "140 opaque embed applies host-rendered recommendation HTML",
);
assert.match(
  readFileSync(path.join(root, "partner/recommendation-cabinet-embed.js"), "utf8"),
  /__recommendationEmbedGuestHydrate/,
  "140 opaque embed calls classic recommendation hydration",
);
assert.match(
  readFileSync(path.join(root, "partner/recommendation.html"), "utf8"),
  /recommendation-embed-guest\.classic\.js/,
  "140 guest page loads classic interaction binder for opaque srcdoc",
);
assert.doesNotMatch(
  readFileSync(path.join(root, "partner/recommendation.html"), "utf8"),
  /type="module"\s+src="\.\/recommendation-guest/,
  "140 opaque srcdoc must not load recommendation-guest module in embed shell",
);
assert.match(
  readFileSync(path.join(root, "partner/roles.js"), "utf8"),
  /renderRecommendationGuestMain\(publicModel\)/,
  "host pre-renders 140 guest recommendation before opaque embed",
);
assert.match(
  readFileSync(path.join(root, "prototype-numbering.js"), "utf8"),
  /n:\s*140[\s\S]*cabinetEmbed:\s*true/,
  "TOC 140 routes through cabinet embed host",
);
assert.match(
  readFileSync(path.join(root, "partner/roles.js"), "utf8"),
  /observerHtml:\s*model\s*\?\s*renderObserverGuestMain\(model\)/,
  "host pre-renders 142 guest HTML for opaque embed",
);
assert.match(
  readFileSync(path.join(root, "partner/observer-cabinet-embed.js"), "utf8"),
  /observerHtml/,
  "142 opaque embed applies host-rendered observer HTML",
);
assert.match(
  readFileSync(path.join(root, "partner/assignment-cabinet-embed.js"), "utf8"),
  /assignmentHtml/,
  "141 opaque embed applies host-rendered assignment HTML",
);
assert.match(readFileSync(path.join(root, "partner/observer-guest.js"), "utf8"), /__protoCabinetEffectiveHash/, "142 guest uses effective hash");
assert.match(readFileSync(path.join(root, "partner/assignment-guest.js"), "utf8"), /__protoCabinetEffectiveHash/, "141 guest uses effective hash");
assert.doesNotMatch(
  embedChild,
  /scheduleGuestRootReadyProbe[\s\S]{0,400}141[\s\S]{0,80}142/,
  "embed child must not auto-ready 141/142 from empty root",
);
const hostJs = readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8");
assert.match(hostJs, /abortPendingSrcdocWork/, "host cancels in-flight srcdoc work on close/reopen");
assert.match(hostJs, /assertSrcdocSessionActive/, "host ties srcdoc load to open generation and token");
assert.match(hostJs, /srcdocLoadGeneration/, "stale srcdoc generation guard");
assert.match(hostJs, /observeEmbedReadyAbort/, "srcdoc readiness abort observed immediately");
assert.match(hostJs, /setEmbedLoadState/, "host shows in-portal load and stall states");
assert.match(hostJs, /proto-embed-retry/, "host can retry embed load without closing cabinet");
assert.match(hostJs, /startContextPulse/, "host resends context until content-ready");
assert.doesNotMatch(
  readFileSync(path.join(root, "partner/partner-cooperation-detail-embed.js"), "utf8"),
  /DOMContentLoaded[\s\S]*signalCoopEmbedReady/,
  "143 must not claim content-ready before host context",
);
assert.match(
  readFileSync(path.join(root, "partner/partner-cooperation-detail-embed.js"), "utf8"),
  /mountPanelMode\(\);[\s\S]*__protoCabinetEmbedAdapterReady/,
  "143 mounts embed panel before adapter handshake",
);
assert.match(embedChild, /__protoCabinetEffectiveHash/, "embed child exposes effective guest hash in srcdoc");
assert.match(readFileSync(path.join(root, "partner/partner-purchase-detail.js"), "utf8"), /__protoCabinetEmbedParams/, "144 reads injected embed params in srcdoc");
assert.match(readFileSync(path.join(root, "partner/partner-purchase-detail-embed.js"), "utf8"), /__protoCabinetEmbedParams/, "144 embed module reads injected params");
assert.match(embedChild, /replace:/, "embed child posts replace nav");
const embedRole = readFileSync(path.join(root, "standalone-embed-role.js"), "utf8");
assert.match(embedRole, /scanSaleRelockScheduled/, "146 sale guard coalesces relock rAF");
assert.match(embedRole, /if \(el\.disabled !== true\)/, "146 sale lock writes are idempotent");
const walletHistory = readFileSync(path.join(root, "partner/partner-wallet-history.js"), "utf8");
assert.match(walletHistory, /data-proto-embed-ignore/, "147 purchase anchor ignored by generic embed nav");
assert.match(walletHistory, /data-purchase-embed="\$\{index\}"/, "147 routes every purchase row to 144 embed");
assert.doesNotMatch(roles, /crypto\.randomUUID/, "roles uses demoRandomId in non-secure embed");
assert.match(roles, /demoRandomId\(\)/, "roles wires prototype demo id fallback");
const certView = readFileSync(path.join(root, "partner/certificate-view.js"), "utf8");
assert.doesNotMatch(certView, /crypto\.randomUUID/, "certificate-view avoids secure-context-only API");
assert.match(certView, /demoRandomToken/, "certificate display code uses demo token helper");
assert.match(
  readFileSync(path.join(root, "partner/demo-random-id.js"), "utf8"),
  /randomHexByteCount/,
  "demo ids use hex entropy not uuid zero-prefix slicing",
);
assert.doesNotMatch(
  walletHistory,
  /linkedPurchase=isPurchase&&index===0/,
  "147 must not hard-wire only the first purchase to 144",
);
assert.match(roles, /collection-partner-open/, "143 partners list has visible card open action");
assert.match(
  walletHistory,
  /hasRewardSnapshot:\s*hasSavedReward/,
  "147 accrualReceiptCtx marks saved wallet reward snapshot",
);
const purchaseDetail = readFileSync(path.join(root, "partner/partner-purchase-detail.js"), "utf8");
assert.match(purchaseDetail, /__protoCabinetEmbedBack/, "144 history uses embed back to 147");
assert.match(purchaseDetail, /replace:\s*true/, "144 document ops replace-navigate to 147");
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

const demoRandomTest = spawnSync(process.execPath, ["demo-random-id.test.mjs"], {
  cwd: path.join(root, "partner"),
  encoding: "utf8",
});
assert.equal(
  demoRandomTest.status,
  0,
  `demo-random-id.test.mjs failed:\n${demoRandomTest.stderr || demoRandomTest.stdout}`,
);

console.log("prototype-cabinet-integration.mjs: ok");
