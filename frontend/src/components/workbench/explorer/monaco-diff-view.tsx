import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { getOrCreateStandaloneModel } from "./monaco-model-manager";

const DiffEditor = dynamic(
  async () => {
    const mod = await import("@monaco-editor/react");
    return mod.DiffEditor;
  },
  { ssr: false }
);

export function MonacoDiffView({
  path,
  original,
  modified,
  language,
}: {
  path: string;
  original: string;
  modified: string;
  language: string;
}) {
  const originalPath = `${path}#external`;
  const modifiedPath = `${path}#editor`;
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    getOrCreateStandaloneModel(monaco, originalPath, original, language);
    getOrCreateStandaloneModel(monaco, modifiedPath, modified, language);
  }, [language, modified, modifiedPath, original, originalPath]);

  return (
    <DiffEditor
      height="100%"
      original={original}
      modified={modified}
      language={language}
      originalModelPath={originalPath}
      modifiedModelPath={modifiedPath}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      theme="vs-dark"
      beforeMount={(monaco) => {
        monacoRef.current = monaco;
      }}
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
      }}
    />
  );
}
