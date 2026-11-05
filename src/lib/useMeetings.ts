"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Store } from "./store/types";
import type { Meeting, MeetingNote, MeetingPatch } from "./types";

/**
 * Toplantı durumu. `useItems` ile aynı fikir: önce ekrana uygulanır, sonra store'a yazılır;
 * yazma başarısız olursa yeniden yüklenip hata bildirilir. Yazmalar tek sırada gider
 * (toplantı oluşmadan notu eklenmesin).
 */
export function useMeetings(store: Store, onError: (message: string) => void) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [ready, setReady] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const meetingsRef = useRef(meetings);
  meetingsRef.current = meetings;

  const reload = useCallback(async () => {
    try {
      setMeetings(await store.loadMeetings());
    } catch {
      onErrorRef.current("Toplantılar yüklenemedi. Bağlantını kontrol et.");
    } finally {
      setReady(true);
    }
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const queue = useRef<Promise<void>>(Promise.resolve());
  const enqueue = useCallback(
    (fn: () => Promise<void>) => {
      queue.current = queue.current.then(async () => {
        try {
          await fn();
        } catch {
          onErrorRef.current("Kaydedilemedi. Değişiklik geri alındı.");
          await reload();
        }
      });
    },
    [reload],
  );

  const create = useCallback(
    (meeting: Meeting) => {
      setMeetings((prev) => [meeting, ...prev]);
      enqueue(() => store.createMeeting(meeting));
    },
    [store, enqueue],
  );

  const update = useCallback(
    (id: string, patch: MeetingPatch) => {
      const { deleted, ...rest } = patch;
      setMeetings((prev) => (deleted ? prev.filter((m) => m.id !== id) : prev.map((m) => (m.id === id ? { ...m, ...rest } : m))));
      enqueue(() => store.updateMeeting(id, patch));
    },
    [store, enqueue],
  );

  /** Yumuşak siler; geri almak için `restore(meeting)`. */
  const remove = useCallback(
    (id: string): Meeting | undefined => {
      const meeting = meetingsRef.current.find((m) => m.id === id);
      if (meeting) update(id, { deleted: true });
      return meeting;
    },
    [update],
  );

  const restore = useCallback(
    (meeting: Meeting) => {
      setMeetings((prev) => [meeting, ...prev]);
      enqueue(() => store.updateMeeting(meeting.id, { deleted: false }));
    },
    [store, enqueue],
  );

  /** Notu ekler ya da aynı kimlikliyi günceller. */
  const saveNote = useCallback(
    (meetingId: string, note: MeetingNote) => {
      setMeetings((prev) =>
        prev.map((m) =>
          m.id !== meetingId
            ? m
            : { ...m, notes: m.notes.some((n) => n.id === note.id) ? m.notes.map((n) => (n.id === note.id ? note : n)) : [...m.notes, note] },
        ),
      );
      enqueue(() => store.saveMeetingNote(meetingId, note));
    },
    [store, enqueue],
  );

  const removeNote = useCallback(
    (meetingId: string, noteId: string): MeetingNote | undefined => {
      const note = meetingsRef.current.find((m) => m.id === meetingId)?.notes.find((n) => n.id === noteId);
      if (!note) return undefined;
      setMeetings((prev) => prev.map((m) => (m.id === meetingId ? { ...m, notes: m.notes.filter((n) => n.id !== noteId) } : m)));
      enqueue(() => store.removeMeetingNote(noteId));
      return note;
    },
    [store, enqueue],
  );

  return { meetings, ready, reload, create, update, remove, restore, saveNote, removeNote };
}
