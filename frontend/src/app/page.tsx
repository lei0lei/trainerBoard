"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Boxes, MonitorSmartphone, Server } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

type HealthResponse = {
  status: string;
  service: string;
  version: string;
};

const copy = {
  badge: "\u53ef\u90e8\u7f72 Linux + \u53ef\u6253\u5305 Windows \u684c\u9762\u5e94\u7528",
  title: "TrainerBoard \u5168\u6808\u6a21\u677f",
  description:
    "\u524d\u7aef\u91c7\u7528 Next.js + shadcn/ui\uff0c\u540e\u7aef\u91c7\u7528 FastAPI\u3002\u540c\u4e00\u5957\u4ee3\u7801\u652f\u6301 Web \u90e8\u7f72\uff0c\u4e5f\u652f\u6301\u901a\u8fc7 pywebview + PyInstaller \u6253\u5305\u4e3a Windows \u684c\u9762\u5e94\u7528\u3002",
  pricing: "\u4ef7\u683c",
  continue: "\u8fdb\u5165 Dashboard",
  readme: "\u67e5\u770b Dashboard",
  healthTitle: "\u540e\u7aef\u5065\u5eb7\u68c0\u67e5",
  connecting: "\u6b63\u5728\u8fde\u63a5 FastAPI \u670d\u52a1...",
  failed: "\u8fde\u63a5\u5931\u8d25",
  hint: "\u5f00\u53d1\u6a21\u5f0f\u4e0b\u8bf7\u5148\u542f\u52a8 FastAPI\uff1apython run.py",
  footer:
    "\u5f53\u524d\u6a21\u677f\u5efa\u8bae\uff1a\u5148\u5b8c\u6210\u4e1a\u52a1 API\uff0c\u518d\u8865\u767b\u5f55\u3001\u6570\u636e\u5e93\u3001\u8868\u683c/\u770b\u677f\u9875\u9762\u3002",
};

const features = [
  {
    icon: MonitorSmartphone,
    title: "Frontend",
    description: "Next.js App Router + Tailwind + shadcn/ui",
  },
  {
    icon: Server,
    title: "Backend",
    description: "FastAPI \u63d0\u4f9b API \u4e0e\u9759\u6001\u6587\u4ef6\u6258\u7ba1",
  },
  {
    icon: Boxes,
    title: "Desktop",
    description: "pywebview + PyInstaller \u6253\u5305 Windows \u684c\u9762\u7aef",
  },
];

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: HealthResponse) => {
        setHealth(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
              {copy.badge}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{copy.title}</h1>
                <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {copy.pricing}
                </Link>
              </div>
              <p className="max-w-2xl text-lg text-slate-300">{copy.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "gap-2" })}>
                {copy.continue}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className={buttonVariants({ size: "lg", variant: "outline" })}>
                {copy.readme}
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20"
                >
                  <item.icon className="mb-4 h-6 w-6 text-cyan-300" />
                  <h2 className="mb-2 text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-300">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">{copy.healthTitle}</p>
                <h3 className="text-xl font-semibold">/api/health</h3>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              {loading ? (
                <p className="text-sm text-slate-300">{copy.connecting}</p>
              ) : error ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-rose-300">{copy.failed}</p>
                  <p className="text-sm text-slate-400">{error}</p>
                  <p className="text-xs text-slate-500">{copy.hint}</p>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-slate-400">status</span>
                    <span className="font-medium text-emerald-300">{health?.status}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-slate-400">service</span>
                    <span>{health?.service}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-slate-400">version</span>
                    <span>{health?.version}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-4 text-sm text-cyan-100">
              {copy.footer}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
