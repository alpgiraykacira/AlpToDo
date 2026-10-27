export type Status = "todo" | "doing" | "waiting" | "done";
export type Priority = 0 | 1 | 2 | 3 | 4;

export type RecurrenceUnit = "day" | "week" | "month" | "year";

/**
 * Tekrar kuralı. `from: "due"` sonraki tarihi bitiş tarihinden, `"done"` tamamlandığı günden hesaplar.
 * `weekdays` yalnızca haftalık kuralda anlamlı (0 = Pazar ... 6 = Cumartesi); boşsa bitiş tarihinin günü.
 */
export interface Recurrence {
  unit: RecurrenceUnit;
  every: number;
  weekdays: number[];
  from: "due" | "done";
}

export interface ChecklistEntry {
  t: string;
  d: boolean;
}

/** Uygulamanın kullandığı biçim. Veritabanı satırından `store/supabase.ts` içinde dönüştürülür. */
export interface Item {
  id: string;
  title: string;
  body: string;
  /** null ise düz not, doluysa görev. */
  status: Status | null;
  priority: Priority;
  /** YYYY-MM-DD (yerel tarih) */
  due: string | null;
  labels: string[];
  pinned: boolean;
  inbox: boolean;
  secret: boolean;
  checklist: ChecklistEntry[];
  /** Tekrarlayan görev kuralı. Varsa `due` dolu olmalıdır. */
  recurrence: Recurrence | null;
  /** Tekrarlayan görevin en son tamamlandığı an (ISO). Sunucu tarafında trigger belirler. */
  lastDoneAt: string | null;
  /** ISO zaman damgası */
  createdAt: string;
  /** ISO zaman damgası. Sunucu tarafında trigger belirler. */
  completedAt: string | null;
}

/** Güncellenebilen alanlar. `deleted` yumuşak silmeyi (deleted_at) ifade eder. */
export type ItemPatch = Partial<Omit<Item, "id" | "createdAt" | "completedAt">> & {
  deleted?: boolean;
};

/** Arayüzün iyimser durumu için yama; completedAt sunucuda belirlenir, veritabanına gönderilmez. */
export type LocalPatch = ItemPatch & { completedAt?: string | null };

export type ViewKey = "inbox" | "today" | "upcoming" | "all" | "notes" | "board" | "insights";

export const STATUS_LABEL: Record<Status, string> = {
  todo: "Yapılacak",
  doing: "Sürüyor",
  waiting: "Bekliyor",
  done: "Bitti",
};

export const PRIORITY_LABEL: Record<Exclude<Priority, 0>, string> = {
  1: "P1 · Acil",
  2: "P2 · Yüksek",
  3: "P3 · Normal",
  4: "P4 · Düşük",
};
