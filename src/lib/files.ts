import type { FileRef } from "./types";

/** Kova sınırıyla (migration) aynı olmalı. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 20;
/** Demo modunda dosyalar localStorage'da (~5 MB) durduğu için sınır daha düşük. */
export const MAX_DEMO_FILE_BYTES = 1024 * 1024;

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Önizleme yalnızca bilinen raster görsellerde; SVG ve diğerleri yalnızca indirilir. */
export const isPreviewable = (f: Pick<FileRef, "type">) =>
  ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(f.type);

/** Yapıştırılan dosyalar çoğu zaman adsızdır ("image.png"); yinelenen adlara sayı ekler. */
export function uniqueName(name: string, taken: string[]): string {
  if (!taken.includes(name)) return name;
  const dot = name.lastIndexOf(".");
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

export interface PickResult {
  ok: File[];
  /** Kullanıcıya gösterilecek, reddedilen dosyaların nedenleri. */
  errors: string[];
}

/** Boyut ve adet sınırını uygular. `existing`, öğede zaten bulunan dosya sayısıdır. */
export function pickAllowed(files: File[], existing: number, maxBytes = MAX_FILE_BYTES): PickResult {
  const ok: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (f.size === 0) errors.push(`“${f.name}” boş`);
    else if (f.size > maxBytes) errors.push(`“${f.name}” ${fmtSize(maxBytes)} sınırını aşıyor`);
    else if (existing + ok.length >= MAX_FILES) errors.push(`“${f.name}” eklenmedi: en fazla ${MAX_FILES} dosya`);
    else ok.push(f);
  }
  return { ok, errors };
}
