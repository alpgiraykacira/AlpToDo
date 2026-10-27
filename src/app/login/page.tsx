import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  if (!hasSupabase) redirect("/");
  const { error, message } = await searchParams;

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="2" y="4" width="20" height="4" rx="2" />
            <rect x="2" y="10" width="14" height="4" rx="2" opacity=".7" />
            <rect x="2" y="16" width="8" height="4" rx="2" opacity=".45" />
          </svg>
          AlpToDo
        </div>
        <div>
          <h1>Giriş yap</h1>
          <p>Notların ve görevlerin sadece sana ait.</p>
        </div>
        {error && <div className="auth-msg err" role="alert">{error}</div>}
        {message && <div className="auth-msg" role="status">{message}</div>}
        <form>
          <label>
            E-posta
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Şifre
            <input name="password" type="password" autoComplete="current-password" minLength={8} required />
          </label>
          <div className="auth-actions">
            <button className="btn" formAction={signIn}>Giriş yap</button>
            <button className="btn ghost" formAction={signUp}>Hesap oluştur</button>
          </div>
        </form>
      </div>
    </main>
  );
}
