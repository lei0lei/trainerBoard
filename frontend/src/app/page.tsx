import Link from "next/link";
import { ArrowRight, Boxes, MonitorSmartphone, Server } from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { PwaNetworkBadge } from "@/components/pwa/pwa-network-badge";
import { buttonVariants } from "@/components/ui/button";

const copy = {
  badge: "Linux deployable + local PWA ready",
  title: "TrainerBoard Workbench",
  description:
    "A unified Next.js PWA frontend with a FastAPI backend. One frontend can connect to local or remote backends, and backend connectivity can be configured from the dashboard.",
  pricing: "Open Console",
  continue: "Open Dashboard",
  readme: "View Workbench",
  healthTitle: "Backend Connection",
  connecting: "Backend APIs are reserved for later integration.",
  failed: "Connection is configured from the dashboard.",
  hint: "For now, localhost and remote backend selection will be completed in the dashboard.",
  footer: "Frontend-first mode enabled: homepage is static, backend integration remains reserved.",
};

const features = [
  {
    icon: MonitorSmartphone,
    title: "Frontend",
    description: "Next.js App Router + Tailwind + shadcn/ui + PWA",
  },
  {
    icon: Server,
    title: "Backend",
    description: "FastAPI API / WebSocket / SSH proxy integration reserved",
  },
  {
    icon: Boxes,
    title: "Deployment",
    description: "One PWA can switch between local and remote backend instances",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
              <span>{copy.badge}</span>
              <PwaNetworkBadge />
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
              <PwaInstallButton />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
                  <item.icon className="mb-4 h-6 w-6 text-cyan-300" />
                  <h2 className="mb-2 text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
            <div className="mb-6">
              <p className="text-sm text-slate-400">{copy.healthTitle}</p>
              <h3 className="text-xl font-semibold">Reserved</h3>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                <span className="text-slate-400">status</span>
                <span className="font-medium text-amber-300">pending</span>
              </div>
              <div className="rounded-xl border border-white/10 px-3 py-2 text-slate-300">{copy.connecting}</div>
              <div className="rounded-xl border border-white/10 px-3 py-2 text-slate-400">{copy.failed}</div>
              <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-500">{copy.hint}</div>
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
