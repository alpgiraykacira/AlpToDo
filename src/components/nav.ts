import type { ViewKey } from "@/lib/types";
import type { IconName } from "./icons";

export const VIEWS: { k: ViewKey; l: string; i: IconName }[] = [
  { k: "inbox", l: "Inbox", i: "inbox" },
  { k: "today", l: "Bugün", i: "sun" },
  { k: "upcoming", l: "Yaklaşan", i: "cal" },
  { k: "all", l: "Tümü", i: "list" },
  { k: "notes", l: "Notlar", i: "note" },
  { k: "board", l: "Pano", i: "board" },
  { k: "insights", l: "Analiz", i: "chart" },
];

export const TITLES = Object.fromEntries(VIEWS.map((v) => [v.k, v.l])) as Record<ViewKey, string>;

/** Alt sekme çubuğunda (telefon) gösterilen görünümler. */
export const TABS: { k: ViewKey; l: string; i: IconName }[] = [
  { k: "today", l: "Bugün", i: "sun" },
  { k: "upcoming", l: "Yaklaşan", i: "cal" },
  { k: "board", l: "Pano", i: "board" },
  { k: "inbox", l: "Inbox", i: "inbox" },
  { k: "notes", l: "Notlar", i: "note" },
];
