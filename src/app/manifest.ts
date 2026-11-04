import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

/** Makes REIGN installable to a phone's home screen (opens full-screen, like an app). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${config.appName}: discover what's launching`,
    short_name: config.appName,
    description: "Discover new startups before everyone else. Upvote what you like. Bid for the top spots.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090b",
    theme_color: "#09090b",
    categories: ["business", "productivity", "news"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Explore startups", url: "/search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Your dashboard", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
