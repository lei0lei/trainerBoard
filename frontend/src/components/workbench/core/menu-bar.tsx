import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorkbenchResolvedCommand } from "./command-registry";
import type { WorkbenchMenuId, WorkbenchMenuNode } from "./commands";
import { menuItems } from "./config";
import { ChromeToggleIcon, VscodeIconButton } from "./icons";

function MenuList({
  items,
  commandMap,
  closeMenus,
}: {
  items: WorkbenchMenuNode[];
  commandMap: Map<string, WorkbenchResolvedCommand>;
  closeMenus: () => void;
}) {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  return (
    <div className="min-w-60 rounded-md border border-[#3c3c3c] bg-[#252526] p-1 shadow-2xl">
      {items.map((item) => {
        if (item.type === "separator") {
          return <div key={item.id} className="my-1 h-px bg-[#3c3c3c]" />;
        }

        if (item.type === "submenu") {
          return (
            <div key={item.id} className="relative" onMouseEnter={() => setOpenSubmenu(item.id)}>
              <button className="group flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e]">
                <span>{item.label}</span>
                <ChevronRight className="h-4 w-4 text-[#8f8f8f] group-hover:text-[#4fc1ff]" />
              </button>
              {openSubmenu === item.id && (
                <div className="absolute left-full top-0 z-40 ml-1">
                  <MenuList items={item.items} commandMap={commandMap} closeMenus={closeMenus} />
                </div>
              )}
            </div>
          );
        }

        const command = commandMap.get(item.commandId);
        if (!command) return null;

        return (
          <button
            key={item.id}
            disabled={command.disabled}
            className="group flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-[#cccccc] hover:bg-[#04395e] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => {
              closeMenus();
              void Promise.resolve(command.run()).catch(() => undefined);
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center text-[#4fc1ff]">{command.checked ? <Check className="h-3.5 w-3.5" /> : null}</span>
              <span className="truncate">{item.label ?? command.title.replace(/^[^:]+:\s*/, "")}</span>
            </div>
            {command.shortcutLabel ? <span className="shrink-0 pl-6 text-xs text-[#8f8f8f] group-hover:text-[#4fc1ff]">{command.shortcutLabel}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function MenuBar({
  menus,
  commandMap,
  showPrimarySidebar,
  showPanel,
  showSecondarySidebar,
  canTogglePanel,
  canToggleSecondarySidebar,
  onTogglePrimarySidebar,
  onTogglePanel,
  onToggleSecondarySidebar,
}: {
  menus: Record<string, WorkbenchMenuNode[]>;
  commandMap: Map<string, WorkbenchResolvedCommand>;
  showPrimarySidebar: boolean;
  showPanel: boolean;
  showSecondarySidebar: boolean;
  canTogglePanel: boolean;
  canToggleSecondarySidebar: boolean;
  onTogglePrimarySidebar: () => void;
  onTogglePanel: () => void;
  onToggleSecondarySidebar: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!menuBarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <header className="grid h-9 grid-cols-[1fr_auto_1fr] items-center border-b border-[#2a2d2e] bg-[#181818] px-2 text-sm">
      <div ref={menuBarRef} className="flex min-w-0 items-center gap-1">
        {menuItems.map((item) => (
          <div key={item} className="relative">
            <button
              className="rounded px-2 py-0.5 text-[12px] text-[#cccccc] hover:bg-[#2a2d2e]"
              onClick={() => setOpenMenu((value) => (value === item ? null : item))}
              onMouseEnter={() => {
                if (openMenu) setOpenMenu(item);
              }}
            >
              {item}
            </button>
            {openMenu === item && (
              <div className="absolute left-0 top-8 z-30">
                <MenuList items={menus[item as WorkbenchMenuId] ?? []} commandMap={commandMap} closeMenus={() => setOpenMenu(null)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="justify-self-center text-[12px] text-[#9d9d9d]">trainerboard - Visual Studio Code</div>

      <div className="flex items-center justify-self-end">
        <VscodeIconButton title="Toggle Primary Sidebar" active={showPrimarySidebar} onClick={onTogglePrimarySidebar}>
          <ChromeToggleIcon position="left" active={showPrimarySidebar} />
        </VscodeIconButton>
        <VscodeIconButton title="Toggle Panel" active={showPanel && canTogglePanel} disabled={!canTogglePanel} onClick={onTogglePanel}>
          <ChromeToggleIcon position="bottom" active={showPanel && canTogglePanel} />
        </VscodeIconButton>
        <VscodeIconButton
          title="Toggle Secondary Sidebar"
          active={showSecondarySidebar && canToggleSecondarySidebar}
          disabled={!canToggleSecondarySidebar}
          onClick={onToggleSecondarySidebar}
        >
          <ChromeToggleIcon position="right" active={showSecondarySidebar && canToggleSecondarySidebar} />
        </VscodeIconButton>
      </div>
    </header>
  );
}

