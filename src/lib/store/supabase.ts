import { addDays } from "../dates";
import { DONE_EVENT_KINDS, type DoneEvent } from "../insights";
import { getBrowserClient } from "../supabase/client";
import type { FileRef } from "../types";
import type { Store } from "./types";
import { patchToRow, rowToItem, type ItemRow } from "./rows";

interface EventRow {
  item_id: string;
  kind: DoneEvent["kind"];
  from_value: string | null;
  to_value: string | null;
  at: string;
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

