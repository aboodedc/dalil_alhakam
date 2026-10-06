import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dalil Al-Ahkam — دليل الأحكام",
    short_name: "دليل الأحكام",
    description: "Semantic retrieval & citation system for juristic hadith texts",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    dir: "rtl",
    lang: "ar",
    background_color: "#F2F4FF",
    theme_color: "#12183F",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
