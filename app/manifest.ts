import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zona Horarios",
    short_name: "Zona",
    description:
      "Sistema de registro de jornadas de Zona Ingeniería",

    start_url: "/login",

    display: "standalone",

    orientation: "portrait",

    background_color: "#ffffff",

    theme_color: "#0A3D91",

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}