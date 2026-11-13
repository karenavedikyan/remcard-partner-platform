import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(__dirname, "../../..");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [path.join(repoRoot, "vitest.setup.ts")],
    include: [
      path.join(repoRoot, "src/components/clients/observer/P7.*.test.ts"),
      path.join(repoRoot, "src/components/clients/receiving/P7.*.test.ts"),
    ],
  },
  resolve: {
    alias: {
      "@": path.join(repoRoot, "src"),
    },
  },
});
