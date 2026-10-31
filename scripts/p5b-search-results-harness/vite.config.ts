import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: [
      { find: "next/link", replacement: path.resolve(__dirname, "stubs/next-link.tsx") },
      {
        find: "next/navigation",
        replacement: path.resolve(__dirname, "stubs/next-navigation.ts"),
      },
      {
        find: "@/lib/api-client",
        replacement: path.resolve(__dirname, "stubs/api-client.ts"),
      },
      {
        find: "@/lib/partner-taxonomy",
        replacement: path.resolve(__dirname, "stubs/partner-taxonomy.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "../../src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5261,
    strictPort: true,
  },
});
