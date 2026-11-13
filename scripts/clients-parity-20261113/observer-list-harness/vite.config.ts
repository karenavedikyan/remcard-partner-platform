import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const harnessRoot = path.resolve(__dirname);
const repoRoot = path.resolve(harnessRoot, "../../..");

export default defineConfig({
  root: harnessRoot,
  plugins: [react()],
  resolve: {
    alias: [
      { find: "next/link", replacement: path.resolve(harnessRoot, "stubs/next-link.tsx") },
      { find: "@", replacement: path.resolve(repoRoot, "src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5377,
    strictPort: false,
  },
});
