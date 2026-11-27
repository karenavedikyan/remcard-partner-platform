'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { decodeOfferPayload } from '@/lib/doorCalculator/offer';
import type { OfferPayload } from '@/lib/doorCalculator/types';
import type { DoorOfferPartnerFields } from '@/lib/door-calculator/partner-offer';
import './door-offer.css';

const SITE_PARTNER = {
  company: 'RemCard',
  manager: 'Консультант RemCard',
  phone: '+7 495 000-00-00',
  messenger: 'remcard.ru',
  email: 'hello@remcard.ru',
  site: 'remcard.ru',
  address: 'Россия',
  note: 'Предложение рассчитано по данным замера. Окончательная стоимость подтверждается при оформлении заказа.',
  logo: '',
};

function rub(n: number) {
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

type DoorOfferPageProps = {
  context?: 'site' | 'lk';
  initialPartner?: DoorOfferPartnerFields | null;
};

export function DoorOfferPage({ context = 'lk', initialPartner = null }: DoorOfferPageProps = {}) {
  const calculatorHref = context === 'lk' ? '/doors-calculator' : '/calculators/doors';
  const [data, setData] = useState<OfferPayload | null>(null);
  const [partner, setPartner] = useState<DoorOfferPartnerFields>(
    initialPartner ?? (context === 'lk' ? emptyPartner() : SITE_PARTNER),
  );

  useEffect(() => {
    if (initialPartner) setPartner(initialPartner);
  }, [initialPartner]);

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (h) setData(decodeOfferPayload(h));
  }, []);

  const totals = useMemo(() => {
    if (!data) return null;
    let sum = 0;
    let none = 0;
    data.rows.forEach((r) => {
      if (r[2] == null) none++;
      else sum += r[1] * r[2];
    });
    const dp = Math.min(Math.max(+(data.disc || 0), 0), 100);
    const dsc = Math.round((sum * dp) / 100);
    return { sum, none, dp, dsc, total: sum - dsc };
  }, [data]);

  if (!data || !totals) {
    return (
      <OfferShell>
        <p>Загрузка предложения… Откройте страницу из калькулятора дверей.</p>
        <Link href={calculatorHref}>К калькулятору</Link>
      </OfferShell>
    );
  }

  const ds = new Date().toLocaleDateString('ru-RU');
  const o = data.obj;

  return (
    <OfferShell>
      <div className="screen">
        <div className="screen__bar">
          <Link href={calculatorHref} className="back">
            ← К калькулятору
          </Link>
          <button type="button" className="btn" id="print" onClick={() => window.print()}>
            Сохранить как PDF
          </button>
        </div>
        <aside className="edit">
          <h2>Профиль партнёра</h2>
          <p className="note">
            {context === 'lk'
              ? 'Данные из профиля организации. Изменения здесь не сохраняются в профиль.'
              : 'На сайте — фирменный вид RemCard. В кабинете подставятся данные организации.'}
          </p>
          {(
            [
              ['company', 'Название компании'],
              ['manager', 'Менеджер'],
              ['phone', 'Телефон'],
              ['messenger', 'Мессенджер'],
              ['email', 'E-mail'],
              ['site', 'Сайт'],
              ['address', 'Адрес'],
            ] as const
          ).map(([k, label]) => (
            <label key={k}>
              {label}
              <input
                value={partner[k]}
                onChange={(e) => setPartner({ ...partner, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Примечание в конце
            <textarea
              rows={3}
              value={partner.note}
              onChange={(e) => setPartner({ ...partner, note: e.target.value })}
            />
          </label>
        </aside>
      </div>
      <main>
        <div className="page-scale">
        <article className="page">
          <div className="hd">
            <div className="logo">
              {partner.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.logo} alt="" />
              ) : (
                (partner.company || '?').slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="hd__c">
              <b>{partner.company || '—'}</b>
              <span>{[partner.phone, partner.site].filter(Boolean).join(' · ') || '—'}</span>
            </div>
            <div className="hd__r">
              <span className="rcb">
                <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden>
                  <rect width="36" height="36" rx="10" fill="var(--offer-brand)" />
                  <path
                    d="M10 26V12l8-5 8 5v14h-5v-8h-6v8z"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="rcb__t">
                  <b>
                    remcard<span>.</span>
                  </b>
                  <small>калькулятор ремонта</small>
                </span>
              </span>
            </div>
          </div>
          <h1>Коммерческое предложение</h1>
          <div className="meta">№ КП от {ds}</div>
          <div className="two">
            <div className="box">
              <small>Заказчик</small>
              <b>{o.client || 'Не указан'}</b>
              {o.phone}
              {o.address ? (
                <>
                  <br />
                  {o.address}
                </>
              ) : null}
            </div>
            <div className="box">
              <small>Модель двери</small>
              <b>{data.model.name}</b>
              {data.model.maker}
              <br />
              Менеджер: {partner.manager}
            </div>
          </div>
          <h3>Проёмы</h3>
          <table className="openings-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Проём</th>
                <th>Размер, мм</th>
                <th>Состав</th>
              </tr>
            </thead>
            <tbody>
              {data.per.map((p) => (
                <tr key={p.n}>
                  <td>{p.n}</td>
                  <td>
                    <b>{p.room || 'Проём'}</b>
                    <br />
                    {p.type}
                  </td>
                  <td>{p.size}</td>
                  <td>{p.lines.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="openings-cards" aria-label="Проёмы">
            {data.per.map((p) => (
              <article key={p.n} className="opening-card">
                <header className="opening-card__head">
                  <span className="opening-card__num">№ {p.n}</span>
                  <div className="opening-card__title">
                    <b>{p.room || 'Проём'}</b>
                    <span>{p.type}</span>
                  </div>
                </header>
                <dl className="opening-card__rows">
                  <div>
                    <dt>Размер, мм</dt>
                    <dd>{p.size}</dd>
                  </div>
                  <div>
                    <dt>Состав</dt>
                    <dd>{p.lines.join(', ')}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <h3>Спецификация</h3>
          <table className="spec-table">
            <thead>
              <tr>
                <th>Позиция</th>
                <th className="r">Кол-во</th>
                <th className="r">Цена за шт.</th>
                <th className="r">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => {
                const pr = r[2] == null;
                return (
                  <tr key={`${r[0]}-${i}`}>
                    <td>{r[0]}</td>
                    <td className="r">{r[1]} шт</td>
                    <td className="r">{pr ? <span className="na">по запросу</span> : rub(r[2]!)}</td>
                    <td className="r">{pr ? '—' : rub(r[1] * r[2]!)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="tot">
            <div>
              <span>Стоимость без скидки</span>
              <b>{rub(totals.sum)}</b>
            </div>
            {totals.dsc ? (
              <div>
                <span>Скидка {totals.dp} %</span>
                <b>− {rub(totals.dsc)}</b>
              </div>
            ) : null}
            <div className="big">
              <span>Итого</span>
              <span>{rub(totals.total)}</span>
            </div>
            {totals.dsc ? (
              <div className="save">
                <span>Ваша выгода</span>
                <span>{rub(totals.dsc)}</span>
              </div>
            ) : null}
            {totals.none ? (
              <div style={{ fontSize: 11, color: '#8a5a12' }}>
                Цена по {totals.none} поз. уточняется, в итог не включена.
              </div>
            ) : null}
          </div>
          <div className="ct">
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{partner.note}</div>
            <div className="ct__in">
              <b>Как с нами связаться</b>
              {partner.manager ? (
                <span>
                  <em>Менеджер:</em> {partner.manager}
                </span>
              ) : null}
              {partner.phone ? (
                <span>
                  <em>Телефон:</em> {partner.phone}
                </span>
              ) : null}
              {partner.messenger ? (
                <span>
                  <em>Мессенджер:</em> {partner.messenger}
                </span>
              ) : null}
              {partner.email ? (
                <span>
                  <em>E-mail:</em> {partner.email}
                </span>
              ) : null}
              {partner.site ? (
                <span>
                  <em>Сайт:</em> {partner.site}
                </span>
              ) : null}
              {partner.address ? (
                <span>
                  <em>Адрес:</em> {partner.address}
                </span>
              ) : null}
            </div>
            <div className="ft">
              <span>{partner.company}</span>
              <span>Калькулятор дверей RemCard</span>
            </div>
          </div>
        </article>
        </div>
      </main>
    </OfferShell>
  );
}

function emptyPartner(): DoorOfferPartnerFields {
  return {
    company: '',
    manager: '',
    phone: '',
    messenger: '',
    email: '',
    site: '',
    address: '',
    note: SITE_PARTNER.note,
    logo: '',
  };
}

function OfferShell({ children }: { children: ReactNode }) {
  return (
    <div className="door-offer" data-testid="door-offer-page">
      {children}
    </div>
  );
}