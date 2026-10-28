"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

const GROUPS: { title: string; rows: [string[], string][] }[] = [
  {
    title: "Liste",
    rows: [
      [["j", "↓"], "Sonraki satır"],
      [["k", "↑"], "Önceki satır"],
      [["Enter"], "Detayı aç"],
      [["e"], "Detayı aç ve başlığa geç (Esc satıra döner)"],
      [["x", "Boşluk"], "Tamamla / geri al"],
      [["1", "2", "3", "4"], "Öncelik P1–P4"],
      [["0"], "Önceliği kaldır"],
      [["t"], "Bugüne al"],
      [["y"], "Yarına ertele"],
    ],
  },
  {
    title: "Git",
    rows: [
      [["g", "i"], "Inbox"],
      [["g", "t"], "Bugün"],
      [["g", "u"], "Yaklaşan"],
      [["g", "a"], "Tümü"],
      [["g", "n"], "Notlar"],
      [["g", "b"], "Pano"],
      [["g", "s"], "Analiz"],
    ],
  },
  {
    title: "Her yerde",
    rows: [
      [["c"], "Hızlı ekle"],
      [["Ctrl K", "/"], "Ara ve eylemler"],
      [["?"], "Bu pencere"],
      [["Esc"], "Kapat / geri çık"],
    ],
  },
];

export function Shortcuts({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="pal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pal-box keys" role="dialog" aria-modal="true" aria-label="Klavye kısayolları">
        <div className="keys-top">
          <h2>Klavye kısayolları</h2>
          <button ref={closeRef} className="ib" aria-label="Kapat" onClick={onClose}><Icon n="x" s={18} /></button>
        </div>
        <div className="keys-body">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="lbl">{g.title}</h3>
              <dl>
                {g.rows.map(([keys, what]) => (
                  <div key={what}>
                    <dt>
                      {keys.map((k, i) => (
                        <span key={k}>
                          {i > 0 && <span className="keys-then">{g.title === "Git" ? "sonra" : "ya da"}</span>}
                          <kbd>{k}</kbd>
                        </span>
                      ))}
                    </dt>
                    <dd>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <div className="pal-foot">Yazı alanındayken kısayollar çalışmaz; Esc ile alandan çık.</div>
      </div>
    </div>
  );
}
