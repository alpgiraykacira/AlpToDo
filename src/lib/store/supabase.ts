import { addDays } from "../dates";
import { DONE_EVENT_KINDS, type DoneEvent } from "../insights";
import { getBrowserClient } from "../supabase/client";
import type { FileRef, Meeting } from "../types";
import type { Store } from "./types";
import { patchToRow, rowToItem, type ItemRow } from "./rows";

interface EventRow {
  item_id: string;
  kind: DoneEvent["kind"];
  from_value: string | null;
  to_value: string | null;
  at: string;
}

interface MeetingRow {
  id: string;
  name: string;
  labels: string[];
  created_at: string;
}

interface MeetingNoteRow {
  id: string;
  meeting_id: string;
  note_date: string;
  body: string;
  created_at: string;
}

const BUCKET = "attachments";

export function supabaseStore(): Store {
  const sb = getBrowserClient();
  // Dosya yolu `<user_id>/<öğe>/<dosya>`; Storage RLS ilk parçayı JWT'deki kullanıcıyla karşılaştırır.
  const userId = async () => {
    const { data, error } = await sb.auth.getClaims();
    if (error || !data?.claims.sub) throw error ?? new Error("Oturum yok");
    return data.claims.sub;
  };
  return {
    async load() {
      const { data, error } = await sb
        .from("items")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data as ItemRow[]).map(rowToItem);
    },
    async create(item) {
      const { error } = await sb.from("items").insert({
        id: item.id,
        ...patchToRow(item),
      });
      if (error) throw error;
    },
    async update(id, patch) {
      const { error } = await sb.from("items").update(patchToRow(patch)).eq("id", id);
      if (error) throw error;
    },
    async uploadFile(itemId, file) {
      const id = crypto.randomUUID();
      const path = `${await userId()}/${itemId}/${id}`;
      const type = file.type || "application/octet-stream";
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false });
      if (error) throw error;
      return { id, name: file.name, type, size: file.size, path } satisfies FileRef;
    },
    async fileUrl(file, download) {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .createSignedUrl(file.path, 60, download ? { download: file.name } : undefined);
      if (error) throw error;
      return data.signedUrl;
    },
    async removeFile(file) {
      const { error } = await sb.storage.from(BUCKET).remove([file.path]);
      if (error) throw error;
    },
    async loadMeetings() {
      const [m, n] = await Promise.all([
        sb.from("meetings").select("id, name, labels, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
        sb.from("meeting_notes").select("id, meeting_id, note_date, body, created_at").order("note_date", { ascending: false }).limit(5000),
      ]);
      if (m.error) throw m.error;
      if (n.error) throw n.error;
      const byId = new Map<string, Meeting>();
      for (const r of m.data as MeetingRow[]) {
        byId.set(r.id, { id: r.id, name: r.name, labels: r.labels, createdAt: r.created_at, notes: [] });
      }
      for (const r of n.data as MeetingNoteRow[]) {
        byId.get(r.meeting_id)?.notes.push({ id: r.id, date: r.note_date, body: r.body, createdAt: r.created_at });
      }
      return [...byId.values()];
    },
    async createMeeting(meeting) {
      const { error } = await sb.from("meetings").insert({ id: meeting.id, name: meeting.name, labels: meeting.labels });
      if (error) throw error;
    },
    async updateMeeting(id, patch) {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.labels !== undefined) row.labels = patch.labels;
      if (patch.deleted !== undefined) row.deleted_at = patch.deleted ? new Date().toISOString() : null;
      const { error } = await sb.from("meetings").update(row).eq("id", id);
      if (error) throw error;
    },
    async saveMeetingNote(meetingId, note) {
      const { error } = await sb
        .from("meeting_notes")
        .upsert({ id: note.id, meeting_id: meetingId, note_date: note.date, body: note.body });
      if (error) throw error;
    },
    async removeMeetingNote(id) {
      const { error } = await sb.from("meeting_notes").delete().eq("id", id);
      if (error) throw error;
    },
    async doneHistory(weeks) {
      const since = new Date(`${addDays(-(7 * weeks - 1))}T00:00:00`).toISOString();
      const rows: EventRow[] = [];
      // PostgREST'in satır sınırı sayımı kesmesin. Eşzamanlı olaylarda id sabit sıra sağlar.
      const pageSize = 1000;
      for (let offset = 0; ; ) {
        const { data, error, count } = await sb
          .from("item_events")
          .select("item_id, kind, from_value, to_value, at", { count: "exact" })
          .in("kind", [...DONE_EVENT_KINDS])
          .gte("at", since)
          .order("at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data.length) break;
        rows.push(...(data as EventRow[]));
        offset += data.length;
        if (count !== null && offset >= count) break;
        if (count === null && data.length < pageSize) break;
      }
      return rows.map((r) => ({
        itemId: r.item_id,
        kind: r.kind,
        from: r.from_value,
        to: r.to_value,
        at: r.at,
      }));
    },
  };
}

