import { GitBranch } from "lucide-react";

export function StatusBar() {
  return (
    <footer className="flex h-6 items-center justify-between bg-[#007acc] px-3 text-xs text-white">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          main
        </span>
        <span>0↓ 0↑</span>
        <span>UTF-8</span>
        <span>CRLF</span>
        <span>TypeScript React</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Ln 24, Col 18</span>
        <span>Spaces: 2</span>
        <span>Prettier</span>
      </div>
    </footer>
  );
}
