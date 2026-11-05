import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays } from "./dates.ts";
import { noteBlocks, parseMeetingLabels, toggleTodo, previewLine, relativeDay, sortedMeetings, sortedNotes } from "./meetings.ts";
import type { Meeting } from "./types.ts";

const note = (id: string, date: string, createdAt: string) => ({ id, date, body: "", createdAt });
const meeting = (id: string, createdAt: string, notes: Meeting["notes"] = []): Meeting => ({ id, name: id, labels: [], createdAt, notes });

test("notlar tarihe göre en yeni üstte; aynı gün sonradan eklenen üstte", () => {
  const m = meeting("m", "2026-01-01T00:00:00Z", [
    note("a", "2026-10-22", "2026-10-22T10:00:00Z"),
    note("b", "2026-11-05", "2026-11-05T09:00:00Z"),
    note("c", "2026-11-05", "2026-11-05T12:00:00Z"),
    note("d", "2026-10-29", "2026-10-29T10:00:00Z"),
  ]);
  assert.deepEqual(sortedNotes(m).map((n) => n.id), ["c", "b", "d", "a"]);
});

test("geçmişe tarihli not eklemek sıralamayı bozmaz", () => {
  const m = meeting("m", "2026-01-01T00:00:00Z", [
    note("yeni", "2026-11-05", "2026-11-05T09:00:00Z"),
    note("eski", "2026-09-01", "2026-11-06T09:00:00Z"),
  ]);
  assert.deepEqual(sortedNotes(m).map((n) => n.id), ["yeni", "eski"]);
});

test("toplantılar son not tarihine göre; notsuz yeni toplantı en üstte", () => {
  const a = meeting("a", "2026-01-01T00:00:00Z", [note("1", "2026-11-03", "2026-11-03T00:00:00Z")]);
  const b = meeting("b", "2026-01-02T00:00:00Z", [note("2", "2026-11-05", "2026-11-05T00:00:00Z")]);
  const c = meeting("c", "2026-11-06T00:00:00Z");
  assert.deepEqual(sortedMeetings([a, b, c]).map((m) => m.id), ["c", "b", "a"]);
});

test("özet: ilk dolu satır, madde işaretleri ve onay kutusu atılır", () => {
  assert.equal(previewLine({ body: "\n- [ ] Teklifi gönder\n- diğer" }), "Teklifi gönder");
  assert.equal(previewLine({ body: "Genel durum iyi" }), "Genel durum iyi");
  assert.equal(previewLine({ body: "  \n " }), "");
});

test("göreli gün", () => {
  assert.equal(relativeDay(addDays(0)), "bugün");
  assert.equal(relativeDay(addDays(-1)), "dün");
  assert.equal(relativeDay(addDays(1)), "yarın");
  assert.equal(relativeDay(addDays(-5)), "5 gün önce");
  assert.equal(relativeDay(addDays(-21)), "3 hafta önce");
  assert.equal(relativeDay(addDays(-90)), "3 ay önce");
  assert.equal(relativeDay(addDays(4)), "4 gün sonra");
});

test("etiketler var olanlarla eşleşir, tekrarsızdır, yeniler işaretlenir", () => {
  const r = parseMeetingLabels("@Toplanti #ekip, ekip @Yeni", ["toplantı"]);
  assert.deepEqual(r.labels, ["toplantı", "ekip", "yeni"]);
  assert.deepEqual(r.fresh, ["ekip", "yeni"]);
  assert.deepEqual(parseMeetingLabels("  ", []).labels, []);
});

test("not metni: madde, yapılacak iş ve paragraf", () => {
  assert.deepEqual(noteBlocks("Genel\n- bir\n- [ ] iki\n* üç\n\n- "), [
    { kind: "p", text: "Genel", line: 0, done: false },
    { kind: "li", text: "bir", line: 1, done: false },
    { kind: "todo", text: "iki", line: 2, done: false },
    { kind: "li", text: "üç", line: 3, done: false },
  ]);
});

test("yapılacak iş kutusu işaretlenir, geri alınır; yalnızca o satır değişir", () => {
  const body = "Genel\n- [ ] bir\n- [ ] iki\n- madde [ ] değil";
  const once = toggleTodo(body, 2);
  assert.equal(once, "Genel\n- [ ] bir\n- [x] iki\n- madde [ ] değil");
  assert.deepEqual(noteBlocks(once).filter((b) => b.kind === "todo").map((b) => b.done), [false, true]);
  assert.equal(toggleTodo(once, 2), body);
  assert.equal(toggleTodo(body, 3), body, "onay kutusu olmayan satır değişmez");
  assert.equal(toggleTodo(body, 0), body);
});
