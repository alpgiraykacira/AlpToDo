import { localDay } from "./dates.ts";
import type { Item } from "./types.ts";

/** `item_events` satırının analiz için gereken kısmı. */
export interface DoneEvent {
  itemId: string;
  kind: "status" | "recurred" | "recurred_undone";
  from: string | null;
  to: string | null;
  at: string;
}

/** `kind` filtresi: store bu üç türü çeker, `weeklyDone` yalnızca bunları anlar. */
export const DONE_EVENT_KINDS = ["status", "recurred", "recurred_undone"] as const;

const dayIndex = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};

/**
 * Bugünden geriye 7'şer günlük pencerelerde tamamlanan görev sayısı, eskiden yeniye.
 * Son değer bugün dahil son 7 gündür; tekrarlayan görevin her tamamlaması ayrı sayılır.
 *
 * Tamamlama: `status` → done ya da `recurred`. Geri alma (done'dan çıkış ya da `recurred_undone`) aynı öğenin
 * en son tamamlamasını düşer; böylece yanlışlıkla işaretleyip geri alınan görev sayılmaz.
 * `dayOf` zaman damgasını gün metnine çevirir (varsayılan: yerel saat dilimi).
 * Olayı olmayan eski öğeler (ve demo verisi) son tamamlanma tarihinden eklenir.
 * Bir öğenin olayları varsa öğeden tekrar eklenmez; geri alınmış bir tamamlama da geri gelmez.
 */
export function weeklyDone(
  events: DoneEvent[], today: string, weeks: number, dayOf = localDay,
  items: Pick<Item, "id" | "inbox" | "status" | "completedAt" | "recurrence" | "lastDoneAt">[] = [],
): number[] {
  const open = new Map<string, string[]>();
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  for (const e of sorted) {
    const stack = open.get(e.itemId) ?? [];
    if ((e.kind === "status" && e.to === "done") || e.kind === "recurred") stack.push(e.at);
    else if ((e.kind === "status" && e.from === "done") || e.kind === "recurred_undone") stack.pop();
    open.set(e.itemId, stack);
  }

  for (const item of items) {
    if (item.inbox || open.has(item.id)) continue;
    const at = item.status === "done" ? item.completedAt : item.recurrence ? item.lastDoneAt : null;
    if (at) open.set(item.id, [at]);
  }

  const counts = new Array<number>(weeks).fill(0);
  const todayIndex = dayIndex(today);
  for (const stack of open.values()) {
    for (const at of stack) {
      const window = Math.floor((todayIndex - dayIndex(dayOf(at))) / 7);
      if (window >= 0 && window < weeks) counts[weeks - 1 - window] += 1;
    }
  }
  return counts;
}

