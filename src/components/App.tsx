"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, fmtDate, todayHeading } from "@/lib/dates";
import { labelCounts } from "@/lib/labels";
import { rules } from "@/lib/rules";
import { demoStore } from "@/lib/store/demo";
import { supabaseStore } from "@/lib/store/supabase";
import { useItems } from "@/lib/useItems";
import { counts as countItems, groupsFor, passesFilters } from "@/lib/views";
import type { Parsed } from "@/lib/capture";
import type { Item, Status, ViewKey } from "@/lib/types";
import { Board } from "./Board";
import { Capture } from "./Capture";
import { NoteCapture, type NoteDraft } from "./NoteCapture";
import { Detail } from "./Detail";
import { Icon } from "./icons";
import { Insights } from "./Insights";
import { ListView } from "./ListView";
import { TITLES } from "./nav";
import { Palette } from "./Palette";
import { Sidebar, TabBar } from "./Sidebar";

interface AppProps {
  mode: "demo" | "supabase";
  /** Supabase modunda sunucunun yüklediği öğeler; demo modunda tarayıcıdan yüklenir. */
  initial?: Item[];
  email?: string;
}

interface ToastState {
  message: string;
  undo?: () => void;
}

export default function App({ mode, initial, email }: AppProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ message, undo });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const store = useMemo(() => (mode === "supabase" ? supabaseStore() : demoStore()), [mode]);
  const { items, ready, create, patch, remove, restore, reset, canReset } = useItems(store, initial, showToast);

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ViewKey>("today");
  const [priorityFilter, setPriorityFilter] = useState(0);
  const [labelFilter, setLabelFilter] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const captureRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sunucu ile tarayıcı saat dilimi farklı olabilir; tarihe bağlı arayüzü sadece tarayıcıda çiziyoruz.
  useEffect(() => {
    setMounted(true);
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sira.theme", next);
    } catch {
      /* tercih kalıcı olmaz */
    }
    setDark(!dark);
  };

  const selected = items.find((i) => i.id === selId) ?? null;
  useEffect(() => {
    if (selId && !selected) setSelId(null);
  }, [selId, selected]);

  useEffect(() => {
    if (capturing) captureRef.current?.focus();
  }, [capturing]);

  const labelList = useMemo(() => labelCounts(items), [items]);
  const known = useMemo(() => labelList.map(([n]) => n), [labelList]);
  const counts = useMemo(() => countItems(items), [items]);
  const filters = useMemo(() => ({ priority: priorityFilter, label: labelFilter }), [priorityFilter, labelFilter]);

  const goView = (v: ViewKey) => {
    setView(v);
    setLabelFilter("");
    setSelId(null);
    contentRef.current?.scrollTo({ top: 0 });
  };
  const goLabel = (name: string) => {
    setLabelFilter(name);
    if (view !== "all" && view !== "board" && view !== "notes") setView("all");
    setSelId(null);
  };

  const closeCapture = () => {
    setCapturing(false);
    captureRef.current?.blur();
  };

  // Klavye kısayolları: Ctrl/Cmd+K arama, c hızlı ekle, Esc kapat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (paletteOpen) return;
      if (e.key === "Escape") {
        if (capturing) closeCapture();
        else if (selId) setSelId(null);
        return;
      }
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
        e.preventDefault();
        setCapturing(true);
        captureRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  /** Durum değişiminin tek giriş noktası. Tekrarlayan görev "bitti" olunca sonraki tarihe kayar ve geri alınabilir. */
  const setStatus = (id: string, status: Status | null) => {
    const i = items.find((x) => x.id === id);
    if (!i) return;
    const change = rules.status(i, status);
    patch(id, change);
    if (status === "done" && i.recurrence && change.due) {
      const before = { due: i.due, status: i.status, checklist: i.checklist, lastDoneAt: i.lastDoneAt };
      showToast(`“${i.title}” tamamlandı · sonraki: ${fmtDate(change.due)}`, () => patch(id, before));
    }
  };
  const toggleDone = (id: string) => {
    const i = items.find((x) => x.id === id);
    if (i) setStatus(id, i.status === "done" ? "todo" : "done");
  };
  const triage = (id: string, to: "today" | "note") => {
    const i = items.find((x) => x.id === id);
    if (!i) return;
    if (to === "today") {
      patch(id, { inbox: false, status: "todo", due: addDays(0) });
      showToast(`“${i.title}” bugüne eklendi`);
    } else {
      patch(id, { inbox: false });
      showToast(`“${i.title}” not olarak kaydedildi`);
    }
  };
  const deleteItem = (id: string) => {
    const removed = remove(id);
    setSelId(null);
    if (removed) showToast("Öğe silindi", () => restore(removed));
  };
  const submitCapture = (p: Parsed) => {
    const hasTask = Boolean(p.priority || p.due || p.recurrence);
    create({
      id: crypto.randomUUID(),
      title: p.title,
      body: "",
      status: hasTask ? "todo" : null,
      priority: p.priority,
      due: p.due,
      labels: p.labels,
      pinned: false,
      inbox: !(hasTask || p.labels.length),
      secret: false,
      checklist: [],
      recurrence: p.recurrence,
      lastDoneAt: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
    const dest = hasTask ? "görev olarak eklendi" : p.labels.length ? "not olarak eklendi" : "Inbox’a eklendi";
    const fresh = p.fresh.length ? ` · yeni etiket: ${p.fresh.map((t) => "@" + t).join(" ")}` : "";
    showToast(`“${p.title}” ${dest}${fresh}`);
    closeCapture();
  };

  const submitNote = (n: NoteDraft) => {
    create({
      id: crypto.randomUUID(),
      title: n.title,
      body: n.body,
      status: null,
      priority: 0,
      due: null,
      labels: n.labels,
      pinned: false,
      inbox: false,
      secret: false,
      checklist: [],
      recurrence: null,
      lastDoneAt: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
    const fresh = n.fresh.length ? ` · yeni etiket: ${n.fresh.map((t) => "@" + t).join(" ")}` : "";
    showToast(`“${n.title}” not olarak eklendi${fresh}`);
    closeCapture();
  };

  if (!mounted || !ready) return null;

  const sub: Record<ViewKey, string> = {
    inbox: `${counts.inbox} öğe ayıklanmayı bekliyor`,
    today: `${todayHeading()} · ${counts.today} açık${counts.late ? ` · ${counts.late} gecikmiş` : ""}`,
    upcoming: "Tarihe göre, önceliğe göre sıralı",
    all: `${counts.all} açık görev · ${counts.notes} not${labelFilter ? ` · @${labelFilter}` : ""}`,
    notes: `${counts.notes} not · sabitlenenler üstte`,
    board: "Kartı sürükle ya da aç ve durumu seç",
    insights: "Örnek veriyle önizleme",
  };

  const showPriorityFilter = view !== "inbox" && view !== "insights" && view !== "notes";
  const showFilterRow = showPriorityFilter || (Boolean(labelFilter) && view !== "inbox" && view !== "insights");

  return (
    <>
      <div className={`app ${selected ? "has-detail" : ""} ${capturing ? "capturing" : ""}`}>
        <Sidebar
          view={view}
          activeLabel={labelFilter}
          counts={counts}
          labels={labelList}
          mode={mode}
          email={email}
          onView={goView}
          onLabel={goLabel}
          onSearch={() => setPaletteOpen(true)}
          onReset={canReset ? () => void reset().then(() => showToast("Örnek veri yenilendi")) : undefined}
        />

        <main className="main">
          <header className="top">
            <div className="grow" style={{ minWidth: 0 }}>
              <h1>{TITLES[view]}</h1>
              <div className="sub">{sub[view]}</div>
            </div>
            <button className="ib srch" aria-label="Ara" onClick={() => setPaletteOpen(true)}><Icon n="search" s={20} /></button>
            <button className="ib" aria-label="Temayı değiştir" onClick={toggleTheme}>
              <Icon n={dark ? "lightsun" : "moon"} />
            </button>
          </header>

          {view === "notes" ? (
            <NoteCapture known={known} inputRef={captureRef} onSubmit={submitNote} />
          ) : (
            <Capture known={known} inputRef={captureRef} onSubmit={submitCapture} />
          )}

          <div className="filters" hidden={!showFilterRow}>
            {showPriorityFilter && (
              <div className="seg" role="group" aria-label="Öncelik">
                {([[0, "Tümü"], [1, "P1"], [2, "P2"], [3, "P3"]] as const).map(([v, l]) => (
                  <button key={v} aria-pressed={priorityFilter === v} onClick={() => setPriorityFilter(v)}>{l}</button>
                ))}
              </div>
            )}
            {labelFilter && (
              <button className="chip" aria-label="Etiket filtresini kaldır" onClick={() => setLabelFilter("")}>
                @{labelFilter} <Icon n="x" s={12} />
              </button>
            )}
          </div>

          <div className="content" ref={contentRef}>
            {view === "board" ? (
              <Board
                items={items.filter((i) => passesFilters(i, filters))}
                selId={selId}
                onOpen={setSelId}
                onMove={setStatus}
              />
            ) : view === "insights" ? (
              <Insights items={items} />
            ) : (
              <ListView
                groups={groupsFor(view, items, filters)}
                view={view}
                selId={selId}
                onOpen={setSelId}
                onToggle={toggleDone}
                onTriage={triage}
              />
            )}
          </div>
        </main>

        {selected && (
          <section className="detail" aria-label="Öğe detayı">
            <Detail
              key={selected.id}
              item={selected}
              knownLabels={known}
              onPatch={patch}
              onStatus={setStatus}
              onClose={() => setSelId(null)}
              onDelete={deleteItem}
            />
          </section>
        )}
        <div className="scrim" onClick={closeCapture} />
      </div>

      <TabBar view={view} inbox={counts.inbox} onView={goView} />
      <button className="fab" aria-label="Yeni ekle" onClick={() => setCapturing(true)}><Icon n="plus" s={26} /></button>

      {paletteOpen && (
        <Palette
          items={items}
          onClose={() => setPaletteOpen(false)}
          onView={goView}
          onLabel={goLabel}
          onItem={(id) => setSelId(id)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Geri al
            </button>
          )}
        </div>
      )}
    </>
  );
}
