"use client";

import { useEffect } from "react";
import { prefixAppPath } from "@/lib/app-base-path";

export function PwaBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const serviceWorkerUrl = prefixAppPath("/sw.js");
    const scope = prefixAppPath("/");

    window.addEventListener("load", () => {
      navigator.serviceWorker.register(serviceWorkerUrl, { scope }).catch((error) => {
        console.warn("Failed to register service worker", error);
      });
    });
  }, []);

  return null;
}
