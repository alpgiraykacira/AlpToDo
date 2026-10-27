"use client";

import { useEffect, useState } from "react";
import { addDays, dayDiff, fmtDate, localDay } from "@/lib/dates";
import { labelCounts } from "@/lib/labels";
import { isOpen } from "@/lib/rules";
import type { Store } from "@/lib/store/types";
import type { Item } from "@/lib/types";

const HISTORY_WEEKS = 7;

type History = { state: "loading" } | { state: "error" } | { state: "ready"; weeks: number[]; sample: boolean };

export function Insights({ items, store }: { items: Item[]; store: Store }) {
  const [history, setHistory] = useState<History>({ state: "loading" });
  useEffect(() => {
    let cancelled = false;
    store
      .doneHistory(HISTORY_WEEKS)
      .then((h) => !cancelled && setHistory({ state: "ready", ...h }))
      .catch(() => !cancelled && setHistory({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [store]);

  const triaged = items.filter((i) => !i.inbox);
  const open = triaged.filter(isOpen);
  const late = open.filter((i) => i.due && dayDiff(i.due) < 0).length;
  const p1 = open.filter((i) => i.priority === 1).length;
  const lo = addDays(-6);
  const hi = addDays(0);
  // Biten görevler + bu pencerede tamamlanan tekrarlayanlar (her biri bir kez sayılır).
  const inWindow = (ts: string | null) => {
    if (!ts) return false;
    const d = localDay(ts);
    return d >= lo && d <= hi;
  };
  const current = triaged.filter(
    (i) => (i.status === "done" && inWindow(i.completedAt)) || (i.recurrence !== null && inWindow(i.lastDoneAt)),
  ).length;

  const previous = history.state === "ready" ? history.weeks : new Array<number>(HISTORY_WEEKS).fill(0);
  const values = [...previous, current];
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
          <div className="chart">
            <div className="plot">
              {ticks.map((v) => (
                <div key={v} className="gl" style={{ bottom: `${(v / max) * 100}%` }}><span>{v}</span></div>
              ))}
              <div className="bars">
                {values.map((v, k) => (
                  <div key={k} className="bcol">
                    <div className={`bar ${k === last ? "cur" : ""}`} style={{ height: `${(v / max) * 100}%` }} />
                    <span className="bv" style={{ bottom: `calc(${(v / max) * 100}% + 4px)` }}>{v}</span>
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
          <div className="note">
            {history.state === "loading" && "Geçmiş haftalar yükleniyor…"}
            {history.state === "error" && "Geçmiş haftalar yüklenemedi; yalnızca son 7 gün gerçek."}
            {history.state === "ready" && history.sample && "Önceki 7 haftalık çubuklar örnek veridir (demo modunda olay kaydı yok)."}
            {history.state === "ready" && !history.sample &&
              "Önceki haftalar durum değişikliği kayıtlarından gelir; kayıt tutulmadan önceki haftalar boş görünür."}
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
