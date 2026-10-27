"use client";

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
  onReset?: () => void;
}

export function Sidebar({ view, activeLabel, counts, labels, mode, email, onView, onLabel, onSearch, onReset }: SidebarProps) {
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
      <button className="sbtn" onClick={onSearch}>
        <Icon n="search" s={16} />
        Ara veya git<kbd>Ctrl K</kbd>
      </button>
      <nav className="nav">
        {VIEWS.map((v) => {
          const n = (counts as Record<string, number>)[v.k];
          const current = view === v.k && !(v.k === "all" && activeLabel);
          return (
            <button key={v.k} onClick={() => onView(v.k)} aria-current={current ? "page" : undefined}>
              <Icon n={v.i} />
              <span>{v.l}</span>
              {n ? <span className={`count ${v.k === "inbox" ? "hot" : ""}`}>{n}</span> : null}
            </button>
          );
        })}
      </nav>
      {labels.length > 0 && (
        <div>
          <div className="lbl">Etiketler</div>
          <div className="nav">
            {labels.slice(0, 14).map(([name, n]) => (
              <button key={name} onClick={() => onLabel(name)} aria-current={activeLabel === name ? "page" : undefined}>
                <span className="at">@</span>
                <span>{name}</span>
                <span className="count">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="side-foot">
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
