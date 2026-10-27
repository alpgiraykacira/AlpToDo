// Next.js yalnızca `process.env.NEXT_PUBLIC_X` biçimindeki düz erişimleri tarayıcı paketine gömer;
// bu yüzden dinamik anahtar kullanılmıyor.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Değişkenler yoksa uygulama giriş istemeyen, verisini tarayıcıda tutan demo modunda açılır. */
export const hasSupabase = Boolean(supabaseUrl && supabaseKey);
