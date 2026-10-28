---
name: AlpToDo
description: Soğuk gri zemin, tek camgöbeği vurgu, mono etiketli sakin bir çalışma masası.
colors:
  accent: "#0B7A75"
  accent-fg: "#FFFFFF"
  accent-soft: "#DDF1EF"
  canvas: "#E9ECF0"
  surface: "#FFFFFF"
  surface-sunken: "#F5F6F8"
  line: "#E1E4E9"
  ink: "#151A21"
  muted: "#5A6577"
  priority-1: "#C42B33"
  priority-2: "#A8530A"
  priority-3: "#2459C2"
  priority-4: "#5F6B7A"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Instrument Sans Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  xs: "5px"
  sm: "8px"
  md: "11px"
  lg: "14px"
  full: "50%"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  capture-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 4px 4px 14px"
  nav-item-current:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
  board-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  chip:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "3px 9px"
---

<!-- Niteliksel dil (North Star, renk adları, his) kullanıcıya sorulmadan koddan çıkarıldı; gözden geçirilmeli. -->

# Design System: AlpToDo

## Overview

**Creative North Star: "Sessiz Çalışma Masası"**

Soğuk, açık gri bir zemin üzerinde beyaz bir çalışma yüzeyi; içerik öne çıkar, arayüz geri çekilir. Tek bir
camgöbeği vurgu yalnızca "şu an burada / şuna basabilirsin" anlarında görünür. Yoğunluk bir görev listesi için
sıkı ama nefes alır; Operate modunda bir araç: tarama hızı ve klavye akışı süsten önce gelir.

Tipografi iki sesle kurulur: başlıklarda karakterli bir display (Bricolage Grotesque), gövdede sade bir
grotesk (Instrument Sans), meta bilgide mono (IBM Plex Mono). Mono, tarih, öncelik, sayaç, etiket ve
kısayol gibi "veri" katmanını metinden ayırır.

**Key Characteristics:**
- Düz yüzeyler, derinlik 1px çizgi ve ton farkıyla; gölge yalnızca yüzen katmanlarda.
- Tek vurgu rengi; öncelik için ayrı, küçük bir dört renkli aile.
- Mono büyük harfli küçük etiketler bölüm ve sütun başlığı olarak.
- Açık ve koyu tema eşit sınıf; sistem tercihi ya da elle seçim.

## Colors

Soğuk gri-mavi nötrler üzerinde tek camgöbeği vurgu; öncelik renkleri anlam taşır, süs değildir.

### Primary
- **Derin Camgöbeği** (#0B7A75, koyu temada #38C2B8): ana eylem düğmesi, seçili işaret, odak halkası, bugünün tarihi, tamamlanmış onay, grafikteki güncel çubuk.
- **Camgöbeği Sisi** (#DDF1EF, koyu temada #12302F): seçili satır, odak parıltısı, hedef etiketi arka planı.

### Neutral
- **Soğuk Zemin** (#E9ECF0, koyu #0A0D10): sayfa zemini, uygulama kutusunun dışı.
- **Beyaz Yüzey** (#FFFFFF, koyu #13171C): uygulama kutusu, kartlar, paletler.
- **Çukur Yüzey** (#F5F6F8, koyu #191E24): kenar çubuğu, sütunlar, chip ve istatistik kutuları.
- **Cetvel Çizgisi** (#E1E4E9, koyu #262C34): tüm ayırıcılar ve kenarlıklar.
- **Mürekkep** (#151A21, koyu #E8ECF0): metin; **Sis Grisi** (#5A6577, koyu #8E98A6): ikincil metin ve meta.

### Priority
- **P1 Kırmızı** (#C42B33), **P2 Kehribar** (#A8530A), **P3 Mavi** (#2459C2), **P4 Gri** (#5F6B7A): öncelik rozeti ve onay halkası. Geciken tarih P1 kırmızısını kullanır.

### Named Rules
**The One Voice Rule.** Camgöbeği tek vurgudur; bir ekranda aynı anda yalnızca "şu anki" şeyi işaretler (seçili, bugün, ana eylem). Her etkileşimli şeyi boyama.

**The Priority Is Data Rule.** Öncelik renkleri yalnızca öncelik ve gecikmeyi anlatır; dekor ya da kategori rengi olarak kullanılmaz.

## Typography

**Display Font:** Bricolage Grotesque Variable (yedek: Instrument Sans Variable, system-ui)
**Body Font:** Instrument Sans Variable (yedek: system-ui, Segoe UI)
**Label/Mono Font:** IBM Plex Mono (yedek: ui-monospace)

**Character:** Display başlıkta sıkı harf aralığıyla (−0.02/−0.025em) kişilik katar; gövde sakin kalır; mono "etiket kâğıdı" gibi veriyi ayırır.

### Hierarchy
- **Display** (600, 28px, 1.1): sayfa başlığı (görünüm adı), istatistik sayıları.
- **Title** (600, 23px, 1.2): görev detayı başlığı; giriş kartı 24px.
- **Headline** (600, 15–21px): marka, panel başlıkları, boş durum başlığı.
- **Body** (400–500, 14.5px, 1.45): satır başlıkları, kontroller; not gövdesi 1.55.
- **Label** (500, 11px, 0.08em, büyük harf, mono): grup/sütun/bölüm başlıkları; 12px mono: tarih, etiket, chip, sayaç.

### Named Rules
**The Mono Is Metadata Rule.** Mono yalnızca tarih, öncelik, sayaç, etiket, kısayol ve bölüm etiketi içindir; gövde metni mono olmaz.

## Layout

Üç bölmeli çalışma alanı: 248px kenar çubuğu, esnek liste/pano, açıldığında 400px detay paneli; tek bir yuvarlatılmış (14px) kutu içinde, çevresi zemin renginde. 960–1179px arasında detay açıkken kenar çubuğu 56px simge rayına iner ve detay yan yana kalır; 960px altında detay yüzen panel olur; 820px altında kenar çubuğu alt sekme çubuğuna, hızlı ekleme yüzen "+" düğmesine, detay tam ekrana döner. Boşluk ritmi 6 / 12 / 16 / 24px; yatay ana dolgu 24px (telefonda 0). Satırlar ayırıcı çizgiyle ayrılır, kartla değil.

## Elevation & Depth

Hibrit ama ağırlıklı düz: yüzeyler tonla ayrılır (zemin → beyaz → çukur) ve 1px çizgiyle sınırlanır. Gölge yalnızca ekranın üstüne çıkan katmanlarda: komut paleti (`0 24px 64px` gölge rengi), yüzen detay paneli (`-16px 0 40px`), bildirim.

### Named Rules
**The Flat-By-Default Rule.** Kartlar ve satırlar durağan hâlde gölgesizdir; derinlik çizgi ve ton ile kurulur. Gölge, yüzen katmanın kanıtıdır.

## Shapes

Orta yuvarlaklık: küçük etiketler 5–6px, düğme/kontrol/chip 8px, giriş kutuları 9–11px, paneller 12px, uygulama kutusu ve palet 14px. Onay işareti ve yüzen "+" tam daire; yapılacak olmayan öğede kesik daire halkası. Kesik kenarlık "henüz yok / yeni" anlamı taşır (yeni etiket, yakında listesi).

## Components

### Buttons
- **Shape:** 8px.
- **Primary:** camgöbeği dolgu, beyaz (koyu temada koyu) metin, 8px 14px dolgu, kalın.
- **İkon düğmesi:** 34px kare, şeffaf, üzerine gelince çukur yüzey; açık durumda vurgu rengi.
- **İkincil / mini:** 1px çizgili, şeffaf; hover'da vurgu rengi kenarlık ve metin; basılı durumda vurgu dolgu.

### Hızlı ekleme (imza bileşen)
Tek satırlık kutu, 11px yuvarlak, beyaz; odakta vurgu kenarlığı + 3px Camgöbeği Sisi halka. Altında sözdizimi ipucu satırı (mono chip'ler) ve yazarken ayrıştırılan öncelik/tarih/etiket önizlemesi.

### Chips / Etiketler
Mono 12px, çukur yüzey, 1px çizgi, 8px; hedef chip'i vurgu sisi dolgulu, yeni etiket kesik kenarlıklı.

### Cards / Containers
Pano sütunu: çukur yüzey, 12px; pano kartı: beyaz, 1px çizgi, 9px, 10px 12px dolgu, hover'da vurguya karışan kenarlık. Liste satırı kartsız, alt çizgili; seçili satır Camgöbeği Sisi.

### Inputs / Fields
Çukur yüzey, 1px çizgi, 8–9px; odakta vurgu kenarlığı (giriş alanında ek parıltı halkası). Odak için her yerde 2px vurgu halkası (`:focus-visible`).

### Navigation
Kenar çubuğunda dikey liste; geçerli sayfa beyaz yüzey + 1px çizgi + kalın; sayaçlar mono, "sıcak" sayaç vurgu dolgulu. Telefonda 5'li alt sekme çubuğu, geçerli sekme vurgu renginde.

## Do's and Don'ts

### Do:
- **Do** vurgu rengini yalnızca şu anki durumu işaretlemek için kullan (seçili, bugün, ana eylem).
- **Do** meta bilgiyi (tarih, öncelik, sayaç, kısayol) mono ile yaz.
- **Do** derinliği çizgi ve ton farkıyla kur; gölgeyi yüzen katmana sakla.
- **Do** tüm etkileşimlerde görünür odak halkası ve klavye yolu bırak; yeni bileşen önce klavyeyle düşünülür.
- **Do** açık ve koyu temayı birlikte tasarla; renkleri yalnızca CSS değişkenleriyle ver.

### Don't:
- **Don't** öncelik renklerini süs ya da kategori rengi olarak kullanma.
- **Don't** satırları ve statik kartları gölgelendirme.
- **Don't** gizli notu şifrelenmiş gibi gösteren görsel dil kullanma (kilit yalnızca arayüz gizliliğidir).
- **Don't** yeni bir ikinci vurgu rengi ya da dekoratif gradyan ekleme.
