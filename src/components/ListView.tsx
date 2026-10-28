"use client";

import { dueLabel } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import { isTask } from "@/lib/rules";
import { snippet, type Group } from "@/lib/views";
import type { Item, ViewKey } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Icon } from "./icons";

export function Meta({ item, showStatus }: { item: Item; showStatus: boolean }) {
  const done = item.checklist.filter((c) => c.d).length;
  return (
    <div className="rm">
      {showStatus && (item.status === "doing" || item.status === "waiting") && (
        <span className={`st ${item.status}`}>{STATUS_LABEL[item.status]}</span>
      )}
      {item.labels.map((l) => (
        <span key={l} className="tg">@{l}</span>
      ))}
      {item.checklist.length > 0 && <span className="tg">{done}/{item.checklist.length}</span>}
    </div>
  );
}

function Side({ item, onTriage }: { item: Item; onTriage: (id: string, to: "today" | "note") => void }) {
  if (item.inbox) {
    return (
      <span className="tri">
        <button onClick={(e) => { e.stopPropagation(); onTriage(item.id, "today"); }}>Bugün</button>
        <button onClick={(e) => { e.stopPropagation(); onTriage(item.id, "note"); }}>Not</button>
      </span>
    );
  }
  const due = isTask(item) && item.due ? dueLabel(item.due, item.status === "done") : null;
  return (
    <>
      {item.pinned && <span className="pin" title="Sabitlendi"><Icon n="pin" s={14} /></span>}
      {isTask(item) && item.priority > 0 && <span className={`pr p${item.priority}`}>P{item.priority}</span>}
      {item.recurrence && (
        <span className="rep" title={describeRecurrence(item.recurrence)} aria-label={describeRecurrence(item.recurrence)}>
          <Icon n="repeat" s={13} />
        </span>
      )}
      {due && <span className={`due ${due.tone}`}>{due.text}</span>}
    </>
  );
}

export type Fresh = { id: string; kind: "new" | "done" | "moved" } | null;

interface RowProps {
  item: Item;
  view: ViewKey;
  selected: boolean;
  fresh: string;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onTriage: (id: string, to: "today" | "note") => void;
}

function Row({ item, view, selected, fresh, onOpen, onToggle, onTriage }: RowProps) {
  const task = isTask(item);
  const note = !task && !item.inbox ? snippet(item) : "";
  return (
    <div
      className={`row ${item.status === "done" ? "done" : ""} ${selected ? "sel" : ""} ${fresh}`}
      role="listitem"
      data-rid={item.id}
      aria-current={selected ? "true" : undefined}
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onOpen(item.id);
      }}
    >
      {item.inbox ? (
        <span className="ring" />
      ) : task ? (
        <button
          className={`chk p${item.priority} ${item.status === "done" ? "on" : ""}`}
          aria-label={item.status === "done" ? "Tamamlandı, geri al" : "Tamamla"}
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
        >
          <Icon n="check" s={12} />
        </button>
      ) : (
        <span className="noteico"><Icon n="note" /></span>
      )}
      <div style={{ minWidth: 0 }}>
        <div className="rt">
          {item.title}
          {item.secret && <Icon n="lock" s={13} />}
        </div>
        {note && <div className="snip">{note}</div>}
        <Meta item={item} showStatus={view !== "all"} />
      </div>
      <div className="rs"><Side item={item} onTriage={onTriage} /></div>
    </div>
  );
}

const EMPTY: Partial<Record<ViewKey, [string, string]>> = {
  inbox: ["Inbox boş", "Hızlı ekleme alanına yazdığın her şey önce buraya düşer."],
  today: ["Bugün için iş kalmadı", "Yaklaşan görevlere göz at ya da yeni bir şey ekle."],
};

interface ListViewProps {
  groups: Group[];
  view: ViewKey;
  selId: string | null;
  fresh: Fresh;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onTriage: (id: string, to: "today" | "note") => void;
}

export function ListView({ groups, view, selId, fresh, onOpen, onToggle, onTriage }: ListViewProps) {
  const shown = groups.filter((g) => g.items.length);
  if (!shown.length) {
    const [title, hint] = EMPTY[view] ?? ["Burada bir şey yok", "Filtreleri gevşetmeyi dene."];
    return (
      <div className="empty">
        <strong>{title}</strong>
        {hint}
      </div>
    );
  }
  return (
    <>
      {shown.map((g) => (
        <section key={g.label} className="grp" aria-labelledby={`grp-${g.label}`}>
          <h2 id={`grp-${g.label}`} className={g.tone ?? ""}>
            {g.label}
            <span>{g.items.length}</span>
          </h2>
          <div role="list" aria-labelledby={`grp-${g.label}`}>
            {g.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                view={view}
                selected={selId === item.id}
                fresh={fresh?.id === item.id ? `fresh-${fresh.kind}` : ""}
                onOpen={onOpen}
                onToggle={onToggle}
                onTriage={onTriage}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
