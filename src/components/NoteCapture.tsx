"use client";

import { useState, type RefObject } from "react";
import { parseNote, PENDING_LABEL } from "@/lib/capture";
import { pickAllowed, uniqueName } from "@/lib/files";
import { canonicalLabel, norm } from "@/lib/labels";
import { droppedFiles, FilePicker, hasFiles, pastedFiles, PendingFiles } from "./Attachments";

export interface NoteDraft {
  title: string;
  body: string;
  labels: string[];
  fresh: string[];
  files: File[];
}

interface NoteCaptureProps {
  known: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (n: NoteDraft) => void;
  onReject: (errors: string[]) => void;
}

/** Not ekleme: başlık, isteğe bağlı içerik, etiket ve dosya (seç, yapıştır ya da sürükle). Öncelik, tarih ve tekrar yok. */
export function NoteCapture({ known, inputRef, onSubmit, onReject }: NoteCaptureProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dropping, setDropping] = useState(false);

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

  const addFiles = (picked: File[]) => {
    if (!picked.length) return;
    const { ok, errors } = pickAllowed(picked, files.length);
    if (errors.length) onReject(errors);
    // Yapıştırılan dosyalar hep "image.png" gelir; adlar çakışmasın.
    const names = files.map((f) => f.name);
    const named = ok.map((f) => {
      const name = uniqueName(f.name, names);
      names.push(name);
      return name === f.name ? f : new File([f], name, { type: f.type });
    });
    setFiles((prev) => [...prev, ...named]);
  };

  const submit = () => {
    const parsed = parseNote(title, known);
    // Başlık yazılmadıysa ama dosya varsa ilk dosyanın adı başlık olur.
    const noteTitle = parsed.title || files[0]?.name;
    if (!noteTitle) return;
    onSubmit({ ...parsed, title: noteTitle, body: body.trim(), files });
    setTitle("");
    setBody("");
    setFiles([]);
  };

  return (
    <div className="capture">
      <div
        className={`cap-box note-box${dropping ? " drop" : ""}`}
        onPaste={(e) => {
          const pasted = pastedFiles(e);
          if (!pasted.length) return;
          e.preventDefault();
          addFiles(pasted);
        }}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDropping(false);
          addFiles(droppedFiles(e));
        }}
      >
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
        <PendingFiles files={files} onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))} />
        <div className="note-actions">
          <FilePicker onPick={addFiles} />
          <button className="btn" onClick={submit}>
            Not ekle
          </button>
        </div>
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
        {!title.trim() && !body && !files.length ? (
          <span className="syn"><b>@etiket</b> ekle · <b>Ctrl+V</b> ile dosya yapıştır ya da sürükle · <b>Ctrl+Enter</b> içerikten kaydeder</span>
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
