import { dayDiff } from "./dates.ts";
import { canonicalLabel } from "./labels.ts";
import type { Meeting, MeetingNote } from "./types.ts";

/** En yeni toplantı tarihi üstte; aynı gün içinde sonradan eklenen üstte. */
export function sortedNotes(m: Pick<Meeting, "notes">): MeetingNote[] {
  return [...m.notes].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

/** Listede toplantıları son notun tarihine göre dizer; notu olmayan yeni toplantı en üste çıkar. */
export function sortedMeetings(meetings: Meeting[]): Meeting[] {
  const key = (m: Meeting) => sortedNotes(m)[0]?.date ?? "9999-99-99";
  return [...meetings].sort((a, b) => key(b).localeCompare(key(a)) || b.createdAt.localeCompare(a.createdAt));
}

/** Liste satırındaki özet: notun ilk dolu satırı, madde işareti olmadan. */
export function previewLine(note: Pick<MeetingNote, "body">): string {
  for (const line of note.body.split("\n")) {
    const t = line.replace(/^\s*[-*]\s+(\[[ xX]\]\s+)?/, "").trim();
    if (t) return t;
  }
  return "";
}

/** "bugün", "dün", "3 gün önce", "2 hafta önce"... Gelecek tarih de olabilir (toplantı önceden hazırlanır). */
export function relativeDay(date: string): string {
  const d = -dayDiff(date);
  if (d === 0) return "bugün";
  if (d === 1) return "dün";
  if (d === -1) return "yarın";
  if (d < 0) return `${-d} gün sonra`;
  if (d < 14) return `${d} gün önce`;
  if (d < 60) return `${Math.round(d / 7)} hafta önce`;
  return `${Math.round(d / 30)} ay önce`;
}

/** "@ekip #haftalık, aylık" → var olan etiketlerle eşleşen, tekrarsız liste. */
export function parseMeetingLabels(raw: string, known: string[]): { labels: string[]; fresh: string[] } {
  const labels: string[] = [];
  const fresh: string[] = [];
  for (const part of raw.split(/[\s,]+/)) {
    const t = part.replace(/^[@#]+/, "");
    if (!t) continue;
    const c = canonicalLabel(t, [...known, ...labels]);
    if (labels.includes(c.name)) continue;
    labels.push(c.name);
    if (c.fresh) fresh.push(c.name);
  }
  return { labels, fresh };
}

export interface NoteBlock {
  kind: "p" | "li" | "todo";
  text: string;
  /** Satırın metindeki sırası (0'dan); `toggleTodo` bununla işaretler. */
  line: number;
  /** Yalnızca yapılacak işte: `- [x]` ile işaretlenmiş. */
  done: boolean;
}

/** Not metnini satırlara ayırır: "- madde", "- [ ] yapılacak iş" ve düz paragraf. */
export function noteBlocks(body: string): NoteBlock[] {
  const out: NoteBlock[] = [];
  body.split("\n").forEach((raw, line) => {
    const m = raw.match(/^\s*[-*]\s+(\[([ xX])\]\s+)?(.*)$/);
    if (m) {
      if (m[3].trim()) out.push({ kind: m[1] ? "todo" : "li", text: m[3].trim(), line, done: m[2] === "x" || m[2] === "X" });
    } else if (raw.trim()) {
      out.push({ kind: "p", text: raw.trim(), line, done: false });
    }
  });
  return out;
}

/** `line` numaralı satırdaki yapılacak işin kutusunu işaretler ya da kaldırır; başka bir satıra dokunmaz. */
export function toggleTodo(body: string, line: number): string {
  return body
    .split("\n")
    .map((raw, i) => {
      if (i !== line) return raw;
      return raw.replace(/^(\s*[-*]\s+)\[([ xX])\]/, (_, head: string, mark: string) => `${head}[${mark === " " ? "x" : " "}]`);
    })
    .join("\n");
}
