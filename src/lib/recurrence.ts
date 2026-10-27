import type { Recurrence } from "./types";

// Tüm hesaplar YYYY-MM-DD metinleri ve UTC üzerinden yapılır: yaz/kış saati ve saat dilimi etkisi olmaz.

const DAY = 864e5;
const toDays = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
};
const fromDays = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
const addDaysIso = (iso: string, n: number) => fromDays(toDays(iso) + n);
const weekday = (iso: string) => new Date(toDays(iso) * DAY).getUTCDay(); // 0 = Pazar

/** Ay sonunu aşan günü o ayın son gününe çeker (31 Oca + 1 ay = 28/29 Şub). */
function addMonthsIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = m - 1 + n;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return fromDays(Date.UTC(year, month, Math.min(d, last)) / DAY);
}

/** Pazartesi = 0 ... Pazar = 6 */
const mondayIndex = (wd: number) => (wd + 6) % 7;

function step(rule: Recurrence, from: string): string {
  switch (rule.unit) {
    case "day":
      return addDaysIso(from, rule.every);
    case "month":
      return addMonthsIso(from, rule.every);
    case "year":
      return addMonthsIso(from, 12 * rule.every);
    case "week": {
      if (!rule.weekdays.length) return addDaysIso(from, 7 * rule.every);
      const days = rule.weekdays.map(mondayIndex).sort((a, b) => a - b);
      const now = mondayIndex(weekday(from));
      const later = days.find((d) => d > now);
      if (later !== undefined) return addDaysIso(from, later - now);
      // Haftanın kalan günlerinde yok: `every` hafta sonrasının ilk günü.
      return addDaysIso(from, 7 * rule.every - now + days[0]);
    }
  }
}

/**
 * Tamamlanan bir tekrarlayan görevin sonraki bitiş tarihi (her zaman `today`'den sonra).
 * - from "due":  kuralın düzenini korur. Geciken görevde geçmiş tarihleri atlar.
 * - from "done": tamamlandığı günden itibaren sayar.
 */
export function nextOccurrence(rule: Recurrence, due: string, today: string): string {
  let next = step(rule, rule.from === "done" ? today : due);
  for (let guard = 0; next <= today && guard < 20000; guard++) next = step(rule, next);
  return next;
}

/** Kural ilk kez atandığında ve görevin tarihi yoksa kullanılacak ilk tarih (bugün ya da sonraki uygun gün). */
export function firstOccurrence(rule: Recurrence, today: string): string {
  if (rule.unit !== "week" || !rule.weekdays.length) return today;
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(today, i);
    if (rule.weekdays.includes(weekday(d))) return d;
  }
  return today;
}

const UNIT_TR = { day: "gün", week: "hafta", month: "ay", year: "yıl" } as const;
const DAY_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function describeRecurrence(rule: Recurrence): string {
  let text: string;
  if (rule.unit === "week" && rule.weekdays.length) {
    const days = [...rule.weekdays].sort((a, b) => mondayIndex(a) - mondayIndex(b)).map((d) => DAY_TR[d]);
    text = `Her ${days.join(", ")}${rule.every > 1 ? ` (${rule.every} haftada bir)` : ""}`;
  } else {
    text = rule.every === 1 ? `Her ${UNIT_TR[rule.unit]}` : `Her ${rule.every} ${UNIT_TR[rule.unit]}`;
  }
  return rule.from === "done" ? `${text} · tamamlanınca` : text;
}

export const DEFAULT_RULE: Recurrence = { unit: "week", every: 1, weekdays: [], from: "due" };
