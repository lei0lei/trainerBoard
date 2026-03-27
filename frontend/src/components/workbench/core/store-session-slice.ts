import { createId } from "./store-helpers";
import type { SessionLevel, SessionSlice, WorkbenchSliceCreator } from "./store-types";

export const createSessionSlice: WorkbenchSliceCreator<SessionSlice> = (set) => ({
  sessionEvents: [],
  addSessionEvent: (message, level = "info") =>
    set((state) => {
      const nextLevel: SessionLevel = level;
      return {
        sessionEvents: [
          {
            id: createId(),
            message,
            level: nextLevel,
            createdAt: new Date().toISOString(),
          },
          ...state.sessionEvents,
        ].slice(0, 200),
      };
    }),
});

