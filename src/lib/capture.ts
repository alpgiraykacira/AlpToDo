import { addDays, isoDate, startOfToday } from "./dates";
import { firstOccurrence } from "./recurrence";
import { canonicalLabel, lower } from "./labels";
import type { Priority, Recurrence } from "./types";

/** Girişin sonundaki, henüz tamamlanmamış `@etiket` parçası. */
export const PENDING_LABEL = /(^|\s)@([\p{L}\p{N}_-]*)$/u;

export interface Parsed {
  title: string;
  priority: Priority;
  labels: string[];
  /** Bu girişle yeni oluşacak etiketler */
  fresh: string[];
  due: string | null;
  recurrence: Recurrence | null;
}

const WEEKDAY_WORDS: Record<string, number> = {
  pzt: 1, pazartesi: 1, sal: 2, salı: 2, çar: 3, çarşamba: 3, per: 4, perşembe: 4,
  cum: 5, cuma: 5, cmt: 6, cumartesi: 6, paz: 0, pazar: 0,
};
// Uzun kelimeler önce gelsin ("pazartesi", "paz"dan önce eşleşmeli).
const WD = Object.keys(WEEKDAY_WORDS).sort((a, b) => b.length - a.length).join("|");
const RECURRENCE = new RegExp(
  `\\sher\\s+(?:(\\d+)\\s+)?(gün|hafta|ay|yıl)(?=\\s)|\\sher\\s+((?:${WD})(?:\\s*(?:,|ve)\\s*(?:${WD}))*)(?=\\s)`,
  "iu",
);
const UNIT_WORDS = { gün: "day", hafta: "week", ay: "month", yıl: "year" } as const;

/**
 * Hızlı ekleme sözdizimi:
 *   !1..!4   öncelik
 *   @etiket  etiket (var olanla eşleşir, yoksa yeni oluşur). `#etiket` de kabul edilir.
 *   bugün | yarın | haftaya | pzt..paz   cümlenin sonunda tarih
 *   her gün | her hafta | her 2 hafta | her ay | her yıl | her pzt | her pzt,per   tekrar
 */
export function parseCapture(raw: string, knownLabels: string[]): Parsed {
  const out: Parsed = { title: "", priority: 0, labels: [], fresh: [], due: null, recurrence: null };
  let t = " " + raw + " ";

  t = t.replace(/\s!([1-4])(?=\s)/, (_, p: string) => {
    out.priority = Number(p) as Priority;
    return " ";
  });

  t = t.replace(/\s[@#]([\p{L}\p{N}_-]+)(?=\s)/gu, (_, g: string) => {
    const c = canonicalLabel(g, knownLabels);
    if (!out.labels.includes(c.name)) {
      out.labels.push(c.name);
      if (c.fresh) out.fresh.push(c.name);
    }
    return " ";
  });
  t = t.replace(/\s[@#]\s*$/, " ");

  // Tekrar, tarih kelimesinden önce çözülür: "her pzt" içindeki "pzt" tarih sayılmasın.
  t = t.replace(RECURRENCE, (_m, n: string | undefined, unit: string | undefined, days: string | undefined) => {
    if (unit) {
      out.recurrence = { unit: UNIT_WORDS[lower(unit) as keyof typeof UNIT_WORDS], every: Math.min(99, Math.max(1, Number(n ?? 1))), weekdays: [], from: "due" };
    } else if (days) {
      const set = new Set(days.split(/\s*(?:,|ve)\s*/i).map((w) => WEEKDAY_WORDS[lower(w.trim())]));
      out.recurrence = { unit: "week", every: 1, weekdays: [...set], from: "due" };
    }
    return " ";
  });

  t = t.replace(/\s(bugün|yarın|haftaya|pzt|sal|çar|per|cum|cmt|paz)\s*$/i, (_, w: string) => {
    const word = lower(w);
    if (word === "bugün") out.due = addDays(0);
    else if (word === "yarın") out.due = addDays(1);
    else if (word === "haftaya") out.due = addDays(7);
    else {
      const target = WEEKDAY_WORDS[word];
      out.due = addDays(((target - startOfToday().getDay() + 7) % 7) || 7);
    }
    return " ";
  });

  // Tekrar var ama tarih yok: ilk tarih bugün ya da sonraki uygun gün.
  if (out.recurrence && !out.due) out.due = firstOccurrence(out.recurrence, isoDate(startOfToday()));

  out.title = t.replace(/\s+/g, " ").trim();
  return out;
}

/** Öncelik ya da tarih varsa görev, sadece etiket varsa not, hiçbiri yoksa Inbox. */
export function captureDestination(p: Pick<Parsed, "priority" | "due" | "labels" | "recurrence">): "Görev" | "Not" | "Inbox" {
  if (p.priority || p.due || p.recurrence) return "Görev";
  return p.labels.length ? "Not" : "Inbox";
}
