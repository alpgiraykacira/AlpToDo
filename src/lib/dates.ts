const DAY = 864e5;
export const WEEKDAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Yerel saat dilimine göre YYYY-MM-DD */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(n: number): string {
  const d = startOfToday();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Bugüne göre gün farkı. Negatif: geçmiş. */
export function dayDiff(date: string): number {
  return Math.round((new Date(date + "T00:00:00").getTime() - startOfToday().getTime()) / DAY);
}

export const localDay = (ts: string) => isoDate(new Date(ts));

export function fmtDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Tam an: "5 Kas 2026 14:32" */
export function fmtTimestamp(ts: string): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })} ${fmtTime(d)}`;
}

/** Listeler için kısa an: "Bugün 14:32", "Dün 09:05", "3 Kas 14:32"; başka yıldaysa "3 Kas 2025". */
export function fmtStamp(ts: string): string {
  const d = new Date(ts);
  const n = dayDiff(isoDate(d));
  if (n === 0) return `Bugün ${fmtTime(d)}`;
  if (n === -1) return `Dün ${fmtTime(d)}`;
  if (d.getFullYear() !== new Date().getFullYear()) {
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  }
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${fmtTime(d)}`;
}

export function todayHeading(): string {
  return new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

export type DueTone = "" | "late" | "today";

export function dueLabel(date: string, done = false): { text: string; tone: DueTone } {
  const n = dayDiff(date);
  if (n === 0) return { text: "Bugün", tone: "today" };
  if (n === 1) return { text: "Yarın", tone: "" };
  if (n === -1) return { text: "Dün", tone: done ? "" : "late" };
  if (n < -1) return { text: `${-n} gün gecikti`, tone: done ? "" : "late" };
  if (n < 7) return { text: WEEKDAYS[new Date(date + "T00:00:00").getDay()], tone: "" };
  return { text: fmtDate(date), tone: "" };
}
