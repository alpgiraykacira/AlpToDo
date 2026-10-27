import assert from "node:assert/strict";
import { test } from "node:test";
import { describeRecurrence, firstOccurrence, nextOccurrence } from "./recurrence.ts";
import type { Recurrence } from "./types.ts";

const rule = (r: Partial<Recurrence>): Recurrence => ({ unit: "week", every: 1, weekdays: [], from: "due", ...r });

// 2026-10-27 Salı
test("her hafta: bitiş tarihine 7 gün ekler", () => {
  assert.equal(nextOccurrence(rule({}), "2026-10-27", "2026-10-27"), "2026-11-03");
});

test("erken tamamlama: bir sonraki oluşuma geçer, bugüne değil", () => {
  assert.equal(nextOccurrence(rule({}), "2026-11-03", "2026-10-27"), "2026-11-10");
});

test("geciken görev: düzeni korur ama geçmiş tarihleri atlar", () => {
  // Pazartesi tekrarı, 5 hafta gecikmiş; bugün Salı 27 Ekim → sonraki Pazartesi 2 Kasım
  assert.equal(nextOccurrence(rule({}), "2026-09-21", "2026-10-27"), "2026-11-02");
});

test("tamamlanınca modu: bugünden sayar", () => {
  assert.equal(nextOccurrence(rule({ from: "done", every: 6 }), "2026-10-01", "2026-10-27"), "2026-12-08");
});

test("her gün ve her N gün", () => {
  assert.equal(nextOccurrence(rule({ unit: "day" }), "2026-10-27", "2026-10-27"), "2026-10-28");
  assert.equal(nextOccurrence(rule({ unit: "day", every: 3 }), "2026-10-27", "2026-10-27"), "2026-10-30");
});

test("aylık: ay sonu kısalırsa son güne çeker", () => {
  assert.equal(nextOccurrence(rule({ unit: "month" }), "2026-01-31", "2026-01-31"), "2026-02-28");
  assert.equal(nextOccurrence(rule({ unit: "month" }), "2028-01-31", "2028-01-31"), "2028-02-29");
  assert.equal(nextOccurrence(rule({ unit: "month" }), "2026-12-15", "2026-12-15"), "2027-01-15");
});

test("yıllık: 29 Şubat artık olmayan yılda 28 Şubat olur", () => {
  assert.equal(nextOccurrence(rule({ unit: "year" }), "2028-02-29", "2028-02-29"), "2029-02-28");
});

test("belirli günler: Pzt ve Per", () => {
  const r = rule({ weekdays: [1, 4] });
  assert.equal(nextOccurrence(r, "2026-10-26", "2026-10-26"), "2026-10-29"); // Pzt → Per
  assert.equal(nextOccurrence(r, "2026-10-29", "2026-10-29"), "2026-11-02"); // Per → sonraki Pzt
});

test("belirli günler, 2 haftada bir: hafta atlar", () => {
  const r = rule({ weekdays: [1, 4], every: 2 });
  assert.equal(nextOccurrence(r, "2026-10-29", "2026-10-29"), "2026-11-09"); // Per → 2 hafta sonraki Pzt
});

test("Pazar günü hafta sonunda sayılır (hafta Pazartesi başlar)", () => {
  const r = rule({ weekdays: [0, 1] }); // Pzt ve Paz
  assert.equal(nextOccurrence(r, "2026-11-01", "2026-11-01"), "2026-11-02"); // Paz → ertesi Pzt
  assert.equal(nextOccurrence(r, "2026-11-02", "2026-11-02"), "2026-11-08"); // Pzt → o haftanın Pazar'ı
});

test("yıl sonunu aşan hesap", () => {
  assert.equal(nextOccurrence(rule({ unit: "day" }), "2026-12-31", "2026-12-31"), "2027-01-01");
});

test("firstOccurrence: günler seçiliyse bugün ya da sonraki uygun gün", () => {
  assert.equal(firstOccurrence(rule({ weekdays: [4] }), "2026-10-27"), "2026-10-29"); // Salı → Perşembe
  assert.equal(firstOccurrence(rule({ weekdays: [2] }), "2026-10-27"), "2026-10-27"); // bugün Salı
  assert.equal(firstOccurrence(rule({}), "2026-10-27"), "2026-10-27");
});

test("describeRecurrence", () => {
  assert.equal(describeRecurrence(rule({})), "Her hafta");
  assert.equal(describeRecurrence(rule({ every: 2, unit: "day" })), "Her 2 gün");
  assert.equal(describeRecurrence(rule({ weekdays: [4, 1] })), "Her Pzt, Per");
  assert.equal(describeRecurrence(rule({ unit: "month", from: "done" })), "Her ay · tamamlanınca");
});
