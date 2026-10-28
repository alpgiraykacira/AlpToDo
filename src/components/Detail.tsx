"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { addDays, fmtTimestamp } from "@/lib/dates";
import { canonicalLabel } from "@/lib/labels";
import { DEFAULT_RULE } from "@/lib/recurrence";
import { Markdown } from "@/lib/markdown";
import { isTask, rules } from "@/lib/rules";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Item,
  type LocalPatch,
  type Priority,
  type Recurrence,
  type RecurrenceUnit,
  type Status,
} from "@/lib/types";
import { Icon } from "./icons";

export type PatchFn = (id: string, patch: LocalPatch, opts?: { debounced?: boolean }) => void;

interface DetailProps {
  item: Item;
  knownLabels: string[];
  onPatch: PatchFn;
  onStatus: (id: string, status: Status | null) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

/** Bir öğe için `key={item.id}` ile kullanılır; öğe değişince yerel durum (gizli içerik, düzenleme) sıfırlanır. */
const WEEKDAY_CHIPS: [number, string][] = [[1, "Pzt"], [2, "Sal"], [3, "Çar"], [4, "Per"], [5, "Cum"], [6, "Cmt"], [0, "Paz"]];

export function Detail({ item, knownLabels, onPatch, onStatus, onClose, onDelete }: DetailProps) {
  const task = isTask(item);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [checkText, setCheckText] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const locked = item.secret && !revealed;

  // Başlık hem yazılırken hem panel genişliği/yazı tipi değişince yeniden ölçülür (dar ekranda son satır kesilmesin).
  useLayoutEffect(() => {
    const t = titleRef.current;
    if (!t) return;
    const fit = () => {
      t.style.height = "auto";
      t.style.height = `${t.scrollHeight}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(t);
    return () => ro.disconnect();
  }, [item.title]);

  const addLabel = () => {
    const raw = labelText.trim().replace(/^[@#]/, "").replace(/\s+/g, "-");
    setLabelText("");
    if (!raw) return;
    const { name } = canonicalLabel(raw, knownLabels);
    if (!item.labels.includes(name)) onPatch(item.id, { labels: [...item.labels, name] });
  };

  const addCheck = () => {
    const t = checkText.trim();
    setCheckText("");
    if (t) onPatch(item.id, { checklist: [...item.checklist, { t, d: false }] });
  };

  const doneCount = item.checklist.filter((c) => c.d).length;
  const rec = item.recurrence;
  /** Mevcut kuralı değiştirir; kural yoksa varsayılandan başlar. */
  const setRule = (change: Partial<Recurrence>) => onPatch(item.id, rules.recurrence(item, { ...(rec ?? DEFAULT_RULE), ...change }));

  return (
    <>
      <div className="d-top">
        <button className="ib back" onClick={onClose} aria-label="Geri"><Icon n="back" s={20} /></button>
        <span className="d-crumb">{item.inbox ? "Inbox" : task ? STATUS_LABEL[item.status!] : "Not"}</span>
        <span className="grow" />
        <button
          className={`ib ${item.pinned ? "on" : ""}`}
          aria-pressed={item.pinned}
          aria-label="Sabitle"
          onClick={() => onPatch(item.id, { pinned: !item.pinned })}
        >
          <Icon n="pin" />
        </button>
        <button className="ib" aria-label="Sil" onClick={() => onDelete(item.id)}><Icon n="trash" /></button>
        <button className="ib x" aria-label="Kapat" onClick={onClose}><Icon n="x" /></button>
      </div>

      <div className="d-body">
        <textarea
          ref={titleRef}
          className="d-title"
          rows={1}
          value={item.title}
          aria-label="Başlık"
          maxLength={500}
          onChange={(e) => onPatch(item.id, { title: e.target.value.replace(/\n/g, " ") }, { debounced: true })}
          onBlur={() => {
            if (!item.title.trim()) onPatch(item.id, { title: "Başlıksız" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />

        {!task && (
          <div className="nhint">
            <span>Bu bir not. Durum, öncelik ya da tarih verirsen göreve dönüşür.</span>
            <button className="mini" onClick={() => onStatus(item.id, "todo")}>Göreve çevir</button>
          </div>
        )}

        <div className="props">
          <label htmlFor="f-status">Durum</label>
          <select
            id="f-status"
            value={item.status ?? ""}
            onChange={(e) => onStatus(item.id, (e.target.value || null) as Status | null)}
          >
            <option value="">Not (görev değil)</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>

          <label htmlFor="f-prio">Öncelik</label>
          <select
            id="f-prio"
            value={item.priority}
            onChange={(e) => onPatch(item.id, rules.priority(item, Number(e.target.value) as Priority))}
          >
            <option value={0}>Yok</option>
            {([1, 2, 3, 4] as const).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>

          <label htmlFor="f-due">Bitiş</label>
          <div className="duewrap">
            <input
              type="date"
              id="f-due"
              value={item.due ?? ""}
              onChange={(e) => onPatch(item.id, rules.due(item, e.target.value || null))}
            />
            <button className="mini" onClick={() => onPatch(item.id, rules.due(item, addDays(0)))}>Bugün</button>
            <button className="mini" onClick={() => onPatch(item.id, rules.due(item, addDays(1)))}>Yarın</button>
          </div>

          <label htmlFor="f-rec">Tekrar</label>
          <div className="duewrap">
            {rec && (
              <>
                <span>Her</span>
                <input
                  type="number"
                  className="num"
                  min={1}
                  max={99}
                  aria-label="Tekrar aralığı"
                  value={rec.every}
                  onChange={(e) => setRule({ every: Math.min(99, Math.max(1, Math.round(Number(e.target.value) || 1))) })}
                />
              </>
            )}
            <select
              id="f-rec"
              value={rec?.unit ?? ""}
              onChange={(e) => {
                const unit = e.target.value as RecurrenceUnit | "";
                if (!unit) onPatch(item.id, rules.recurrence(item, null));
                else setRule({ unit, weekdays: unit === "week" ? (rec?.weekdays ?? []) : [] });
              }}
            >
              <option value="">Tekrarlamaz</option>
              <option value="day">Gün</option>
              <option value="week">Hafta</option>
              <option value="month">Ay</option>
              <option value="year">Yıl</option>
            </select>
          </div>

          {rec?.unit === "week" && (
            <>
              <span className="pl">Günler</span>
              <div className="wdays" role="group" aria-label="Tekrar günleri">
                {WEEKDAY_CHIPS.map(([d, label]) => (
                  <button
                    key={d}
                    className="mini"
                    aria-pressed={rec.weekdays.includes(d)}
                    onClick={() =>
                      setRule({ weekdays: rec.weekdays.includes(d) ? rec.weekdays.filter((x) => x !== d) : [...rec.weekdays, d] })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {rec && (
            <>
              <label htmlFor="f-rec-from">Sonraki</label>
              <select
                id="f-rec-from"
                value={rec.from}
                onChange={(e) => setRule({ from: e.target.value as Recurrence["from"] })}
              >
                <option value="due">Bitiş tarihine göre</option>
                <option value="done">Tamamladığım günden</option>
              </select>
            </>
          )}

          <span className="pl">Etiketler</span>
          <div className="tags">
            {item.labels.map((l) => (
              <span key={l} className="chip">
                @{l}
                <button
                  aria-label={`${l} etiketini kaldır`}
                  onClick={() => onPatch(item.id, { labels: item.labels.filter((x) => x !== l) })}
                >
                  <Icon n="x" s={12} />
                </button>
              </span>
            ))}
            <input
              list="label-options"
              placeholder="+ @etiket"
              aria-label="Etiket ekle"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLabel();
                }
              }}
            />
            <datalist id="label-options">
              {knownLabels.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="sec">
          <h4>
            <span>Alt maddeler</span>
            <span>{item.checklist.length ? `${doneCount}/${item.checklist.length}` : ""}</span>
          </h4>
          {item.checklist.map((c, k) => (
            <label key={k} className={`ck ${c.d ? "d" : ""}`}>
              <input
                type="checkbox"
                checked={c.d}
                onChange={(e) =>
                  onPatch(item.id, { checklist: item.checklist.map((x, j) => (j === k ? { ...x, d: e.target.checked } : x)) })
                }
              />
              <span>{c.t}</span>
            </label>
          ))}
          <input
            className="ckadd"
            placeholder="Madde ekle…"
            aria-label="Madde ekle"
            value={checkText}
            onChange={(e) => setCheckText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCheck();
              }
            }}
          />
        </div>

        <div className="sec">
          <h4>
            <span>Not</span>
            <span>{item.secret ? "Gizli" : "Markdown"}</span>
          </h4>
          {locked ? (
            <div className="lock">
              <Icon n="lock" s={26} />
              <p>İçerik gizli olarak işaretli. Uçtan uca şifreleme eklendiğinde sunucu bu içeriği hiç göremeyecek.</p>
              <button className="mini" onClick={() => setRevealed(true)}>Göster</button>
            </div>
          ) : editing ? (
            <textarea
              className="md-edit"
              autoFocus
              value={item.body}
              aria-label="Not içeriği"
              maxLength={100000}
              onChange={(e) => onPatch(item.id, { body: e.target.value }, { debounced: true })}
              onBlur={() => setEditing(false)}
            />
          ) : (
            <div
              className="md"
              tabIndex={0}
              onClick={() => setEditing(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditing(true);
              }}
            >
              <Markdown source={item.body} />
            </div>
          )}
        </div>

        <div className="d-meta">
          Oluşturuldu {fmtTimestamp(item.createdAt)}
          {item.completedAt ? ` · Bitti ${fmtTimestamp(item.completedAt)}` : ""}
        </div>
      </div>
    </>
  );
}
