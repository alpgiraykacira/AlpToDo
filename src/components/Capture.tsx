"use client";

import { useState, type RefObject } from "react";
import { captureDestination, parseCapture, PENDING_LABEL, type Parsed } from "@/lib/capture";
import { dueLabel } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import { canonicalLabel, norm } from "@/lib/labels";

interface CaptureProps {
  known: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (p: Parsed) => void;
}

export function Capture({ known, inputRef, onSubmit }: CaptureProps) {
  const [value, setValue] = useState("");

  // Yazılmakta olan "@et" parçası için var olan etiketlerden öneri.
  const pending = value.match(PENDING_LABEL);
  const suggestions = pending ? known.filter((n) => norm(n).startsWith(norm(pending[2]))).slice(0, 6) : [];

  const preview = parseCapture(pending ? value.replace(PENDING_LABEL, "$1") : value, known);
  if (pending?.[2] && !suggestions.length) {
    const c = canonicalLabel(pending[2], known);
    if (!preview.labels.includes(c.name)) {
      preview.labels = [...preview.labels, c.name];
      if (c.fresh) preview.fresh = [...preview.fresh, c.name];
    }
  }

  const complete = (name: string) => {
    setValue((v) => v.replace(PENDING_LABEL, `$1@${name} `));
    inputRef.current?.focus();
  };

  const submit = () => {
    const parsed = parseCapture(value, known);
    if (!parsed.title) return;
    onSubmit(parsed);
    setValue("");
  };

  return (
    <div className="capture">
      <div className="cap-box">
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Hızlı ekle…  örn. Rapor gönder !1 @analiz yarın"
          autoComplete="off"
          aria-label="Hızlı ekle"
          onChange={(e) => setValue(e.target.value)}
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
        <button className="btn" onClick={submit}>
          Ekle
        </button>
      </div>
      <div className="cap-hint">
        {!value.trim() ? (
          <>
            <span className="syn"><b>@etiket</b> var olanla eşleşir, yoksa yeni oluşur</span>
            <span className="syn"><b>!1</b>–<b>!4</b> öncelik</span>
            <span className="syn"><b>bugün</b> <b>yarın</b> <b>pzt</b></span>
          </>
        ) : (
          <>
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
            {preview.priority > 0 && <span className="pchip">P{preview.priority}</span>}
            {preview.labels.map((l) => {
              const fresh = preview.fresh.includes(l);
              return (
                <span key={l} className={`pchip ${fresh ? "new" : ""}`}>
                  @{l}
                  {fresh ? " · yeni" : ""}
                </span>
              );
            })}
            {preview.due && <span className="pchip">{dueLabel(preview.due).text}</span>}
            {preview.recurrence && <span className="pchip">↻ {describeRecurrence(preview.recurrence)}</span>}
            <span className="pchip dest">→ {captureDestination(preview)}</span>
          </>
        )}
      </div>
    </div>
  );
}
