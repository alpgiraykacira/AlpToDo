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

test("son 7 günde aynı tekrarlayan görevin iki tamamlaması ayrı sayılır", () => {
  const events = [recurred("r", "2026-10-27T09:00:00Z"), recurred("r", "2026-10-28T09:00:00Z")];
  assert.deepEqual(weeklyDone(events, TODAY, 1, utcDay), [2]);
});

test("olay yoksa her hafta sıfır", () => {
  assert.deepEqual(weeklyDone([], TODAY, 3, utcDay), [0, 0, 0]);
});

test("pencereler: son 7 gün en sağda, daha eskiler sola doğru", () => {
  const events = [
    done("a", "2026-10-21T09:00:00Z"), // 7 gün önce → pencere 1
    done("b", "2026-10-15T09:00:00Z"), // 13 gün önce → pencere 1
    done("c", "2026-10-14T09:00:00Z"), // 14 gün önce → pencere 2
    done("d", "2026-10-02T09:00:00Z"), // 26 gün önce → pencere 3
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 4, utcDay), [1, 1, 2, 0]);
});

test("bugün ve 6 gün önce sayılır, pencere dışı olaylar sayılmaz", () => {
  const events = [
    done("a", "2026-10-28T09:00:00Z"), // bugün → pencere 0
    done("b", "2026-10-22T09:00:00Z"), // 6 gün önce → pencere 0
    done("c", "2026-09-01T09:00:00Z"), // çok eski
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 3, utcDay), [0, 0, 2]);
});

test("geri alınan tamamlama düşer", () => {
  const events = [
    done("a", "2026-10-15T09:00:00Z"),
    undone("a", "2026-10-15T09:05:00Z"),
    done("b", "2026-10-15T10:00:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [1, 0]);
});

test("başka haftada geri alma, önceki tamamlamayı düşer", () => {
  const events = [done("a", "2026-10-15T09:00:00Z"), undone("a", "2026-10-27T09:00:00Z")];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 0]);
});

test("yeniden açıp bitirmede yalnızca geri alınmayan tamamlama sayılır", () => {
  const events = [
    done("a", "2026-10-15T09:00:00Z"),
    undone("a", "2026-10-16T09:00:00Z"),
    done("a", "2026-10-17T09:00:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [1, 0]);
});

test("tekrarlayan görev: her oluşum sayılır, geri alma düşer", () => {
  const events = [
    recurred("r", "2026-10-15T09:00:00Z"),
    recurred("r", "2026-10-20T09:00:00Z"),
    recurred("r", "2026-10-21T09:00:00Z"),
    recurredUndone("r", "2026-10-21T09:01:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [2, 0]);
});

test("pencere öncesindeki tamamlamayı geri alan olay hata vermez", () => {
  assert.deepEqual(weeklyDone([undone("x", "2026-10-15T09:00:00Z")], TODAY, 2, utcDay), [0, 0]);
});

test("olaylar sırasız gelse de zamana göre işlenir", () => {
  const events = [undone("a", "2026-10-15T09:05:00Z"), done("a", "2026-10-15T09:00:00Z")];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [0, 0]);
});

type CountedItem = NonNullable<Parameters<typeof weeklyDone>[4]>[number];
const item = (id: string, patch: Partial<CountedItem> = {}): CountedItem => ({
  id, inbox: false, status: "done", completedAt: "2026-10-28T09:00:00Z",
  recurrence: null, lastDoneAt: null, ...patch,
});
const daily = { unit: "day", every: 1, weekdays: [], from: "due" } as const;

test("aynı gün iki tekrar ve bir geri alma yalnızca bir tamamlama bırakır", () => {
  const events = [
    recurred("r", "2026-10-28T09:00:00Z"),
    recurred("r", "2026-10-28T10:00:00Z"),
    recurredUndone("r", "2026-10-28T10:01:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 1, utcDay), [1]);
});

test("son 7 günün olağan tamamlaması ve geri alması birbirini götürür", () => {
  assert.deepEqual(weeklyDone([
    done("a", "2026-10-28T09:00:00Z"), undone("a", "2026-10-28T09:01:00Z"),
  ], TODAY, 1, utcDay), [0]);
});

test("6 ve 7 gün sınırları doğru haftalara düşer; gelecek gün sayılmaz", () => {
  const events = [
    done("a", "2026-10-22T09:00:00Z"), done("b", "2026-10-21T09:00:00Z"),
    done("c", "2026-10-29T09:00:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 2, utcDay), [1, 1]);
});

test("hafta sınırı kullanıcının yerel gününe göre hesaplanır", () => {
  const events = [done("a", "2026-10-21T22:30:00Z")]; // İstanbul'da 22 Ekim
  const istanbulDay = (ts: string) => new Date(new Date(ts).getTime() + 3 * 3600e3).toISOString().slice(0, 10);
  assert.deepEqual(weeklyDone(events, TODAY, 2, istanbulDay), [0, 1]);
});

test("olay kaydı olmayan eski görev olaylarla aynı haftada ayrıca sayılır", () => {
  assert.deepEqual(weeklyDone([done("new", "2026-10-28T10:00:00Z")], TODAY, 1, utcDay, [
    item("new"), item("legacy"),
  ]), [2]);
});

test("olayı ve öğesi bulunan tekrar çift sayılmaz; silinen öğenin olayı korunur", () => {
  const events = [
    recurred("r", "2026-10-27T09:00:00Z"), recurred("r", "2026-10-28T09:00:00Z"),
    done("deleted", "2026-10-28T10:00:00Z"),
  ];
  assert.deepEqual(weeklyDone(events, TODAY, 1, utcDay, [item("r", {
    status: "todo", completedAt: null, recurrence: { ...daily, weekdays: [] }, lastDoneAt: "2026-10-28T09:00:00Z",
  })]), [3]);
});

test("geri alınan olay, eski öğe anlık görüntüsüyle yeniden sayılmaz", () => {
  assert.deepEqual(weeklyDone([
    done("a", "2026-10-28T09:00:00Z"), undone("a", "2026-10-28T09:01:00Z"),
  ], TODAY, 1, utcDay, [item("a")]), [0]);
});

test("demo: tekrarın yalnızca son tamamlaması sayılır; açık görev, Inbox ve tarihsizler sayılmaz", () => {
  assert.deepEqual(weeklyDone([], TODAY, 1, utcDay, [
    item("normal"),
    item("repeat", { status: "todo", completedAt: null, recurrence: { ...daily, weekdays: [] }, lastDoneAt: "2026-10-27T09:00:00Z" }),
    item("open", { status: "todo" }), item("inbox", { inbox: true }), item("undated", { completedAt: null }),
  ]), [2]);
});

