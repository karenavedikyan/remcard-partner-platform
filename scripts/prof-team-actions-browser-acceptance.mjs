#!/usr/bin/env node
/**
 * Team actions + invite sharing — synthetic E2E (UI-only mutations).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3010";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3011";

let fixtures = null;
const report = {
  generatedAt: new Date().toISOString(),
  profBase: PROF,
  navBase: NAV,
  fixtures: null,
  scenarios: {},
  accessProof: {},
  exitCode: 0,
};

function navExec(script) {
  return execSync(`cd /agent/repos/remcard-navigator && pnpm exec tsx -e ${JSON.stringify(script)}`, {
    encoding: "utf8",
    env: { ...process.env },
  }).trim();
}

function mintToken(userId, tokenVersion) {
  return navExec(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', ${tokenVersion}));`,
  );
}

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/prof-team-actions-${name}.png`, fullPage: true });
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  if (overflow) throw new Error("horizontal overflow detected");
}

async function run(name, fn) {
  try {
    await fn();
    report.scenarios[name] = "PASS";
  } catch (e) {
    report.scenarios[name] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    report.exitCode = 1;
  }
}

async function assertTeamCapabilities(ownerToken) {
  const res = await fetch(`${PROF}/api/remcard/api/pro/context`, {
    headers: { cookie: `remcard-token=${ownerToken}` },
  });
  if (res.status !== 200) {
    throw new Error(`pro/context HTTP ${res.status} (expected 200)`);
  }
  const json = await res.json();
  if (json.teamCapabilities?.canOpenTeamSection !== true) {
    throw new Error("teamCapabilities.canOpenTeamSection !== true");
  }
}

async function employeeContextStatus(token) {
  const res = await fetch(`${PROF}/api/remcard/api/pro/context`, {
    headers: { cookie: `remcard-token=${token}` },
  });
  let body = null;
  let raw = "";
  try {
    raw = await res.text();
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body, raw };
}

async function employeeBranchContextPatch(token, branchId) {
  const res = await fetch(`${PROF}/api/remcard/api/pro/context`, {
    method: "PATCH",
    headers: {
      cookie: `remcard-token=${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ branchId }),
  });
  return { status: res.status };
}

function readBranchEmployeeFlag(employeeBranchRowId, field) {
  return navExec(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {prisma} from './src/lib/prisma'; (async()=>{const r=await prisma.branchEmployee.findUnique({where:{id:'${employeeBranchRowId}'},select:{${field}:true}}); if(!r) throw new Error('missing row'); process.stdout.write(String(r.${field}));})();`,
  );
}

async function openTeam(page) {
  const overviewReady = page.waitForResponse(
    (r) => r.url().includes("/employees-overview") && r.status() === 200,
    { timeout: 120_000 },
  );
  await page.goto(`${PROF}/profile?section=team`, { waitUntil: "networkidle", timeout: 120_000 });
  await overviewReady;
  await page.getByTestId("team-section-root").waitFor({ timeout: 45_000 });
}

async function openEmployeeEditor(page, employeeUserId) {
  await page.getByTestId("team-view-people").click();
  await page.waitForFunction(
    (uid) => Boolean(document.querySelector(`[data-testid="person-${uid}"]`)),
    employeeUserId,
    { timeout: 60_000 },
  );
  await page
    .getByRole("button", { name: /Настроить доступ: Team Actions Employee/i })
    .click();
  await page.getByRole("dialog", { name: "Настроить доступ" }).waitFor({ timeout: 30_000 });
}

async function main() {
  fixtures = JSON.parse(
    execSync("cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/prof-team-actions-browser-fixtures.ts seed", {
      encoding: "utf8",
      env: { ...process.env },
    }).trim(),
  );
  report.fixtures = {
    tag: fixtures.tag,
    ownerId: fixtures.ownerId,
    employeeId: fixtures.employeeId,
    employeePublicId: fixtures.employeePublicId,
    branchAId: fixtures.branchAId,
    branchBId: fixtures.branchBId,
  };

  const ownerToken = mintToken(fixtures.ownerId, fixtures.ownerTokenVersion);
  const employeeToken = mintToken(fixtures.employeeId, fixtures.employeeTokenVersion);

  try {
    const browser = await chromium.launch({ headless: true });

    await run("precondition_team_capabilities", async () => {
      await assertTeamCapabilities(ownerToken);
    });

    await run("employee_pre_access_200", async () => {
      const pre = await employeeContextStatus(employeeToken);
      report.accessProof.pre = { status: pre.status, branchCount: pre.body?.branches?.length ?? 0 };
      if (pre.status !== 200) throw new Error(`expected 200 before removal, got ${pre.status}`);
      const ids = (pre.body?.branches ?? []).map((b) => b.id);
      if (!ids.includes(fixtures.branchAId)) {
        throw new Error("employee lost branch A before scenario");
      }
    });

    let clipboardText = "";
    await run("create_copy_reload_1440_light", async () => {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
      });
      await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
      const page = await ctx.newPage();
      await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
      await openTeam(page);
      await page.getByTestId("team-open-invite-wizard").click();
      await page.getByRole("dialog", { name: "Пригласить сотрудника" }).waitFor({ timeout: 30_000 });
      await page.getByLabel("Имя сотрудника").fill("Кандидат синтетический");
      await page.getByTestId("team-wizard-next").click();
      await page.getByTestId(`team-invite-branch-${fixtures.branchAId}`).check();
      await page.getByTestId("team-wizard-next").click();
      await page.getByTestId("team-invite-confirm").check();
      await page.getByTestId("team-wizard-submit").click();
      await page.getByTestId("team-invite-share").waitFor({ timeout: 45_000 });
      await page.getByTestId("team-copy-invite-message").click();
      await page.getByText("Приглашение скопировано").waitFor({ timeout: 10_000 });
      clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      if (!clipboardText.includes("/invite/accept")) {
        throw new Error("clipboard missing invite accept URL");
      }
      if (!clipboardText.startsWith("Здравствуйте!")) {
        throw new Error("clipboard greeting must stay neutral without givenName");
      }
      await page.reload({ waitUntil: "networkidle" });
      await page.getByTestId("team-view-invites").click();
      await page.getByTestId(`team-copy-invite-link`).waitFor({ timeout: 20_000 });
      await assertNoHorizontalOverflow(page);
      await shot(page, "create-copy-reload-1440-light");
      await ctx.close();
    });

    await run("edit_permissions_save_1440", async () => {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
      });
      const page = await ctx.newPage();
      await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
      await openTeam(page);
      await openEmployeeEditor(page, fixtures.employeeId);
      const teamPerm = page.getByTestId("team-perm-team");
      const teamWasChecked = await teamPerm.isChecked();
      if (teamWasChecked) await teamPerm.uncheck();
      await teamPerm.check();
      await page.getByTestId("team-member-wizard-next").click();
      await page.getByTestId("team-member-wizard-next").click();
      await page.getByTestId("team-member-confirm").check();
      const saveBtn = page.getByTestId("team-member-save");
      await saveBtn.waitFor({ state: "visible", timeout: 15_000 });
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="team-member-save"]');
          return el && !el.hasAttribute("disabled");
        },
        { timeout: 15_000 },
      );
      const saveResp = page.waitForResponse(
        (r) =>
          r.url().includes("team-members") &&
          r.url().includes(fixtures.employeeId) &&
          r.request().method() === "PATCH" &&
          r.status() === 200,
        { timeout: 60_000 },
      );
      await saveBtn.click();
      await saveResp;
      const canManage = readBranchEmployeeFlag(fixtures.employeeBranchAEmployeeId, "canManageEmployees");
      if (canManage !== "true") {
        throw new Error(`server canManageEmployees expected true, got ${canManage}`);
      }
      report.accessProof.permissionsSaved = { canManageEmployees: canManage === "true" };
      await page.reload({ waitUntil: "networkidle" });
      await openEmployeeEditor(page, fixtures.employeeId);
      await page.getByTestId("team-perm-team").waitFor({ state: "visible" });
      if (!(await page.getByTestId("team-perm-team").isChecked())) {
        throw new Error("canManageEmployees not persisted after reload");
      }
      await page.keyboard.press("Escape");
      await assertNoHorizontalOverflow(page);
      await shot(page, "edit-permissions-1440");
      await ctx.close();
    });

    await run("owner_delete_sole_manager_confirm_flow", async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
      await openTeam(page);
      await openEmployeeEditor(page, fixtures.employeeId);
      let deleteSent = false;
      page.on("request", (req) => {
        if (req.method() === "DELETE" && req.url().includes(`/team-members/${fixtures.employeeId}`)) {
          deleteSent = true;
        }
      });
      await page.getByTestId("team-member-remove-from-team").click();
      await page.getByRole("heading", { name: "Удалить из команды" }).waitFor({ timeout: 10_000 });
      await page.getByText(/останется без управляющего/i).waitFor({ timeout: 10_000 });
      await page.getByRole("button", { name: "Отмена" }).click();
      await page.waitForTimeout(500);
      if (deleteSent) throw new Error("DELETE sent after cancel");
      await page.getByTestId("team-member-remove-from-team").click();
      const delResp = page.waitForResponse(
        (r) =>
          r.url().includes(`/team-members/${fixtures.employeeId}`) &&
          r.request().method() === "DELETE" &&
          r.status() === 200,
        { timeout: 45_000 },
      );
      await page.getByTestId("team-member-remove-confirm").click();
      await delResp;
      await page.getByText(/удалён/i).waitFor({ timeout: 20_000 });
      await page.reload({ waitUntil: "networkidle" });
      await page.getByTestId("team-section-root").waitFor();
      if (await page.getByTestId(`person-${fixtures.employeeId}`).count()) {
        throw new Error("removed employee row still visible after reload");
      }
      await ctx.close();
    });

    await run("layout_390_dark_no_overflow", async () => {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: "dark",
      });
      const page = await ctx.newPage();
      await ctx.addCookies([{ name: "remcard-token", value: ownerToken, url: PROF }]);
      await openTeam(page);
      await assertNoHorizontalOverflow(page);
      await shot(page, "layout-390-dark");
      await ctx.close();
    });

    await run("employee_post_access_forbidden_same_token", async () => {
      const post = await employeeContextStatus(employeeToken);
      const patch = await employeeBranchContextPatch(employeeToken, fixtures.branchAId);
      report.accessProof.post = {
        contextGetStatus: post.status,
        contextPatchStatus: patch.status,
        errorCode: post.body?.errorCode ?? null,
      };
      if (post.status !== 403 || patch.status !== 403) {
        throw new Error(
          `expected 403 on context GET/PATCH after removal, got GET ${post.status} PATCH ${patch.status}`,
        );
      }
      if (post.body?.errorCode !== "CABINET_NOT_READY") {
        throw new Error(`expected CABINET_NOT_READY denial, got ${post.raw?.slice(0, 180) ?? ""}`);
      }
    });

    await browser.close();
  } finally {
    execSync(
      `cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/prof-team-actions-browser-fixtures.ts cleanup ${fixtures.tag}`,
      { stdio: "inherit", env: { ...process.env } },
    );
  }

  writeFileSync(join(outDir, "prof-team-actions-browser-report.json"), JSON.stringify(report, null, 2));
  process.exit(report.exitCode);
}

main().catch((e) => {
  report.scenarios.fatal = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  report.exitCode = 1;
  writeFileSync(join(outDir, "prof-team-actions-browser-report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
