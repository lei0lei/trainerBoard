import type { EditorTab } from "../core/types";

export type OutlineItem = {
  id: string;
  label: string;
  detail?: string;
  line: number;
  kind: "heading" | "function" | "class" | "symbol" | "section";
};

export type ProblemItem = {
  id: string;
  severity: "warning" | "info";
  message: string;
  line: number;
};

function createItem(line: number, label: string, kind: OutlineItem["kind"], detail?: string): OutlineItem {
  return {
    id: `${kind}:${line}:${label}`,
    label,
    detail,
    line,
    kind,
  };
}

export function extractOutline(tab?: EditorTab | null): OutlineItem[] {
  if (!tab?.content) return [];

  const lines = tab.content.split(/\r?\n/);
  const results: OutlineItem[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (tab.language === "markdown") {
      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        results.push(createItem(index + 1, heading[2], "heading", `H${heading[1].length}`));
      }
      return;
    }

    if (tab.language === "python") {
      const pyClass = trimmed.match(/^class\s+([A-Za-z0-9_]+)/);
      if (pyClass) {
        results.push(createItem(index + 1, pyClass[1], "class"));
        return;
      }

      const pyFunc = trimmed.match(/^def\s+([A-Za-z0-9_]+)/);
      if (pyFunc) {
        results.push(createItem(index + 1, pyFunc[1], "function"));
        return;
      }
    }

    if (["typescript", "javascript"].includes(tab.language)) {
      const classMatch = trimmed.match(/^(?:export\s+)?class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        results.push(createItem(index + 1, classMatch[1], "class"));
        return;
      }

      const fnMatch = trimmed.match(
        /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\(|[A-Za-z0-9_]+\s*=>)/
      );
      if (fnMatch) {
        results.push(createItem(index + 1, fnMatch[1] || fnMatch[2], "function"));
        return;
      }

      const symbolMatch = trimmed.match(/^(?:export\s+)?(?:interface|type|enum)\s+([A-Za-z0-9_]+)/);
      if (symbolMatch) {
        results.push(createItem(index + 1, symbolMatch[1], "symbol"));
      }
      return;
    }

    if (tab.language === "json") {
      const keyMatch = trimmed.match(/^"([^"]+)"\s*:/);
      if (keyMatch) {
        results.push(createItem(index + 1, keyMatch[1], "symbol"));
      }
      return;
    }

    if (trimmed.length < 60 && /^[A-Z][A-Za-z0-9 _-]+:?$/.test(trimmed)) {
      results.push(createItem(index + 1, trimmed.replace(/:$/, ""), "section"));
    }
  });

  return results.slice(0, 200);
}

export function analyzeProblems(tab?: EditorTab | null): ProblemItem[] {
  if (!tab?.content) return [];

  const lines = tab.content.split(/\r?\n/);
  const problems: ProblemItem[] = [];

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (/\s+$/.test(line)) {
      problems.push({
        id: `trailing:${lineNo}`,
        severity: "warning",
        message: "Trailing whitespace",
        line: lineNo,
      });
    }

    if (/\t/.test(line)) {
      problems.push({
        id: `tabs:${lineNo}`,
        severity: "info",
        message: "Contains tab indentation",
        line: lineNo,
      });
    }

    if (line.length > 120) {
      problems.push({
        id: `long:${lineNo}`,
        severity: "info",
        message: "Line exceeds 120 characters",
        line: lineNo,
      });
    }

    if (/(TODO|FIXME|HACK)/.test(line)) {
      problems.push({
        id: `todo:${lineNo}`,
        severity: "warning",
        message: "Contains TODO/FIXME/HACK marker",
        line: lineNo,
      });
    }
  });

  return problems.slice(0, 200);
}

export function formatEventTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return value;
  }
}
