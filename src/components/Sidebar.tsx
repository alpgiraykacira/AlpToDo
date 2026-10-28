"use client";

import { useState } from "react";
import type { ViewKey } from "@/lib/types";
import { Icon } from "./icons";
import { TABS, VIEWS } from "./nav";

type Counts = { inbox: number; today: number; all: number; notes: number };

interface SidebarProps {
  view: ViewKey;
  activeLabel: string;
  counts: Counts;
  labels: [string, number][];
  mode: "demo" | "supabase";
  email?: string;
  onView: (v: ViewKey) => void;
  onLabel: (name: string) => void;
  onSearch: () => void;
  onShortcuts: () => void;
  onReset?: () => void;
}

export function Sidebar({ view, activeLabel, counts, labels, mode, email, onView, onLabel, onSearch, onShortcuts, onReset }: SidebarProps) {
  // Etiket listesi varsayılan olarak kapalı; başlığa basınca aşağı doğru açılır.
  const [labelsOpen, setLabelsOpen] = useState(false);
  // Inbox ve Analiz etiketle filtrelenmez.
  const labelsUsable = view !== "inbox" && view !== "insights";
  return (
    <aside className="side" aria-label="Gezinme">
      <div className="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="2" y="4" width="20" height="4" rx="2" />
          <rect x="2" y="10" width="14" height="4" rx="2" opacity=".7" />
          <rect x="2" y="16" width="8" height="4" rx="2" opacity=".45" />
        </svg>
        AlpToDo
      </div>
      <button className="sbtn" title="Ara veya git (Ctrl K)" onClick={onSearch}>
        <Icon n="search" s={16} />
        Ara veya git<kbd>Ctrl K</kbd>
      </button>
      <div className="side-scroll">
      <nav className="nav">
        {VIEWS.map((v) => {
          const n = (counts as Record<string, number>)[v.k];
          const current = view === v.k;
          return (
            <button key={v.k} title={v.l} onClick={() => onView(v.k)} aria-current={current ? "page" : undefined}>
              <Icon n={v.i} />
              <span>{v.l}</span>
              {n ? <span className={`count ${v.k === "inbox" ? "hot" : ""}`}>{n}</span> : null}
            </button>
          );
        })}
      </nav>
      {labels.length > 0 && (
        <div className="side-labels">
          <button className="lbl lbl-btn" aria-expanded={labelsOpen} aria-controls="side-label-list" onClick={() => setLabelsOpen((o) => !o)}>
            <Icon n="chev" s={12} />
            Etiketler
            <span className="count">{labels.length}</span>
          </button>
          <div className="nav" id="side-label-list" hidden={!labelsOpen}>
            {labels.slice(0, 14).map(([name, n]) => (
              <button
                key={name}
                disabled={!labelsUsable}
                title={labelsUsable ? undefined : "Bu görünümde etiket filtresi yok"}
                onClick={() => onLabel(name)}
                aria-current={activeLabel === name ? "page" : undefined}
              >
                <span className="at">@</span>
                <span>{name}</span>
                <span className="count">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
      <div className="side-foot">
        <button className="side-keys" onClick={onShortcuts}>Klavye kısayolları <kbd>?</kbd></button>
        {mode === "demo" ? (
          <>
            Demo modu: veri yalnızca bu tarayıcıda durur.
            <br />
            {onReset && <button onClick={onReset}>Örnek veriyi sıfırla</button>}
          </>
        ) : (
          <>
            {email}
            <br />
            <form action="/auth/signout" method="post">
              <button type="submit">Çıkış yap</button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}

export function TabBar({ view, inbox, onView }: { view: ViewKey; inbox: number; onView: (v: ViewKey) => void }) {
  return (
    <nav className="tabbar" aria-label="Sekmeler">
      {TABS.map((t) => (
        <button key={t.k} onClick={() => onView(t.k)} aria-current={view === t.k ? "page" : undefined}>
          <Icon n={t.i} s={22} />
          <span>{t.l}</span>
          {t.k === "inbox" && inbox ? <span className="bd">{inbox}</span> : null}
        </button>
      ))}
    </nav>
  );
}
