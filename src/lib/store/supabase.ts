import { addDays } from "../dates";
import { DONE_EVENT_KINDS, weeklyDone, type DoneEvent } from "../insights";
import { getBrowserClient } from "../supabase/client";
import type { Store } from "./types";
import { patchToRow, rowToItem, type ItemRow } from "./rows";

interface EventRow {
  item_id: string;
  kind: DoneEvent["kind"];
  from_value: string | null;
  to_value: string | null;
  at: string;
}

export function supabaseStore(): Store {
  const sb = getBrowserClient();
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
    async doneHistory(weeks) {
      // En eski pencerenin ilk gününden itibaren. Fazla satır gelirse (PostgREST üst sınırı) kesilen en eski olaylar olsun.
      const since = new Date(`${addDays(-(7 * weeks + 6))}T00:00:00`).toISOString();
      const { data, error } = await sb
        .from("item_events")
        .select("item_id, kind, from_value, to_value, at")
        .in("kind", [...DONE_EVENT_KINDS])
        .gte("at", since)
        .order("at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const events = (data as EventRow[]).map((r) => ({
        itemId: r.item_id,
        kind: r.kind,
        from: r.from_value,
        to: r.to_value,
        at: r.at,
      }));
      return weeklyDone(events, addDays(0), weeks);
    },
  };
}
