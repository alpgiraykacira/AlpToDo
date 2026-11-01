"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { fmtSize, isPreviewable } from "@/lib/files";
import type { FileRef } from "@/lib/types";
import { Icon } from "./icons";

/**
 * Panodaki dosyalar (ekran görüntüsü, Gezgin'den kopyalanan dosya). Metin de varsa
 * (ör. Excel hücresi hem metin hem görsel koyar) metin yapıştırması bozulmasın diye dosya alınmaz.
 */
export function pastedFiles(e: ClipboardEvent): File[] {
  const { clipboardData } = e;
  if (!clipboardData || clipboardData.types.includes("text/plain")) return [];
  return Array.from(clipboardData.files);
}

export const droppedFiles = (e: DragEvent): File[] => Array.from(e.dataTransfer.files);
export const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

/** Gizli dosya seçici ile "Dosya ekle" düğmesi. */
export function FilePicker({ onPick, label = "Dosya ekle" }: { onPick: (files: File[]) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <button type="button" className="mini attach-btn" onClick={() => ref.current?.click()}>
        <Icon n="clip" s={14} /> {label}
      </button>
    </>
  );
}

/** Not eklenirken henüz yüklenmemiş dosyalar. */
export function PendingFiles({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <ul className="files pending">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`}>
          <Icon n="clip" s={14} />
          <span className="fname">{f.name}</span>
          <span className="fsize">{fmtSize(f.size)}</span>
          <button type="button" className="ib sm" aria-label={`${f.name} dosyasını çıkar`} onClick={() => onRemove(i)}>
            <Icon n="x" s={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export type OpenFile = (file: FileRef, download: boolean) => Promise<string | null>;

function Thumb({ file, open }: { file: FileRef; open: OpenFile }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void open(file, false).then((u) => live && setSrc(u));
    return () => {
      live = false;
    };
  }, [file, open]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="fthumb" src={src} alt="" /> : <span className="fthumb ph" />;
}

/** Öğeye eklenmiş dosyalar: tıklayınca iner, × ile kaldırılır. */
export function FileList({
  files,
  open,
  onRemove,
}: {
  files: FileRef[];
  open: OpenFile;
  onRemove: (file: FileRef) => void;
}) {
  if (!files.length) return null;
  const download = async (f: FileRef) => {
    const url = await open(f, true);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.rel = "noopener";
    a.click();
  };
  return (
    <ul className="files">
      {files.map((f) => (
        <li key={f.id}>
          {isPreviewable(f) ? <Thumb file={f} open={open} /> : <Icon n="clip" s={14} />}
          <button type="button" className="fname link" title="İndir" onClick={() => void download(f)}>
            {f.name}
          </button>
          <span className="fsize">{fmtSize(f.size)}</span>
          <button type="button" className="ib sm" aria-label={`${f.name} dosyasını kaldır`} onClick={() => onRemove(f)}>
            <Icon n="x" s={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
