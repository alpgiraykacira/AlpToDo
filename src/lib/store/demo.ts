import { MAX_DEMO_FILE_BYTES } from "../files";
import { seedItems } from "../seed";
import type { Item } from "../types";
import type { Store } from "./types";

const KEY = "sira.demo.v1";
/** Demo dosyaları: dosya kimliği → data URL. Öğelerden ayrı, çünkü büyük olabilir. */
const FILES_KEY = "sira.demo.files.v1";

/** Silinenler de saklanır (geri alınabilsin diye), Supabase'deki deleted_at gibi. */
type Stored = Item & { deleted?: boolean };

function read(): Stored[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    // Tekrar alanlarından önce kaydedilmiş demo verisini uyumlu hale getir.
    return (parsed as Stored[]).map((i) => ({ ...i, recurrence: i.recurrence ?? null, lastDoneAt: i.lastDoneAt ?? null, files: i.files ?? [] }));
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

function readFiles(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FILES_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

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
    async uploadFile(_itemId, file) {
      if (file.size > MAX_DEMO_FILE_BYTES) throw new Error("Demo modunda dosya sınırı 1 MB");
      const id = crypto.randomUUID();
      const store = readFiles();
      store[id] = await toDataUrl(file);
      // Dolu localStorage burada fırlatır; çağıran hatayı kullanıcıya gösterir.
      localStorage.setItem(FILES_KEY, JSON.stringify(store));
      return { id, name: file.name, type: file.type || "application/octet-stream", size: file.size, path: id };
    },
    async fileUrl(file) {
      const url = readFiles()[file.id];
      if (!url) throw new Error("Dosya bulunamadı");
      return url;
    },
    async removeFile(file) {
      const { [file.id]: _gone, ...rest } = readFiles();
      localStorage.setItem(FILES_KEY, JSON.stringify(rest));
    },
    async doneHistory(weeks) {
      // Demo verisinde olay kaydı yok; grafik yalnızca öğelerden hesaplanır.
      return null;
    },
    async reset() {
      try {
        localStorage.removeItem(FILES_KEY);
      } catch {
        /* önemsiz */
      }
      items = seedItems();
      write(items);
      return visible(items);
    },
  };
}
