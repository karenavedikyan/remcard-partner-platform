import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: [
      { find: "next/link", replacement: path.resolve(__dirname, "../partner-row-actions-visual-harness/stubs/next-link.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "../../src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5207,
    strictPort: true,
  },
});
