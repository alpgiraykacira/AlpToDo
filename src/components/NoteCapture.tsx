"use client";

import { useState, type RefObject } from "react";
import { parseNote, PENDING_LABEL } from "@/lib/capture";
import { canonicalLabel, norm } from "@/lib/labels";

export interface NoteDraft {
  title: string;
  body: string;
  labels: string[];
  fresh: string[];
}

interface NoteCaptureProps {
  known: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (n: NoteDraft) => void;
}

/** Not ekleme: başlık, isteğe bağlı içerik ve etiket. Öncelik, tarih ve tekrar yok. */
export function NoteCapture({ known, inputRef, onSubmit }: NoteCaptureProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const pending = title.match(PENDING_LABEL);
  const suggestions = pending ? known.filter((n) => norm(n).startsWith(norm(pending[2]))).slice(0, 6) : [];

  const preview = parseNote(pending ? title.replace(PENDING_LABEL, "$1") : title, known);
  if (pending?.[2] && !suggestions.length) {
    const c = canonicalLabel(pending[2], known);
    if (!preview.labels.includes(c.name)) {
      preview.labels = [...preview.labels, c.name];
      if (c.fresh) preview.fresh = [...preview.fresh, c.name];
    }
  }

  const complete = (name: string) => {
    setTitle((v) => v.replace(PENDING_LABEL, `$1@${name} `));
    inputRef.current?.focus();
  };

  const submit = () => {
    const parsed = parseNote(title, known);
    if (!parsed.title) return;
    onSubmit({ ...parsed, body: body.trim() });
    setTitle("");
    setBody("");
  };

  return (
    <div className="capture">
      <div className="cap-box note-box">
        <input
          ref={inputRef}
          type="text"
          value={title}
          placeholder="Yeni not…  örn. Toplantı notları @iş"
          autoComplete="off"
          aria-label="Not başlığı"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Tab" && suggestions.length && pending) {
              e.preventDefault();
              complete(suggestions[0]);
            }
          }}
        />
        <textarea
          value={body}
          rows={2}
          placeholder="İçerik (isteğe bağlı)"
          aria-label="Not içeriği"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button className="btn" onClick={submit}>
          Not ekle
        </button>
      </div>
      <div className="cap-hint">
        {suggestions.length > 0 && (
          <>
            <span className="sugg-l">Etiket:</span>
            {suggestions.map((n) => (
              <button
                key={n}
                className="sugg"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => complete(n)}
              >
                @{n}
              </button>
            ))}
            <span className="sugg-l">Tab ile tamamla</span>
          </>
        )}
        {!title.trim() && !body ? (
          <span className="syn"><b>@etiket</b> ekle · <b>Ctrl+Enter</b> içerikten kaydeder</span>
        ) : (
          preview.labels.map((l) => {
            const fresh = preview.fresh.includes(l);
            return (
              <span key={l} className={`pchip ${fresh ? "new" : ""}`}>
                @{l}
                {fresh ? " · yeni" : ""}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
