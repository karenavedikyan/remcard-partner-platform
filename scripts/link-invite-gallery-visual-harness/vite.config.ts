import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
    },
  },
  define: {
    "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify("http://127.0.0.1:4312"),
    "process.env.REMCARD_API_BASE_URL": JSON.stringify("http://127.0.0.1:4312"),
  },
  server: {
    host: "127.0.0.1",
    port: 5215,
  },
});