import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../.."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "../../../../vitest.setup.ts")],
    include: [path.join(__dirname, "**/*.test.ts"), path.join(__dirname, "**/*.test.tsx")],
  },
});
