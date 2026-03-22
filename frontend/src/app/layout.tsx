import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainerBoard",
  description: "Next.js + shadcn/ui + FastAPI template",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
