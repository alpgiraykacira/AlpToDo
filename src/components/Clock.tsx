"use client";

import { useEffect, useState } from "react";

/** Tarih ve saat; dakika başında güncellenir. İçerik yalnızca tarayıcıda çizilir (App mounted kapısı). */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => clearTimeout(timer);
  }, []);

  const date = now.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
  const time = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return (
    <time className="clock" dateTime={now.toISOString()} title={now.toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" })}>
      <span className="clock-d">{date}</span>
      <span className="clock-t">{time}</span>
    </time>
  );
}
