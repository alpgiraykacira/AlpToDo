"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { labelCounts, lower, norm } from "@/lib/labels";
import { isTask } from "@/lib/rules";
import { STATUS_LABEL, type Item, type ViewKey } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { VIEWS } from "./nav";

export interface PaletteAction {
  label: string;
  sub?: string;
  icon: IconName;
  run: () => void;
}

type Result =
  | { k: "action"; run: () => void; label: string; sub: string; icon: IconName }
  | { k: "view"; view: ViewKey; label: string; sub: string; icon: IconName }
  | { k: "label"; name: string; label: string; sub: string; icon: IconName }
  | { k: "item"; id: string; label: string; sub: string; icon: IconName };

interface PaletteProps {
  items: Item[];
  actions: PaletteAction[];
  onClose: () => void;
  onView: (v: ViewKey) => void;
  onLabel: (name: string) => void;
  onItem: (id: string) => void;
}

/** Öneki eşleşenler önce gelir, sonra içinde geçenler; aynı grupta sıra korunur. */
const byPrefix = (q: string, text: (r: Result) => string) => (a: Result, b: Result) =>
  Number(!lower(text(a)).startsWith(q)) - Number(!lower(text(b)).startsWith(q));

export function Palette({ items, actions, onClose, onView, onLabel, onItem }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo<Result[]>(() => {
    const q = lower(query.trim());
    // Boş sorguda kısa bir liste: ilk dört eylem + son öğeler. Görünümler (g + harf ile de gidilir) yazdıkça gelir.
    const acts: Result[] = actions
      .filter((a) => (q ? lower(a.label).includes(q) : true))
      .slice(0, q ? 8 : 4)
      .map((a) => ({ k: "action", run: a.run, label: a.label, sub: a.sub ?? "Eylem", icon: a.icon }));
    const views: Result[] = VIEWS.filter((v) => q && lower(v.l).includes(q))
      .map<Result>((v) => ({ k: "view", view: v.k, label: v.l, sub: "Görünüm", icon: v.i }))
      .sort(byPrefix(q, (r) => r.label));
    const lq = norm(q.replace(/^@/, ""));
    const labels: Result[] = q
      ? labelCounts(items).filter(([n]) => norm(n).includes(lq)).slice(0, 4).map(([n]) => ({
          k: "label", name: n, label: `@${n}`, sub: "Etiket", icon: "tag",
        }))
      : [];
    let found = items.filter((i) => !q || lower(i.title).includes(q) || i.labels.some((l) => lower(l).includes(q)));
    if (!q) found = found.slice(0, 4);
    const hits: Result[] = found.slice(0, 8).map((i) => ({
      k: "item",
      id: i.id,
      label: i.title,
      sub: i.inbox ? "Inbox" : isTask(i) ? STATUS_LABEL[i.status!] : "Not",
      icon: i.secret ? "lock" : isTask(i) ? "check" : "note",
    }));
    return [...acts, ...views, ...labels, ...hits];
  }, [items, actions, query]);

  const active = Math.min(index, Math.max(0, results.length - 1));
  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    if (r.k === "action") r.run();
    else if (r.k === "view") onView(r.view);
    else if (r.k === "label") onLabel(r.name);
    else onItem(r.id);
  };

  return (
    <div className="pal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pal-box" role="dialog" aria-modal="true" aria-label="Ara">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="pal-list"
          aria-activedescendant={results.length ? `pal-${active}` : undefined}
          value={query}
          placeholder="Öğe ara, görünüme git ya da bir eylem seç…"
          autoComplete="off"
          aria-label="Ara"
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "Tab") e.preventDefault(); // odak palet içinde kalır
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((active + 1) % Math.max(1, results.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((active - 1 + results.length) % Math.max(1, results.length));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[active]);
            }
          }}
        />
        <ul id="pal-list" role="listbox" aria-label="Sonuçlar">
          {results.length ? (
            results.map((r, k) => (
              <li
                key={`${r.k}-${r.label}-${k}`}
                id={`pal-${k}`}
                role="option"
                aria-selected={k === active}
                className={k === active ? "on" : ""}
                onClick={() => go(r)}
              >
                <Icon n={r.icon} s={16} />
                <span>{r.label}</span>
                <small>{r.sub}</small>
              </li>
            ))
          ) : (
            <li role="option" aria-selected="false" style={{ cursor: "default", color: "var(--muted)" }}>Eşleşme yok</li>
          )}
        </ul>
        <div className="pal-foot">↑↓ gez · Enter seç · Esc kapat</div>
      </div>
    </div>
  );
}
