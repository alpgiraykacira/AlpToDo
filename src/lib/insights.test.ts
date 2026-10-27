import assert from "node:assert/strict";
import { test } from "node:test";
import { weeklyDone, type DoneEvent } from "./insights.ts";

// Testler saat diliminden bağımsız olsun diye gün, zaman damgasının UTC tarihinden alınır.
const utcDay = (ts: string) => ts.slice(0, 10);
const TODAY = "2026-10-28";

const done = (itemId: string, at: string): DoneEvent => ({ itemId, kind: "status", from: "todo", to: "done", at });
const undone = (itemId: string, at: string): DoneEvent => ({ itemId, kind: "status", from: "done", to: "todo", at });
const recurred = (itemId: string, at: string): DoneEvent => ({ itemId, kind: "recurred", from: null, to: null, at });
const recurredUndone = (itemId: string, at: string): DoneEvent => ({ itemId, kind: "recurred_undone", from: null, to: null, at });

test("olay yoksa her hafta sıfır", () => {
  assert.deepEqual(weeklyDone([], TODAY, 3, utcDay), [0, 0, 0]);
});

test("pencereler: 7-13 gün önce en sağda, daha eskiler sola doğru", () => {
  const events = [
    done("a", "2026-10-21T09:00:00Z"), // 7 gün önce → pencere 1 (en sağ)
    done("b", "2026-10-15T09:00:00Z"), // 13 gün önce → pencere 1
    done("c", "2026-10-14T09:00:00Z"), // 14 gün önce → pencere 2
    done("d", "2026-10-02T09:00:00Z"), // 26 gün önce → pencere 3
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 3, utcDay), [1, 1, 2]);
});

test("son 7 gün (bugün dahil) ve pencere dışı olaylar sayılmaz", () => {
  const events = [
    done("a", "2026-10-28T09:00:00Z"), // bugün → pencere 0
    done("b", "2026-10-22T09:00:00Z"), // 6 gün önce → pencere 0
    done("c", "2026-09-01T09:00:00Z"), // çok eski
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 3, utcDay), [0, 0, 0]);
});

test("geri alınan tamamlama düşer", () => {
  const events = [
    done("a", "2026-10-15T09:00:00Z"),
    undone("a", "2026-10-15T09:05:00Z"),
    done("b", "2026-10-15T10:00:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 1]);
});

test("başka haftada geri alma, önceki tamamlamayı düşer", () => {
  const events = [done("a", "2026-10-15T09:00:00Z"), undone("a", "2026-10-27T09:00:00Z")];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 0]);
});

test("aynı görev iki kez tamamlanırsa iki sayılır (yeniden açıp bitirme)", () => {
  const events = [
    done("a", "2026-10-15T09:00:00Z"),
    undone("a", "2026-10-16T09:00:00Z"),
    done("a", "2026-10-17T09:00:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 1]);
});

test("tekrarlayan görev: her oluşum sayılır, geri alma düşer", () => {
  const events = [
    recurred("r", "2026-10-15T09:00:00Z"),
    recurred("r", "2026-10-20T09:00:00Z"),
    recurred("r", "2026-10-21T09:00:00Z"),
    recurredUndone("r", "2026-10-21T09:01:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 2]);
});

test("pencere öncesindeki tamamlamayı geri alan olay hata vermez", () => {
  assert.deepEqual(weeklyDone([undone("x", "2026-10-15T09:00:00Z")], TODAY, 2, utcDay), [0, 0]);
});

test("olaylar sırasız gelse de zamana göre işlenir", () => {
  const events = [undone("a", "2026-10-15T09:05:00Z"), done("a", "2026-10-15T09:00:00Z")];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 0]);
});
