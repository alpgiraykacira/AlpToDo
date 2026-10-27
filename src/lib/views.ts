import { addDays, dayDiff, localDay } from "./dates";
import { isOpen, isTask } from "./rules";
import type { Item, ViewKey } from "./types";

export interface Group {
  label: string;
  tone?: "late";
  items: Item[];
}

export interface Filters {
  priority: number;
  label: string;
}

/** Önceliğe, sonra tarihe, sonra eklenme sırasına göre. */
export const byPriority = (x: Item, y: Item) =>
  (x.priority || 5) - (y.priority || 5) ||
  (x.due ?? "9999").localeCompare(y.due ?? "9999") ||
  Date.parse(y.createdAt) - Date.parse(x.createdAt);

export const passesFilters = (i: Item, f: Filters) =>
  (!f.priority || i.priority === f.priority) && (!f.label || i.labels.includes(f.label));

export function counts(items: Item[]) {
  const triaged = items.filter((i) => !i.inbox);
  return {
    inbox: items.filter((i) => i.inbox).length,
    today: triaged.filter((i) => isOpen(i) && i.due !== null && dayDiff(i.due) <= 0).length,
    all: triaged.filter(isOpen).length,
    notes: triaged.filter((i) => !isTask(i)).length,
    late: triaged.filter((i) => isOpen(i) && i.due !== null && dayDiff(i.due) < 0).length,
  };
}

export function groupsFor(view: ViewKey, items: Item[], filters: Filters): Group[] {
  const f = items.filter((i) => !i.inbox && passesFilters(i, filters));
  const open = f.filter(isOpen);
  switch (view) {
    case "inbox":
      return [{ label: "Ayıklanmayı bekleyenler", items: items.filter((i) => i.inbox) }];
    case "today":
      return [
        { label: "Geciken", tone: "late", items: open.filter((i) => i.due && dayDiff(i.due) < 0).sort(byPriority) },
        { label: "Bugün", items: open.filter((i) => i.due && dayDiff(i.due) === 0).sort(byPriority) },
        { label: "Sabitlenen notlar", items: f.filter((i) => !isTask(i) && i.pinned) },
        {
          label: "Bugün biten",
          items: f.filter((i) => i.status === "done" && i.completedAt && localDay(i.completedAt) === addDays(0)),
        },
      ];
    case "upcoming": {
      const d = (i: Item) => (i.due ? dayDiff(i.due) : null);
      return [
        { label: "Yarın", items: open.filter((i) => d(i) === 1).sort(byPriority) },
        { label: "Bu hafta", items: open.filter((i) => (d(i) ?? 0) >= 2 && (d(i) ?? 0) <= 7).sort(byPriority) },
        { label: "Daha sonra", items: open.filter((i) => (d(i) ?? 0) > 7).sort(byPriority) },
        { label: "Tarihsiz", items: open.filter((i) => d(i) === null).sort(byPriority) },
      ];
    }
    case "notes":
      return [
        { label: "Sabitlenen", items: f.filter((i) => !isTask(i) && i.pinned) },
        { label: "Diğer notlar", items: f.filter((i) => !isTask(i) && !i.pinned) },
      ];
    default:
      return [
        { label: "Sürüyor", items: f.filter((i) => i.status === "doing").sort(byPriority) },
        { label: "Yapılacak", items: f.filter((i) => i.status === "todo").sort(byPriority) },
        { label: "Bekliyor", items: f.filter((i) => i.status === "waiting").sort(byPriority) },
        { label: "Notlar", items: f.filter((i) => !isTask(i)) },
        {
          label: "Bitti",
          items: f
            .filter((i) => i.status === "done")
            .sort((x, y) => (y.completedAt ?? "").localeCompare(x.completedAt ?? ""))
            .slice(0, 4),
        },
      ];
  }
}

/** Notlar için liste önizlemesi: başlık satırlarını atlar, gizli notta içeriği göstermez. */
export function snippet(i: Item): string {
  if (i.secret) return "Gizli not";
  return (
    i.body
      .split("\n")
      .filter((l) => !l.startsWith("#"))
      .map((l) => l.replace(/^[-*\s]+/, "").replace(/\*\*|`/g, ""))
      .find(Boolean) ?? ""
  );
}
