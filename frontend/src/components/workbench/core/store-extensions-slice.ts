import type { ExtensionsSlice, WorkbenchSliceCreator } from "./store-types";

export const createExtensionsSlice: WorkbenchSliceCreator<ExtensionsSlice> = (set) => ({
  disabledPluginIds: [],
  extensionSearchQuery: "",
  extensionCategoryFilter: "all",
  extensionStatusFilter: "all",
  selectedExtensionId: null,
  enablePlugin: (pluginId) =>
    set((state) => ({
      disabledPluginIds: state.disabledPluginIds.filter((item) => item !== pluginId),
    })),
  disablePlugin: (pluginId) =>
    set((state) => ({
      disabledPluginIds: state.disabledPluginIds.includes(pluginId)
        ? state.disabledPluginIds
        : [...state.disabledPluginIds, pluginId],
    })),
  togglePluginEnabled: (pluginId) =>
    set((state) => ({
      disabledPluginIds: state.disabledPluginIds.includes(pluginId)
        ? state.disabledPluginIds.filter((item) => item !== pluginId)
        : [...state.disabledPluginIds, pluginId],
    })),
  setExtensionSearchQuery: (value) => set({ extensionSearchQuery: value }),
  setExtensionCategoryFilter: (value) => set({ extensionCategoryFilter: value }),
  setExtensionStatusFilter: (value) => set({ extensionStatusFilter: value }),
  setSelectedExtensionId: (pluginId) => set({ selectedExtensionId: pluginId }),
});
