/** Shared synthetic parity labels (impl seed + capture docs; reference chrome hidden at capture). */

/** Minimal ref-aligned row for matched-pair crops (roles.js client-anna + demo-audience-certificate). */
export const PARITY_MATCH = {
  clientSearch: 'Анна',
  /** Ref prototype search token (alias also contains middle dot). */
  certSearch: 'подписчиков',
  client: {
    displayName: 'Анна · демо',
    city: 'Краснодар',
    /** Matches frozen ref `need` (roles.js client-anna), not the long private note field. */
    note: 'Ремонт квартиры',
    refPurchaseStatus: 'Есть покупки',
    refCertificateCount: 1,
  },
  certAlias: 'Ремонт для подписчиков · демо',
};

export const PARITY_CLIENTS = [
  {
    displayName: PARITY_MATCH.client.displayName,
    city: PARITY_MATCH.client.city,
    note: PARITY_MATCH.client.note,
    hasPurchases: true,
  },
  {
    displayName: 'Parity Client B',
    city: 'Сочи',
    note: 'Двери для дома',
    hasPurchases: false,
  },
  {
    displayName: 'Parity Client C',
    city: 'Краснодар',
    note: 'Ремонт квартиры',
    hasPurchases: false,
  },
  {
    displayName: 'Parity Client D long name',
    city: 'Анапа',
    note: 'Выбирает напольные покрытия',
    hasPurchases: false,
  },
];

export const PARITY_CERT_ALIASES = [
  PARITY_MATCH.certAlias,
  'Parity fractional 5.5%',
  'Parity linked client cert',
];
