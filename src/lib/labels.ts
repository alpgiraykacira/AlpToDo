import type { Item } from "./types";

export const lower = (s: string) => s.toLocaleLowerCase("tr");

/** Karşılaştırma anahtarı: küçük harf, aksansız. "Toplantı" ve "toplanti" aynı etiket sayılır. */
export const norm = (s: string) =>
  lower(s)
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Kullanımdan türetilen etiket listesi, en çok kullanılan başta. */
export function labelCounts(items: Item[]): [string, number][] {
  const c = new Map<string, number>();
  for (const i of items) for (const l of i.labels) c.set(l, (c.get(l) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"));
}

/** Yazılan etiketi var olanla eşleştirir; yoksa yeni etiket üretir. */
export function canonicalLabel(raw: string, known: string[]): { name: string; fresh: boolean } {
  const n = norm(raw);
  const hit = known.find((k) => norm(k) === n);
  return hit ? { name: hit, fresh: false } : { name: lower(raw), fresh: true };
}
