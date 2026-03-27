export type WorkbenchMenuId = "File" | "Edit" | "Selection" | "View" | "Go" | "Run" | "Terminal" | "Help";

export type WorkbenchMenuPlacement = {
  menu: WorkbenchMenuId;
  group?: string;
  order?: number;
  submenu?: string[];
};

export type WorkbenchCommand = {
  id: string;
  title: string;
  description?: string;
  section?: string;
  shortcut?: string | string[];
  keywords?: string[];
  disabled?: boolean;
  checked?: boolean;
  menus?: WorkbenchMenuPlacement[];
  run: () => void | Promise<void>;
};

export type WorkbenchMenuNode =
  | {
      type: "command";
      id: string;
      commandId: string;
      label?: string;
    }
  | {
      type: "separator";
      id: string;
    }
  | {
      type: "submenu";
      id: string;
      label: string;
      items: WorkbenchMenuNode[];
    };

