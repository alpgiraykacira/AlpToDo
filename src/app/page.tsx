import { redirect } from "next/navigation";
import App from "@/components/App";
import { rowToItem, type ItemRow } from "@/lib/store/rows";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export default async function Home() {
  if (!hasSupabase) return <App mode="demo" />;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");

  // RLS yalnızca bu kullanıcının satırlarını döndürür.
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error("Öğeler yüklenemedi");

  return (
    <App
      mode="supabase"
      email={typeof auth.claims.email === "string" ? auth.claims.email : undefined}
      initial={(data as ItemRow[]).map(rowToItem)}
    />
  );
}
