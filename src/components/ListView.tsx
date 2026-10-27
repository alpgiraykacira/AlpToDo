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

interface RowProps {
  item: Item;
  view: ViewKey;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onTriage: (id: string, to: "today" | "note") => void;
}

function Row({ item, view, selected, onOpen, onToggle, onTriage }: RowProps) {
  const task = isTask(item);
  const note = !task && !item.inbox ? snippet(item) : "";
  return (
    <div
      className={`row ${item.status === "done" ? "done" : ""} ${selected ? "sel" : ""}`}
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
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onTriage: (id: string, to: "today" | "note") => void;
}

export function ListView({ groups, view, selId, onOpen, onToggle, onTriage }: ListViewProps) {
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
        <section key={g.label} className="grp">
          <h3 className={g.tone ?? ""}>
            {g.label}
            <span>{g.items.length}</span>
          </h3>
          {g.items.map((item) => (
            <Row
              key={item.id}
              item={item}
              view={view}
              selected={selId === item.id}
              onOpen={onOpen}
              onToggle={onToggle}
              onTriage={onTriage}
            />
          ))}
        </section>
      ))}
    </>
  );
}
