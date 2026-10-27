"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const back = (kind: "error" | "message", text: string): never =>
  redirect(`/login?${kind}=${encodeURIComponent(text)}`);

function credentials(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  };
}

export async function signIn(form: FormData) {
  const { email, password } = credentials(form);
  if (!email || !password) back("error", "E-posta ve şifre gerekli.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Hangi alanın yanlış olduğunu belli etmeyen tek bir mesaj.
  if (error) back("error", "E-posta ya da şifre hatalı.");
  redirect("/");
}

export async function signUp(form: FormData) {
  const { email, password } = credentials(form);
  if (!email || password.length < 8) back("error", "Geçerli bir e-posta ve en az 8 karakterlik şifre gerekli.");

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) back("error", "Kayıt yapılamadı. Kayıtlar kapalı olabilir ya da bu e-posta zaten kullanımda.");

  // E-posta doğrulaması açıksa oturum hemen açılmaz.
  if (!data.session) back("message", "Doğrulama bağlantısını e-postana gönderdik. Bağlantıya tıkladıktan sonra giriş yap.");
  redirect("/");
}
