"use client";

import { useEffect, useRef, useState } from "react";
import { encodeGeohash5 } from "@/lib/geohash";
import {
  buildBranchGeocodeQuery,
  extractCityDistrict,
  loadYmaps,
  runYmapsGeocode,
} from "@/lib/yandex-address-geocoder";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileEditor.module.css";

export const BRANCH_ADDRESS_PUBLICATION_HINT =
  "Для публикации филиала в каталоге подтвердите адрес на карте. Сохранить филиал и работать в кабинете можно уже сейчас";

export const BRANCH_MAP_LOAD_ERROR =
  "Не удалось загрузить карту. Вы можете сохранить данные и подтвердить адрес позже";

export const BRANCH_GEOCODE_SEARCH_ERROR =
  "Не удалось выполнить поиск адреса. Сохраните черновик и повторите поиск позже.";

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

function isScriptLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message === "ymaps script failed" || err.message === "ymaps missing after script load";
}

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
      searchGen.current += 1;
      setSearching(false);
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
      if (gen !== searchGen.current) return;

      setScriptErr(false);
      const res = await runYmapsGeocode(ymaps, q);
      if (gen !== searchGen.current) return;

      const obj = res.geoObjects.get(0);
      if (!obj) {
        setSearchErr("Адрес не найден. Уточните город и строку адреса и повторите поиск.");
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
      setSearchErr("");
    } catch (err) {
      if (gen !== searchGen.current) return;
      if (isScriptLoadError(err)) {
        setScriptErr(true);
        setSearchErr(BRANCH_MAP_LOAD_ERROR);
      } else {
        setSearchErr(BRANCH_GEOCODE_SEARCH_ERROR);
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

  const showFallbackChrome = !apiKey || scriptErr;
  const searchButtonLabel =
    searching ? "Поиск…" : scriptErr && searchErr ? "Повторить поиск адреса" : "Найти адрес";

  const geocoderBody = (
    <>
      {!value.addressGeohash ? (
        <p className={styles.hint} data-testid="branch-address-publication-hint">
          {BRANCH_ADDRESS_PUBLICATION_HINT}
        </p>
      ) : null}
      {showFallbackChrome && !apiKey ? (
        <p className={styles.hint}>
          Ключ Яндекс.Карт не настроен — адрес можно указать текстом; подтверждение на карте станет
          доступно после настройки ключа.
        </p>
      ) : (
        <p className={styles.hint}>
          Подготовка к публикации: найдите адрес и подтвердите результат (геозона ~5&nbsp;км для
          каталога).
        </p>
      )}
      <div className={styles.fields}>
        {apiKey ? (
          <Button
            type="button"
            variant="secondary"
            data-testid="branch-address-search"
            disabled={disabled || searching || !queryKey.trim()}
            onClick={() => void searchAddress()}
          >
            {searchButtonLabel}
          </Button>
        ) : null}
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
        {searchErr && apiKey && !searching ? (
          <Button
            type="button"
            variant="secondary"
            data-testid="branch-address-retry"
            disabled={disabled || !queryKey.trim()}
            onClick={() => void searchAddress()}
          >
            Повторить поиск адреса
          </Button>
        ) : null}
      </div>
    </>
  );

  if (showFallbackChrome) {
    return (
      <div className={styles.fields} data-testid="branch-address-geocoder-fallback">
        {geocoderBody}
      </div>
    );
  }

  return (
    <div className={styles.fields} data-testid="branch-address-geocoder">
      {geocoderBody}
    </div>
  );
}
