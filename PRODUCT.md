# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Önce yazarın kendisi, sonra yakın arkadaşları: davetli, küçük bir çevre (herkese açık ürün değil).
Bilgi çalışanları; gün boyunca iş notu ve görev yakalar, öncelik sıralar. Altyapı baştan çok kullanıcılı,
ama kullanım kişisel çalışma alanı ölçeğinde.

## Product Purpose

İş notları, görevler ve öncelikler için kişisel çalışma alanı. Not ve görev tek öğedir; durum, öncelik,
tarih ya da tekrar verilince not göreve dönüşür. Başarı: düşünceyi ya da işi sürtünmesiz yakalamak ve
günün/haftanın neyin üstüne olduğunu net görmek.

## Positioning

Henüz onaylanmadı (kullanıcı bir seçim yapmadı). Depodan çıkan, doğrulanmamış adaylar: not = görev tek
öğe modeli, tek satırda Türkçe hızlı ekleme sözdizimi, veritabanında (RLS) zorlanan veri izolasyonu,
haftalık analiz.

## Operating Context

- Uygulama Operate modunda bir araç: yakalama (hızlı ekleme), görünümler (Inbox, Bugün, Yaklaşan, Tümü,
  Notlar), pano, görev detayı, komut paleti, analiz ekranı.
- Demo modu (Supabase yapılandırması yokken): giriş yok, örnek veri, `localStorage`. Arayüz geliştirmenin
  en hızlı yolu.
- Dağıtım: Vercel + Supabase (Postgres, Auth, RLS).

## Capabilities and Constraints

- Arayüz metinleri Türkçe; Türkçe karakterler doğru çıkmalı. Etiket eşleşmesi küçük harf ve aksansız
  (`toplanti` = `toplantı`).
- Öncelik: P0 (yok) ve P1 (acil) … P4 (düşük).
- Tekrarlayan görev tamamlanınca "Bitti"ye geçmez; tarih sonraki oluşuma kayar, "Geri al" vardır.
- "Gizli not" yalnızca arayüzde saklanır, gerçek şifreleme değildir; şifrelenmiş gibi sunulmamalı.
- Repo public: kişisel/kurumsal veri, anahtar ve gerçek proje adresi içeriğe girmez.
- Tarihler yerel saat dilimine göre; "Bugün/Dün" gibi etiketler yalnızca tarayıcıda çizilir.

## Brand Commitments

Ürün adı AlpToDo. Yazı tipleri yerelden sunulur (üçüncü taraf istek yok). Ek marka taahhüdü
belirtilmedi.

## Evidence on Hand

Gerçek kullanım verisi, müşteri ya da kanıt yok; uydurulmamalı. Örnek veri yalnızca demo modundadır.

## Product Principles

- Yakalama anında sürtünme sıfıra yakın olmalı; sınıflandırma sonradan ve gerektiğinde yapılır.
- Not ile görev arasında duvar yok; öğe yalnızca davrandığı kadar göreve dönüşür.
- Güvenlik ve dürüstlük yüzeyde de geçerli: güvence verilmeyen şey güvence veriyormuş gibi görünmez.
- Veri sahibi kullanıcıdır; izolasyon veritabanında zorlanır, arayüze güvenilmez.

## Accessibility & Inclusion

Klavye öncelikli: yakalama, gezinme ve komut paleti fareye gitmeden kullanılabilmeli. Başka bir
erişilebilirlik standardı belirtilmedi.
