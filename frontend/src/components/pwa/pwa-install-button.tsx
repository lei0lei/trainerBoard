"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClientReady } from "./use-client-ready";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton({ className }: { className?: string }) {
  const clientReady = useClientReady();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!clientReady) {
    return null;
  }

  if (installed) {
    return (
      <span className={cn(buttonVariants({ variant: "outline", size: "lg" }), "cursor-default", className)}>
        PWA Installed
      </span>
    );
  }

  if (!installEvent) {
    return null;
  }

  return (
    <button
      className={cn(buttonVariants({ size: "lg", variant: "outline" }), "gap-2", className)}
      onClick={async () => {
        await installEvent.prompt();
        await installEvent.userChoice;
        setInstallEvent(null);
      }}
    >
      <Download className="h-4 w-4" />
      Install PWA
    </button>
  );
}
