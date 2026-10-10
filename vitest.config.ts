import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.tsx",
      "src/lib/profile-sections.test.ts",
      "src/lib/profile-draft-sync.test.ts",
      "src/lib/profile-working-areas.test.ts",
      "src/lib/partnership-search-ui.test.ts",
      "src/lib/master-direction-label.test.ts",
      "src/lib/profile-overview-display.test.tsx",
      "src/lib/profile-working-save.test.ts",
      "src/lib/working-profile-patch.test.ts",
      "src/lib/branch-working-hours.test.ts",
      "src/lib/branch-catalog-preview.test.ts",
      "src/lib/profile-branch-save.test.ts",
      "src/lib/yandex-address-geocoder.test.ts",
      "src/components/profile/ProfileDirectionsPicker.test.tsx",
      "src/lib/prof-notifications.test.ts",
    ],
    testTimeout: 30_000,
  },
});
