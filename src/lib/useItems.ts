"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Store } from "./store/types";
import type { FileRef, Item, ItemPatch, LocalPatch } from "./types";

const DEBOUNCE_MS = 600;

/**
 * Öğe durumunu tutar. Değişiklikler önce ekrana uygulanır (iyimser güncelleme),
 * sonra store'a yazılır. Yazma başarısız olursa store'dan yeniden yüklenip hata bildirilir.
 * Başlık ve not gibi sık değişen alanlar `debounced` ile birleştirilip toplu yazılır.
 */
export function useItems(store: Store, initial: Item[] | undefined, onError: (message: string) => void) {
  const [items, setItems] = useState<Item[]>(initial ?? []);
  const [ready, setReady] = useState(initial !== undefined);
  // Analiz, iyimser değişiklikten sonra değil, olay kaydı yazılınca yeniden yüklenir.
  const [revision, setRevision] = useState(0);
  const pending = useRef(new Map<string, { patch: ItemPatch; timer: ReturnType<typeof setTimeout> }>());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const reload = useCallback(async () => {
    try {
      setItems(await store.load());
      setReady(true);
    } catch {
      onErrorRef.current("Veriler yüklenemedi. Bağlantını kontrol et.");
    }
  }, [store]);

  useEffect(() => {
    if (initial === undefined) void reload();
  }, [initial, reload]);

  const write = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
        setRevision((n) => n + 1);
      } catch {
        onErrorRef.current("Kaydedilemedi. Değişiklik geri alındı.");
        await reload();
      }
    },
    [reload],
  );

  // Aynı öğenin yazmaları sırayla gider: art arda gelen iki istek ters sırada tamamlanırsa
  // eski değer yenisini ezer (ör. art arda eklenen kontrol listesi maddeleri).
  const queue = useRef(new Map<string, Promise<void>>());
  const enqueue = useCallback(
    (id: string, fn: () => Promise<void>) => {
      const next = (queue.current.get(id) ?? Promise.resolve()).then(() => write(fn));
      queue.current.set(id, next);
      return next;
    },
    [write],
  );

  const flush = useCallback(
    (id: string) => {
      const p = pending.current.get(id);
      if (!p) return Promise.resolve();
      clearTimeout(p.timer);
      pending.current.delete(id);
      return enqueue(id, () => store.update(id, p.patch));
    },
    [store, enqueue],
  );

  // Sekme kapanırken bekleyen yazmaları göndermeyi dener.
  useEffect(() => {
    const onHide = () => [...pending.current.keys()].forEach((id) => void flush(id));
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  const apply = useCallback((id: string, patch: LocalPatch) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const { deleted: _deleted, ...rest } = patch;
        return { ...i, ...rest };
      }),
    );
  }, []);

  const patch = useCallback(
    (id: string, p: LocalPatch, opts?: { debounced?: boolean }) => {
      apply(id, p);
      const { completedAt: _completedAt, ...dbPatch } = p;
      // Başlık veritabanında boş olamaz; kullanıcı yazarken geçici boşluk yerelde kalır.
      if (dbPatch.title !== undefined && !dbPatch.title.trim()) delete dbPatch.title;
      const existing = pending.current.get(id);
      if (opts?.debounced) {
        if (existing) clearTimeout(existing.timer);
        const merged = { ...(existing?.patch ?? {}), ...dbPatch };
        pending.current.set(id, { patch: merged, timer: setTimeout(() => void flush(id), DEBOUNCE_MS) });
        return;
      }
      if (existing) {
        clearTimeout(existing.timer);
        pending.current.delete(id);
      }
      void enqueue(id, () => store.update(id, { ...(existing?.patch ?? {}), ...dbPatch }));
    },
    [apply, flush, store, enqueue],
  );

  const create = useCallback(
    (item: Item) => {
      setItems((prev) => [item, ...prev]);
      void enqueue(item.id, () => store.create(item));
    },
    [store, enqueue],
  );

  /** Yumuşak siler; geri almak için `restore(item)` çağrılır. */
  const remove = useCallback(
    (id: string): Item | undefined => {
      const item = items.find((i) => i.id === id);
      if (!item) return undefined;
      void flush(id).then(() => enqueue(id, () => store.update(id, { deleted: true })));
      setItems((prev) => prev.filter((i) => i.id !== id));
      return item;
    },
    [items, flush, store, enqueue],
  );

  const restore = useCallback(
    (item: Item) => {
      setItems((prev) => [item, ...prev]);
      void enqueue(item.id, () => store.update(item.id, { deleted: false }));
    },
    [store, enqueue],
  );

  /**
   * Dosyaları yükler, başarılı olanları öğenin `files` listesine ekler. Yükleme öğenin
   * oluşturulmasını beklemez; üst veri yazması aynı öğenin kuyruğunda, oluşturmadan sonra gider.
   * Başarısızlar tek tek bildirilir, diğerleri eklenir.
   */
  const attach = useCallback(
    async (id: string, files: File[]) => {
      const results = await Promise.all(
        files.map((f) =>
          store.uploadFile(id, f).catch(() => {
            onErrorRef.current(`“${f.name}” yüklenemedi`);
            return null;
          }),
        ),
      );
      const added = results.filter((r): r is FileRef => r !== null);
      const current = itemsRef.current.find((i) => i.id === id);
      if (!added.length || !current) {
        // Öğe bu arada silindiyse yetim kalan dosyaları temizle.
        if (!current) await Promise.all(added.map((f) => store.removeFile(f).catch(() => undefined)));
        return;
      }
      const next = [...current.files, ...added];
      apply(id, { files: next });
      void enqueue(id, () => store.update(id, { files: next }));
    },
    [store, apply, enqueue],
  );

  /** Önce listeden çıkarır; dosya yalnızca bu yazma başarılı olursa silinir. */
  const detach = useCallback(
    (id: string, file: FileRef) => {
      const current = itemsRef.current.find((i) => i.id === id);
      if (!current) return;
      const next = current.files.filter((f) => f.id !== file.id);
      apply(id, { files: next });
      void enqueue(id, async () => {
        await store.update(id, { files: next });
        await store.removeFile(file).catch(() => undefined);
      });
    },
    [store, apply, enqueue],
  );

  const reset = useCallback(async () => {
    if (store.reset) setItems(await store.reset());
  }, [store]);

  return { items, ready, revision, create, patch, remove, restore, attach, detach, reset, canReset: Boolean(store.reset) };
}

