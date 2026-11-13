import { a as qrcodeModuleRef } from "./chunk-3HBG25M4.js";
import { c as esmInterop } from "./chunk-5TBO732O.js";

/** Invoke esbuild CJS chunk factory and return the QRCode API (toDataURL, toCanvas, …). */
export function qrcodeBundleApi() {
  const mod =
    typeof qrcodeModuleRef === "function" ? esmInterop(qrcodeModuleRef(), 1) : esmInterop(qrcodeModuleRef, 1);
  const api = mod?.default || mod;
  if (typeof api?.toDataURL !== "function") {
    throw new Error("qrcode chunk did not expose toDataURL");
  }
  return api;
}

export async function qrRasterDataUrl(text, { width = 600, margin = 3, errorCorrectionLevel = "M" } = {}) {
  const api = qrcodeBundleApi();
  const payload = String(text || "").trim();
  if (!payload) return "";
  try {
    const dataUrl = await api.toDataURL(payload, {
      width,
      margin,
      errorCorrectionLevel,
    });
    if (!/^data:image\/(?:png|jpeg|jpg);/i.test(dataUrl || "")) return "";
    if ((dataUrl || "").length < 512) return "";
    return dataUrl;
  } catch (_) {
    return "";
  }
}
