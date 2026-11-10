import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/lib/settlements-loader",
        replacement: path.resolve(__dirname, "mocks/settlements-loader.ts"),
      },
      {
        find: "@/lib/auth-session",
        replacement: path.resolve(__dirname, "mocks/auth-session.ts"),
      },
      {
        find: "@/lib/agent-r05/api",
        replacement: path.resolve(__dirname, "mocks/agent-r05-api.ts"),
      },
      {
        find: "@/lib/agent-r05/receivables-prefs",
        replacement: path.resolve(__dirname, "mocks/receivables-prefs.ts"),
      },
      { find: "next/link", replacement: path.resolve(__dirname, "stubs/next-link.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "../../src") },
    ],
  },
  server: { host: "127.0.0.1", port: 5211, strictPort: true },
});