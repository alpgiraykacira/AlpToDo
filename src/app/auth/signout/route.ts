import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303: POST'tan sonra GET ile yönlendir.
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), 303);
}
