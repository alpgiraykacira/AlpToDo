import { isoDate, startOfToday } from "./dates";
import { firstOccurrence, nextOccurrence } from "./recurrence";
import type { Item, ItemPatch, Priority, Recurrence, Status } from "./types";

export const isTask = (i: Item) => i.status !== null;
export const isOpen = (i: Item) => i.status !== null && i.status !== "done";

const todayIso = () => isoDate(startOfToday());

/**
 * Alan değişikliklerinin yan etkileri. Sunucudaki trigger'lar completed_at'i zaten
 * belirler; burası arayüzün iyimser (optimistic) durumunu aynı kurallarla günceller.
 */
export const rules = {
  status(i: Item, status: Status | null): ItemPatch & { completedAt?: string | null } {
    // Tekrarlayan görev "bitti" olmaz: tarihi sonraki oluşuma kayar, alt maddeler sıfırlanır.
    if (status === "done" && i.recurrence && i.due) {
      return {
        status: "todo",
        inbox: false,
        due: nextOccurrence(i.recurrence, i.due, todayIso()),
        checklist: i.checklist.map((c) => ({ ...c, d: false })),
        lastDoneAt: new Date().toISOString(),
      };
    }
    return {
      status,
      ...(status ? { inbox: false } : {}),
      completedAt: status === "done" ? new Date().toISOString() : null,
    };
  },
  priority(i: Item, priority: Priority): ItemPatch {
    return priority ? { priority, inbox: false, status: i.status ?? "todo" } : { priority };
  },
  due(i: Item, due: string | null): ItemPatch {
    if (!due) return { due: null, recurrence: null }; // tarihsiz görev tekrarlayamaz
    return { due, inbox: false, status: i.status ?? "todo" };
  },
  recurrence(i: Item, recurrence: Recurrence | null): ItemPatch {
    if (!recurrence) return { recurrence: null };
    return {
      recurrence,
      inbox: false,
      status: i.status ?? "todo",
      due: i.due ?? firstOccurrence(recurrence, todayIso()),
    };
  },
};
