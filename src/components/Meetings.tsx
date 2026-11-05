"use client";

import { useState } from "react";
import { fmtDate, isoDate } from "@/lib/dates";
import { noteBlocks, parseMeetingLabels, previewLine, relativeDay, sortedMeetings, sortedNotes } from "@/lib/meetings";
import type { Meeting, MeetingNote } from "@/lib/types";
import { Icon } from "./icons";

const longDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });

interface GroupProps {
  meetings: Meeting[];
  selId: string | null;
  known: string[];
  onOpen: (id: string) => void;
  onCreate: (name: string, labels: string[]) => void;
}

/** Notlar görünümünün başındaki "Toplantı notları" grubu. Satıra basınca notlar sağ panelde açılır. */
export function MeetingsGroup({ meetings, selId, known, onOpen, onCreate }: GroupProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const close = () => {
    setCreating(false);
    setName("");
    setTags("");
  };
  return (
    <section className="grp" aria-labelledby="grp-meetings">
      <h2 id="grp-meetings">
        Toplantı notları<span>{meetings.length}</span>
        <button className="mt-add" onClick={() => setCreating(true)}>
          <Icon n="plus" s={12} />
          Yeni toplantı
        </button>
      </h2>
      {creating && (
        <form
          className="mt-new"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onCreate(name.trim(), parseMeetingLabels(tags, known).labels);
            close();
          }}
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Toplantı adı" aria-label="Toplantı adı" maxLength={200} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="@etiket" aria-label="Etiketler" className="mt-new-tags" />
          <button className="btn" type="submit">Oluştur</button>
          <button className="mini" type="button" onClick={close}>Vazgeç</button>
        </form>
      )}
      <div role="list" aria-labelledby="grp-meetings">
        {sortedMeetings(meetings).map((m) => {
          const last = sortedNotes(m)[0];
          return (
            <div
              key={m.id}
              className={`row ${selId === m.id ? "sel" : ""}`}
              role="listitem"
              data-rid={m.id}
              tabIndex={0}
              aria-current={selId === m.id ? "true" : undefined}
              onClick={() => onOpen(m.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) onOpen(m.id);
              }}
            >
              <span className="noteico mt-ico"><Icon n="users" /></span>
              <div style={{ minWidth: 0 }}>
                <div className="rt">{m.name}</div>
                <div className="snip">{last ? `${fmtDate(last.date)} · ${previewLine(last) || "Boş not"}` : "Henüz not yok"}</div>
                {m.labels.length > 0 && (
                  <div className="rm">
                    {m.labels.map((l) => (
                      <span key={l} className="tg">@{l}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="rs">
                <span className="due">{m.notes.length} not</span>
                {last && <span className={`due ${last.date === isoDate(new Date()) ? "today" : ""}`}>{relativeDay(last.date)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface DetailProps {
  meeting: Meeting;
  knownLabels: string[];
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onLabels: (id: string, labels: string[]) => void;
  onDelete: (id: string) => void;
  onSaveNote: (meetingId: string, note: MeetingNote) => void;
  onRemoveNote: (meetingId: string, noteId: string) => void;
}

/** Sağ panel: toplantının adı, etiketleri ve tarihe göre en yeni üstte dizilmiş notları. Bir toplantı için `key={meeting.id}` ile kullanılır. */
export function MeetingDetail({ meeting, knownLabels, onClose, onRename, onLabels, onDelete, onSaveNote, onRemoveNote }: DetailProps) {
  const [name, setName] = useState(meeting.name);
  const [labelText, setLabelText] = useState("");
  const [composing, setComposing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [text, setText] = useState("");
  const notes = sortedNotes(meeting);

  const commitName = () => {
    const v = name.trim();
    if (!v) setName(meeting.name);
    else if (v !== meeting.name) onRename(meeting.id, v);
  };
  const addLabels = () => {
    const { labels } = parseMeetingLabels(labelText, knownLabels);
    setLabelText("");
    const next = [...meeting.labels, ...labels.filter((l) => !meeting.labels.includes(l))];
    if (next.length !== meeting.labels.length) onLabels(meeting.id, next);
  };
  const open = (note?: MeetingNote) => {
    setEditId(note?.id ?? null);
    setDate(note?.date ?? isoDate(new Date()));
    setText(note?.body ?? "");
    setComposing(true);
  };
  const submit = () => {
    const body = text.trim();
    if (!body || !date) return;
    const prev = notes.find((n) => n.id === editId);
    onSaveNote(meeting.id, { id: editId ?? crypto.randomUUID(), date, body, createdAt: prev?.createdAt ?? new Date().toISOString() });
    setComposing(false);
    setEditId(null);
    setText("");
  };

  const form = (
    <form
      className="mt-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="mt-date">
        <span>Toplantı tarihi</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={"Konuşulanlar, kararlar…\n- madde\n- [ ] yapılacak iş"}
        aria-label="Toplantı notu"
      />
      <div className="mt-actions">
        <button className="btn" type="submit" disabled={!text.trim() || !date}>{editId ? "Güncelle" : "Kaydet"}</button>
        <button className="mini" type="button" onClick={() => { setComposing(false); setEditId(null); }}>Vazgeç</button>
        <span className="d-meta">- madde · - [ ] yapılacak iş · Ctrl+Enter kaydeder</span>
      </div>
    </form>
  );

  return (
    <>
      <div className="d-top">
        <button className="ib back" onClick={onClose} aria-label="Geri"><Icon n="back" s={20} /></button>
        <span className="d-crumb">Toplantı</span>
        <span className="grow" />
        <button className="ib" aria-label="Toplantıyı sil" onClick={() => onDelete(meeting.id)}><Icon n="trash" /></button>
        <button className="ib x" aria-label="Kapat" onClick={onClose}><Icon n="x" /></button>
      </div>
      <div className="d-body">
        <input
          className="d-title mt-title"
          value={name}
          maxLength={200}
          aria-label="Toplantı adı"
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <div className="tags">
          {meeting.labels.map((l) => (
            <span key={l} className="chip">
              @{l}
              <button aria-label={`@${l} etiketini kaldır`} onClick={() => onLabels(meeting.id, meeting.labels.filter((x) => x !== l))}><Icon n="x" s={12} /></button>
            </span>
          ))}
          <input
            value={labelText}
            placeholder="+ etiket"
            aria-label="Etiket ekle"
            onChange={(e) => setLabelText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addLabels();
              }
            }}
            onBlur={addLabels}
          />
        </div>

        <div className="sec">
          <h4>
            <span>Notlar · en yeni üstte</span>
            {!composing && (
              <button className="mt-add" onClick={() => open()}>
                <Icon n="plus" s={12} />
                Yeni not
              </button>
            )}
          </h4>
          {composing && !editId && form}
          {notes.length === 0 && !composing && <p className="empty-files">Henüz not yok. İlk toplantı notunu ekle.</p>}
          {notes.length > 0 && (
            <ol className="mt-stack">
              {notes.map((n) =>
                composing && editId === n.id ? (
                  <li key={n.id} className="mt-snap">{form}</li>
                ) : (
                  <li key={n.id} className="mt-snap">
                    <div className="mt-head">
                      <span className="mt-day">{longDate(n.date)}</span>
                      <span className="mt-rel">{relativeDay(n.date)}</span>
                      <span className="mt-ops">
                        <button onClick={() => open(n)}>Düzenle</button>
                        <button onClick={() => onRemoveNote(meeting.id, n.id)}>Sil</button>
                      </span>
                    </div>
                    <div className="mt-body">
                      {noteBlocks(n.body).map((b, k) =>
                        b.kind === "p" ? <p key={k}>{b.text}</p> : <div key={k} className={`mt-li ${b.kind}`}>{b.text}</div>,
                      )}
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}
        </div>
        <div className="d-meta">{meeting.notes.length} not</div>
      </div>
    </>
  );
}
