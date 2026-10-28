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
import { cursorId, focusRow, keepCursor, moveCursor } from "@/lib/cursor";
import type { Item, Priority, Status, ViewKey } from "@/lib/types";
import { Board } from "./Board";
import { Capture } from "./Capture";
import { Clock } from "./Clock";
import { NoteCapture, type NoteDraft } from "./NoteCapture";
import { Detail } from "./Detail";
import { Icon } from "./icons";
import { Insights } from "./Insights";
import { ListView } from "./ListView";
import { TITLES } from "./nav";
import { Palette, type PaletteAction } from "./Palette";
import { Shortcuts } from "./Shortcuts";
import { Sidebar, TabBar } from "./Sidebar";

interface AppProps {
  mode: "demo" | "supabase";
  /** Supabase modunda sunucunun yüklediği öğeler; demo modunda tarayıcıdan yüklenir. */
  initial?: Item[];
  email?: string;
}

/** g'den sonra basılan harf → görünüm. */
const G_VIEWS: Record<string, ViewKey> = {
  i: "inbox", t: "today", u: "upcoming", a: "all", n: "notes", b: "board", s: "insights",
};

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
  const [paletteTarget, setPaletteTarget] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [chord, setChord] = useState(false);
  // Az önce eklenen / tamamlanan / taşınan öğe: satırında kısa bir geri bildirim hareketi oynar.
  const [fresh, setFresh] = useState<{ id: string; kind: "new" | "done" | "moved" } | null>(null);
  const freshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flash = (id: string, kind: "new" | "done" | "moved") => {
    setFresh({ id, kind });
    clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFresh(null), 1200);
  };
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    // Etiket filtresi bulunulan görünümün üzerine uygulanır; Inbox ve Analiz'de anlamı yok (paletten gelirse Tümü'ne geçilir).
    if (view === "inbox" || view === "insights") setView("all");
    setSelId(null);
  };

  /** Kenar çubuğu: seçili etikete tekrar basınca filtre kalkar; başka etikete basınca onunla değişir. */
  const toggleLabel = (name: string) => {
    if (labelFilter === name) setLabelFilter("");
    else goLabel(name);
  };

  const closeCapture = () => {
    setCapturing(false);
    captureRef.current?.blur();
  };

  const openPalette = () => {
    // Palet açılınca odak girişe geçer; eylemler imlecin olduğu öğeye uygulanır.
    setPaletteTarget(cursorId(document.activeElement) ?? selId);
    setPaletteOpen(true);
  };

  // Klavye: Ctrl/Cmd+K ve / palet, c hızlı ekle, ? kısayollar, g+harf görünüm,
  // j/k ve oklar liste imleci, x tamamla, 1–4/0 öncelik, e aç. Esc kapatır.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (paletteOpen) return;
      if (e.key === "Escape") {
        if (shortcutsOpen) setShortcutsOpen(false);
        else if (capturing) closeCapture();
        else if (selId) {
          const id = selId;
          setSelId(null);
          setTimeout(() => focusRow(id), 30);
        }
        return;
      }
      if (shortcutsOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return;

      // g'den sonra gelen harf bir görünüme götürür (g i = Inbox).
      if (gPending.current) {
        gPending.current = false;
        setChord(false);
        clearTimeout(gTimer.current);
        const v = G_VIEWS[e.key];
        if (v) {
          e.preventDefault();
          goView(v);
        }
        return;
      }
      const key = e.key;
      if (key === "g") {
        gPending.current = true;
        setChord(true);
        gTimer.current = setTimeout(() => {
          gPending.current = false;
          setChord(false);
        }, 1500);
        return;
      }
      if (key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (key === "/") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (key === "c") {
        e.preventDefault();
        setCapturing(true);
        captureRef.current?.focus();
        return;
      }

      // Aşağıdakiler yalnızca listede (satır odaklıyken ya da hiçbir şey odakta değilken) çalışır.
      const id = cursorId(el);
      if (el !== document.body && !id) return;
      const onRow = el.hasAttribute("data-rid");
      if (key === "j" || key === "ArrowDown" || key === "k" || key === "ArrowUp") {
        e.preventDefault();
        moveCursor(id, key === "j" || key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (!id) return;
      if (key === "e") {
        e.preventDefault();
        setSelId(id);
        setTimeout(() => document.querySelector<HTMLElement>(".detail .d-title")?.focus(), 60);
      } else if (key === "x" || (key === " " && onRow)) {
        e.preventDefault();
        const it = items.find((x) => x.id === id);
        // Tekrarlayan görevin kendi bildirimi ve geri alması var (setStatus).
        if (it?.recurrence && it.due && it.status !== "done") keepCursor(id, () => toggleDone(id));
        else keepCursor(id, () => withUndo(id, it?.status === "done" ? "yeniden açıldı" : "tamamlandı", () => toggleDone(id)));
      } else if (/^[0-4]$/.test(key)) {
        e.preventDefault();
        keepCursor(id, () => withUndo(id, key === "0" ? "önceliği kaldırıldı" : `önceliği P${key}`, () => setPriority(id, Number(key) as Priority)));
      } else if (key === "t" || key === "y") {
        e.preventDefault();
        keepCursor(id, () => withUndo(id, key === "t" ? "bugüne alındı" : "yarına ertelendi", () => setDue(id, addDays(key === "t" ? 0 : 1))));
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
    flash(id, status === "done" && !i.recurrence ? "done" : "moved");
    if (status === "done" && i.recurrence && change.due) {
      const before = { due: i.due, status: i.status, checklist: i.checklist, lastDoneAt: i.lastDoneAt };
      showToast(`“${i.title}” tamamlandı · sonraki: ${fmtDate(change.due)}`, () => patch(id, before));
    }
  };
  const toggleDone = (id: string) => {
    const i = items.find((x) => x.id === id);
    if (i) setStatus(id, i.status === "done" ? "todo" : "done");
  };
  /** Klavyeden yapılan değişikliği geri alınabilir yapar (öğenin ilgili alanlarının anlık görüntüsü). */
  const withUndo = (id: string, label: string, act: () => void) => {
    const i = items.find((x) => x.id === id);
    if (!i) return;
    const before = {
      status: i.status, completedAt: i.completedAt, priority: i.priority, due: i.due, inbox: i.inbox,
      recurrence: i.recurrence, checklist: i.checklist, lastDoneAt: i.lastDoneAt,
    };
    act();
    showToast(`“${i.title}” ${label}`, () => patch(id, before));
  };
  const setPriority = (id: string, priority: Priority) => {
    const i = items.find((x) => x.id === id);
    if (i) patch(id, rules.priority(i, priority));
  };
  const setDue = (id: string, due: string | null) => {
    const i = items.find((x) => x.id === id);
    if (i) patch(id, rules.due(i, due));
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
    const id = crypto.randomUUID();
    flash(id, "new");
    create({
      id,
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
    const id = crypto.randomUUID();
    flash(id, "new");
    create({
      id,
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

  // Palet eylemleri: imlecin olduğu öğeye uygulanır (öğe yoksa yalnızca genel olanlar).
  const target = items.find((i) => i.id === paletteTarget) ?? null;
  const actions: PaletteAction[] = [
    { label: "Kısayolları göster", sub: "?", icon: "list", run: () => setShortcutsOpen(true) },
    ...(target
      ? [
          { label: target.status === "done" ? "Tamamlamayı geri al" : "Tamamla", icon: "check" as const, run: () => toggleDone(target.id) },
          { label: "Bugüne al", icon: "sun" as const, run: () => setDue(target.id, addDays(0)) },
          { label: "Yarına ertele", icon: "cal" as const, run: () => setDue(target.id, addDays(1)) },
          ...([1, 2, 3, 4] as const).map((p) => ({ label: `Önceliği P${p} yap`, icon: "check" as const, run: () => setPriority(target.id, p) })),
          { label: "Önceliği kaldır", icon: "x" as const, run: () => setPriority(target.id, 0) },
        ].map((a) => ({ sub: `“${target.title}”`, ...a }))
      : []),
  ];

  const sub: Record<ViewKey, string> = {
    inbox: `${counts.inbox} öğe ayıklanmayı bekliyor`,
    today: `${todayHeading()} · ${counts.today} açık${counts.late ? ` · ${counts.late} gecikmiş` : ""}`,
    upcoming: "Tarihe göre, önceliğe göre sıralı",
    all: `${counts.all} açık görev · ${counts.notes} not${labelFilter ? ` · @${labelFilter}` : ""}`,
    notes: `${counts.notes} not · sabitlenenler üstte`,
    board: "Kartı sürükle ya da aç ve durumu seç",
    insights: "Tamamlananlar ve açık görevlerin özeti",
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
          onLabel={toggleLabel}
          onSearch={openPalette}
          onShortcuts={() => setShortcutsOpen(true)}
          onReset={canReset ? () => void reset().then(() => showToast("Örnek veri yenilendi")) : undefined}
        />

        <main className="main">
          <header className="top">
            <div className="grow" style={{ minWidth: 0 }}>
              <h1>{TITLES[view]}</h1>
              <div className="sub">{sub[view]}</div>
            </div>
            <button className="ib mob-only" aria-label="Analiz" onClick={() => goView("insights")}><Icon n="chart" s={20} /></button>
            <button className="ib srch" aria-label="Ara" onClick={openPalette}><Icon n="search" s={20} /></button>
            <Clock />
            <button className="ib" aria-label="Temayı değiştir" onClick={toggleTheme}>
              <Icon n={dark ? "lightsun" : "moon"} />
            </button>
          </header>

          {view === "insights" ? null : view === "notes" ? (
            <NoteCapture known={known} inputRef={captureRef} onSubmit={submitNote} />
          ) : (
            <Capture known={known} inputRef={captureRef} onSubmit={submitCapture} />
          )}

          <div className="filters" hidden={!showFilterRow}>
            {showPriorityFilter && (
              <div className="seg" role="group" aria-label="Öncelik">
                {([[0, "Hepsi"], [1, "P1"], [2, "P2"], [3, "P3"]] as const).map(([v, l]) => (
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
            <div className="view-in" key={view}>
            {view === "board" ? (
              <Board
                items={items.filter((i) => passesFilters(i, filters))}
                selId={selId}
                fresh={fresh}
                onOpen={setSelId}
                onMove={setStatus}
              />
            ) : view === "insights" ? (
              <Insights items={items} store={store} />
            ) : (
              <ListView
                groups={groupsFor(view, items, filters)}
                view={view}
                selId={selId}
                fresh={fresh}
                onOpen={setSelId}
                onToggle={toggleDone}
                onTriage={triage}
              />
            )}
            </div>
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
          actions={actions}
          onClose={() => {
            setPaletteOpen(false);
            // Odak, palet açılmadan önceki satıra döner.
            if (paletteTarget) setTimeout(() => focusRow(paletteTarget), 30);
          }}
          onView={goView}
          onLabel={goLabel}
          onItem={(id) => setSelId(id)}
        />
      )}

      {shortcutsOpen && <Shortcuts onClose={() => setShortcutsOpen(false)} />}

      {chord && <div className="chord" role="status">g · i Inbox · t Bugün · u Yaklaşan · a Tümü · n Notlar · b Pano · s Analiz</div>}

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
