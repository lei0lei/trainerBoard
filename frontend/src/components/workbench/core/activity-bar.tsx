import { Bell } from "lucide-react";
import type { ActivityContribution } from "./activity-registry";
import type { SidebarKey } from "./types";
import { cn } from "@/lib/utils";

export function ActivityBar({
  contributions,
  activeSidebar,
  showPrimarySidebar,
  onSelect,
}: {
  contributions: ActivityContribution[];
  activeSidebar: SidebarKey;
  showPrimarySidebar: boolean;
  onSelect: (key: SidebarKey) => void;
}) {
  return (
    <div className="flex w-12 flex-col items-center justify-between border-r border-[#2a2d2e] bg-[#181818] py-2">
      <div className="flex flex-col gap-1">
        {contributions.map((item) => {
          const isActive =
            activeSidebar === item.manifest.key &&
            (!item.manifest.capabilities.primarySidebar || showPrimarySidebar);

          return (
            <button
              key={item.manifest.key}
              title={item.manifest.label}
              onClick={() => onSelect(item.manifest.key)}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-[#2a2d2e] hover:text-white",
                isActive && "text-white"
              )}
            >
              {isActive && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded bg-white" />}
              <item.manifest.icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <button className="flex h-10 w-10 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-[#2a2d2e] hover:text-white">
          <Bell className="h-5 w-5" />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-md text-[#8b8b8b] hover:bg-[#2a2d2e] hover:text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0e639c] text-xs font-semibold text-white">L</span>
        </button>
      </div>
    </div>
  );
}
