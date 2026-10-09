"use client";

import { useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import styles from "./ProfileEditor.module.css";

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
  onAddressLineChange?: (line: string) => void;
};

export function BranchAddressGeocoder({
  city,
  addressLine,
  value,
  disabled,
  onChange,
  onAddressLineChange,
}: BranchAddressGeocoderProps) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  async function resolveOnServer() {
    setBusy(true);
    setHint("");
    try {
      const res = await remcardFetch<{
        addressCity?: string;
        addressDistrict?: string | null;
        addressGeohash?: string;
        error?: string;
        code?: string;
      }>("/api/pro/geocode/resolve", {
        method: "POST",
        body: { query: addressLine, city },
      });
      onChange({
        addressCity: res.addressCity ?? city,
        addressDistrict: res.addressDistrict ?? null,
        addressGeohash: res.addressGeohash ?? null,
      });
      setHint("Точка на карте подтверждена.");
    } catch (caught) {
      const msg =
        caught instanceof RemcardApiError
          ? caught.message
          : "Не удалось определить координаты. Сохраните черновик и уточните адрес позже.";
      setHint(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.fields}>
      <p className={styles.hint}>
        Подтвердите местоположение для каталога и отправки на проверку (геозона ~5 км).
      </p>
      {onAddressLineChange ? (
        <label className={styles.hint}>
          Адрес строкой{" "}
          <input
            value={addressLine}
            disabled={disabled}
            onChange={(e) => {
              onAddressLineChange(e.target.value);
              onChange({ addressCity: null, addressDistrict: null, addressGeohash: null });
            }}
          />
        </label>
      ) : null}
      <Button type="button" variant="secondary" disabled={disabled || busy || !addressLine.trim()} onClick={() => void resolveOnServer()}>
        {busy ? "Поиск…" : "Подтвердить на карте"}
      </Button>
      {value.addressGeohash ? (
        <p className={styles.hint}>
          Геозона: {value.addressGeohash}
          {value.addressDistrict ? ` · ${value.addressDistrict}` : ""}
        </p>
      ) : (
        <p className={styles.hint}>Геокод не подтверждён — черновик можно сохранить, для отправки уточните точку.</p>
      )}
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
