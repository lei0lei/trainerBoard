import { Boxes, CheckCircle2, Package, Power, Search, Settings2, Sparkles, XCircle } from "lucide-react";
import type { ActivityContribution } from "../../core/activity-types";

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

export const extensionsActivity: ActivityContribution = {
  manifest: {
    id: "builtin.extensions",
    key: "extensions",
    label: "Extensions",
    description: "Manage installed extensions and extension packages.",
    icon: Boxes,
    order: 70,
    kind: "builtin",
    category: "extensions",
    container: "root",
    version: "1.0.0",
    defaultLayout: {
      showPrimarySidebar: true,
      showSecondarySidebar: false,
      showPanel: false,
      primarySidebarWidth: 320,
    },
    capabilities: {
      primarySidebar: true,
      secondarySidebar: false,
      panel: false,
    },
  },
  renderPrimarySidebar: (context) => {
    const extensionPlugins = context.plugins.filter((plugin) => plugin.manifest.kind === "extension");
    const enabledCount = extensionPlugins.filter((plugin) => !context.disabledPluginIds.includes(plugin.manifest.id)).length;
    const disabledCount = extensionPlugins.length - enabledCount;
    const categories = Array.from(
      new Set(extensionPlugins.map((plugin) => plugin.manifest.category || "general"))
    ).sort((left, right) => left.localeCompare(right));

    return (
      <aside className="flex h-full flex-col bg-[#252526]">
        <div className="flex h-9 items-center justify-between px-4 text-xs font-semibold tracking-wide text-[#bbbbbb]">
          <span>EXTENSIONS</span>
          <span className="text-[#8b8b8b]">{extensionPlugins.length} installed</span>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <label className="flex items-center gap-2 rounded border border-[#3c3c3c] bg-[#181818] px-3 py-2 text-sm text-[#d4d4d4]">
              <Search className="h-4 w-4 text-[#8b8b8b]" />
              <input
                value={context.extensionSearchQuery}
                onChange={(event) => context.onSetExtensionSearchQuery(event.target.value)}
                placeholder="Search installed extensions"
                className="w-full bg-transparent outline-none placeholder:text-[#6f6f6f]"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-[#3c3c3c] bg-[#181818] p-2">
                <div className="text-[#8b8b8b]">Enabled</div>
                <div className="mt-1 text-lg font-semibold text-[#89d185]">{enabledCount}</div>
              </div>
              <div className="rounded border border-[#3c3c3c] bg-[#181818] p-2">
                <div className="text-[#8b8b8b]">Disabled</div>
                <div className="mt-1 text-lg font-semibold text-[#f48771]">{disabledCount}</div>
              </div>
            </div>
          </div>

          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <Power className="h-3.5 w-3.5" />
              Status
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "enabled", "disabled"] as const).map((status) => {
                const active = context.extensionStatusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => context.onSetExtensionStatusFilter(status)}
                    className={`rounded border px-2 py-1.5 text-xs ${
                      active
                        ? "border-[#0e639c] bg-[#0e639c] text-white"
                        : "border-[#3c3c3c] bg-[#181818] text-[#cccccc] hover:bg-[#2a2d2e]"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-[#8b8b8b]">
              <Settings2 className="h-3.5 w-3.5" />
              Category
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", ...categories].map((category) => {
                const active = context.extensionCategoryFilter === category;
                return (
                  <button
                    key={category}
                    onClick={() => context.onSetExtensionCategoryFilter(category)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      active
                        ? "border-[#0e639c] bg-[#0e639c] text-white"
                        : "border-[#3c3c3c] bg-[#181818] text-[#cccccc] hover:bg-[#2a2d2e]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3 text-sm text-[#9d9d9d]">
            Extension plugins are auto-discovered from <code>workbench/plugins</code> and can be enabled or disabled here.
          </div>
        </div>
      </aside>
    );
  },
  renderMainArea: (context) => {
    const extensionPlugins = context.plugins.filter((plugin) => plugin.manifest.kind === "extension");
    const filteredPlugins = extensionPlugins.filter((plugin) => {
      const search = context.extensionSearchQuery.trim();
      const enabled = !context.disabledPluginIds.includes(plugin.manifest.id);

      if (context.extensionStatusFilter === "enabled" && !enabled) return false;
      if (context.extensionStatusFilter === "disabled" && enabled) return false;
      if (
        context.extensionCategoryFilter !== "all" &&
        (plugin.manifest.category || "general") !== context.extensionCategoryFilter
      ) {
        return false;
      }

      if (!search) return true;
      return [
        plugin.manifest.label,
        plugin.manifest.description || "",
        plugin.manifest.id,
        plugin.manifest.category || "",
        plugin.manifest.container || "",
      ].some((value) => matchesSearch(value, search));
    });

    const selectedPlugin =
      filteredPlugins.find((plugin) => plugin.manifest.id === context.selectedExtensionId) ??
      filteredPlugins[0] ??
      extensionPlugins[0] ??
      null;

    const selectedEnabled = selectedPlugin
      ? !context.disabledPluginIds.includes(selectedPlugin.manifest.id)
      : false;

    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e]">
        <div className="border-b border-[#2a2d2e] bg-[#181818] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3c3c3c] bg-[#252526] text-[#4fc1ff]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-[#d4d4d4]">Extensions Manager</div>
              <div className="text-sm text-[#8b8b8b]">
                Browse installed extensions, inspect metadata, and enable or disable them live.
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[380px_1fr] overflow-hidden">
          <div className="border-r border-[#2a2d2e] bg-[#181818]">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[#2a2d2e] px-4 py-3 text-xs uppercase tracking-wide text-[#8b8b8b]">
                <span>Installed</span>
                <span>{filteredPlugins.length} shown</span>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {filteredPlugins.length === 0 ? (
                  <div className="rounded border border-dashed border-[#3c3c3c] p-4 text-sm text-[#8b8b8b]">
                    No extensions match the current filter.
                  </div>
                ) : (
                  filteredPlugins.map((plugin) => {
                    const enabled = !context.disabledPluginIds.includes(plugin.manifest.id);
                    const isSelected = selectedPlugin?.manifest.id === plugin.manifest.id;

                    return (
                      <button
                        key={plugin.manifest.id}
                        onClick={() => context.onSetSelectedExtensionId(plugin.manifest.id)}
                        className={`w-full rounded-lg border p-3 text-left ${
                          isSelected
                            ? "border-[#0e639c] bg-[#1b2838]"
                            : "border-[#3c3c3c] bg-[#1e1e1e] hover:bg-[#252526]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#252526] text-[#4fc1ff]">
                              <plugin.manifest.icon className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#d4d4d4]">
                                {plugin.manifest.label}
                              </div>
                              <div className="truncate text-xs text-[#8b8b8b]">{plugin.manifest.id}</div>
                            </div>
                          </div>
                          <span
                            className={`rounded px-2 py-1 text-[11px] uppercase tracking-wide ${
                              enabled
                                ? "bg-[#1f3a28] text-[#89d185]"
                                : "bg-[#452727] text-[#ffb4b4]"
                            }`}
                          >
                            {enabled ? "enabled" : "disabled"}
                          </span>
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs leading-5 text-[#a8a8a8]">
                          {plugin.manifest.description || "No description provided."}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            {!selectedPlugin ? (
              <div className="rounded-xl border border-dashed border-[#3c3c3c] p-6 text-sm text-[#8b8b8b]">
                No extension selected.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#252526] text-[#4fc1ff]">
                        <selectedPlugin.manifest.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold text-[#d4d4d4]">
                          {selectedPlugin.manifest.label}
                        </div>
                        <div className="mt-1 text-sm text-[#8b8b8b]">{selectedPlugin.manifest.id}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => context.onTogglePluginEnabled(selectedPlugin.manifest.id)}
                        className={`rounded px-3 py-2 text-sm ${
                          selectedEnabled
                            ? "bg-[#7a2e2e] text-white hover:bg-[#8b3838]"
                            : "bg-[#237b4b] text-white hover:bg-[#2c8f59]"
                        }`}
                      >
                        {selectedEnabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => context.onActivatePlugin(selectedPlugin.manifest.key)}
                        disabled={!selectedEnabled}
                        className="rounded border border-[#3c3c3c] px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[#b7b7b7]">
                    {selectedPlugin.manifest.description || "No description provided."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4">
                    <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Status</div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-[#d4d4d4]">
                      {selectedEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-[#89d185]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#f48771]" />
                      )}
                      {selectedEnabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4">
                    <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Container</div>
                    <div className="mt-2 text-sm text-[#d4d4d4]">{selectedPlugin.manifest.container || "root"}</div>
                  </div>
                  <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4">
                    <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Category</div>
                    <div className="mt-2 text-sm text-[#d4d4d4]">{selectedPlugin.manifest.category || "general"}</div>
                  </div>
                  <div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4">
                    <div className="text-xs uppercase tracking-wide text-[#8b8b8b]">Version</div>
                    <div className="mt-2 text-sm text-[#d4d4d4]">{selectedPlugin.manifest.version || "0.0.0"}</div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#d4d4d4]">
                      <Package className="h-4 w-4 text-[#4fc1ff]" />
                      Manifest
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Key</span>
                        <span className="break-all text-right text-[#d4d4d4]">{selectedPlugin.manifest.key}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Kind</span>
                        <span className="text-[#d4d4d4]">{selectedPlugin.manifest.kind}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Order</span>
                        <span className="text-[#d4d4d4]">{selectedPlugin.manifest.order ?? 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Primary Sidebar</span>
                        <span className="text-[#d4d4d4]">{String(selectedPlugin.manifest.capabilities.primarySidebar)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Secondary Sidebar</span>
                        <span className="text-[#d4d4d4]">{String(selectedPlugin.manifest.capabilities.secondarySidebar)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Panel</span>
                        <span className="text-[#d4d4d4]">{String(selectedPlugin.manifest.capabilities.panel)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#d4d4d4]">
                      <Power className="h-4 w-4 text-[#4fc1ff]" />
                      Default Layout
                    </div>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Show Primary</span>
                        <span className="text-[#d4d4d4]">{String(selectedPlugin.manifest.defaultLayout?.showPrimarySidebar ?? false)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Show Secondary</span>
                        <span className="text-[#d4d4d4]">{String(selectedPlugin.manifest.defaultLayout?.showSecondarySidebar ?? false)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Show Panel</span>
                        <span className="text-[#d4d4d4]">{String(selectedPlugin.manifest.defaultLayout?.showPanel ?? false)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Primary Width</span>
                        <span className="text-[#d4d4d4]">{selectedPlugin.manifest.defaultLayout?.primarySidebarWidth ?? "-"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Secondary Width</span>
                        <span className="text-[#d4d4d4]">{selectedPlugin.manifest.defaultLayout?.secondarySidebarWidth ?? "-"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#8b8b8b]">Panel Height</span>
                        <span className="text-[#d4d4d4]">{selectedPlugin.manifest.defaultLayout?.panelHeight ?? "-"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  },
};
