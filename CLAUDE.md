# AlpToDo: proje notları (Claude için)

İş notları, görevler ve öncelikler için kişisel çalışma alanı. Tek kullanıcıyla başladı, altyapı baştan
**çok kullanıcılı** (arkadaşlar da kullanabilir). Kullanıcı Türkçe konuşuyor: arayüz metinleri, kod
yorumları, commit mesajları ve README Türkçe. Kodun okunur ve sade kalmasını, çevresindeki kodun
diline/yoğunluğuna uymasını bekliyor.

Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth + RLS) · Vercel.
Kod yazmadan önce `AGENTS.md`'yi oku: Next.js 16'da eski bilgilerin bir kısmı geçersiz. Güncel
dokümanlar `node_modules/next/dist/docs/` altında. Örnek: `middleware.ts` artık **`src/proxy.ts`**.

## Komutlar

```bash
npm run dev          # http://localhost:3000 (.env.local yoksa demo modu)
npm run build
npm run typecheck    # tsc --noEmit
npm test             # alan mantığı testleri (node --test, TS doğrudan çalışır)
npm run test:db      # geçici Postgres kurar, migration'ları + RLS/trigger testlerini çalıştırır
```

Bir değişiklik bitmeden `typecheck`, `test` ve (veritabanına dokunduysan) `test:db` geçmeli.

## Ortam

`.env.local` (repoda yok, `.gitignore`'da): `NEXT_PUBLIC_SUPABASE_URL` ve
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Şablon: `.env.example`.
İkisi de yoksa uygulama **demo modunda** açılır: giriş yok, örnek veri, her şey `localStorage`'da.
Arayüz geliştirirken en hızlı yol bu.

## Güvenlik kuralları (değiştirme, tartış)

- **Repo public.** Commit'e anahtar, token, parola, gerçek Supabase proje adresi, kişisel/kurumsal veri,
  e-posta koyma. Commit'ten önce `git diff --cached` ile bak.
- Tarayıcı yalnızca **publishable key** ve kullanıcının JWT'siyle konuşur. **`service_role` / secret key
  bu projede hiç kullanılmaz** ve asla eklenmemeli.
- Veri izolasyonu **veritabanında** (RLS) zorlanır, uygulama koduna güvenilmez. `anon` rolünün hiçbir
  erişimi yok. `item_events` tablosuna istemci yazamaz, yalnızca trigger yazar.
- `completed_at`, `updated_at`, `last_done_at` ve `user_id` sunucuda belirlenir; istemci değiştiremez.
- `src/proxy.ts` her istekte `getClaims()` ile JWT'yi imzasıyla doğrular (çerezdeki veriye körü körüne
  güvenmez) ve girişsiz isteği `/login`'e yollar.
- Kullanıcı hassas not tutacak. "Gizli not" (`secret`) şimdilik **sadece arayüzde** saklıyor, gerçek
  şifreleme değil. Bunu şifrelenmiş gibi sunma.

## Veritabanı

`supabase/migrations/`, tarih sırasıyla: `20261027000000_init.sql`, `20261028000000_recurrence.sql`.
**Kullanıcı ikisini de Supabase'e uyguladı. Uygulanmış bir migration'ı düzenleme**, yeni bir dosya ekle
(`YYYYMMDDHHMMSS_ad.sql`) ve `supabase/tests/rls.sql` içinde `\i` ile yükle.

- `items`: not ve görev tek tablo. **`status` null ise not.** Etiketler `text[]` (`labels`), kullanımdan
  türetilir (ayrı etiket tablosu yok; yeniden adlandırma için ileride bir SQL fonksiyonu gerekir).
  Yumuşak silme: `deleted_at`. Tekrar kuralı: `recurrence jsonb`.
- `item_events`: durum, öncelik, tarih, etiket, `recurred`/`recurred_undone`, silme geçmişi. Analiz
  ekranının önceki haftaları bunu kullanıyor (`Store.doneHistory`, hesap `src/lib/insights.ts`).
- Trigger'lar: `items_before_write` (updated_at, completed_at, last_done_at'i sunucu belirler),
  `items_log_events` (olay kaydı, `security definer`).
- Yeni tabloya her zaman RLS aç, `anon` yetkisini kaldır, `authenticated`'a yalnızca gerekeni ver
  (Supabase projesinde "otomatik expose" kapalı, yetkileri migration kendisi veriyor).

## Kod haritası

```
src/proxy.ts            oturum yenileme + giriş zorunluluğu
src/app/page.tsx        sunucuda veriyi yükler (Supabase) ya da demo modunu açar
src/app/login, auth/*   giriş, kayıt, e-posta doğrulama (/auth/confirm), çıkış (POST /auth/signout)
src/lib/types.ts        Item, Recurrence, ItemPatch/LocalPatch
src/lib/rules.ts        alan değişikliklerinin yan etkileri (tek yer: durum/öncelik/tarih/tekrar)
src/lib/views.ts        görünümlerin gruplanması (Inbox, Bugün, Yaklaşan, Tümü, Notlar)
src/lib/capture.ts      hızlı ekleme ayrıştırıcısı (`parseCapture`) ve not ekleme ayrıştırıcısı (`parseNote`, yalnızca etiket)
src/lib/labels.ts       etiket eşleştirme (norm/canonicalLabel)
src/lib/recurrence.ts   sonraki tarih hesabı (saf fonksiyonlar, testli)
src/lib/insights.ts     item_events'ten haftalık tamamlanan sayısı (weeklyDone, saf, testli)
src/lib/cursor.ts       liste imleci: satır/kart odağı (data-rid), j/k ile gezinme; kısayollar App.tsx içinde, sayfa Shortcuts.tsx
src/lib/store/          Store arayüzü: supabase.ts (gerçek) ve demo.ts (localStorage). rows.ts = satır eşlemesi
src/lib/useItems.ts     iyimser güncelleme, debounce'lu yazma, hatada geri alma
src/components/         App (durum + yerleşim), Sidebar, Capture, NoteCapture, ListView, Board, Detail, Insights, Palette, Shortcuts
```

Veri katmanı `Store` arayüzünün arkasında; bileşenler Supabase'i doğrudan çağırmaz.

## Alan kararları (neden böyle)

- **Not = görev, sadece `status` farkı.** Not'a durum/öncelik/tarih/tekrar verilince göreve dönüşür.
  Kurallar `rules.ts` içinde, başka yere dağıtma. Notlar görünümünde ayrı ekleme alanı var
  (`NoteCapture`: başlık, içerik, etiket); orada `!1`, "yarın" gibi görev sözdizimi ayrıştırılmaz, not hiç göreve dönüşmez.
- **Inbox:** hızlı eklemede öncelik/tarih/tekrar varsa görev, sadece etiket varsa not, hiçbiri yoksa Inbox.
  Inbox'tan "Bugün" (göreve çevirip bugüne atar) ya da "Not" ile çıkarılır.
- **Etiket:** `@etiket` (ve `#etiket`). Küçük harf, aksansız karşılaştırılır (`toplanti` = `toplantı`);
  eşleşme yoksa yeni etiket oluşur. Yazarken Tab ile mevcut etiketlerden tamamlanır.
- **Öncelik:** 0 (yok) ve P1 (acil) … P4 (düşük). Aynı gün içinde P1'den P4'e sıralanır.
- **Tekrarlayan görev:** tamamlanınca "Bitti"ye geçmez; `due` sonraki oluşuma kayar, alt maddeler sıfırlanır,
  durum `todo`, `lastDoneAt` set edilir, bildirimde "Geri al" var. Mod: `from: "due"` (düzeni korur,
  geciken görevde geçmiş tarihleri atlar) ya da `"done"` (tamamlandığı günden sayar). Tekrarlayan görevin
  `due`'su zorunlu (DB constraint); tarihi silmek kuralı da kaldırır. Hafta Pazartesi başlar.
  Sonraki tarihi şimdilik **istemci hesaplar**, DB yalnızca doğrular ve olayı yazar.
- **Tarihler:** yerel saat dilimine göre `YYYY-MM-DD` metni. `recurrence.ts` UTC üzerinde metinle hesaplar
  (saat dilimi/yaz saati etkisi olmasın diye).
- **Hydration:** `App` içeriği yalnızca tarayıcıda çizilir (`mounted` kapısı), çünkü "Bugün/Dün" gibi
  etiketler sunucu ile tarayıcı saat diliminde farklı çıkabilir. Kaldırma.
- **Yazı tipleri** `@fontsource` paketleriyle yerelden sunulur (üçüncü taraf istek yok, build ağa bağlı değil).

## Test durumu: dürüst özet

Yapıldı:
- Tekrar tarihi hesabı: 13 birim testi, haftalık tamamlanan hesabı: 9 birim testi (`npm test`).
- Migration + RLS + trigger'lar **gerçek Postgres 16**'da (`npm run test:db`): başka kullanıcının veriyi
  görememesi/yazamaması, sunucu tarafı zaman damgaları, olay kayıtları, kısıtlar. RLS bilerek bozulunca
  testin başarısız olduğu görüldü.
- Arayüz **demo modunda** Playwright ile denendi (hızlı ekleme, etiket eşleşmesi, düzenleme, sürükle-bırak,
  arama, silip geri alma, tekrar tamamlama/geri alma, telefon görünümü).
- `proxy.ts` yönlendirmesi ve güvenlik başlıkları sahte bir Supabase adresiyle denendi.
- **Gerçek Supabase projesine karşı (localhost):** kayıt, varsayılan şablonla e-posta doğrulama (`/auth/confirm?code=`),
  giriş, `getClaims` ile oturum, görev ekleme/tamamlama ve yenilemeden sonra verinin kalması. `item_events`'e
  `created` ve `status` (todo → done) satırları düştü (SQL Editor'den görüldü). İkinci hesap birincinin görevini
  görmedi (RLS izolasyonu gerçek projede de çalışıyor).

**Yapılmadı:**
- **Yayın (`https://alptodo.vercel.app`) yapıldı;** `curl` ile `/` → `/login` yönlendirmesi, güvenlik başlıkları ve
  `/auth/confirm` hata yolu görüldü. Yayında giriş, görev ekleme ve yenilemeden sonra verinin kalması kullanıcı
  tarafından elle denendi, çalıştı. Yayın adresiyle gelen **doğrulama bağlantısı hâlâ denenmedi** (kayıt,
  yerleşik SMTP'nin saatte 2 e-posta sınırına takıldı).
- Özel SMTP kurulmadı. Yeni hesap için bir saat beklemek ya da Dashboard → Authentication → Users → Add user
  (Auto Confirm) gerekir. Başka kullanıcı eklenecekse önce özel SMTP kur.
- Çok cihazda canlı eşitleme, çevrimdışı kullanım, 2000+ öğede sayfalama yok (`load()` en fazla 2000 çeker).

## Bilinen eksikler / sıradaki adımlar

1. Yayında kayıt + doğrulama bağlantısını dene (SMTP sınırı dolunca ya da özel SMTP ile).
2. Arkadaşlar eklenecekse: özel SMTP (Brevo ya da uygulama parolalı Gmail/iCloud; Resend alan adı ister), sonra
   (isteğe bağlı) Confirm signup şablonu `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
   Varsayılan şablon da çalışır (`/auth/confirm` `code` parametresini karşılar). İlk hesaplardan sonra yeni
   kayıtları kapat. Vercel işlevleri için bölgeyi Supabase'e yakın (Frankfurt/`fra1`) seçmek isteğe bağlı.
3. **Analiz ekranı** 8 haftalık grafik: her hafta `items`'tan hesaplanır (biten görevler `completedAt`, tekrarlayanlar
   son `lastDoneAt`). Önceki 7 haftada `item_events` varsa (`Store.doneHistory`; demo'da `null`) hafta başına
   **olay sayısı ile öğe sayısının büyüğü** alınır: olay kaydı yeni tutulmaya başlandı, öncesi yalnızca öğelerde
   var; olaylar da silinenleri ve tekrarlayanların eski oluşumlarını ekler. Bilinen sınırlar: "Son 7 gün"
   tekrarlayanda yalnızca son tamamlamayı, silinenleri hiç saymaz; PostgREST tek istekte 1000 satır verir, fazla
   olayda en eski haftalar eksik kalır. Demo yolu (yalnızca öğeler) arayüzde denendi; olay+öğe birleşimi (Supabase) arayüzde
   **denenmedi**, sıfırdan farklı geçmiş değerler gerçek veride **görülmedi** (olay mantığı birim testli).
   Sıradaki analizler (`Insights.tsx` altındaki liste) henüz yok.
4. Gerçek uçtan uca şifreleme (gizli notlar için; sunucu tarafı arama/analiz bu notlarda çalışmaz).
5. TOTP/passkey arayüzü, CSP başlığı (nonce gerekir), etiket yeniden adlandırma, hesap silme.

## Tuzaklar / notlar

- `pkill -f "next start"` gibi kalıpları, komutun kendisinde geçiyorsa kabuğu da öldürür. PID ile kapat.
- Demo store anahtarları (`sira.demo.v1`, `sira.theme`) ürün adı değişse de **bilerek** `sira.*` kaldı;
  değiştirmek kullanıcının demo verisini ve tema tercihini sıfırlar.
- `node --test` TypeScript'i doğrudan çalıştırır; bu yüzden test dosyaları ve `recurrence.ts` içe aktarmalarında
  `.ts` uzantısı var ve `tsconfig.json`'da `allowImportingTsExtensions` açık.
- Commit kimliği repoya yerel git yapılandırmasında: GitHub kullanıcı adı `alpgiraykacira` ve `noreply`
  e-postası. İş e-postasını kullanma. İlk commit (`bd273df`) `Claude <noreply@anthropic.com>` yazarıyla
  duruyor; zaten push edilmişti, yeniden yazmak force push gerektirir.
