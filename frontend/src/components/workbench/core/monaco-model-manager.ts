import type { editor as MonacoEditor, Uri } from "monaco-editor";

type MonacoNamespace = typeof import("monaco-editor");

type ManagedModelEntry = {
  model: MonacoEditor.ITextModel;
  refCount: number;
};

const managedModels = new Map<string, ManagedModelEntry>();

function normalizeModelKey(path: string) {
  return path.replace(/\\/g, "/");
}

export function createMonacoUri(monaco: MonacoNamespace, path: string): Uri {
  const normalized = normalizeModelKey(path).replace(/^file:\/\//, "");
  return monaco.Uri.parse(normalized.startsWith("/") ? `file://${normalized}` : `file:///${normalized}`);
}

export function acquireMonacoModel(monaco: MonacoNamespace, path: string, value: string, language: string) {
  const key = normalizeModelKey(path);
  const existing = managedModels.get(key);
  if (existing) {
    existing.refCount += 1;
    syncMonacoModel(monaco, existing.model, value, language);
    return existing.model;
  }

  const model = monaco.editor.createModel(value, language, createMonacoUri(monaco, key));
  managedModels.set(key, { model, refCount: 1 });
  return model;
}

export function releaseMonacoModel(path: string) {
  const key = normalizeModelKey(path);
  const entry = managedModels.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount > 0) return;
  entry.model.dispose();
  managedModels.delete(key);
}

export function syncMonacoModel(monaco: MonacoNamespace, model: MonacoEditor.ITextModel, value: string, language: string) {
  if (model.getValue() !== value) {
    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: value }],
      () => null
    );
  }
  if (model.getLanguageId() !== language) {
    monaco.editor.setModelLanguage(model, language);
  }
}

export function getOrCreateStandaloneModel(monaco: MonacoNamespace, path: string, value: string, language: string) {
  const uri = createMonacoUri(monaco, path);
  const existing = monaco.editor.getModel(uri);
  if (existing) {
    syncMonacoModel(monaco, existing, value, language);
    return existing;
  }
  return monaco.editor.createModel(value, language, uri);
}

