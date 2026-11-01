import type { FileRef, Item, ItemPatch } from "../types";
import type { DoneEvent } from "../insights";

/** Veri katmanı. İki gerçekleştirmesi var: Supabase (gerçek) ve demo (localStorage). */
export interface Store {
  load(): Promise<Item[]>;
  create(item: Item): Promise<void>;
  update(id: string, patch: ItemPatch): Promise<void>;
  /** Dosyayı yükler ve üst verisini döndürür; öğeye eklemek çağıranın işi (`update` ile `files`). */
  uploadFile(itemId: string, file: File): Promise<FileRef>;
  /** Açmak ya da indirmek için kısa ömürlü adres. */
  fileUrl(file: FileRef, download: boolean): Promise<string>;
  removeFile(file: FileRef): Promise<void>;
  /** Bugün dahil son `weeks` haftanın tamamlama/geri alma olayları. Olay kaydı yoksa (demo) null. */
  doneHistory(weeks: number): Promise<DoneEvent[] | null>;
  /** Sadece demo modunda: örnek veriyi baştan yükler. */
  reset?(): Promise<Item[]>;
}

