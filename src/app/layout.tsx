import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlpToDo",
  description: "İş notları, görevler ve öncelikler için kişisel çalışma alanı.",
  // Kişisel bir araç; arama motorlarına açılmasın.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tarayıcı çubuğu uygulama zeminiyle (--canvas) aynı renkte olsun.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9ECF0" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0D10" },
  ],
};

// Tema tercihi ilk boyamadan önce uygulanır (yanıp sönmeyi önler).
const themeScript = `try{var t=localStorage.getItem('sira.theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
