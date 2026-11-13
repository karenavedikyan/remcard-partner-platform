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
      path.join(repoRoot, "src/components/clients/observer/P7.observer-detail-views.test.ts"),
      path.join(repoRoot, "src/components/clients/observer/P7.observer-paired-residual.test.ts"),
      path.join(repoRoot, "src/components/clients/observer/P7.observer-prototype-source-fixes.test.ts"),
      path.join(repoRoot, "src/components/clients/receiving/P7.receiving-prototype-layout.test.ts"),
    ],
  },
  resolve: {
    alias: {
      "@": path.join(repoRoot, "src"),
    },
  },
});
