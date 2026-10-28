/**
 * Liste imleci: satırlar (ve pano kartları) `data-rid` taşır, imleç gerçek odaktır.
 * Böylece ekran okuyucu ve Tab sırası imleçle aynı yerde kalır; ayrı bir "seçili" durumu tutulmaz.
 */
const ROWS = ".content [data-rid]";

const rowEls = () => Array.from(document.querySelectorAll<HTMLElement>(ROWS));

/** Odaktaki öğenin içinde bulunduğu satırın kimliği. */
export const cursorId = (el: Element | null): string | null =>
  el?.closest<HTMLElement>("[data-rid]")?.dataset.rid ?? null;

export function focusRow(id: string): boolean {
  const el = rowEls().find((r) => r.dataset.rid === id);
  el?.focus();
  return Boolean(el);
}

/** İmleci bir satır ilerletir ya da geri alır; imleç yoksa ilk satıra koyar. */
export function moveCursor(from: string | null, dir: 1 | -1) {
  const els = rowEls();
  if (!els.length) return;
  const i = els.findIndex((r) => r.dataset.rid === from);
  const next = i < 0 ? (dir === 1 ? 0 : els.length - 1) : Math.min(els.length - 1, Math.max(0, i + dir));
  els[next].focus();
}

/** Satırın bulunduğu grup (liste grubu ya da pano sütunu) başlığı. */
const groupOf = (el: HTMLElement | undefined) =>
  el?.closest<HTMLElement>(".grp, .col")?.querySelector("h2")?.firstChild?.textContent ?? "";

/**
 * Bir işlem satırı başka bir gruba taşıyabilir ya da listeden çıkarabilir (tamamlanan görev gibi).
 * Satır yerinde kaldıysa imleç onda kalır; gruptan çıktıysa aynı gruptaki en yakın komşuya geçer,
 * böylece art arda `x` basmak sıradaki satırı tamamlar, öncekini geri almaz.
 */
export function keepCursor(id: string, act: () => void) {
  const els = rowEls();
  const here = els.find((r) => r.dataset.rid === id);
  const group = groupOf(here);
  const mates = els.filter((r) => groupOf(r) === group);
  const j = mates.findIndex((r) => r.dataset.rid === id);
  const neighbor = mates[j + 1]?.dataset.rid ?? mates[j - 1]?.dataset.rid ?? null;
  act();
  // React güncellemeyi işledikten sonra; rAF gizli sekmede durduğu için zamanlayıcı.
  setTimeout(() => {
    const now = rowEls().find((r) => r.dataset.rid === id);
    if (now && groupOf(now) === group) now.focus();
    else if (!(neighbor && focusRow(neighbor))) now?.focus();
  }, 30);
}
