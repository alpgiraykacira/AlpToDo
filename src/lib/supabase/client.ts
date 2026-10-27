import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Tarayıcıdaki tek istemci. Sorgular kullanıcının JWT'siyle gider, erişimi RLS sınırlar. */
export function getBrowserClient() {
  client ??= createBrowserClient(supabaseUrl!, supabaseKey!);
  return client;
}
