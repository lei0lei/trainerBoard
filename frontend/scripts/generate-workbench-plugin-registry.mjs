import fs from "node:fs";
import path from "node:path";

const pluginsDir = path.join(process.cwd(), "src", "components", "workbench", "plugins");
const outputFile = path.join(pluginsDir, "generated-registry.ts");

function collectPluginDirs(rootDir, currentRelative = "") {
  const absoluteDir = path.join(rootDir, currentRelative);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const found = [];

  if (currentRelative && fs.existsSync(path.join(absoluteDir, "index.ts"))) {
    found.push(currentRelative.replace(/\\/g, "/"));
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    found.push(...collectPluginDirs(rootDir, path.join(currentRelative, entry.name)));
  }

  return found;
}

const pluginDirs = collectPluginDirs(pluginsDir).sort((left, right) => left.localeCompare(right));

const normalizedImports = pluginDirs.map((name) => {
  const localName = name
    .replace(/[\\/]+/g, "-")
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");

  return {
    name,
    localName,
  };
});

const content = [
  ...normalizedImports.map((item) => `import { plugin as ${item.localName} } from "./${item.name}";`),
  "",
  "export const workbenchPlugins = [",
  ...normalizedImports.map((item) => `  ${item.localName},`),
  "];",
  "",
].join("\n");

const previous = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, "utf8") : "";
if (previous !== content) {
  fs.writeFileSync(outputFile, content, "utf8");
}
