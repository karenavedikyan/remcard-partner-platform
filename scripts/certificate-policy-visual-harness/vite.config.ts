import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const harnessRoot = path.resolve(__dirname);
/** Patched platform root: `scripts/certificate-policy-visual-harness` → repo `src/`. */
const platformSrc = path.resolve(harnessRoot, "../../src");

const appliedGlobals = path.join(platformSrc, "app/globals.css");
const globalsCss = fs.existsSync(appliedGlobals)
  ? appliedGlobals
  : path.join(harnessRoot, "shims/globals.css");

export default defineConfig({
  root: harnessRoot,
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/lib/certificate-policy/api",
        replacement: path.join(harnessRoot, "mocks/certificate-policy-api.ts"),
      },
      {
        find: "@/lib/partner-certificate-program",
        replacement: path.join(harnessRoot, "mocks/partner-certificate-program.ts"),
      },
      {
        find: "@/lib/api-client",
        replacement: path.join(harnessRoot, "mocks/api-client.ts"),
      },
      { find: "next/link", replacement: path.join(harnessRoot, "stubs/next-link.tsx") },
      { find: "next/navigation", replacement: path.join(harnessRoot, "stubs/next-navigation.tsx") },
      { find: "@/app/globals.css", replacement: globalsCss },
      { find: "@", replacement: platformSrc },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5207,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5207,
    strictPort: true,
  },
});