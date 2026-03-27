"use client";

import { useEffect, useState } from "react";
import { useWorkbenchStore } from "./store";

type PersistApi = {
  hasHydrated?: () => boolean;
  onHydrate?: (listener: () => void) => () => void;
  onFinishHydration?: (listener: () => void) => () => void;
  rehydrate?: () => Promise<void> | void;
};

function getPersistApi(): PersistApi | undefined {
  return (useWorkbenchStore as typeof useWorkbenchStore & { persist?: PersistApi }).persist;
}

export function useWorkbenchStoreHydration() {
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const persist = getPersistApi();
    return persist?.hasHydrated?.() ?? true;
  });

  useEffect(() => {
    const persist = getPersistApi();

    if (!persist) {
      setHydrated(true);
      return;
    }

    const onFinish = () => setHydrated(true);
    const unsubscribeHydrate = persist.onHydrate?.(() => setHydrated(false)) ?? (() => undefined);
    const unsubscribeFinish = persist.onFinishHydration?.(onFinish) ?? (() => undefined);

    if (!persist.hasHydrated?.()) {
      void persist.rehydrate?.();
    } else {
      setHydrated(true);
    }

    return () => {
      unsubscribeHydrate();
      unsubscribeFinish();
    };
  }, []);

  return hydrated;
}
