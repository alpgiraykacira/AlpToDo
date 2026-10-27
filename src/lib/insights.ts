import { localDay } from "./dates.ts";

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
 * Bugünden geriye 7'şer günlük pencerelerde tamamlanan görev sayısı, eskiden yeniye. Son 7 günlük pencere
 * (bugün dahil) hariç tutulur: o, ekrandaki öğelerden hesaplanır. Yani sonuncu değer 7-13 gün önceki haftadır.
 *
 * Tamamlama: `status` → done ya da `recurred`. Geri alma (done'dan çıkış ya da `recurred_undone`) aynı öğenin
 * en son tamamlamasını düşer; böylece yanlışlıkla işaretleyip geri alınan görev sayılmaz.
 * `dayOf` zaman damgasını gün metnine çevirir (varsayılan: yerel saat dilimi).
 */
export function weeklyDone(events: DoneEvent[], today: string, weeks: number, dayOf = localDay): number[] {
  const open = new Map<string, string[]>();
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  for (const e of sorted) {
    const stack = open.get(e.itemId) ?? [];
    if ((e.kind === "status" && e.to === "done") || e.kind === "recurred") stack.push(e.at);
    else if ((e.kind === "status" && e.from === "done") || e.kind === "recurred_undone") stack.pop();
    open.set(e.itemId, stack);
  }

  const counts = new Array<number>(weeks).fill(0);
  const todayIndex = dayIndex(today);
  for (const stack of open.values()) {
    for (const at of stack) {
      const window = Math.floor((todayIndex - dayIndex(dayOf(at))) / 7);
      if (window >= 1 && window <= weeks) counts[weeks - window] += 1;
    }
  }
  return counts;
}
