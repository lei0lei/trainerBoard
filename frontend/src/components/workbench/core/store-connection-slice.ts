import { DEFAULT_BACKEND_PROFILES } from "./backend-connection";
import type { ConnectionSlice, WorkbenchSliceCreator } from "./store-types";

function resolveProfiles(profiles: ConnectionSlice["backendProfiles"]) {
  return profiles.length > 0 ? profiles : DEFAULT_BACKEND_PROFILES;
}

export const createConnectionSlice: WorkbenchSliceCreator<ConnectionSlice> = (set) => ({
  backendProfiles: DEFAULT_BACKEND_PROFILES,
  activeBackendProfileId: DEFAULT_BACKEND_PROFILES[0]?.id ?? "",
  saveBackendProfile: (profile) =>
    set((state) => {
      const existingIndex = state.backendProfiles.findIndex((item) => item.id === profile.id);
      const backendProfiles =
        existingIndex >= 0
          ? state.backendProfiles.map((item, index) => (index === existingIndex ? profile : item))
          : [...state.backendProfiles, profile];
      return {
        backendProfiles,
        activeBackendProfileId: state.activeBackendProfileId || profile.id,
      };
    }),
  removeBackendProfile: (profileId) =>
    set((state) => {
      const nextProfiles = resolveProfiles(state.backendProfiles.filter((item) => item.id !== profileId));
      const hasActive = nextProfiles.some((item) => item.id === state.activeBackendProfileId);
      return {
        backendProfiles: nextProfiles,
        activeBackendProfileId: hasActive ? state.activeBackendProfileId : nextProfiles[0]?.id ?? "",
        recentWorkspaces: state.recentWorkspaces.filter(
          (workspace) => workspace.source !== "server" || workspace.backendProfileId !== profileId
        ),
      };
    }),
  setActiveBackendProfile: (profileId) =>
    set((state) => ({
      activeBackendProfileId: state.backendProfiles.some((item) => item.id === profileId)
        ? profileId
        : state.backendProfiles[0]?.id ?? DEFAULT_BACKEND_PROFILES[0]?.id ?? "",
    })),
});
