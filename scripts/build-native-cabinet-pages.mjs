import fs from "node:fs";
import path from "node:path";

// Mechanical packaging of the accepted view sources, not a second data model.
// No runtime fetch, eval, new Function, external fonts or cross-frame handshake.
// Workspace: node build-native-cabinet-pages.mjs
// Repository: node scripts/build-native-cabinet-pages.mjs design/general-prototype
const root = path.resolve(process.argv[2] || "general-preview");
const pages = {
  143: ["partner-cooperation-detail", ["partner-cooperation-detail"], ["partner-cooperation-detail-embed", "partner-cooperation-detail"]],
  144: ["partner-purchase-detail", ["partner-cooperation-detail", "partner-purchase-detail-minimal", "partner-purchase-detail-focus"], ["partner-purchase-detail-embed", "partner-purchase-detail"]],
  145: ["partner-reward-receipt", ["partner-reward-receipt"], ["partner-reward-receipt-embed", "partner-reward-receipt"]],
  146: ["partner-scan-transaction", ["partner-scan-transaction"], ["partner-scan-transaction"]],
  147: ["partner-wallet-history", ["partner-wallet-history"], ["partner-wallet-history"]],
};
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const cssScope = css => css.replace(/:root\b/g, ".native-document")
  .replace(/(?<![-\w.#])html(?=[\s.{:#[])/g, ".native-document")
  // Match element selectors only, never .pst-body / .pst-review-body.
  .replace(/(?<![-\w.#])body\b/g, ".native-body");
let output = "// Generated from accepted standalone sources by build-native-cabinet-pages.mjs.\n";
output += "function installRole(document, window, location, parent, matchMedia, MutationObserver, requestAnimationFrame) {\n" + read("standalone-embed-role.js") + "\n}\n";
output += "export const NATIVE_PAGES = {\n";
for (const [n, [name, styles, scripts]] of Object.entries(pages)) {
  const html = read(`partner/${name}.html`).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const body = html.match(/<body\b([^>]*)>([\s\S]*)<\/body>/i);
  if (!body) throw new Error(`Missing body ${name}`);
  const bodyClass = body[1].match(/class="([^"]*)"/)?.[1] || "";
  const css = cssScope(styles.map(s => read(`partner/${s}.css`)).join("\n") + "\n" + read("prototype-cabinet-embed.css"));
  output += `${n}: {bodyClass:${JSON.stringify(bodyClass)},html:${JSON.stringify(body[2])},css:${JSON.stringify(css)},install(document,window,location,parent,matchMedia,runtime){\ninstallRole(document,window,location,parent,matchMedia,runtime.MutationObserver,runtime.requestAnimationFrame);\n`;
  for (const script of scripts) output += `{\n${read(`partner/${script}.js`)}\n}\n`;
  output += "}},\n";
}
output += "};\n";
fs.writeFileSync(path.join(root, "partner/cabinet-native-pages.generated.js"), output);
console.log("Packaged native cabinet views: " + Object.keys(pages).join(", "));
