import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/lib/api-client", replacement: path.resolve(__dirname, "mocks/api-client.ts") },
      { find: "@/lib/prof-admin-management-api", replacement: path.resolve(__dirname, "mocks/management-api.ts") },
      { find: "@/lib/prof-admin-partners-api", replacement: path.resolve(__dirname, "mocks/partners-api.ts") },
      { find: "@/lib/prof-admin-moderation-api", replacement: path.resolve(__dirname, "mocks/moderation-api.ts") },
      { find: "@/lib/prof-admin-notifications-api", replacement: path.resolve(__dirname, "mocks/notifications-api.ts") },
      { find: "@/lib/prof-admin-api", replacement: path.resolve(__dirname, "mocks/prof-admin-api.ts") },
      { find: "next/link", replacement: path.resolve(__dirname, "stubs/next-link.tsx") },
      { find: "next/navigation", replacement: path.resolve(__dirname, "stubs/next-navigation.tsx") },
      { find: "@", replacement: path.resolve(__dirname, "../../src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5199,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5199,
    strictPort: true,
  },
});
