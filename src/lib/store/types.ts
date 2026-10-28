import type { Item, ItemPatch } from "../types";

/** Veri katmanı. İki gerçekleştirmesi var: Supabase (gerçek) ve demo (localStorage). */
export interface Store {
  load(): Promise<Item[]>;
  create(item: Item): Promise<void>;
  update(id: string, patch: ItemPatch): Promise<void>;
  /** Önceki `weeks` haftanın tamamlanan görev sayısı (eskiden yeniye), olay kaydından. Olay kaydı yoksa (demo) null. */
  doneHistory(weeks: number): Promise<number[] | null>;
  /** Sadece demo modunda: örnek veriyi baştan yükler. */
  reset?(): Promise<Item[]>;
}
