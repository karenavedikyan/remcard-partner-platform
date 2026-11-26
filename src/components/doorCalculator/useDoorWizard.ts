'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MAX_COMPARE_VARIANTS,
  PRICE_LABELS,
  calcDoors,
  compareVariants,
  initPricesFromModel,
  newOpening,
  priceOfRow,
  totals,
  type DoorCatalogModel,
  type DoorOpening,
  type DoorPrices,
  type ModelVariantSnapshot,
} from '@/lib/doorCalculator';
import { buildOfferPayload, encodeOfferPayload } from '@/lib/doorCalculator/offer';

let uid = 0;

export type WizardObj = { client: string; phone: string; address: string };

export function useDoorWizard(catalog: DoorCatalogModel[]) {
  const [openings, setOpenings] = useState<DoorOpening[]>(() => [newOpening(++uid)]);
  const [step, setStep] = useState(1);
  const [cur, setCur] = useState(0);
  const [modelId, setModelId] = useState<string | null>(null);
  const [manual, setManual] = useState({ on: false, name: '', maker: '' });
  const [prices, setPrices] = useState<DoorPrices>({});
  const [pricesFor, setPricesFor] = useState<string | null>(null);
  const [disc, setDisc] = useState('');
  const [share, setShare] = useState(true);
  const [obj, setObj] = useState<WizardObj>({ client: '', phone: '', address: '' });
  const [variants, setVariants] = useState<ModelVariantSnapshot[]>([]);
  const [vi, setVi] = useState(0);
  const [adding, setAdding] = useState(false);
  const [prevVi, setPrevVi] = useState(0);
  const [cmpOpen, setCmpOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 860 : true
  );

  const curModel = useMemo((): DoorCatalogModel | null => {
    if (manual.on) {
      return {
        id: 'manual',
        manual: true,
        name: manual.name || 'Модель вне каталога',
        maker: manual.maker || 'Производитель не указан',
        price: 0,
        blades: null,
      };
    }
    return catalog.find((x) => x.id === modelId) ?? null;
  }, [manual, modelId, catalog]);

  useEffect(() => {
    const key = curModel ? curModel.id : 'none';
    if (pricesFor === key) return;
    setPricesFor(key);
    setPrices(initPricesFromModel(curModel));
  }, [curModel, pricesFor]);

  const calcResult = useMemo(
    () => calcDoors(openings, curModel, share),
    [openings, curModel, share]
  );

  const calcTotals = useMemo(
    () => totals(calcResult.rows, prices, disc),
    [calcResult.rows, prices, disc]
  );

  const snap = useCallback((): ModelVariantSnapshot => {
    const bl: Record<number, string> = {};
    openings.forEach((o) => {
      bl[o.id] = o.blade;
    });
    return {
      modelId,
      manual: { ...manual },
      prices: { ...prices },
      pricesFor,
      bl,
    };
  }, [openings, modelId, manual, prices, pricesFor]);

  const load = useCallback((v: ModelVariantSnapshot) => {
    setModelId(v.modelId);
    setManual({ ...v.manual });
    setPrices({ ...v.prices });
    setPricesFor(v.pricesFor);
    setOpenings((ops) =>
      ops.map((o) => ({ ...o, blade: v.bl[o.id] || '' }))
    );
  }, []);

  const saveVariant = useCallback(() => {
    setVariants((vars) => {
      const next = [...vars];
      next[vi] = snap();
      return next;
    });
  }, [snap, vi]);

  const compareRows = useMemo(() => {
    if (variants.length < 2) return [];
    const filled = variants.map((v, i) => (i === vi ? snap() : v));
    return compareVariants(openings, filled, catalog, disc, share);
  }, [variants, openings, catalog, disc, share, vi, snap]);

  const offerHref = useMemo(() => {
    const payload = buildOfferPayload(openings, curModel, prices, disc, share, obj);
    return `/doors-calculator/offer#${encodeOfferPayload(payload)}`;
  }, [openings, curModel, prices, disc, share, obj]);

  const resetCompareVariants = useCallback(() => {
    setVariants([]);
    setVi(0);
  }, []);

  const setOpeningCount = (n: number) => {
    resetCompareVariants();
    setOpenings((ops) => {
      const next = [...ops];
      while (next.length < n) next.push(newOpening(++uid));
      while (next.length > n) next.pop();
      return next;
    });
  };

  const updateOpening = (id: number, patch: Partial<DoorOpening>) => {
    setOpenings((ops) => ops.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const pickModel = (pick: 'manual' | string) => {
    if (pick === 'manual') {
      setManual({ on: true, name: '', maker: '' });
      setModelId(null);
    } else {
      setManual({ on: false, name: '', maker: '' });
      setModelId(pick);
    }
    setOpenings((ops) => ops.map((o) => ({ ...o, blade: '' })));
    setPrices({});
    setPricesFor(null);
  };

  const takenIds = () =>
    variants
      .filter((v, i) => i !== vi && !v.manual.on && v.modelId)
      .map((v) => v.modelId as string);

  const formatRub = (n: number) =>
    `${Math.round(n).toLocaleString('ru-RU')} ₽`;

  const sumCell = (r: (typeof calcResult.rows)[0]) => {
    const p = priceOfRow(prices, r.pk);
    return p == null ? 'нет цены' : formatRub(p * r.q);
  };

  return {
    openings,
    setOpenings,
    step,
    setStep,
    cur,
    setCur,
    modelId,
    manual,
    setManual,
    prices,
    setPrices,
    disc,
    setDisc,
    share,
    setShare,
    obj,
    setObj,
    variants,
    setVariants,
    vi,
    setVi,
    adding,
    setAdding,
    prevVi,
    setPrevVi,
    cmpOpen,
    setCmpOpen,
    curModel,
    catalog,
    calcResult,
    calcTotals,
    compareRows,
    offerHref,
    setOpeningCount,
    updateOpening,
    pickModel,
    snap,
    load,
    saveVariant,
    takenIds,
    formatRub,
    sumCell,
    maxVariants: MAX_COMPARE_VARIANTS,
    priceLabels: PRICE_LABELS,
    hasCatalog: catalog.length > 0,
    resetCompareVariants,
  };
}

export type DoorWizardState = ReturnType<typeof useDoorWizard>;