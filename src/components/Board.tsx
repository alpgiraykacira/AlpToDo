"use client";

import { useState } from "react";
import { dayDiff, dueLabel, localDay } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";
import { isTask } from "@/lib/rules";
import { byPriority } from "@/lib/views";
import type { Item, Status } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Icon } from "./icons";
import { Meta } from "./ListView";

const COLUMNS: Status[] = ["todo", "doing", "waiting", "done"];

interface BoardProps {
  items: Item[];
  selId: string | null;
  onOpen: (id: string) => void;
  onMove: (id: string, status: Status) => void;
}

export function Board({ items, selId, onOpen, onMove }: BoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const tasks = items.filter((i) => !i.inbox && isTask(i));

  return (
    <div className="board">
      {COLUMNS.map((status) => {
        let list = tasks.filter((i) => i.status === status).sort(byPriority);
        if (status === "done") list = list.filter((i) => i.completedAt && dayDiff(localDay(i.completedAt)) >= -2);
        return (
          <div
            key={status}
            className={`col ${over === status ? "over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const item = tasks.find((i) => i.id === dragId);
              if (item && item.status !== status) onMove(item.id, status);
              setDragId(null);
            }}
          >
            <h3>
              {STATUS_LABEL[status]}
              <span>{list.length}</span>
            </h3>
            {list.map((item) => {
              const due = item.due ? dueLabel(item.due, item.status === "done") : null;
              return (
                <div
                  key={item.id}
                  className={`card ${dragId === item.id ? "drag" : ""} ${selId === item.id ? "sel" : ""}`}
                  draggable
                  tabIndex={0}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.id);
                    setDragId(item.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                  onClick={() => onOpen(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpen(item.id);
                  }}
                >
                  <div className="rt">{item.title}</div>
                  <Meta item={item} showStatus={false} />
                  <div className="cf">
                    <span>{item.priority > 0 && <span className={`pr p${item.priority}`}>P{item.priority}</span>}</span>
                    <span className="rs">
                      {item.recurrence && (
                        <span className="rep" title={describeRecurrence(item.recurrence)}><Icon n="repeat" s={13} /></span>
                      )}
                      {due && <span className={`due ${due.tone}`}>{due.text}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
