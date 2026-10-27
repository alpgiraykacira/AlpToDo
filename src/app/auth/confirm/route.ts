import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** E-postadaki doğrulama bağlantısının indiği yer. Supabase e-posta şablonu bu adresi göstermeli (README). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/", origin));
  }
  const url = new URL("/login", origin);
  url.searchParams.set("error", "Doğrulama bağlantısı geçersiz ya da süresi dolmuş.");
  return NextResponse.redirect(url);
}
