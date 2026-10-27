import { seedItems } from "../seed";
import type { Item } from "../types";
import type { Store } from "./types";

const KEY = "sira.demo.v1";

/** Silinenler de saklanır (geri alınabilsin diye), Supabase'deki deleted_at gibi. */
type Stored = Item & { deleted?: boolean };

function read(): Stored[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    // Tekrar alanlarından önce kaydedilmiş demo verisini uyumlu hale getir.
    return (parsed as Stored[]).map((i) => ({ ...i, recurrence: i.recurrence ?? null, lastDoneAt: i.lastDoneAt ?? null }));
  } catch {
    return null;
  }
}

function write(items: Stored[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* gizli pencere vb.: demo verisi kalıcı olmaz */
  }
}

const visible = (items: Stored[]): Item[] =>
  items.filter((i) => !i.deleted).map(({ deleted: _deleted, ...item }) => item);

/** Supabase ayarlanmamışken kullanılan, tarayıcıda çalışan store. Aynı arayüzü sağlar. */
export function demoStore(): Store {
  let items: Stored[] = [];
  return {
    async load() {
      items = read() ?? seedItems();
      write(items);
      return visible(items);
    },
    async create(item) {
      items = [item, ...items];
      write(items);
    },
    async update(id, patch) {
      items = items.map((i) => {
        if (i.id !== id) return i;
        const next: Stored = { ...i, ...patch, deleted: patch.deleted ?? i.deleted };
        if (patch.status !== undefined && patch.status !== i.status) {
          next.completedAt = patch.status === "done" ? new Date().toISOString() : null;
        }
        return next;
      });
      write(items);
    },
    async reset() {
      items = seedItems();
      write(items);
      return visible(items);
    },
  };
}
