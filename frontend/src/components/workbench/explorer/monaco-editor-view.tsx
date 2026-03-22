import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useEffect, useRef } from "react";
import { acquireMonacoModel, releaseMonacoModel, syncMonacoModel } from "./monaco-model-manager";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function MonacoEditorView({
  path,
  value,
  language,
  onChange,
  onFocus,
  onValidate,
}: {
  path: string;
  value: string;
  language: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onValidate?: (markers: MonacoEditor.IMarker[]) => void;
}) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const modelPathRef = useRef<string | null>(null);
  const suppressChangeRef = useRef(false);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = acquireMonacoModel(monaco, path, value, language);
    modelPathRef.current = path;
    editor.setModel(model);

    editor.onDidFocusEditorText(() => onFocus?.());
    editor.onDidChangeModelContent(() => {
      if (suppressChangeRef.current) return;
      onChange(editor.getValue());
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (modelPathRef.current !== path) {
      if (modelPathRef.current) {
        releaseMonacoModel(modelPathRef.current);
      }
      const nextModel = acquireMonacoModel(monaco, path, value, language);
      modelPathRef.current = path;
      suppressChangeRef.current = true;
      editor.setModel(nextModel);
      suppressChangeRef.current = false;
      return;
    }

    const model = editor.getModel();
    if (!model) return;
    suppressChangeRef.current = true;
    syncMonacoModel(monaco, model, value, language);
    suppressChangeRef.current = false;
  }, [language, path, value]);

  useEffect(
    () => () => {
      if (modelPathRef.current) {
        releaseMonacoModel(modelPathRef.current);
      }
    },
    []
  );

  return (
    <Editor
      height="100%"
      defaultLanguage={language}
      defaultValue={value}
      theme="vs-dark"
      onMount={handleMount}
      onValidate={onValidate}
      options={{
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
