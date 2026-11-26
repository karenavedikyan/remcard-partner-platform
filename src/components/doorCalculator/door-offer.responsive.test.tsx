import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { buildOfferPayload, encodeOfferPayload } from '@/lib/doorCalculator/offer';
import { newOpening } from '@/lib/doorCalculator/calc';
import { DoorOfferPage } from './DoorOfferPage';

describe('DoorOfferPage — мобильная вёрстка и шапка', () => {
  it('не задаёт глобальные стили body и scope под .door-offer', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/components/doorCalculator/door-offer.css'),
      'utf8'
    );
    expect(css).not.toMatch(/^body\{/m);
    expect(css).toContain('.door-offer .edit input');
    expect(css).toMatch(/@media\(max-width:480px\)/);
    expect(css).toContain('.door-offer .hd__c b');
    expect(css).toContain('overflow-wrap:anywhere');
  });

  it('рендерит длинное название компании без обёртки в page-scale', () => {
    const model = {
      id: 'manual',
      manual: true,
      name: 'Линия',
      maker: '',
      price: 0,
      blades: null,
    };
    const payload = buildOfferPayload(
      [{ ...newOpening(1), w: '900', depth: '250' }],
      model,
      { blade: 1 },
      0,
      true,
      { client: '', phone: '', address: '' }
    );
    const hash = encodeOfferPayload(payload);
    window.location.hash = hash;

    render(
      <DoorOfferPage
        context="lk"
        initialPartner={{
          company: 'ООО ДВЕРИ ОПТОВИК',
          manager: '',
          phone: '',
          messenger: '',
          email: '',
          site: '',
          address: '',
          note: '',
          logo: '',
        }}
      />
    );

    const companyInHeader = document.querySelector('.door-offer .hd__c b');
    expect(companyInHeader?.textContent).toBe('ООО ДВЕРИ ОПТОВИК');
    expect(document.querySelector('.door-offer .page-scale')).toBeTruthy();
  });
});