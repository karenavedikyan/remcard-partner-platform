/**
 * Shared helpers for PROF-D link-invite browser scenarios.
 */

export const BASE = process.env.M4D_PARTNER_URL ?? "http://127.0.0.1:3000";
export const NAV_BASE = process.env.M4D_NAVIGATOR_URL ?? "http://127.0.0.1:3001";
export const CLIENT_USER_ID = "m1fix-client-000000000001";
export const STORE_USER_ID = "m1fix-store-000000000001";
export const PRO_MASTER_ID = "m2fix-master-search-0001";

export async function enterCode(page, code) {
  const input = page.getByRole("textbox", { name: /код из сообщения/i });
  await input.waitFor({ timeout: 15000 });
  await input.fill(code);
  await page.getByRole("button", { name: /^продолжить$/i }).click();
}

export async function acceptLoginConsents(page) {
  const consentsTitle = page.getByRole("heading", { name: /обязательные соглашения/i });
  const visible = await consentsTitle
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;
  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).check();
  }
  await page.getByRole("button", { name: /^продолжить$/i }).click();
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Сохраняем…"),
      undefined,
      { timeout: 20000 },
    )
    .catch(() => {});
}

export async function fillMasterOnboarding(page) {
  await page.getByText(/регистрация партнёра/i).waitFor({ timeout: 30000 });
  await page
    .waitForFunction(
      () =>
        !document.body.textContent?.includes("Проверяем…") &&
        !document.body.textContent?.includes("Загружаем"),
      undefined,
      { timeout: 60000 },
    )
    .catch(() => {});

  const retryReadiness = page.getByRole("button", { name: /повторить проверку/i });
  if (await retryReadiness.count()) {
    await retryReadiness.first().click();
    await page
      .waitForFunction(
        () => !document.body.textContent?.includes("Проверяем…"),
        undefined,
        { timeout: 60000 },
      )
      .catch(() => {});
  }

  await page.locator('input[type="radio"][value="MASTER"]').check();
  await page.getByLabel(/город работы/i).fill("Краснодар");
  await page.getByText(/специализации/i).waitFor({ timeout: 30000 });

  const allStagesRow = page.locator("label").filter({ hasText: /все этапы строительства/i });
  await allStagesRow.waitFor({ timeout: 30000 });
  await allStagesRow.locator('input[type="checkbox"]').check();

  const offer = page
    .locator("label")
    .filter({ hasText: /публичную оферту/i })
    .locator('input[type="checkbox"]');
  if (await offer.count()) {
    await offer.first().check();
  }

  await page.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll("button[type='submit']")].find((b) =>
        /^продолжить$/i.test(b.textContent?.trim() ?? ""),
      );
      return btn && !btn.disabled;
    },
    undefined,
    { timeout: 90000 },
  );
}

export async function createStoreLinkInvite(page, shot) {
  await page.goto("/login");
  const storeCode = process.env.M4D_STORE_CODE;
  if (!storeCode) throw new Error("M4D_STORE_CODE required");
  await enterCode(page, storeCode);
  await acceptLoginConsents(page);
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });

  await page.goto("/partners");
  await page.getByRole("tab", { name: /пригласить по ссылке/i }).click();

  const percentInputs = page.getByLabel(/общий процент/i);
  if (await percentInputs.count()) {
    await percentInputs.first().fill("12");
  }
  const excludeLabels = page.locator("label").filter({ hasText: /^исключить$/i });
  const excludeCount = await excludeLabels.count();
  for (let i = 1; i < excludeCount; i += 1) {
    await excludeLabels.nth(i).locator('input[type="checkbox"]').check();
  }

  await page.getByRole("button", { name: /^создать ссылку$/i }).click();
  await page.getByText(/ссылка создана/i).waitFor({ timeout: 15000 });
  if (shot) await shot(page, "01_link_created");

  const linkField = page.getByLabel(/^ссылка$/i);
  return linkField.inputValue();
}

/** Standard moderation approve via navigator admin API (staff session + staging basic auth). */
export async function approvePartnerViaModerationApi(page, staffCode, userId) {
  await page.goto("/login");
  await enterCode(page, staffCode);
  await acceptLoginConsents(page);
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });

  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const basicUser = process.env.REMCARD_API_BASIC_USER ?? "m1test";
  const basicPass = process.env.REMCARD_API_BASIC_PASSWORD ?? "";
  const auth =
    basicPass.length > 0
      ? `Basic ${Buffer.from(`${basicUser}:${basicPass}`).toString("base64")}`
      : undefined;

  const resp = await page.request.post(
    `${NAV_BASE}/api/admin/moderation/partners/${userId}/approve`,
    {
      headers: {
        cookie: cookieHeader,
        ...(auth ? { authorization: auth } : {}),
      },
    },
  );
  if (!resp.ok()) {
    throw new Error(`Moderation approve failed: ${resp.status()} ${await resp.text()}`);
  }
}

export async function registerClientThroughOnboarding(page, clientCode, invitePath) {
  await page.goto(`/login?returnTo=${encodeURIComponent(invitePath)}`);
  await enterCode(page, clientCode);
  await acceptLoginConsents(page);

  await page.waitForFunction(
    () =>
      window.location.pathname.includes("/onboarding") ||
      window.location.pathname.includes("/invite/"),
    undefined,
    { timeout: 30000 },
  );

  if (page.url().includes("/onboarding")) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await fillMasterOnboarding(page);
        break;
      } catch (error) {
        if (attempt === 1) throw error;
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    }
    await page.getByRole("button", { name: /^продолжить$/i }).click();
  }

  await page.waitForURL((url) => !url.pathname.includes("/onboarding"), { timeout: 45000 });

  if (!page.url().includes("/invite/")) {
    await page.goto(invitePath);
  }

  await page.getByText(/отправьте профиль на проверку/i).waitFor({ timeout: 30000 });
}

/** Submit profile for moderation via invite landing (same API as ProfileEditor). */
export async function submitProfileForModerationViaInvite(page) {
  await page.getByRole("button", { name: /^отправить на проверку$/i }).click();
  await page.getByText(/профиль ожидает проверки/i).waitFor({ timeout: 15000 });
}
