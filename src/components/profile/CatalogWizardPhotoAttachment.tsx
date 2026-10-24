"use client";

import { useEffect, useId, useState, type ChangeEvent, type RefObject } from "react";
import styles from "./CatalogWizardPhotoAttachment.module.css";

export type CatalogWizardPhotoAttachmentProps = {
  catalogImageUrl: string;
  catalogEditable: boolean;
  uploading: boolean;
  uploadError: string;
  fileInputRef: RefObject<HTMLInputElement>;
  accept: string;
  fileInputClassName: string;
  btnClassName: string;
  btnGhostClassName?: string;
  bannerErrorClassName: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

export function CatalogWizardPhotoAttachment(props: CatalogWizardPhotoAttachmentProps) {
  const {
    catalogImageUrl,
    catalogEditable,
    uploading,
    uploadError,
    fileInputRef,
    accept,
    fileInputClassName,
    btnClassName,
    btnGhostClassName,
    bannerErrorClassName,
    onFileChange,
    onRemove,
  } = props;

  const url = catalogImageUrl.trim();
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const statusLiveId = useId();

  useEffect(() => {
    setPreviewUnavailable(false);
  }, [url]);

  const ghostBtn = btnGhostClassName ? `${btnClassName} ${btnGhostClassName}` : btnClassName;

  return (
    <div className={styles.root} data-testid="catalog-wizard-photo-attachment">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className={fileInputClassName}
        disabled={!catalogEditable || uploading}
        onChange={onFileChange}
      />

      {url ? (
        <div className={styles.attached} data-testid="catalog-wizard-photo-attached">
          <div className={styles.thumbFrame}>
            {!previewUnavailable ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Прикреплённое фото для каталога"
                className={styles.thumbImg}
                data-testid="catalog-wizard-photo-thumb"
                onError={() => setPreviewUnavailable(true)}
              />
            ) : (
              <div className={styles.thumbFallback} data-testid="catalog-wizard-photo-preview-fallback">
                Нет превью
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <p className={styles.status} id={statusLiveId} aria-live="polite">
              <span>Фото прикреплено</span>
              {previewUnavailable ? (
                <span className={styles.previewWarn} data-testid="catalog-wizard-photo-preview-unavailable">
                  Предпросмотр недоступен
                </span>
              ) : null}
            </p>
            {catalogEditable ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={btnClassName}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Загрузка…" : "Заменить фото"}
                </button>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={uploading}
                  onClick={onRemove}
                >
                  Убрать фото
                </button>
              </div>
            ) : null}
            {catalogEditable ? (
              <p className={styles.draftHint}>Изменения сохранятся вместе с черновиком</p>
            ) : null}
          </div>
        </div>
      ) : catalogEditable ? (
        <div className={styles.emptyActions}>
          <button
            type="button"
            className={btnClassName}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Загрузка…" : "Добавить фото"}
          </button>
          {uploading ? <p className={styles.uploadingLabel}>Загрузка…</p> : null}
        </div>
      ) : null}

      {uploadError ? (
        <p className={bannerErrorClassName} role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
