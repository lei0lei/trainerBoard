import type { MetadataRoute } from "next";
import { prefixAppPath } from "@/lib/app-base-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrainerBoard",
    short_name: "TrainerBoard",
    description: "TrainerBoard PWA workbench for connecting to local or remote FastAPI backends.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    lang: "zh-CN",
    orientation: "portrait-primary",
    categories: ["productivity", "developer", "utilities"],
    icons: [
      {
        src: prefixAppPath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: prefixAppPath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: prefixAppPath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: prefixAppPath("/icons/apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
