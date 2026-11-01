import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const platRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

export default defineConfig({
  plugins: [react()],
  root: platRoot,
  resolve: {
    alias: {
      "@": path.join(platRoot, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.join(platRoot, "vitest.setup.ts")],
    include: [
      "src/app/admin/moderation/ModerationPreview.a14a-presentation.test.tsx",
      "src/app/admin/moderation/AdminModerationA4aPresentation.test.tsx",
      "src/app/admin/moderation/AdminModerationA4bPresentation.test.tsx",
      "src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.a5c-presentation.test.tsx",
      "src/app/admin/moderation/partners/[id]/PartnerModerationDetail.a5a-presentation.test.tsx",
      "src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.a5b-presentation.test.tsx",
    ],
    testTimeout: 30_000,
  },
});
