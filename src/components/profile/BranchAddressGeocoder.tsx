"use client";

import { useEffect, useRef, useState } from "react";
import { encodeGeohash5 } from "@/lib/geohash";
import {
  buildBranchGeocodeQuery,
  extractCityDistrict,
  loadYmaps,
} from "@/lib/yandex-address-geocoder";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileEditor.module.css";

export const BRANCH_ADDRESS_PUBLICATION_HINT =
  "Для публикации филиала в каталоге подтвердите адрес на карте. Сохранить филиал и работать в кабинете можно уже сейчас";

export const BRANCH_MAP_LOAD_ERROR =
  "Не удалось загрузить карту. Вы можете сохранить данные и подтвердить адрес позже";

export type BranchAddressGeoValue = {
  addressCity: string | null;
  addressDistrict: string | null;
  addressGeohash: string | null;
};

type BranchAddressGeocoderProps = {
  city: string;
  addressLine: string;
  value: BranchAddressGeoValue;
  disabled?: boolean;
  onChange: (next: BranchAddressGeoValue) => void;
};

type PendingHit = {
  queryKey: string;
  humanReadable: string;
  addressCity: string | null;
  addressDistrict: string | null;
  geohash: string;
};

export function BranchAddressGeocoder({
  city,
  addressLine,
  value,
  disabled,
  onChange,
}: BranchAddressGeocoderProps) {
  const [apiKey] = useState(() => process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "");
  const [scriptErr, setScriptErr] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [pending, setPending] = useState<PendingHit | null>(null);
  const searchGen = useRef(0);
  const prevQueryKeyRef = useRef<string | null>(null);
  const queryKey = buildBranchGeocodeQuery(city, addressLine);

  useEffect(() => {
    const key = queryKey.trim();
    if (prevQueryKeyRef.current !== null && prevQueryKeyRef.current !== key) {
      setPending(null);
      setSearchErr("");
      onChange({ addressCity: null, addressDistrict: null, addressGeohash: null });
    }
    prevQueryKeyRef.current = key;
  }, [queryKey, onChange]);

  async function searchAddress() {
    const q = queryKey.trim();
    if (!q || !apiKey) return;
    const gen = ++searchGen.current;
    setSearching(true);
    setSearchErr("");
    setPending(null);
    onChange({ addressCity: null, addressDistrict: null, addressGeohash: null });
    try {
      const ymaps = await loadYmaps(apiKey);
      await new Promise<void>((resolve, reject) => {
        ymaps.ready(() => {
          ymaps.geocode(q, { results: 1 }).then((res) => {
            if (gen !== searchGen.current) return;
            const obj = res.geoObjects.get(0);
            if (!obj) {
              setSearchErr("Адрес не найден. Уточните город и строку адреса и повторите поиск.");
              resolve();
              return;
            }
            const [lon, lat] = obj.geometry.getCoordinates();
            const { city: foundCity, district } = extractCityDistrict(obj);
            const text = (obj.properties.get("text") as string) || q;
            const geohash = encodeGeohash5(lat, lon);
            setPending({
              queryKey: q,
              humanReadable: text,
              addressCity: foundCity ?? (city.trim() || null),
              addressDistrict: district,
              geohash,
            });
            resolve();
          });
        });
      });
    } catch {
      if (gen === searchGen.current) {
        setScriptErr(true);
        setSearchErr(BRANCH_MAP_LOAD_ERROR);
      }
    } finally {
      if (gen === searchGen.current) setSearching(false);
    }
  }

  function confirmPending() {
    if (!pending || pending.queryKey !== queryKey.trim()) {
      setSearchErr("Адрес изменился — выполните поиск заново.");
      setPending(null);
      return;
    }
    onChange({
      addressCity: pending.addressCity,
      addressDistrict: pending.addressDistrict,
      addressGeohash: pending.geohash,
    });
    setPending(null);
    setSearchErr("");
  }

  if (!apiKey || scriptErr) {
    return (
      <div className={styles.fields} data-testid="branch-address-geocoder-fallback">
        {!value.addressGeohash ? (
          <p className={styles.hint} data-testid="branch-address-publication-hint">
            {BRANCH_ADDRESS_PUBLICATION_HINT}
          </p>
        ) : null}
        {!apiKey ? (
          <p className={styles.hint}>
            Ключ Яндекс.Карт не настроен — адрес можно указать текстом; подтверждение на карте станет
            доступно после настройки ключа.
          </p>
        ) : null}
        {searchErr ? (
          <p className={styles.error} role="alert" data-testid="branch-map-load-error">
            {searchErr}
          </p>
        ) : null}
        {apiKey ? (
          <Button
            type="button"
            variant="secondary"
            data-testid="branch-address-search"
            disabled={disabled || searching || !queryKey.trim()}
            onClick={() => void searchAddress()}
          >
            {searching ? "Поиск…" : scriptErr ? "Повторить поиск адреса" : "Найти адрес"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.fields} data-testid="branch-address-geocoder">
      {!value.addressGeohash ? (
        <p className={styles.hint} data-testid="branch-address-publication-hint">
          {BRANCH_ADDRESS_PUBLICATION_HINT}
        </p>
      ) : null}
      <p className={styles.hint}>
        Подготовка к публикации: найдите адрес и подтвердите результат (геозона ~5&nbsp;км для каталога).
      </p>
      <div className={styles.fields}>
        <Button
          type="button"
          variant="secondary"
          data-testid="branch-address-search"
          disabled={disabled || searching || !queryKey.trim()}
          onClick={() => void searchAddress()}
        >
          {searching ? "Поиск…" : "Найти адрес"}
        </Button>
        {pending ? (
          <div data-testid="branch-address-preview">
            <p className={styles.hint}>Найдено: {pending.humanReadable}</p>
            <Button
              type="button"
              data-testid="branch-address-confirm"
              disabled={disabled}
              onClick={confirmPending}
            >
              Подтвердить этот адрес
            </Button>
          </div>
        ) : null}
        {value.addressGeohash && !pending ? (
          <p className={styles.hint} data-testid="branch-geohash-confirmed">
            Подтверждено · геозона {value.addressGeohash}
            {value.addressDistrict ? ` · ${value.addressDistrict}` : ""}
          </p>
        ) : null}
        {searchErr ? (
          <p className={styles.error} role="alert" data-testid="branch-map-load-error">
            {searchErr}
          </p>
        ) : null}
        {searchErr && !scriptErr ? (
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || searching || !queryKey.trim()}
            onClick={() => void searchAddress()}
          >
            Повторить поиск адреса
          </Button>
        ) : null}
      </div>
    </div>
  );
}
