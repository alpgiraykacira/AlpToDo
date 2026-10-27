import { getBrowserClient } from "../supabase/client";
import type { Store } from "./types";
import { patchToRow, rowToItem, type ItemRow } from "./rows";

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
  };
}
