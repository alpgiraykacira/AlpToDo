import assert from "node:assert/strict";
import { test } from "node:test";
import { isNote, rules } from "./rules.ts";
import type { Item, Recurrence } from "./types.ts";

const base: Item = {
  id: "x", title: "t", body: "", status: null, priority: 0, due: null, labels: [], pinned: false,
  inbox: false, secret: false, checklist: [], files: [], recurrence: null, lastDoneAt: null,
  createdAt: "2026-10-28T09:00:00Z", completedAt: null,
};
const daily: Recurrence = { unit: "day", every: 1, weekdays: [], from: "due" };

test("ayıklanmış not: durum, öncelik, tarih ve tekrar değişikliği hiçbir şey yapmaz", () => {
  assert.equal(isNote(base), true);
  assert.deepEqual(rules.status(base, "todo"), {});
  assert.deepEqual(rules.status(base, "done"), {});
  assert.deepEqual(rules.priority(base, 1), {});
  assert.deepEqual(rules.due(base, "2026-11-05"), {});
  assert.deepEqual(rules.recurrence(base, daily), {});
});

test("inbox öğesi not değildir; öncelik ya da tarih verilince göreve döner", () => {
  const inbox = { ...base, inbox: true };
  assert.equal(isNote(inbox), false);
  assert.equal(rules.priority(inbox, 2).status, "todo");
  assert.equal(rules.due(inbox, "2026-11-05").status, "todo");
});

test("görev kuralları değişmedi", () => {
  const task = { ...base, status: "todo" as const };
  assert.equal(isNote(task), false);
  assert.equal(rules.status(task, "done").status, "done");
  assert.equal(rules.priority(task, 3).priority, 3);
});
