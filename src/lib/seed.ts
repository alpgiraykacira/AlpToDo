import { addDays } from "./dates";
import type { Item } from "./types";

/** Demo modu için örnek veri. Tarihler bugüne göre hesaplanır. */
export function seedItems(): Item[] {
  let n = 0;
  const mk = (o: Partial<Item> & { title: string }): Item => ({
    id: crypto.randomUUID(),
    body: "",
    status: null,
    priority: 0,
    due: null,
    labels: [],
    pinned: false,
    inbox: false,
    secret: false,
    checklist: [],
    files: [],
    recurrence: null,
    lastDoneAt: null,
    createdAt: new Date(Date.now() - ++n * 5e6).toISOString(),
    completedAt: null,
    ...o,
  });
  const done = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5 - 36e5).toISOString();
  const D = addDays;

  return [
    mk({
      title: "Q4 bütçe sunumunu tamamla", status: "doing", priority: 1, due: D(0), labels: ["sunum", "finans"], pinned: true,
      body: "## Notlar\n- Yönetim kurulu **Perşembe 14:00**\n- Gelir tahmini için son rakamlar finans ekibinden gelecek\n- Risk slaytında kur varsayımlarını ayrı göster\n\n`Q4_butce_v3.pptx` güncel dosya.",
      checklist: [{ t: "Slayt taslağı", d: true }, { t: "Rakamları finans ile doğrula", d: false }, { t: "Yönetici özetini yaz", d: false }],
    }),
    mk({ title: "Müşteri segmentasyon raporunu gönder", status: "todo", priority: 2, due: D(0), labels: ["rapor", "analiz"] }),
    mk({ title: "Sprint planlama gündemini hazırla", status: "todo", priority: 3, due: D(0), labels: ["toplantı"], recurrence: { unit: "week", every: 2, weekdays: [], from: "due" } }),
    mk({ title: "Veri erişim talebini takip et", status: "waiting", priority: 1, due: D(-1), labels: ["analiz"] }),
    mk({
      title: "Takım retrosu aksiyonlarını kapat", status: "doing", priority: 2, due: D(1), labels: ["toplantı"],
      checklist: [{ t: "Deploy sürecini belgele", d: true }, { t: "Alarm eşiklerini gözden geçir", d: false }],
    }),
    mk({ title: "Haftalık 1:1 notlarını hazırla", status: "waiting", priority: 3, due: D(2), labels: ["toplantı"], recurrence: { unit: "week", every: 1, weekdays: [], from: "due" } }),
    mk({ title: "Aylık KPI özetini yönetime gönder", status: "todo", priority: 2, due: D(12), labels: ["rapor", "analiz"], recurrence: { unit: "month", every: 1, weekdays: [], from: "due" } }),
    mk({ title: "Model izleme panosunun taslağı", status: "todo", priority: 2, due: D(3), labels: ["analiz"] }),
    mk({ title: "Tedarikçi sözleşme yenilemesini onaya gönder", status: "todo", priority: 3, due: D(6), labels: ["finans"] }),
    mk({ title: "Yıllık hedefleri gözden geçir", status: "todo", priority: 4, labels: ["planlama"] }),
    mk({ title: "Haftalık rapor taslağını gönder", status: "done", priority: 2, due: D(0), labels: ["rapor"], completedAt: done(0) }),
    mk({ title: "Bütçe varsayımlarını doğrula", status: "done", priority: 2, due: D(-1), labels: ["finans"], completedAt: done(1) }),
    mk({ title: "Yıllık izin planını gönder", status: "done", priority: 3, due: D(-1), completedAt: done(1) }),
    mk({ title: "Veri sözlüğünü güncelle", status: "done", priority: 3, due: D(-2), labels: ["analiz"], completedAt: done(2) }),
    mk({ title: "Segment tanımlarını netleştir", status: "done", priority: 2, due: D(-3), labels: ["analiz"], completedAt: done(3) }),
    mk({ title: "Sprint demo sunumu", status: "done", priority: 2, due: D(-4), labels: ["sunum"], completedAt: done(4) }),
    mk({ title: "Retro notlarını paylaş", status: "done", priority: 3, due: D(-5), labels: ["toplantı"], completedAt: done(5) }),
    mk({ title: "Dashboard erişim taleplerini kapat", status: "done", priority: 3, due: D(-6), completedAt: done(6) }),
    mk({
      title: "Toplantı: Q4 planlama", labels: ["toplantı"], pinned: true,
      body: "## Kararlar\n- Segmentasyon çalışması **ay sonuna** çekildi\n- Panoda haftalık gözden geçirme ekranı olacak\n\n## Açık sorular\n- Veri erişimi için hangi ekip onay verecek?\n- Bütçe revizyonu ne zaman kilitlenir?",
    }),
    mk({
      title: "Veri ürünü fikirleri", labels: ["fikir", "analiz"], pinned: true,
      body: "- Etiket başına ortalama tamamlanma süresi\n- En çok ertelenen işler listesi\n- Haftalık özet e-postası",
    }),
    mk({
      title: "Yeni analist onboarding taslağı", labels: ["planlama"],
      body: "## İlk hafta\n- Veri erişimleri ve araç kurulumları\n- Veri sözlüğü turu\n- Mentor eşleştirmesi",
    }),
    mk({
      title: "Okuma listesi: veri hikâyeciliği", labels: ["okuma"],
      body: "- Dashboard tasarımı üzerine kitap\n- Haftanın makalesi\n- Sunumlarda grafik seçimi",
    }),
    mk({
      title: "Performans görüşmesi hazırlığı", secret: true, labels: ["toplantı"],
      body: "Gündem maddeleri ve sorulacak sorular burada. Bu not gizli olarak işaretli: listede ve aramada içeriği görünmez.",
    }),
    mk({ title: "Ayşe'ye dönüş yap", inbox: true }),
    mk({ title: "Yeni laptop standı bak", inbox: true, labels: ["ekipman"] }),
    mk({ title: "Cuma toplantısı için gündem?", inbox: true }),
  ];
}
