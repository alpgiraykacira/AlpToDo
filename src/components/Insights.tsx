"use client";

import { useEffect, useState } from "react";
import { addDays, dayDiff, fmtDate } from "@/lib/dates";
import { weeklyDone, type DoneEvent } from "@/lib/insights";
import { labelCounts } from "@/lib/labels";
import { isOpen } from "@/lib/rules";
import type { Store } from "@/lib/store/types";
import type { Item } from "@/lib/types";

/** Grafikte gösterilen hafta sayısı (son 7 gün dahil). */
const WEEKS = 8;

/** Bugün dahil bütün haftaların olayları (demo modunda yok). */
type History = { state: "loading" } | { state: "error" } | { state: "ready"; events: DoneEvent[] | null };

export function Insights({ items, store, revision }: { items: Item[]; store: Store; revision: number }) {
  const [history, setHistory] = useState<History>({ state: "loading" });
  useEffect(() => {
    let cancelled = false;
    setHistory({ state: "loading" });
    store
      .doneHistory(WEEKS)
      .then((events) => !cancelled && setHistory({ state: "ready", events }))
      .catch(() => !cancelled && setHistory({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [store, revision]);

  const triaged = items.filter((i) => !i.inbox);
  const open = triaged.filter(isOpen);
  const late = open.filter((i) => i.due && dayDiff(i.due) < 0).length;
  const p1 = open.filter((i) => i.priority === 1).length;
  const events = history.state === "ready" ? history.events : null;
  const values = weeklyDone(events ?? [], addDays(0), WEEKS, undefined, items);
  const current = values[WEEKS - 1];
  // Yalnızca "Son 7 gün" doluysa grafik tek çubuktan ibaret kalır; o zaman dürüst bir satır göster.
  const hasPast = values.slice(0, -1).some((v) => v > 0);
  const max = Math.max(10, Math.ceil(Math.max(...values) / 5) * 5);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += 5) ticks.push(v);
  const last = values.length - 1;
  const xLabels = values.map((_, k) => (k === last ? "Son 7 gün" : fmtDate(addDays(-6 - 7 * (last - k)))));

  const byPriority = ([1, 2, 3, 4, 0] as const).map((p) => [p, open.filter((i) => i.priority === p).length] as const);
  const priorityMax = Math.max(1, ...byPriority.map((x) => x[1]));
  const labels = labelCounts(triaged).slice(0, 5);
  const labelMax = Math.max(1, ...labels.map((x) => x[1]));

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{current}</b><span>Son 7 günde biten</span></div>
        <div className="stat"><b>{open.length}</b><span>Açık görev</span></div>
        <div className="stat"><b style={{ color: late ? "var(--p1)" : "inherit" }}>{late}</b><span>Geciken</span></div>
        <div className="stat"><b>{p1}</b><span>Açık P1</span></div>
      </div>
      <div className="panels">
        <div className="panel wide">
          <h2>Haftalık tamamlanan görev</h2>
          {!hasPast && (
            <p className="note" style={{ marginTop: 0 }}>
              {history.state === "loading" ? "Tamamlama geçmişi yükleniyor…" : history.state === "error"
                ? "Önceki haftaların tamamlama geçmişi doğrulanamadı."
                : "Önceki haftalarda tamamlanan görev yok. Görevleri bitirdikçe haftalık çubuklar burada görünür."}
            </p>
          )}
          <div className="chart" hidden={!hasPast}>
            <div className="plot">
              {ticks.map((v) => (
                <div key={v} className="gl" style={{ bottom: `${(v / max) * 100}%` }}><span>{v}</span></div>
              ))}
              <div className="bars">
                {values.map((v, k) => (
                  <div key={k} className="bcol">
                    <div className={`bar ${k === last ? "cur" : ""}`} style={{ height: `${(v / max) * 100}%` }} />
                    {v > 0 && <span className="bv" style={{ bottom: `calc(${(v / max) * 100}% + 4px)` }}>{v}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="xl">
              {xLabels.map((l, k) => (
                <span key={k} className={k === last ? "cur" : ""}>{l}</span>
              ))}
            </div>
          </div>
          <div className="note" hidden={!hasPast && history.state !== "error"}>
            {history.state === "loading" && "Tamamlama geçmişi yükleniyor; şimdilik yalnızca görevlerin son tamamlanma tarihi sayılıyor."}
            {history.state === "error" && "Geçmiş kayıtları yüklenemedi; çubuklar yalnızca görevlerin tamamlanma tarihinden hesaplandı."}
            {history.state === "ready" && !history.events &&
              "Çubuklar görevlerin tamamlanma tarihinden hesaplanır (demo modunda olay kaydı yok). Tekrarlayanlarda yalnızca son tamamlanma görünür."}
            {history.state === "ready" && history.events &&
              "Her tamamlama ayrı sayılır; geri alınanlar düşülür. Olay kaydı olmayan eski görevlerin son tamamlanma tarihi kullanılır."}
          </div>
        </div>
        <div className="panel">
          <h2>Açık görevler, önceliğe göre</h2>
          {byPriority.map(([p, n]) => (
            <div key={p} className="hb">
              <span>{p ? `P${p}` : "Yok"}</span>
              <div className="track"><div className="fill" style={{ width: `${(n / priorityMax) * 100}%`, background: `var(--p${p || 4})` }} /></div>
              <em>{n}</em>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>En çok kullanılan etiketler</h2>
          {labels.map(([name, n]) => (
            <div key={name} className="hb">
              <span className="tg">@{name}</span>
              <div className="track"><div className="fill" style={{ width: `${(n / labelMax) * 100}%` }} /></div>
              <em>{n}</em>
            </div>
          ))}
        </div>
        <div className="panel wide">
          <h2>Sıradaki analizler</h2>
          <div className="soon">
            <span>Etiket başına ortalama tamamlanma süresi</span>
            <span>En çok ertelenen görevler</span>
            <span>Durumda kalma süresi</span>
            <span>Haftalık gözden geçirme özeti</span>
          </div>
        </div>
      </div>
    </>
  );
}

