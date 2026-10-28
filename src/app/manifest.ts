import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlpToDo",
    short_name: "AlpToDo",
    description: "İş notları, görevler ve öncelikler için kişisel çalışma alanı.",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#E9ECF0",
    theme_color: "#0B7A75",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
