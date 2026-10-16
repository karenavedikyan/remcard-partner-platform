import { PARITY_MATCH } from './r03-parity-fixture.mjs';
import { PARITY_AGENT_DISPLAY_NAME } from './r03-parity-agent.mjs';

export function parityCertCardLocator(page, certId) {
  if (certId) {
    return page.locator(`[data-testid="agent-cert-card-shell"][data-parity-cert-id="${certId}"]`);
  }
  return page
    .locator('[data-testid="agent-cert-card-shell"]')
    .filter({ hasText: PARITY_MATCH.certAlias });
}

export function parityClientMobileRowLocator(page, clientId) {
  if (clientId) {
    return page.locator(`[data-testid="agent-client-mobile-row"][data-parity-client-id="${clientId}"]`);
  }
  return page
    .locator('[data-testid="agent-client-mobile-row"]')
    .filter({ hasText: PARITY_MATCH.client.displayName });
}

export function parityClientDesktopRowLocator(page, clientId) {
  if (clientId) {
    return page.locator(`tr[data-parity-client-id="${clientId}"]`);
  }
  return page.locator('tbody tr').filter({ hasText: PARITY_MATCH.client.displayName }).first();
}

export async function assertImplMatchedCertificate(page, parity) {
  let card = parityCertCardLocator(page, parity?.certId);
  if ((await card.count()) === 0 && parity?.certId) {
    card = parityCertCardLocator(page, null);
  }
  await card.first().waitFor({ state: 'visible', timeout: 45_000 });
  if ((await card.count()) !== 1) {
    throw new Error(`parity_cert_count:${await card.count()}`);
  }
  const text = (await card.innerText()).replace(/\s+/g, ' ');
  if (!text.includes(PARITY_MATCH.certAlias)) throw new Error('parity_cert_title');
  if (!text.includes('Дом материалов')) throw new Error('parity_cert_partner');
  if (!text.includes('Есть покупки')) throw new Error('parity_cert_purchase');
  if (!text.includes(PARITY_AGENT_DISPLAY_NAME) && !text.includes('От ')) {
    throw new Error('parity_cert_issuer');
  }
  const badge = card.locator('[class*="badgeCount"]');
  if ((await badge.count()) > 0) {
    const countText = (await badge.first().innerText()).trim();
    if (countText !== '2') throw new Error(`parity_cert_categories:${countText}`);
  } else {
    throw new Error('parity_cert_terms_missing');
  }
}

export async function assertImplMatchedClient(page, parity, viewMode, width) {
  const isMobile = width <= 680;
  const row = isMobile
    ? parityClientMobileRowLocator(page, parity?.clientId)
    : parityClientDesktopRowLocator(page, parity?.clientId);
  await row.waitFor({ state: 'visible', timeout: 30_000 });
  if ((await row.count()) !== 1) throw new Error(`parity_client_count:${await row.count()}`);
  const text = (await row.innerText()).replace(/\s+/g, ' ');
  if (!text.includes(PARITY_MATCH.client.displayName)) throw new Error('parity_client_name');
  if (!text.includes(PARITY_MATCH.client.note)) throw new Error('parity_client_task');
  if (isMobile && !text.includes('Краснодар')) throw new Error('parity_client_city');
  if (!text.includes('1 сертификат')) throw new Error('parity_client_cert_count');
  if (!text.includes('Есть покупки')) throw new Error('parity_client_purchase');
}

export async function assertRefMatchedCertificate(page) {
  const card = page
    .locator('.collection-card-shell, .link-card.remcard-certificate')
    .filter({ hasText: PARITY_MATCH.certAlias })
    .first();
  await card.waitFor({ state: 'visible', timeout: 20_000 });
  const text = (await card.innerText()).replace(/\s+/g, ' ');
  if (!text.includes('Дом материалов')) throw new Error('ref_parity_cert_partner');
  if (!text.includes('Есть покупки')) throw new Error('ref_parity_cert_purchase');
}

export async function assertRefMatchedClient(page) {
  const row = page.locator('.collection-table tbody tr').filter({ hasText: PARITY_MATCH.client.displayName }).first();
  await row.waitFor({ state: 'visible', timeout: 20_000 });
  const text = (await row.innerText()).replace(/\s+/g, ' ');
  if (!text.includes('Ремонт квартиры')) throw new Error('ref_parity_client_task');
  if (!text.includes('Есть покупки')) throw new Error('ref_parity_client_purchase');
}

export async function measureCertCardShellClip(page, certId) {
  return page.evaluate((id) => {
    const shell = id
      ? document.querySelector(
          `[data-testid="agent-cert-card-shell"][data-parity-cert-id="${CSS.escape(id)}"]`,
        )
      : document.querySelector('[data-testid="agent-cert-card-shell"]');
    if (!shell) return { ok: false, reason: 'shell_missing' };

    const shellRect = shell.getBoundingClientRect();
    const shellStyle = getComputedStyle(shell);
    const padL = Number.parseFloat(shellStyle.paddingLeft) || 0;
    const padR = Number.parseFloat(shellStyle.paddingRight) || 0;
    const tol = 0.5;
    const shellLeft = shellRect.left + padL;
    const shellRight = shellRect.right - padR;

    const clippedParts = [];
    const measure = (label, el) => {
      if (!el) {
        clippedParts.push({ label, missing: true });
        return;
      }
      const r = el.getBoundingClientRect();
      const clipped =
        r.right > shellRight + tol ||
        r.left < shellLeft - tol ||
        r.width < 2 ||
        r.height < 2;
      if (clipped) {
        clippedParts.push({
          label,
          left: r.left,
          right: r.right,
          shellLeft,
          shellRight,
          width: r.width,
        });
      }
    };

    measure('purchasePill', shell.querySelector('[class*="purchasePill"]'));
    measure('termsSummary', shell.querySelector('[data-testid="agent-cert-terms"] summary'));
    measure('moreLink', shell.querySelector('[data-testid="agent-cert-more"]'));
    shell.querySelectorAll('[class*="certificateListAction"]').forEach((btn, index) => {
      measure(`action_${index}`, btn);
    });

    const horizontalOverflow = shell.scrollWidth > shell.clientWidth + 2;
    return {
      ok: clippedParts.length === 0 && !horizontalOverflow,
      horizontalOverflow,
      clientWidth: shell.clientWidth,
      scrollWidth: shell.scrollWidth,
      shellRight,
      clippedParts,
    };
  }, certId ?? null);
}

export async function measureMobileListFooterRow(page, testId) {
  return page.evaluate((rowTestId) => {
    const row = document.querySelector(`[data-testid="${rowTestId}"]`);
    if (!row) return { ok: false, reason: 'row_missing' };
    const footer = row.querySelector('[class*="mobileRecordFooter"]');
    const pill = footer?.querySelector('[class*="purchasePill"]');
    const toolbar = footer?.querySelector('[role="toolbar"]');
    if (!footer || !pill || !toolbar) return { ok: false, reason: 'footer_parts_missing' };
    const pillBox = pill.getBoundingClientRect();
    const toolbarBox = toolbar.getBoundingClientRect();
    const footerBox = footer.getBoundingClientRect();
    const sameRow = Math.abs(pillBox.top - toolbarBox.top) < 14;
    const iconsInside =
      toolbarBox.top >= footerBox.top - 2 &&
      toolbarBox.bottom <= footerBox.bottom + 2 &&
      toolbarBox.right <= footerBox.right + 2;
    const toolbarNotFullWidth = toolbarBox.width < footerBox.width * 0.85;
    return {
      ok: sameRow && iconsInside && toolbarNotFullWidth,
      sameRow,
      iconsInside,
      toolbarNotFullWidth,
      pillTop: pillBox.top,
      toolbarTop: toolbarBox.top,
      footerWidth: footerBox.width,
      toolbarWidth: toolbarBox.width,
    };
  }, testId);
}
