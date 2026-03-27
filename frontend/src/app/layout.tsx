import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { PwaConnectivityBanner } from "@/components/pwa/pwa-connectivity-banner";
import { WorkbenchStoreBootstrap } from "@/components/workbench/core/workbench-store-bootstrap";
import { prefixAppPath } from "@/lib/app-base-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainerBoard",
  description: "TrainerBoard PWA workbench for connecting to local or remote FastAPI backends.",
  manifest: prefixAppPath("/manifest.webmanifest"),
  applicationName: "TrainerBoard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrainerBoard",
  },
  icons: {
    icon: [
      { url: prefixAppPath("/favicon.ico") },
      { url: prefixAppPath("/favicon.svg"), type: "image/svg+xml" },
      { url: prefixAppPath("/icons/icon-32.png"), sizes: "32x32", type: "image/png" },
      { url: prefixAppPath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: prefixAppPath("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="h-screen overflow-hidden bg-slate-950 text-slate-50">
        <WorkbenchStoreBootstrap />
        <PwaBootstrap />
        <PwaConnectivityBanner />
        {children}
      </body>
    </html>
  );
}
