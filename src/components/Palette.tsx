"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { labelCounts, lower, norm } from "@/lib/labels";
import { isTask } from "@/lib/rules";
import { STATUS_LABEL, type Item, type ViewKey } from "@/lib/types";
import { Icon, type IconName } from "./icons";
import { VIEWS } from "./nav";

type Result =
  | { k: "view"; view: ViewKey; label: string; sub: string; icon: IconName }
  | { k: "label"; name: string; label: string; sub: string; icon: IconName }
  | { k: "item"; id: string; label: string; sub: string; icon: IconName };

interface PaletteProps {
  items: Item[];
  onClose: () => void;
  onView: (v: ViewKey) => void;
  onLabel: (name: string) => void;
  onItem: (id: string) => void;
}

export function Palette({ items, onClose, onView, onLabel, onItem }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo<Result[]>(() => {
    const q = lower(query.trim());
    const views: Result[] = VIEWS.filter((v) => !q || lower(v.l).includes(q)).map((v) => ({
      k: "view", view: v.k, label: v.l, sub: "Görünüm", icon: v.i,
    }));
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
    return [...views, ...labels, ...hits];
  }, [items, query]);

  const active = Math.min(index, Math.max(0, results.length - 1));
  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    if (r.k === "view") onView(r.view);
    else if (r.k === "label") onLabel(r.name);
    else onItem(r.id);
  };

  return (
    <div className="pal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pal-box" role="dialog" aria-label="Ara">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Öğe ara veya bir görünüme git…"
          autoComplete="off"
          aria-label="Ara"
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
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
        <ul>
          {results.length ? (
            results.map((r, k) => (
              <li key={`${r.k}-${r.label}-${k}`} className={k === active ? "on" : ""} onClick={() => go(r)}>
                <Icon n={r.icon} s={16} />
                <span>{r.label}</span>
                <small>{r.sub}</small>
              </li>
            ))
          ) : (
            <li style={{ cursor: "default", color: "var(--muted)" }}>Eşleşme yok</li>
          )}
        </ul>
        <div className="pal-foot">↑↓ gez · Enter aç · Esc kapat</div>
      </div>
    </div>
  );
}
