import type { Item, ItemPatch, Priority, Recurrence, Status, ChecklistEntry } from "../types";

export interface ItemRow {
  id: string;
  title: string;
  body: string;
  status: Status | null;
  priority: number;
  due_date: string | null;
  labels: string[];
  pinned: boolean;
  inbox: boolean;
  secret: boolean;
  checklist: ChecklistEntry[];
  recurrence: Recurrence | null;
  last_done_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export function rowToItem(r: ItemRow): Item {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status,
    priority: r.priority as Priority,
    due: r.due_date,
    labels: r.labels,
    pinned: r.pinned,
    inbox: r.inbox,
    secret: r.secret,
    checklist: r.checklist,
    recurrence: r.recurrence,
    lastDoneAt: r.last_done_at,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

/** Sadece yamada bulunan alanları yazar. completed_at / updated_at'i veritabanı belirler. */
export function patchToRow(p: ItemPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.body !== undefined) row.body = p.body;
  if (p.status !== undefined) row.status = p.status;
  if (p.priority !== undefined) row.priority = p.priority;
  if (p.due !== undefined) row.due_date = p.due;
  if (p.labels !== undefined) row.labels = p.labels;
  if (p.pinned !== undefined) row.pinned = p.pinned;
  if (p.inbox !== undefined) row.inbox = p.inbox;
  if (p.secret !== undefined) row.secret = p.secret;
  if (p.checklist !== undefined) row.checklist = p.checklist;
  if (p.recurrence !== undefined) row.recurrence = p.recurrence;
  if (p.lastDoneAt !== undefined) row.last_done_at = p.lastDoneAt; // sunucu "şimdi" ile değiştirir
  if (p.deleted !== undefined) row.deleted_at = p.deleted ? new Date().toISOString() : null;
  return row;
}
