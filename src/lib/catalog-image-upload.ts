/** MIME types allowed for catalog logo upload (aligned with navigator upload route). */
export const CATALOG_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif" as const;

const MAX_BYTES = 10 * 1024 * 1024;

export type CatalogUploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status?: number };

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function validateCatalogImageFile(file: File): string | null {
  const mime = (file.type || "").toLowerCase();
  const extOk = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  const okType = (mime && ALLOWED_MIME.has(mime)) || (extOk && (!mime || mime === "application/octet-stream"));
  if (!okType) return "Выберите изображение (JPG, PNG, WEBP, HEIC)";
  if (file.size > MAX_BYTES) return "Файл слишком большой (макс. 10 МБ)";
  return null;
}

/** Upload via partner-platform BFF → navigator `/api/upload`. */
export async function uploadCatalogImage(file: File): Promise<CatalogUploadResult> {
  const v = validateCatalogImageFile(file);
  if (v) return { ok: false, error: v };

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("purpose", "catalog");

  try {
    const res = await fetch("/api/remcard/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 503) {
        return { ok: false, status: res.status, error: "Хранилище временно недоступно. Попробуйте позже." };
      }
      return {
        ok: false,
        status: res.status,
        error: errData.error || `Ошибка загрузки (${res.status})`,
      };
    }
    const data = (await res.json()) as { url?: string };
    if (data.url) return { ok: true, url: data.url };
    return { ok: false, error: "Сервер не вернул URL изображения" };
  } catch {
    return { ok: false, error: "Не удалось загрузить изображение. Проверьте интернет." };
  }
}
