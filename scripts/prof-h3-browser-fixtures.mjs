import { execSync } from "node:child_process";

execSync(
  "cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/prof-h3-browser-fixtures.ts",
  { stdio: "inherit" },
);
