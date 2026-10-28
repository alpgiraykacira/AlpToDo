# AlpToDo

İş notları, görevler ve öncelikler için kişisel çalışma alanı. Not ve görev aynı öğedir:
durum, öncelik ya da tarih verirsen not göreve dönüşür. Etiketler `@` ile verilir, var olanla
eşleşir, yoksa yeni oluşur.

Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth + RLS) · Vercel.

## Hızlı ekleme sözdizimi

| Yazdığın | Anlamı |
|---|---|
| `!1` … `!4` | Öncelik (P1 acil … P4 düşük) |
| `@etiket` | Etiket. Var olanla eşleşir (büyük/küçük harf ve Türkçe karakter fark etmez), yoksa yeni oluşur. `Tab` otomatik tamamlar. |
| `dün` `bugün` `yarın` `haftaya` `pzt` … `paz` | Bitiş tarihi (cümlenin sonunda) |
| `her gün` `her hafta` `her 2 hafta` `her ay` `her yıl` | Tekrar |
| `her pzt` `her pzt,per` `her pazartesi ve perşembe` | Belirli günlerde tekrar |

Örnek: `Haftalık rapor gönder her cuma !2 @rapor`. Öncelik, tarih ya da tekrar varsa **görev**,
sadece etiket varsa **not**, hiçbiri yoksa **Inbox** olur.

## Tekrarlayan görevler

Tekrarlayan bir görevi tamamlayınca "Bitti"ye geçmez: bitiş tarihi sonraki oluşuma kayar, alt maddeler
sıfırlanır ve görev "Yapılacak"a döner. Bildirimdeki **Geri al** eski haline döndürür. Her tamamlama
`item_events` tablosuna `recurred` olarak yazılır (analiz için).

Sonraki tarih iki şekilde hesaplanır (görev detayında "Sonraki"):

- **Bitiş tarihine göre** (varsayılan): kuralın düzenini korur. 3 hafta geciken "her Pazartesi" görevi
  tamamlanınca geçmiş Pazartesileri atlayıp bir sonraki Pazartesi'ye gelir.
- **Tamamladığım günden**: "6 haftada bir saç kesimi" gibi, aralık tamamlama gününden sayılır.

Haftalık kuralda gün seçilebilir (Pzt + Per gibi). Aylık kuralda ay sonu kısalırsa son güne çekilir
(31 Ocak → 28 Şubat). Tekrarlayan görevin bitiş tarihi olmak zorunda; tarihi silersen kural da kalkar.

## Hemen dene (Supabase olmadan)

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` yoksa uygulama **demo modunda** açılır: giriş yok, örnek veri var, her şey
yalnızca tarayıcının `localStorage`'ında durur. Arayüzü denemek içindir, gerçek veri koyma.

## Supabase'e bağla

1. [supabase.com](https://supabase.com) üzerinde proje oluştur. **Bölge: EU (Frankfurt)** öneririm (KVKK).
2. Şemayı kur. İki yoldan biri:
   - Dashboard → SQL Editor'e `supabase/migrations/` altındaki dosyaları **tarih sırasıyla** (önce `..._init.sql`, sonra `..._recurrence.sql`) yapıştırıp çalıştır.
   - Ya da Supabase CLI ile: `supabase link --project-ref <ref> && supabase db push`
3. `.env.example` dosyasını `.env.local` olarak kopyala ve Project Settings → API'den iki değeri doldur:
   `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   **service_role / secret key'i bu projeye koyma.** Uygulama onu hiç kullanmaz.
4. Authentication ayarları (Dashboard → Authentication):
   - **URL Configuration:** Site URL'ini ve (Vercel'e çıkınca) production adresini Redirect URLs'e ekle.
   - **Email templates → Confirm signup:** şablonu düzenlemek özel SMTP gerektirir. Varsayılan şablonla da
     çalışır: `/auth/confirm` hem varsayılan bağlantıdaki `code` parametresini hem de özelleştirilmiş
     şablonun `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` biçimini karşılar.
     Varsayılan akışta bağlantı, kayıt olunan tarayıcıda açılmalı (PKCE çerezi orada).
   - Redirect URLs'e `/auth/confirm` yolunu içeren adresi ekle (örn. `http://localhost:3000/**`); listede yoksa
     Supabase bağlantıyı Site URL'ye yönlendirir.
   - **İlk hesabını oluşturduktan sonra** Providers → Email → "Allow new users to sign up" seçeneğini kapat.
     Arkadaşlarını davet etmek istediğinde Dashboard'dan davet et ya da geçici olarak aç.
   - İsteğe bağlı: Authentication → Multi-Factor'dan TOTP'yi aç (arayüzü henüz yok, aşağıya bak).
5. `npm run dev`. Giriş sayfası gelir, hesabınla gir.

## Vercel'e yayınla

Repoyu GitHub'a at, Vercel'de içe aktar ve iki ortam değişkenini (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) Project Settings → Environment Variables'a gir.
Başka ayar gerekmez. Yayın adresini Supabase Redirect URLs listesine eklemeyi unutma.

## Güvenlik modeli

- Tüm veri `items` tablosunda; her satırın sahibi `user_id`. **Row Level Security** açık:
  bir kullanıcı yalnızca kendi satırını okur/yazar. Bu, uygulama kodundaki bir hatadan bağımsız,
  veritabanı seviyesinde zorlanır.
- Tarayıcı yalnızca publishable key ile ve kullanıcının JWT'siyle konuşur. Yetkili bir anahtar yok.
- `anon` rolünün hiçbir tabloya erişimi yok. `item_events` tablosuna istemci yazamaz, sadece trigger yazar.
- `completed_at`, `updated_at` ve `user_id` sunucuda belirlenir; istemci değiştiremez.
- Oturum çerezleri `@supabase/ssr` ile yönetilir; `proxy.ts` her istekte JWT'yi imzasıyla doğrular
  (`getClaims`) ve girişsiz isteği `/login`'e yollar.
- Güvenlik başlıkları `next.config.ts` içinde (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, ...).
- Yazı tipleri paket olarak yerelden sunulur; tarayıcı üçüncü taraf bir sunucuya istek atmaz.

Testler:

```bash
npm test           # alan mantığı: tekrar tarihi hesabı (ay sonu, geciken görev, haftanın günleri...)
npm run test:db    # geçici Postgres kurar, migration'ları uygular, RLS ve trigger'ları sınar
```

## Veri modeli

| Tablo | Amaç |
|---|---|
| `items` | Not ve görev. `status` null ise not. Etiketler `text[]`, kullanımdan türetilir. Tekrar kuralı `recurrence` (jsonb). Yumuşak silme (`deleted_at`). |
| `item_events` | Durum, öncelik, tarih, etiket, tekrar tamamlama ve silme değişikliklerinin geçmişi. Analiz ekranı bunu kullanacak. |

Etiketleri `text[]` olarak tuttum: sorgusu basit ve ayrı tablo gerektirmiyor. Bedeli: bir etiketi
yeniden adlandırmak tüm satırları güncellemeyi gerektirir (ileride bir SQL fonksiyonu olur).

## Kod haritası

```
supabase/migrations/   şema, trigger'lar, RLS
supabase/tests/        migration testleri (run.sh + rls.sql)
src/proxy.ts           oturum yenileme ve giriş zorunluluğu
src/app/               sayfalar: ana ekran (sunucuda veri yükler), /login, /auth/*
src/lib/               alan mantığı (etiket eşleşmesi, hızlı ekleme ayrıştırıcı, görünümler)
src/lib/store/         veri katmanı: Supabase ve demo gerçekleştirmesi, aynı arayüz
src/lib/useItems.ts    iyimser güncelleme, yazmaları birleştirme, hatada geri alma
src/components/        arayüz
```

## Bilinen eksikler ve sonraki adımlar

- **Gerçek bir Supabase projesiyle uçtan uca denenmedi.** Veritabanı tarafı (migration, RLS, trigger'lar)
  gerçek Postgres'te test edildi; giriş yönlendirmesi ve proxy sahte bir adresle denendi; arayüz demo
  modunda tarayıcıyla denendi. Supabase'e ilk bağlandığında giriş, kayıt ve yazma akışını bir kez elle dene.
- **Analiz ekranı** bugün dahil son 8 haftayı `item_events` kayıtlarından hesaplar. Tekrarlayan görevin
  her tamamlaması ayrı sayılır, geri alınanlar düşülür; silinen görevlerin geçmişi korunur. Olay kaydı
  olmayan eski görevler son tamamlanma tarihinden eklenir. Demo modunda olay geçmişi olmadığı için
  tekrarlayan görevlerin yalnızca son tamamlanması sayılabilir.
- **Gizli not** şimdilik sadece arayüzde saklanıyor. Gerçek uçtan uca şifreleme (içerik tarayıcıda şifrelenir,
  sunucu okuyamaz) ayrı bir iş; bu notlarda sunucu tarafı arama ve analiz çalışmaz.
- TOTP/passkey arayüzü yok (Supabase tarafında etkinleştirilebiliyor).
- CSP başlığı yok (nonce desteği gerekir).
- Birden fazla cihazda canlı eşitleme (Realtime) yok; sayfa yenilenince güncel veri gelir.
- 2000'den fazla öğede sayfalama yok.
- Çevrimdışı kullanım / PWA yok.
- Etiket yeniden adlandırma ve hesap silme arayüzü yok.

